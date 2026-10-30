import { describe, expect, it } from 'vitest';
import { actionLabel, targetTypeLabel } from './audit';

describe('registro de actividad', () => {
  it('traduce un código de acción conocido', () => {
    expect(actionLabel('user.ban')).toBe('Baneó a un usuario');
  });

  it('muestra tal cual un código de acción o de objetivo desconocido', () => {
    expect(actionLabel('algo.nuevo')).toBe('algo.nuevo');
    expect(targetTypeLabel('algo_nuevo')).toBe('algo_nuevo');
  });
});
