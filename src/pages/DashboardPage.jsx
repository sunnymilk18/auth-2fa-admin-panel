import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { PageTitle } from '../components/PageTitle';
import { StatStrip } from '../components/StatStrip';
import { WelcomeLock } from '../components/WelcomeLock';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';

// La animación solo se reproduce justo después de iniciar sesión (AuthContext
// deja la marca) y solo si el sistema no pidió reducir el movimiento.
function takeIntroFlag() {
  try {
    const pending = sessionStorage.getItem('welcome-intro') === '1';
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return pending && !calm;
  } catch {
    return false;
  }
}

// Hora a la que se inició la sesión en este navegador, o null si no se sabe.
function loginTime() {
  try {
    const at = Number(sessionStorage.getItem('login-at'));
    if (!at) return null;
    return new Date(at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return null;
  }
}

// "Hoy" va de las 00:00 de la hora local de quien mira hasta ahora, y "ayer" es el día
// anterior completo. `day` tiene el formato del selector de fecha de Actividad.
function dayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const yesterday = new Date(start);
  yesterday.setDate(yesterday.getDate() - 1);
  return {
    today: { from: start.toISOString() },
    yesterday: { from: yesterday.toISOString(), to: new Date(start.getTime() - 1).toISOString() },
    day: start.toLocaleDateString('sv'),
  };
}

// Aviso de intentos fallidos: hoy al menos 5 y al menos el triple que ayer.
const FAILURE_ALERT_MIN = 5;
const FAILURE_ALERT_RATIO = 3;

