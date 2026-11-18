import { UNDO_LABELS } from '../utils/impact';

// Lo que va dentro de un diálogo de confirmación de una acción destructiva: qué cambia, qué no
// y si se puede deshacer. Ver src/utils/impact.js. Si la acción no tiene vista previa no se pinta.
export function ImpactPreview({ impact }) {
  if (!impact) return null;
  return (
    <section className="impact" aria-label="Qué pasa si confirmas">
      <h4 className="impact-title">Qué cambia</h4>
      <ul className="impact-list">
        {impact.changes.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {impact.stays?.length > 0 && (
        <>
          <h4 className="impact-title">Qué no cambia</h4>
          <ul className="impact-list impact-list--stays">
            {impact.stays.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      )}
      <p className={`impact-undo impact-undo--${impact.undo.kind}`}>
        <strong>{UNDO_LABELS[impact.undo.kind]}</strong> {impact.undo.text}
      </p>
    </section>
  );
}
