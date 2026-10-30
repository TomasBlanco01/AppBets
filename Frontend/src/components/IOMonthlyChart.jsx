import { useMemo } from 'react';
import { Container, Paper, Typography, Box, useMediaQuery } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import BarChartIcon from '@mui/icons-material/BarChart';

const MONTHS_TO_SHOW = 6;
const INCOME_COLOR = '#00e676';
const EXPENSE_COLOR = '#ff1744';

const formatMoney = (n) => {
  const sign = n < 0 ? '-$' : '$';
  return `${sign}${Math.abs(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatCompactMoney = (value) => {
  if (!value) return '$0';
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);

  if (abs >= 1000000) {
    return `${sign}$${(abs / 1000000).toLocaleString('es-AR', { maximumFractionDigits: 1 })}M`;
  }
  if (abs >= 1000) {
    return `${sign}$${(abs / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1 })}k`;
  }
  return `${sign}$${abs.toLocaleString('es-AR', { maximumFractionDigits: 0 })}`;
};

// Devuelve los últimos N meses (incluyendo el actual) usando la fecha de Argentina.
const getLastMonths = (count) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());

  const currentYear = Number(parts.find(p => p.type === 'year')?.value);
  const currentMonth = Number(parts.find(p => p.type === 'month')?.value);

  const months = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(currentYear, currentMonth - 1 - i, 1));
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const monthName = new Intl.DateTimeFormat('es-AR', {
      month: 'short',
      timeZone: 'UTC',
    }).format(date).replace('.', '');

    months.push({
      key: `${year}-${String(month).padStart(2, '0')}`,
      label: `${monthName} ${String(year).slice(2)}`,
    });
  }

  return months;
};

const PeriodStat = ({ label, value, color }) => (
  <Box sx={{ textAlign: 'center', flex: 1, minWidth: 100 }}>
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ display: 'block', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.5px' }}
    >
      {label}
    </Typography>
    <Typography variant="subtitle1" fontWeight={800} color={`${color}.main`} sx={{ lineHeight: 1.3 }}>
      {value}
    </Typography>
  </Box>
);

const IOMonthlyChart = ({ movements }) => {
  const isMobile = useMediaQuery('(max-width:600px)');

  const { labels, income, expenses, totalIncome, totalExpenses } = useMemo(() => {
    const months = getLastMonths(MONTHS_TO_SHOW);
    const buckets = new Map(months.map(m => [m.key, { income: 0, expense: 0 }]));

    movements.forEach((mov) => {
      const monthKey = typeof mov.date === 'string' ? mov.date.slice(0, 7) : '';
      const bucket = buckets.get(monthKey);
      if (!bucket) return;
      if (mov.type === 'income') bucket.income += mov.amount;
      if (mov.type === 'expense') bucket.expense += mov.amount;
    });

    const values = months.map(m => buckets.get(m.key));
    const incomes = values.map(v => v.income);
    const expensesValues = values.map(v => v.expense);

    return {
      labels: months.map(m => m.label),
      income: incomes,
      expenses: expensesValues,
      totalIncome: incomes.reduce((sum, value) => sum + value, 0),
      totalExpenses: expensesValues.reduce((sum, value) => sum + value, 0),
    };
  }, [movements]);

  const hasData = totalIncome > 0 || totalExpenses > 0;
  const periodBalance = totalIncome - totalExpenses;

  return (
    <Container maxWidth="xl" sx={{ mb: 3 }}>
      <Paper sx={{ p: { xs: 1.5, sm: 2.5 } }}>
        <Typography variant="h6" align="center" sx={{ mb: 0.5, fontWeight: 700, color: 'primary.main' }}>
          <BarChartIcon sx={{ fontSize: 24, verticalAlign: 'middle', mr: 0.5 }} /> Ingresos vs. Gastos
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 2 }}>
          Últimos {MONTHS_TO_SHOW} meses
        </Typography>

        {hasData ? (
          <>
            <BarChart
              height={isMobile ? 260 : 320}
              xAxis={[{
                scaleType: 'band',
                data: labels,
                tickLabelStyle: { fill: '#9aa0a6', fontSize: isMobile ? 11 : 12 },
              }]}
              yAxis={[{
                valueFormatter: (value) => formatCompactMoney(value),
                tickLabelStyle: { fill: '#9aa0a6', fontSize: 11 },
              }]}
              series={[
                {
                  data: income,
                  label: 'Ingresos',
                  color: INCOME_COLOR,
                  valueFormatter: (value) => formatMoney(Number(value) || 0),
                },
                {
                  data: expenses,
                  label: 'Gastos',
                  color: EXPENSE_COLOR,
                  valueFormatter: (value) => formatMoney(Number(value) || 0),
                },
              ]}
              grid={{ horizontal: true }}
              margin={{
                top: 50,
                right: isMobile ? 12 : 24,
                bottom: 10,
                left: isMobile ? 54 : 72,
              }}
              slotProps={{
                legend: {
                  direction: 'horizontal',
                  position: { vertical: 'top', horizontal: 'middle' },
                },
              }}
              sx={{
                '& .MuiChartsGrid-line': { stroke: '#2a3a4a' },
                '& .MuiChartsAxis-line, & .MuiChartsAxis-tick': { stroke: '#2a3a4a' },
                '& .MuiChartsLegend-label': { fill: '#e6e6e6', fontSize: 12 },
              }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'space-around', gap: 1, mt: 1, pt: 1.5, borderTop: '1px solid #2a3a4a' }}>
              <PeriodStat label="Ingresos del período" value={formatMoney(totalIncome)} color="success" />
              <PeriodStat label="Gastos del período" value={formatMoney(totalExpenses)} color="error" />
              <PeriodStat
                label="Balance del período"
                value={formatMoney(periodBalance)}
                color={periodBalance >= 0 ? 'success' : 'error'}
              />
            </Box>
          </>
        ) : (
          <Box sx={{ textAlign: 'center', py: 5 }}>
            <BarChartIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.4, mb: 1 }} />
            <Typography color="text.secondary">
              No hay movimientos en los últimos {MONTHS_TO_SHOW} meses.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Cargá un ingreso o gasto para empezar a ver la evolución mensual.
            </Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default IOMonthlyChart;
