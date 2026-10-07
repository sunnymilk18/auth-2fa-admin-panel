import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell, NAV_ITEMS } from '../components/AppShell';
import { PageTitle } from '../components/PageTitle';
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

// Pantalla de inicio: candado de sesión verificada, las secciones del rol y, solo
// si hay algo que atender, un aviso de IPs baneadas.
export function DashboardPage() {
  const { actor, role } = useAuth();
  const [intro] = useState(takeIntroFlag);
  const [banned, setBanned] = useState(0);

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
    api
      .listBans()
      .then((res) => {
        if (!cancelled) setBanned(res.bans?.length || 0);
      })
      .catch(() => {
        // el aviso es un extra: si falla, simplemente no se muestra
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <AppShell>
      <PageTitle className="sr-only">Inicio</PageTitle>

      <div className={`welcome welcome--${role}${intro ? ' is-intro' : ''}`}>
        <section className="welcome-hero">
          <WelcomeLock play={intro} />
          <div className="welcome-text">
            <p className="welcome-title reveal" style={{ '--d': '3.5s' }}>
              Sesión verificada
            </p>
            <p className="welcome-who reveal" style={{ '--d': '3.65s' }}>
              Hola, <span className="mono">{actor}</span>
            </p>
            <p className="welcome-role reveal" style={{ '--d': '3.8s' }}>
              <span className={`role-badge role-badge--${role}`}>{role}</span>
              {role === 'admin' && (
                <span className="welcome-scope">
                  Clientes, Lista blanca y Cuentas son solo de superadmin.
                </span>
              )}
            </p>
          </div>
        </section>

        {banned > 0 && (
          <Link to="/blacklist" className="welcome-alert reveal" style={{ '--d': '4s' }}>
            <span className="welcome-alert-dot" aria-hidden="true" />
            {banned === 1 ? 'Hay 1 IP baneada ahora.' : `Hay ${banned} IPs baneadas ahora.`}
            <span className="welcome-alert-link">Ver lista negra</span>
          </Link>
        )}

        <section aria-labelledby="welcome-sections">
          <h2 id="welcome-sections" className="welcome-sections-title reveal" style={{ '--d': '4s' }}>
            Tus secciones
          </h2>
          <ul className="welcome-sections">
            {items.map((item, i) => (
              <li key={item.path} className="reveal" style={{ '--d': `${4 + i * 0.08}s` }}>
                <Link to={item.path} className="welcome-section">
                  <span className="welcome-section-name">{item.label}</span>
                  <span className="welcome-section-desc">{item.description}</span>
                  <svg className="welcome-section-chevron" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
