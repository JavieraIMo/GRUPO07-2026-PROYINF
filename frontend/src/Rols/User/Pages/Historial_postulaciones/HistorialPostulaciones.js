import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function parseApplicationDetails(documentosAdjuntos) {
  if (!documentosAdjuntos) {
    return null;
  }

  if (typeof documentosAdjuntos === 'string') {
    try {
      const parsed = JSON.parse(documentosAdjuntos);
      return typeof parsed === 'string' ? parseApplicationDetails(parsed) : parsed;
    } catch {
      return null;
    }
  }

  return documentosAdjuntos;
}

function normalizeSolicitud(solicitud) {
  return {
    ...solicitud,
    documentos_adjuntos: parseApplicationDetails(solicitud?.documentos_adjuntos) || {},
  };
}

function buildSimulationNumberMap(simulaciones) {
  return simulaciones
    .slice()
    .sort((a, b) => {
      const fechaA = new Date(a.fecha_simulacion).getTime();
      const fechaB = new Date(b.fecha_simulacion).getTime();

      if (fechaA !== fechaB) {
        return fechaA - fechaB;
      }

      return a.id - b.id;
    })
    .reduce((acc, simulacion, index) => {
      acc[simulacion.id] = index + 1;
      return acc;
    }, {});
}

function formatCLP(value) {
  if (value === '' || value === null || value === undefined) {
    return '-';
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return '-';
  }

  return amount.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });
}

function hasDisplayValue(value) {
  return value !== undefined && value !== null && value !== '';
}

function getDetailValue(detail, ...keys) {
  for (const key of keys) {
    if (hasDisplayValue(detail?.[key])) {
      return detail[key];
    }
  }

  return undefined;
}

function formatLoanType(tipoPrestamo) {
  if (!tipoPrestamo) {
    return 'Préstamo';
  }

  return tipoPrestamo
    .toString()
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (char) => char.toUpperCase());
}

function getStatusStyles(status) {
  const normalized = (status || 'PENDIENTE').toUpperCase();

  if (normalized === 'APROBADO' || normalized === 'DESEMBOLSADO') {
    return { background: '#dcfce7', color: '#166534' };
  }

  if (normalized === 'RECHAZADO' || normalized === 'VENCIDO') {
    return { background: '#fee2e2', color: '#991b1b' };
  }

  if (normalized === 'EN_REVISION') {
    return { background: '#fef3c7', color: '#92400e' };
  }

  return { background: '#dbeafe', color: '#1d4ed8' };
}

function getStatusLabel(status) {
  const normalized = (status || 'PENDIENTE').toUpperCase();

  if (normalized === 'EN_REVISION') {
    return 'En evaluación';
  }

  if (normalized === 'APROBADO' || normalized === 'DESEMBOLSADO') {
    return 'Aprobada';
  }

  if (normalized === 'RECHAZADO' || normalized === 'VENCIDO') {
    return 'Rechazada';
  }

  return 'Recibida';
}

function getStatusDescription(solicitud) {
  const normalized = (solicitud?.estado_codigo || 'PENDIENTE').toUpperCase();

  if (normalized === 'EN_REVISION') {
    return 'Tu postulación está siendo evaluada por el equipo.';
  }

  if (normalized === 'APROBADO' || normalized === 'DESEMBOLSADO') {
    return 'Tu postulación fue aprobada.';
  }

  if (normalized === 'RECHAZADO' || normalized === 'VENCIDO') {
    return 'Tu postulación fue rechazada.';
  }

  return 'Tu postulación fue recibida y está pendiente de revisión.';
}

