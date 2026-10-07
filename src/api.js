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
async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Panel': '1',
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
  // { actor, role } de la sesión actual — null-safe de llamar sin sesión,
  // el 401 solo se traduce a "no autenticado" en AuthContext.
  me: () => request('/admin/auth/me'),

  // Clients (tenants) — solo superadmin, ver RequireSuperAdmin en el backend.
  listClients: () => request('/admin/clients'),
  createClient: (name) => request('/admin/clients', { method: 'POST', body: { name } }),
  activateClient: (id) => request(`/admin/clients/${encodeURIComponent(id)}/activate`, { method: 'POST' }),
  deactivateClient: (id) => request(`/admin/clients/${encodeURIComponent(id)}/deactivate`, { method: 'POST' }),
  rotateClient: (id) => request(`/admin/clients/${encodeURIComponent(id)}/rotate`, { method: 'POST' }),

  // Users — admin y superadmin, abarca todos los tenants. Devuelve
  // { users, page, page_size, total }.
  listUsers: ({ page = 1, pageSize = 25, q = '' } = {}) => {
    const params = new URLSearchParams({ page, page_size: pageSize });
    if (q) params.set('q', q);
    return request(`/admin/users/?${params}`);
  },
  banUser: (id) => request(`/admin/users/${encodeURIComponent(id)}/ban`, { method: 'POST' }),
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
  changeUserEmail: (id, newEmail) =>
    request(`/admin/users/${encodeURIComponent(id)}/change-email`, { method: 'POST', body: { new_email: newEmail } }),
  disableUserTotp: (id) => request(`/admin/users/${encodeURIComponent(id)}/disable-totp`, { method: 'POST' }),
  resetUserPin: (id) => request(`/admin/users/${encodeURIComponent(id)}/reset-pin`, { method: 'POST' }),
  revokeUserSessions: (id) => request(`/admin/users/${encodeURIComponent(id)}/revoke-sessions`, { method: 'POST' }),

  // Blacklist — baneos de IP de toda la plataforma. Devuelve
  // { bans: [{ ip, reference?, banned_at, banned_until, level, strikes, api_client_id }] }.
  // La IP va sin codificar: encodeURIComponent convierte los ":" de una IPv6
  // en %3A y el router del backend la entrega sin decodificar.
  listBans: () => request('/admin/blacklist/'),
  unbanIP: (ip) => request(`/admin/blacklist/${ip}`, { method: 'DELETE' }),
  // Lista blanca — solo superadmin. Devuelve { ips: [...] }.
  listAllowlist: () => request('/admin/blacklist/allowlist/'),
  addAllowlist: (ip) => request('/admin/blacklist/allowlist/', { method: 'POST', body: { ip } }),
  removeAllowlist: (ip) => request(`/admin/blacklist/allowlist/${ip}`, { method: 'DELETE' }),

  // Accounts — cuentas de operador, solo superadmin. Listar devuelve
  // { accounts: [{ id, email, role, active, created_at }] } (created_at en
  // segundos Unix). Crear devuelve además otpauth_url, que solo se entrega
  // esa vez. Revocar es definitivo: el backend no tiene ruta para reactivar.
  listAccounts: () => request('/admin/accounts/'),
  createAccount: ({ email, password, role }) =>
    request('/admin/accounts/', { method: 'POST', body: { email, password, role } }),
  // Reactiva una cuenta revocada con contraseña y secreto TOTP nuevos (nunca
  // los anteriores). Devuelve { id, email, role, otpauth_url }, igual que al
  // crear; 409 si la cuenta ya estaba activa.
  reactivateAccount: (id, password) =>
    request(`/admin/accounts/${encodeURIComponent(id)}/reactivate`, { method: 'POST', body: { password } }),
  revokeAccount: (id) => request(`/admin/accounts/${encodeURIComponent(id)}/revoke`, { method: 'POST' }),
};
