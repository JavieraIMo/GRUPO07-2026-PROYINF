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

function getBreakdownLabel(key) {
  const labels = {
    scoreDICOM: 'DICOM',
    scorePension: 'Pensión alimenticia',
    scoreIngresos: 'Ingresos',
    scoreHistorial: 'Historial',
    scoreAntiguedad: 'Antigüedad laboral',
    scoreEndeudamiento: 'Endeudamiento',
  };

  return labels[key] || key;
}

function getBreakdownMaxScore(key) {
  const maxScores = {
    scoreDICOM: 30,
    scorePension: 15,
    scoreIngresos: 20,
    scoreHistorial: 20,
    scoreAntiguedad: 10,
    scoreEndeudamiento: 5,
  };

  return maxScores[key] || 0;
}

function buildRecommendationForCategory(key, scoringInfo) {
  const recommendationMap = {
    scoreDICOM: scoringInfo?.dicom
      ? 'Prioriza regularizar las obligaciones reportadas en DICOM y reunir respaldo de pago o repactación antes de volver a evaluar.'
      : 'Mantén tu comportamiento financiero sin morosidades para conservar este factor en nivel alto.',
    scorePension: scoringInfo?.pensionAlimenticia
      ? 'Regulariza tu situación de pensión alimenticia y conserva comprobantes al día para una próxima evaluación.'
      : 'Mantén este antecedente sin observaciones para no afectar futuras evaluaciones.',
    scoreIngresos: 'Aumenta ingresos demostrables o reduce el monto solicitado para mejorar tu capacidad de pago frente al crédito pedido.',
    scoreHistorial: 'Evita nuevos atrasos y acumula meses de pago puntual para mejorar tu historial crediticio.',
    scoreAntiguedad: 'Postula con mayor continuidad laboral o presenta antecedentes que respalden estabilidad de ingresos.',
    scoreEndeudamiento: 'Reduce tus cuotas vigentes o consolida deudas para bajar tu nivel de endeudamiento.',
  };

  return recommendationMap[key] || 'Refuerza este criterio antes de una nueva evaluación.';
}

function buildWeakPointRecommendations(scoringInfo) {
  if (!scoringInfo?.breakdown) {
    return [];
  }

  const rankedFactors = Object.entries(scoringInfo.breakdown)
    .map(([key, value]) => {
      const maxScore = getBreakdownMaxScore(key);
      const numericValue = Number(value);
      const normalizedScore = maxScore > 0 ? numericValue / maxScore : 1;

      return {
        key,
        value: numericValue,
        maxScore,
        normalizedScore,
      };
    })
    .filter((factor) => Number.isFinite(factor.value) && factor.maxScore > 0 && factor.value < factor.maxScore)
    .sort((left, right) => {
      if (left.normalizedScore !== right.normalizedScore) {
        return left.normalizedScore - right.normalizedScore;
      }

      return left.value - right.value;
    });

  if (rankedFactors.length === 0) {
    return [];
  }

  const weakestNormalizedScore = rankedFactors[0].normalizedScore;

  return rankedFactors
    .filter((factor) => factor.normalizedScore === weakestNormalizedScore)
    .map((factor) => ({
      key: factor.key,
      label: getBreakdownLabel(factor.key),
      score: factor.value,
      maxScore: factor.maxScore,
      recommendation: buildRecommendationForCategory(factor.key, scoringInfo),
    }));
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

const detailTableShellStyle = {
  marginBottom: '1.2rem',
  border: '1px solid #dbe4f0',
  borderRadius: '14px',
  overflow: 'hidden',
  background: '#ffffff',
  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
};

const detailTableStyle = {
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: 0,
  fontSize: '0.96rem',
};

const detailTableHeaderCellStyle = {
  background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)',
  color: '#f8fafc',
  textAlign: 'left',
  padding: '0.9rem 1rem',
  fontWeight: 700,
  letterSpacing: '0.01em',
  borderBottom: '1px solid #bfdbfe',
};

function getDetailTableRowStyle(index) {
  return {
    background: index % 2 === 0 ? '#f8fbff' : '#eef4ff',
  };
}

const detailTableCellStyle = {
  padding: '0.85rem 1rem',
  color: '#1e293b',
  borderBottom: '1px solid #dbe4f0',
};

