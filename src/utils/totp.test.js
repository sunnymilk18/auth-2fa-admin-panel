import { describe, expect, it } from 'vitest';
import { secretFrom } from './totp';

describe('secretFrom', () => {
  it('extrae el secreto de la URL otpauth', () => {
    expect(secretFrom('otpauth://totp/Panel:ana?secret=ABC234&issuer=Panel')).toBe('ABC234');
  });

  it('devuelve cadena vacía si falta el secreto o la URL no es válida', () => {
    expect(secretFrom('otpauth://totp/Panel:ana')).toBe('');
    expect(secretFrom('no es una url')).toBe('');
  });
});
