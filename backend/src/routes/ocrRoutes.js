const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ocrController = require('../controllers/ocrController');

const storage = multer.diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => {
    // Le ponemos un prefijo para saber que es para OCR
    cb(null, `ocr-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

// --- RUTA ORIGINAL: CÉDULA DE IDENTIDAD (Imagen/Foto) ---
router.post('/upload', upload.single('documento'), ocrController.procesarDocumento);

// --- CORREGIDO: NUEVA RUTA EXCLUSIVA PARA LIQUIDACIÓN DE SUELDO (PDF) ---
// Cambiamos el endpoint a '/upload-liquidacion' para evitar el conflicto de duplicidad
router.post('/upload-liquidacion', upload.single('documento'), ocrController.procesarLiquidacion);

module.exports = router;