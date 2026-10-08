import { PasswordField } from './PasswordField';
import { PIN_LENGTH } from '../utils/pin';

// Campo del PIN de operador: seis dígitos, con el ojo para verlos. Solo deja
// escribir números. El resto de las props van al <input>.
export function PinField({ label = 'Tu PIN', value, onChange, ...inputProps }) {
  return (
    <PasswordField
      label={label}
      noun="PIN"
      required
      inputMode="numeric"
      pattern={`[0-9]{${PIN_LENGTH}}`}
      maxLength={PIN_LENGTH}
      autoComplete="off"
      className="pin-input"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
      {...inputProps}
    />
  );
}
