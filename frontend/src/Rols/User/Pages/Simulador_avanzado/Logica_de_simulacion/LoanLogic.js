import React from 'react';
import './LoanLogic.css';

const formulaLatex = `M = \frac{P \cdot r \cdot (1 + r)^n}{(1 + r)^n - 1}`;

function LoanLogic() {
  return (
    <div className="loan-logic-page">
      <div style={{display:'flex',justifyContent:'flex-start',alignItems:'center',marginBottom:'1.5rem'}}>
        <a href="/simulador-avanzado" style={{background:'#2563eb',color:'#fff',padding:'0.7rem 1.5rem',borderRadius:'8px',textDecoration:'none',fontWeight:600}}>Volver a Simulador</a>
      </div>
      <h1>Lógica del Simulador de Préstamos</h1>
      <section className="logic-section">
        <h2>¿Cómo se calcula la cuota mensual?</h2>
        <p>
          Ambos simuladores (básico y avanzado) usan la <strong>fórmula de cuota fija</strong> para préstamos:
        </p>
        <div className="formula-box">
          <span className="formula">M = P × r × (1 + r)<sup>n</sup> / [(1 + r)<sup>n</sup> - 1]</span>
        </div>
        <ul>
          <li><strong>M</strong>: Cuota mensual</li>
          <li><strong>P</strong>: Monto solicitado</li>
          <li><strong>r</strong>: Tasa de interés mensual</li>
          <li><strong>n</strong>: Número de meses (plazo)</li>
        </ul>
        <h3>Simulador Básico</h3>
        <p>
          - Solo permite préstamos personales.<br/>
          - Usa una tasa anual fija de <strong>8%</strong>.<br/>
          - La tasa mensual es 8% / 12 = 0.00667.<br/>
          - Ejemplo: $1.000.000 a 24 meses.
        </p>
        <div className="formula-box">
          <span className="formula">M = 1.000.000 × 0.00667 × (1 + 0.00667)<sup>24</sup> / [(1 + 0.00667)<sup>24</sup> - 1]</span>
        </div>
        <h3>Simulador</h3>
        <p>
          - Permite elegir tipo de préstamo:<br/>
          &nbsp;&nbsp;• Personal: <strong>12%</strong> anual<br/>
          &nbsp;&nbsp;• Automotriz: <strong>9%</strong> anual<br/>
          &nbsp;&nbsp;• Hipotecario: <strong>7%</strong> anual<br/>
          &nbsp;&nbsp;• Empresarial: <strong>15%</strong> anual<br/>
          - La tasa mensual varía según el tipo.<br/>
          - Ejemplo: Automotriz, $5.000.000 a 36 meses.<br/>
        </p>
        <div className="formula-box">
          <span className="formula">M = 5.000.000 × 0.0075 × (1 + 0.0075)<sup>36</sup> / [(1 + 0.0075)<sup>36</sup> - 1]</span>
        </div>
        <h3>¿Qué más incluye el avanzado?</h3>
        <ul>
          <li>Tabla de amortización (primeros 12 meses)</li>
          <li>Guardado automático de simulaciones</li>
          <li>Resultados detallados en CLP</li>
          <li>Segmentación y data útil para el usuario</li>
        </ul>
        <h3>Notas</h3>
        <ul>
          <li>Ambas simulaciones son referenciales y no consideran seguros ni otros gastos asociados.</li>
          <li>Para condiciones personalizadas, <strong>regístrate</strong> y usa el simulador avanzado.</li>
        </ul>
      </section>
    </div>
  );
}

export default LoanLogic;
