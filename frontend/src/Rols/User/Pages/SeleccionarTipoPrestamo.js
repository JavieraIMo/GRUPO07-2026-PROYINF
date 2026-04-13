import React from 'react';
import { useNavigate } from 'react-router-dom';
import './SeleccionarTipoPrestamo.css';

const tiposPrestamo = [
  {
    tipo: 'Consumo',
    descripcion: 'Préstamo para libre disposición, compras, viajes, imprevistos, etc. Rápido y flexible.',
    imagen: '/images/prestamo-consumo.png'
  },
  {
    tipo: 'Automotriz',
    descripcion: 'Financia la compra de tu auto nuevo o usado. Tasas preferenciales y plazos extendidos.',
    imagen: '/images/prestamo-auto.png'
  },
  {
    tipo: 'Hipotecario',
    descripcion: 'Compra tu casa o departamento. Plazos largos y montos altos, sujeto a evaluación.',
    imagen: '/images/prestamo-casa.png'
  }
];

function SeleccionarTipoPrestamo() {
  const navigate = useNavigate();

  const handleSelect = (tipo) => {
    navigate(`/simulador_basico?tipo=${encodeURIComponent(tipo)}`);
  };

  return (
    <div className="tipo-prestamo-container">
      <h1>Selecciona el tipo de préstamo</h1>
      <div className="tipos-lista">
        {tiposPrestamo.map(({ tipo, descripcion, imagen }) => (
          <div key={tipo} className="tipo-card">
            <img src={imagen} alt={tipo} className="tipo-img" />
            <h2>{tipo}</h2>
            <p>{descripcion}</p>
            <button onClick={() => handleSelect(tipo)}>Simular {tipo}</button>
          </div>
        ))}
      </div>
      <div style={{marginTop:32, textAlign:'center'}}>
        <h2 style={{fontSize:'1.3rem', color:'#2563eb', fontWeight:700, marginBottom:8}}>¿Quieres una simulación más realista?</h2>
        <p style={{marginBottom:16, color:'#374151'}}>Simula con tus datos reales y obtén una evaluación crediticia simulada (scoring) para saber si tu préstamo sería preaprobado.</p>
        <a href="/simulador-avanzado" style={{
          display:'inline-block',
          background:'linear-gradient(90deg, #2563eb 0%, #1e40af 100%)',
          color:'#fff',
          padding:'0.9rem 2.2rem',
          borderRadius:'10px',
          textDecoration:'none',
          fontWeight:800,
          fontSize:'1.15rem',
          boxShadow:'0 2px 12px rgba(37,99,235,0.13)',
          border:'none',
          transition:'background 0.2s, box-shadow 0.2s',
          letterSpacing:'0.5px',
          position:'relative',
          cursor:'pointer'
        }}>Simulación avanzada + scoring</a>
      </div>
    </div>
  );
}

export default SeleccionarTipoPrestamo;
