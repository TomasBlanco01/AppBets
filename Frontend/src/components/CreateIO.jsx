import { useState } from 'react';
import {
  Paper, Button, TextField, Container, Box, Typography,
  FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { IO_CATEGORIES, DEFAULT_IO_CATEGORY } from '../constants/ioCategories';

const getArgentinaDate = () => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const y = parts.find(p => p.type === 'year').value;
  const m = parts.find(p => p.type === 'month').value;
  const d = parts.find(p => p.type === 'day').value;
  return `${y}-${m}-${d}`;
};

const CreateIO = ({ addMovement }) => {
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState(DEFAULT_IO_CATEGORY.expense);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getArgentinaDate());
  const [note, setNote] = useState('');

  const handleTypeChange = (newType) => {
    setType(newType);
    setCategory(DEFAULT_IO_CATEGORY[newType]);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!type || !category || !amount || !date) {
      alert('Completá todos los campos obligatorios.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      alert('El monto debe ser un número mayor a 0.');
      return;
    }

    addMovement({ type, category, amount: parsedAmount, date, note: note.trim() });

    setType('expense');
    setCategory(DEFAULT_IO_CATEGORY.expense);
    setAmount('');
    setDate(getArgentinaDate());
    setNote('');
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 0, mb: 2 }}>
      <Paper sx={{ p: 2.5 }}>
        <Typography
          variant="h6"
          align="center"
          sx={{ mb: 2, fontWeight: 700, color: 'primary.main' }}
        >
          <SwapHorizIcon sx={{ fontSize: 26, verticalAlign: 'middle', mr: 0.5 }} /> Nuevo Movimiento I/O
        </Typography>
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 1.5,
            justifyContent: "center",
            alignItems: "center",
            flexWrap: 'wrap',
          }}
        >
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Tipo</InputLabel>
            <Select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value)}
              label="Tipo"
            >
              <MenuItem value="income">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUpIcon color="success" fontSize="small" /> Ingreso
                </Box>
              </MenuItem>
              <MenuItem value="expense">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingDownIcon color="error" fontSize="small" /> Gasto
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel>Categoría</InputLabel>
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              label="Categoría"
            >
              {IO_CATEGORIES[type].map((cat) => (
                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Monto"
            type="number"
            variant="outlined"
            size="small"
            sx={{ minWidth: 150 }}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputProps={{ min: 0, step: '0.01' }}
          />

          <TextField
            label="Fecha"
            type="date"
            variant="outlined"
            size="small"
            sx={{ minWidth: 160 }}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            label="Descripción (opcional)"
            variant="outlined"
            size="small"
            sx={{ minWidth: 220 }}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej: Sueldo, alquiler, supermercado"
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            startIcon={<SendIcon />}
            sx={{ px: 4, minWidth: 140, height: 40 }}
          >
            Agregar
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default CreateIO;
