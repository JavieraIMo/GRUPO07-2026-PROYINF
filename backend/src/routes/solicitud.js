const express = require('express');
const router = express.Router();
const { registrarSolicitud, obtenerHistorialSolicitudes } = require('../controllers/solicitudController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.get('/', authMiddleware, obtenerHistorialSolicitudes);

// Registrar solicitud de préstamo
router.post('/', authMiddleware, registrarSolicitud);

module.exports = router;
