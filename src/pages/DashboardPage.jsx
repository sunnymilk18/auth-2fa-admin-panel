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
  const since = loginTime();
  const at = (actor || '').indexOf('@');
  const name = at > 0 ? actor.slice(0, at) : actor;
  const domain = at > 0 ? actor.slice(at) : '';

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
              <li>
                {items.length} {items.length === 1 ? 'sección' : 'secciones'}
              </li>
            </ul>
            {role === 'admin' && (
              <p className="welcome-scope reveal" style={{ '--d': '3.9s' }}>
                Clientes, Lista blanca y Cuentas son solo de superadmin.
              </p>
            )}
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
