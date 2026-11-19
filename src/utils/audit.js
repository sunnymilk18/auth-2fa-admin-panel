// Textos en español de los códigos del registro de actividad (`action` y
// `target_type`). Los códigos los define el backend; si llega uno que no está
// aquí, se muestra tal cual en vez de esconderlo.
export const ACTION_GROUPS = [
  {
    label: 'Usuarios',
    actions: {
      'user.ban': 'Baneó a un usuario',
      'user.unban': 'Desbaneó a un usuario',
      'user.totp_disable': 'Desactivó el TOTP de un usuario',
      'user.pin_reset': 'Reseteó el PIN de un usuario',
      'user.sessions_revoke': 'Revocó las sesiones de un usuario',
      'user.email_change_request': 'Pidió corregir el correo de un usuario',
      'user.login_pin_required_set': 'Cambió si un usuario necesita PIN al iniciar sesión',
      'user.lockouts_cleared': 'Limpió los bloqueos de un usuario',
    },
  },
  {
    label: 'Clientes',
    actions: {
      'client.create': 'Creó un cliente',
      'client.activate': 'Activó un cliente',
      'client.deactivate': 'Desactivó un cliente',
      'client.rotate_key': 'Rotó la clave de un cliente',
      'client.set_panel_base_url': 'Cambió la URL del panel de un cliente',
      'client.system_admin_key_rotate': 'Rotó la clave de administrador de un cliente',
      'client.system_admin_key_revoke': 'Revocó la clave de administrador de un cliente',
    },
  },
  {
    label: 'IPs',
    actions: {
      'blacklist.unban': 'Levantó el baneo de una IP',
      'allowlist.add': 'Agregó una IP a la lista blanca',
      'allowlist.remove': 'Quitó una IP de la lista blanca',
    },
  },
  {
    label: 'Alertas',
    actions: {
      alert_dismissed: 'Descartó una alerta',
      alert_resolved: 'Marcó una alerta como resuelta',
    },
  },
  {
    label: 'Cuentas de operadores',
    actions: {
      'account.create': 'Creó una cuenta de operador',
      'account.revoke': 'Revocó una cuenta de operador',
      'account.reactivate': 'Reactivó una cuenta de operador',
      'account.password_change': 'Cambió su contraseña',
      'account.totp_rotate': 'Rotó su código TOTP',
      'account.pin_set': 'Creó su PIN',
      'account.pin_change': 'Cambió su PIN',
      'account.pin_reset': 'Restableció el PIN de una cuenta de operador',
      'account.pin_failed': 'Se equivocó al confirmar con el PIN',
    },
  },
  {
    label: 'Sesiones',
    actions: {
      'admin.login': 'Inició sesión',
      'admin.login_failed': 'Intento fallido de inicio de sesión',
    },
  },
];

const ACTION_LABELS = Object.assign({}, ...ACTION_GROUPS.map((g) => g.actions));

export const actionLabel = (code) => ACTION_LABELS[code] || code;

const TARGET_LABELS = {
  user: 'Usuario',
  client: 'Cliente',
  blacklist_ip: 'IP baneada',
  allowlist_ip: 'IP exenta',
  admin_account: 'Cuenta de operador',
  alert: 'Alerta',
};

export const targetTypeLabel = (type) => TARGET_LABELS[type] || type;

// El token de administrador compartido (scripts) queda registrado como "token".
export const SHARED_TOKEN_ACTOR = 'token';
