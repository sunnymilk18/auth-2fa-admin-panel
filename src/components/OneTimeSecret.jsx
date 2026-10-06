import { useState } from 'react';

// Muestra una clave que el backend solo entrega una vez (API key, código
// TOTP, etc.) con un botón para copiarla — se reusa en Clients y, más
// adelante, en Accounts.
// `wrap`: parte el valor en varias líneas (para algo que se escribe a mano, como
// un secreto TOTP) en vez de dejarlo en una línea con desplazamiento.
export function OneTimeSecret({ label, value, wrap }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={`one-time-secret${wrap ? ' one-time-secret--wrap' : ''}`}>
      <p className="one-time-secret-label">{label}</p>
      <div className="one-time-secret-row">
        <code className="mono">{value}</code>
        <button type="button" className="btn btn--ghost" onClick={copy}>
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <p className="one-time-secret-warning">
        Guárdala ahora — no se puede volver a mostrar.
      </p>
    </div>
  );
}
