import { useState } from 'react';
import { Modal } from './Modal';
import { PinField } from './PinField';
import { SetPinDialog } from './SetPinDialog';
import { useAuth } from '../auth/AuthContext';
import { pinError } from '../utils/pin';

// Diálogo de confirmación propio — reemplaza al window.confirm() nativo
// del navegador, que no se puede estilizar y desentona con el resto del
// panel. `danger` cambia el color del botón de confirmar (acciones que
// cortan acceso o invalidan algo). En una acción destructiva el foco empieza
// en "Cancelar": un Enter apresurado al abrirlo no ejecuta nada irreversible.
//
// `needsPin`: la acción pide el PIN de operador. El campo va en este mismo
// cuadro y `onConfirm(pin)` recibe el PIN. Si el PIN es incorrecto, `onConfirm`
// debe volver a lanzar ese error: el cuadro sigue abierto y lo explica. Si la
// cuenta aún no tiene PIN, primero se ofrece crearlo.
export function ConfirmDialog({ open, needsPin, ...props }) {
  const { hasPin, refreshIdentity } = useAuth();
  if (!open) return null;
  if (needsPin && !hasPin) {
    return (
      <SetPinDialog
        intro="Esta acción pide confirmar con tu PIN, y aún no tienes uno. Créalo y sigues con la acción."
        onClose={props.onCancel}
        onDone={refreshIdentity}
      />
    );
  }
  return needsPin ? <PinConfirm {...props} /> : <PlainConfirm {...props} />;
}

function PlainConfirm({ title, message, confirmLabel = 'Confirmar', danger, onConfirm, onCancel }) {
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

// Con el campo del PIN el foco empieza en el campo, que es lo primero que hay que
// hacer; "Cancelar" queda a un Tab y un Enter apresurado no confirma nada sin PIN.
function PinConfirm({ title, message, confirmLabel = 'Confirmar', danger, onConfirm, onCancel }) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onConfirm(pin);
    } catch (err) {
      setError(pinError(err) || 'No se pudo confirmar la acción.');
      setPin('');
      setBusy(false);
    }
  }

  return (
    <Modal
      as="form"
      className="form"
      role="alertdialog"
      labelledBy="dialog-title"
      describedBy="dialog-message"
      busy={busy}
      onClose={onCancel}
      onSubmit={onSubmit}
    >
      <h3 id="dialog-title">{title}</h3>
      <p id="dialog-message">{message}</p>

      <PinField
        autoFocus
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? 'dialog-pin-error' : undefined}
        value={pin}
        onChange={setPin}
      />

      {error && (
        <p id="dialog-pin-error" className="error" role="alert">
          {error}
        </p>
      )}

      <div className="dialog-actions">
        <button type="button" className="btn btn--ghost" disabled={busy} onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} disabled={busy || pin.length !== 6}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
