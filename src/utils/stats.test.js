import { afterEach, describe, expect, it, vi } from 'vitest';
import { dayLabel, fmt, localDay } from './stats';

describe('dayLabel', () => {
  it('muestra el día tal cual, sin pasar por UTC', () => {
    // El cero inicial depende del ICU de cada entorno; lo que importa es no correr el día.
    expect(dayLabel('2026-10-02')).toMatch(/^0?2\/10$/);
    expect(dayLabel('2026-01-01')).toMatch(/^0?1\/0?1$/);
    expect(dayLabel('2026-12-31')).toBe('31/12');
  });
});

describe('localDay', () => {
  afterEach(() => vi.useRealTimers());

  it('resta días en la hora local y cruza el cambio de mes y de año', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 3, 12, 0)); // 3 de enero de 2026, hora local
    expect(localDay(0)).toBe('2026-01-03');
    expect(localDay(6)).toBe('2025-12-28');
  });
});

describe('fmt', () => {
  it('agrupa los miles también en números de cuatro cifras', () => {
    expect(fmt(1234)).toBe('1.234');
    expect(fmt(1234567)).toBe('1.234.567');
  });
});
