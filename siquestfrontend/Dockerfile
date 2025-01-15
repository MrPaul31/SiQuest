# Fase 1: Build
FROM node:16-alpine AS build

# Imposta la directory di lavoro
WORKDIR /app

# Copia i file di configurazione dei pacchetti
COPY package*.json ./

# Installa le dipendenze
RUN npm install

# Copia il resto del codice sorgente
COPY . .

# Build the application
RUN npm run build

# Fase 2: Serve
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]