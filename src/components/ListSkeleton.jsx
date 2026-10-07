// Marcador de una lista que todavía está cargando: filas grises con la forma de
// la tabla. Aparece solo si la espera pasa de unos 300 ms (el retardo está en el
// CSS), para que una respuesta rápida no deje un parpadeo antes de la tabla.
const WIDTHS = [
  ['38%', '16%', '22%'],
  ['30%', '12%', '28%'],
  ['44%', '18%', '16%'],
  ['34%', '14%', '24%'],
  ['40%', '12%', '20%'],
  ['28%', '16%', '26%'],
];

export function ListSkeleton({ rows = 6 }) {
  return (
    <div className="skeleton" role="status" aria-live="polite">
      <span className="sr-only">Cargando…</span>
      <div className="skeleton-head" aria-hidden="true" />
      {WIDTHS.slice(0, rows).map((cols, i) => (
        <div key={i} className="skeleton-row" aria-hidden="true">
          {cols.map((w, j) => (
            <span key={j} className="skeleton-bar" style={{ width: w }} />
          ))}
        </div>
      ))}
    </div>
  );
}
