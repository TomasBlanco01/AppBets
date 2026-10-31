import { Box, ToggleButton, ToggleButtonGroup, Select, MenuItem, Typography, CircularProgress } from '@mui/material';
import { useCurrency, CASAS } from '../context/currency';
import { latestRate } from '../utils/fx';
import { formatMoney } from '../utils/money';

// Selector ARS / USD para totales y gráficos. Los montos de cada movimiento en
// las listas siguen en pesos, que es como se cargaron.
const CurrencyToggle = () => {
  const { currency, requestedCurrency, casa, rates, status, setCurrency, setCasa } = useCurrency();
  const rate = latestRate(rates);
  const usdUnavailable = requestedCurrency === 'USD' && currency !== 'USD';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      {requestedCurrency === 'USD' && (
        <Typography variant="caption" color={usdUnavailable ? 'warning.main' : 'text.secondary'} sx={{ lineHeight: 1.2 }}>
          {status === 'loading' && !rate && <CircularProgress size={12} sx={{ mr: 0.5, verticalAlign: 'middle' }} />}
          {usdUnavailable
            ? (status === 'loading' ? 'Cargando cotización…' : 'Sin cotización: se muestra en $')
            : `Hoy ${formatMoney(rate)}`}
        </Typography>
      )}
      {requestedCurrency === 'USD' && (
        <Select
          size="small"
          value={casa}
          onChange={(e) => setCasa(e.target.value)}
          variant="standard"
          disableUnderline
          sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'text.secondary' }}
          inputProps={{ 'aria-label': 'Tipo de dólar' }}
        >
          {CASAS.map((c) => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
        </Select>
      )}
      <ToggleButtonGroup
        size="small"
        exclusive
        value={requestedCurrency}
        onChange={(e, value) => value && setCurrency(value)}
        aria-label="Moneda de los totales"
      >
        <ToggleButton value="ARS" sx={{ px: 1.25, py: 0.25, fontWeight: 700 }}>$</ToggleButton>
        <ToggleButton value="USD" sx={{ px: 1.25, py: 0.25, fontWeight: 700 }}>US$</ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
};

export default CurrencyToggle;
