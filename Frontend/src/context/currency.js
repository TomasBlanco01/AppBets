import { createContext, useContext } from 'react';
import { formatMoney, formatCompactMoney } from '../utils/money';

// 'bolsa' es el dólar MEP: el predeterminado y el que se guarda en cada movimiento.
export const DEFAULT_CASA = 'bolsa';

export const CASAS = [
  { value: 'bolsa', label: 'MEP' },
  { value: 'blue', label: 'Blue' },
  { value: 'oficial', label: 'Oficial' },
];

// Valor por defecto (sin provider): todo en pesos.
export const CurrencyContext = createContext({
  currency: 'ARS',
  requestedCurrency: 'ARS',
  casa: DEFAULT_CASA,
  rates: null,
  status: 'idle',
  setCurrency: () => {},
  setCasa: () => {},
  amountOf: (movement) => movement.amount,
  format: (n) => formatMoney(n, 'ARS'),
  formatCompact: (n) => formatCompactMoney(n, 'ARS'),
});

export const useCurrency = () => useContext(CurrencyContext);
