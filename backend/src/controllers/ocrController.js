// No requiere axios, usa fetch nativo de Node 18
const fs = require('fs');
const path = require('path');

exports.procesarDocumento = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No se recibió ningún archivo' });
    }

    console.log(`[OCR] Procesando archivo: ${req.file.filename}`);

    // Ruta que el contenedor de Python mapea a través del volumen de Docker
    const filePathForPython = `/app/uploads/${req.file.filename}`;

    // Llamada al servicio de Python usando el nombre del servicio en Docker Compose
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

    // === BLOQUE DE COMPROBACIÓN CRÍTICO ===
    console.log("-----------------------------------------");
    console.log("🔍 RESULTADO DEL OCR DESDE PYTHON:");
    console.log("✅ Éxito:", ocrData.success);
    console.log("🆔 RUT Detectado:", ocrData.rut || "NO ENCONTRADO");
    console.log("📑 NUM. DOCUMENTO:", ocrData.numero_documento || "NO DETECTADO")
    console.log("📝 Texto Crudo:", ocrData.raw_text ? ocrData.raw_text.substring(0, 200) : "VACÍO");
    console.log("-----------------------------------------");

    // Eliminar el archivo subido después de procesar
    const uploadsPath = path.resolve(__dirname, '../../uploads');
    const fileToDelete = path.join(uploadsPath, req.file.filename);
    console.log('[OCR] Intentando eliminar archivo:', fileToDelete);
    fs.unlink(fileToDelete, (err) => {
      if (err) {
        console.error('[OCR] Error al eliminar archivo:', fileToDelete, err.code, err.message);
      } else {
        console.log('[OCR] Archivo subido eliminado correctamente:', fileToDelete);
      }
    });

    // Eliminar el archivo procesado con sufijo _proc
    const extIndex = req.file.filename.lastIndexOf('.');
    let processedFilename;
    if (extIndex !== -1) {
      processedFilename = req.file.filename.slice(0, extIndex) + '_proc' + req.file.filename.slice(extIndex);
    } else {
      processedFilename = req.file.filename + '_proc';
    }
    const processedFileToDelete = path.join(uploadsPath, processedFilename);
    console.log('[OCR] Intentando eliminar archivo procesado:', processedFileToDelete);
    fs.unlink(processedFileToDelete, (err) => {
      if (err) {
        console.error('[OCR] Error al eliminar archivo procesado:', processedFileToDelete, err.code, err.message);
      } else {
        console.log('[OCR] Archivo procesado eliminado correctamente:', processedFileToDelete);
      }
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
          mensaje: 'Información extraída correctamente',
          filename: req.file.filename // <-- para poder eliminarla luego
        }
      });
    } else {
      return res.status(422).json({
        success: false,
        error: 'No se pudo detectar un RUT válido.',
        debug: ocrData.raw_text // Enviamos el texto crudo al front para ver qué falló
      });
    }

  } catch (error) {
    console.error('[OCR Controller Error]:', error.message);
    res.status(500).json({
      ok: false,
      error: 'Error de comunicación con el servicio de reconocimiento.'
    });
  }
};