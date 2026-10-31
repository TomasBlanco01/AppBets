import { useMemo } from 'react';
import { Container, Paper, Typography, Box, useMediaQuery } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import BarChartIcon from '@mui/icons-material/BarChart';
import { useCurrency } from '../context/currency';
import { getLastMonths, monthlyTotals } from '../utils/finance';

const MONTHS_TO_SHOW = 6;
const INCOME_COLOR = '#00e676';
const EXPENSE_COLOR = '#ff1744';

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

  const { amountOf, format: formatMoney, formatCompact: formatCompactMoney } = useCurrency();

  const { labels, income, expenses, totalIncome, totalExpenses } = useMemo(() => {
    const rows = monthlyTotals(movements, getLastMonths(MONTHS_TO_SHOW), amountOf);
    const incomes = rows.map(r => r.income);
    const expensesValues = rows.map(r => r.expense);

    return {
      labels: rows.map(r => r.label),
      income: incomes,
      expenses: expensesValues,
      totalIncome: incomes.reduce((sum, value) => sum + value, 0),
      totalExpenses: expensesValues.reduce((sum, value) => sum + value, 0),
    };
  }, [movements, amountOf]);

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
                // El ancho se ajusta a las etiquetas ("US$ 1,2k" es más largo que "$1,2M").
                width: 'auto',
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
                left: 4,
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
