import { Link } from 'react-router-dom';

// Franja de cifras de la pantalla de inicio. Cada cifra es un enlace a la sección
// donde está el detalle. `value`: undefined = todavía cargando (se ve un marcador
// gris), null = no se pudo cargar (se ve un guion), otro valor = la cifra.
// `alert` pinta la cifra en rojo tenue: es lo que el aviso de debajo explica.
export function StatStrip({ stats }) {
  return (
    <ul className={`stat-strip stat-strip--${stats.length}`} aria-label="Resumen">
      {stats.map((s) => (
        <li key={s.key} className="reveal" style={{ '--d': s.delay }}>
          <Link to={s.to} className={`stat${s.alert ? ' stat--alert' : ''}`}>
            <span className="stat-label">{s.label}</span>
            <span className="stat-value">
              {s.value === undefined ? (
                <span className="skeleton-bar stat-skeleton" aria-hidden="true" />
              ) : s.value === null ? (
                '—'
              ) : (
                s.value
              )}
            </span>
            <span className="stat-hint">{s.value === undefined || s.value === null ? ' ' : s.hint}</span>
            <svg className="stat-chevron" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </li>
      ))}
    </ul>
  );
}
