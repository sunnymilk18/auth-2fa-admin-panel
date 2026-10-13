import { Link } from 'react-router-dom';
import { fmt } from '../utils/stats';

// Lista ordenada con una barra por fila: sirve para "quién tiene más". `items`:
// [{ key, label, value, extra? }], ya ordenados de mayor a menor. La barra más larga
// es el primer valor; las demás se miden contra él. `extra` es una segunda línea tenue
// bajo el nombre (p. ej. "+31 nuevos"). `mono` escribe el nombre en letra monoespaciada
// (una IP); `to` convierte el nombre en un enlace a otra pantalla (con `title` como ayuda).
// `tone="danger"` pinta las barras en la familia de rojos.
export function RankedBars({ items, tone }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className={`rank${tone === 'danger' ? ' rank--danger' : ''}`}>
      {items.map((item) => (
        <li key={item.key} className="rank-row">
          <span className={`rank-label${item.mono ? ' rank-label--mono' : ''}`} title={item.label}>
            {item.to ? (
              <Link className="rank-link" to={item.to} title={item.linkTitle}>
                {item.label}
              </Link>
            ) : (
              item.label
            )}
            {item.extra && <span className="rank-extra">{item.extra}</span>}
          </span>
          <span className="rank-track" aria-hidden="true">
            <span className="rank-fill" style={{ width: `${(item.value / max) * 100}%` }} />
          </span>
          <span className="rank-value">{fmt(item.value)}</span>
        </li>
      ))}
    </ul>
  );
}
