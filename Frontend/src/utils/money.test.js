import { describe, it, expect } from 'vitest';
import { formatMoney, formatCompactMoney } from './money';
import { toCsv, formatCsvNumber } from './csv';

describe('formatMoney', () => {
  it('formatea pesos y dólares en es-AR', () => {
    expect(formatMoney(1234.5)).toBe('$1.234,50');
    expect(formatMoney(-1234.5)).toBe('-$1.234,50');
    expect(formatMoney(10, 'USD')).toBe('US$ 10,00');
    expect(formatMoney(undefined)).toBe('$0,00');
  });

  it('abrevia para ejes de gráficos', () => {
    expect(formatCompactMoney(1500000)).toBe('$1,5M');
    expect(formatCompactMoney(-2500)).toBe('-$2,5k');
    expect(formatCompactMoney(0, 'USD')).toBe('US$ 0');
  });
});

describe('CSV', () => {
  it('usa ; y coma decimal, y escapa celdas con ; o comillas', () => {
    const csv = toCsv(
      [{ note: 'Cena; con "amigos"', amount: -1234.5 }],
      [
        { header: 'Nota', value: (r) => r.note },
        { header: 'Monto', value: (r) => formatCsvNumber(r.amount) },
      ]
    );
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe('Nota;Monto\r\n"Cena; con ""amigos""";-1234,50');
  });
});
