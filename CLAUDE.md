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
- Mi cuenta (`/account`, todos los roles) y Actividad (`/activity`, superadmin): una contraseña o un código incorrectos al cambiar la propia cuenta responden 403 (no 401: el panel cerraría la sesión). Rotar el TOTP es en dos pasos (contraseña → QR + código de confirmación) y ambos cambios cierran las demás sesiones. Los códigos de acción del registro de actividad y sus textos en español viven en `src/utils/audit.js`; si el backend agrega un código nuevo, se muestra tal cual hasta que se traduzca ahí. Las fechas del registro vienen en ISO 8601; el actor `token` es el token compartido de scripts.
- Todo campo de contraseña se hace con `<PasswordField label="…" …>` (botón de ojo para mostrarla u ocultarla), nunca con un `<input type="password">` suelto.
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

Pantalla de inicio (`DashboardPage`): un candado (`WelcomeLock`) con la persona (contraseña) y el móvil (TOTP) a los lados, las secciones del rol (`NAV_ITEMS` en `AppShell` trae la descripción de cada una) y, solo si hay IPs baneadas, un aviso a la Lista negra. Al iniciar sesión el candado empieza abierto, cada factor se completa, ambos se acercan y el candado se cierra con destello y partículas; queda cerrado con los dos íconos girando despacio alrededor. La entrada se reproduce solo justo después de iniciar sesión (`AuthContext.login` deja `welcome-intro` en `sessionStorage`) y no con movimiento reducido; el resto de las veces se ve el estado final. Los dígitos son decorativos, no un código real. La marca "Panel de administración" del menú lleva a Inicio.

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
