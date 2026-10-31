// Formato de montos compartido por toda la app (es-AR: 1.234,56).

const PREFIX = { ARS: '$', USD: 'US$ ' };

export const formatMoney = (n, currency = 'ARS') => {
  const value = Number(n) || 0;
  const sign = value < 0 ? '-' : '';
  const digits = Math.abs(value).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${sign}${PREFIX[currency] || '$'}${digits}`;
};

// Para ejes de gráficos: 1,2M / 350k / 900.
export const formatCompactMoney = (n, currency = 'ARS') => {
  const value = Number(n) || 0;
  const prefix = PREFIX[currency] || '$';
  if (!value) return `${prefix}0`;
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);

  if (abs >= 1000000) {
    return `${sign}${prefix}${(abs / 1000000).toLocaleString('es-AR', { maximumFractionDigits: 1 })}M`;
  }
  if (abs >= 1000) {
    return `${sign}${prefix}${(abs / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })}k`;
  }
  return `${sign}${prefix}${abs.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
};
