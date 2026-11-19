import { describe, expect, it } from 'vitest';
import { actionLabel, targetTypeLabel } from './audit';

describe('registro de actividad', () => {
  it('traduce un código de acción conocido', () => {
    expect(actionLabel('user.ban')).toBe('Baneó a un usuario');
  });

  it('traduce los cierres de alertas (códigos sin punto) y su tipo de objetivo', () => {
    expect(actionLabel('alert_dismissed')).toBe('Descartó una alerta');
    expect(actionLabel('alert_resolved')).toBe('Marcó una alerta como resuelta');
    expect(targetTypeLabel('alert')).toBe('Alerta');
  });

  it('muestra tal cual un código de acción o de objetivo desconocido', () => {
    expect(actionLabel('algo.nuevo')).toBe('algo.nuevo');
    expect(targetTypeLabel('algo_nuevo')).toBe('algo_nuevo');
  });
});
