import { useMemo } from 'react';
import { Container, Paper, Typography, Box, useMediaQuery } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import { useCurrency } from '../context/currency';
import { cumulativeProfit } from '../utils/finance';

const POSITIVE = '#00e676';
const NEGATIVE = '#ff1744';

const formatDate = (dateStr) => new Intl.DateTimeFormat('es-AR', {
  timeZone: 'UTC',
  day: '2-digit',
  month: 'short',
  year: '2-digit',
}).format(new Date(`${dateStr}T00:00:00Z`));

// Beneficio acumulado (retiros − depósitos) a lo largo del tiempo, para todas
// las casas o para la seleccionada.
const BetsProfitChart = ({ movements, title }) => {
  const isMobile = useMediaQuery('(max-width:600px)');
  const { amountOf, format: formatMoney, formatCompact } = useCurrency();

  const points = useMemo(() => cumulativeProfit(movements, amountOf), [movements, amountOf]);
  const last = points.length ? points[points.length - 1].profit : 0;
  const color = last >= 0 ? POSITIVE : NEGATIVE;

  return (
    <Container maxWidth="xl" sx={{ mb: 3 }}>
      <Paper sx={{ p: { xs: 1.5, sm: 2.5 } }}>
        <Typography variant="h6" align="center" sx={{ mb: 0.5, fontWeight: 700, color: 'primary.main' }}>
          <ShowChartIcon sx={{ fontSize: 24, verticalAlign: 'middle', mr: 0.5 }} /> Evolución del beneficio
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 1 }}>
          {title} · acumulado: {' '}
          <Box component="span" sx={{ color, fontWeight: 800 }}>{formatMoney(last)}</Box>
        </Typography>

        {points.length > 0 ? (
          <LineChart
            height={isMobile ? 220 : 280}
            xAxis={[{
              scaleType: 'point',
              data: points.map((p) => p.date),
              valueFormatter: (value) => formatDate(value),
              tickLabelStyle: { fill: '#9aa0a6', fontSize: 11 },
              // Con muchos puntos, mostrar solo algunas fechas para que no se pisen.
              tickInterval: (value, index) => points.length <= 6
                || index % Math.ceil(points.length / (isMobile ? 4 : 8)) === 0,
            }]}
            yAxis={[{
              // El ancho se ajusta a las etiquetas ("US$ 1,2k" es más largo que "$1,2M").
              width: 'auto',
              valueFormatter: (value) => formatCompact(value),
              tickLabelStyle: { fill: '#9aa0a6', fontSize: 11 },
            }]}
            series={[{
              data: points.map((p) => p.profit),
              label: 'Beneficio acumulado',
              color,
              area: true,
              curve: 'linear',
              showMark: points.length <= 30,
              valueFormatter: (value) => formatMoney(Number(value) || 0),
            }]}
            grid={{ horizontal: true }}
            margin={{ top: 16, right: isMobile ? 12 : 24, bottom: 10, left: 4 }}
            hideLegend
            sx={{
              '& .MuiLineChart-area': { fillOpacity: 0.15 },
              '& .MuiChartsGrid-line': { stroke: '#2a3a4a' },
              '& .MuiChartsAxis-line, & .MuiChartsAxis-tick': { stroke: '#2a3a4a' },
            }}
          />
        ) : (
          <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
            Todavía no hay movimientos para graficar.
          </Typography>
        )}
      </Paper>
    </Container>
  );
};

export default BetsProfitChart;
