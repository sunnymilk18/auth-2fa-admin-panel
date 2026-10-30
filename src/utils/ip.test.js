import { describe, expect, it } from 'vitest';
import { isValidIP } from './ip';

describe('isValidIP', () => {
  it('acepta IPv4 con octetos de 0 a 255', () => {
    expect(isValidIP('192.168.0.1')).toBe(true);
    expect(isValidIP('0.0.0.0')).toBe(true);
    expect(isValidIP('255.255.255.255')).toBe(true);
  });

  it('rechaza IPv4 fuera de rango o incompleta', () => {
    expect(isValidIP('256.1.1.1')).toBe(false);
    expect(isValidIP('10.0.1')).toBe(false);
    expect(isValidIP('10.0.1.4.5')).toBe(false);
  });

  it('acepta IPv6 y rechaza texto cualquiera', () => {
    expect(isValidIP('::1')).toBe(true);
    expect(isValidIP('2001:db8::ff00:42:8329')).toBe(true);
    expect(isValidIP('hola')).toBe(false);
    expect(isValidIP('')).toBe(false);
  });
});
