CREATE DATABASE prestamosdb;
\c prestamos_db;

CREATE TYPE tipo_prestamo_enum AS ENUM ('personal','auto','hipotecario','empresarial','otro');
CREATE TYPE estado_solicitud_enum AS ENUM ('pendiente','aprobada','rechazada','cancelada');
CREATE TYPE estado_prestamo_enum AS ENUM ('vigente','finalizado','mora','cancelado');
CREATE TYPE estado_documento_enum AS ENUM ('sin_firmar','firmado','rechazado');
CREATE TYPE metodo_pago_enum AS ENUM ('transferencia','debito_automatico','tarjeta','otro');
CREATE TYPE moneda_enum AS ENUM ('CLP','USD','EUR');

-- CLIENTES - USUARIOS DEL SISTEMA DE PRESTAMOS
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    rut VARCHAR(12) UNIQUE NOT NULL,
    password_hash text NOT NULL,
    telefono VARCHAR(9) UNIQUE NOT NULL,
    direccion TEXT,
    fecha_de_naciminento DATE,
    ingresos_mensuales NUMERIC(12,2),
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT now(),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT now()
);
-- indices para optimizar busquedas frecuentes en clientes

CREATE INDEX idx_clientes_rut ON clientes(rut);
CREATE INDEX idx_clientes_email ON clientes(email);

-- SIMULACIONES DE PRESTAMOS REALIZADAS POR LOS USUARIOS (AVANZADA) O POSIBLES CLIENTES (BÁSICA)
CREATE TABLE simulaciones (
    id_simulacion SERIAL PRIMARY KEY,
    id_cliente INT REFERENCES clientes(id) ON DELETE SET NULL
    monto NUMERIC(12,2) NOT NULL,
    plazo_meses INT NOT NULL CHECK (plazo_meses IN (6, 12, 24, 36, 48, 60)),
    tipo_prestamo tipo_prestamo_enum NOT NULL DEFAULT 'personal',
    tasa_interes NUMERIC(5,2) NOT NULL,
    total_intereses NUMERIC(12,2),
    total_a_pagar NUMERIC(12,2),
    cuota_mensual NUMERIC(12,2) NOT NULL,
    moneda moneda_enum NOT NULL DEFAULT 'CLP',
    datos_extra JSONB,
    scoring_detalle JSONB,
    fecha_simulacion TIMESTAMP WITH TIME ZONE DEFAULT now()
);
-- indices para optimizar busquedas frecuentes en simulaciones

CREATE INDEX idx_simulaciones_cliente ON simulaciones(id_cliente);
CREATE INDEX idx_simulaciones_fecha ON simulaciones(fecha_simulacion DESC);

-- SOLICITUDES DE PRESTAMOS REALIZADAS POR LOS USUARIOS
CREATE TABLE solicitudes (
    id_solicitud SERIAL PRIMARY KEY,
    id_cliente INT REFERENCES clientes(id) ON DELETE SET NULL,
    id_simulacion INT REFERENCES simulaciones(id_simulacion) ON DELETE SET NULL,
    monto NUMERIC(12,2) NOT NULL,
    plazo_meses INT NOT NULL,
    estado estado_solicitud_enum NOT NULL DEFAULT 'pendiente',
    documentos JSONB,
    fecha_solicitud TIMESTAMP WITH TIME ZONE DEFAULT now(),
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT now()
);
-- indices para optimizar busquedas frecuentes en solicitudes
CREATE INDEX idx_solicitudes_cliente ON solicitudes(id_cliente);
CREATE INDEX idx_solicitudes_estado ON solicitudes(estado);
CREATE INDEX idx_solicitudes_fecha ON solicitudes(fecha_solicitud DESC);

-- PRESTAMOS APROBADOS Y OTORGADOS A LOS CLIENTES (DE SOLICITUD A PRESTAMO)
CREATE TABLE prestamos (
    id_prestamo SERIAL PRIMARY KEY,
    id_solicitud INT REFERENCES solicitudes(id_solicitud) ON DELETE SET NULL,
    id_cliente INT REFERENCES clientes(id) ON DELETE SET NULL,
    numero_prestamo VARCHAR(50) UNIQUE NOT NULL,
    monto_aprobado NUMERIC(12,2) NOT NULL,
    plazo_meses INT NOT NULL,
    tasa_interes NUMERIC(5,2) NOT NULL,
    cuota_mensual NUMERIC(12,2) NOT NULL,
    estado estado_prestamo_enum NOT NULL DEFAULT 'vigente',
    saldo_pendiente NUMERIC(12,2) NOT NULL,
    fecha_otorgamiento TIMESTAMP WITH TIME ZONE DEFAULT now(),
    fecha_vencimiento DATE NOT NULL,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT now()
);
-- indices para optimizar busquedas frecuentes en prestamos
CREATE INDEX idx_prestamos_cliente ON prestamos(id_cliente);

