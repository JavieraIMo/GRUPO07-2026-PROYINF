
DROP TABLE IF EXISTS pagos CASCADE;
DROP TABLE IF EXISTS cuotas CASCADE;
DROP TABLE IF EXISTS desembolsos CASCADE;
DROP TABLE IF EXISTS evaluaciones_riesgo CASCADE;
DROP TABLE IF EXISTS score_riesgo CASCADE;
DROP TABLE IF EXISTS prestamos CASCADE;
DROP TABLE IF EXISTS simulaciones CASCADE;
DROP TABLE IF EXISTS solicitudes CASCADE;
DROP TABLE IF EXISTS dependientes CASCADE;
DROP TABLE IF EXISTS estados CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS monedas CASCADE;

CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    rut VARCHAR(12) UNIQUE NOT NULL,
    nombre_completo VARCHAR(200) NOT NULL,
    fecha_nacimiento DATE,
    email VARCHAR(320) UNIQUE NOT NULL,
    telefono VARCHAR(15),
    region TEXT,
    comuna TEXT,
    direccion TEXT,
    ingresos DECIMAL(12,2),
    historial_crediticio TEXT,
    password_hash TEXT NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'user',
    claveunica_verificada BOOLEAN DEFAULT false,
    fecha_registro TIMESTAMPTZ DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ DEFAULT NOW(),
    activo BOOLEAN DEFAULT true,
    
    -- Validaciones
    CONSTRAINT rut_format CHECK (rut ~ '^[0-9]{1,2}\.[0-9]{3}\.[0-9]{3}-[0-9kK]$'),
    CONSTRAINT email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT ingresos_positive CHECK (ingresos IS NULL OR ingresos >= 0),
    CONSTRAINT rol_valid CHECK (rol IN ('user', 'admin'))
);

CREATE INDEX idx_clientes_rut ON clientes(rut);
CREATE INDEX idx_clientes_email ON clientes(email);
CREATE INDEX idx_clientes_activo ON clientes(activo);

CREATE TABLE estados (
    id SERIAL PRIMARY KEY,
    codigo_estado VARCHAR(50) UNIQUE NOT NULL,
    descripcion VARCHAR(200) NOT NULL,
    activo BOOLEAN DEFAULT true
);

INSERT INTO estados (codigo_estado, descripcion) VALUES
('PENDIENTE', 'Solicitud pendiente de revisión'),
('EN_REVISION', 'Solicitud en proceso de evaluación'),
('APROBADO', 'Solicitud aprobada'),
('RECHAZADO', 'Solicitud rechazada'),
('DESEMBOLSADO', 'Préstamo desembolsado'),
('ACTIVO', 'Préstamo activo'),
('PAGADO', 'Préstamo completamente pagado'),
('VENCIDO', 'Préstamo con pagos vencidos'),
('SIMULADO', 'Estado para simulaciones');

CREATE TABLE monedas (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(3) UNIQUE NOT NULL, -- CLP, USD, EUR
    nombre VARCHAR(50) NOT NULL,
    simbolo VARCHAR(5) NOT NULL,
    valor_cambio DECIMAL(10,4) DEFAULT 1.0000,
    activo BOOLEAN DEFAULT true
);

INSERT INTO monedas (codigo, nombre, simbolo) VALUES
('CLP', 'Peso Chileno', '$'),
('USD', 'Dólar Americano', 'US$'),
('EUR', 'Euro', '€');

CREATE TABLE dependientes (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE CASCADE,
    id_campana VARCHAR(50),
    nombre VARCHAR(200),
    fecha_nacimiento DATE,
    segmento_objetivo VARCHAR(100),
    monto_pre_aprobado DECIMAL(12,2),
    condiciones TEXT,
    fecha_creacion TIMESTAMPTZ DEFAULT NOW(),
    activo BOOLEAN DEFAULT true
);

CREATE INDEX idx_dependientes_cliente ON dependientes(cliente_id);

