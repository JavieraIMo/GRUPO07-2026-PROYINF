FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY index.js db.js crear_notificaciones_bienvenida.js ./
COPY src ./src
COPY sql ./sql
COPY initdb ./initdb
COPY db ./db

# Instalar nodemon globalmente
RUN npm install -g nodemon

# Instalar wait-port globalmente
RUN npm install -g wait-port

# Comando modificado para desarrollo con auto-reload
CMD ["sh", "-c", "wait-port postgres_db:5432 && npm run dev"]
