// No requiere axios, usa fetch nativo de Node 18
const fs = require('fs');
const path = require('path');

exports.procesarDocumento = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No se recibió ningún archivo' });
    }

    const timestamp = new Date().toISOString();
    console.log(`\n🚀 [${timestamp}] --- INICIO PROCESAMIENTO OCR ---`);
    console.log(`[OCR] Archivo: ${req.file.filename}`);

    const filePathForPython = `/app/uploads/${req.file.filename}`;

    const response = await fetch('http://ocr_service:5000/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath: filePathForPython })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Servidor Python respondió con error: ${response.status} - ${errorText}`);
    }

    const ocrData = await response.json();

    // === BLOQUE DE LOG DETALLADO Y CLASIFICADO ===
    console.log("\n╔══════════════════════════════════════════════════════╗");
    console.log("║       🔍 CLASIFICACIÓN DE DATOS RECIBIDOS            ║");
    console.log("╚══════════════════════════════════════════════════════╝");
    console.log(`📊 Éxito del Proceso: ${ocrData.success ? '✅ SÍ' : '❌ NO'}`);
    console.log(`🆔 RUT:              [${ocrData.rut || 'VACÍO'}]`);
    console.log(`📑 Num. Documento:   [${ocrData.numero_documento || 'VACÍO'}]`);
    console.log(`👤 Nombres:          [${ocrData.nombres || 'VACÍO'}]`);
    console.log(`👤 Apellidos:        [${ocrData.apellidos || 'VACÍO'}]`);
    console.log(`📅 F. Nacimiento:    [${ocrData.fechaNacimiento || 'VACÍO'}]`);
    console.log(`📅 F. Vencimiento:   [${ocrData.fechaVencimiento || 'VACÍO'}]`);
    
    // Log de diagnóstico para cruce de datos
    if (ocrData.nombres && ocrData.apellidos) {
        if (ocrData.nombres === ocrData.apellidos) {
            console.log("⚠️  ALERTA: El nombre y apellido son idénticos. Posible error de clasificación.");
        }
    }

  console.log("--------------------------------------------------------");
  console.log("📝 MUESTRA DEL TEXTO CRUDO COMPLETO:");
  if (ocrData.raw_text) {
      // Usamos Template Literals para mantener los saltos de línea originales
      console.log(`\n"${ocrData.raw_text.trim()}"\n`);
    } else {
      console.log("VACÍO");
  }
  console.log("--------------------------------------------------------\n");

    // Lógica de eliminación de archivos (se mantiene igual)
    const uploadsPath = path.resolve(__dirname, '../../uploads');
    const fileToDelete = path.join(uploadsPath, req.file.filename);
    
    fs.unlink(fileToDelete, (err) => {
      if (!err) console.log('[OCR] Archivo original eliminado.');
    });

    const extIndex = req.file.filename.lastIndexOf('.');
    let processedFilename = extIndex !== -1 
        ? req.file.filename.slice(0, extIndex) + '_proc' + req.file.filename.slice(extIndex)
        : req.file.filename + '_proc';
    
    const processedFileToDelete = path.join(uploadsPath, processedFilename);
    fs.unlink(processedFileToDelete, (err) => {
      if (!err) console.log('[OCR] Archivo procesado eliminado.');
    });

    if (ocrData.success && ocrData.rut) {
      return res.json({
        success: true,
        data: {
          rut: ocrData.rut,
          numeroDocumento: ocrData.numero_documento,
          nombres: ocrData.nombres,
          apellidos: ocrData.apellidos,
          fechaNacimiento: ocrData.fechaNacimiento,
          fechaEmision: ocrData.fechaEmision,
          fechaVencimiento: ocrData.fechaVencimiento,
          tipo: 'Cédula de Identidad',
          filename: req.file.filename
        }
      });
    } else {
      return res.status(422).json({
        success: false,
        error: 'No se pudo detectar un RUT válido.',
        debug: ocrData.raw_text
      });
    }

  } catch (error) {
    console.error('❌ [OCR Controller Error]:', error.message);
    res.status(500).json({ ok: false, error: 'Error de comunicación con el servicio OCR.' });
  }
};