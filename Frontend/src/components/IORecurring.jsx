import { useState, useEffect, useCallback } from 'react';
import {
  Container, Paper, Typography, Box, Button, IconButton, Tooltip, Chip, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import recurringService from '../services/ioRecurring';
import { IO_CATEGORIES, DEFAULT_IO_CATEGORY } from '../constants/ioCategories';
import { formatMoney } from '../utils/money';
import { todayAR, formatMonthKey } from '../utils/finance';

const emptyForm = () => ({
  type: 'expense',
  category: 'Vivienda',
  amount: '',
  dayOfMonth: '1',
  startMonth: todayAR().slice(0, 7),
  note: '',
});

// Ingresos y gastos fijos: se cargan solos todos los meses en el día elegido.
// Requiere conexión (las plantillas viven en el servidor, que es quien genera
// los movimientos).
const IORecurring = ({ onChanged }) => {
  const [templates, setTemplates] = useState([]);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => recurringService.getAll()
    .then(({ data }) => {
      setTemplates(data);
      setError('');
    })
    .catch(() => setError('No se pudieron cargar los fijos (sin conexión).')), []);

  useEffect(() => {
    load();
  }, [load]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (t) => {
    setEditingId(t.id);
    setForm({
      type: t.type,
      category: t.category,
      amount: String(t.amount),
      dayOfMonth: String(t.dayOfMonth),
      startMonth: t.startMonth,
      note: t.note || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const amount = parseFloat(form.amount);
    const dayOfMonth = parseInt(form.dayOfMonth, 10);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('El monto debe ser un número mayor a 0.');
      return;
    }
    if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
      alert('El día debe estar entre 1 y 31.');
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form, amount, dayOfMonth };
      if (editingId) await recurringService.update(editingId, payload);
      else await recurringService.create(payload);
      setDialogOpen(false);
      await load();
      // Si el día ya pasó este mes, el servidor genera el movimiento al listar.
      onChanged?.();
    } catch (err) {
      alert(err.response?.data?.message || 'No se pudo guardar. Revisá la conexión.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t) => {
    if (!window.confirm(`¿Dejar de cargar "${t.note || t.category}" todos los meses? Los movimientos ya cargados se mantienen.`)) return;
    try {
      await recurringService.remove(t.id);
      await load();
    } catch {
      alert('No se pudo eliminar. Revisá la conexión.');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mb: 3 }}>
      <Paper sx={{ p: { xs: 1.5, sm: 2.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
            <EventRepeatIcon sx={{ fontSize: 24, verticalAlign: 'middle', mr: 0.5 }} /> Fijos mensuales
          </Typography>
          <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={openNew}>
            Agregar
          </Button>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          Se cargan solos cada mes en el día elegido (alquiler, sueldo, suscripciones…).
        </Typography>

        {error && <Alert severity="info" sx={{ mb: 1 }}>{error}</Alert>}

        {templates.length === 0 && !error ? (
          <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
            No hay fijos cargados.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {templates.map((t) => (
              <Paper
                key={t.id}
                sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.25, bgcolor: 'rgba(15,25,35,0.6)', border: '1px solid #2a3a4a' }}
              >
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" fontWeight={700} noWrap>
                    {t.note || t.category}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap', mt: 0.25 }}>
                    <Chip label={t.category} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                    <Typography variant="caption" color="text.secondary">
                      Día {t.dayOfMonth} · desde {formatMonthKey(t.startMonth)}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2" fontWeight={800} color={t.type === 'income' ? 'success.main' : 'error.main'} sx={{ flexShrink: 0 }}>
                  {t.type === 'income' ? '+' : '-'}{formatMoney(t.amount)}
                </Typography>
                <Tooltip title="Editar">
                  <IconButton size="small" color="info" onClick={() => openEdit(t)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Eliminar">
                  <IconButton size="small" color="error" onClick={() => handleDelete(t)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Paper>
            ))}
          </Box>
        )}
      </Paper>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#1a2332', color: 'white', backgroundImage: 'none' } }}
      >
        <DialogTitle>{editingId ? 'Editar fijo' : 'Nuevo fijo mensual'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <ToggleButtonGroup
            exclusive
            fullWidth
            size="small"
            value={form.type}
            onChange={(e, type) => type && setForm((f) => ({ ...f, type, category: DEFAULT_IO_CATEGORY[type] }))}
          >
            <ToggleButton value="expense" color="error">Gasto</ToggleButton>
            <ToggleButton value="income" color="success">Ingreso</ToggleButton>
          </ToggleButtonGroup>
          <FormControl size="small" fullWidth>
            <InputLabel>Categoría</InputLabel>
            <Select
              label="Categoría"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {IO_CATEGORIES[form.type].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField
            label="Descripción (ej. Alquiler)"
            size="small"
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          />
          <TextField
            label="Monto"
            type="number"
            size="small"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            inputProps={{ min: 0, step: '0.01', inputMode: 'decimal' }}
          />
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField
              label="Día del mes"
              type="number"
              size="small"
              value={form.dayOfMonth}
              onChange={(e) => setForm((f) => ({ ...f, dayOfMonth: e.target.value }))}
              inputProps={{ min: 1, max: 31, inputMode: 'numeric' }}
              helperText="Si no existe, el último"
              sx={{ flex: 1 }}
            />
            <TextField
              label="Desde"
              type="month"
              size="small"
              value={form.startMonth}
              onChange={(e) => setForm((f) => ({ ...f, startMonth: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              sx={{ flex: 1.4 }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: '#9aa0a6' }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default IORecurring;
