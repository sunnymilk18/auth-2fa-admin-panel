import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

// Ítems de navegación con su alcance: los de superadmin solo se muestran
// a quien tiene ese rol, la misma regla que ya aplica el backend.
export const NAV_ITEMS = [
  { label: 'Clientes', path: '/clients', roles: ['superadmin'] },
  { label: 'Usuarios', path: '/users', roles: ['admin', 'superadmin'] },
  { label: 'Lista negra', path: '/blacklist', roles: ['admin', 'superadmin'] },
  { label: 'Lista blanca', path: '/allowlist', roles: ['superadmin'] },
  { label: 'Cuentas', path: '/accounts', roles: ['superadmin'] },
  { label: 'Actividad', path: '/activity', roles: ['superadmin'] },
  { label: 'Estadísticas', path: '/stats', roles: ['admin', 'superadmin'] },
];

// Pie del menú: a qué API está conectado el panel y si responde (GET /health,
// público). Sirve para distinguir de un vistazo producción de un entorno local.
function ApiStatus() {
  const base = import.meta.env.VITE_API_URL || '';
  const [ok, setOk] = useState(null); // null = aún sin saber

  useEffect(() => {
    let alive = true;
    async function ping() {
      try {
        const res = await fetch(`${base}/health`);
        if (alive) setOk(res.ok);
      } catch {
        if (alive) setOk(false);
      }
    }
    ping();
    const id = setInterval(ping, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [base]);

  let host = base;
  try {
    host = new URL(base).host;
  } catch {
    // se muestra tal cual
  }
  const state = ok === null ? 'off' : ok ? 'ok' : 'bad';
  const text = ok === null ? 'Conectando…' : ok ? 'API conectada' : 'Sin conexión con la API';

  return (
    <div className="shell-api" role="status">
      <span className="shell-api-state">
        <span className={`status-dot status-dot--${state}`} aria-hidden="true" />
        {text}
      </span>
      <span className="shell-api-host mono" title={base}>
        {host}
      </span>
    </div>
  );
}

export function AppShell({ children }) {
  const { actor, role, hasPin, logout } = useAuth();
  const { pathname } = useLocation();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const mainRef = useRef(null);

  return (
    <div className="shell">
      <a
        className="skip-link"
        href="#contenido"
        onClick={(e) => {
          e.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Saltar al contenido
      </a>
      <nav className="shell-nav" aria-label="Secciones">
        <NavLink to="/" end className="shell-brand">
          Panel de administración
        </NavLink>
        {items.map((item) =>
          item.path ? (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) => `shell-nav-item${isActive ? ' is-active' : ''}`}
            >
              {item.label}
            </NavLink>
          ) : (
            <span key={item.label} className="shell-nav-item" data-disabled="true" title="Próximamente">
              {item.label}
            </span>
          )
        )}
        <ApiStatus />
      </nav>
      <div className="shell-main">
        <header className="shell-topbar">
          <span className="shell-identity mono">{actor}</span>
          <span className={`role-badge role-badge--${role}`}>{role}</span>
          <Link to="/account" className="btn btn--ghost">
            Mi cuenta
          </Link>
          <button type="button" className="btn btn--ghost" onClick={logout}>
            Cerrar sesión
          </button>
        </header>
        <main id="contenido" ref={mainRef} tabIndex={-1} className="shell-content">
          {/* En Mi cuenta el aviso va dentro de la propia página, junto a la fila del PIN. */}
          {!hasPin && pathname !== '/account' && (
            <p className="notice notice--pin" role="status">
              Aún no tienes un PIN, y las acciones delicadas lo piden. <Link to="/account">Crea el tuyo en Mi cuenta</Link>.
            </p>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
