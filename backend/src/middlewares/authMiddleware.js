const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[ALARA][AuthMiddleware] Token faltante o mal formado:', authHeader);
    return res.status(401).json({ ok: false, error: 'No autorizado: token faltante' });
  }
  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload) {
    console.log('[ALARA][AuthMiddleware] Token inválido o expirado:', token);
    return res.status(401).json({ ok: false, error: 'Token inválido o expirado' });
  }

  try {
    let user = null;

    if (payload.id) {
      user = await User.findById(payload.id);
    }

    if (!user && payload.email) {
      user = await User.findByEmail(payload.email);
    }

    if (!user) {
      console.log('[ALARA][AuthMiddleware] Usuario del token no existe en la base:', payload);
      return res.status(401).json({ ok: false, error: 'Usuario no encontrado para el token entregado' });
    }

    req.user = {
      ...payload,
      id: user.id,
      email: user.email,
      rol: user.rol,
      rut: user.rut,
      nombre_completo: user.nombre_completo,
    };

    console.log('[ALARA][AuthMiddleware] Usuario autenticado:', req.user);
    next();
  } catch (error) {
    console.error('[ALARA][AuthMiddleware] Error validando usuario autenticado:', error);
    return res.status(500).json({ ok: false, error: 'Error validando autenticación' });
  }
}

module.exports = { authMiddleware };
