# Instrucciones del proyecto

## Idioma

Todo el texto dirigido al usuario — respuestas en el chat, narración de progreso
mientras se trabaja, mensajes de commit, comentarios de código en español,
strings de error/UI, documentación (README, etc.) — debe estar en
**español neutro latinoamericano**, sin marcas regionales de ningún país.

Reglas concretas:
- Conjugación **tú**, nunca voseo. Nunca: vos, tenés, podés, querés, sos,
  decime, fijate, probá, elegí, usá, sacá, generá, dale (como muletilla),
  che, acá (usar "aquí"), en criollo.
- Tampoco jerga chilena ni de ningún otro país: al tiro, cachai, la wea,
  bacán, fome, pololo, etc.
- Nada de inglés mezclado en el texto narrado al usuario (ni siquiera
  palabras sueltas tipo "done", "implementing X") — solo en nombres de
  variables/funciones/identificadores de código, donde el inglés del
  proyecto se mantiene igual.

Antes de dar una respuesta por terminada, revisar el texto buscando
específicamente estas formas — no asumir que "ya se corrigió" porque se
corrigió antes en la misma sesión. Punto donde más ha fallado: frases
cortas y casuales al final de la respuesta ("¿lo subo?", confirmaciones
breves). Antes de enviar, releer específicamente la o las últimas 1-2
oraciones buscando "vos" y verbos terminados en -ás/-és/-ís.

## Qué es este proyecto

Panel de administración web para `auth-2fa-api-go` (repo hermano en
`G:\workspace\proyecto go`), pensado solo para operadores (admin /
superadmin de la propia API), no para los tenants/clientes de la API.
Reemplaza el uso manual de `X-Admin-Token` por curl con una interfaz real,
con cuentas individuales (email + password + TOTP) y dos niveles de
permiso.

El backend ya tiene todo lo necesario implementado y pusheado a
`origin/master` de `proyecto go`: login/logout/me, roles admin/superadmin,
CRUD de clients, blacklist, cuentas de admin. Si hace falta tocar algo del
backend, es en ese otro repo/chat — este repo es solo el frontend.

## Stack y convenciones

- React 18.3.1 + Vite 6 + react-router-dom 7, mismas versiones que
  `empresa-frontend` (`G:\workspace\Pruebas-empresa-app\frontend`) por
  consistencia, pero el diseño visual es deliberadamente distinto — el
  usuario pidió explícitamente que este panel no se parezca al de
  empresa-app.
- Dev server en el puerto **5174** (empresa-frontend usa 5173).
- Para construir UI, usar el plugin `frontend-design` (ya habilitado) —
  instrucción explícita del usuario: "úsalo de ahora en adelante". Invocarlo
  con la herramienta `Skill` en **toda** tarea de interfaz, también en
  ajustes y componentes pequeños, no solo en páginas nuevas; ya se olvidó
  una vez (Users y `ActionMenu`) y el usuario lo notó.
- Sistema de diseño ya definido en `src/styles.css`: estética oscura
  "operator console" — `#12151B`/`#1B1F27` de fondo, `#4FB8AE` como acento
  de rol admin, `#E8A33D` como acento de rol superadmin (deliberadamente
  distinto de `#E5484D`, reservado para acciones destructivas/peligro),
  IBM Plex Sans + IBM Plex Mono. Mantener esta paleta en páginas nuevas,
  no reinventarla por página.
- Las secciones del menú y los títulos de página van en español: Clientes,
  Usuarios, Lista negra, Lista blanca, Cuentas (las rutas y los nombres de
  archivo siguen en inglés: `/clients`, `ClientsPage`…). "Rotar clave", "Nuevo
  cliente", "Correo". Se dejan como están los términos técnicos: **"tenant"
  se queda como "tenant"** (decisión del usuario, no volver a plantearlo),
  TOTP, PIN, QR, API.
- Todo diálogo se construye sobre `Modal` (`src/components/Modal.jsx`), nunca
  con un overlay propio: da Escape, Tab atrapado dentro, foco inicial
  (`data-autofocus` o `autoFocus`), devolución del foco al botón de origen y
  bloqueo del scroll de fondo. En una confirmación destructiva el foco empieza
  en "Cancelar". Para un diálogo con campos, `<Modal as="form" …>`.
