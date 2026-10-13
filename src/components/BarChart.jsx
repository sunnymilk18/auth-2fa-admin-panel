import { dayLabel, fmt } from '../utils/stats';

// Gráfico de barras por día, dibujado en SVG sin librerías (la política de contenido del
// servidor no deja cargar nada externo). Cada barra lleva su propio texto (se ve al
// apuntarla) y debajo hay una tabla solo para lectores de pantalla con los mismos datos.
//
// `data`: [{ day: 'AAAA-MM-DD', count, failed? }]. `failed` es la parte de `count` que
// se pinta aparte en rojo. `unit`: [singular, plural] de lo que se cuenta.
// `title`: nombre del gráfico, para el resumen que lee un lector de pantalla.
// `okLabel` (p. ej. "correctos"): si viene, la barra se lee como correctos + fallidos
// (`count` es la suma) en vez de "total, de los cuales fallidos". `tone="danger"` pinta
// todas las barras en la familia de rojos (para cosas que son malas por sí mismas).
export function BarChart({ data, unit, title, failedUnit, okLabel, tone }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const failedTotal = data.reduce((sum, d) => sum + (d.failed || 0), 0);
  const peak = data.reduce((best, d) => (d.count > best.count ? d : best), data[0]);
  const slot = 10;
  const noun = (n) => (n === 1 ? unit[0] : unit[1]);
  const middle = data[Math.floor((data.length - 1) / 2)];
  const summary = okLabel
    ? `${total - failedTotal} ${okLabel} y ${failedTotal} ${failedUnit || 'fallidos'}`
    : `${total} ${noun(total)}`;

  return (
    <figure className={`chart${tone === 'danger' ? ' chart--danger' : ''}`}>
      <div
        className="chart-plot"
        role="img"
        aria-label={`${title}: ${summary} en ${data.length} días${
          total > 0 ? `, el máximo fue ${peak.count} el ${dayLabel(peak.day)}` : ''
        }.`}
      >
        {total > 0 ? (
          <span className="chart-max" aria-hidden="true">
            máx. {fmt(max)}
          </span>
        ) : (
          <span className="chart-empty">Sin datos en este rango</span>
        )}
        <svg viewBox={`0 0 ${data.length * slot} 100`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
          {data.map((d, i) => {
            const x = i * slot + 1.5;
            const h = (d.count / max) * 100;
            const failedH = d.failed ? (Math.min(d.failed, d.count) / max) * 100 : 0;
            const text = okLabel
              ? `${dayLabel(d.day)}: ${d.count - (d.failed || 0)} ${okLabel}, ${d.failed || 0} ${failedUnit || 'fallidos'}`
              : `${dayLabel(d.day)}: ${d.count} ${noun(d.count)}${d.failed ? `, ${d.failed} ${failedUnit || 'fallidas'}` : ''}`;
            return (
              <g key={d.day} className="chart-slot">
                <title>{text}</title>
                <rect className="chart-hit" x={i * slot} y="0" width={slot} height="100" />
                {d.count > 0 && <rect className="chart-bar" x={x} y={100 - h} width="7" height={h} rx="1.2" />}
                {failedH > 0 && <rect className="chart-bar chart-bar--failed" x={x} y={100 - failedH} width="7" height={failedH} rx="1.2" />}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="chart-axis" aria-hidden="true">
        <span>{dayLabel(data[0].day)}</span>
        {data.length > 2 && <span>{dayLabel(middle.day)}</span>}
        <span>{dayLabel(data[data.length - 1].day)}</span>
      </div>

      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>Día</th>
            <th>{okLabel || unit[1]}</th>
            {data.some((d) => d.failed !== undefined) && <th>{failedUnit || 'Fallidas'}</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <td>{dayLabel(d.day)}</td>
              <td>{okLabel ? d.count - (d.failed || 0) : d.count}</td>
              {d.failed !== undefined && <td>{d.failed}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
