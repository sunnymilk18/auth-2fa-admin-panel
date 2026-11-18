// Textos en español de las alertas del detector de accesos anómalos y pequeñas ayudas para
// mostrarlas. Un código que el backend agregue después se muestra tal cual.

// Estado de la alerta y el color del punto: abierta pide atención (rojo), descartada queda
// en gris y resuelta en verde. El mismo criterio de color de Accesos y de Estadísticas.
export const STATE_INFO = {
  abierta: { label: 'Abierta', plural: 'abiertas', tone: 'bad' },
  descartada: { label: 'Descartada', plural: 'descartadas', tone: 'off' },
  resuelta: { label: 'Resuelta', plural: 'resueltas', tone: 'ok' },
};

export const SOURCE_LABELS = {
  regla: 'Regla',
  senuelo: 'Señuelo',
  isolation_forest: 'Isolation Forest',
};

// Título del detalle: "Isolation Forest" es un nombre propio y no se baja a minúscula.
export const SOURCE_TITLES = {
  regla: 'Alerta de regla',
  senuelo: 'Alerta de señuelo',
  isolation_forest: 'Alerta de Isolation Forest',
};

// Una frase corta de qué significa cada fuente, para el detalle.
export const SOURCE_HINTS = {
  regla: 'Una característica de la ventana alcanzó el umbral fijo de una regla.',
  senuelo: 'Alguien probó una cuenta señuelo, que ninguna persona legítima usa.',
  isolation_forest: 'El modelo consideró que la ventana se aleja de lo normal.',
};

// Las seis características de una ventana, en el orden en que se muestran.
export const FEATURE_LABELS = {
  fallos: 'Fallos',
  correctos: 'Inicios de sesión correctos',
  ips_distintas_con_fallos: 'IP distintas con fallos',
  cuentas_distintas_atacadas: 'Cuentas distintas atacadas',
  intentos_cuenta_inexistente: 'Intentos contra cuentas inexistentes',
  intentos_contra_senuelos: 'Intentos contra señuelos',
};

export function stateInfo(code) {
  return STATE_INFO[code] || { label: code || '—', plural: code || '', tone: 'off' };
}

export function sourceTitle(code) {
  return SOURCE_TITLES[code] || `Alerta de ${code || 'origen desconocido'}`;
}

export function sourceLabel(code) {
  return SOURCE_LABELS[code] || code || '—';
}

// El puntaje del bosque va de 0 a 1; las alertas de regla y de señuelo no tienen.
export function scoreLabel(score) {
  if (score === null || score === undefined) return '—';
  return score.toFixed(2).replace('.', ',');
}

// Una alerta es de una IP o de un tenant. Devuelve lo principal y, si hay, lo secundario.
// Una IP que tocó a varios tenants llega sin tenant.
export function alertSubject(alert) {
  const tenant = alert.tenant?.name || (alert.tenant?.id ? `${alert.tenant.id.slice(0, 8)}…` : '');
  if (alert.ip) return { main: alert.ip, sub: tenant || 'Varios tenants', mono: true };
  return { main: tenant || 'Sin tenant identificado', sub: 'Todo el tenant', mono: false };
}

export function primaryMotive(alert) {
  return alert.motives?.[0] || 'Sin motivos registrados';
}

// Las características como filas { key, label, value }: primero las conocidas, en su orden,
// y después cualquiera que el backend agregue.
export function featureRows(features) {
  const f = features || {};
  const known = Object.keys(FEATURE_LABELS).filter((k) => k in f);
  const extra = Object.keys(f).filter((k) => !(k in FEATURE_LABELS));
  return [...known, ...extra].map((key) => ({ key, label: FEATURE_LABELS[key] || key, value: f[key] }));
}

// "alertas abiertas", "1 alerta resuelta"… según el filtro de estado.
export function countLabel(state, total) {
  const noun = total === 1 ? 'alerta' : 'alertas';
  const info = STATE_INFO[state];
  if (!info) return noun;
  const adjective = total === 1 ? info.label.toLowerCase() : info.plural;
  return `${noun} ${adjective}`;
}

const pad = (n) => String(n).padStart(2, '0');

// La ventana llega en UTC; se muestra en la hora del operador, como el resto del panel.
// "12/10/2026 11:00 a 11:10".
export function windowLabel(startISO, endISO) {
  const s = new Date(startISO);
  const e = new Date(endISO);
  const day = `${pad(s.getDate())}/${pad(s.getMonth() + 1)}/${s.getFullYear()}`;
  return `${day} ${pad(s.getHours())}:${pad(s.getMinutes())} a ${pad(e.getHours())}:${pad(e.getMinutes())}`;
}