- Cabecera y listas: cada sección abre con `<PageHeader>` (título, descripción y el dato clave a la derecha), las listas sin datos usan `<EmptyState>` con ícono y una explicación, y las tablas van dentro de `table-wrap--card`. El pie del menú muestra la API conectada (consulta el endpoint de salud) y el menú queda fijo en pantallas anchas.
- `ErrorBoundary` (en `main.jsx`) muestra "Algo salió mal" en vez de dejar la página en blanco si un componente falla. El favicon es `public/favicon.svg` (el candado, en teal).
- Estadísticas (`/stats`, admin y superadmin): lee `GET /admin/stats?range=7d|30d&tz=<zona IANA>` y dibuja cada bloque solo si el backend lo manda (lo de operadores solo llega a superadmin; los bloques que aún no existen simplemente faltan). Los gráficos son SVG propios (`BarChart`, `RankedBars`), sin librería, por la CSP; llevan resumen y tabla para lectores de pantalla. Los días vienen como `AAAA-MM-DD` ya cortados en la zona del operador (`dayLabel` los arma sin pasar por UTC). Si el endpoint no existe (404) la sección muestra "aún no disponible". Plan en dos tandas, ambas hechas: la primera usa datos que ya existían; la segunda usa la tabla `auth_events` del backend (intentos de inicio de sesión de usuarios finales e historial de baneos de IP) y trae `logins_by_day` (`{day, success, failed}`), `failures_by_tenant`, `top_failing_ips` y `bans_by_day`, visibles para admin y superadmin. Un "fallo" son solo los intentos con credenciales o códigos malos (el backend deja fuera `pin_step_required`, `session_expired` y `email_not_verified`), así que correctos más fallidos no suman todos los intentos: el panel nunca muestra un "total de intentos". Los intentos sin tenant llegan sin id ni nombre y se muestran como "Sin tenant identificado". `BarChart` acepta `okLabel` (cada barra es correctos + fallidos) y `tone="danger"`; `RankedBars` acepta `tone="danger"` e ítems `mono` (y `to`/`linkTitle` para que el nombre sea un enlace).
- Accesos (`/access`, admin y superadmin): detalle fila por fila de los intentos de los usuarios finales (`GET /admin/security/events`, tabla `auth_events`), distinto de Actividad (que es de operadores). Filtros: tenant, evento, resultado, IP, desde y hasta; sin fechas el backend muestra los últimos 7 días y el máximo es de 90 (el panel lo avisa antes de pedirlo; un filtro mal formado el backend lo rechaza con 400 y el panel muestra su mensaje). La IP del campo solo filtra cuando está completa, y pulsar una IP de la tabla filtra por ella. Un admin no puede listar clientes, así que el selector de tenants sale de `users_per_tenant` de `/admin/stats`. Los códigos `kind`/`method`/`result` se traducen en `src/utils/authEvents.js` (uno desconocido se muestra tal cual); el color del punto coincide con lo que Estadísticas cuenta como fallo (rojo), correcto (teal) o ninguno (gris). Un evento sin tenant llega con `tenant: {}`; un baneo no tiene usuario. Estadísticas enlaza aquí desde "Fallos de acceso por tenant" y "IPs con más fallos", con el mismo tramo de días (`?tenant=` o `?ip=` más `&from=AAAA-MM-DD`).
- Mi cuenta (`/account`, todos los roles) y Actividad (`/activity`, superadmin): una contraseña o un código incorrectos al cambiar la propia cuenta responden 403 (no 401: el panel cerraría la sesión). Rotar el TOTP es en dos pasos (contraseña → QR + código de confirmación) y ambos cambios cierran las demás sesiones. Los códigos de acción del registro de actividad y sus textos en español viven en `src/utils/audit.js`; si el backend agrega un código nuevo, se muestra tal cual hasta que se traduzca ahí. Las fechas del registro vienen en ISO 8601; el actor `token` es el token compartido de scripts.
- PIN de operador: seis dígitos que el backend exige (encabezado `X-Admin-Pin`, verificado en cada acción, nunca recordado en la sesión) en las acciones destructivas: banear, desactivar TOTP, resetear PIN y cambiar correo de usuarios; desactivar y rotar clave de clientes; lista blanca (agregar y quitar); crear, revocar y reactivar cuentas; y cambiar la propia contraseña o confirmar la rotación del TOTP. No lo piden desbanear (usuario o IP), revocar sesiones, ver o limpiar bloqueos, crear o activar clientes ni el PIN obligatorio de un usuario (asimetría intencional: lo que quita acceso confirma, lo que lo restaura no). En el panel: `ConfirmDialog` con `needsPin` (el campo va en el mismo cuadro y `onConfirm(pin)` debe volver a lanzar el error de PIN para que el cuadro siga abierto) o un `<PinField>` dentro de los diálogos con formulario, envueltos en `<PinRequired>`: si la cuenta no tiene PIN (`hasPin`, viene de `/admin/auth/me`), primero sale `SetPinDialog` para crearlo. Los textos de error salen de `pinError` (`src/utils/pin.js`). Crear o cambiar el PIN está en Mi cuenta; un superadmin puede restablecer el de otra cuenta desde Cuentas. `Retry-After` no se lee en el navegador mientras el backend no lo exponga por CORS: sin él, el aviso de bloqueo no dice los minutos.
- Todo campo de contraseña se hace con `<PasswordField label="…" …>` (botón de ojo para mostrarla u ocultarla), nunca con un `<input type="password">` suelto.
- Seguridad del servidor (`nginx.conf` + `security-headers.conf`): CSP que solo deja scripts, estilos y fuentes propios, imágenes propias o `data:` (el QR) y conexiones al propio panel y a la API; más HSTS (1 año), `nosniff`, `DENY`, `Referrer-Policy` y `Permissions-Policy`. Consecuencias al programar: nada de `<style>` ni `<script>` incrustados, ni de `style="…"` escrito en HTML (el atributo `style` de React sí vale, porque lo aplica por código), y ningún recurso externo: las fuentes IBM Plex vienen de `@fontsource` y se importan en `main.jsx`. Si el panel debe hablar con otro dominio, hay que agregarlo a `connect-src`. El Dockerfile reemplaza `__API_ORIGIN__` por el origen de `VITE_API_URL` y corre `nginx -t`: una configuración inválida rompe la construcción, no el servidor en marcha. `add_header` en un `location` descarta los del servidor, por eso cada bloque incluye el archivo.
- Carga de la página: `index.html` trae un marcador (candado + "Cargando…") con sus estilos en `public/splash.css` y el fondo del panel (nada de `<style>` ni scripts incrustados en `index.html`: la política de contenido del servidor los bloquea), para que nunca haya pantalla en blanco antes de que cargue el JavaScript; `LoadingScreen` dibuja lo mismo mientras se comprueba la sesión (ajusta los retardos de animación para no reiniciarla). Si cambias el candado o los colores, cámbialos en los dos sitios.
- Una lista que carga muestra `<ListSkeleton />` (filas grises, visibles solo si la espera pasa de ~300 ms), no un "Cargando…" suelto.
- Accesibilidad: el título de cada sección es `<PageTitle>` (`h1`; pone el título de la pestaña y lleva el foco al entrar), nunca un `h2` suelto. La columna de acciones lleva `<th><span className="sr-only">Acciones</span></th>`, los errores `role="alert"` y el menú lateral `aria-label`. Los bordes de controles y campos (`--control-border`, `--field-border`) están medidos a ≥3:1 contra el fondo y el placeholder a ≥4,5:1; no oscurecerlos.
- Tablas en pantallas angostas (≤720 px): la tabla de Usuarios pasa a tarjetas
  con la clase `data-table--cards` y las celdas `cell-email`/`cell-status`/
  `cell-tenant` (ver el bloque "Tabla en tarjetas" de `styles.css`). Si otra
  tabla lo necesita, se reutiliza esa misma clase.
