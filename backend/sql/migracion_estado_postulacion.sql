ALTER TABLE simulaciones
ADD COLUMN IF NOT EXISTS estado_postulacion BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE simulaciones
SET estado_postulacion = FALSE
WHERE estado_postulacion IS NULL;