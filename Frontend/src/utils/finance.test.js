import { describe, it, expect } from 'vitest';
import {
  sumByType, monthlyTotals, getLastMonths, categoryBreakdown, cumulativeProfit, totalsByPage, todayAR,
} from './finance';

const bets = [
  { pageId: 1, type: 'deposit', amount: 1000, date: '2026-09-01' },
  { pageId: 1, type: 'withdrawal', amount: 1500, date: '2026-09-10' },
  { pageId: 2, type: 'deposit', amount: 500, date: '2026-09-10' },
  { pageId: 2, type: 'withdrawal', amount: 100, date: '2026-10-01' },
];

const io = [
  { type: 'income', amount: 1000, date: '2026-10-05', category: 'Sueldo' },
  { type: 'expense', amount: 300, date: '2026-10-06', category: 'Vivienda' },
  { type: 'expense', amount: 100, date: '2026-10-07', category: 'Ocio' },
  { type: 'expense', amount: 50, date: '2026-10-20', category: 'Ocio' },
  { type: 'expense', amount: 999, date: '2026-09-30', category: 'Ocio' },
];

describe('sumByType', () => {
  it('suma solo el tipo pedido', () => {
    expect(sumByType(bets, 'deposit')).toBe(1500);
    expect(sumByType(bets, 'withdrawal')).toBe(1600);
  });

  it('usa amountOf para convertir (por ejemplo, a dólares)', () => {
    expect(sumByType(bets, 'deposit', (m) => m.amount / 100)).toBe(15);
  });
});

describe('totalsByPage', () => {
  it('calcula depositado, retirado, en página y beneficio por casa', () => {
    const pages = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'Sin movimientos' }];
    const [a, b, ...rest] = totalsByPage(pages, bets);
    expect(a).toMatchObject({ deposits: 1000, withdrawals: 1500, balance: -500, profit: 500, movementCount: 2, lastDate: '2026-09-10' });
    expect(b).toMatchObject({ deposits: 500, withdrawals: 100, balance: 400, profit: -400 });
    expect(rest).toHaveLength(0);
  });
});

describe('cumulativeProfit', () => {
  it('acumula retiros − depósitos por fecha, en orden', () => {
    expect(cumulativeProfit(bets)).toEqual([
      { date: '2026-09-01', profit: -1000 },
      { date: '2026-09-10', profit: 0 },
      { date: '2026-10-01', profit: 100 },
    ]);
  });
});

describe('meses', () => {
  it('devuelve los últimos N meses en hora de Argentina', () => {
    // 1 de noviembre 01:00 UTC todavía es 31 de octubre en Argentina.
    const now = new Date('2026-11-01T01:00:00Z');
    expect(todayAR(now)).toBe('2026-10-31');
    expect(getLastMonths(3, now).map((m) => m.key)).toEqual(['2026-08', '2026-09', '2026-10']);
  });

  it('cruza de año', () => {
    expect(getLastMonths(2, new Date('2027-01-15T12:00:00Z')).map((m) => m.key)).toEqual(['2026-12', '2027-01']);
  });

  it('agrupa ingresos y gastos por mes', () => {
    const rows = monthlyTotals(io, [{ key: '2026-09', label: '' }, { key: '2026-10', label: '' }]);
    expect(rows.map((r) => [r.key, r.income, r.expense])).toEqual([
      ['2026-09', 0, 999],
      ['2026-10', 1000, 450],
    ]);
  });
});

describe('categoryBreakdown', () => {
  it('suma por categoría del mes y tipo, de mayor a menor', () => {
    expect(categoryBreakdown(io, { month: '2026-10', type: 'expense' })).toEqual([
      { category: 'Vivienda', total: 300 },
      { category: 'Ocio', total: 150 },
    ]);
  });
});
