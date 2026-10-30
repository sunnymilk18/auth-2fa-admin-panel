import { describe, expect, it } from 'vitest';
import { RESULT_GROUPS, eventLabel, resultInfo } from './authEvents';

describe('resultInfo', () => {
  it('marca como fallo las credenciales y códigos malos', () => {
    for (const r of ['bad_credentials', 'bad_totp', 'invalid_code', 'bad_pin', 'locked_out', 'account_banned']) {
      expect(resultInfo('login', r).tone).toBe('bad');
    }
  });

  it('no cuenta como fallo lo que no es un ataque', () => {
    for (const r of ['pin_step_required', 'session_expired', 'email_not_verified']) {
      expect(resultInfo('login', r).tone).toBe('off');
    }
  });

  it('dice "Cuenta creada" para un registro correcto y "Correcto" para un login', () => {
    expect(resultInfo('register', 'success').label).toBe('Cuenta creada');
    expect(resultInfo('login', 'success').label).toBe('Correcto');
  });

  it('muestra tal cual un código desconocido', () => {
    expect(resultInfo('login', 'algo_nuevo')).toEqual({ label: 'algo_nuevo', tone: 'off' });
  });

  it('el grupo "Fallos" del filtro coincide con los resultados en rojo', () => {
    const fallos = RESULT_GROUPS.find((g) => g.label === 'Fallos').results;
    for (const r of fallos) expect(resultInfo('login', r).tone).toBe('bad');
  });
});

describe('eventLabel', () => {
  it('arma la frase del inicio de sesión según el método', () => {
    expect(eventLabel({ kind: 'login', method: 'totp' })).toBe('Inicio de sesión con el código de la app');
    expect(eventLabel({ kind: 'login' })).toBe('Inicio de sesión');
  });

  it('distingue quién levantó un baneo', () => {
    expect(eventLabel({ kind: 'ip_unban', ban_origin: 'operator', actor_email: 'ana@x.cl' })).toBe('Baneo levantado por ana@x.cl');
    expect(eventLabel({ kind: 'ip_unban', ban_origin: 'tenant' })).toBe('Baneo levantado por el sistema del tenant');
  });

  it('muestra tal cual un tipo de evento desconocido', () => {
    expect(eventLabel({ kind: 'nuevo_tipo' })).toBe('nuevo_tipo');
  });
});
