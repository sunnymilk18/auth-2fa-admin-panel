# Etapa 1: compila el panel. VITE_API_URL se fija aquí, al compilar: Vite la
# incrusta en el JavaScript, así que cambiarla exige volver a desplegar.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build
# Los encabezados de seguridad necesitan el origen de la API (la política de contenido
# solo deja conectar a ese origen y al propio panel). Se toma de VITE_API_URL, el mismo
# valor que ya usa el JavaScript, para que no puedan quedar desalineados.
RUN API_ORIGIN="$(node -p "process.env.VITE_API_URL ? new URL(process.env.VITE_API_URL).origin : ''")" \
 && mkdir -p /out \
 && sed "s|__API_ORIGIN__|${API_ORIGIN}|g" security-headers.conf > /out/security-headers.conf

# Etapa 2: solo los archivos estáticos, servidos por nginx.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /out/security-headers.conf /etc/nginx/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
# Si la configuración tiene un error, falla aquí (al construir) y no al arrancar.
RUN nginx -t
EXPOSE 80
