import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

// Ítems de navegación con su alcance — los de superadmin solo se muestran
// a quien tiene ese rol, la misma regla que ya aplica el backend. `path`
// queda null hasta que cada pantalla exista de verdad (próximos pasos);
// mientras tanto el ítem se ve pero no lleva a ningún lado.
const NAV_ITEMS = [
  { label: 'Clients', path: '/clients', roles: ['superadmin'] },
  { label: 'Users', path: '/users', roles: ['admin', 'superadmin'] },
  { label: 'Blacklist', path: '/blacklist', roles: ['admin', 'superadmin'] },
  { label: 'Allowlist', path: '/allowlist', roles: ['superadmin'] },
  { label: 'Accounts', path: '/accounts', roles: ['superadmin'] },
];

export function AppShell({ children }) {
  const { actor, role, logout } = useAuth();
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <div className="shell">
      <nav className="shell-nav">
        <h1>Panel de administración</h1>
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
        <main className="shell-content">{children}</main>
      </div>
    </div>
  );
}
