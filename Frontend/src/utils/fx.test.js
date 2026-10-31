import { describe, it, expect } from 'vitest';
import { rateForDate, buildUsdConverter, buildAmountOf, latestRate } from './fx';

const history = [
  ['2026-10-01', 1000],
  ['2026-10-02', 1100],
  ['2026-10-05', 1200], // 3 y 4 son fin de semana
];

describe('rateForDate', () => {
  it('usa la cotización del día', () => {
    expect(rateForDate(history, '2026-10-02')).toBe(1100);
  });

  it('en fin de semana usa el último día hábil anterior', () => {
    expect(rateForDate(history, '2026-10-04')).toBe(1100);
  });

  it('antes del histórico usa la primera cotización', () => {
    expect(rateForDate(history, '2020-01-01')).toBe(1000);
  });

  it('sin histórico devuelve null', () => {
    expect(rateForDate([], '2026-10-01')).toBeNull();
  });
});

describe('buildUsdConverter', () => {
  const toUsd = buildUsdConverter({ history, current: { venta: 1250 } });

  it('convierte con la cotización de la fecha del movimiento', () => {
    expect(toUsd(11000, '2026-10-02')).toBe(10);
  });

  it('después del último dato usa la cotización actual', () => {
    expect(toUsd(12500, '2026-10-06')).toBe(10);
  });

  it('sin cotización actual usa la última del histórico', () => {
    expect(buildUsdConverter({ history })(12000, '2026-10-30')).toBe(10);
  });
});

describe('buildAmountOf', () => {
  const rates = { history, current: { venta: 1250 } };

  it('en pesos devuelve el monto tal cual', () => {
    expect(buildAmountOf({ currency: 'ARS', casa: 'bolsa', rates })({ amount: 500 })).toBe(500);
  });

  it('usa la cotización guardada si es del tipo de dólar elegido', () => {
    const amountOf = buildAmountOf({ currency: 'USD', casa: 'bolsa', rates });
    // La guardada (2000) gana sobre el histórico (1100) aunque sea de la misma fecha.
    expect(amountOf({ amount: 20000, date: '2026-10-02', fxRate: 2000, fxCasa: 'bolsa' })).toBe(10);
  });

  it('si la guardada es de otro tipo de dólar, o no hay, calcula con el histórico', () => {
    const amountOf = buildAmountOf({ currency: 'USD', casa: 'blue', rates });
    expect(amountOf({ amount: 11000, date: '2026-10-02', fxRate: 2000, fxCasa: 'bolsa' })).toBe(10);
    expect(amountOf({ amount: 11000, date: '2026-10-02' })).toBe(10);
  });
});

describe('latestRate', () => {
  it('prefiere la cotización en vivo', () => {
    expect(latestRate({ history, current: { venta: 1250 } })).toBe(1250);
    expect(latestRate({ history })).toBe(1200);
    expect(latestRate(null)).toBeNull();
  });
});
