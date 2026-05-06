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

router.post('/upload', upload.single('documento'), ocrController.procesarDocumento);

module.exports = router;