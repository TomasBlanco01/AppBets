import { useMemo, useState } from 'react';
import {
  Container, Paper, Typography, Box, Button, LinearProgress, Chip, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  InputAdornment, Divider, useMediaQuery
} from '@mui/material';
import SavingsIcon from '@mui/icons-material/Savings';
import EditIcon from '@mui/icons-material/Edit';
import { IO_CATEGORIES } from '../constants/ioCategories';

const formatMoney = (n) => {
  const sign = n < 0 ? '-$' : '$';
  return `${sign}${Math.abs(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const getArgentinaMonthInfo = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());

  const year = Number(parts.find(p => p.type === 'year')?.value);
  const month = Number(parts.find(p => p.type === 'month')?.value);
  const label = new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));

  return {
    key: `${year}-${String(month).padStart(2, '0')}`,
    label: label.charAt(0).toUpperCase() + label.slice(1),
  };
};

const getStatusColor = (pct) => {
  if (pct >= 100) return 'error';
  if (pct >= 80) return 'warning';
  return 'success';
};

const BudgetStat = ({ label, value, color }) => (
  <Box sx={{ flex: 1, minWidth: 100, textAlign: 'center' }}>
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ display: 'block', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.62rem', letterSpacing: '0.5px' }}
    >
      {label}
    </Typography>
    <Typography variant="h6" fontWeight={900} color={color} sx={{ lineHeight: 1.3 }}>
      {value}
    </Typography>
  </Box>
);

const IOBudget = ({ movements, budgets, onSave }) => {
  const isMobile = useMediaQuery('(max-width:600px)');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const monthInfo = useMemo(() => getArgentinaMonthInfo(), []);

  const expensesByCategory = useMemo(() => {
    const totals = new Map();
    movements.forEach((mov) => {
      if (mov.type !== 'expense' || !mov.date || !mov.date.startsWith(monthInfo.key)) return;
      const category = mov.category || 'Otros gastos';
      totals.set(category, (totals.get(category) || 0) + mov.amount);
    });
    return totals;
  }, [movements, monthInfo.key]);

  const categoryOptions = useMemo(() => {
    const categories = new Set(IO_CATEGORIES.expense);
    budgets.forEach(budget => categories.add(budget.category));
    expensesByCategory.forEach((_, category) => categories.add(category));

    const order = new Map(IO_CATEGORIES.expense.map((category, index) => [category, index]));
    return [...categories].sort((a, b) => {
      const aOrder = order.has(a) ? order.get(a) : 1000;
      const bOrder = order.has(b) ? order.get(b) : 1000;
      return aOrder - bOrder || a.localeCompare(b, 'es');
    });
  }, [budgets, expensesByCategory]);

  const rows = useMemo(() => {
    const order = new Map(IO_CATEGORIES.expense.map((category, index) => [category, index]));
    return budgets
      .filter(budget => budget.amount > 0)
      .map((budget) => {
        const spent = expensesByCategory.get(budget.category) || 0;
        return {
          ...budget,
          spent,
          pct: (spent / budget.amount) * 100,
          remaining: budget.amount - spent,
        };
      })
      .sort((a, b) => {
        const aOrder = order.has(a.category) ? order.get(a.category) : 1000;
        const bOrder = order.has(b.category) ? order.get(b.category) : 1000;
        return aOrder - bOrder || a.category.localeCompare(b.category, 'es');
      });
  }, [budgets, expensesByCategory]);

  const totalBudget = rows.reduce((sum, row) => sum + row.amount, 0);
  const totalSpent = rows.reduce((sum, row) => sum + row.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const totalPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const exceededCount = rows.filter(row => row.pct >= 100).length;
  const nearLimitCount = rows.filter(row => row.pct >= 80 && row.pct < 100).length;
  const monthExpenses = [...expensesByCategory.values()].reduce((sum, value) => sum + value, 0);

  const openDialog = () => {
    const initialDraft = {};
    categoryOptions.forEach((category) => {
      const existing = budgets.find(budget => budget.category === category);
      initialDraft[category] = existing ? String(existing.amount) : '';
    });
    setDraft(initialDraft);
    setDialogOpen(true);
  };

  const handleDraftChange = (category, value) => {
    setDraft(prev => ({ ...prev, [category]: value }));
  };

  const handleClear = () => {
    const cleared = {};
    categoryOptions.forEach((category) => {
      cleared[category] = '';
    });
    setDraft(cleared);
  };

  const handleSave = async () => {
    const normalized = [];

    for (const category of categoryOptions) {
      const rawValue = (draft[category] || '').trim();
      if (!rawValue) continue;

      const amount = parseFloat(rawValue);
      if (!Number.isFinite(amount) || amount <= 0) {
        alert(`El presupuesto de ${category} debe ser un número mayor a 0.`);
        return;
      }

      normalized.push({ category, amount });
    }

    setSaving(true);
    try {
      await onSave(normalized);
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving I/O budgets:', error);
      alert('No se pudieron guardar los presupuestos. Intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mb: 3 }}>
      <Paper sx={{ p: { xs: 1.5, sm: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
              <SavingsIcon sx={{ fontSize: 24, verticalAlign: 'middle', mr: 0.5 }} /> Presupuesto mensual
            </Typography>
            <Chip
              label={monthInfo.label}
              size="small"
              variant="outlined"
              sx={{ fontWeight: 600, borderColor: '#2a3a4a', color: 'text.secondary' }}
            />
          </Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={openDialog}
            sx={{ fontWeight: 700 }}
          >
            Configurar
          </Button>
        </Box>

        {rows.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <SavingsIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.4, mb: 1 }} />
            <Typography color="text.secondary" sx={{ mb: 0.5 }}>
              Todavía no definiste presupuestos.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Poné un límite mensual por categoría y vas a ver cuánto te queda en cada una.
            </Typography>
          </Box>
        ) : (
          <>
            {exceededCount > 0 ? (
              <Alert severity="error" variant="outlined" sx={{ mb: 1.5, bgcolor: 'rgba(255,23,68,0.06)' }}>
                Te pasaste del presupuesto en {exceededCount} {exceededCount === 1 ? 'categoría' : 'categorías'}.
              </Alert>
            ) : nearLimitCount > 0 ? (
              <Alert severity="warning" variant="outlined" sx={{ mb: 1.5, bgcolor: 'rgba(255,193,7,0.06)' }}>
                Estás cerca del límite en {nearLimitCount} {nearLimitCount === 1 ? 'categoría' : 'categorías'}.
              </Alert>
            ) : null}

            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                mb: 1.5,
                p: 1.5,
                borderRadius: 2,
                bgcolor: 'rgba(15,25,35,0.5)',
                border: '1px solid #2a3a4a',
              }}
            >
              <BudgetStat label="Presupuesto" value={formatMoney(totalBudget)} color="primary.main" />
              <BudgetStat
                label="Gastado"
                value={formatMoney(totalSpent)}
                color={`${getStatusColor(totalPct)}.main`}
              />
              <BudgetStat
                label={totalRemaining >= 0 ? 'Disponible' : 'Excedido'}
                value={formatMoney(Math.abs(totalRemaining))}
                color={totalRemaining >= 0 ? 'success.main' : 'error.main'}
              />
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {totalPct.toFixed(0)}% del presupuesto usado
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(totalPct, 100)}
              color={getStatusColor(totalPct)}
              sx={{
                height: 10,
                borderRadius: 5,
                bgcolor: '#0f1923',
                '& .MuiLinearProgress-bar': { borderRadius: 5 },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, mb: 2 }}>
              Gastos del mes (todas las categorías): {formatMoney(monthExpenses)}
            </Typography>

            <Divider sx={{ borderColor: '#2a3a4a', mb: 2 }} />

            {rows.map((row) => (
              <Box key={row.category} sx={{ mb: 1.75 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {row.category}
                    </Typography>
                    {row.pct >= 100 && (
                      <Chip
                        label="Excedido"
                        size="small"
                        color="error"
                        sx={{ height: 20, fontSize: '0.62rem', fontWeight: 800 }}
                      />
                    )}
                    {row.pct >= 80 && row.pct < 100 && (
                      <Chip
                        label="Cerca"
                        size="small"
                        color="warning"
                        sx={{ height: 20, fontSize: '0.62rem', fontWeight: 800 }}
                      />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                    <Box component="span" sx={{ color: `${getStatusColor(row.pct)}.main`, fontWeight: 800 }}>
                      {formatMoney(row.spent)}
                    </Box>
                    {' / '}
                    {formatMoney(row.amount)}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(row.pct, 100)}
                  color={getStatusColor(row.pct)}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: '#0f1923',
                    '& .MuiLinearProgress-bar': { borderRadius: 4 },
                  }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.4 }}>
                  <Typography variant="caption" color="text.secondary">
                    {row.pct.toFixed(0)}% usado
                  </Typography>
                  <Typography variant="caption" color={`${getStatusColor(row.pct)}.main`} fontWeight={700}>
                    {row.remaining >= 0
                      ? `Quedan ${formatMoney(row.remaining)}`
                      : `Excedido por ${formatMoney(-row.remaining)}`}
                  </Typography>
                </Box>
              </Box>
            ))}
          </>
        )}
      </Paper>

      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#1a2332', color: 'white', backgroundImage: 'none' } }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>
          Presupuesto mensual
        </DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Definí un límite para cada categoría de gasto. Se repite todos los meses y no se acumula.
          </Typography>
          <Box sx={{ maxHeight: '55vh', overflowY: 'auto', pr: 0.5 }}>
            {categoryOptions.map((category, index) => (
              <Box key={category}>
                {index > 0 && <Divider sx={{ borderColor: '#2a3a4a' }} />}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                  <Typography variant="body2" sx={{ flexGrow: 1, minWidth: 0, fontWeight: 500 }} noWrap>
                    {category}
                  </Typography>
                  <TextField
                    size="small"
                    type="number"
                    placeholder="Sin límite"
                    value={draft[category] ?? ''}
                    onChange={(e) => handleDraftChange(category, e.target.value)}
                    inputProps={{ min: 0, step: '0.01', 'aria-label': `Presupuesto mensual de ${category}` }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                    sx={{ width: isMobile ? 150 : 180 }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'space-between' }}>
          <Button onClick={handleClear} disabled={saving} sx={{ color: '#9aa0a6' }}>
            Limpiar todo
          </Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={() => setDialogOpen(false)} disabled={saving} sx={{ color: '#9aa0a6' }}>
              Cancelar
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              sx={{
                bgcolor: '#00e676',
                color: '#0f1923',
                fontWeight: 700,
                '&:hover': { bgcolor: '#00c853' },
              }}
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default IOBudget;
