const express = require('express');
const router = express.Router();
const pool = require('../../db');

router.get('/by-rut/:rut', async (req, res) => {
  try {
    const rutNormalizado = req.params.rut.replace(/\./g, '').toUpperCase();

    const result = await pool.query(
      `
      SELECT *
      FROM clientes
      WHERE REPLACE(UPPER(rut), '.', '') = $1
      LIMIT 1;
      `,
      [rutNormalizado]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado'
      });
    }

    res.json({
      success: true,
      cliente: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/save', async (req, res) => {
  try {

    console.log('Datos recibidos:', req.body);

    const {
        rut,
        email,
        telefono,
        region,
        comuna,
        direccion,
        fecha_nacimiento,
        sueldo_base,
        asignacion_familiares,
        nombre_afp,
        nombre_salud,
        ingresos
    } = req.body;

    if (!rut && !email) {
      return res.status(400).json({
        success: false,
        message: 'Debe enviarse rut o email.'
      });
    }

    const rutNormalizado = rut
      ? rut.replace(/\./g, '').toUpperCase()
      : null;

    const result = await pool.query(
      `
      UPDATE clientes
      SET
        telefono = COALESCE($1, telefono),
        region = $2,
        comuna = $3,
        direccion = $4,
        fecha_nacimiento = $5,
        sueldo_base = $6,
        asignacion_familiares = $7,
        nombre_afp = $8,
        nombre_salud = $9,
        ingresos = $10
      WHERE
        REPLACE(UPPER(rut), '.', '') = $11
        OR LOWER(email) = LOWER($12)
      RETURNING *;
      `,
      [
        telefono || null,
        region || null,
        comuna || null,
        direccion || null,
        fecha_nacimiento || null,
        sueldo_base || null,
        asignacion_familiares || null,
        nombre_afp || null,
        nombre_salud || null,
        ingresos || null,
        rutNormalizado,
        email || null
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cliente no encontrado. No se creó ningún usuario nuevo.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cliente actualizado correctamente.',
      cliente: result.rows[0]
    });

  } catch (error) {

    console.error('ERROR CLIENTES SAVE:', error);

    res.status(500).json({
      success: false,
      message: 'Error al guardar el registro.',
      error: error.message
    });
  }
});

module.exports = router;