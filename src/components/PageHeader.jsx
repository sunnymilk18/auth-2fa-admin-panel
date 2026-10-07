import { PageTitle } from './PageTitle';

// Cabecera de una sección: título, una línea que dice para qué sirve, el dato
// clave a la derecha (p. ej. cuántos hay) y, si la sección las tiene, sus acciones.
// `stat`: { value, label } o null mientras los datos no han cargado.
// `badge`: algo que va junto al título (p. ej. la etiqueta del rol que lo necesita).
export function PageHeader({ title, description, stat, badge, children }) {
  return (
    <header className="page-head">
      <div className="page-head-main">
        <div className="page-title">
          <PageTitle>{title}</PageTitle>
          {badge}
        </div>
        {description && <p className="page-desc">{description}</p>}
      </div>
      {(stat || children) && (
        <div className="page-head-side">
          {stat && (
            <div className="page-stat">
              <span className="page-stat-value">{stat.value.toLocaleString('es')}</span>
              <span className="page-stat-label">{stat.label}</span>
            </div>
          )}
          {children}
        </div>
      )}
    </header>
  );
}
