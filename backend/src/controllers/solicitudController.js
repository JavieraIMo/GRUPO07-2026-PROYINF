const db = require('../../db');

// Registrar solicitud de préstamo
exports.registrarSolicitud = async (req, res) => {
  try {
    const cliente_id = req.user.id;
    const datos = req.body;
    const simulacionId = datos.simulacionId ? Number(datos.simulacionId) : null;
    await db.query('BEGIN');
    // Guardar todos los datos relevantes de la solicitud
    await db.query(
      `INSERT INTO solicitudes (
        cliente_id, nombre, rut, email, monto, plazo, situacion_laboral, tipo_trabajo, empresa, antiguedad, tipo_contrato, ingresos, otros_ingresos, arriendo, gastos, dependientes, creditos_vigentes, tarjetas, cuotas, cuenta_deposito, fecha_solicitud
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,NOW()
      )`,
      [
        cliente_id,
        datos.nombre,
        datos.rut,
        datos.email,
        datos.monto,
        datos.plazo,
        datos.situacionLaboral,
        datos.tipoTrabajo,
        datos.empresa,
        datos.antiguedad,
        datos.tipoContrato,
        datos.ingresos,
        datos.otrosIngresos,
        datos.arriendo,
        datos.gastos,
        datos.dependientes,
        datos.creditosVigentes,
        datos.tarjetas,
        datos.cuotas,
        datos.cuentaDeposito
      ]
    );
    if (simulacionId) {
      await db.query(
        `UPDATE simulaciones
         SET estado_postulacion = TRUE
         WHERE id = $1 AND cliente_id = $2`,
        [simulacionId, cliente_id]
      );
    } else {
      await db.query(
        `UPDATE simulaciones
         SET estado_postulacion = TRUE
         WHERE id = (
           SELECT id
           FROM simulaciones
           WHERE cliente_id = $1
           ORDER BY fecha_simulacion DESC
           LIMIT 1
         )`,
        [cliente_id]
      );
    }
    await db.query('COMMIT');
    res.json({ ok: true, mensaje: 'Solicitud registrada correctamente' });
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('[ALARA][Backend] Error al registrar solicitud:', error);
    res.status(500).json({ ok: false, error: 'Error al registrar solicitud' });
  }
};
