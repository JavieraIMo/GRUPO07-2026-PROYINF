import React, { useState } from 'react';
import './Header.css';
import { Link, useNavigate } from 'react-router-dom';

function HeaderUsuario({ user, setUser }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = () => {
    setUser(null);
    try {
      localStorage.removeItem('alara_user');
    } catch (err) {
      console.error('[ALARA] Error accediendo a localStorage:', err);
    }
    closeMenu();
		navigate('/');
  };

  const handleVerPerfil = () => {
    navigate('/perfil'); // ✅ redirige correctamente
  };

	// Calcular número de notificaciones no leídas de forma segura
	const numNotificaciones = (() => {
		try {
			if (!user) return 0;
			if (Array.isArray(user.notificaciones)) {
				return user.notificaciones.filter(n => !n.leida).length;
			}
			if (typeof user.numNotificaciones === 'number') return user.numNotificaciones;
			return 0;
		} catch (err) {
			console.error('[ALARA] Error contando notificaciones:', err);
			return 0;
		}
	})();

	return (
		<header className="header">
			<nav className="navbar">
				<div className="nav-container">
					<div className="nav-logo">
						<a href="#inicio" className="logo-link">
							<div className="logo-container">
								<div className="logo-with-image">
									<img src="/images/alara-logo.png" alt="ALARA Logo" className="logo-image" />
									<div className="logo-text-container">
										<div className="logo-text-styled">ALARA</div>
										<div className="logo-subtitle">SIMULADOR</div>
									</div>
								</div>
							</div>
						</a>
					</div>
					<ul className="nav-menu desktop-menu">
						<li className="nav-item"><Link to="/" className="nav-link">Inicio</Link></li>
						{/* <li className="nav-item"><Link to="/simulador" className="nav-link">Simulador</Link></li> */}
						<li className="nav-item"><Link to="/simulador-avanzado" className="nav-link">Simulador</Link></li>
						<li className="nav-item"><Link to="/historial-simulaciones" className="nav-link">Historial Simulaciones</Link></li>
						<li className="nav-item"><Link to="/historial-postulaciones" className="nav-link">Historial Postulaciones</Link></li>
					</ul>
					<div className="right-container">


									<button className="config-icon" onClick={() => navigate("/configuracion")} aria-label="Configuración">
									<span className="gear-icon" aria-hidden="true">⚙️</span>
									</button>


									<button className="noti-icon" onClick={() => navigate("/notificaciones") } aria-label="Notificaciones">
										<span className="bell-icon" aria-hidden="true">🔔</span>
										{numNotificaciones > 0 && (
											<span className="badge">{numNotificaciones}</span>
										)}
									</button>

						<button className="hamburger-btn" onClick={toggleMenu}>
							<span className="hamburger-line"></span>
							<span className="hamburger-line"></span>
							<span className="hamburger-line"></span>
						</button>
					</div>
				</div>
				{isMenuOpen && <div className="menu-overlay" onClick={closeMenu}></div>}
				<div className={`side-menu ${isMenuOpen ? 'side-menu-open' : ''}`}>
					<div className="side-menu-header">
						<button className="close-btn" onClick={closeMenu}><span className="close-icon">×</span></button>
					</div>
					<ul className="side-menu-items">
						<li className="side-menu-item"><Link to="/" className="side-menu-link" onClick={closeMenu}>Inicio</Link></li>
						{/* <li className="side-menu-item"><Link to="/simulador" className="side-menu-link" onClick={closeMenu}>Simulador</Link></li> */}
						<li className="side-menu-item"><Link to="/simulador-avanzado" className="side-menu-link" onClick={closeMenu}>Simulador</Link></li>
						<li className="side-menu-item"><Link to="/historial-simulaciones" className="side-menu-link" onClick={closeMenu}>Historial Simulaciones</Link></li>
						<li className="side-menu-item"><Link to="/historial-postulaciones" className="side-menu-link" onClick={closeMenu}>Historial Postulaciones</Link></li>
									<li className="side-menu-item">
										<button className="btn-profile side-menu-cta">
											<span className="profile-icon">👤</span>
											Editar Perfil
										</button>
									</li>
									<li className="side-menu-item">
										<button className="btn-logout side-menu-cta" onClick={handleLogout}>Cerrar Sesión</button>
									</li>
					</ul>
				</div>
			</nav>
		</header>
	);
}

export default HeaderUsuario;
