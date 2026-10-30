import { describe, expect, it } from 'vitest';
import { pinError } from './pin';

describe('pinError', () => {
  it('traduce los códigos de PIN del backend', () => {
    expect(pinError({ data: { code: 'pin_invalid' } })).toBe('El PIN no es correcto.');
    expect(pinError({ data: { code: 'pin_required' } })).toBe('Escribe tu PIN para confirmar.');
    expect(pinError({ data: { code: 'pin_not_set' } })).toBe('Primero crea tu PIN en Mi cuenta.');
  });

  it('avisa del bloqueo sin minutos cuando el navegador no lee Retry-After', () => {
    expect(pinError({ status: 429 })).toMatch(/Espera unos minutos/);
  });

  it('dice los minutos, en singular y en plural, cuando sí hay Retry-After', () => {
    expect(pinError({ status: 429, retryAfterSeconds: 30 })).toMatch(/en 1 minuto\./);
    expect(pinError({ status: 429, retryAfterSeconds: 61 })).toMatch(/en 2 minutos\./);
  });

  it('devuelve null si el error no tiene que ver con el PIN', () => {
    expect(pinError({ status: 500 })).toBeNull();
    expect(pinError(new Error('red caída'))).toBeNull();
    expect(pinError(undefined)).toBeNull();
  });
});
