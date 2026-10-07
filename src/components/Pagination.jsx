// Barra "Anterior / Página X de Y (N …) / Siguiente" bajo una tabla paginada.
// `noun`: [singular, plural] de lo que se cuenta, p. ej. ['usuario', 'usuarios'].
export function Pagination({ page, totalPages, total, noun, onPage }) {
  return (
    <nav className="pagination" aria-label="Paginación">
      <button type="button" className="btn btn--ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Anterior
      </button>
      <span className="pagination-info">
        Página {page} de {totalPages} ({total} {total === 1 ? noun[0] : noun[1]})
      </span>
      <button type="button" className="btn btn--ghost" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        Siguiente
      </button>
    </nav>
  );
}
