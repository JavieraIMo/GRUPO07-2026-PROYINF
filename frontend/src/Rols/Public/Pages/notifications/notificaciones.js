import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import "./notificaciones.css";

function Notificaciones({ user }) {
  const navigate = useNavigate();
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUserId = user?.id ?? user?.data?.user?.id ?? null;
  const authHeaders = {
    'Content-Type': 'application/json',
    ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
  };

  const crearNotificacionBienvenida = async () => {
    if (!currentUserId) {
      return false;
    }

    try {
      const response = await fetch(`http://localhost:3100/api/notificaciones/bienvenida/${currentUserId}`, {
        method: "POST",
        headers: authHeaders
      });

      return response.ok;
    } catch (error) {
      console.error("Error creando notificación de bienvenida:", error);
      return false;
    }
  };

  const necesitaBienvenida = (notificaciones) => {
    return Array.isArray(notificaciones) && notificaciones.length === 0;
  };

  useEffect(() => {
    if (!currentUserId || !user?.token) {
      setNotificaciones([]);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const resp = await fetch(`http://localhost:3100/api/notificaciones/${currentUserId}`, {
          headers: authHeaders,
        });
        const data = await resp.json();
        const notificationsData = Array.isArray(data) ? data : [];
        
        if (necesitaBienvenida(notificationsData)) {
          await crearNotificacionBienvenida();
          const respNuevo = await fetch(`http://localhost:3100/api/notificaciones/${currentUserId}`, {
            headers: authHeaders,
          });
          const nuevasNotificaciones = await respNuevo.json();
          setNotificaciones(Array.isArray(nuevasNotificaciones) ? nuevasNotificaciones : []);
        } else {
          setNotificaciones(notificationsData);
        }
        
      } catch (err) {
        console.error("Error cargando notificaciones:", err);
        setNotificaciones([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUserId, user?.token]);

  const marcarComoLeidas = async () => {
    if (!currentUserId) {
      return;
    }

    await fetch(`http://localhost:3100/api/notificaciones/marcar_leidas/${currentUserId}`, {
      method: "PUT",
      headers: authHeaders,
    });

    setNotificaciones(prev =>
      (Array.isArray(prev) ? prev : []).map(n => ({ ...n, leida: true }))
    );
  };

  if (loading) return <p>Cargando notificaciones...</p>;

  return (
    <div className="notif-container">
      <button className="btn-close" onClick={() => navigate('/')} aria-label="Volver al inicio">×</button>
      <h2>Notificaciones</h2>

      <button className="btn-leer" onClick={marcarComoLeidas}>
        Marcar todas como leídas
      </button>

      {Array.isArray(notificaciones) && notificaciones.length === 0 ? (
        <p>No tienes notificaciones</p>
      ) : (
        <ul className="notif-list">
          {(Array.isArray(notificaciones) ? notificaciones : []).map((n) => (
            <li key={n.id} className={`notif-item ${n.leida ? "leida" : "no-leida"}`}>
              <h4>{n.titulo}</h4>
              <p>{n.mensaje}</p>
              <span className="fecha">{new Date(n.fecha).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Notificaciones;