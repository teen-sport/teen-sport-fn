# Etapa 1: compila la aplicación Angular.
# El CLI de Angular 22 exige Node ^22.22.3 o ^24.15.0; la imagen "24" siempre trae una versión reciente.
FROM node:24-alpine AS build
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NG_CLI_ANALYTICS=false

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Etapa 2: sirve los archivos compilados con Caddy.
# Caddy devuelve index.html para las rutas internas (ver Caddyfile) y usa el puerto que da Railway.
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist/teen-sport-fn/browser /srv
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
