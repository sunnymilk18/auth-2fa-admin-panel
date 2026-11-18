import { describe, expect, it } from 'vitest';
import { alertSubject, countLabel, featureRows, primaryMotive, scoreLabel, sourceLabel, sourceTitle, stateInfo, windowLabel } from './alerts';

describe('stateInfo', () => {
  it('da el texto y el color de cada estado', () => {
    expect(stateInfo('abierta')).toMatchObject({ label: 'Abierta', tone: 'bad' });
    expect(stateInfo('descartada')).toMatchObject({ label: 'Descartada', tone: 'off' });
    expect(stateInfo('resuelta')).toMatchObject({ label: 'Resuelta', tone: 'ok' });
  });

  it('muestra un estado desconocido tal cual', () => {
    expect(stateInfo('archivada')).toMatchObject({ label: 'archivada', tone: 'off' });
  });
});

describe('sourceLabel', () => {
  it('traduce las tres fuentes y deja pasar una desconocida', () => {
    expect(sourceLabel('regla')).toBe('Regla');
    expect(sourceLabel('senuelo')).toBe('Señuelo');
    expect(sourceLabel('isolation_forest')).toBe('Isolation Forest');
    expect(sourceLabel('otra')).toBe('otra');
  });
});

describe('sourceTitle', () => {
  it('mantiene Isolation Forest como nombre propio', () => {
    expect(sourceTitle('isolation_forest')).toBe('Alerta de Isolation Forest');
    expect(sourceTitle('regla')).toBe('Alerta de regla');
    expect(sourceTitle('senuelo')).toBe('Alerta de señuelo');
    expect(sourceTitle('otra')).toBe('Alerta de otra');
  });
});

describe('scoreLabel', () => {
  it('usa dos decimales con coma', () => {
    expect(scoreLabel(0.7126)).toBe('0,71');
    expect(scoreLabel(1)).toBe('1,00');
  });

  it('muestra una raya cuando no hay puntaje', () => {
    expect(scoreLabel(null)).toBe('—');
    expect(scoreLabel(undefined)).toBe('—');
  });
});

describe('alertSubject', () => {
  it('una alerta por IP muestra la IP y su tenant', () => {
    expect(alertSubject({ ip: '203.0.113.7', tenant: { id: 'abc', name: 'sim-hospital' } })).toEqual({
      main: '203.0.113.7',
      sub: 'sim-hospital',
      mono: true,
    });
  });

  it('una IP que tocó a varios tenants llega sin tenant', () => {
    expect(alertSubject({ ip: '203.0.113.7', tenant: {} }).sub).toBe('Varios tenants');
  });

  it('una alerta por tenant muestra el nombre y, sin nombre, el id abreviado', () => {
    expect(alertSubject({ ip: null, tenant: { id: '12345678-aaaa', name: 'sim-colegio' } })).toMatchObject({
      main: 'sim-colegio',
      sub: 'Todo el tenant',
      mono: false,
    });
    expect(alertSubject({ ip: null, tenant: { id: '12345678-aaaa' } }).main).toBe('12345678…');
  });
});

describe('primaryMotive', () => {
  it('toma el primer motivo', () => {
    expect(primaryMotive({ motives: ['42 fallos en 10 min (lo normal es 3)', 'otro'] })).toBe('42 fallos en 10 min (lo normal es 3)');
  });

  it('avisa cuando no hay motivos', () => {
    expect(primaryMotive({ motives: [] })).toBe('Sin motivos registrados');
    expect(primaryMotive({})).toBe('Sin motivos registrados');
  });
});

describe('featureRows', () => {
  it('ordena las conocidas y deja al final las nuevas', () => {
    const rows = featureRows({ correctos: 0, fallos: 42, nueva: 7 });
    expect(rows.map((r) => r.key)).toEqual(['fallos', 'correctos', 'nueva']);
    expect(rows[0]).toEqual({ key: 'fallos', label: 'Fallos', value: 42 });
    expect(rows[2].label).toBe('nueva');
  });

  it('tolera que no haya características', () => {
    expect(featureRows(undefined)).toEqual([]);
  });
});

describe('countLabel', () => {
  it('concuerda el número con el estado del filtro', () => {
    expect(countLabel('abierta', 1)).toBe('alerta abierta');
    expect(countLabel('abierta', 3)).toBe('alertas abiertas');
    expect(countLabel('resuelta', 2)).toBe('alertas resueltas');
    expect(countLabel('', 5)).toBe('alertas');
  });
});

describe('windowLabel', () => {
  it('arma día, hora de inicio y hora de fin en la hora local', () => {
    const start = new Date(2026, 9, 12, 11, 0); // 12-10-2026 11:00 local
    const end = new Date(2026, 9, 12, 11, 10);
    expect(windowLabel(start.toISOString(), end.toISOString())).toBe('12/10/2026 11:00 a 11:10');
  });
});