- Todo lo que se pueda pulsar debe verse pulsable sin apuntarlo: borde visible
  (`--control-border`), nunca texto suelto sobre el fondo. Botones secundarios
  = `.btn--ghost` (contorno + fondo tenue), ítems del menú lateral con borde,
  y rojo solo al apuntar lo destructivo (`.btn--quiet-danger`). No volver a
  hacer botones "fantasma" sin borde; el usuario lo marcó como confuso.
- Ningún botón es un relleno sólido: el principal (`.btn--primary`) es un teal
  tenue con borde y texto `--admin-text` (`--admin-tint`, `--admin-border`),
  igual que el destructivo es un rojo tenue. El usuario encontró los rellenos
  sólidos (rojo y teal) demasiado fuertes frente al resto. Los sólidos quedan
  solo para marcas pequeñas (punto de estado, barra del menú activo).
- Lo destructivo usa SIEMPRE la misma familia de rojos de `styles.css`, cada
  tono con su uso: `--danger-text` (texto e íconos), `--danger-soft` (fondo al
  apuntar), `--danger-border` (borde al apuntar), `--danger-tint` (botón de
  confirmar: tenue, nunca un rojo sólido) y `--danger` (marcas: punto de
  estado, aviso). No usar
  `#e5484d` suelto ni inventar otro rojo. Lo reversible (p. ej. revocar
  sesiones) NO va en rojo.
