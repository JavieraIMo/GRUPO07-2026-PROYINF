import React, { useState, useRef, useEffect } from 'react';

const CapturaDatos = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastUploadedFilenameRef = useRef(null);

  const [formData, setFormData] = useState({
    rut: '',
    nombres: '',
    apellidos: '',
    fechaNacimiento: '',
    numeroDocumento: '',
    region: '',
    comuna: ''
  });

  const deleteLastImage = async () => {
    if (lastUploadedFilenameRef.current) {
      try {
        await fetch('http://localhost:3100/api/image/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: lastUploadedFilenameRef.current })
        });
        lastUploadedFilenameRef.current = null;
      } catch (e) { /* Error silencioso */ }
    }
  };

  useEffect(() => {
    return () => { deleteLastImage(); };
  }, []);

  const handleFileChange = async (e) => {
    await deleteLastImage();
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) { setError("Selecciona un archivo primero."); return; }
    
    const data = new FormData();
    data.append('documento', file);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3100/api/ocr/upload', {
        method: 'POST',
        body: data,
      });

      const result = await response.json();
      console.log("Datos recibidos:", result);

      if (result.success) {
        const ext = result.data || result;
        setFormData({
          rut: ext.rut || '',
          nombres: ext.nombres || '',
          apellidos: ext.apellidos || '',
          fechaNacimiento: ext.fechaNacimiento || ext.fecha_nacimiento || '',
          numeroDocumento: ext.numero_documento || ext.numeroDocumento || '',
          region: ext.region || '',
          comuna: ext.comuna || ''
        });
        
        if (ext.filename) lastUploadedFilenameRef.current = ext.filename;
      } else {
        setError(result.error || "No se pudo extraer información.");
      }
    } catch (err) {
      console.error("Error en la petición:", err);
      setError("Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div style={{ padding: '40px 0', minHeight: '100vh', background: '#f0f2f5', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center', color: '#1a237e', marginBottom: '30px' }}>📄 Captura y Verificación</h2>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap', padding: '0 20px' }}>
        
        {/* PANEL IZQUIERDO: CARGA */}
        <div style={{ width: '450px', background: '#fff', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0 }}>1. Subir Carnet</h3>
          <input type="file" onChange={handleFileChange} id="fileInput" hidden />
          <label htmlFor="fileInput" style={{ 
            display: 'block', width: '100%', height: '250px', border: '2px dashed #ccc', 
            borderRadius: '10px', textAlign: 'center', lineHeight: '250px', cursor: 'pointer',
            overflow: 'hidden', background: '#fafafa', marginBottom: '20px'
          }}>
            {preview ? <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : 'Click para subir foto'}
          </label>
          
          <button 
            onClick={handleUpload} 
            disabled={loading || !file}
            style={{ 
              width: '100%', padding: '12px', background: '#1976d2', 
              color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer',
              opacity: (loading || !file) ? 0.6 : 1
            }}
          >
            {loading ? 'Analizando...' : 'Iniciar Extracción'}
          </button>
          {error && <p style={{ color: '#d32f2f', textAlign: 'center', marginTop: '15px', fontWeight: 'bold' }}>{error}</p>}
        </div>

        {/* PANEL DERECHO: FORMULARIO */}
        <div style={{ width: '500px', background: '#fff', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0 }}>2. Datos Extraídos</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            {/* Fila 1: RUT y N° Documento */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>RUT</label>
                <input style={inputStyle} name="rut" value={formData.rut} onChange={handleInputChange} />
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>N° Documento</label>
                <input style={inputStyle} name="numeroDocumento" value={formData.numeroDocumento} onChange={handleInputChange} />
              </div>
            </div>

            {/* Fila 2: Apellidos (Primero, como en el carnet) */}
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Apellidos</label>
              <input style={inputStyle} name="apellidos" value={formData.apellidos} onChange={handleInputChange} />
            </div>

            {/* Fila 3: Nombres */}
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Nombres</label>
              <input style={inputStyle} name="nombres" value={formData.nombres} onChange={handleInputChange} />
            </div>

            {/* Fila 4: Fecha Nacimiento */}
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Fecha de Nacimiento</label>
              <input style={inputStyle} name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleInputChange} />
            </div>

            {/* Fila 5: Región y Comuna */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Región</label>
                <input style={inputStyle} name="region" value={formData.region} onChange={handleInputChange} />
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Comuna</label>
                <input style={inputStyle} name="comuna" value={formData.comuna} onChange={handleInputChange} />
              </div>
            </div>

            <button 
              onClick={() => console.log("Datos confirmados:", formData)}
              style={{ 
                marginTop: '10px', padding: '15px', background: '#2e7d32', 
                color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' 
              }}
            >
              Confirmar y Guardar
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};

// Estilos
const inputGroupStyle = { display: 'flex', flexDirection: 'column', flex: 1 };
const labelStyle = { fontSize: '12px', fontWeight: 'bold', color: '#666', marginBottom: '5px' };
const inputStyle = { padding: '10px', border: '1px solid #ddd', borderRadius: '5px', fontSize: '14px', background: '#fafafa', width: '100%', boxSizing: 'border-box' };

export default CapturaDatos;