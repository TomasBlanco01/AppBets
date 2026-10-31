import { createContext, useContext } from 'react';
import { formatMoney, formatCompactMoney } from '../utils/money';

export const CASAS = [
  { value: 'blue', label: 'Blue' },
  { value: 'bolsa', label: 'MEP' },
  { value: 'oficial', label: 'Oficial' },
];

// Valor por defecto (sin provider): todo en pesos.
export const CurrencyContext = createContext({
  currency: 'ARS',
  requestedCurrency: 'ARS',
  casa: 'blue',
  rates: null,
  status: 'idle',
  setCurrency: () => {},
  setCasa: () => {},
  amountOf: (movement) => movement.amount,
  format: (n) => formatMoney(n, 'ARS'),
  formatCompact: (n) => formatCompactMoney(n, 'ARS'),
});

export const useCurrency = () => useContext(CurrencyContext);
