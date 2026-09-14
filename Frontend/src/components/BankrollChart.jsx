import { useMemo } from 'react';
import { Container, Paper, Typography, Box } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';

const formatMoney = (n) => {
  const sign = n < 0 ? '-$' : '$';
  return `${sign}${Math.abs(n).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const formatShortDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
  }).format(d);
};

const BankrollChart = ({ history }) => {
  const { labels, values } = useMemo(() => {
    const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date) || a.id - b.id);
    return {
      labels: sorted.map(h => formatShortDate(h.date)),
      values: sorted.map(h => h.amount),
    };
  }, [history]);

  if (history.length < 2) return null;

  return (
    <Container maxWidth="xl" sx={{ mb: 3 }}>
      <Paper sx={{ p: 2.5 }}>
        <Typography variant="h6" align="center" sx={{ mb: 1, fontWeight: 700, color: 'primary.main' }}>
          <ShowChartIcon sx={{ fontSize: 24, verticalAlign: 'middle', mr: 0.5 }} /> Evolución del Banco
        </Typography>
        <Box sx={{ width: '100%', height: 260 }}>
          <LineChart
            xAxis={[{ scaleType: 'point', data: labels }]}
            yAxis={[{ valueFormatter: (v) => formatMoney(v) }]}
            series={[{
              data: values,
              color: '#00e676',
              area: true,
              showMark: false,
              valueFormatter: (v) => formatMoney(v),
            }]}
            height={260}
            grid={{ horizontal: true }}
            sx={{
              '& .MuiChartsAxis-tickLabel': { fill: '#9aa0a6' },
              '& .MuiChartsAxis-line': { stroke: '#2a3a4a' },
              '& .MuiChartsAxis-tick': { stroke: '#2a3a4a' },
              '& .MuiChartsGrid-line': { stroke: '#2a3a4a' },
            }}
          />
        </Box>
      </Paper>
    </Container>
  );
};

export default BankrollChart;
