// ...existing code...
import React, { useState, useRef, useEffect } from 'react';

const CapturaDatos = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);
  const [lastUploadedFilename, setLastUploadedFilename] = useState(null);
  const lastUploadedFilenameRef = useRef(null);

  // Elimina la imagen anterior del backend
  const deleteLastImage = async () => {
    if (lastUploadedFilenameRef.current) {
      try {
        await fetch('http://localhost:3100/api/image/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: lastUploadedFilenameRef.current })
        });
        lastUploadedFilenameRef.current = null;
        setLastUploadedFilename(null);
      } catch (e) {
        // No hacer nada si falla
      }
    }
  };

  // Eliminar imagen al desmontar componente (cambiar de página)
  useEffect(() => {
    return () => {
      deleteLastImage();
    };
  }, []);

  const handleRemoveFile = async () => {
    await deleteLastImage();
    setFile(null);
    setPreview(null);
    setExtractedData(null);
    setError(null);
    // Limpia el input file
    const input = document.getElementById('fileInput');
    if (input) input.value = '';
  };


  const handleFileChange = async (e) => {
    // Elimina la imagen anterior si existe
    await deleteLastImage();
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
      const response = await fetch('http://localhost:3100/api/ocr/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setExtractedData(result.data);
        // Guardar el nombre del archivo subido para poder eliminarlo después
        if (result.data && result.data.filename) {
          setLastUploadedFilename(result.data.filename);
          lastUploadedFilenameRef.current = result.data.filename;
        }
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
    <div style={{ padding: '40px 0', minHeight: '100vh', background: 'linear-gradient(120deg, #e9f0fa 0%, #f7fafc 100%)', fontFamily: 'Inter, Segoe UI, Arial, sans-serif' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', fontWeight: 800, fontSize: '2.3rem', marginBottom: 36, color: '#1a237e', letterSpacing: '-1px', justifyContent: 'center' }}>
        <span style={{ marginRight: 14, fontSize: '2.5rem' }}>📄</span> Captura de Datos
      </h2>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '48px', flexWrap: 'wrap' }}>
        {/* LADO DE CARGA */}
        <div style={{ minWidth: 420, maxWidth: 520, boxShadow: '0 8px 32px rgba(26,35,126,0.10)', padding: '36px 32px', borderRadius: '22px', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1.5px solid #e3e8f0' }}>
          <h3 style={{ marginBottom: 22, fontWeight: 700, fontSize: '1.25rem', color: '#26326a' }}>Cargar Documento</h3>
          <input type="file" onChange={handleFileChange} id="fileInput" hidden />
          <label htmlFor="fileInput" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', border: preview ? '2.5px solid #1976d2' : '2.5px dashed #b0bec5', borderRadius: '14px', marginBottom: '18px', background: preview ? '#e3f2fd' : '#f5f7fa', minHeight: 340, width: 480, textAlign: 'center', transition: 'border 0.2s' }}>
            {preview ? (
              <img 
                src={preview} 
                alt="Vista previa" 
                style={{ 
                  width: '440px', 
                  height: 'auto', 
                  maxHeight: '300px', 
                  borderRadius: '14px', 
                  boxShadow: '0 4px 18px rgba(26,35,126,0.10)', 
                  objectFit: 'contain',
                  background: '#fff',
                  border: '1.5px solid #b0bec5'
                }} 
              />
            ) : (
              <span style={{ color: '#90a4ae', fontSize: '1.1rem' }}>Selecciona una imagen aquí</span>
            )}
          </label>
          {file && (
            <button
              onClick={handleRemoveFile}
              style={{ width: '100%', marginBottom: '16px', padding: '12px', background: 'linear-gradient(90deg,#e53935 60%,#ff7043 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '1.08rem', boxShadow: '0 2px 8px rgba(229,57,53,0.10)', cursor: 'pointer', transition: 'background 0.2s', letterSpacing: '0.5px' }}
              type="button"
            >
              Eliminar archivo seleccionado
            </button>
          )}
          <button
            onClick={handleUpload}
            disabled={loading || !file}
            style={{ width: '100%', marginTop: '4px', padding: '13px', background: loading ? '#b3d1fa' : 'linear-gradient(90deg,#1976d2 60%,#00bcd4 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '1.08rem', boxShadow: '0 2px 8px rgba(25,118,210,0.10)', cursor: loading || !file ? 'not-allowed' : 'pointer', transition: 'background 0.2s', letterSpacing: '0.5px' }}
          >
            {loading ? '⏳ Procesando...' : 'Iniciar Análisis'}
          </button>
          {error && <p style={{ color: '#e53935', marginTop: 14, fontWeight: 600, fontSize: '1.05rem' }}>{error}</p>}
        </div>
        {/* LADO DE RESULTADOS */}
        <div style={{ minWidth: 420, maxWidth: 520, background: '#fff', padding: '36px 32px', borderRadius: '22px', boxShadow: '0 8px 32px rgba(26,35,126,0.10)', border: '1.5px solid #e3e8f0', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <h3 style={{ marginBottom: 22, fontWeight: 700, fontSize: '1.25rem', color: '#26326a' }}>Resultados</h3>
          {extractedData ? (
            <div style={{ width: '100%' }}>
              <dl style={{ margin: 0, padding: 0, width: '100%' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #e3e8f0', padding: '16px 0 12px 0', alignItems: 'center' }}>
                  <dt style={{ minWidth: 210, fontWeight: 700, color: '#1a237e', fontSize: '1.13rem' }}>RUT</dt>
                  <dd style={{ margin: 0, color: '#26326a', fontWeight: 500, fontSize: '1.13rem', minWidth: 210 }}>{extractedData.rut || 'No encontrado'}</dd>
                </div>
                <div style={{ display: 'flex', borderBottom: '1px solid #e3e8f0', padding: '16px 0 12px 0', alignItems: 'center' }}>
                  <dt style={{ minWidth: 210, fontWeight: 700, color: '#1a237e', fontSize: '1.13rem' }}>Nombres</dt>
                  <dd style={{ margin: 0, color: '#26326a', fontWeight: 500, fontSize: '1.13rem', minWidth: 210 }}>{extractedData.nombres || 'No encontrado'}</dd>
                </div>
                <div style={{ display: 'flex', borderBottom: '1px solid #e3e8f0', padding: '16px 0 12px 0', alignItems: 'center' }}>
                  <dt style={{ minWidth: 210, fontWeight: 700, color: '#1a237e', fontSize: '1.13rem' }}>Apellidos</dt>
                  <dd style={{ margin: 0, color: '#26326a', fontWeight: 500, fontSize: '1.13rem', minWidth: 210 }}>{extractedData.apellidos || 'No encontrado'}</dd>
                </div>
                <div style={{ display: 'flex', borderBottom: '1px solid #e3e8f0', padding: '16px 0 12px 0', alignItems: 'center' }}>
                  <dt style={{ minWidth: 210, fontWeight: 700, color: '#1a237e', fontSize: '1.13rem' }}>Nacionalidad</dt>
                  <dd style={{ margin: 0, color: '#26326a', fontWeight: 500, fontSize: '1.13rem', minWidth: 210 }}>{extractedData.nacionalidad || 'No encontrado'}</dd>
                </div>
                <div style={{ display: 'flex', borderBottom: '1px solid #e3e8f0', padding: '16px 0 12px 0', alignItems: 'center' }}>
                  <dt style={{ minWidth: 210, fontWeight: 700, color: '#1a237e', fontSize: '1.13rem' }}>Fecha de nacimiento</dt>
                  <dd style={{ margin: 0, color: '#26326a', fontWeight: 500, fontSize: '1.13rem', minWidth: 210 }}>{extractedData.fechaNacimiento || 'No encontrado'}</dd>
                </div>
                <div style={{ display: 'flex', borderBottom: '1px solid #e3e8f0', padding: '16px 0 12px 0', alignItems: 'center' }}>
                  <dt style={{ minWidth: 210, fontWeight: 700, color: '#1a237e', fontSize: '1.13rem' }}>Número de documento</dt>
                  <dd style={{ margin: 0, color: '#26326a', fontWeight: 500, fontSize: '1.13rem', minWidth: 210 }}>{extractedData.numeroDocumento || 'No encontrado'}</dd>
                </div>
                <div style={{ display: 'flex', borderBottom: '1px solid #e3e8f0', padding: '16px 0 12px 0', alignItems: 'center' }}>
                  <dt style={{ minWidth: 210, fontWeight: 700, color: '#1a237e', fontSize: '1.13rem' }}>Fecha de emisión</dt>
                  <dd style={{ margin: 0, color: '#26326a', fontWeight: 500, fontSize: '1.13rem', minWidth: 210 }}>{extractedData.fechaEmision || 'No encontrado'}</dd>
                </div>
                <div style={{ display: 'flex', borderBottom: '1px solid #e3e8f0', padding: '16px 0 12px 0', alignItems: 'center' }}>
                  <dt style={{ minWidth: 210, fontWeight: 700, color: '#1a237e', fontSize: '1.13rem' }}>Fecha de vencimiento</dt>
                  <dd style={{ margin: 0, color: '#26326a', fontWeight: 500, fontSize: '1.13rem', minWidth: 210 }}>{extractedData.fechaVencimiento || 'No encontrado'}</dd>
                </div>
                <div style={{ display: 'flex', borderBottom: '1px solid #e3e8f0', padding: '16px 0 12px 0', alignItems: 'center' }}>
                  <dt style={{ minWidth: 210, fontWeight: 700, color: '#1a237e', fontSize: '1.13rem' }}>Tipo</dt>
                  <dd style={{ margin: 0, color: '#26326a', fontWeight: 500, fontSize: '1.13rem', minWidth: 210 }}>{extractedData.tipo || 'No detectado'}</dd>
                </div>
                <div style={{ display: 'flex', padding: '16px 0 12px 0', alignItems: 'center' }}>
                  <dt style={{ minWidth: 210, fontWeight: 700, color: '#1a237e', fontSize: '1.13rem' }}>Mensaje</dt>
                  <dd style={{ margin: 0, color: '#26326a', fontWeight: 500, fontSize: '1.13rem', minWidth: 210 }}>{extractedData.mensaje || ''}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <p style={{ color: '#90a4ae', fontStyle: 'italic', fontWeight: 500, fontSize: '1.08rem' }}>Sube un archivo para ver los resultados.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CapturaDatos;