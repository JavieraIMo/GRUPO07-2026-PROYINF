import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

import ConsentimientoScoring from '../ConsentimientoScoring';

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

function getScoringStatusValue(simulacion) {
  const scoringInfo = parseScoringDetail(simulacion?.scoring_detalle);
  return scoringInfo?.estado ?? scoringInfo?.categoria ?? null;
}

function buildSimulationDraft(simulacion) {
  if (!simulacion) {
    return null;
  }

  return {
    id: simulacion.id,
    tipo: simulacion.tipo_prestamo,
    monto: Number(simulacion.monto_simulado),
    plazo: Number(simulacion.plazo_simulado),
  };
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

  return status || 'Sin scoring';
}

function formatLoanType(tipoPrestamo) {
  if (!tipoPrestamo) {
    return 'No disponible';
  }

  return tipoPrestamo.charAt(0).toUpperCase() + tipoPrestamo.slice(1).toLowerCase();
}

function getResultStatusVariant(status) {
  if (status === 'Preaprobado') {
    return 'success';
  }

  if (status === 'Condicionado') {
    return 'warning';
  }

  if (status === 'Rechazado') {
    return 'danger';
  }

  return 'neutral';
}

function Dashboard({ user }) {
  const navigate = useNavigate();
  const [showConsent, setShowConsent] = useState(false);
  const [ultimaSimulacion, setUltimaSimulacion] = useState(null);
  const [loadingResumen, setLoadingResumen] = useState(true);
  const [summaryError, setSummaryError] = useState(null);
  const [consentGiven, setConsentGiven] = useState(() => {
    // Persistir consentimiento en sessionStorage para la sesión actual
    return sessionStorage.getItem('alara_consentimiento_scoring') === 'true';
  });

  useEffect(() => {
    if (!user?.token) {
      setUltimaSimulacion(null);
      setLoadingResumen(false);
      setSummaryError(null);
      return;
    }

    setLoadingResumen(true);
    setSummaryError(null);

    fetch('http://localhost:3100/api/simulaciones', {
      headers: {
        Authorization: `Bearer ${user.token}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok) {
          setSummaryError(data.error || 'No se pudo cargar el resumen.');
          setUltimaSimulacion(null);
          return;
        }

        const simulaciones = Array.isArray(data.simulaciones) ? data.simulaciones : [];
        const masReciente = [...simulaciones].sort(
          (a, b) => new Date(b.fecha_simulacion) - new Date(a.fecha_simulacion)
        )[0] || null;

        setUltimaSimulacion(masReciente);
      })
      .catch(() => {
        setSummaryError('Error de conexión al cargar el resumen.');
        setUltimaSimulacion(null);
      })
      .finally(() => {
        setLoadingResumen(false);
      });
  }, [user]);

  const scoringInfo = parseScoringDetail(ultimaSimulacion?.scoring_detalle);
  const estadoResultado = getScoringStatusLabel(scoringInfo?.estado ?? scoringInfo?.categoria);
  const estadoPostulacion = ultimaSimulacion?.estado_postulacion ? 'Postulado' : 'No postulado';
  const latestScoringStatus = getScoringStatusValue(ultimaSimulacion);
  const canApplyDirectly = Boolean(ultimaSimulacion && !ultimaSimulacion.estado_postulacion && latestScoringStatus === 'aprobado');
  const shouldShowApplyButton = !loadingResumen && !ultimaSimulacion?.estado_postulacion;
  const applyButtonLabel = canApplyDirectly
    ? 'Ir a postular'
    : latestScoringStatus
      ? 'Revisar scoring para postular'
      : 'Completar scoring para postular';
  const tipoUltimaSimulacion = ultimaSimulacion ? formatLoanType(ultimaSimulacion.tipo_prestamo) : 'Sin simulaciones';
  const montoUltimaSimulacion = ultimaSimulacion ? formatCLP(ultimaSimulacion.monto_simulado) : '-';
  const fechaUltimaSimulacion = ultimaSimulacion?.fecha_simulacion
    ? new Date(ultimaSimulacion.fecha_simulacion).toLocaleDateString('es-CL')
    : 'Sin fecha registrada';
  const resultStatusVariant = loadingResumen
    ? 'neutral'
    : getResultStatusVariant(ultimaSimulacion ? estadoResultado : 'Sin resultados todavía');
  const postulacionVariant = ultimaSimulacion?.estado_postulacion ? 'success' : 'neutral';
  const detalleUltimaSimulacion = ultimaSimulacion
    ? `${formatLoanType(ultimaSimulacion.tipo_prestamo)} por ${formatCLP(ultimaSimulacion.monto_simulado)}${ultimaSimulacion.fecha_simulacion ? ` el ${new Date(ultimaSimulacion.fecha_simulacion).toLocaleDateString('es-CL')}` : ''}`
    : 'Aún no registras simulaciones.';

  const handleConsent = () => {
    setShowConsent(false);
    setConsentGiven(true);
    sessionStorage.setItem('alara_consentimiento_scoring', 'true');
    navigate('/postulacion');
  };

  const handleApplicationRoute = (simulacion) => {
    const scoringStatus = getScoringStatusValue(simulacion);

    if (simulacion && !simulacion.estado_postulacion && scoringStatus === 'aprobado') {
      navigate('/postulacion', {
        state: {
          simulacionId: simulacion.id,
          simulacion: buildSimulationDraft(simulacion),
        },
      });
      return;
    }

    navigate('/simulador-avanzado', {
      state: {
        startScoringFlow: true,
        simulationDraft: buildSimulationDraft(simulacion),
      },
    });
  };

  return (
    <div className="dashboard-container">
      <h1>¡Bienvenid@, {(() => {
        const nombre = user?.nombre || user?.firstName || 'Usuario';
        return nombre.split(' ')[0];
      })()}!</h1>
      <div className="dashboard-main-grid">
        <aside className="dashboard-actions-panel">
          <div className="dashboard-actions-header">
            <p className="dashboard-actions-kicker">Accesos directos</p>
            <h2>¿Qué quieres hacer hoy?</h2>
            <p className="dashboard-actions-description">Elige una acción para continuar con tu simulación, revisar tu historial de simulaciones o avanzar con una solicitud.</p>
          </div>
          <div className="dashboard-actions">
            {/* <button onClick={() => navigate('/seleccionar-tipo-prestamo')}>Simular Préstamo Básico</button> */}
            <button onClick={() => navigate('/simulador-avanzado')}>Simulador</button>
            <button onClick={() => navigate('/historial-simulaciones')}>Ver Historial Simulaciones</button>
            <button onClick={() => navigate('/historial-postulaciones')}>Ver Historial Postulaciones</button>
            <button
              onClick={() => {
                if (consentGiven) {
                  navigate('/postulacion');
                } else {
                  setShowConsent(true);
                }
              }}
            >
              Postular a Préstamo
            </button>
            <button onClick={() => navigate('/editar-perfil')}>Editar Perfil</button>
          </div>
        </aside>
        <div className="dashboard-summary">
          <div className="dashboard-summary-header">
            <div>
              <p className="dashboard-summary-kicker">Vista rápida</p>
              <h2>Resumen</h2>
            </div>
            <button className="dashboard-summary-link" onClick={() => navigate('/historial-simulaciones')}>
              Ver historial de simulaciones
            </button>
          </div>
          <div className="summary-highlight-card">
            <div className="summary-highlight-copy">
              <span className="summary-highlight-label">Última simulación</span>
              <h3>{loadingResumen ? 'Cargando resumen...' : tipoUltimaSimulacion}</h3>
              <p className="summary-highlight-amount">{loadingResumen ? 'Procesando datos...' : montoUltimaSimulacion}</p>
              <p className="summary-highlight-description">{loadingResumen ? 'Obteniendo información reciente.' : detalleUltimaSimulacion}</p>
            </div>
            <div className="summary-highlight-meta">
              <span className="summary-meta-label">Fecha</span>
              <strong>{loadingResumen ? '...' : fechaUltimaSimulacion}</strong>
            </div>
          </div>
          <div className="summary-metrics-grid">
            <article className="summary-metric-card">
              <span className="summary-label">Estado de resultado</span>
              <strong className="summary-metric-value">
                {loadingResumen ? 'Cargando...' : (ultimaSimulacion ? estadoResultado : 'Sin resultados todavía')}
              </strong>
              <span className={`summary-status-badge summary-status-${resultStatusVariant}`}>
                {loadingResumen ? 'En proceso' : 'Resultado actual'}
              </span>
            </article>
            <article className="summary-metric-card">
              <span className="summary-label">Estado de postulación</span>
              <strong className="summary-metric-value">{estadoPostulacion}</strong>
              <span className={`summary-status-badge summary-status-${postulacionVariant}`}>
                {ultimaSimulacion?.estado_postulacion ? 'Solicitud enviada' : 'Sin solicitud activa'}
              </span>
              {shouldShowApplyButton && (
                <button
                  className="summary-action-button"
                  onClick={() => handleApplicationRoute(ultimaSimulacion)}
                >
                  {applyButtonLabel}
                </button>
              )}
            </article>
          </div>
          {summaryError && <p className="dashboard-summary-error">{summaryError}</p>}
        </div>
      </div>
      {showConsent && (
        <div className="modal-overlay" onClick={() => setShowConsent(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <ConsentimientoScoring onConsent={handleConsent} />
            <button className="close-btn" onClick={() => setShowConsent(false)}>&times;</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
