import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ModalDetalleSimulacion from './ModalDetalleSimulacion';

function formatCLP(value) {
  return value.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });
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

function buildSimulationDraft(simulacion) {
  return {
    id: simulacion.id,
    tipo: simulacion.tipo_prestamo,
    monto: Number(simulacion.monto_simulado),
    plazo: Number(simulacion.plazo_simulado),
  };
}

function buildPaginationItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis-right', totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, 'ellipsis-left', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [
    1,
    'ellipsis-left',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    'ellipsis-right',
    totalPages,
  ];
}

const HistorialSimulaciones = ({ user }) => {
  const navigate = useNavigate();
  const [detalleSim, setDetalleSim] = useState(null);
  const [simulaciones, setSimulaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [filtroMonto, setFiltroMonto] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroFecha, setFiltroFecha] = useState('');
  const PAGE_SIZE = 10;

  const handleGoToApplication = (simulacion) => {
    const scoringInfo = parseScoringDetail(simulacion.scoring_detalle);
    const scoringStatus = scoringInfo?.estado ?? scoringInfo?.categoria;

    if (!simulacion.estado_postulacion && scoringStatus === 'aprobado') {
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

  const handleDeleteSimulacion = async (id) => {
    if (!user || !user.token) return;
    try {
      await fetch(`http://localhost:3100/api/simulaciones/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });
      setSimulaciones(sims => sims.filter(s => s.id !== id));
      setDetalleSim(null);
    } catch (err) {
      alert('Error al borrar simulación');
    }
  };

  useEffect(() => {
    if (!user || !user.token) return;
    fetch('http://localhost:3100/api/simulaciones', {
      headers: {
        'Authorization': `Bearer ${user.token}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          // Ordenar por fecha descendente
          const ordenadas = [...data.simulaciones].sort((a, b) => new Date(b.fecha_simulacion) - new Date(a.fecha_simulacion));
          setSimulaciones(ordenadas);
        } else {
          setError(data.error || 'Error al cargar historial de simulaciones');
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Error de conexión');
        setLoading(false);
      });
  }, [user]);

  if (!user) return <div style={{textAlign:'center',marginTop:'2rem'}}>Debes iniciar sesión para ver tu historial de simulaciones.</div>;
  if (loading) return <div style={{textAlign:'center',marginTop:'2rem'}}>Cargando historial de simulaciones...</div>;
  if (error) return <div style={{textAlign:'center',marginTop:'2rem',color:'#b91c1c'}}>{error}</div>;

  // Filtros
  const simulacionesFiltradas = simulaciones.filter(sim => {
    let ok = true;
    if (filtroMonto && filtroMonto.trim() !== '') {
      ok = ok && sim.monto_simulado >= parseInt(filtroMonto);
    }
    if (filtroTipo && filtroTipo !== '') {
      // Normalizar ambos valores para evitar problemas de mayúsculas/minúsculas
      ok = ok && sim.tipo_prestamo.toLowerCase() === filtroTipo.toLowerCase();
    }
    if (filtroFecha && filtroFecha !== '') {
      // Comparar solo la fecha (YYYY-MM-DD)
      const fechaSim = new Date(sim.fecha_simulacion).toISOString().slice(0,10);
      ok = ok && fechaSim === filtroFecha;
    }
    return ok;
  });

  const numeroSimulacionPorId = simulaciones
    .slice()
    .sort((a, b) => {
      const fechaA = new Date(a.fecha_simulacion).getTime();
      const fechaB = new Date(b.fecha_simulacion).getTime();

      if (fechaA !== fechaB) {
        return fechaA - fechaB;
      }

      return a.id - b.id;
    })
    .reduce((acc, sim, index) => {
      acc[sim.id] = index + 1;
      return acc;
    }, {});

  // Paginación
  const totalPages = Math.ceil(simulacionesFiltradas.length / PAGE_SIZE);
  const simulacionesPagina = simulacionesFiltradas.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
  const paginationItems = buildPaginationItems(page, totalPages);

  const renderPagination = (extraClassName = '') => (
    <div className={`historial-pagination historial-pagination-numeric ${extraClassName}`.trim()}>
      <button className="historial-pagination-nav" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>
        Anterior
      </button>
      <div className="historial-pagination-pages">
        {paginationItems.map((item) => (
          item === 'ellipsis-left' || item === 'ellipsis-right'
            ? <span key={item} className="historial-pagination-ellipsis">...</span>
            : (
              <button
                key={item}
                className={`historial-pagination-page ${item === page ? 'historial-pagination-page-active' : ''}`}
                onClick={() => setPage(item)}
                aria-current={item === page ? 'page' : undefined}
              >
                {item}
              </button>
            )
        ))}
      </div>
      <button className="historial-pagination-nav" onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}>
        Siguiente
      </button>
    </div>
  );

  return (
    <div className="advanced-simulator historial-simulaciones">
      <h2>Historial de Simulaciones</h2>
      <div className="historial-toolbar">
        <div className="historial-filtros-card">
          <div className="historial-filtros-header">
            <div className="historial-filtros-heading">
              <p className="historial-filtros-kicker">Filtrar resultados</p>
              <h3>Encuentra una simulación rápido</h3>
            </div>
            <div className="historial-stats-row">
              <div className="historial-stat-chip">
                <span className="historial-stat-label">Registradas</span>
                <strong>{simulaciones.length}</strong>
              </div>
              <div className="historial-stat-chip historial-stat-chip-active">
                <span className="historial-stat-label">Con filtros</span>
                <strong>{simulacionesFiltradas.length}</strong>
              </div>
            </div>
            <button
              type="button"
              className="historial-clear-filters"
              onClick={() => {
                setFiltroMonto('');
                setFiltroTipo('');
                setFiltroFecha('');
                setPage(1);
              }}
            >
              Limpiar filtros
            </button>
          </div>
          <div className="historial-filtros-grid">
            <label className="historial-filter-field">
              <span>Monto mínimo</span>
              <input type="number" min="0" value={filtroMonto} onChange={e=>{setFiltroMonto(e.target.value);setPage(1);}} placeholder="Ej: 1000000" />
            </label>
            <label className="historial-filter-field">
              <span>Tipo de préstamo</span>
              <select value={filtroTipo} onChange={e=>{setFiltroTipo(e.target.value);setPage(1);}}>
                <option value="">Todos</option>
                <option value="personal">Personal</option>
                <option value="automotriz">Automotriz</option>
                <option value="hipotecario">Hipotecario</option>
                <option value="empresarial">Empresarial</option>
              </select>
            </label>
            <label className="historial-filter-field">
              <span>Fecha</span>
              <input type="date" value={filtroFecha} onChange={e=>{setFiltroFecha(e.target.value);setPage(1);}} />
            </label>
          </div>
        </div>
      </div>
      {simulacionesFiltradas.length > 0 && totalPages > 1 && (
        renderPagination('historial-pagination-top')
      )}
      {simulacionesFiltradas.length === 0 ? (
        <div className="historial-empty-state">
          <span className="historial-empty-icon">🔎</span>
          <span className="historial-empty-title">No se han encontrado simulaciones que coincidan con los filtros seleccionados.</span>
          <span className="historial-empty-copy">Revisa los valores ingresados o prueba eliminando algún filtro para ver más resultados.</span>
        </div>
      ) : (
        <>
        <div className="historial-table-shell">
          <table className="historial-table">
            <thead>
              <tr>
                <th>N° Simulación</th>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Monto</th>
                <th>Plazo</th>
                <th>Tasa</th>
                <th>Cuota</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {simulacionesPagina.map(sim => (
                <tr key={sim.id}>
                  <td>#{numeroSimulacionPorId[sim.id] || sim.id}</td>
                  <td>{sim.fecha_simulacion ? new Date(sim.fecha_simulacion).toLocaleDateString('es-CL') : ''}</td>
                  <td>{sim.tipo_prestamo}</td>
                  <td>{formatCLP(Number(sim.monto_simulado))}</td>
                  <td>{sim.plazo_simulado} meses</td>
                  <td>{(sim.tasa_aplicada * 100).toFixed(2)}%</td>
                  <td>{formatCLP(Number(sim.cuota_calculada))}</td>
                  <td className="historial-actions-cell">
                    <div className="historial-actions-group">
                      <button className="historial-action-button historial-action-primary" onClick={() => setDetalleSim(sim)}>Ver detalle</button>
                      {!sim.estado_postulacion && (
                        <button
                          className="historial-action-button historial-action-secondary"
                          onClick={() => handleGoToApplication(sim)}
                        >
                          {parseScoringDetail(sim.scoring_detalle)?.estado === 'aprobado' ? 'Ir a postular' : 'Completar scoring'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && renderPagination()}
        {detalleSim && (
          <ModalDetalleSimulacion
            simulacion={detalleSim}
            numeroSimulacion={numeroSimulacionPorId[detalleSim.id]}
            onClose={() => setDetalleSim(null)}
            onDelete={handleDeleteSimulacion}
          />
        )}
        </>
      )}
    </div>
  );
};

export default HistorialSimulaciones;
