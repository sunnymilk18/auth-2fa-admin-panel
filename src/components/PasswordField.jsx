import { useId, useState } from 'react';
import { Icon } from './Icon';

// Campo de contraseña con un botón para mostrarla u ocultarla. El botón queda
// fuera de la etiqueta del campo: así el nombre accesible del campo es solo su
// etiqueta y no incluye "Mostrar contraseña".
// `label`: texto de la etiqueta. `noun`: cómo se llama lo que se escribe, para el botón
// ("Mostrar contraseña", "Mostrar PIN"). El resto de las props van al <input>.
export function PasswordField({ label, noun = 'contraseña', ...inputProps }) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-field">
        <input id={id} {...inputProps} type={visible ? 'text' : 'password'} />
        <button
          type="button"
          className="password-toggle"
          aria-label={visible ? `Ocultar ${noun}` : `Mostrar ${noun}`}
          aria-pressed={visible}
          title={visible ? `Ocultar ${noun}` : `Mostrar ${noun}`}
          onClick={() => setVisible((v) => !v)}
        >
          <Icon name={visible ? 'eye-off' : 'eye'} />
        </button>
      </div>
    </div>
  );
}
