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

# Etapa 2: solo los archivos estáticos, servidos por nginx.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
