
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
// Público
import Home from './Rols/Public/Pages/Home/Home';
import Dashboard from './Rols/User/Pages/Dashboard/Dashboard';
import LoanSimulator from './Rols/Public/Pages/Simulador_Basico/LoanSimulator';
import BasicLoanLogic from './Rols/Public/Pages/Simulador_Basico/Logica_de_simulacion/BasicLoanLogic';
import HeaderPublico from './Rols/Public/Components/HeaderPublico/Header';
import FooterPublico from './Rols/Public/Components/Footer/Footer';
import Notificaciones from './Rols/User/Pages/Notificaciones/Notificaciones';
import Login from './Rols/Public/Components/Registro_Login/Login/Login';
import Register from './Rols/Public/Components/Registro_Login/Registro/Register';
// Usuario logeado
import AdvancedLoanSimulator from './Rols/User/Pages/Simulador_avanzado/AdvancedLoanSimulator';
import Configuracion from './Rols/User/Components/HeaderUsuario/Configuracion';
import SeleccionarTipoPrestamo from './Rols/User/Pages/SeleccionarTipoPrestamo';
import LoanLogic from './Rols/User/Pages/Simulador_avanzado/Logica_de_simulacion/LoanLogic';
import HistorialSimulaciones from './Rols/User/Pages/Historial_simulaciones/HistorialSimulaciones';
import HeaderUsuario from './Rols/User/Components/HeaderUsuario/Header';
import UserLoanSimulator from './Rols/User/Pages/Simulador_basico/LoanSimulator';
import UserBasicLoanLogic from './Rols/User/Pages/Simulador_basico/Logica_simulador/BasicLoanLogic';
import VerPerfil from './Rols/User/Pages/Perfil/verPerfil';
import EditarPerfil from './Rols/User/Pages/Perfil/editarPerfil';


import PostulacionForm from './Rols/User/Pages/PostulacionForm';


function App() {
  const renderProtectedRoute = (element) => {
    if (!user) {
      return <Navigate to="/" replace />;
    }

    return element;
  };

  // Manejar éxito de login/registro
  const handleAuthSuccess = (userData) => {
    // Forzar que el token se guarde correctamente
    let token = userData.token;
    // Si el token viene anidado, intenta extraerlo
    if (!token && userData.data && userData.data.token) {
      token = userData.data.token;
    }
    const userToSave = { ...userData, token };
    console.log('[ALARA] handleAuthSuccess userData:', userToSave);
    setUser(userToSave);
  };
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('alara_user');
      return stored ? JSON.parse(stored) : null;
    } catch (err) {
      console.error('[ALARA] Error accediendo a localStorage:', err);
      return null;
    }
  });

  // Guardar usuario en localStorage cuando cambie
  useEffect(() => {
    try {
      if (user) {
        console.log('[ALARA] Guardando en localStorage:', user);
        localStorage.setItem('alara_user', JSON.stringify(user));
      } else {
        console.log('[ALARA] Eliminando alara_user de localStorage');
        localStorage.removeItem('alara_user');
      }
    } catch (err) {
      console.error('[ALARA] Error accediendo a localStorage:', err);
    }
  }, [user]);

  useEffect(() => {
    // Actualizar el título y favicon dinámicamente
    document.title = 'ALARA Simulador - Simulador de Préstamos';
    
    // Crear favicon SVG directamente
    const faviconSvg = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
        <rect width="32" height="32" fill="#111827" rx="4"/>
        <path d="M16 4 L26 28 L22 28 L20 22 L12 22 L10 28 L6 28 L16 4 Z M14 18 L18 18 L16 12 L14 18 Z" fill="white"/>
        <circle cx="16" cy="7" r="1.5" fill="#3b82f6"/>
      </svg>
    `)}`;
    
    // Remover favicons existentes
    const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
    existingFavicons.forEach(favicon => favicon.remove());
    
    // Agregar nuevo favicon
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = faviconSvg;
    document.head.appendChild(link);
    
    // Fallback para ICO
    const linkIco = document.createElement('link');
    linkIco.rel = 'shortcut icon';
    linkIco.href = '/favicon.ico';
    document.head.appendChild(linkIco);
  }, []);

  return (
    <Router>
      <div className="App">
  {user ? <HeaderUsuario user={user} setUser={setUser} /> : <HeaderPublico user={user} setUser={setUser} />}
        <main className="main-content">
          <Routes>
            <Route path="/" element={user ? <Dashboard user={user} /> : <Home user={user} />} />
            <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login onSuccess={handleAuthSuccess} />} />
            <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register onSuccess={handleAuthSuccess} />} />
            <Route path="/simulador" element={user ? <UserLoanSimulator /> : <LoanSimulator />} />
            <Route path="/simulador-avanzado" element={renderProtectedRoute(<AdvancedLoanSimulator user={user} />)} />
            <Route path="/logica-simulador" element={user ? <LoanLogic /> : <BasicLoanLogic />} />
            <Route path="/logica-simulador-basico" element={user ? <UserBasicLoanLogic /> : <BasicLoanLogic />} />
            <Route path="/historial" element={renderProtectedRoute(<HistorialSimulaciones user={user} />)} />
            <Route path="/notificaciones" element={renderProtectedRoute(<Notificaciones user={user} />)} />
            <Route path="/configuracion" element={renderProtectedRoute(<Configuracion user={user} setUser={setUser} />)} />
            <Route path="/postulacion" element={renderProtectedRoute(<PostulacionForm user={user} />)} />
            {/* Agrega más rutas si tienes más páginas */}
          </Routes>
        </main>
  <FooterPublico />
      </div>
    </Router>
  );
}

export default App;
