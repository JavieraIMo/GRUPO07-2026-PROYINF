const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');

const { 
  getUserNotifications,
  markAllAsRead,
  createWelcomeNotification,
  welcomeNotificationExists
} = require('../utils/notificationUtils');

function resolveUserId(req) {
  const authenticatedUserId = req.user?.id;
  const requestedUserId = req.params.userId ? Number(req.params.userId) : null;

  if (Number.isFinite(authenticatedUserId)) {
    return authenticatedUserId;
  }

  return Number.isFinite(requestedUserId) ? requestedUserId : null;
}


// =============================================
// OBTENER NOTIFICACIONES DEL USUARIO
// =============================================
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const userId = resolveUserId(req);

    if (!userId) {
      return res.status(400).json({ success: false, error: 'Usuario inválido' });
    }

    const notificaciones = await getUserNotifications(userId);
    res.json(notificaciones);

  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al obtener notificaciones' 
    });
  }
});


// =============================================
// CREAR NOTIFICACIÓN DE BIENVENIDA
// =============================================
router.post('/bienvenida/:userId', authMiddleware, async (req, res) => {
  try {
    const userId = resolveUserId(req);

    if (!userId) {
      return res.status(400).json({ success: false, error: 'Usuario inválido' });
    }

    // Verificar si ya existe
    const yaExiste = await welcomeNotificationExists(userId);

    if (yaExiste) {
      return res.json({
        success: false,
        message: "La notificación de bienvenida ya existe"
      });
    }

    // Crear bienvenida
    await createWelcomeNotification(userId);

    res.json({
      success: true,
      message: "Notificación de bienvenida creada"
    });

  } catch (error) {
    console.error("Error creando notificación de bienvenida:", error);
    res.status(500).json({
      success: false,
      error: "Error al crear notificación de bienvenida"
    });
  }
});


// =============================================
// MARCAR TODAS COMO LEÍDAS
// =============================================
router.put('/marcar_leidas/:userId', authMiddleware, async (req, res) => {
  try {
    const userId = resolveUserId(req);

    if (!userId) {
      return res.status(400).json({ success: false, error: 'Usuario inválido' });
    }

    await markAllAsRead(userId);

    res.json({ 
      success: true, 
      message: 'Notificaciones marcadas como leídas' 
    });

  } catch (error) {
    console.error('Error marcando notificaciones como leídas:', error);
    res.status(500).json({ 
      success: false,
      error: 'Error al marcar notificaciones' 
    });
  }
});

module.exports = router;
