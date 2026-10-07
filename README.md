# Panel de administración de auth-2fa-api

Interfaz web para los operadores de `auth-2fa-api-go`. Reemplaza el uso manual
de `X-Admin-Token` por `curl`: cada persona tiene su propia cuenta (correo,
contraseña y código TOTP) y uno de dos roles, `admin` o `superadmin`.

Es solo para operadores de la API, no para los clientes (tenants) que la usan.
Este repositorio es únicamente el frontend; el backend vive en su propio repo.

## Qué incluye

| Sección | Ruta | Quién la ve | Para qué sirve |
| --- | --- | --- | --- |
| Inicio | `/` | admin y superadmin | Bienvenida y accesos a las secciones del rol. |
| Clientes | `/clients` | superadmin | Crear clientes, activarlos o desactivarlos y rotar sus claves. |
| Usuarios | `/users` | admin y superadmin | Banear o desbanear, ver y limpiar bloqueos, corregir el correo, exigir PIN, revocar sesiones, desactivar el TOTP y resetear el PIN. |
| Lista negra | `/blacklist` | admin y superadmin | Ver las IPs baneadas y levantar un baneo. |
| Lista blanca | `/allowlist` | superadmin | IPs exentas de sanciones en toda la plataforma. |
| Cuentas | `/accounts` | superadmin | Crear, reactivar y revocar cuentas de operadores. |

Los permisos los aplica el backend (responde 403 si el rol no alcanza); el
panel solo oculta lo que no corresponde.

## Requisitos

- Node 20 o superior.
- Una instancia de `auth-2fa-api-go` accesible desde el navegador.

## Correr en local

```bash
npm install
cp .env.example .env   # y ajusta VITE_API_URL
npm run dev
```

El servidor de desarrollo queda en <http://localhost:5174>.

| Variable | Qué es |
| --- | --- |
| `VITE_API_URL` | URL base de la API, por ejemplo `http://localhost:8080`. |

`VITE_API_URL` la lee Vite **al compilar** y queda escrita dentro del
JavaScript; no se puede cambiar sin volver a construir.

## Cómo se autentica

El inicio de sesión (`POST /admin/auth/login`) deja una cookie `httpOnly` que el
JavaScript del panel nunca ve. Cada petición va con `credentials: 'include'` y
con el encabezado `X-Admin-Panel: 1`, que el backend exige como protección
contra CSRF. Si la sesión termina a mitad de uso, el panel vuelve al login con
un aviso.

## Desplegar en Dokploy

El repositorio trae un `Dockerfile` (compila con Node y sirve `dist/` con nginx)
y un `nginx.conf` que devuelve `index.html` para cualquier ruta, para que
recargar `/users` no dé 404.

1. En Dokploy, crea una **Application** (no Compose) conectada a este repo, con
   build tipo **Dockerfile**.
2. En **Environment**, agrega `VITE_API_URL` como **Build Argument**, no como
   variable normal: se necesita durante la compilación.
3. En **Domains**, agrega un dominio con puerto **80** y HTTPS.
4. Despliega. Cada cambio nuevo en `master` necesita un nuevo despliegue, salvo
   que actives el despliegue automático del servicio.

### Configuración que también hace falta en la API

Sin esto el panel carga, pero el inicio de sesión falla:

| Variable de la API | Valor |
| --- | --- |
| `ADMIN_PANEL_ORIGIN` | El origen exacto del panel, con `https://` y sin barra final. |
| `ADMIN_SESSION_CROSS_SITE` | `true` si el panel y la API están en dominios distintos (por ejemplo, dos direcciones `sslip.io`). `false` si cuelgan del mismo dominio (`panel.ejemplo.cl` y `api.ejemplo.cl`): la cookie queda más estricta. |

Para comprobarlo, una petición `OPTIONS` a `/admin/auth/login` con el
encabezado `Origin` del panel debe responder con `Access-Control-Allow-Origin`
igual a ese origen y `Access-Control-Allow-Credentials: true`.

### Primera cuenta

Una base de datos nueva no tiene operadores. La primera cuenta de superadmin se
crea con el procedimiento del backend (ver su documentación); desde ahí, el
resto se gestiona en la sección Cuentas.

## Estructura

```
src/
  api.js          cliente de la API (todas las llamadas pasan por aquí)
  auth/           sesión (AuthContext) y rutas protegidas por rol
  components/     piezas compartidas: Modal, ActionMenu, Pagination, toasts…
  pages/          una página por sección
  styles.css      sistema de diseño (tokens al inicio del archivo)
  utils/
```

## Convenciones

- Todo el texto de la interfaz va en español neutro, con "tú". Los nombres de
  archivos, rutas y código se mantienen en inglés. "Tenant", TOTP, PIN, QR y API
  se dejan tal cual.
- Todo diálogo se construye sobre `Modal`: cierra con Escape, mantiene el foco
  dentro, lo devuelve al botón de origen y bloquea el scroll del fondo.
- Los botones no son rellenos sólidos: el principal es un teal tenue con borde,
  y lo destructivo usa siempre la familia de rojos definida en `styles.css`.
- Cada sección pone su título con `PageTitle`, que además fija el título de la
  pestaña y lleva el foco al cambiar de ruta.
- Respeta `prefers-reduced-motion`: sin movimiento, la bienvenida se ve en su
  estado final.

Más detalle de decisiones de diseño y de pruebas en `CLAUDE.md`.
