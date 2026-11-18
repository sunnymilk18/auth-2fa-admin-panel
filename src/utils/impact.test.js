import { describe, expect, it } from 'vitest';
import { IMPACTS, UNDO_LABELS, impactFor, usersAffectedLine } from './impact';

describe('IMPACTS', () => {
  it('toda acción dice qué cambia y si se puede deshacer', () => {
    for (const [key, impact] of Object.entries(IMPACTS)) {
      expect(impact.changes.length, key).toBeGreaterThan(0);
      expect(Object.keys(UNDO_LABELS), key).toContain(impact.undo.kind);
      expect(impact.undo.text.length, key).toBeGreaterThan(0);
    }
  });

  it('solo banear y desactivar un cliente tienen botón de deshacer', () => {
    const withButton = Object.keys(IMPACTS).filter((k) => IMPACTS[k].undo.kind === 'button');
    expect(withButton.sort()).toEqual(['banUser', 'deactivateClient']);
  });

  it('lo que pierde algo para siempre dice que no se puede deshacer', () => {
    for (const key of ['disableTotp', 'resetUserPin', 'rotateClientKey', 'revokeSessions']) {
      expect(IMPACTS[key].undo.kind, key).toBe('none');
    }
  });

  it('banear avisa que las sesiones revocadas no vuelven', () => {
    expect(IMPACTS.banUser.undo.text).toMatch(/no vuelven/);
  });

  it('las acciones de la lista blanca y de las cuentas se revierten a mano', () => {
    for (const key of ['allowlistAdd', 'allowlistRemove', 'revokeAccount']) {
      expect(IMPACTS[key].undo.kind, key).toBe('manual');
    }
  });
});

describe('impactFor', () => {
  it('agrega las líneas extra al principio de "qué cambia" sin tocar el catálogo', () => {
    const before = IMPACTS.deactivateClient.changes.length;
    const impact = impactFor('deactivateClient', { extraChanges: ['Sus 3 usuarios dejan de iniciar sesión.'] });
    expect(impact.changes[0]).toBe('Sus 3 usuarios dejan de iniciar sesión.');
    expect(impact.changes).toHaveLength(before + 1);
    expect(IMPACTS.deactivateClient.changes).toHaveLength(before);
  });

  it('devuelve null para una acción que no existe', () => {
    expect(impactFor('inventada')).toBeNull();
  });
});

describe('usersAffectedLine', () => {
  it('concuerda el número con el texto', () => {
    expect(usersAffectedLine(0)).toBe('Hoy no tiene usuarios registrados.');
    expect(usersAffectedLine(1)).toMatch(/único usuario/);
    // El separador de miles depende de la configuración regional (en "es", solo desde cinco cifras).
    expect(usersAffectedLine(12345)).toMatch(/^Sus 12[.  ]?345 usuarios/);
  });

  it('no inventa un número que no se conoce', () => {
    expect(usersAffectedLine(undefined)).toBeNull();
    expect(usersAffectedLine(null)).toBeNull();
  });
});
