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
};