// Pantalla de inicio: candado de sesión verificada, una franja de cifras y, solo si
// hay algo raro, un aviso de intentos fallidos. Las secciones ya están en el menú. Cada
// cifra se carga por separado: una que falle se ve como un guion y no tapa a las demás.
export function DashboardPage() {
  const { actor, role } = useAuth();
  const [intro] = useState(takeIntroFlag);
  // clave -> valor. Una clave ausente todavía está cargando; null es que falló.
  const [figures, setFigures] = useState({});

  // Se consume en un efecto (no al leerla): React puede ejecutar el inicializador dos veces.
  useEffect(() => {
    try {
      sessionStorage.removeItem('welcome-intro');
    } catch {
      // nada que limpiar
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const put = (key, promise) =>
      promise
        .then((value) => !cancelled && setFigures((f) => ({ ...f, [key]: value })))
        .catch(() => !cancelled && setFigures((f) => ({ ...f, [key]: null })));

    put('users', api.listUsers({ page: 1, pageSize: 1 }).then((res) => res.total));
    put('bans', api.listBans().then((res) => res.bans?.length || 0));

    if (role === 'superadmin') {
      const { today, yesterday } = dayBounds();
      // Del registro solo interesa el total: una página de una fila basta.
      const count = (action, range) => api.listAudit({ page: 1, pageSize: 1, action, ...range }).then((res) => res.total);

      put('clients', api.listClients().then((list) => ({ active: list.filter((c) => c.active).length, total: list.length })));
      put('operators', api.listAccounts().then((res) => ({ active: res.accounts.filter((a) => a.active).length, total: res.accounts.length })));
      put('actionsToday', count('', today));
      put('actionsYesterday', count('', yesterday));
      put('loginFailedToday', count('admin.login_failed', today));
      put('pinFailedToday', count('account.pin_failed', today));
      put(
        'failuresYesterday',
        Promise.all([count('admin.login_failed', yesterday), count('account.pin_failed', yesterday)]).then(([a, b]) => a + b)
      );
    }
    return () => {
      cancelled = true;
    };
  }, [role]);

  const since = loginTime();
  const at = (actor || '').indexOf('@');
  const name = at > 0 ? actor.slice(0, at) : actor;
  const domain = at > 0 ? actor.slice(at) : '';

  const isSuper = role === 'superadmin';
  const { day } = dayBounds();
  // Los fallos de acceso y los de PIN van aparte en el registro: la cifra los suma y el
  // enlace lleva al tipo que más pesa.
  const failuresToday =
    figures.loginFailedToday === undefined || figures.pinFailedToday === undefined
      ? undefined
      : figures.loginFailedToday === null || figures.pinFailedToday === null
        ? null
        : figures.loginFailedToday + figures.pinFailedToday;
  const failuresYesterday = figures.failuresYesterday;
  const failuresRaised =
    typeof failuresToday === 'number' &&
    typeof failuresYesterday === 'number' &&
    failuresToday >= FAILURE_ALERT_MIN &&
    failuresToday >= FAILURE_ALERT_RATIO * failuresYesterday;
  const failureAction = (figures.pinFailedToday || 0) > (figures.loginFailedToday || 0) ? 'account.pin_failed' : 'admin.login_failed';
  const failuresLink = `/activity?action=${failureAction}&from=${day}`;

  // Las cifras que vienen de un conteo parcial (activos de N) dejan undefined mientras cargan.
  const part = (key, field) => (figures[key] ? figures[key][field] : figures[key]);

  const stats = [
    { key: 'users', label: 'Usuarios', value: figures.users, hint: 'en todos los tenants', to: '/users' },
    { key: 'bans', label: 'IPs baneadas', value: figures.bans, hint: 'ahora', to: '/blacklist' },
    ...(isSuper
      ? [
          { key: 'clients', label: 'Clientes activos', value: part('clients', 'active'), hint: `de ${part('clients', 'total')}`, to: '/clients' },
          { key: 'operators', label: 'Operadores activos', value: part('operators', 'active'), hint: `de ${part('operators', 'total')}`, to: '/accounts' },
          {
            key: 'actions',
            label: 'Acciones hoy',
            value: figures.actionsToday,
            hint: `ayer ${figures.actionsYesterday ?? '—'}`,
            to: `/activity?from=${day}`,
          },
          {
            key: 'failures',
            label: 'Fallos de acceso hoy',
            value: failuresToday,
            hint: `ayer ${failuresYesterday ?? '—'}`,
            to: failuresLink,
            alert: failuresRaised,
          },
        ]
      : []),
  ].map((s, i) => ({ ...s, delay: `${3.9 + i * 0.06}s` }));

  return (
    <AppShell>
      <PageTitle className="sr-only">Inicio</PageTitle>

      <div className={`welcome welcome--${role}${intro ? ' is-intro' : ''}`}>
        <section className="welcome-hero">
          <WelcomeLock play={intro} />
          <span className="welcome-line reveal" style={{ '--d': '3.4s' }} aria-hidden="true" />
          <div className="welcome-text">
            <p className="welcome-title reveal" style={{ '--d': '3.5s' }}>
              Hola, {name}
            </p>
            {domain && (
              <p className="welcome-domain mono reveal" style={{ '--d': '3.6s' }}>
                {domain}
              </p>
            )}
            <ul className="welcome-facts reveal" style={{ '--d': '3.75s' }}>
              <li className="welcome-chip">
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M3 7.4 5.7 10 11 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Sesión verificada
              </li>
              <li>
                <span className={`role-badge role-badge--${role}`}>{role}</span>
              </li>
              {since && <li>Desde {since}</li>}
            </ul>
            {role === 'admin' && (
              <p className="welcome-scope reveal" style={{ '--d': '3.9s' }}>
                Clientes, Lista blanca y Cuentas son solo de superadmin.
              </p>
            )}
          </div>
        </section>

        <StatStrip stats={stats} />

        {failuresRaised && (
          <Link to={failuresLink} className="welcome-alert reveal" style={{ '--d': '4.3s' }}>
            <span className="welcome-alert-dot" aria-hidden="true" />
            Hay más intentos fallidos de lo normal: {failuresToday} hoy, {failuresYesterday} ayer.
            <span className="welcome-alert-link">Ver en Actividad</span>
          </Link>
        )}
      </div>
    </AppShell>
  );
}
