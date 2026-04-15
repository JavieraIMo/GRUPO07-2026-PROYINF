import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ConsentimientoAvanzado from './ConsentimientoAvanzado';

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

function formatCLP(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return '-';
  }

  return numericValue.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });
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

function formatLoanType(tipoPrestamo) {
  if (!tipoPrestamo) {
    return 'No disponible';
  }

  return tipoPrestamo.charAt(0).toUpperCase() + tipoPrestamo.slice(1).toLowerCase();
}

function buildFormState(user, simulation) {
  return {
    nombre: user?.nombre || '',
    rut: user?.rut || '',
    email: user?.email || '',
    monto: simulation?.monto ? String(simulation.monto) : '',
    plazo: simulation?.plazo ? String(simulation.plazo) : '',
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
  };
}

function PostulacionForm({ user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const simulationState = location.state?.simulacion
    ? {
        id: location.state?.simulacionId ?? location.state.simulacion.id ?? null,
        tipo: location.state.simulacion.tipo,
        monto: Number(location.state.simulacion.monto),
        plazo: Number(location.state.simulacion.plazo),
      }
    : null;
  const [consentOk, setConsentOk] = useState(false);
  const [selectionConfirmed, setSelectionConfirmed] = useState(false);
  const [selectedSimulation, setSelectedSimulation] = useState(simulationState);
  const [simulaciones, setSimulaciones] = useState([]);
  const [loadingSimulaciones, setLoadingSimulaciones] = useState(true);
  const [simulacionesError, setSimulacionesError] = useState('');
  const [autoCompletar, setAutoCompletar] = useState(true);
  const [form, setForm] = useState(() => buildFormState(user, simulationState));
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    if (!user?.token) {
      setLoadingSimulaciones(false);
      setSimulaciones([]);
      return;
    }

    setLoadingSimulaciones(true);
    setSimulacionesError('');

    fetch('http://localhost:3100/api/simulaciones', {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok) {
          setSimulacionesError(data.error || 'No se pudieron cargar las simulaciones preaprobadas.');
          setSimulaciones([]);
          return;
        }

        setSimulaciones(Array.isArray(data.simulaciones) ? data.simulaciones : []);
      })
      .catch(() => {
        setSimulacionesError('Error de conexión al cargar las simulaciones preaprobadas.');
        setSimulaciones([]);
      })
      .finally(() => {
        setLoadingSimulaciones(false);
      });
  }, [user]);

  useEffect(() => {
    if (selectedSimulation) {
      setForm((currentForm) => ({
        ...currentForm,
        monto: selectedSimulation.monto ? String(selectedSimulation.monto) : '',
        plazo: selectedSimulation.plazo ? String(selectedSimulation.plazo) : '',
      }));
    }
  }, [selectedSimulation]);

  const simulacionesPreaprobadas = simulaciones.filter((simulacion) => {
    const scoringInfo = parseScoringDetail(simulacion.scoring_detalle);
    const scoringStatus = scoringInfo?.estado ?? scoringInfo?.categoria;

    return scoringStatus === 'aprobado' && !simulacion.estado_postulacion;
  });

  const simulationId = selectedSimulation?.id ?? null;

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSelectSimulation = (simulacion) => {
    setSelectedSimulation({
      id: simulacion.id,
      tipo: simulacion.tipo_prestamo,
      monto: Number(simulacion.monto_simulado),
      plazo: Number(simulacion.plazo_simulado),
      fecha: simulacion.fecha_simulacion,
    });
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
        body: JSON.stringify({ ...form, simulacionId: simulationId, tipoPrestamo: selectedSimulation?.tipo ?? null })
      });
      const data = await res.json();
      if (data.ok) {
        navigate('/historial-postulaciones');
      } else {
        setMensaje(data.error || 'Error al registrar la solicitud.');
      }
    } catch (err) {
      setMensaje('Error de conexión al registrar la solicitud.');
    } finally {
      setEnviando(false);
    }
  };

  if (!selectionConfirmed) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f3f4f6 0%, #e0e7ff 100%)', padding: '2rem 0' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', background: '#fff', borderRadius: 18, boxShadow: '0 4px 32px #0002', padding: '2.2rem 2rem', border: '1.5px solid #e0e7ff' }}>
          <span style={{ display: 'inline-flex', padding: '0.35rem 0.75rem', borderRadius: 999, background: '#dbeafe', color: '#1d4ed8', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Paso 1
          </span>
          <h2 style={{ margin: '1rem 0 0.8rem', color: '#1e293b', fontWeight: 800 }}>Selecciona una simulación preaprobada</h2>
          <p style={{ margin: 0, color: '#475569', lineHeight: 1.6, maxWidth: '52rem' }}>
            Para iniciar una postulación debes elegir una simulación con scoring preaprobado. Luego podrás continuar con el consentimiento y completar el formulario.
          </p>

          <div style={{ marginTop: '1.5rem' }}>
            {loadingSimulaciones && <p style={{ color: '#475569' }}>Cargando simulaciones preaprobadas...</p>}
            {!loadingSimulaciones && simulacionesError && <p style={{ color: '#b91c1c' }}>{simulacionesError}</p>}
            {!loadingSimulaciones && !simulacionesError && simulacionesPreaprobadas.length === 0 && (
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 14, padding: '1rem 1.1rem', color: '#9a3412' }}>
                No tienes simulaciones preaprobadas disponibles en este momento.
              </div>
            )}

            {!loadingSimulaciones && !simulacionesError && simulacionesPreaprobadas.length > 0 && (
              <div style={{ display: 'grid', gap: '0.9rem' }}>
                {simulacionesPreaprobadas.map((simulacion) => {
                  const isSelected = selectedSimulation?.id === simulacion.id;

                  return (
                    <button
                      key={simulacion.id}
                      type="button"
                      onClick={() => handleSelectSimulation(simulacion)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: isSelected ? '#eff6ff' : '#ffffff',
                        border: isSelected ? '2px solid #2563eb' : '1px solid #dbe7ff',
                        borderRadius: 16,
                        padding: '1rem 1.1rem',
                        cursor: 'pointer',
                        boxShadow: isSelected ? '0 10px 24px rgba(37, 99, 235, 0.12)' : '0 6px 18px rgba(15, 23, 42, 0.04)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                        <div>
                          <strong style={{ display: 'block', color: '#001763', fontSize: '1.08rem' }}>{formatLoanType(simulacion.tipo_prestamo)}</strong>
                          <span style={{ color: '#475569' }}>{formatCLP(simulacion.monto_simulado)} a {simulacion.plazo_simulado} meses</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ display: 'inline-flex', padding: '0.28rem 0.65rem', borderRadius: 999, background: '#dcfce7', color: '#166534', fontWeight: 700, fontSize: '0.82rem' }}>
                            Preaprobada
                          </span>
                          <div style={{ marginTop: '0.45rem', color: '#475569', fontSize: '0.92rem' }}>
                            {simulacion.fecha_simulacion ? new Date(simulacion.fecha_simulacion).toLocaleDateString('es-CL') : 'Sin fecha'}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ marginTop: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '1rem 1.1rem' }}>
            <strong style={{ display: 'block', color: '#001763', marginBottom: '0.35rem' }}>¿Quieres postular con otra simulación sin scoring?</strong>
            <p style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>
              Si la simulación que quieres usar fue realizada sin scoring, primero debes completar el scoring de esa simulación desde el historial de simulaciones para que pueda quedar preaprobada.
            </p>
            <button
              type="button"
              onClick={() => navigate('/historial-simulaciones')}
              style={{ marginTop: '0.9rem', background: '#001763', color: '#fff', border: 'none', borderRadius: 10, padding: '0.85rem 1.1rem', fontWeight: 700, cursor: 'pointer' }}
            >
              Ir a Historial Simulaciones
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button
              type="button"
              onClick={() => setSelectionConfirmed(true)}
              disabled={!selectedSimulation}
              style={{
                background: selectedSimulation ? '#2563eb' : '#94a3b8',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '0.95rem 1.3rem',
                fontWeight: 700,
                cursor: selectedSimulation ? 'pointer' : 'not-allowed',
              }}
            >
              Continuar con la simulación seleccionada
            </button>
          </div>
        </div>
      </div>
    );
  }

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
}

export default PostulacionForm;
