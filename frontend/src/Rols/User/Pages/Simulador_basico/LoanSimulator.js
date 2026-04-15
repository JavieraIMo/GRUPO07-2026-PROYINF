import './LoanSimulator.css';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function formatCLP(value) {
  return value.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });
}

const MIN_AMOUNT = 100000;
const MAX_AMOUNT = 50000000;
const TERMS = [12, 24, 36, 48, 60];
const ANNUAL_RATE = 0.08;

function calculateLoan(amount, term) {
  const monthlyRate = ANNUAL_RATE / 12;
  const n = term;
  const r = monthlyRate;
  const M = amount * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  const total = M * n;
  const interest = total - amount;
  return {
    monthlyPayment: M,
    totalPayment: total,
    interest: interest
  };
}

const LoanSimulator = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState(MIN_AMOUNT);
  const [term, setTerm] = useState(TERMS[0]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [withScoring, setWithScoring] = useState(false);
  const [showScoringForm, setShowScoringForm] = useState(false);
  const [scoring, setScoring] = useState({
    endeudamiento: '',
    dicom: '',
    pensionAlimenticia: ''
  });

  const handleSimulate = (e) => {
    e.preventDefault();
    setError("");
    if (amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      setError("El monto debe estar entre " + MIN_AMOUNT + " y " + MAX_AMOUNT);
      return;
    }
    const res = calculateLoan(amount, term);
    setResult(res);
    if (withScoring) {
      setShowScoringForm(true);
    } else {
      handleSaveSimulacion(null, res);
    }
  };

  const handleSaveSimulacion = async (scoringManual, resArg) => {
    const resToUse = resArg || result;
    const payload = {
      tipo: 'PERSONAL',
      monto: amount,
      plazo: term,
      tasa: ANNUAL_RATE,
      cuota: resToUse ? resToUse.monthlyPayment : null,
      tabla: [],
      scoring_detalle: scoringManual || null
    };
    try {
      const response = await fetch('/api/simulaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        setError('Error al guardar simulación: ' + response.statusText);
        return;
      }
      navigate('/historial-simulaciones');
    } catch (err) {
      setError('Error al guardar simulación: ' + err.message);
      console.error('Error al guardar simulación', err);
    }
  };

  return (
    <div className="loan-simulator">
      <h2>Simulador de Préstamos</h2>
      {error && <div style={{color: 'red', marginBottom: '10px'}}>{error}</div>}
      <form onSubmit={handleSimulate}>
        <div style={{marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px'}}>
          <input
            type="checkbox"
            id="withScoringCheckbox"
            checked={withScoring}
            onChange={e => setWithScoring(e.target.checked)}
            style={{width: '18px', height: '18px', accentColor: '#2563eb'}}
          />
          <label htmlFor="withScoringCheckbox" style={{fontSize: '1.08rem', fontWeight: 500, cursor: 'pointer', color: '#001763', margin: 0}}>
            Simular con scoring avanzado
          </label>
        </div>
        <div>
          <label>Monto (CLP):</label>
          <input
            type="range"
            min={MIN_AMOUNT}
            max={MAX_AMOUNT}
            step={10000}
            value={amount}
            onChange={e => setAmount(Number(e.target.value))}
            style={{marginBottom: '8px'}}
          />
          <input
            type="number"
            min={MIN_AMOUNT}
            max={MAX_AMOUNT}
            step={10000}
            value={amount}
            onChange={e => {
              let val = Number(e.target.value);
              if (val < MIN_AMOUNT) val = MIN_AMOUNT;
              if (val > MAX_AMOUNT) val = MAX_AMOUNT;
              setAmount(val);
            }}
            style={{width: '100%', marginBottom: '4px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '1rem'}}
          />
          <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', color: '#6b7280', marginTop: '2px'}}>
            <span>Mín: {formatCLP(MIN_AMOUNT)}</span>
            <span>Máx: {formatCLP(MAX_AMOUNT)}</span>
          </div>
          <div style={{marginTop: '8px', fontWeight: 'bold', color: '#001763', fontSize: '1.1rem'}}>Monto seleccionado: {formatCLP(amount)}</div>
        </div>
        <div>
          <label>Plazo (meses): </label>
          <select value={term} onChange={e => setTerm(Number(e.target.value))}>
            {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <button type="submit" style={{width: '100%', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.7rem 0', fontWeight: 700, fontSize: '1.08rem', cursor: 'pointer', marginTop: '8px'}}>Simular</button>
      </form>
      {showScoringForm && (
        <div style={{marginTop: '18px', border: '1px solid #d1d5db', borderRadius: '8px', padding: '16px', background: '#f9fafb'}}>
          <h4 style={{margin: 0, marginBottom: '8px'}}>Datos para scoring</h4>
          <div style={{marginBottom: '8px'}}>
            <label>Endeudamiento (%): </label>
            <input
              type="number"
              min={0}
              max={100}
              value={scoring.endeudamiento}
              onChange={e => setScoring(s => ({...s, endeudamiento: e.target.value}))}
              style={{width: '60px', marginLeft: '8px'}}
            />
          </div>
          <div style={{marginBottom: '8px'}}>
            <label>DICOM: </label>
            <select
              value={scoring.dicom}
              onChange={e => setScoring(s => ({...s, dicom: e.target.value}))}
              style={{marginLeft: '8px'}}
            >
              <option value="">Seleccione</option>
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
          </div>
          <div style={{marginBottom: '8px'}}>
            <label>Pensión alimenticia: </label>
            <select
              value={scoring.pensionAlimenticia}
              onChange={e => setScoring(s => ({...s, pensionAlimenticia: e.target.value}))}
              style={{marginLeft: '8px'}}
            >
              <option value="">Seleccione</option>
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
          </div>
          <button onClick={() => { handleSaveSimulacion(scoring); }} style={{marginTop:'10px', background:'#3b82f6', color:'#fff', border:'none', borderRadius:'6px', padding:'0.7rem 1.2rem', fontWeight:700, fontSize:'1.08rem', cursor:'pointer'}}>Guardar simulación con scoring</button>
        </div>
      )}
      <div style={{textAlign: 'center', marginTop: '10px'}}>
        <a href="/logica-simulador-basico" style={{color: '#001763', textDecoration: 'underline', fontWeight: 500}}>
          Ver cómo se calcula la cuota
        </a>
      </div>
      {result && (
        <div className="loan-results">
          <h3>Resultados</h3>
          <p>Cuota mensual: <strong>{formatCLP(result.monthlyPayment)}</strong></p>
          <p>Total a pagar: <strong>{formatCLP(result.totalPayment)}</strong></p>
          <p>Intereses: <strong>{formatCLP(result.interest)}</strong></p>
          <p>Tasa fija anual: <strong>8%</strong></p>
        </div>
      )}
    </div>
  );
};

export default LoanSimulator;
