import React, { useState, useEffect } from 'react';
import DatosScoringForm from './DatosScoringForm';
import { useNavigate } from 'react-router-dom';
import './AdvancedLoanSimulator.css';

const LOAN_TYPES = [
  { label: 'Personal', value: 'personal', rate: 0.12 },
  { label: 'Automotriz', value: 'automotriz', rate: 0.09 },
  { label: 'Hipotecario', value: 'hipotecario', rate: 0.07 },
  { label: 'Empresarial', value: 'empresarial', rate: 0.15 },
];

function formatCLP(value) {
  return value.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });
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

function calculateAmortization(monto, plazo, tasa) {
  const cuota = (monto * (tasa / 12)) / (1 - Math.pow(1 + tasa / 12, -plazo));
  let saldo = monto;
  const tabla = [];
  for (let i = 1; i <= Math.min(plazo, 12); i++) {
    const interes = saldo * (tasa / 12);
    const capital = cuota - interes;
    saldo -= capital;
    tabla.push({
      mes: i,
      cuota: cuota,
      capital: capital,
      interes: interes,
      saldo: saldo > 0 ? saldo : 0,
    });
  }
  return { cuota, tabla };
}

const AdvancedLoanSimulator = ({ user }) => {
  const [plazoManual, setPlazoManual] = useState('');
  const [usarPlazoManual, setUsarPlazoManual] = useState(false);
  const [plazoError, setPlazoError] = useState('');
  const navigate = useNavigate();
  const MIN_AMOUNT = 100000;
  const MAX_AMOUNT = 50000000;
  const COMMON_TERMS = [12, 24, 36, 48, 60];
  const [tipo, setTipo] = useState('personal');
  const [monto, setMonto] = useState(MIN_AMOUNT);
  const [plazo, setPlazo] = useState(COMMON_TERMS[0]);
  const [resultados, setResultados] = useState(null);
  const [showScoringForm, setShowScoringForm] = useState(false);
  const [withScoring, setWithScoring] = useState(false);
  const [scoringResult, setScoringResult] = useState(null);
  const [scoringLoading, setScoringLoading] = useState(false);
  const [scoringError, setScoringError] = useState('');

  const resetScoringState = () => {
    setShowScoringForm(false);
    setScoringResult(null);
    setScoringError('');
  };

  const handleToggleScoring = (checked) => {
    setWithScoring(checked);
    if (!checked) {
      resetScoringState();
    }
  };

  const handleSimulate = (e) => {
    e.preventDefault();
    if (withScoring) {
      setScoringResult(null);
      setScoringError('');
      setShowScoringForm(true);
    } else {
      resetScoringState();
      // Simulación sin scoring: calcular y mostrar resultados directamente
      let tasa = LOAN_TYPES.find(t => t.value === tipo)?.rate || 0.12;
      let plazoNum = usarPlazoManual ? Number(plazoManual) : Number(plazo);
      const { cuota, tabla } = calculateAmortization(monto, plazoNum, tasa);
      setResultados({ cuota, tabla, tasa, plazoNum });

      // Guardar simulación automáticamente en historial
      if (user) {
        const simData = {
          tipo,
          monto,
          plazo: plazoNum,
          tasa,
          cuota,
          tabla
        };
        handleGuardarSimulacion(simData);
      }
    }
  };

  // Lógica para consumir el endpoint de scoring
  // --- FUNCIÓN REEMPLAZADA SEGÚN INSTRUCCIÓN ---
  const handleScoringSubmit = async (scoringData) => {
    setScoringLoading(true);
    setScoringError('');
    setScoringResult(null);

    try {
      // Mapeo correcto a los nombres que usa scoringController.js
      const payload = {
        dicom: scoringData.dicom,                        // boolean
        pensionAlimenticia: scoringData.pensionAlimenticia, // boolean
        ingresos: scoringData.ingresos,                  // number
        historial: scoringData.historial,                // string
        antiguedad: scoringData.antiguedad,              // number
        endeudamiento: scoringData.endeudamiento,        // number
        montoSolicitado: monto                           // number
      };

      console.log("[ALARA] Payload enviado al backend:", payload);

      const res = await fetch('http://localhost:3100/api/scoring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token ? { 'Authorization': `Bearer ${user.token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      console.log("[ALARA] Respuesta del backend:", data);


      if (data.ok) {
        setScoringResult(data);

        let tasaAjustada = LOAN_TYPES.find(t => t.value === tipo)?.rate || 0.12;
        let plazoNum = usarPlazoManual ? Number(plazoManual) : Number(plazo);

        if (data.estado === 'aprobado') {
          // tasa normal
        } else if (data.estado === 'condicionado') {
          tasaAjustada *= 1.2;      // +20% tasa
          plazoNum = Math.min(plazoNum, 24);
        } else {
          // rechazado → no simula cuotas
          setResultados(null);
          return;
        }

        const { cuota, tabla } = calculateAmortization(monto, plazoNum, tasaAjustada);
        setResultados({ cuota, tabla, tasa: tasaAjustada, plazoNum });
        setShowScoringForm(false);

        // Guardar simulación automáticamente en historial si user existe
        if (user) {
          const simData = {
            tipo,
            monto,
            plazo: plazoNum,
            tasa: tasaAjustada,
            cuota,
            tabla,
            scoring_detalle: data
          };
          handleGuardarSimulacion(simData);
        }

      } else {
        setScoringError(data.error || 'No se pudo calcular el scoring.');
      }

    } catch (err) {
      console.error(err);
      setScoringError('Error de conexión al calcular scoring.');
    } finally {
      setScoringLoading(false);
    }
  };

  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  const handleGuardarSimulacion = async (simData) => {
    // Recibe los datos como argumento para guardado automático
    if (!user) return;
    setGuardando(true);
    setMensaje(null);
    const payload = {
      tipo: simData.tipo,
      monto: simData.monto,
      plazo: simData.plazo,
      tasa: simData.tasa,
      cuota: simData.cuota,
      tabla: simData.tabla,
      ...(simData.scoring_detalle ? { scoring_detalle: simData.scoring_detalle } : {})
    };
    console.log('[ALARA][Frontend] Enviando simulación:', payload);
    try {
      const response = await fetch('http://localhost:3100/api/simulaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      console.log('[ALARA][Frontend] Respuesta backend:', data);
      if (response.ok && data.ok) {
        setMensaje('Simulación guardada exitosamente.');
      } else {
        setMensaje('Error al guardar la simulación.');
      }
    } catch (error) {
      setMensaje('Error de conexión al guardar.');
      console.error('[ALARA][Frontend] Error al guardar simulación:', error);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="advanced-simulator">
      <h2>Simulador Avanzado de Préstamos</h2>
      {!showScoringForm && (
        <form className="sim-form" onSubmit={handleSimulate}>
          <div className={`scoring-toggle-card ${withScoring ? 'scoring-toggle-card-active' : ''}`}>
            <div className="scoring-toggle-copy">
              <div className="scoring-toggle-header">
                <span className="scoring-toggle-badge">Opcional</span>
                <span className="scoring-toggle-title">Agregar scoring a la simulación</span>
              </div>
              <span className="scoring-toggle-description">
                Evalúa riesgo crediticio y guarda el resultado en el historial solo cuando esta opción esté activada.
              </span>
            </div>
            <button
              type="button"
              className={`scoring-toggle-button ${withScoring ? 'scoring-toggle-button-active' : ''}`}
              onClick={() => handleToggleScoring(!withScoring)}
              aria-pressed={withScoring}
            >
              <span className="scoring-toggle-button-state">{withScoring ? 'Activado' : 'Desactivado'}</span>
              <span className="scoring-toggle-button-hint">{withScoring ? 'Con scoring' : 'Sin scoring'}</span>
            </button>
          </div>
          <label>Tipo de préstamo:</label>
          <select value={tipo} onChange={e => setTipo(e.target.value)}>
            {LOAN_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <label>Monto (CLP):</label>
          <input
            type="range"
            min={MIN_AMOUNT}
            max={MAX_AMOUNT}
            step={10000}
            value={monto}
            onChange={e => setMonto(Number(e.target.value))}
            style={{marginBottom: '8px'}}
          />
          <input
            type="number"
            min={MIN_AMOUNT}
            max={MAX_AMOUNT}
            step={10000}
            value={monto}
            onChange={e => {
              let val = Number(e.target.value);
              if (val < MIN_AMOUNT) val = MIN_AMOUNT;
              if (val > MAX_AMOUNT) val = MAX_AMOUNT;
              setMonto(val);
            }}
            style={{width: '100%', marginBottom: '4px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem'}}
          />
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#6b7280', marginTop: '2px'}}>
            <span>Mín: {formatCLP(MIN_AMOUNT)}</span>
            <span>Máx: {formatCLP(MAX_AMOUNT)}</span>
          </div>
          <div style={{marginTop: '8px', fontWeight: 'bold', color: '#001763', fontSize: '1.1rem'}}>Monto seleccionado: {formatCLP(monto)}</div>
          <label>Plazo (meses): <span style={{color:'#6b7280',fontWeight:400}}>(entre 6 y 360 meses)</span></label>
          <select
            value={usarPlazoManual ? 'otro' : plazo}
            onChange={e => {
              if (e.target.value === 'otro') {
                setUsarPlazoManual(true);
                setPlazoManual('');
                setPlazoError('');
              } else {
                setUsarPlazoManual(false);
                setPlazo(Number(e.target.value));
                setPlazoError('');
              }
            }}
            style={{width: '100%', marginBottom: '8px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem'}}
          >
            {COMMON_TERMS.map(t => <option key={t} value={t}>{t} meses</option>)}
            <option value="otro">Otro</option>
          </select>
          {usarPlazoManual && (
            <input
              type="number"
              min={6}
              max={360}
              value={plazoManual}
              placeholder="Escribe el plazo (6-360)"
              onChange={e => {
                const val = e.target.value;
                setPlazoManual(val);
                if (val !== '' && Number(val) < 6) {
                  setPlazoError('No es posible el cálculo con menos de 6 meses de plazo.');
                } else {
                  setPlazoError('');
                }
              }}
              style={{width: '100%', marginBottom: '8px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem'}}
            />
          )}
          {plazoError && (
            <div style={{color:'#b91c1c',fontWeight:500,marginBottom:'8px'}}>{plazoError}</div>
          )}
          <datalist id="plazo-sugerencias">
            {COMMON_TERMS.map(t => <option key={t} value={t} />)}
          </datalist>
          <button type="submit" style={{width: '100%', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.7rem 0', fontWeight: 700, fontSize: '1.08rem', cursor: 'pointer', marginTop: '8px'}}>Simular</button>
        </form>
      )}
      {showScoringForm && !scoringResult && (
        <DatosScoringForm onSubmit={handleScoringSubmit} loading={scoringLoading} />
      )}
      {scoringError && <div style={{color:'#b91c1c',margin:'1rem 0',fontWeight:500}}>{scoringError}</div>}
      {scoringResult && (
        <div className="scoring-result" style={{background:'#f3f4f6',padding:'1.5rem',borderRadius:12,margin:'1.5rem 0',display:'flex',gap:'2rem',flexWrap:'wrap'}}>
          <div style={{flex:'1 1 320px'}}>
            <h3>Resultado de Scoring</h3>
            <p><b>Tu puntaje crediticio:</b> <span style={{fontSize:'1.5rem',color:'#2563eb'}}>{scoringResult.scoring}</span> / 100</p>
            <ul style={{margin:'1rem 0 0 0',padding:0,listStyle:'none'}}>
              <li>DICOM: <b>{scoringResult.breakdown.scoreDICOM} / 30</b></li>
              <li>Pensión alimenticia: <b>{scoringResult.breakdown.scorePension} / 15</b></li>
              <li>Ingresos: <b>{scoringResult.breakdown.scoreIngresos} / 20</b></li>
              <li>Historial: <b>{scoringResult.breakdown.scoreHistorial} / 20</b></li>
              <li>Antigüedad: <b>{scoringResult.breakdown.scoreAntiguedad} / 10</b></li>
              <li>Endeudamiento: <b>{scoringResult.breakdown.scoreEndeudamiento} / 5</b></li>
            </ul>
            <div style={{margin:'1rem 0',fontWeight:600,fontSize:'1.1rem'}}>
              {scoringResult.estado === 'aprobado' && (
                <span style={{color:'#059669'}}>¡Preaprobado! Puedes continuar con la solicitud formal para evaluación final.</span>
              )}
              {scoringResult.estado === 'condicionado' && (
                <span style={{color:'#eab308'}}>Condicionado. Un ejecutivo revisará tu caso y podría requerir más antecedentes.</span>
              )}
              {scoringResult.estado === 'rechazado' && (
                <span style={{color:'#b91c1c'}}>Rechazado. No cumples con el mínimo requerido para este monto.</span>
              )}
            </div>
          </div>
          {/* Resumen de datos ingresados */}
          <div style={{flex:'1 1 260px',background:'#fff',borderRadius:10,padding:'1rem',boxShadow:'0 2px 8px #0001',minWidth:220}}>
            <h4 style={{marginTop:0,marginBottom:'0.7rem',color:'#001763'}}>Datos ingresados</h4>
            <ul style={{listStyle:'none',padding:0,margin:0,fontSize:'1rem'}}>
              <li><b>Resultado:</b> {getScoringStatusLabel(scoringResult.estado)}</li>
              <li><b>DICOM:</b> {scoringResult.dicom !== undefined ? (scoringResult.dicom ? 'Sí' : 'No') : '-'}</li>
              <li><b>Pensión alimenticia:</b> {scoringResult.pensionAlimenticia !== undefined ? (scoringResult.pensionAlimenticia ? 'Sí' : 'No') : '-'}</li>
              <li><b>Ingresos:</b> {scoringResult.ingresos !== undefined ? scoringResult.ingresos.toLocaleString('es-CL') : '-'}</li>
              <li><b>Historial:</b> {scoringResult.historial || '-'}</li>
              <li><b>Antigüedad:</b> {scoringResult.antiguedad !== undefined ? scoringResult.antiguedad + ' años' : '-'}</li>
              <li><b>Endeudamiento:</b> {scoringResult.endeudamiento !== undefined ? scoringResult.endeudamiento + '%' : '-'}</li>
              <li><b>Monto solicitado:</b> {scoringResult.monto !== undefined ? scoringResult.monto.toLocaleString('es-CL') : '-'}</li>
            </ul>
          </div>
        </div>
      )}
      {resultados && (!scoringResult || (scoringResult && scoringResult.estado !== 'rechazado')) && (
        <div className="sim-results">
          <h3>Resultados</h3>
          <p><strong>Plazo simulado:</strong> {resultados.plazoNum || (usarPlazoManual ? plazoManual : plazo)} meses</p>
          <p><strong>Cuota mensual:</strong> {typeof resultados.cuota === 'number' ? formatCLP(resultados.cuota) : JSON.stringify(resultados.cuota)}</p>
          <p><strong>Tasa anual:</strong> {typeof resultados.tasa === 'number' ? (resultados.tasa * 100).toFixed(2) + '%' : JSON.stringify(resultados.tasa)}</p>
          {scoringResult && scoringResult.estado === 'condicionado' && (
            <div style={{color:'#eab308',fontWeight:500,marginBottom:'8px'}}>Por política de riesgo, el plazo máximo sugerido es 24 meses y la tasa es mayor.</div>
          )}
          <h4>Tabla de Amortización (12 meses)</h4>
          <table>
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
              {Array.isArray(resultados.tabla) && resultados.tabla.map(row => (
                <tr key={row.mes}>
                  <td>{typeof row.mes === 'number' ? row.mes : JSON.stringify(row.mes)}</td>
                  <td>{typeof row.cuota === 'number' ? formatCLP(row.cuota) : JSON.stringify(row.cuota)}</td>
                  <td>{typeof row.capital === 'number' ? formatCLP(row.capital) : JSON.stringify(row.capital)}</td>
                  <td>{typeof row.interes === 'number' ? formatCLP(row.interes) : JSON.stringify(row.interes)}</td>
                  <td>{typeof row.saldo === 'number' ? formatCLP(row.saldo) : JSON.stringify(row.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {mensaje && (
            <div style={{marginTop:'10px',color:mensaje.includes('exitosamente')?'#059669':'#b91c1c',fontWeight:500}}>{mensaje}</div>
          )}
        </div>
      )}
      <div style={{textAlign: 'center', marginTop: '18px'}}>
        <a href="/logica-simulador" style={{color: '#001763', textDecoration: 'underline', fontWeight: 500, fontSize: '1rem'}}>
          Ver cómo se calcula la cuota
        </a>
      </div>
    </div>
  );
};

export default AdvancedLoanSimulator;
