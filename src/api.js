const API_URL = import.meta.env.VITE_API_URL;

// Si cualquier request devuelve 401 a mitad de uso (la sesión expiró, o un
// superadmin te revocó), AuthContext se entera acá y limpia el estado —
// así ProtectedRoute manda de vuelta a /login sin que cada pantalla tenga
// que manejar ese caso por separado.
let onUnauthorized = null;
export function configureAuth(hooks) {
  onUnauthorized = hooks.onUnauthorized;
}

// Wrapper simple sobre fetch. La sesión viaja en una cookie httpOnly que
// pone el propio backend (POST /admin/auth/login) — credentials:'include'
// es lo que hace que el navegador la mande (y la guarde) en cada
// petición, incluso con el panel y la API en orígenes distintos. El header
// X-Admin-Panel es la mitigación anti-CSRF que exige el backend mientras
// la cookie siga en SameSite=None (ver su propio README) — un sitio
// externo no puede agregar headers personalizados, así que esto no hace
// falta ocultarlo ni variarlo.
// `pin`: el PIN de operador, que el backend exige en las acciones destructivas.
// Viaja en su propio encabezado y se confirma de nuevo en cada acción.
async function request(path, { method = 'GET', body, pin } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Panel': '1',
        ...(pin ? { 'X-Admin-Pin': pin } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.');
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // Respuesta que no es JSON (p. ej. una página de error de un proxy).
  }

  if (res.status === 401 && path !== '/admin/auth/login') onUnauthorized?.();

  if (!res.ok) {
    const error = new Error(data?.error || `Error ${res.status}`);
    error.status = res.status;
    error.data = data;
    error.retryAfterSeconds = Number(res.headers.get('Retry-After')) || null;
    throw error;
  }
  return data;
}

