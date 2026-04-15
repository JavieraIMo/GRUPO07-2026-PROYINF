const db = require('../../db');

exports.obtenerHistorialSolicitudes = async (req, res) => {
  try {
    const cliente_id = req.user.id;
    const result = await db.query(
      `SELECT
        s.id,
        s.simulacion_id,
        s.numero_solicitud,
        s.monto_solicitado,
        s.plazo_solicitado,
        s.tipo_prestamo,
        s.canal_origen,
        s.documentos_adjuntos,
        s.fecha_solicitud,
        s.fecha_actualizacion,
        s.observaciones,
        COALESCE(e.codigo_estado, 'PENDIENTE') AS estado_codigo,
        COALESCE(e.descripcion, 'Solicitud pendiente de revisión') AS estado_descripcion,
        sim.fecha_simulacion,
        sim.tasa_aplicada,
        sim.cuota_calculada
      FROM solicitudes s
      LEFT JOIN estados e ON e.id = s.estado_id
      LEFT JOIN simulaciones sim ON sim.id = s.simulacion_id
      WHERE s.cliente_id = $1
      ORDER BY s.fecha_solicitud DESC, s.id DESC`,
      [cliente_id]
    );

    return res.json({ ok: true, solicitudes: result.rows });
  } catch (error) {
    console.error('[ALARA][Backend] Error al obtener historial de solicitudes:', error);
    return res.status(500).json({ ok: false, error: 'Error al obtener historial de postulaciones' });
  }
};

// Registrar solicitud de préstamo
exports.registrarSolicitud = async (req, res) => {
  try {
    const cliente_id = req.user.id;
    const datos = req.body;
    const simulacionId = datos.simulacionId ? Number(datos.simulacionId) : null;
    await db.query('BEGIN');

    let simulacionSeleccionada = null;

    if (simulacionId) {
      const simulacionResult = await db.query(
        `SELECT id, tipo_prestamo, monto_simulado, plazo_simulado
         FROM simulaciones
         WHERE id = $1 AND cliente_id = $2`,
        [simulacionId, cliente_id]
      );

      simulacionSeleccionada = simulacionResult.rows[0] || null;

      if (!simulacionSeleccionada) {
        await db.query('ROLLBACK');
        return res.status(404).json({ ok: false, error: 'La simulación seleccionada no existe o no pertenece al usuario.' });
      }
    }

    const numeroSolicitud = `SOL-${Date.now()}-${cliente_id}-${Math.floor(Math.random() * 10000)}`;
    const montoSolicitado = simulacionSeleccionada?.monto_simulado ?? datos.monto;
    const plazoSolicitado = simulacionSeleccionada?.plazo_simulado ?? datos.plazo;
    const tipoPrestamo = simulacionSeleccionada?.tipo_prestamo ?? datos.tipoPrestamo ?? 'personal';

    if (!montoSolicitado || !plazoSolicitado) {
      await db.query('ROLLBACK');
      return res.status(400).json({ ok: false, error: 'No fue posible determinar el monto o plazo de la solicitud.' });
    }

    const datosFormulario = {
      nombre: datos.nombre,
      rut: datos.rut,
      email: datos.email,
      situacionLaboral: datos.situacionLaboral,
      tipoTrabajo: datos.tipoTrabajo,
      empresa: datos.empresa,
      antiguedad: datos.antiguedad,
      tipoContrato: datos.tipoContrato,
      ingresos: datos.ingresos,
      otrosIngresos: datos.otrosIngresos,
      arriendo: datos.arriendo,
      gastos: datos.gastos,
      dependientes: datos.dependientes,
      creditosVigentes: datos.creditosVigentes,
      tarjetas: datos.tarjetas,
      cuotas: datos.cuotas,
      cuentaDeposito: datos.cuentaDeposito,
    };

    await db.query(
      `INSERT INTO solicitudes (
        cliente_id, simulacion_id, numero_solicitud, monto_solicitado, plazo_solicitado, tipo_prestamo, canal_origen, documentos_adjuntos, observaciones, estado_id, fecha_solicitud, fecha_actualizacion
      ) VALUES (
        $1,$2,$3,$4,$5,$6,'WEB',$7,$8,(SELECT id FROM estados WHERE codigo_estado = 'PENDIENTE' LIMIT 1),NOW(),NOW()
      )`,
      [
        cliente_id,
        simulacionSeleccionada?.id ?? null,
        numeroSolicitud,
        montoSolicitado,
        plazoSolicitado,
        tipoPrestamo,
        JSON.stringify(datosFormulario),
        'Solicitud registrada desde formulario web'
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