CREATE TABLE simulaciones (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE SET NULL, -- NULL si anónimo
    session_id UUID, -- Para linking con localStorage
    monto_simulado DECIMAL(12,2) NOT NULL,
    plazo_simulado INTEGER NOT NULL, -- meses
    tasa_aplicada DECIMAL(5,4) NOT NULL,
    cuota_calculada DECIMAL(12,2) NOT NULL,
    total_interes DECIMAL(12,2),
    total_pagar DECIMAL(12,2),
    tipo_prestamo VARCHAR(50) DEFAULT 'PERSONAL',
    moneda_id INTEGER REFERENCES monedas(id) DEFAULT 1,
    datos_adicionales JSONB,
    scoring_detalle JSONB,
    estado_postulacion BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_simulacion TIMESTAMPTZ DEFAULT NOW(),
    origen VARCHAR(50) DEFAULT 'WEB', -- WEB, MOBILE, API
    
    -- Validaciones
    CONSTRAINT monto_positive CHECK (monto_simulado > 0),
    CONSTRAINT plazo_valid CHECK (plazo_simulado BETWEEN 1 AND 360),
    CONSTRAINT tasa_valid CHECK (tasa_aplicada >= 0)
);

CREATE INDEX idx_simulaciones_cliente ON simulaciones(cliente_id);
CREATE INDEX idx_simulaciones_fecha ON simulaciones(fecha_simulacion);
CREATE INDEX idx_simulaciones_session ON simulaciones(session_id);

CREATE TABLE solicitudes (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE CASCADE,
    simulacion_id INTEGER REFERENCES simulaciones(id),
    numero_solicitud VARCHAR(50) UNIQUE NOT NULL,
    monto_solicitado DECIMAL(12,2) NOT NULL,
    plazo_solicitado INTEGER NOT NULL, -- meses
    tipo_prestamo VARCHAR(50) NOT NULL,
    proposito TEXT,
    documentos_adjuntos JSONB,
    canal_origen VARCHAR(50) DEFAULT 'WEB',
    estado_id INTEGER REFERENCES estados(id),
    fecha_solicitud TIMESTAMPTZ DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ DEFAULT NOW(),
    observaciones TEXT,
    
    -- Validaciones
    CONSTRAINT monto_solicitud_positive CHECK (monto_solicitado > 0),
    CONSTRAINT plazo_solicitud_valid CHECK (plazo_solicitado BETWEEN 1 AND 360)
);

CREATE INDEX idx_solicitudes_cliente ON solicitudes(cliente_id);
CREATE INDEX idx_solicitudes_numero ON solicitudes(numero_solicitud);
CREATE INDEX idx_solicitudes_estado ON solicitudes(estado_id);
CREATE INDEX idx_solicitudes_fecha ON solicitudes(fecha_solicitud);

CREATE TABLE score_riesgo (
    id SERIAL PRIMARY KEY,
    valor_minimo INTEGER NOT NULL,
    valor_maximo INTEGER NOT NULL,
    categoria_riesgo VARCHAR(50) NOT NULL,
    descripcion TEXT,
    tasa_sugerida DECIMAL(5,4),
    activo BOOLEAN DEFAULT true,
    
    -- Validaciones
    CONSTRAINT score_range CHECK (valor_minimo <= valor_maximo),
    CONSTRAINT score_values CHECK (valor_minimo >= 0 AND valor_maximo <= 100)
);

INSERT INTO score_riesgo (valor_minimo, valor_maximo, categoria_riesgo, descripcion, tasa_sugerida) VALUES
(0, 30, 'ALTO', 'Riesgo alto - Rechazar o evaluar manualmente', 0.20),
(31, 60, 'MEDIO', 'Riesgo medio - Aprobar con condiciones', 0.15),
(61, 100, 'BAJO', 'Riesgo bajo - Aprobar con mejores condiciones', 0.10);

CREATE TABLE evaluaciones_riesgo (
    id SERIAL PRIMARY KEY,
    solicitud_id INTEGER REFERENCES solicitudes(id) ON DELETE CASCADE,
    score_obtenido INTEGER NOT NULL,
    categoria_riesgo VARCHAR(50) NOT NULL,
    resultado_evaluacion VARCHAR(50) NOT NULL, -- APROBADO/RECHAZADO/REVISION
    tasa_aprobada DECIMAL(5,4),
    monto_aprobado DECIMAL(12,2),
    condiciones_especiales TEXT,
    fuentes_consultadas JSONB, -- APIs externas consultadas
    datos_evaluacion JSONB, -- Features y variables usadas
    fecha_evaluacion TIMESTAMPTZ DEFAULT NOW(),
    evaluado_por VARCHAR(100), -- Sistema automático o usuario
    observaciones TEXT,
    
    -- Validaciones
    CONSTRAINT score_range CHECK (score_obtenido BETWEEN 0 AND 100),
    CONSTRAINT resultado_valid CHECK (resultado_evaluacion IN ('APROBADO', 'RECHAZADO', 'REVISION'))
);

