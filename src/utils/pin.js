// Errores del PIN de operador. El backend responde 403 con `code`
// (`pin_invalid`, `pin_required`, `pin_not_set`) o 429 con Retry-After cuando hay
// demasiados intentos fallidos. Devuelve el texto para mostrar, o null si el
// error no tiene que ver con el PIN.
export function pinError(err) {
  if (err?.data?.code === 'pin_invalid') return 'El PIN no es correcto.';
  if (err?.data?.code === 'pin_required') return 'Escribe tu PIN para confirmar.';
  if (err?.data?.code === 'pin_not_set') return 'Primero crea tu PIN en Mi cuenta.';
  if (err?.status === 429) {
    // El navegador solo puede leer Retry-After si el backend lo expone por CORS;
    // sin él, el aviso no dice cuántos minutos.
    if (!err.retryAfterSeconds) return 'Demasiados intentos fallidos. Espera unos minutos antes de volver a intentar.';
    const minutes = Math.ceil(err.retryAfterSeconds / 60);
    return `Demasiados intentos fallidos. Vuelve a intentar en ${minutes} minuto${minutes === 1 ? '' : 's'}.`;
  }
  return null;
}

export const PIN_LENGTH = 6;
