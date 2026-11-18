// Vista previa de impacto de las acciones destructivas del panel: qué cambia al confirmar, qué
// no cambia y si se puede deshacer. Todo en un solo lugar, para que los textos de los diálogos
// y la tabla de reversibilidad del informe digan lo mismo. Cada afirmación se comprobó contra
// lo que hace la API (por ejemplo, banear revoca las sesiones, los tokens y los dispositivos de
// confianza, y desbanear no los devuelve).
//
// `undo.kind`:
//  - 'button': la acción tiene inversa inmediata y, tras ejecutarla, el aviso ofrece "Deshacer".
//  - 'manual': se puede revertir a mano, pero no con un botón (pide el PIN otra vez o credenciales nuevas).
//  - 'none': no se puede revertir; lo que se pierde no se recupera.

export const UNDO_LABELS = {
  button: 'Se puede deshacer.',
  manual: 'Se puede revertir a mano.',
  none: 'No se puede deshacer.',
};

export const IMPACTS = {
  banUser: {
    changes: [
      'La cuenta queda inactiva y no puede iniciar sesión.',
      'Se cierran al instante sus sesiones y se revocan sus dispositivos de confianza.',
    ],
    stays: ['Sus datos y su historial de accesos se conservan.'],
    undo: {
      kind: 'button',
      text: 'Desbanear devuelve el acceso, pero las sesiones y los dispositivos revocados no vuelven: la persona tendrá que iniciar sesión de nuevo.',
    },
  },
  revokeSessions: {
    changes: ['Se cierran todas sus sesiones abiertas.'],
    stays: ['La cuenta sigue activa y puede volver a iniciar sesión con normalidad.'],
    undo: { kind: 'none', text: 'No hay nada que restaurar: la persona solo vuelve a iniciar sesión.' },
  },
  disableTotp: {
    changes: ['Deja de usar la app autenticadora y recibe el código por correo al iniciar sesión.'],
    stays: ['La cuenta y su contraseña no cambian.'],
    undo: { kind: 'none', text: 'El secreto anterior se borra. La persona puede configurar el TOTP de nuevo.' },
  },
  resetUserPin: {
    changes: [
      'Se borra su PIN actual.',
      'Se cierran todas sus sesiones y se revocan sus dispositivos de confianza.',
      'Tendrá que definir un PIN nuevo.',
    ],
    stays: ['La cuenta sigue activa.'],
    undo: { kind: 'none', text: 'El PIN anterior no se puede recuperar.' },
  },
  deactivateClient: {
    changes: ['La clave de API del sistema deja de funcionar al instante.'],
    stays: ['Sus usuarios y sus datos se conservan.'],
    undo: { kind: 'button', text: 'Reactivarlo vuelve a habilitar su clave de API.' },
  },
  rotateClientKey: {
    changes: [
      'La clave anterior deja de funcionar al instante.',
      'El sistema consumidor falla hasta que se configure la clave nueva.',
    ],
    stays: ['Sus usuarios y sus datos no cambian.'],
    undo: { kind: 'none', text: 'La clave anterior no se recupera. La nueva se muestra una sola vez.' },
  },
  allowlistAdd: {
    changes: [
      'La IP deja de recibir sanciones y baneos, en todos los tenants de la plataforma.',
      'Si hoy tiene un baneo activo, se levanta.',
    ],
    undo: { kind: 'manual', text: 'Se puede quitar de la lista blanca, pero eso vuelve a pedir el PIN.' },
  },
  allowlistRemove: {
    changes: ['La IP vuelve a poder recibir sanciones y baneos en todos los tenants.'],
    undo: { kind: 'manual', text: 'Se puede volver a agregar a la lista blanca, pero eso vuelve a pedir el PIN.' },
  },
  revokeAccount: {
    changes: ['La cuenta deja de funcionar.', 'Se cierran todas sus sesiones al instante.'],
    stays: ['Su historial en el registro de actividad se conserva.'],
    undo: {
      kind: 'manual',
      text: 'Un superadmin puede reactivarla desde Cuentas, pero con una contraseña y un TOTP nuevos: las credenciales anteriores no se recuperan.',
    },
  },
};

// Devuelve la vista previa de una acción, con líneas extra al principio de "qué cambia" cuando el
// panel conoce un dato concreto (por ejemplo, cuántos usuarios tiene un sistema).
export function impactFor(key, { extraChanges = [] } = {}) {
  const base = IMPACTS[key];
  if (!base) return null;
  return { ...base, changes: [...extraChanges, ...base.changes] };
}

// "Sus 120 usuarios dejan de poder iniciar sesión por este sistema" / sin dato, nada.
export function usersAffectedLine(total) {
  if (typeof total !== 'number') return null;
  if (total === 0) return 'Hoy no tiene usuarios registrados.';
  if (total === 1) return 'Su único usuario deja de poder iniciar sesión a través de este sistema.';
  return `Sus ${total.toLocaleString('es')} usuarios dejan de poder iniciar sesión a través de este sistema.`;
}
