import { Icon } from './Icon';

// Lo que se ve cuando una lista no tiene nada: explica qué es la sección y qué
// hacer, en vez de una línea suelta de texto.
export function EmptyState({ icon, title, children }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">
        <Icon name={icon} />
      </span>
      <p className="empty-state-title">{title}</p>
      {children && <p className="empty-state-text">{children}</p>}
    </div>
  );
}
