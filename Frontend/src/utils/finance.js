// Cálculos de totales y series para dashboards y gráficos. Son funciones puras:
// reciben `amountOf(movement)` para poder sumar en pesos o en dólares.

const identity = (m) => m.amount;

export const sumByType = (movements, type, amountOf = identity) => movements
  .filter((m) => m.type === type)
  .reduce((sum, m) => sum + amountOf(m), 0);

const AR_TZ = 'America/Argentina/Buenos_Aires';

// Fecha de hoy en Argentina como 'YYYY-MM-DD'.
export const todayAR = (now = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: AR_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(now);

const monthLabel = (year, month) => {
  const date = new Date(Date.UTC(year, month - 1, 1));
  const name = new Intl.DateTimeFormat('es-AR', { month: 'short', timeZone: 'UTC' })
    .format(date)
    .replace('.', '');
  return `${name} ${String(year).slice(2)}`;
};

// Últimos `count` meses (incluido el actual en Argentina), del más viejo al más nuevo.
export const getLastMonths = (count, now = new Date()) => {
  const [currentYear, currentMonth] = todayAR(now).split('-').map(Number);
  const months = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(currentYear, currentMonth - 1 - i, 1));
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    months.push({ key: `${year}-${String(month).padStart(2, '0')}`, label: monthLabel(year, month) });
  }
  return months;
};

export const formatMonthKey = (key) => {
  const [year, month] = key.split('-').map(Number);
  return monthLabel(year, month);
};

// Ingresos y gastos por mes para los meses indicados.
export const monthlyTotals = (movements, months, amountOf = identity) => {
  const buckets = new Map(months.map((m) => [m.key, { income: 0, expense: 0 }]));
  movements.forEach((m) => {
    const bucket = buckets.get(typeof m.date === 'string' ? m.date.slice(0, 7) : '');
    if (bucket && (m.type === 'income' || m.type === 'expense')) {
      bucket[m.type] += amountOf(m);
    }
  });
  return months.map((m) => ({ ...m, ...buckets.get(m.key) }));
};

// Total por categoría de un tipo (income/expense) en un mes ('YYYY-MM'),
// de mayor a menor.
export const categoryBreakdown = (movements, { month, type }, amountOf = identity) => {
  const totals = new Map();
  movements.forEach((m) => {
    if (m.type !== type || !String(m.date).startsWith(month)) return;
    const category = m.category || 'Otros';
    totals.set(category, (totals.get(category) || 0) + amountOf(m));
  });
  return [...totals.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
};

// Beneficio acumulado (retiros − depósitos) día a día, en orden cronológico.
// Un punto por fecha con movimientos.
export const cumulativeProfit = (movements, amountOf = identity) => {
  const byDate = new Map();
  movements.forEach((m) => {
    const delta = m.type === 'withdrawal' ? amountOf(m) : -amountOf(m);
    byDate.set(m.date, (byDate.get(m.date) || 0) + delta);
  });

  let running = 0;
  return [...byDate.keys()].sort().map((date) => {
    running += byDate.get(date);
    return { date, profit: running };
  });
};

// Totales por casa para el resumen de Bets. Solo devuelve casas con movimientos.
export const totalsByPage = (pages, movements, amountOf = identity) => pages.map((page) => {
  const pageMovs = movements.filter((m) => m.pageId === page.id);
  const deposits = sumByType(pageMovs, 'deposit', amountOf);
  const withdrawals = sumByType(pageMovs, 'withdrawal', amountOf);
  const lastDate = pageMovs.reduce((latest, m) => (m.date > latest ? m.date : latest), '') || null;
  return {
    ...page,
    deposits,
    withdrawals,
    balance: deposits - withdrawals,
    profit: withdrawals - deposits,
    movementCount: pageMovs.length,
    lastDate,
  };
}).filter((p) => p.deposits > 0 || p.withdrawals > 0);
