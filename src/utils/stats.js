// Un día del backend viene como "AAAA-MM-DD" ya cortado en la zona horaria del operador.
// Se arma con sus partes (no con `new Date("AAAA-MM-DD")`, que lo toma como UTC y puede
// mostrar el día anterior) y se escribe corto: "02/10".
export function dayLabel(day) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es', { day: '2-digit', month: '2-digit' });
}

// Una marca de tiempo ISO 8601 del backend, en la hora local del operador: "12/10, 14:35".
export function timeLabel(iso) {
  return new Date(iso).toLocaleString('es', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// El día de hace `daysAgo` días en la hora local, como "AAAA-MM-DD" (lo que lee el filtro
// "Desde" de Accesos y Actividad). Con 6 días atrás, el primer día de un rango de 7.
export function localDay(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const fmt = (n) => n.toLocaleString('es', { useGrouping: 'always' });

export const RANGES = [
  { value: '7d', label: '7 días', days: 7 },
  { value: '30d', label: '30 días', days: 30 },
];