CREATE INDEX idx_evaluaciones_solicitud ON evaluaciones_riesgo(solicitud_id);
CREATE INDEX idx_evaluaciones_score ON evaluaciones_riesgo(score_obtenido);
CREATE INDEX idx_evaluaciones_resultado ON evaluaciones_riesgo(resultado_evaluacion);

CREATE TABLE prestamos (
    id SERIAL PRIMARY KEY,
    solicitud_id INTEGER REFERENCES solicitudes(id) ON DELETE CASCADE,
    evaluacion_id INTEGER REFERENCES evaluaciones_riesgo(id),
    numero_prestamo VARCHAR(50) UNIQUE NOT NULL,
    monto_aprobado DECIMAL(12,2) NOT NULL,
    tasa_interes DECIMAL(5,4) NOT NULL,
    plazo_meses INTEGER NOT NULL,
    cuota_mensual DECIMAL(12,2) NOT NULL,
    total_pagar DECIMAL(12,2) NOT NULL,
    saldo_pendiente DECIMAL(12,2) NOT NULL,
    fecha_aprobacion TIMESTAMPTZ NOT NULL,
    fecha_primer_vencimiento DATE,
    moneda_id INTEGER REFERENCES monedas(id) DEFAULT 1,
    estado_id INTEGER REFERENCES estados(id),
    condiciones_especiales TEXT,
    fecha_actualizacion TIMESTAMPTZ DEFAULT NOW(),
    
    -- Validaciones
    CONSTRAINT prestamo_monto_positive CHECK (monto_aprobado > 0),
    CONSTRAINT prestamo_tasa_valid CHECK (tasa_interes >= 0),
    CONSTRAINT prestamo_plazo_valid CHECK (plazo_meses BETWEEN 1 AND 360)
);

CREATE INDEX idx_prestamos_numero ON prestamos(numero_prestamo);
CREATE INDEX idx_prestamos_solicitud ON prestamos(solicitud_id);
CREATE INDEX idx_prestamos_estado ON prestamos(estado_id);

CREATE TABLE desembolsos (
    id SERIAL PRIMARY KEY,
    prestamo_id INTEGER REFERENCES prestamos(id) ON DELETE CASCADE,
    numero_desembolso VARCHAR(50) UNIQUE NOT NULL,
    fecha_desembolso TIMESTAMPTZ NOT NULL,
    monto_desembolsado DECIMAL(12,2) NOT NULL,
    cuenta_destino VARCHAR(100) NOT NULL,
    banco_destino VARCHAR(100),
    tipo_cuenta VARCHAR(50), -- CORRIENTE, AHORRO
    estado_transferencia VARCHAR(50) NOT NULL,
    referencia_bancaria VARCHAR(100),
    comprobante_url VARCHAR(500),
    fecha_confirmacion TIMESTAMPTZ,
    observaciones TEXT,
    
    -- Validaciones
    CONSTRAINT desembolso_monto_positive CHECK (monto_desembolsado > 0)
);

CREATE INDEX idx_desembolsos_prestamo ON desembolsos(prestamo_id);
CREATE INDEX idx_desembolsos_fecha ON desembolsos(fecha_desembolso);

CREATE TABLE cuotas (
    id SERIAL PRIMARY KEY,
    prestamo_id INTEGER REFERENCES prestamos(id) ON DELETE CASCADE,
    numero_cuota INTEGER NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    monto_cuota DECIMAL(12,2) NOT NULL,
    capital DECIMAL(12,2) NOT NULL,
    interes DECIMAL(12,2) NOT NULL,
    saldo_pendiente DECIMAL(12,2) NOT NULL,
    estado_pago VARCHAR(50) DEFAULT 'PENDIENTE',
    fecha_pago TIMESTAMPTZ,
    monto_pagado DECIMAL(12,2) DEFAULT 0,
    dias_atraso INTEGER DEFAULT 0,
    
    -- Validaciones
    CONSTRAINT cuota_numero_positive CHECK (numero_cuota > 0),
    CONSTRAINT cuota_montos_positive CHECK (monto_cuota > 0 AND capital >= 0 AND interes >= 0),
    CONSTRAINT cuota_estado_valid CHECK (estado_pago IN ('PENDIENTE', 'PAGADA', 'VENCIDA', 'PARCIAL'))
);

