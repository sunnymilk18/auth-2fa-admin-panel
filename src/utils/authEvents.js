// Textos en español de los códigos de los eventos de acceso de usuarios (`kind`, `method`
// y `result` de GET /admin/security/events). Los códigos los define el backend; si llega
// uno que no está aquí, se muestra tal cual en vez de esconderlo.

export const KIND_LABELS = {
  login: 'Inicio de sesión',
  register: 'Registro',
  password_reset_request: 'Recuperación de contraseña: solicitud',
  password_reset_confirm: 'Recuperación de contraseña: cambio',
  ip_ban: 'Baneo de IP',
  ip_unban: 'Baneo de IP levantado',
};

const METHOD_LABELS = {
  password: 'con contraseña',
  totp: 'con el código de la app',
  email_code: 'con un código por correo',
  push: 'con aprobación en el móvil',
  device_pin: 'con el PIN',
  device_trusted: 'desde un dispositivo de confianza',
};

// Cómo se dice y de qué color es el punto de cada resultado: `ok` (correcto), `bad`
// (credenciales o códigos malos, bloqueos) o `off` (ni éxito ni ataque: una sesión vencida,
// un paso pendiente). Coincide con lo que Estadísticas cuenta como fallo.
const RESULTS = {
  success: { label: 'Correcto', tone: 'ok' },
  bad_credentials: { label: 'Credenciales incorrectas', tone: 'bad' },
  bad_totp: { label: 'Código de la app incorrecto', tone: 'bad' },
  invalid_code: { label: 'Código incorrecto', tone: 'bad' },
  bad_pin: { label: 'PIN incorrecto', tone: 'bad' },
  bad_device_token: { label: 'Dispositivo no reconocido', tone: 'bad' },
  too_many_attempts: { label: 'Demasiados intentos', tone: 'bad' },
  too_many_tries: { label: 'Demasiados intentos', tone: 'bad' },
  locked_out: { label: 'Bloqueado por intentos', tone: 'bad' },
  account_banned: { label: 'Cuenta baneada', tone: 'bad' },
  rate_limited: { label: 'Límite de peticiones', tone: 'bad' },
  ip_banned: { label: 'IP baneada', tone: 'bad' },
  banned: { label: 'IP baneada', tone: 'bad' },
  unbanned: { label: 'Baneo levantado', tone: 'ok' },
  code_sent: { label: 'Código enviado', tone: 'ok' },
  email_not_verified: { label: 'Correo sin verificar', tone: 'off' },
  session_expired: { label: 'Sesión vencida', tone: 'off' },
  pin_step_required: { label: 'Falta el PIN adicional', tone: 'off' },
  account_not_found: { label: 'La cuenta no existe', tone: 'off' },
  not_found: { label: 'Sin solicitud pendiente', tone: 'off' },
  email_taken: { label: 'Correo ya registrado', tone: 'off' },
  rut_taken: { label: 'RUT ya registrado', tone: 'off' },
  username_taken: { label: 'Usuario ya existe', tone: 'off' },
  invalid_input: { label: 'Datos no válidos', tone: 'off' },
  error: { label: 'Error del servidor', tone: 'off' },
};

// Un mismo código dice otra cosa según el evento: un registro "correcto" es una cuenta creada.
const SUCCESS_BY_KIND = {
  register: 'Cuenta creada',
  password_reset_confirm: 'Contraseña cambiada',
};

export function resultInfo(kind, result) {
  if (result === 'success' && SUCCESS_BY_KIND[kind]) return { label: SUCCESS_BY_KIND[kind], tone: 'ok' };
  return RESULTS[result] || { label: result, tone: 'off' };
}

// La frase del evento: "Inicio de sesión con contraseña", "Baneo levantado por ana@…".
export function eventLabel(ev) {
  if (ev.kind === 'login') {
    const method = ev.method ? METHOD_LABELS[ev.method] || ev.method : '';
    return method ? `Inicio de sesión ${method}` : 'Inicio de sesión';
  }
  if (ev.kind === 'ip_ban') return ev.ban_origin === 'automatic' || !ev.ban_origin ? 'Baneo automático de IP' : 'Baneo de IP';
  if (ev.kind === 'ip_unban') {
    if (ev.ban_origin === 'operator') return `Baneo levantado por ${ev.actor_email || 'un operador'}`;
    if (ev.ban_origin === 'tenant') return 'Baneo levantado por el sistema del tenant';
    return 'Baneo de IP levantado';
  }
  return KIND_LABELS[ev.kind] || ev.kind;
}

// Opciones del filtro "Resultado": los fallos juntos, para encontrarlos rápido.
export const RESULT_GROUPS = [
  { label: 'Correctos', results: ['success', 'code_sent', 'unbanned'] },
  {
    label: 'Fallos',
    results: ['bad_credentials', 'bad_totp', 'invalid_code', 'bad_pin', 'bad_device_token', 'too_many_attempts', 'locked_out', 'account_banned'],
  },
  { label: 'Otros', results: ['email_not_verified', 'session_expired', 'pin_step_required', 'banned', 'account_not_found'] },
];
