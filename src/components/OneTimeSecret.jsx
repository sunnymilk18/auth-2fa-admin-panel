import { useState } from 'react';

// Muestra una clave que el backend solo entrega una vez (API key, código
// TOTP, etc.) con un botón para copiarla — se reusa en Clients y, más
// adelante, en Accounts.
export function OneTimeSecret({ label, value }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="one-time-secret">
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