const ModalDetalleSimulacion = ({ simulacion, numeroSimulacion, onClose, onDelete }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  if (!simulacion) return null;

  const tablaGuardada = parseTableRows(simulacion.datos_adicionales);
  const tablaAmortizacion = hasCompleteAmortizationRows(tablaGuardada)
    ? tablaGuardada
    : buildAmortizationTable(simulacion);
  const scoringInfo = parseScoringDetail(simulacion.scoring_detalle);
  const scoringValue = scoringInfo?.scoring ?? scoringInfo?.score;
  const scoringStatus = scoringInfo?.estado ?? scoringInfo?.categoria;
  const isRejectedScoring = scoringStatus === 'rechazado';
  const weakPointRecommendations = buildWeakPointRecommendations(scoringInfo);
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
        <h2 style={{marginBottom:'1rem'}}>Detalle de Simulación {numeroSimulacion ? `#${numeroSimulacion}` : ''}</h2>
        <div style={{marginBottom:'1.2rem'}}>
          <strong>N° de simulación:</strong> {numeroSimulacion ? `#${numeroSimulacion}` : '-'}<br/>
          <strong>Tipo:</strong> {simulacion.tipo_prestamo}<br/>
          <strong>Monto:</strong> {formatCLP(simulacion.monto_simulado)}<br/>
          <strong>Plazo:</strong> {simulacion.plazo_simulado ?? '-'} meses<br/>
          <strong>Tasa:</strong> {isRejectedScoring ? 'No aplica por rechazo de scoring' : formatPercent(simulacion.tasa_aplicada)}<br/>
          <strong>Cuota:</strong> {isRejectedScoring ? 'No aplica por rechazo de scoring' : formatCLP(simulacion.cuota_calculada)}<br/>
          <strong>Fecha:</strong> {simulacion.fecha_simulacion ? new Date(simulacion.fecha_simulacion).toLocaleDateString('es-CL') : ''}<br/>
        </div>
        {tablaAmortizacion.length > 0 && !isRejectedScoring && (
          <>
            <h3 style={{marginBottom:'0.7rem'}}>Tabla de Amortización (12 meses)</h3>
            <div style={detailTableShellStyle}>
              <table style={detailTableStyle}>
                <thead>
                  <tr>
                    <th style={detailTableHeaderCellStyle}>Mes</th>
                    <th style={detailTableHeaderCellStyle}>Cuota</th>
                    <th style={detailTableHeaderCellStyle}>Capital</th>
                    <th style={detailTableHeaderCellStyle}>Interés</th>
                    <th style={detailTableHeaderCellStyle}>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {tablaAmortizacion.map((row, idx) => (
                    <tr key={idx} style={getDetailTableRowStyle(idx)}>
                      <td style={detailTableCellStyle}>{row.mes ?? '-'}</td>
                      <td style={detailTableCellStyle}>{formatCLP(row.cuota)}</td>
                      <td style={detailTableCellStyle}>{formatCLP(row.capital)}</td>
                      <td style={detailTableCellStyle}>{formatCLP(row.interes)}</td>
                      <td style={detailTableCellStyle}>{formatCLP(row.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Detalles de scoring si existen */}
        {hasRealScoring && (
          <div style={{marginTop:'1.5rem',background:'#f3f4f6',padding:'1rem 1.5rem',borderRadius:'10px'}}>
            <h3 style={{marginTop:0,marginBottom:'0.7rem',color:'#2563eb'}}>Scoring Crediticio</h3>
            <ul style={{listStyle:'none',padding:0,fontSize:'1rem'}}>
              {scoringValue !== undefined && scoringValue !== null && <li><b>Puntaje:</b> {scoringValue} / 100</li>}
              {scoringStatus && <li><b>Estado:</b> {getScoringStatusLabel(scoringStatus)}</li>}
              {scoringInfo.decision && <li><b>Resultado:</b> {scoringInfo.decision}</li>}
              {scoringInfo.dicom !== undefined && <li><b>DICOM:</b> {scoringInfo.dicom ? 'Sí' : 'No'}</li>}
              {scoringInfo.pensionAlimenticia !== undefined && <li><b>Pensión alimenticia:</b> {scoringInfo.pensionAlimenticia ? 'Sí' : 'No'}</li>}
              {scoringInfo.ingresos !== undefined && <li><b>Ingresos:</b> {formatCLP(scoringInfo.ingresos)}</li>}
              {scoringInfo.historial && <li><b>Historial:</b> {scoringInfo.historial}</li>}
              {scoringInfo.antiguedad !== undefined && <li><b>Antigüedad:</b> {scoringInfo.antiguedad} años</li>}
              {scoringInfo.endeudamiento !== undefined && <li><b>Endeudamiento:</b> {scoringInfo.endeudamiento}%</li>}
              {Array.isArray(scoringInfo.motivos) && scoringInfo.motivos.length > 0 && (
                <li style={{marginTop:'0.7rem'}}>
                  <b>Por qué no fue preaprobado:</b>
                  <ul style={{marginTop:'0.3rem',marginLeft:'1.2rem'}}>
                    {scoringInfo.motivos.map((motivo, index) => <li key={`${motivo}-${index}`}>{motivo}</li>)}
                  </ul>
                </li>
              )}
              {Array.isArray(scoringInfo.recomendaciones) && scoringInfo.recomendaciones.length > 0 && (
                <li style={{marginTop:'0.7rem'}}>
                  <b>Recomendaciones:</b>
                  <ul style={{marginTop:'0.3rem',marginLeft:'1.2rem'}}>
                    {scoringInfo.recomendaciones.map((recomendacion, index) => <li key={`${recomendacion}-${index}`}>{recomendacion}</li>)}
                  </ul>
                </li>
              )}
              {weakPointRecommendations.length > 0 && (
                <li style={{marginTop:'0.7rem'}}>
                  <b>Recomendaciones según tu menor puntaje:</b>
                  <ul style={{marginTop:'0.3rem',marginLeft:'1.2rem'}}>
                    {weakPointRecommendations.map((item) => (
                      <li key={item.key}>
                        <b>{item.label}</b> ({item.score} / {item.maxScore}): {item.recommendation}
                      </li>
                    ))}
                  </ul>
                </li>
              )}
              {scoringInfo.breakdown && (
                <li style={{marginTop:'0.7rem'}}>
                  <b>Detalle de puntaje:</b>
                  <ul style={{marginTop:'0.3rem',marginLeft:'1.2rem'}}>
                    {Object.entries(scoringInfo.breakdown).map(([key, value]) => <li key={key}>{getBreakdownLabel(key)}: {value}</li>)}
                  </ul>
                </li>
              )}
            </ul>
          </div>
        )}
        <button
          onClick={() => setShowConfirm(true)}
          style={{background:'#b91c1c',color:'#fff',border:'none',borderRadius:'6px',padding:'0.7rem 1.2rem',fontWeight:700,fontSize:'1rem',cursor:'pointer',marginTop:'1.25rem',marginBottom:'0.5rem'}}
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
