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
- `.env` local: `VITE_API_URL=http://localhost:8080`.
- Credenciales de prueba: hay un admin de prueba en la base local; sus datos
  están en `CLAUDE.local.md` (ignorado por git, no se sube al repo).

## Estado actual (ver también el historial de commits del repo)

Plan de 7 pasos acordado con el usuario:
1. Scaffold del repo — hecho.
2. Login/logout/sesión — hecho, probado en vivo por el usuario.
3. Página de Clients (listar + crear + activar/desactivar + rotar key) —
   hecha, con diálogo de confirmación propio (no `window.confirm`) y
   notificaciones tipo "toast". El bug de la pantalla negra está resuelto
   (ver abajo) y el usuario confirmó que el flujo completo de
   "Desactivar" y "Rotar key" funciona.
4. Página de Users — **hecha**: listado paginado (25 por página) con
   búsqueda, columna "Tenant" (el backend manda `api_client_name` junto a
   cada usuario; si viene vacío se muestra el UUID abreviado), banear/
   desbanear y un menú "Más acciones" con ver/limpiar bloqueos, corregir
   correo, exigir PIN al iniciar sesión, revocar sesiones, desactivar TOTP
   y resetear PIN.
   "Corregir correo" solo inicia la corrección: el backend envía un código
   al correo nuevo y el cambio se aplica cuando la persona lo confirma (el
   administrador nunca ve el código); se probó el envío real, no la
   confirmación. Pendiente opcional en el backend: que `GET /admin/blacklist`
   también traiga el nombre del tenant (hoy la columna de Blacklist muestra el
   UUID abreviado; el handler no usa Postgres y habría que cablearle el
   repositorio de clients).
5. Página de Blacklist — **hecha**, usando el nuevo `GET /admin/blacklist`
   del backend: baneos activos con "Levantar baneo" (la confirmación avisa
   que la IP vuelve a empezar de cero), levantar el baneo de una IP
   escrita a mano, y lista blanca (listar/agregar/quitar) solo para
   superadmin. Pendiente de ver con datos reales: el Redis del backend es
   remoto (Upstash), así que los baneos de prueba los crea el usuario con
   `seed-test-bans.py` (archivo local, fuera de git); no escribir en ese
   Redis desde aquí. Tampoco se probó la vista de un admin sin rol
   superadmin (no hay cuenta de prueba así).
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
