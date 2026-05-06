// No requiere axios, usa fetch nativo de Node 18
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

    if (ocrData.success && ocrData.rut) {
      return res.json({
        ok: true,
        rut: ocrData.rut,
        numeroDocumento: ocrData.numero_documento,
        mensaje: 'Información extraída correctamente'
      });
    } else {
      return res.status(422).json({
        ok: false,
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