- Un menú o popover que salga de una tabla se dibuja con un portal en `body`
  (ver `ActionMenu`): las celdas `sticky` crean su propio apilamiento y tapan
  cualquier cosa que viva dentro de ellas.
- `.env` local: `VITE_API_URL=http://localhost:8080`.
- Credenciales de prueba: hay un admin de prueba en la base local; sus datos
  están en `CLAUDE.local.md` (ignorado por git, no se sube al repo).

## Estado actual (ver también el historial de commits del repo)

Plan de 7 pasos acordado con el usuario:
1. Scaffold del repo — hecho.
2. Login/logout/sesión — hecho, probado en vivo por el usuario. Si la sesión
   termina a mitad de uso (un 401 con la sesión abierta), el panel vuelve a
   `/login` con el aviso "Tu sesión terminó…" (`sessionExpired` en
   `AuthContext`; no sale en una carga normal sin sesión ni al cerrar sesión
   a mano). Los campos de formulario usan `--field-bg`/`--field-border`.
3. Página de Clientes (listar + crear + activar/desactivar + rotar clave) —
   hecha, con buscador por nombre y páginas de 25 (componente `Pagination`,
   compartido con Usuarios). El backend no pagina ni filtra clientes
   (`GET /admin/clients` devuelve todos), así que la búsqueda y las páginas
   se resuelven en el navegador sobre la lista ya cargada; si algún día hay
   miles de clientes reales, habrá que pedir `page`/`page_size`/`q` al backend
   como en usuarios. Una acción conserva la búsqueda y la página; crear un
   cliente limpia la búsqueda y vuelve a la primera página para que se vea.
   Usa un diálogo de confirmación propio (no `window.confirm`) y
   notificaciones tipo "toast". El bug de la pantalla negra está resuelto
   (ver abajo) y el usuario confirmó que el flujo completo de
   "Desactivar" y "Rotar clave" funciona.
4. Página de Users — **hecha**: listado paginado (25 por página) con
   búsqueda, columna "Tenant" (el backend manda `api_client_name` junto a
   cada usuario; si viene vacío se muestra el UUID abreviado), banear/
   desbanear y un menú "Más acciones" con ver/limpiar bloqueos, corregir
   correo, exigir PIN al iniciar sesión, revocar sesiones, desactivar TOTP
   y resetear PIN.
   "Corregir correo" solo inicia la corrección: el backend envía un código
   al correo nuevo y el cambio se aplica cuando la persona lo confirma (el
   administrador nunca ve el código); se probó el envío real, no la
   confirmación. La columna "Tenant" de Lista negra también muestra el nombre (`api_client_name`, con el UUID abreviado de respaldo). El backend responde 502 claro si falla el envío del correo de "Corregir correo", y 409 si se reactiva una cuenta que ya está activa; el panel muestra el campo `error` tal cual.
5. Página de Blacklist — **hecha**, usando el nuevo `GET /admin/blacklist`
   del backend: baneos activos con "Levantar baneo" (la confirmación avisa
   que la IP vuelve a empezar de cero) y levantar el baneo de una IP
   escrita a mano. La lista blanca NO va dentro de Blacklist: el usuario pidió
   que tuviera su propia opción en el menú, así que es la página **Allowlist**
   (`/allowlist`, solo superadmin): listar/agregar/quitar IPs exentas
   (agregar pide confirmación porque la exención es global). Los baneos de
   prueba los crea el usuario con `seed-test-bans.py` (archivo local, fuera
   de git): el Redis del backend es remoto (Upstash); no escribir en él desde
   aquí. La vista de un admin (sin rol superadmin) se probó con la cuenta de
   prueba `test-operador@local.test` (datos en `CLAUDE.local.md`): el menú
   muestra solo Usuarios y Lista negra, las rutas restringidas redirigen al
   inicio y el backend responde 403 en clientes, lista blanca y cuentas.