CREATE INDEX idx_cuotas_prestamo ON cuotas(prestamo_id);
CREATE INDEX idx_cuotas_vencimiento ON cuotas(fecha_vencimiento);
CREATE INDEX idx_cuotas_estado ON cuotas(estado_pago);

CREATE TABLE pagos (
    id SERIAL PRIMARY KEY,
    cuota_id INTEGER REFERENCES cuotas(id) ON DELETE CASCADE,
    numero_pago VARCHAR(50) UNIQUE NOT NULL,
    fecha_pago TIMESTAMPTZ NOT NULL,
    monto_pagado DECIMAL(12,2) NOT NULL,
    metodo_pago VARCHAR(50) NOT NULL, -- TRANSFERENCIA, EFECTIVO, CHEQUE
    referencia_pago VARCHAR(100),
    comprobante_url VARCHAR(500),
    estado VARCHAR(50) DEFAULT 'CONFIRMADO',
    procesado_por VARCHAR(100),
    observaciones TEXT,
    
    -- Validaciones
    CONSTRAINT pago_monto_positive CHECK (monto_pagado > 0)
);

CREATE INDEX idx_pagos_cuota ON pagos(cuota_id);
CREATE INDEX idx_pagos_fecha ON pagos(fecha_pago);
CREATE INDEX idx_pagos_metodo ON pagos(metodo_pago);

CREATE TABLE notificaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    fecha TIMESTAMPTZ DEFAULT NOW(),
    leida BOOLEAN DEFAULT FALSE,
    tipo VARCHAR(50) DEFAULT 'general'
);

CREATE INDEX idx_notificaciones_usuario ON notificaciones(usuario_id);
CREATE INDEX idx_notificaciones_fecha ON notificaciones(fecha);


CREATE OR REPLACE FUNCTION update_fecha_actualizacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_clientes_fecha_actualizacion
    BEFORE UPDATE ON clientes
    FOR EACH ROW
    EXECUTE FUNCTION update_fecha_actualizacion();

CREATE TRIGGER update_solicitudes_fecha_actualizacion
    BEFORE UPDATE ON solicitudes
    FOR EACH ROW
    EXECUTE FUNCTION update_fecha_actualizacion();

CREATE TRIGGER update_prestamos_fecha_actualizacion
    BEFORE UPDATE ON prestamos
    FOR EACH ROW
    EXECUTE FUNCTION update_fecha_actualizacion();


COMMENT ON TABLE clientes IS 'Tabla principal de usuarios/clientes del sistema';
COMMENT ON TABLE estados IS 'Catálogo de estados para solicitudes, préstamos, etc.';
COMMENT ON TABLE simulaciones IS 'Historial de simulaciones (temporal y persistente)';
COMMENT ON TABLE solicitudes IS 'Solicitudes formales de préstamos';
COMMENT ON TABLE evaluaciones_riesgo IS 'Resultados de evaluación de riesgo crediticio';
COMMENT ON TABLE prestamos IS 'Préstamos aprobados y activos';
COMMENT ON TABLE cuotas IS 'Cronograma de pagos de cada préstamo';
COMMENT ON TABLE pagos IS 'Registro de pagos realizados por clientes';
COMMENT ON TABLE notificaciones IS 'Notificaciones para usuarios del sistema';

COMMENT ON COLUMN clientes.rut IS 'RUT chileno formato: XX.XXX.XXX-X';
COMMENT ON COLUMN clientes.password_hash IS 'Contraseña encriptada con bcrypt';
COMMENT ON COLUMN clientes.rol IS 'Rol del usuario dentro de la aplicación';
COMMENT ON COLUMN simulaciones.session_id IS 'UUID para vincular simulaciones anónimas';
COMMENT ON COLUMN evaluaciones_riesgo.fuentes_consultadas IS 'APIs externas: Registro Civil, DICOM, etc.';


INSERT INTO clientes (rut, nombre_completo, email, telefono, password_hash, rol, activo) VALUES
('11.111.111-1', 'Administrador ALARA', 'admin@alara.cl', '+56911111111', '$2b$10$.GKUTby7AFZDbOuckqloduSF5EiCEpeMxwSjCbit9EQuw5miu7dOa', 'admin', true);


SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'clientes', 'estados', 'monedas', 'dependientes', 
    'simulaciones', 'solicitudes', 'evaluaciones_riesgo', 
    'score_riesgo', 'prestamos', 'desembolsos', 'cuotas', 'pagos', 'notificaciones'
)
ORDER BY tablename;