export const api = {
  login: (payload) => request('/admin/auth/login', { method: 'POST', body: payload }),
  logout: () => request('/admin/auth/logout', { method: 'POST' }),
  // { actor, role, has_pin } de la sesión actual — null-safe de llamar sin sesión,
  // el 401 solo se traduce a "no autenticado" en AuthContext.
  me: () => request('/admin/auth/me'),

  // Clients (tenants) — solo superadmin, ver RequireSuperAdmin en el backend.
  listClients: () => request('/admin/clients'),
  createClient: (name) => request('/admin/clients', { method: 'POST', body: { name } }),
  activateClient: (id) => request(`/admin/clients/${encodeURIComponent(id)}/activate`, { method: 'POST' }),
  deactivateClient: (id, pin) => request(`/admin/clients/${encodeURIComponent(id)}/deactivate`, { method: 'POST', pin }),
  rotateClient: (id, pin) => request(`/admin/clients/${encodeURIComponent(id)}/rotate`, { method: 'POST', pin }),

  // Users — admin y superadmin, abarca todos los tenants. Devuelve
  // { users, page, page_size, total }.
  listUsers: ({ page = 1, pageSize = 25, q = '' } = {}) => {
    const params = new URLSearchParams({ page, page_size: pageSize });
    if (q) params.set('q', q);
    return request(`/admin/users/?${params}`);
  },
  banUser: (id, pin) => request(`/admin/users/${encodeURIComponent(id)}/ban`, { method: 'POST', pin }),
  unbanUser: (id) => request(`/admin/users/${encodeURIComponent(id)}/unban`, { method: 'POST' }),
  // { login: { locked, retry_after_seconds }, pin: { ... } }
  getUserLockouts: (id) => request(`/admin/users/${encodeURIComponent(id)}/lockouts`),
  // which: 'login' | 'pin' | 'all'
  clearUserLockouts: (id, which = 'all') =>
    request(`/admin/users/${encodeURIComponent(id)}/clear-lockouts`, { method: 'POST', body: { which } }),
  setUserLoginPinRequired: (id, required) =>
    request(`/admin/users/${encodeURIComponent(id)}/login-pin-required`, { method: 'PUT', body: { required } }),
  // Inicia la corrección del correo: el backend envía un código al correo nuevo y
  // el cambio se aplica cuando la persona lo confirma (no antes).
  changeUserEmail: (id, newEmail, pin) =>
    request(`/admin/users/${encodeURIComponent(id)}/change-email`, { method: 'POST', body: { new_email: newEmail }, pin }),
  disableUserTotp: (id, pin) => request(`/admin/users/${encodeURIComponent(id)}/disable-totp`, { method: 'POST', pin }),
  resetUserPin: (id, pin) => request(`/admin/users/${encodeURIComponent(id)}/reset-pin`, { method: 'POST', pin }),
  revokeUserSessions: (id) => request(`/admin/users/${encodeURIComponent(id)}/revoke-sessions`, { method: 'POST' }),

  // Blacklist — baneos de IP de toda la plataforma. Devuelve
  // { bans: [{ ip, reference?, banned_at, banned_until, level, strikes, api_client_id }] }.
  // La IP va sin codificar: encodeURIComponent convierte los ":" de una IPv6
  // en %3A y el router del backend la entrega sin decodificar.
  listBans: () => request('/admin/blacklist/'),
  unbanIP: (ip) => request(`/admin/blacklist/${ip}`, { method: 'DELETE' }),
  // Lista blanca — solo superadmin. Devuelve { ips: [...] }.
  listAllowlist: () => request('/admin/blacklist/allowlist/'),
  addAllowlist: (ip, pin) => request('/admin/blacklist/allowlist/', { method: 'POST', body: { ip }, pin }),
  removeAllowlist: (ip, pin) => request(`/admin/blacklist/allowlist/${ip}`, { method: 'DELETE', pin }),

  // Accounts — cuentas de operador, solo superadmin. Listar devuelve
  // { accounts: [{ id, email, role, active, created_at }] } (created_at en
  // segundos Unix). Crear devuelve además otpauth_url, que solo se entrega
  // esa vez. Revocar es definitivo: el backend no tiene ruta para reactivar.
  listAccounts: () => request('/admin/accounts/'),
  createAccount: ({ email, password, role }, pin) =>
    request('/admin/accounts/', { method: 'POST', body: { email, password, role }, pin }),
  // Reactiva una cuenta revocada con contraseña y secreto TOTP nuevos (nunca
  // los anteriores). Devuelve { id, email, role, otpauth_url }, igual que al
  // crear; 409 si la cuenta ya estaba activa.
  reactivateAccount: (id, password, pin) =>
    request(`/admin/accounts/${encodeURIComponent(id)}/reactivate`, { method: 'POST', body: { password }, pin }),
  revokeAccount: (id, pin) => request(`/admin/accounts/${encodeURIComponent(id)}/revoke`, { method: 'POST', pin }),
  // Borra el PIN de otra cuenta (no pide PIN): su dueño tiene que crear uno nuevo.
  resetAccountPin: (id) => request(`/admin/accounts/${encodeURIComponent(id)}/pin/reset`, { method: 'POST' }),

  // Cuenta propia (cualquier rol). Una contraseña o un código incorrectos
  // responden 403 y no 401, para que el panel no lo tome por sesión terminada.
  changePassword: (currentPassword, newPassword, pin) =>
    request('/admin/auth/password', {
      method: 'POST',
      body: { current_password: currentPassword, new_password: newPassword },
      pin,
    }),
  // Rotar el TOTP es en dos pasos: el primero devuelve { otpauth_url } sin
  // activar nada; el segundo confirma con un código del secreto nuevo.
  startTotpRotation: (password) => request('/admin/auth/totp/rotate', { method: 'POST', body: { password } }),
  confirmTotpRotation: (code, pin) =>
    request('/admin/auth/totp/rotate/confirm', { method: 'POST', body: { code }, pin }),
  // Crea o cambia el PIN propio. Sin PIN todavía: { password, pin }; con PIN: { current_pin, pin }.
  // Un dato incorrecto responde 403 (no 401).
  setPin: (body) => request('/admin/auth/pin', { method: 'PUT', body }),

  // Registro de actividad (solo superadmin). `from`/`to` van en RFC 3339.
  listAudit: ({ page = 1, pageSize = 25, actor = '', action = '', from = '', to = '' } = {}) => {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (actor) params.set('actor', actor);
    if (action) params.set('action', action);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return request(`/admin/audit/?${params}`);
  },
};
