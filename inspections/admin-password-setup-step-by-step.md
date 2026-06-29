# Paso a paso para configurar la contrasena del admin (sin versionar secretos)

## Donde ejecutar
- Terminal: PowerShell
- Ruta: raiz del proyecto (carpeta donde esta docker-compose.yml)
- Ejemplo de ruta:
  C:\Users\usuario\OneDrive\Escritorio\Alara\GRUPO07-2026-PROYINF

## Objetivo
- Activar el usuario admin en base de datos.
- Configurar su contraseña en runtime.
- Evitar guardar secretos en el repositorio.

## 1) Ir a la raiz del proyecto
    Set-Location "C:\Users\javii\OneDrive\Escritorio\Alara\GRUPO07-2026-PROYINF"

## 2) Levantar o reconstruir contenedores
    docker compose up -d --build

## 3) Definir contraseña temporal en variable de entorno local (no se guarda en git)
    $env:ADMIN_PASSWORD = Read-Host "Ingresa contrasena admin"

## 4) Generar hash bcrypt dentro del contenedor backend
    $HASH = (docker compose exec -T backend node -e "const bcrypt=require('bcrypt'); console.log(bcrypt.hashSync(process.argv[1],10));" "$env:ADMIN_PASSWORD").Trim()

## 5) Actualizar admin en PostgreSQL (hash + activacion)
    docker compose exec -T postgres_db psql -U user -d mydb -c "UPDATE clientes SET password_hash = '$HASH', activo = true, fecha_actualizacion = NOW() WHERE email = 'admin@alara.cl';"

## 6) Verificar que el admin quedo activo
    docker compose exec -T postgres_db psql -U user -d mydb -c "SELECT email, rol, activo FROM clientes WHERE email='admin@alara.cl';"

Resultado esperado:
- email = admin@alara.cl
- rol = admin
- activo = t

## 7) Verificar login por API
    $body = @{ email='admin@alara.cl'; password=$env:ADMIN_PASSWORD } | ConvertTo-Json
    Invoke-RestMethod -Uri 'http://localhost:3100/api/auth/login' -Method Post -ContentType 'application/json' -Body $body

Resultado esperado:
- success = true
- data.user.rol = admin
- token JWT presente

## 8) Limpieza de variable local (recomendado)
    Remove-Item Env:ADMIN_PASSWORD

## Problemas comunes y solución rapida
1. Error de conexion a backend
   - Verifica que backend este arriba:
     docker compose ps

2. Error de conexion a postgres
   - Verifica que postgres_db este arriba:
     docker compose ps

3. Login falla con credenciales invalidas
   - Repite pasos 3, 4 y 5 para regenerar hash con una nueva contrasena.

## Nota de seguridad
- No publicar contrasenas en Wiki, commits, issues ni capturas.
- Usar siempre variable de entorno local o un secret manager.
- Rotar la contraseña temporal despues de validaciones.
