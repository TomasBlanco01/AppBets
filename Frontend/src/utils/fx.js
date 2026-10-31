// Conversión de pesos a dólares con la cotización de la fecha de cada movimiento.

// `history` es [[fecha, venta], ...] ordenado por fecha (ver /api/fx).
// Devuelve la cotización del último día hábil <= date. Si la fecha es anterior
// al histórico, usa la primera disponible.
export const rateForDate = (history, date) => {
  if (!history?.length) return null;
  if (!date || date < history[0][0]) return history[0][1];

  let lo = 0;
  let hi = history.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (history[mid][0] <= date) lo = mid;
    else hi = mid - 1;
  }
  return history[lo][1];
};

// Devuelve (amount, date) => amount en USD. Los movimientos posteriores al
// último dato del histórico (por ejemplo, de hoy) usan la cotización actual.
export const buildUsdConverter = (rates) => {
  const history = rates?.history || [];
  const lastDate = history.length ? history[history.length - 1][0] : '';
  const current = rates?.current?.venta || null;

  return (amount, date) => {
    const rate = date > lastDate && current ? current : rateForDate(history, date) || current;
    return rate ? amount / rate : 0;
  };
};

// Devuelve amountOf(movement) para sumar totales en la moneda elegida.
// Si el movimiento tiene guardada la cotización del tipo de dólar elegido
// (el backend guarda la MEP al cargarlo), se usa esa. Si no (otro tipo de
// dólar, o un pendiente que todavía no llegó al servidor), se calcula.
export const buildAmountOf = ({ currency, casa, rates }) => {
  if (currency !== 'USD') return (m) => m.amount;
  const toUsd = buildUsdConverter(rates);
  return (m) => (m.fxRate > 0 && m.fxCasa === casa ? m.amount / m.fxRate : toUsd(m.amount, m.date));
};

export const latestRate = (rates) => (
  rates?.current?.venta || rates?.history?.[rates.history.length - 1]?.[1] || null
);
