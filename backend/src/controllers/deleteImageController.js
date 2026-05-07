const fs = require('fs');
const path = require('path');

exports.deleteImage = (req, res) => {
  const { filename } = req.body;
  if (!filename) {
    console.log('No se proporcionó el nombre del archivo.');
    return res.status(400).json({ success: false, error: 'No se proporcionó el nombre del archivo.' });
  }
  // Ruta absoluta a la carpeta uploads
  const uploadsPath = path.resolve(__dirname, '../../uploads');
  const filePath = path.join(uploadsPath, filename);
  console.log('Intentando eliminar archivo:', filePath);
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error('Error al eliminar archivo:', err);
      return res.status(404).json({ success: false, error: 'Archivo no encontrado o ya eliminado.' });
    }
    console.log('Archivo eliminado correctamente:', filePath);
    return res.json({ success: true, message: 'Archivo eliminado correctamente.' });
  });
};
