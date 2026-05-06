import React, { useState } from 'react';

const CapturaDatos = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Selecciona un archivo primero.");
      return;
    }

    const formData = new FormData();
    formData.append('documento', file);

    setLoading(true);
    setExtractedData(null);

    try {
      // USANDO FETCH EN LUGAR DE AXIOS
      const response = await fetch('http://localhost:3100/api/ocr/upload', {
        method: 'POST',
        body: formData,
        // Con Fetch + FormData NO debes poner el Content-Type manualmente, 
        // el navegador lo hace solo con el "boundary" correcto.
      });

      const result = await response.json();

      if (result.success) {
        setExtractedData(result.data);
      } else {
        setError("No se pudo extraer información.");
      }
    } catch (err) {
      console.error("Error OCR:", err);
      setError("Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h2>📄 Captura de Datos</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* LADO DE CARGA */}
        <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '10px' }}>
          <h3>Cargar Documento</h3>
          <input type="file" onChange={handleFileChange} id="fileInput" hidden />
          <label htmlFor="fileInput" style={{ cursor: 'pointer', display: 'block', padding: '20px', border: '2px dashed #aaa' }}>
            {preview ? <img src={preview} alt="Vista previa" style={{ width: '100%' }} /> : "Selecciona una imagen aquí"}
          </label>

          <button 
            onClick={handleUpload} 
            disabled={loading || !file}
            style={{ width: '100%', marginTop: '10px', padding: '10px', backgroundColor: loading ? '#ccc' : '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}
          >
            {loading ? "⏳ Procesando..." : "🚀 Iniciar Análisis"}
          </button>
          {error && <p style={{ color: 'red' }}>⚠️ {error}</p>}
        </div>

        {/* LADO DE RESULTADOS */}
        <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '10px' }}>
          <h3>✅ Resultados</h3>
          {extractedData ? (
            <div>
              <p><strong>RUT:</strong> {extractedData.rut || "No encontrado"}</p>
              <p><strong>Método:</strong> {extractedData.tipo}</p>
            </div>
          ) : (
            <p>Sube un archivo para ver los resultados.</p>
          )}
        </div>

      </div>
    </div>
  );
};

export default CapturaDatos;