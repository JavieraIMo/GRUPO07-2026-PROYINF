import React, { useState } from 'react';

function formatCLP(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return '-';
  }

  return numericValue.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });
}

function formatPercent(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return '-';
  }

  return `${(numericValue * 100).toFixed(2)}%`;
}

function getScoringStatusLabel(status) {
  if (status === 'aprobado') {
    return 'Preaprobado';
  }

  if (status === 'condicionado') {
    return 'Condicionado';
  }

  if (status === 'rechazado') {
    return 'Rechazado';
  }

  return status;
}

function parseTableRows(datosAdicionales) {
  if (Array.isArray(datosAdicionales)) {
    return datosAdicionales;
  }

  if (typeof datosAdicionales === 'string') {
    try {
      const parsed = JSON.parse(datosAdicionales);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function buildAmortizationTable(simulacion) {
  const monto = Number(simulacion.monto_simulado);
  const plazo = Number(simulacion.plazo_simulado);
  const tasa = Number(simulacion.tasa_aplicada);

  if (!Number.isFinite(monto) || !Number.isFinite(plazo) || !Number.isFinite(tasa) || plazo <= 0) {
    return [];
  }

  const monthlyRate = tasa / 12;
  const cuotaGuardada = Number(simulacion.cuota_calculada);
  const cuotaCalculada = monthlyRate === 0
    ? monto / plazo
    : (monto * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -plazo));
  const cuota = Number.isFinite(cuotaGuardada) ? cuotaGuardada : cuotaCalculada;

  if (!Number.isFinite(cuota)) {
    return [];
  }

  let saldo = monto;
  const rows = [];

  for (let month = 1; month <= Math.min(plazo, 12); month += 1) {
    const interes = monthlyRate === 0 ? 0 : saldo * monthlyRate;
    const capital = cuota - interes;
    saldo -= capital;

    rows.push({
      mes: month,
      cuota,
      capital,
      interes,
      saldo: saldo > 0 ? saldo : 0,
    });
  }

  return rows;
}

function hasCompleteAmortizationRows(rows) {
  return rows.length > 0 && rows.every((row) => (
    Number.isFinite(Number(row.mes))
    && Number.isFinite(Number(row.cuota))
    && Number.isFinite(Number(row.capital))
    && Number.isFinite(Number(row.interes))
    && Number.isFinite(Number(row.saldo))
  ));
}

function parseScoringDetail(scoringDetalle) {
  if (!scoringDetalle) {
    return null;
  }

  if (typeof scoringDetalle === 'string') {
    try {
      return JSON.parse(scoringDetalle);
    } catch {
      return null;
    }
  }

  return scoringDetalle;
}

const ModalDetalleSimulacion = ({ simulacion, onClose, onDelete }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  if (!simulacion) return null;

  const tablaGuardada = parseTableRows(simulacion.datos_adicionales);
  const tablaAmortizacion = hasCompleteAmortizationRows(tablaGuardada)
    ? tablaGuardada
    : buildAmortizationTable(simulacion);
  const scoringInfo = parseScoringDetail(simulacion.scoring_detalle);
  const scoringValue = scoringInfo?.scoring ?? scoringInfo?.score;
  const scoringStatus = scoringInfo?.estado ?? scoringInfo?.categoria;
  const hasRealScoring = Boolean(
    scoringInfo && (
      scoringValue !== undefined
      || scoringStatus
      || scoringInfo.breakdown
      || scoringInfo.dicom !== undefined
      || scoringInfo.pensionAlimenticia !== undefined
      || scoringInfo.ingresos !== undefined
      || scoringInfo.historial
      || scoringInfo.antiguedad !== undefined
      || scoringInfo.endeudamiento !== undefined
    )
  ) && !(scoringValue === null && scoringStatus === 'default');

  return (
    <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.25)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#fff',borderRadius:'12px',padding:'2rem',minWidth:'340px',maxWidth:'90vw',maxHeight:'90vh',boxShadow:'0 2px 16px #0002',position:'relative',overflow:'hidden'}}>
        <button onClick={onClose} style={{position:'absolute',top:12,right:16,fontSize:'1.5rem',background:'none',border:'none',cursor:'pointer'}}>&times;</button>
        <div style={{overflowY:'auto',maxHeight:'75vh',paddingRight:'0.5rem'}}>
        <h2 style={{marginBottom:'1rem'}}>Detalle de Simulación</h2>
        <div style={{marginBottom:'1.2rem'}}>
          <strong>Tipo:</strong> {simulacion.tipo_prestamo}<br/>
          <strong>Monto:</strong> {formatCLP(simulacion.monto_simulado)}<br/>
          <strong>Plazo:</strong> {simulacion.plazo_simulado ?? '-'} meses<br/>
          <strong>Tasa:</strong> {formatPercent(simulacion.tasa_aplicada)}<br/>
          <strong>Cuota:</strong> {formatCLP(simulacion.cuota_calculada)}<br/>
          <strong>Fecha:</strong> {simulacion.fecha_simulacion ? new Date(simulacion.fecha_simulacion).toLocaleDateString('es-CL') : ''}<br/>
        </div>
        {tablaAmortizacion.length > 0 && (
          <>
            <h3 style={{marginBottom:'0.7rem'}}>Tabla de Amortización (12 meses)</h3>
            <table style={{width:'100%',borderCollapse:'collapse',marginBottom:'1.2rem'}}>
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Cuota</th>
                  <th>Capital</th>
                  <th>Interés</th>
                  <th>Saldo</th>
                </tr>
              </thead>
              <tbody>
                {tablaAmortizacion.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.mes ?? '-'}</td>
                    <td>{formatCLP(row.cuota)}</td>
                    <td>{formatCLP(row.capital)}</td>
                    <td>{formatCLP(row.interes)}</td>
                    <td>{formatCLP(row.saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* Detalles de scoring si existen */}
        {hasRealScoring && (
          <div style={{marginTop:'1.5rem',background:'#f3f4f6',padding:'1rem 1.5rem',borderRadius:'10px'}}>
            <h3 style={{marginTop:0,marginBottom:'0.7rem',color:'#2563eb'}}>Scoring Crediticio</h3>
            <ul style={{listStyle:'none',padding:0,fontSize:'1rem'}}>
              {scoringValue !== undefined && scoringValue !== null && <li><b>Puntaje:</b> {scoringValue} / 100</li>}
              {scoringStatus && <li><b>Estado:</b> {getScoringStatusLabel(scoringStatus)}</li>}
              {scoringInfo.dicom !== undefined && <li><b>DICOM:</b> {scoringInfo.dicom ? 'Sí' : 'No'}</li>}
              {scoringInfo.pensionAlimenticia !== undefined && <li><b>Pensión alimenticia:</b> {scoringInfo.pensionAlimenticia ? 'Sí' : 'No'}</li>}
              {scoringInfo.ingresos !== undefined && <li><b>Ingresos:</b> {formatCLP(scoringInfo.ingresos)}</li>}
              {scoringInfo.historial && <li><b>Historial:</b> {scoringInfo.historial}</li>}
              {scoringInfo.antiguedad !== undefined && <li><b>Antigüedad:</b> {scoringInfo.antiguedad} años</li>}
              {scoringInfo.endeudamiento !== undefined && <li><b>Endeudamiento:</b> {scoringInfo.endeudamiento}%</li>}
              {scoringInfo.breakdown && (
                <li style={{marginTop:'0.7rem'}}>
                  <b>Detalle de puntaje:</b>
                  <ul style={{marginTop:'0.3rem',marginLeft:'1.2rem'}}>
                    {Object.entries(scoringInfo.breakdown).map(([key, value]) => <li key={key}>{key}: {value}</li>)}
                  </ul>
                </li>
              )}
            </ul>
          </div>
        )}
        <button
          onClick={() => setShowConfirm(true)}
          style={{background:'#b91c1c',color:'#fff',border:'none',borderRadius:'6px',padding:'0.7rem 1.2rem',fontWeight:700,fontSize:'1rem',cursor:'pointer',marginBottom:'0.5rem'}}
        >
          Borrar simulación
        </button>
        </div>

        {showConfirm && (
          <div style={{
            position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.35)',zIndex:1100,
            display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{background:'#fff',borderRadius:'14px',padding:'2.2rem 2rem',minWidth:'320px',maxWidth:'90vw',boxShadow:'0 2px 24px #0003',textAlign:'center',position:'relative'}}>
              <h2 style={{color:'#b91c1c',marginBottom:'1rem'}}>¿Seguro que quieres borrar esta simulación?</h2>
              <p style={{marginBottom:'1.5rem',color:'#444'}}>Esta acción <b>no se puede revertir</b> y se eliminarán todos los datos asociados a esta simulación.</p>
              <div style={{display:'flex',justifyContent:'center',gap:'1.2rem'}}>
                <button
                  onClick={() => setShowConfirm(false)}
                  style={{background:'#e5e7eb',color:'#222',border:'none',borderRadius:'6px',padding:'0.6rem 1.3rem',fontWeight:600,fontSize:'1rem',cursor:'pointer'}}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => { setShowConfirm(false); onDelete(simulacion.id); }}
                  style={{background:'#b91c1c',color:'#fff',border:'none',borderRadius:'6px',padding:'0.6rem 1.3rem',fontWeight:700,fontSize:'1rem',cursor:'pointer'}}
                >
                  Sí, borrar
                </button>
              </div>
              <button onClick={() => setShowConfirm(false)} style={{position:'absolute',top:10,right:16,fontSize:'1.3rem',background:'none',border:'none',cursor:'pointer',color:'#b91c1c'}}>&times;</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalDetalleSimulacion;
