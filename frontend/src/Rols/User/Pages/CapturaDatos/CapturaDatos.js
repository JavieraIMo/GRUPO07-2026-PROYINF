import React, { useState, useRef, useEffect } from 'react';

const CapturaDatos = () => {
  // --- ESTADOS PARA CARNET ---
  const [fileCarnet, setFileCarnet] = useState(null);
  const [previewCarnet, setPreviewCarnet] = useState(null);
  const [loadingCarnet, setLoadingCarnet] = useState(false);

  // --- ESTADOS PARA LIQUIDACIÓN ---
  const [fileLiq, setFileLiq] = useState(null);
  const [previewLiq, setPreviewLiq] = useState(null); // Útil si suben imagen o indicará nombre si es PDF
  const [loadingLiq, setLoadingLiq] = useState(false);

  // --- ESTADOS GENERALES ---
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);
  const lastUploadedFilenameRef = useRef(null);

  // Estado del formulario unificado
  const [formData, setFormData] = useState({
    rut: '',
    nombres: '',
    apellidos: '',
    fechaNacimiento: '',
    email: '',
    telefono: '',
    region: '',
    comuna: '',
    direccion: '',
    sueldoBase: '',
    asignacionFamiliares: '',
    nombreAfp: '',
    nombreSalud: '',
    ingresos: '' 
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

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

  // Manejadores de archivos individuales
  const handleCarnetChange = async (e) => {
    await deleteLastImage();
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFileCarnet(selectedFile);
      setPreviewCarnet(URL.createObjectURL(selectedFile));
      setError(null);
      setSaveSuccess(false);
    }
  };

  const handleLiqChange = async (e) => {
    await deleteLastImage();
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFileLiq(selectedFile);
      // Si es un PDF mostramos el nombre, si es imagen mostramos preview
      if (selectedFile.type === "application/pdf") {
        setPreviewLiq("📄 Archivo PDF: " + selectedFile.name);
      } else {
        setPreviewLiq(URL.createObjectURL(selectedFile));
      }
      setError(null);
      setSaveSuccess(false);
    }
  };

  // Petición genérica que complementa el estado actual
  const uploadDocument = async (fileToSend, endpointUrl, setLoader) => {
    if (!fileToSend) { setError("Selecciona un archivo primero."); return; }
    
    const data = new FormData();
    data.append('documento', fileToSend);
    setLoader(true);
    setError(null);

    try {
      const response = await fetch(endpointUrl, { method: 'POST', body: data });
      const result = await response.json();

      if (result.success) {
        const ext = result.data || result;
        
        // Fusión complementaria inteligente
        setFormData(prev => ({
          ...prev,
          rut: ext.rut || prev.rut || '',
          nombres: ext.nombres || prev.nombres || '',
          apellidos: ext.apellidos || prev.apellidos || '',
          fechaNacimiento: ext.fechaNacimiento || ext.fecha_nacimiento || prev.fechaNacimiento || '',
          email: ext.email || prev.email || '',
          region: ext.region || prev.region || '',
          comuna: ext.comuna || prev.comuna || '',
          direccion: ext.direccion || prev.direccion || '',
          sueldoBase: ext.sueldoBase || ext.sueldo_base || prev.sueldoBase || '',
          asignacionFamiliares: ext.asignacionFamiliares || ext.asignacion_familiar || prev.asignacionFamiliares || '',
          nombreAfp: ext.nombreAfp || ext.nombre_afp || prev.nombreAfp || '',
          nombreSalud: ext.nombreSalud || ext.nombre_salud || prev.nombreSalud || '',
          ingresos: ext.ingresos || ext.saldo_liquido || ext.saldo_liquido_a_pagar || prev.ingresos || ''
        }));
        
        if (ext.filename) lastUploadedFilenameRef.current = ext.filename;
      } else {
        setError(result.error || "No se pudo extraer información del documento.");
      }
    } catch (err) {
      console.error(err);
      setError("Error de conexión con el servidor.");
    } finally {
      setLoader(false);
    }
  };

  const handleSaveToDatabase = async () => {
    setSaveLoading(true);
    setError(null);
    setSaveSuccess(false);

    const payload = {
      rut: formData.rut,
      nombre_completo: `${formData.nombres} ${formData.apellidos}`.trim(),
      fecha_nacimiento: formData.fechaNacimiento || null,
      email: formData.email,
      telefono: formData.telefono || null,
      region: formData.region || null,
      comuna: formData.comuna || null,
      direccion: formData.direccion || null,
      sueldo_base: formData.sueldoBase ? parseFloat(formData.sueldoBase) : null,
      asignacion_familiares: formData.asignacionFamiliares ? parseFloat(formData.asignacionFamiliares) : null,
      nombre_afp: formData.nombreAfp || null,
      nombre_salud: formData.nombreSalud || null,
      ingresos: formData.ingresos ? parseFloat(formData.ingresos) : null
    };

    try {
      const response = await fetch('http://localhost:3100/api/clientes/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (result.success) setSaveSuccess(true);
      else setError(result.error || "Error al guardar el registro.");
    } catch (err) {
      setError("Error de red al conectar con la base de datos.");
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px 0', minHeight: '100vh', background: '#f0f2f5', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center', color: '#1a237e', marginBottom: '30px' }}>📄 Captura y Verificación Documental</h2>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap', padding: '0 20px' }}>
        
        {/* PANEL IZQUIERDO: SECCIONES DE CARGA INDEPENDIENTES */}
        <div style={{ width: '450px', display: 'flex', flexDirection: 'column', gap: '25px' }}>
          
          {/* APARTADO CARNET */}
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0, fontSize: '16px', color: '#333' }}>1. Cargar Cédula de Identidad</h3>
            <input type="file" onChange={handleCarnetChange} id="carnetInput" accept="image/*" hidden />
            <label htmlFor="carnetInput" style={dropzoneStyle}>
              {previewCarnet ? (
                <img src={previewCarnet} alt="Carnet Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : '📸 Seleccionar foto de carnet'}
            </label>
            <button 
              onClick={() => uploadDocument(fileCarnet, 'http://localhost:3100/api/ocr/upload', setLoadingCarnet)} 
              disabled={loadingCarnet || !fileCarnet}
              style={{ ...btnStyle, background: '#1976d2', opacity: (loadingCarnet || !fileCarnet) ? 0.6 : 1 }}
            >
              {loadingCarnet ? 'Escaneando Cédula...' : 'Extraer Datos de Identidad'}
            </button>
          </div>

          {/* APARTADO LIQUIDACIÓN */}
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0, fontSize: '16px', color: '#333' }}>2. Cargar Liquidación de Sueldo</h3>
            <input type="file" onChange={handleLiqChange} id="liqInput" accept="image/*,application/pdf" hidden />
            <label htmlFor="liqInput" style={dropzoneStyle}>
              {previewLiq ? (
                previewLiq.startsWith("📄") ? (
                  <div style={{ padding: '10px', lineHeight: 'normal', display: 'inline-block', verticalAlign: 'middle' }}>{previewLiq}</div>
                ) : <img src={previewLiq} alt="Liq Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : '📂 Seleccionar Liquidación (PDF o Imagen)'}
            </label>
            <button 
              onClick={() => uploadDocument(fileLiq, 'http://localhost:3100/api/ocr/upload-liquidacion', setLoadingLiq)} 
              disabled={loadingLiq || !fileLiq}
              style={{ ...btnStyle, background: '#7b1fa2', opacity: (loadingLiq || !fileLiq) ? 0.6 : 1 }}
            >
              {loadingLiq ? 'Analizando Finanzas...' : 'Extraer Datos Financieros'}
            </button>
          </div>

          {error && <p style={{ color: '#d32f2f', textAlign: 'center', fontWeight: 'bold', margin: 0 }}>{error}</p>}
          {saveSuccess && <p style={{ color: '#2e7d32', textAlign: 'center', fontWeight: 'bold', margin: 0 }}>✓ Ficha guardada con éxito.</p>}
        </div>

        {/* PANEL DERECHO: FORMULARIO UNIFICADO (Se mantiene igual) */}
        <div style={{ width: '550px', background: '#fff', padding: '30px', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0 }}>Ficha Única del Cliente</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <span style={sectionTitleStyle}>Datos de Identidad</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>RUT *</label>
                <input style={inputStyle} name="rut" value={formData.rut} onChange={(e) => handleInputChange(e)} placeholder="12.345.678-9" />
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Fecha de Nacimiento</label>
                <input style={inputStyle} name="fechaNacimiento" type="date" value={formData.fechaNacimiento} onChange={(e) => handleInputChange(e)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Nombres</label>
                <input style={inputStyle} name="nombres" value={formData.nombres} onChange={(e) => handleInputChange(e)} />
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Apellidos</label>
                <input style={inputStyle} name="apellidos" value={formData.apellidos} onChange={(e) => handleInputChange(e)} />
              </div>
            </div>

            <span style={sectionTitleStyle}>Contacto y Ubicación</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Email *</label>
                <input style={inputStyle} name="email" type="email" value={formData.email} onChange={(e) => handleInputChange(e)} placeholder="ejemplo@correo.com" />
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Teléfono</label>
                <input style={inputStyle} name="telefono" value={formData.telefono} onChange={(e) => handleInputChange(e)} placeholder="+56912345678" />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Región</label>
                <input style={inputStyle} name="region" value={formData.region} onChange={(e) => handleInputChange(e)} />
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Comuna</label>
                <input style={inputStyle} name="comuna" value={formData.comuna} onChange={(e) => handleInputChange(e)} />
              </div>
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>Dirección Domiciliaria</label>
              <input style={inputStyle} name="direccion" value={formData.direccion} onChange={(e) => handleInputChange(e)} />
            </div>

            <span style={sectionTitleStyle}>Información Financiera</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Sueldo Base ($)</label>
                <input style={inputStyle} type="number" name="sueldoBase" value={formData.sueldoBase} onChange={(e) => handleInputChange(e)} />
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Asignación Familiar ($)</label>
                <input style={inputStyle} type="number" name="asignacionFamiliares" value={formData.asignacionFamiliares} onChange={(e) => handleInputChange(e)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Institución AFP</label>
                <input style={inputStyle} name="nombreAfp" value={formData.nombreAfp} onChange={(e) => handleInputChange(e)} />
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Previsión Salud</label>
                <input style={inputStyle} name="nombreSalud" value={formData.nombreSalud} onChange={(e) => handleInputChange(e)} />
              </div>
            </div>

            <div style={inputGroupStyle}>
              <label style={{ ...labelStyle, color: '#1b5e20' }}>Saldo Líquido / Ingresos Finales ($) *</label>
              <input style={{ ...inputStyle, border: '1px solid #2e7d32', background: '#e8f5e9' }} type="number" name="ingresos" value={formData.ingresos} onChange={(e) => handleInputChange(e)} />
            </div>

            <button 
              onClick={handleSaveToDatabase}
              disabled={saveLoading || !formData.rut || !formData.email}
              style={{ 
                marginTop: '15px', padding: '15px', background: saveSuccess ? '#388e3c' : '#2e7d32', 
                color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer',
                opacity: (saveLoading || !formData.rut || !formData.email) ? 0.6 : 1
              }}
            >
              {saveLoading ? 'Guardando...' : saveSuccess ? '✓ Guardado' : 'Confirmar y Guardar'}
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};

// Estilos de soporte
const cardStyle = { background: '#fff', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' };
const dropzoneStyle = { display: 'block', width: '100%', height: '140px', border: '2px dashed #ccc', borderRadius: '10px', textAlign: 'center', lineHeight: '140px', cursor: 'pointer', overflow: 'hidden', background: '#fafafa', marginBottom: '15px', fontSize: '13px', color: '#666' };
const btnStyle = { width: '100%', padding: '10px', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' };
const inputGroupStyle = { display: 'flex', flexDirection: 'column', flex: 1 };
const labelStyle = { fontSize: '11px', fontWeight: 'bold', color: '#555', marginBottom: '4px', textTransform: 'uppercase' };
const sectionTitleStyle = { fontSize: '13px', fontWeight: 'bold', color: '#1a237e', borderBottom: '1px solid #e0e0e0', paddingBottom: '3px', marginTop: '10px' };
const inputStyle = { padding: '10px', border: '1px solid #ddd', borderRadius: '5px', fontSize: '14px', background: '#fafafa', width: '100%', boxSizing: 'border-box' };

export default CapturaDatos;








