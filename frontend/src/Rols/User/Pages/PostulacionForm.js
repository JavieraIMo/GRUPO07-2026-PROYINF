// Estilo base para inputs
const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 7,
  border: '1.5px solid #cbd5e1',
  fontSize: '1rem',
  marginTop: 4,
  marginBottom: 2,
  background: '#f8fafc',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border 0.2s'
};
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import ConsentimientoAvanzado from './ConsentimientoAvanzado';

function PostulacionForm({ user }) {
  const location = useLocation();
  const simulationState = location.state?.simulacion;
  const simulationId = location.state?.simulacionId ?? simulationState?.id ?? null;
  const [consentOk, setConsentOk] = useState(false);
  const [autoCompletar, setAutoCompletar] = useState(true);
  const [form, setForm] = useState({
    nombre: user?.nombre || '',
    rut: user?.rut || '',
    email: user?.email || '',
    monto: simulationState?.monto ? String(simulationState.monto) : '',
    plazo: simulationState?.plazo ? String(simulationState.plazo) : '',
    situacionLaboral: '',
    tipoTrabajo: '',
    empresa: '',
    antiguedad: '',
    tipoContrato: '',
    ingresos: '',
    otrosIngresos: '',
    arriendo: '',
    gastos: '',
    dependientes: '',
    creditosVigentes: '',
    tarjetas: '',
    cuotas: '',
    cuentaDeposito: '',
  });
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setEnviando(true);
    setMensaje('');
    try {
      const res = await fetch('http://localhost:3100/api/solicitud', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token ? { 'Authorization': `Bearer ${user.token}` } : {})
        },
        body: JSON.stringify({ ...form, simulacionId: simulationId })
      });
      const data = await res.json();
      if (data.ok) {
        setMensaje('¡Solicitud enviada con éxito!');
      } else {
        setMensaje(data.error || 'Error al registrar la solicitud.');
      }
    } catch (err) {
      setMensaje('Error de conexión al registrar la solicitud.');
    } finally {
      setEnviando(false);
    }
  };

  if (!consentOk) {
    return (
      <div className="consentimiento-avanzado-overlay">
        <ConsentimientoAvanzado onAccept={() => setConsentOk(true)} />
      </div>
    );
  }



  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f3f4f6 0%, #e0e7ff 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 0'
    }}>
      <div style={{
        maxWidth: 480,
        width: '100%',
        background: '#fff',
        borderRadius: 18,
        boxShadow: '0 4px 32px #0002',
        padding: '2.2rem 2rem',
        margin: '0 auto',
        border: '1.5px solid #e0e7ff'
      }}>
        <h2 style={{textAlign:'center',marginBottom:24,color:'#1e293b',fontWeight:800,letterSpacing:0.5}}>Solicitud Formal de Préstamo</h2>
        <div style={{marginBottom:20,display:'flex',justifyContent:'center',gap:24}}>
          <label style={{fontWeight:600,display:'flex',alignItems:'center',gap:6}}>
            <input type="radio" checked={autoCompletar} onChange={()=>setAutoCompletar(true)} />
            Usar mis datos validados
          </label>
          <label style={{fontWeight:600,display:'flex',alignItems:'center',gap:6}}>
            <input type="radio" checked={!autoCompletar} onChange={()=>setAutoCompletar(false)} />
            Rellenar manualmente
          </label>
        </div>
        {!autoCompletar && (
          <div style={{background:'#fef3c7',color:'#92400e',padding:'0.7rem 1rem',borderRadius:8,marginBottom:16,fontSize:'0.98rem',textAlign:'center'}}>
            <b>Advertencia:</b> Si rellenas tus datos manualmente, la revisión puede demorar más ya que se requerirá validación adicional.
          </div>
        )}
        <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:14}}>
          <label style={{fontWeight:500}}>Nombre:
            <input name="nombre" value={form.nombre} onChange={handleChange} required disabled={autoCompletar} style={{...inputStyle}} />
          </label>
          <label style={{fontWeight:500}}>RUT:
            <input name="rut" value={form.rut} onChange={handleChange} required disabled={autoCompletar} style={{...inputStyle}} />
          </label>
          <label style={{fontWeight:500}}>Email:
            <input name="email" value={form.email} onChange={handleChange} required type="email" disabled={autoCompletar} style={{...inputStyle}} />
          </label>
          <label style={{fontWeight:500}}>Monto solicitado:
            <input name="monto" value={form.monto} onChange={handleChange} required type="number" style={{...inputStyle}} />
          </label>
          <label style={{fontWeight:500}}>Plazo (meses):
            <input name="plazo" value={form.plazo} onChange={handleChange} required type="number" style={{...inputStyle}} />
          </label>
          <hr style={{margin:'1.2rem 0'}} />
          <h4 style={{margin:'0.5rem 0',color:'#3b82f6',fontWeight:700}}>Situación Laboral y Financiera</h4>
          <label style={{fontWeight:500}}>Situación laboral:
            <select name="situacionLaboral" value={form.situacionLaboral} onChange={handleChange} required style={{...inputStyle}}>
              <option value="">Selecciona...</option>
              <option value="dependiente">Dependiente</option>
              <option value="independiente">Independiente</option>
              <option value="cesante">Cesante</option>
              <option value="jubilado">Jubilado</option>
              <option value="otro">Otro</option>
            </select>
          </label>
          <label style={{fontWeight:500}}>Tipo de trabajo:
            <input name="tipoTrabajo" value={form.tipoTrabajo} onChange={handleChange} required style={{...inputStyle}} />
          </label>
          <label style={{fontWeight:500}}>Empresa:
            <input name="empresa" value={form.empresa} onChange={handleChange} style={{...inputStyle}} />
          </label>
          <label style={{fontWeight:500}}>Antigüedad laboral (años):
            <input name="antiguedad" value={form.antiguedad} onChange={handleChange} type="number" min={0} max={50} required style={{...inputStyle}} />
          </label>
          <label style={{fontWeight:500}}>Tipo de contrato:
            <select name="tipoContrato" value={form.tipoContrato} onChange={handleChange} required style={{...inputStyle}}>
              <option value="">Selecciona...</option>
              <option value="indefinido">Indefinido</option>
              <option value="plazo fijo">Plazo fijo</option>
              <option value="honorarios">Honorarios</option>
              <option value="otro">Otro</option>
            </select>
          </label>
          <label style={{fontWeight:500}}>Ingreso líquido mensual (CLP):
            <input name="ingresos" value={form.ingresos} onChange={handleChange} type="number" min={0} required style={{...inputStyle}} />
          </label>
          <label style={{fontWeight:500}}>Otros ingresos (CLP):
            <input name="otrosIngresos" value={form.otrosIngresos} onChange={handleChange} type="number" min={0} style={{...inputStyle}} />
          </label>
          <label style={{fontWeight:500}}>Arriendo/dividendo (CLP):
            <input name="arriendo" value={form.arriendo} onChange={handleChange} type="number" min={0} style={{...inputStyle}} />
          </label>
          <label style={{fontWeight:500}}>Gastos mensuales aprox. (CLP):
            <input name="gastos" value={form.gastos} onChange={handleChange} type="number" min={0} required style={{...inputStyle}} />
          </label>
          <label style={{fontWeight:500}}>Dependientes:
            <input name="dependientes" value={form.dependientes} onChange={handleChange} type="number" min={0} required style={{...inputStyle}} />
          </label>
          <label style={{fontWeight:500}}>Créditos vigentes:
            <input name="creditosVigentes" value={form.creditosVigentes} onChange={handleChange} type="number" min={0} style={{...inputStyle}} />
          </label>
          <label style={{fontWeight:500}}>Tarjetas activas:
            <input name="tarjetas" value={form.tarjetas} onChange={handleChange} type="number" min={0} style={{...inputStyle}} />
          </label>
          <label style={{fontWeight:500}}>Cuotas actuales:
            <input name="cuotas" value={form.cuotas} onChange={handleChange} type="number" min={0} style={{...inputStyle}} />
          </label>
          <label style={{fontWeight:500}}>Cuenta para depósito:
            <input name="cuentaDeposito" value={form.cuentaDeposito} onChange={handleChange} required style={{...inputStyle}} />
          </label>
          <button type="submit" disabled={enviando} style={{
            marginTop:16,
            background:'#3b82f6',
            color:'#fff',
            border:'none',
            borderRadius:8,
            padding:'0.9rem 0',
            fontWeight:700,
            fontSize:'1.13rem',
            boxShadow:'0 2px 8px #3b82f633',
            cursor: enviando ? 'not-allowed' : 'pointer',
            transition:'background 0.2s'
          }}>{enviando ? 'Enviando...' : 'Enviar Solicitud'}</button>
          {mensaje && <div style={{color:'#059669',marginTop:14,textAlign:'center',fontWeight:600}}>{mensaje}</div>}
        </form>
      </div>
    </div>
  );

// Estilo base para inputs
const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 7,
  border: '1.5px solid #cbd5e1',
  fontSize: '1rem',
  marginTop: 4,
  marginBottom: 2,
  background: '#f8fafc',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border 0.2s'
};
}

export default PostulacionForm;
