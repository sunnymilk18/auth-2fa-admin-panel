import { SetPinDialog } from './SetPinDialog';
import { useAuth } from '../auth/AuthContext';

// Envuelve un diálogo cuya acción pide el PIN de operador. Si la cuenta aún no
// tiene PIN, muestra primero el cuadro para crearlo; con el PIN creado, aparece
// el diálogo original.
export function PinRequired({ onClose, children }) {
  const { hasPin, refreshIdentity } = useAuth();
  if (hasPin) return children;
  return (
    <SetPinDialog
      intro="Esta acción pide confirmar con tu PIN, y aún no tienes uno. Créalo y sigues con la acción."
      onClose={onClose}
      onDone={refreshIdentity}
    />
  );
}
