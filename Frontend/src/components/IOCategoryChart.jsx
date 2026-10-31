import { useMemo, useState } from 'react';
import {
  Container, Paper, Typography, Box, Select, MenuItem, ToggleButton, ToggleButtonGroup, useMediaQuery,
} from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import { useCurrency } from '../context/currency';
import { categoryBreakdown, getLastMonths, todayAR } from '../utils/finance';

const PALETTE = ['#00e676', '#40c4ff', '#ffd740', '#ff6e40', '#e040fb', '#69f0ae', '#ff5252', '#7c4dff', '#18ffff', '#b0bec5'];
const MONTHS_TO_PICK = 12;

// Distribución por categoría de los gastos (o ingresos) de un mes.
const IOCategoryChart = ({ movements }) => {
  const isMobile = useMediaQuery('(max-width:600px)');
  const { amountOf, format: formatMoney } = useCurrency();
  const [month, setMonth] = useState(() => todayAR().slice(0, 7));
  const [type, setType] = useState('expense');

  const months = useMemo(() => [...getLastMonths(MONTHS_TO_PICK)].reverse(), []);
  const rows = useMemo(
    () => categoryBreakdown(movements, { month, type }, amountOf),
    [movements, month, type, amountOf]
  );
  const total = rows.reduce((sum, r) => sum + r.total, 0);
  const data = rows.map((r, i) => ({ id: r.category, value: r.total, label: r.category, color: PALETTE[i % PALETTE.length] }));

  return (
    <Container maxWidth="xl" sx={{ mb: 3 }}>
      <Paper sx={{ p: { xs: 1.5, sm: 2.5 } }}>
        <Typography variant="h6" align="center" sx={{ mb: 1, fontWeight: 700, color: 'primary.main' }}>
          <PieChartIcon sx={{ fontSize: 24, verticalAlign: 'middle', mr: 0.5 }} /> Por categoría
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
          <ToggleButtonGroup size="small" exclusive value={type} onChange={(e, value) => value && setType(value)}>
            <ToggleButton value="expense" color="error" sx={{ px: 1.5 }}>Gastos</ToggleButton>
            <ToggleButton value="income" color="success" sx={{ px: 1.5 }}>Ingresos</ToggleButton>
          </ToggleButtonGroup>
          <Select size="small" value={month} onChange={(e) => setMonth(e.target.value)} sx={{ minWidth: 120 }}>
            {months.map((m) => <MenuItem key={m.key} value={m.key}>{m.label}</MenuItem>)}
          </Select>
        </Box>

        {rows.length === 0 ? (
          <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
            No hay {type === 'expense' ? 'gastos' : 'ingresos'} en este mes.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: isMobile ? '100%' : '45%', display: 'flex', justifyContent: 'center' }}>
              <PieChart
                height={isMobile ? 200 : 240}
                width={isMobile ? 200 : 240}
                series={[{
                  data,
                  innerRadius: '55%',
                  paddingAngle: 1.5,
                  cornerRadius: 3,
                  valueFormatter: (item) => formatMoney(item.value),
                }]}
                hideLegend
              />
            </Box>
            {/* Leyenda propia: en celular entra mejor que la del gráfico y muestra montos */}
            <Box sx={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {rows.map((r, i) => (
                <Box key={r.category} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ flexGrow: 1, minWidth: 0 }} noWrap>{r.category}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ width: 40, textAlign: 'right' }}>
                    {Math.round((r.total / total) * 100)}%
                  </Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ minWidth: 100, textAlign: 'right' }}>
                    {formatMoney(r.total)}
                  </Typography>
                </Box>
              ))}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #2a3a4a', pt: 0.75, mt: 0.5 }}>
                <Typography variant="body2" fontWeight={700}>Total</Typography>
                <Typography variant="body2" fontWeight={800} color={type === 'expense' ? 'error.main' : 'success.main'}>
                  {formatMoney(total)}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default IOCategoryChart;
