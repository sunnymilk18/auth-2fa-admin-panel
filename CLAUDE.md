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
  instrucción explícita del usuario: "úsalo de ahora en adelante".
- Sistema de diseño ya definido en `src/styles.css`: estética oscura
  "operator console" — `#12151B`/`#1B1F27` de fondo, `#4FB8AE` como acento
  de rol admin, `#E8A33D` como acento de rol superadmin (deliberadamente
  distinto de `#E5484D`, reservado para acciones destructivas/peligro),
  IBM Plex Sans + IBM Plex Mono. Mantener esta paleta en páginas nuevas,
  no reinventarla por página.
- `.env` local: `VITE_API_URL=http://localhost:8080`.
- Credenciales de prueba (admin de prueba ya creado en la base local):
  `test-admin@local.test` / `correct-horse-battery`, secreto TOTP
  `CNNKGNZLCMGYBDGTT7C6T3PNSPSF56IN`.

## Estado actual (ver también el historial de commits del repo)

Plan de 7 pasos acordado con el usuario:
1. Scaffold del repo — hecho.
2. Login/logout/sesión — hecho, probado en vivo por el usuario.
3. Página de Clients (listar + crear + activar/desactivar + rotar key) —
   construida, con diálogo de confirmación propio (no `window.confirm`) y
   notificaciones tipo "toast". **Pendiente de confirmar que el bug de
   abajo esté resuelto.**
4. Página de Users — no empezada.
5. Página de Blacklist — no empezada.
6. Página de Accounts (gestión de admins/superadmins) — no empezada.
7. Logout — ya funciona desde el `AppShell`, falta confirmación final.

Todo el trabajo del frontend (login, sistema de diseño, Clients) está
hecho localmente pero **no pusheado** — solo existe el commit inicial del
scaffold en `origin`. Pedir confirmación explícita ("sí"/"súbelo") antes
de cualquier commit/push, igual que se hace en el repo del backend.

## Bug abierto: pantalla negra al desactivar/rotar en ClientsPage

Al hacer clic en "Desactivar" o "Rotar key" (ambos pasan por el diálogo
de confirmación `ConfirmDialog`), el usuario reporta que la pantalla se
pone negra y no aparece ninguna notificación — ni éxito ni error.

Ya se verificó que **no es el backend**: se probaron los tres endpoints
(`/admin/clients/{id}/deactivate`, `/activate`, `/rotate`) directamente
con `curl`, usando la misma cookie de sesión y el header `X-Admin-Panel`
que manda el panel, y los tres responden correctamente (204/200 con el
`api_key` esperado). El problema está solo en el navegador.

Hipótesis más probable, sin confirmar todavía: un error de JS no
capturado durante el render (posiblemente relacionado con que
`ToastProvider` envuelve toda la app y HMR de Vite no siempre re-envuelve
bien un Context Provider nuevo agregado sobre la marcha) que tira abajo
el árbol de React, dejando solo el fondo oscuro de la página — de ahí
"pantalla negra" y ausencia total de notificación. Se le pidió al usuario
un recargado forzado (Ctrl+Shift+R) y no se solucionó, así que puede ser
otra cosa.

**Siguiente paso real para resolverlo**: conseguir el error exacto de la
consola del navegador (F12 → Console) en el momento en que pasa — eso es
lo único que falta para diagnosticarlo con certeza. No asumir que ya está
arreglado sin ese dato.

Archivos relevantes: `src/pages/ClientsPage.jsx`,
`src/components/ToastProvider.jsx`, `src/components/ConfirmDialog.jsx`,
`src/App.jsx` (orden de providers), `src/styles.css` (animación
`row-highlight`, estilos `.toast*`).

## Preferencias de trabajo del usuario

- Antes de cada fase nueva, explicar el plan en pasos simples y esperar
  confirmación antes de construir.
- Probar en vivo en el navegador (no solo confiar en que compile) antes
  de dar algo por terminado.
- Feedback de UX se toma en serio aunque suene menor — "funciona pero hay
  detalles" implica seguir iterando, no cerrar el tema.
- KISS: no añadir abstracciones ni validaciones no pedidas.
