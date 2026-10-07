import { useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

// Ítems de navegación con su alcance: los de superadmin solo se muestran
// a quien tiene ese rol, la misma regla que ya aplica el backend.
// `description` es la línea que acompaña a cada sección en la pantalla de inicio.
export const NAV_ITEMS = [
  { label: 'Clientes', path: '/clients', roles: ['superadmin'], description: 'Crea clientes, actívalos o desactívalos y rota sus claves.' },
  { label: 'Usuarios', path: '/users', roles: ['admin', 'superadmin'], description: 'Banea o desbanea, corrige correos y gestiona PIN y TOTP.' },
  { label: 'Lista negra', path: '/blacklist', roles: ['admin', 'superadmin'], description: 'Consulta las IPs baneadas y levanta un baneo.' },
  { label: 'Lista blanca', path: '/allowlist', roles: ['superadmin'], description: 'IPs exentas de sanciones en toda la plataforma.' },
  { label: 'Cuentas', path: '/accounts', roles: ['superadmin'], description: 'Crea, reactiva y revoca cuentas de operadores.' },
];

export function AppShell({ children }) {
  const { actor, role, logout } = useAuth();
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
      </nav>
      <div className="shell-main">
        <header className="shell-topbar">
          <span className="shell-identity mono">{actor}</span>
          <span className={`role-badge role-badge--${role}`}>{role}</span>
          <button type="button" className="btn btn--ghost" onClick={logout}>
            Cerrar sesión
          </button>
        </header>
        <main id="contenido" ref={mainRef} tabIndex={-1} className="shell-content">{children}</main>
      </div>
    </div>
  );
}
