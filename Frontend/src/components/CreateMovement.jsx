import { useState, useEffect } from 'react'
import {
  Paper, Button, TextField, Container, Box, Typography,
  FormControl, InputLabel, Select, MenuItem, Avatar,
  Dialog, DialogTitle, DialogContent
} from '@mui/material';
import AddIcon from "@mui/icons-material/Add";
import SendIcon from "@mui/icons-material/Send";
import ArrowCircleDownIcon from '@mui/icons-material/ArrowCircleDown';
import ArrowCircleUpIcon from '@mui/icons-material/ArrowCircleUp';
import { PageAvatar } from '../App';

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

const CreateMovement = ({ pages, addMovement, addPage, defaultPageId }) => {
  const [pageId, setPageId] = useState(defaultPageId || '');
  const [type, setType] = useState('deposit');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getArgentinaDate());
  const [note, setNote] = useState('');

  const [openNewPage, setOpenNewPage] = useState(false);
  const [newPageName, setNewPageName] = useState('');

  useEffect(() => {
    if (defaultPageId) setPageId(defaultPageId);
  }, [defaultPageId]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!pageId || !type || !amount || !date) {
      alert('Completá todos los campos obligatorios.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      alert('El monto debe ser un número mayor a 0.');
      return;
    }

    addMovement({ pageId: parseInt(pageId), type, amount: parsedAmount, date, note });

    if (!defaultPageId) setPageId('');
    setType('deposit');
    setAmount('');
    setDate(getArgentinaDate());
    setNote('');
  };

  const handleSubmitPage = (event) => {
    event.preventDefault();
    if (newPageName.trim() === '') {
      alert('El nombre es obligatorio.');
      return;
    }
    addPage({ name: newPageName.trim() });
    setNewPageName('');
    setOpenNewPage(false);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 0, mb: 2 }}>
      <Paper sx={{ p: 2.5 }}>
        <Typography
          variant="h6"
          align="center"
          sx={{ mb: 2, fontWeight: 700, color: 'primary.main' }}
        >
          {defaultPageId
            ? `💰 Nuevo Movimiento - ${pages.find(p => p.id === defaultPageId)?.name || ''}`
            : '💰 Nuevo Movimiento'}
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
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel>Página</InputLabel>
            <Select
              value={pageId}
              onChange={(e) => {
                if (e.target.value === "__nueva__") {
                  setOpenNewPage(true);
                } else {
                  setPageId(e.target.value);
                }
              }}
              label="Página"
              disabled={!!defaultPageId}
              renderValue={(value) => {
                const page = pages.find(p => p.id === value);
                return page ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PageAvatar name={page.name} size={20} />
                    {page.name}
                  </Box>
                ) : '';
              }}
            >
              {pages.map((page) => (
                <MenuItem key={page.id} value={page.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PageAvatar name={page.name} size={20} />
                    {page.name}
                  </Box>
                </MenuItem>
              ))}
              {!defaultPageId && (
                <MenuItem value="__nueva__" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 20, height: 20, bgcolor: 'transparent', color: 'primary.main', fontSize: 16 }}>
                    <AddIcon sx={{ fontSize: 18 }} />
                  </Avatar>
                  <Typography color="primary.main" fontWeight={600}>Nueva Página</Typography>
                </MenuItem>
              )}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Tipo</InputLabel>
            <Select
              value={type}
              onChange={(e) => setType(e.target.value)}
              label="Tipo"
            >
              <MenuItem value="deposit">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ArrowCircleDownIcon color="error" /> Depósito
                </Box>
              </MenuItem>
              <MenuItem value="withdrawal">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ArrowCircleUpIcon color="success" /> Retiro
                </Box>
              </MenuItem>
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
            label="Nota (opcional)"
            variant="outlined"
            size="small"
            sx={{ minWidth: 180 }}
            value={note}
            onChange={(e) => setNote(e.target.value)}
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

      <Dialog open={openNewPage} onClose={() => setOpenNewPage(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Nueva Página de Apuestas</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1, minWidth: 300 }}>
            <TextField
              label="Nombre"
              size="small"
              fullWidth
              value={newPageName}
              onChange={(e) => setNewPageName(e.target.value)}
              placeholder="Ej: BetPlay, Rushbet, etc."
              autoFocus
            />
            <Button
              onClick={handleSubmitPage}
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              fullWidth
            >
              Agregar Página
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default CreateMovement;
