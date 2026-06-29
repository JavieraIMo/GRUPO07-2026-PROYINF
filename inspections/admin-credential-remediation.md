# Remediación de credencial admin expuesta (Sonar Blocker)

## Contexto del issue
Se detecto una vulnerabilidad de tipo secreto expuesto en scripts SQL de inicialización.

Archivos involucrados:
- backend/initdb/create_complete_schema.sql
- backend/sql/create_complete_schema.sql

Regla reportada en SonarCloud:
- secrets:S8215

## Corrección aplicada
1. Se elimino el hash bcrypt hardcodeado del usuario administrador en ambos scripts SQL.
2. Se reemplazó por un placeholder no sensible: SET_ADMIN_PASSWORD_AT_RUNTIME.
3. El usuario admin queda desactivado por defecto en seed (activo=false) hasta configurar credencial segura en runtime

## Proceso operativo ejecutado para habilitar admin sin versionar secretos
1. Reconstruccion de contenedores:
   - docker compose down
   - docker compose up -d --build
2. Generación de hash bcrypt dentro del contenedor backend (sin guardar secreto en repo).
3. Actualización directa en PostgreSQL del password_hash del admin y activacion de cuenta.

## Verificación tecnica realizada
1. Verificación de estado del admin en BD:
   - SELECT email, rol, activo FROM clientes WHERE email='admin@alara.cl';
   - Resultado esperado: activo = true
2. Verificación de autenticacion por API:
   - POST http://localhost:3100/api/auth/login
   - Resultado esperado: success=true, token JWT y rol=admin

## Evidencia de mejora para reinspección
- Se removio el secreto versionado del repositorio.
- El flujo de activación de admin ahora requiere configuración en runtime.
- Se reduce el riesgo de filtracion de credenciales en código fuente.