-- CUOTAS DE LOS PRESTAMOS OTORGADOS
CREATE TABLE cuotas (
    id_cuota SERIAL PRIMARY KEY,
    id_prestamo INT REFERENCES prestamos(id_prestamo) ON DELETE CASCADE,
    numero_cuota INT NOT NULL,
    monto_cuota NUMERIC(12,2) NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    capital NUMERIC(12,2) NOT NULL,
    interes NUMERIC(12,2) NOT NULL,
    estado_pago VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    fecha_prestamo TIMESTAMP WITH TIME ZONE DEFAULT now(), 
    UNIQUE (id_prestamo, numero_cuota)
);
-- indices para optimizar busquedas frecuentes en cuotas
CREATE INDEX idx_cuotas_prestamo ON cuotas(id_prestamo);

-- PAGOS REALIZADOS POR LOS CLIENTES PARA SUS PRESTAMOS
CREATE TABLE pagos (
    id_pago SERIAL PRIMARY KEY,
    id_cuota INT REFERENCES cuotas(id_cuota) ON DELETE SET NULL,
    id_prestamo INT REFERENCES prestamos(id_prestamo) ON DELETE SET NULL,
    fecha_pago TIMESTAMP WITH TIME ZONE DEFAULT now(),
    monto_pagado NUMERIC(12,2) NOT NULL,
    metodo_pago metodo_pago_enum NOT NULL DEFAULT 'transferencia',
    comprobante JSONB, 
    estado_pago VARCHAR(20) NOT NULL DEFAULT 'procesando',
    comision_pago NUMERIC(12,2) DEFAULT 0.00
);
-- indices para optimizar busquedas frecuentes en pagos
CREATE INDEX idx_pagos_prestamo ON pagos(id_prestamo);

-- DOCUMENTOS ASOCIADOS A LAS SOLICITUDES Y PRESTAMOS
CREATE TABLE contratos (
    id_contrato SERIAL PRIMARY KEY,
    id_prestamo INT REFERENCES prestamos(id_prestamo) ON DELETE CASCADE,
    numero_contrato VARCHAR(50) UNIQUE NOT NULL,
    estado_firma estado_documento_enum NOT NULL DEFAULT 'sin_firmar',
    hash_documento TEXT,
    fecha_firma TIMESTAMP WITH TIME ZONE,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE pagares (
    id_pagare SERIAL PRIMARY KEY,
    id_prestamo INT REFERENCES prestamos(id_prestamo) ON DELETE CASCADE,
    numero_pagare VARCHAR(50) UNIQUE NOT NULL,
    estado_firma estado_documento_enum NOT NULL DEFAULT 'sin_firmar',
    hash_documento TEXT,
    fecha_firma TIMESTAMP WITH TIME ZONE,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT now()
);

--EVALUACION DE RIESGO CREDITICIO DE LOS CLIENTES (solo para solicitudes)
CREATE TABLE evaluaciones_riesgo (
    id_evaluacion SERIAL PRIMARY KEY,
    id_solicitud INT REFERENCES solicitudes(id_solicitud) ON DELETE SET NULL,
    id_cliente INT REFERENCES clientes(id) ON DELETE SET NULL,
    score_crediticio INT NOT NULL CHECK (score_crediticio BETWEEN 0 AND 100),
    resultado_evaluacion TEXT,
    detalles JSONB,
    observaciones TEXT,
    fecha_evaluacion TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE score_riesgo (
    id_score SERIAL PRIMARY KEY,
    id_evaluacion INT REFERENCES evaluaciones_riesgo(id_evaluacion) ON DELETE CASCADE,
    valor_score INT NOT NULL CHECK (valor_score BETWEEN 0 AND 100),
    categoria TEXT NOT NULL
);

--TASA DE INTERES BASE SEGUN TIPO DE PRESTAMO
CREATE TABLE tasas_interes (
    id_tasa SERIAL PRIMARY KEY,
    tipo_tasa VARCHAR(50),
    tipo_prestamo tipo_prestamo_enum UNIQUE NOT NULL,
    porcentaje_tasa NUMERIC(5,2) NOT NULL,
    vigente BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT now()
);

--MONEDAS Y TIPOS DE CAMBIO
CREATE TABLE moneda (
    id_moneda SERIAL PRIMARY KEY,
    codigo_moneda moneda_enum NOT NULL,
    descripcion_moneda VARCHAR(50) NOT NULL
);

INSERT INTO moneda (codigo_moneda, descripcion_moneda)
VALUES ('CLP','Peso Chileno'), ('USD','Dólar US'), ('EUR','Euro')
ON CONFLICT DO NOTHING;

--TRIGGER PARA ACTUALIZAR EN TABLA CLIENTES
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clientes_set_updated_at
BEFORE UPDATE ON clientes
FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