6. Página de Accounts (gestión de admins/superadmins) — **hecha** (solo
   superadmin): listar, crear (con QR del TOTP de un solo uso, usando la
   dependencia `qrcode`) y revocar; no deja revocar la cuenta propia.
   También reactiva cuentas revocadas (`POST /admin/accounts/{id}/reactivate`,
   solo superadmin): "Reactivar" pide una contraseña nueva, el backend rota
   el secreto TOTP y se muestra el QR nuevo una sola vez (mismo panel que al
   crear); no devuelve las credenciales anteriores a propósito. Probado
   de punta a punta, incluido el inicio de sesión de la cuenta reactivada.
7. Logout — hecho y probado: la sesión se invalida en el servidor (la misma
   cookie da 401 después), la interfaz vuelve a `/login`, y ninguna ruta
   protegida es accesible sin sesión, tampoco con el botón atrás.

**Los 7 pasos del plan están completos.** No queda nada pendiente del plan.

Pantalla de inicio (`DashboardPage`): un candado (`WelcomeLock`) con la persona (contraseña) y el móvil (TOTP) a los lados, una franja de cifras (`StatStrip`; cada cifra enlaza a su sección: usuarios, IPs baneadas y, para superadmin, clientes activos, operadores activos, acciones de hoy contra ayer y fallos de acceso de hoy contra ayer, sumando inicios de sesión y PIN fallidos) y, solo si los fallos de hoy son al menos 5 y al menos el triple que ayer, un aviso que lleva a Actividad ya filtrada (`?action=…&from=AAAA-MM-DD`). Las cifras se cargan una por una con consultas de una fila; un `GET /admin/stats` del backend las reemplazaría. No hay lista de secciones: ya está el menú. Al iniciar sesión el candado empieza abierto, cada factor se completa, ambos se acercan y el candado se cierra con destello y partículas; queda cerrado con los dos íconos girando despacio alrededor. La entrada se reproduce solo justo después de iniciar sesión (`AuthContext.login` deja `welcome-intro` en `sessionStorage`) y no con movimiento reducido; el resto de las veces se ve el estado final. Los dígitos son decorativos, no un código real. La marca "Panel de administración" del menú lleva a Inicio.

Todo lo anterior está pusheado a `origin/master`. Pedir confirmación
explícita ("sí"/"súbelo") antes de cualquier commit/push, igual que se
hace en el repo del backend.

Las credenciales del primer admin de prueba (`test-admin@local.test`) están en
el historial del repo (commit `67dede4`), pero esa cuenta ya fue revocada y
sus credenciales no sirven. La cuenta de prueba vigente es
`test-superadmin@local.test`, creada desde la página Accounts; sus datos
están en `CLAUDE.local.md`. No hace falta limpiar el historial. No volver a
plantearlo.

## Bug resuelto: pantalla negra al desactivar/rotar en ClientsPage

Causa real (no era el backend ni `ToastProvider`): `.shell-content`
usaba `animation: rise-in ... both`. El `both` deja aplicado el
`transform` final, y un `transform` convierte al elemento en el bloque
contenedor de sus descendientes `position: fixed`; el overlay del
`ConfirmDialog` pasó a medir todo el `main` (decenas de miles de píxeles)
y el diálogo quedó fuera de pantalla, dejando solo el oscurecimiento.
Solución: `backwards` en lugar de `both`. Regla general: no dejar
`transform`, `filter` ni `will-change` permanentes en un ancestro de algo
`fixed`.

## Preferencias de trabajo del usuario

- Antes de cada fase nueva, explicar el plan en pasos simples y esperar
  confirmación antes de construir.
- Probar en vivo en el navegador (no solo confiar en que compile) antes
  de dar algo por terminado.
- Feedback de UX se toma en serio aunque suene menor — "funciona pero hay
  detalles" implica seguir iterando, no cerrar el tema.
- KISS: no añadir abstracciones ni validaciones no pedidas.