function DetailRow({ label, value }) {
  return (
    <div>
      <span style={{ display: 'block', color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      <strong style={{ color: '#0f172a', lineHeight: 1.5 }}>{hasDisplayValue(value) ? value : '-'}</strong>
    </div>
  );
}

function ModalDetallePostulacion({ solicitud, onClose }) {
  if (!solicitud) {
    return null;
  }

  const statusStyles = getStatusStyles(solicitud.estado_codigo);
  const detail = solicitud.documentos_adjuntos || {};
  const antiguedad = getDetailValue(detail, 'antiguedad', 'antiguedadLaboral');
  const dependientes = getDetailValue(detail, 'dependientes', 'numeroDependientes');
  const creditosVigentes = getDetailValue(detail, 'creditosVigentes', 'creditos_vigentes');
  const tarjetas = getDetailValue(detail, 'tarjetas', 'tarjetasActivas');
  const cuentaDeposito = getDetailValue(detail, 'cuentaDeposito', 'cuenta_deposito');

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={{ width: 'min(920px, 96vw)', maxHeight: '90vh', overflow: 'hidden', background: '#ffffff', borderRadius: '18px', boxShadow: '0 24px 60px rgba(15, 23, 42, 0.2)', border: '1px solid #dbe7ff', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 18, background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.6rem', color: '#475569' }}>&times;</button>
        <div style={{ padding: '2rem', overflowY: 'auto', maxHeight: '90vh' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', paddingRight: '2rem' }}>
            <div>
              <span style={{ display: 'inline-flex', padding: '0.35rem 0.7rem', borderRadius: '999px', background: '#dbeafe', color: '#1d4ed8', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Detalle
              </span>
              <h2 style={{ margin: '0.9rem 0 0.35rem', color: '#001763' }}>Postulación {solicitud.numero_solicitud}</h2>
              <p style={{ margin: 0, color: '#475569', lineHeight: 1.6 }}>Revisa la información principal de la solicitud y los datos ingresados por el usuario al momento de postular.</p>
            </div>
            <span style={{ display: 'inline-flex', alignSelf: 'flex-start', padding: '0.45rem 0.85rem', borderRadius: '999px', fontWeight: 700, fontSize: '0.84rem', ...statusStyles }}>
              {getStatusLabel(solicitud.estado_codigo)}
            </span>
          </div>

          <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', background: '#f8fbff', border: '1px solid #dbe7ff', borderRadius: '16px', padding: '1rem 1.1rem' }}>
            <DetailRow label="Tipo de préstamo" value={formatLoanType(solicitud.tipo_prestamo)} />
            <DetailRow label="Monto solicitado" value={formatCLP(solicitud.monto_solicitado)} />
            <DetailRow label="Plazo" value={`${solicitud.plazo_solicitado} meses`} />
            <DetailRow label="Canal" value={solicitud.canal_origen || 'WEB'} />
            <DetailRow label="Fecha de postulación" value={solicitud.fecha_solicitud ? new Date(solicitud.fecha_solicitud).toLocaleDateString('es-CL') : '-'} />
            <DetailRow label="Última actualización" value={solicitud.fecha_actualizacion ? new Date(solicitud.fecha_actualizacion).toLocaleDateString('es-CL') : '-'} />
            <DetailRow label="Simulación asociada" value={solicitud.simulacion_id ? `#${solicitud.numero_simulacion_usuario || solicitud.simulacion_id}` : 'No asociada'} />
            <DetailRow label="Cuota estimada" value={solicitud.cuota_calculada ? formatCLP(solicitud.cuota_calculada) : '-'} />
          </div>

          <div style={{ marginTop: '1.2rem', background: '#f8fbff', borderRadius: '14px', padding: '1rem 1.1rem', border: '1px solid #e5eefc' }}>
            <strong style={{ display: 'block', color: '#001763', marginBottom: '0.3rem' }}>Seguimiento</strong>
            <span style={{ color: '#475569', lineHeight: 1.6 }}>{getStatusDescription(solicitud)}</span>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ color: '#001763', marginBottom: '0.9rem' }}>Datos del formulario</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <DetailRow label="Nombre" value={getDetailValue(detail, 'nombre')} />
              <DetailRow label="RUT" value={getDetailValue(detail, 'rut')} />
              <DetailRow label="Email" value={getDetailValue(detail, 'email')} />
              <DetailRow label="Situación laboral" value={getDetailValue(detail, 'situacionLaboral', 'situacion_laboral')} />
              <DetailRow label="Tipo de trabajo" value={getDetailValue(detail, 'tipoTrabajo', 'tipo_trabajo')} />
              <DetailRow label="Empresa" value={getDetailValue(detail, 'empresa')} />
              <DetailRow label="Antigüedad" value={hasDisplayValue(antiguedad) ? `${antiguedad} años` : '-'} />
              <DetailRow label="Tipo de contrato" value={getDetailValue(detail, 'tipoContrato', 'tipo_contrato')} />
              <DetailRow label="Ingresos" value={formatCLP(getDetailValue(detail, 'ingresos'))} />
              <DetailRow label="Otros ingresos" value={formatCLP(getDetailValue(detail, 'otrosIngresos', 'otros_ingresos'))} />
              <DetailRow label="Arriendo" value={formatCLP(getDetailValue(detail, 'arriendo'))} />
              <DetailRow label="Gastos" value={formatCLP(getDetailValue(detail, 'gastos'))} />
              <DetailRow label="Dependientes" value={dependientes} />
              <DetailRow label="Créditos vigentes" value={creditosVigentes} />
              <DetailRow label="Tarjetas" value={tarjetas} />
              <DetailRow label="Cuotas" value={formatCLP(getDetailValue(detail, 'cuotas'))} />
              <DetailRow label="Cuenta depósito" value={cuentaDeposito} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistorialPostulaciones({ user }) {
  const navigate = useNavigate();
  const [solicitudes, setSolicitudes] = useState([]);
  const [numeroSimulacionPorId, setNumeroSimulacionPorId] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detalleSolicitud, setDetalleSolicitud] = useState(null);

  useEffect(() => {
    if (!user?.token) {
      setLoading(false);
      return;
    }

    fetch('http://localhost:3100/api/solicitud', {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setSolicitudes((data.solicitudes || []).map(normalizeSolicitud));
        } else {
          setError(data.error || 'No fue posible cargar tus postulaciones.');
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Error de conexión al cargar las postulaciones.');
        setLoading(false);
      });

    fetch('http://localhost:3100/api/simulaciones', {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setNumeroSimulacionPorId(buildSimulationNumberMap(data.simulaciones || []));
        }
      })
      .catch(() => {
        setNumeroSimulacionPorId({});
      });
  }, [user]);

  if (!user) {
    return <div style={{ textAlign: 'center', marginTop: '2rem' }}>Debes iniciar sesión para ver tu historial de postulaciones.</div>;
  }

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '2rem' }}>Cargando historial de postulaciones...</div>;
  }

  if (error) {
    return <div style={{ textAlign: 'center', marginTop: '2rem', color: '#b91c1c' }}>{error}</div>;
  }

  return (
    <div
      style={{
        maxWidth: '1120px',
        margin: '40px auto',
        background: '#ffffff',
        borderRadius: '18px',
        border: '1px solid #dbe7ff',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
        padding: '40px 36px',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          padding: '0.35rem 0.7rem',
          borderRadius: '999px',
          background: '#dbeafe',
          color: '#1d4ed8',
          fontWeight: 700,
          fontSize: '0.8rem',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        Historial activo
      </span>
      <h2 style={{ margin: '1rem 0 0.8rem', color: '#001763', fontSize: '2rem' }}>Historial de Postulaciones</h2>
      <p style={{ margin: 0, color: '#475569', fontSize: '1rem', lineHeight: 1.6, maxWidth: '52rem' }}>
        Aquí puedes revisar cada solicitud enviada, el estado actual de evaluación y los datos base de la simulación con la que postulaste.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.9rem', marginTop: '1.5rem' }}>
        <div style={{ background: '#f8fbff', border: '1px solid #dbe7ff', borderRadius: '16px', padding: '1rem 1.1rem' }}>
          <span style={{ display: 'block', color: '#64748b', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total postulaciones</span>
          <strong style={{ display: 'block', marginTop: '0.3rem', color: '#001763', fontSize: '1.8rem' }}>{solicitudes.length}</strong>
        </div>
        <div style={{ background: '#f8fbff', border: '1px solid #dbe7ff', borderRadius: '16px', padding: '1rem 1.1rem' }}>
          <span style={{ display: 'block', color: '#64748b', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recibidas o en evaluación</span>
          <strong style={{ display: 'block', marginTop: '0.3rem', color: '#001763', fontSize: '1.8rem' }}>
            {solicitudes.filter((solicitud) => ['PENDIENTE', 'EN_REVISION'].includes((solicitud.estado_codigo || '').toUpperCase())).length}
          </strong>
        </div>
        <div style={{ background: '#f8fbff', border: '1px solid #dbe7ff', borderRadius: '16px', padding: '1rem 1.1rem' }}>
          <span style={{ display: 'block', color: '#64748b', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Última actualización</span>
          <strong style={{ display: 'block', marginTop: '0.3rem', color: '#001763', fontSize: '1rem' }}>
            {solicitudes[0]?.fecha_actualizacion ? new Date(solicitudes[0].fecha_actualizacion).toLocaleDateString('es-CL') : 'Sin registros'}
          </strong>
        </div>
      </div>

      {solicitudes.length === 0 ? (
        <div
          style={{
            marginTop: '1.5rem',
            background: '#f8fbff',
            border: '1px solid #dbe7ff',
            borderRadius: '16px',
            padding: '1.2rem 1.3rem',
            color: '#334155',
            lineHeight: 1.6,
          }}
        >
          Aún no tienes postulaciones registradas. Puedes iniciar una nueva desde una simulación preaprobada.
        </div>
      ) : (
        <div style={{ marginTop: '1.5rem', display: 'grid', gap: '1rem' }}>
          {solicitudes.map((solicitud) => {
            const statusStyles = getStatusStyles(solicitud.estado_codigo);
            const numeroSimulacionUsuario = solicitud.simulacion_id ? numeroSimulacionPorId[solicitud.simulacion_id] : null;

            return (
              <article
                key={solicitud.id}
                style={{
                  border: '1px solid #dbe7ff',
                  borderRadius: '16px',
                  padding: '1.25rem 1.3rem',
                  boxShadow: '0 10px 24px rgba(15, 23, 42, 0.05)',
                  background: '#ffffff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <div>
                    <strong style={{ display: 'block', color: '#001763', fontSize: '1.08rem' }}>{formatLoanType(solicitud.tipo_prestamo)}</strong>
                    <span style={{ display: 'block', marginTop: '0.3rem', color: '#475569' }}>{solicitud.numero_solicitud}</span>
                  </div>
                  <span style={{ display: 'inline-flex', padding: '0.4rem 0.8rem', borderRadius: '999px', fontWeight: 700, fontSize: '0.82rem', ...statusStyles }}>
                    {getStatusLabel(solicitud.estado_codigo)}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.9rem', marginTop: '1rem' }}>
                  <div>
                    <span style={{ display: 'block', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Monto solicitado</span>
                    <strong style={{ color: '#0f172a' }}>{formatCLP(solicitud.monto_solicitado)}</strong>
                  </div>
                  <div>
                    <span style={{ display: 'block', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Plazo</span>
                    <strong style={{ color: '#0f172a' }}>{solicitud.plazo_solicitado} meses</strong>
                  </div>
                  <div>
                    <span style={{ display: 'block', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fecha de postulación</span>
                    <strong style={{ color: '#0f172a' }}>{new Date(solicitud.fecha_solicitud).toLocaleDateString('es-CL')}</strong>
                  </div>
                  <div>
                    <span style={{ display: 'block', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Simulación asociada</span>
                    <strong style={{ color: '#0f172a' }}>{solicitud.simulacion_id ? `#${numeroSimulacionUsuario || solicitud.simulacion_id}` : 'No asociada'}</strong>
                  </div>
                </div>

                <div style={{ marginTop: '1rem', background: '#f8fbff', borderRadius: '12px', padding: '0.9rem 1rem', border: '1px solid #e5eefc' }}>
                  <strong style={{ display: 'block', color: '#001763', marginBottom: '0.2rem' }}>Seguimiento</strong>
                  <span style={{ color: '#475569', lineHeight: 1.6 }}>{getStatusDescription(solicitud)}</span>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setDetalleSolicitud(solicitud)}
                    style={{
                      background: '#001763',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '0.78rem 1rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Ver detalle
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {detalleSolicitud && (
        <ModalDetallePostulacion
          solicitud={{
            ...detalleSolicitud,
            numero_simulacion_usuario: detalleSolicitud.simulacion_id ? numeroSimulacionPorId[detalleSolicitud.simulacion_id] : null,
          }}
          onClose={() => setDetalleSolicitud(null)}
        />
      )}

      <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
        <button
          type="button"
          onClick={() => navigate('/historial-simulaciones')}
          style={{
            background: '#001763',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            padding: '0.9rem 1.2rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Ir a Historial Simulaciones
        </button>
        <button
          type="button"
          onClick={() => navigate('/postulacion')}
          style={{
            background: '#e5eefc',
            color: '#001763',
            border: 'none',
            borderRadius: '10px',
            padding: '0.9rem 1.2rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Iniciar una postulación
        </button>
      </div>
    </div>
  );
}

export default HistorialPostulaciones;