import { useState } from 'react'
import { Container, Paper, Box, Typography, TextField, Button, IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';

const formatMoney = (n) => {
  const sign = n < 0 ? '-$' : '$';
  return `${sign}${Math.abs(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
};

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

// Editar el banco agrega una entrada nueva al historial (con fecha) en vez de
// sobrescribir un valor único — así el gráfico de evolución conserva cada cambio.
const BankrollBar = ({ bankroll, bankrollDate, addBankrollEntry }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(bankroll));
  const [date, setDate] = useState(getArgentinaDate());

  const handleOpenEdit = () => {
    setValue(String(bankroll));
    setDate(getArgentinaDate());
    setEditing(true);
  };

  const handleSave = () => {
    const parsed = parseFloat(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      alert('El banco debe ser un número mayor o igual a 0.');
      return;
    }
    addBankrollEntry(parsed, date);
    setEditing(false);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 2 }}>
      <Paper
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
          flexWrap: 'wrap',
          bgcolor: 'rgba(15,25,35,0.5)',
          border: '1px solid #2a3a4a',
        }}
      >
        <AccountBalanceWalletIcon sx={{ color: 'primary.main' }} />
        <Typography variant="body1" fontWeight={700} color="text.secondary">
          Banco actual:
        </Typography>
        {editing ? (
          <>
            <TextField
              label="Monto"
              type="number"
              size="small"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              inputProps={{ min: 0, step: '0.01' }}
              sx={{ width: 150 }}
            />
            <TextField
              label="Fecha"
              type="date"
              size="small"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 150 }}
            />
            <Button size="small" variant="contained" color="primary" onClick={handleSave}>
              Guardar
            </Button>
            <Button size="small" color="inherit" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </>
        ) : (
          <>
            <Typography variant="h6" fontWeight={800} color="primary.main">
              {formatMoney(bankroll)}
            </Typography>
            {bankrollDate && (
              <Typography variant="caption" color="text.secondary">
                (al {formatDate(bankrollDate)})
              </Typography>
            )}
            <Tooltip title="Registrar nuevo banco">
              <IconButton size="small" color="info" onClick={handleOpenEdit}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Paper>
    </Container>
  );
};

export default BankrollBar;
