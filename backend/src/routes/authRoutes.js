// =====================================================
// RUTAS: authRoutes.js
// Define los endpoints de autenticación
// =====================================================

const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authMiddleware } = require('../middlewares/authMiddleware');

// ==========================================
// RUTAS DE AUTENTICACIÓN
// ==========================================

/**
 * POST /api/auth/register
 * Registrar nuevo usuario
 */
router.post('/register', AuthController.register);

/**
 * POST /api/auth/login
 * Iniciar sesión
 */
router.post('/login', AuthController.login);

/**
 * GET /api/auth/check-email/:email
 * Verificar disponibilidad de email
 */
router.get('/check-email/:email', AuthController.checkEmail);

/**
 * GET /api/auth/check-rut/:rut
 * Verificar disponibilidad de RUT
 */
router.get('/check-rut/:rut', AuthController.checkRut);

/**
 * GET /api/auth/profile
 * Obtener perfil del usuario actual
 * Requiere autenticación
 */
router.get('/profile', authMiddleware, AuthController.getProfile);

/**
 * POST /api/auth/logout
 * Cerrar sesión (placeholder para JWT)
 */
router.post('/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logout exitoso'
    });
});

module.exports = router;