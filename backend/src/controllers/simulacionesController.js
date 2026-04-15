// Eliminar simulación por id y usuario autenticado
exports.eliminarSimulacion = async (req, res) => {
  try {
    const cliente_id = req.user.id;
    const simulacion_id = req.params.id;
    // Solo permite borrar si la simulación pertenece al usuario autenticado
    const result = await db.query(
      `DELETE FROM simulaciones WHERE id = $1 AND cliente_id = $2 RETURNING id`,
      [simulacion_id, cliente_id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'Simulación no encontrada o no autorizada' });
    }
    res.json({ ok: true, mensaje: 'Simulación eliminada correctamente' });
  } catch (error) {
    console.error('[ALARA][Backend] Error al eliminar simulación:', error);
    res.status(500).json({ ok: false, error: 'Error al eliminar simulación' });
  }
};
// Obtener historial de simulaciones del usuario autenticado
exports.obtenerHistorialSimulaciones = async (req, res) => {
  try {
    const cliente_id = req.user.id;
    console.log('[ALARA][Backend] Consultando historial para cliente_id:', cliente_id);
    const result = await db.query(
      `SELECT id, monto_simulado, plazo_simulado, tasa_aplicada, cuota_calculada, tipo_prestamo, moneda_id, datos_adicionales, fecha_simulacion, scoring_detalle, estado_postulacion
       FROM simulaciones WHERE cliente_id = $1 ORDER BY fecha_simulacion DESC`,
      [cliente_id]
    );
    console.log('[ALARA][Backend] Simulaciones encontradas:', result.rows.length);
    res.json({ ok: true, simulaciones: result.rows || [] });
  } catch (error) {
    console.error('[ALARA][Backend] Error al obtener historial:', error);
    // Si el error es por tabla vacía o usuario sin simulaciones, devolver array vacío
    res.json({ ok: true, simulaciones: [] });
  }
};
const db = require('../../db');

// Guarda una simulación avanzada en la base de datos
exports.guardarSimulacion = async (req, res) => {
  try {
    console.log('[ALARA][Backend] Recibido POST /api/simulaciones:', req.body);
    const { tipo, monto, plazo, tasa, cuota, tabla, scoring_detalle } = req.body;
    const cliente_id = req.user ? req.user.id : null;
    console.log('[ALARA][Backend] Usuario autenticado:', cliente_id);
    const tabla12 = Array.isArray(tabla) ? tabla.slice(0, 12) : [];
    // Ya no se elimina la simulación previa: se permite guardar múltiples simulaciones aunque sean iguales en valores pero distinto scoring
    const insertResult = await db.query(
      `INSERT INTO simulaciones (cliente_id, monto_simulado, plazo_simulado, tasa_aplicada, cuota_calculada, tipo_prestamo, moneda_id, datos_adicionales, scoring_detalle, estado_postulacion)
       VALUES ($1, $2, $3, $4, $5, $6, 1, $7, $8, FALSE)
       RETURNING id`,
      [cliente_id, monto, plazo, tasa, cuota, tipo, JSON.stringify(tabla12), scoring_detalle ? JSON.stringify(scoring_detalle) : null]
    );
    res.status(201).json({ ok: true, mensaje: 'Simulación guardada correctamente', simulacion: insertResult.rows?.[0] || null });
  } catch (error) {
    console.error('[ALARA][Backend] Error al guardar simulación:', error);
    res.status(500).json({ ok: false, error: 'Error al guardar simulación' });
  }
};
