import { Modal } from './Modal';

// Diálogo de confirmación propio — reemplaza al window.confirm() nativo
// del navegador, que no se puede estilizar y desentona con el resto del
// panel. `danger` cambia el color del botón de confirmar (acciones que
// cortan acceso o invalidan algo). En una acción destructiva el foco empieza
// en "Cancelar": un Enter apresurado al abrirlo no ejecuta nada irreversible.
export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', danger, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <Modal role="alertdialog" labelledBy="dialog-title" describedBy="dialog-message" onClose={onCancel}>
      <h3 id="dialog-title">{title}</h3>
      <p id="dialog-message">{message}</p>
      <div className="dialog-actions">
        <button type="button" className="btn btn--ghost" data-autofocus={danger ? '' : undefined} onClick={onCancel}>
          Cancelar
        </button>
        <button
          type="button"
          className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
          data-autofocus={danger ? undefined : ''}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
