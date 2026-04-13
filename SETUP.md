# 🚀 Guía de Instalación y Montaje - Sistema Alara

Esta guía te permite configurar el sistema ALARA desde cero en tu máquina local.

## 📋 Prerrequisitos

Antes de comenzar, asegúrate de tener instalado:

1. **Git**
   - Descargar: https://git-scm.com/downloads  
   - Verificar: `git --version`

2. **Docker Desktop**
   - Descargar: https://www.docker.com/products/docker-desktop/
   - **IMPORTANTE:** Debe incluir Docker Compose
   - Verificar: `docker --version` y `docker-compose --version`

3. **Puertos disponibles**:
   - `3100` - Backend API
   - `3101` - Frontend React  
   - `5433` - PostgreSQL
   - `5051` - pgAdmin

## ⚡ Instalación Rápida

```bash
# 1. Clonar el proyecto
git clone https://github.com/JavieraIMo/GRUPO17-2025-PROYINF.git
cd GRUPO17-2025-PROYINF

# 2. Iniciar servicios
./start-complete.bat  # Windows
# o
docker-compose up --build  # Multiplataforma
```

## 🌐 Acceso a Servicios

Una vez iniciado, podrás acceder a:

|    Servicio     |          URL          |        Credenciales       |
|-----------------|-----------------------|---------------------------|
| **Frontend**    | http://localhost:3101 | ------------------------- |
| **Backend API** | http://localhost:3100 | ------------------------- |
| **pgAdmin**     | http://localhost:5051 | admin@alara.cl / admin123 |
| **Login ALARA** | http://localhost:3101 | admin@alara.cl / admin123 |

## 🔐 Login Administrador ALARA

Al iniciar una base nueva, ALARA crea un usuario administrador por defecto para entrar a la aplicación:

- **URL:** http://localhost:3101
- **Correo:** `admin@alara.cl`
- **Contraseña:** `admin123`
- **Rol:** `admin`

Pasos para ingresar:

1. Abre http://localhost:3101
2. Entra a la pantalla de login de ALARA
3. Ingresa `admin@alara.cl` y `admin123`

> Si tu base de datos fue creada antes de este cambio, este usuario puede no existir todavía.
> En ese caso, reconstruye los contenedores con la base limpia o aplica la migración correspondiente.

## 🗄️ Configuración de Base de Datos

### Conectar pgAdmin a PostgreSQL

1. Ir a http://localhost:5051
2. Login con: `admin@alara.cl` / `admin123`
3. Crear servidor:
   - **General Tab:** Name = `ALARA Database`
   - **Connection Tab:**
     - Host: `postgres_db`
     - Port: `5432`
     - Database: `mydb`
     - Username: `user`
     - Password: `password`

> `admin@alara.cl / admin123` se usa tanto para entrar a pgAdmin como para el usuario administrador seed de la aplicación.
> La aplicación ahora crea un usuario administrador por defecto con rol `admin`.

### Esquema Base
```sql
-- Ejecutar en pgAdmin Query Tool
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    rut VARCHAR(12) UNIQUE NOT NULL,
    nombre_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE
);
```

## 🛠️ Comandos de Desarrollo

### Docker
```bash
# Iniciar servicios
docker-compose up --build

# Ver logs
docker-compose logs app      # Backend
docker-compose logs frontend # Frontend

# Reiniciar servicios
docker-compose restart

# Detener todo
docker-compose down

# Limpiar y reconstruir
docker-compose down && docker-compose up --build
```

### Base de Datos
```bash
# Conectar a PostgreSQL
docker exec -it postgres_container psql -U user -d mydb

# Limpiar tabla de usuarios
docker exec -it postgres_container psql -U user -d mydb -c "DELETE FROM clientes;"

# Resetear secuencia de IDs
docker exec -it postgres_container psql -U user -d mydb -c "ALTER SEQUENCE clientes_id_seq RESTART WITH 1;"
```

## 🔧 Solución de Problemas

### Puerto ya en uso
```bash
# Verificar proceso usando puerto
netstat -ano | findstr :3100

# Terminar proceso (Windows)
taskkill /PID [PID_NUMBER] /F
```

### Contenedor no inicia
```bash
# Ver logs detallados
docker-compose logs [service_name]

# Reconstruir contenedor específico
docker-compose up --build [service_name]
```

### Error de conexión a BD
1. Verificar PostgreSQL corriendo: `docker ps`
2. Ver logs: `docker logs [postgres_container_name]`
3. Reiniciar servicios: `docker-compose restart`

### Conflictos de Puerto
Si necesitas cambiar puertos, edita `docker-compose.yml`:

```yaml
# Ejemplo: cambiar frontend de 3101 a 3200
frontend:
  ports:
    - "3200:3000"  # Puerto externo:interno
```

## ✅ Verificación de Instalación

Después de la instalación, verifica que todo funciona:

- [ ] Docker Desktop ejecutándose
- [ ] `docker ps` muestra todos los contenedores activos
- [ ] Frontend accesible en http://localhost:3101
- [ ] Backend responde en http://localhost:3100
- [ ] pgAdmin accesible en http://localhost:5051
- [ ] Base de datos conectada correctamente
- [ ] Registro de usuario funcional
- [ ] Login de usuario funcional con `admin@alara.cl` / `admin123`

## 🔄 Actualización del Sistema

```bash
# Obtener últimos cambios
git pull origin main

# Reconstruir con cambios
docker-compose down && docker-compose up --build
```

---

*Para información del proyecto, consulta el [README.md](README.md)*