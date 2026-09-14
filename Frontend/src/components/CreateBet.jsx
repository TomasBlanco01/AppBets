import { useState } from 'react'
import {
  Paper, Button, TextField, Container, Box, Typography,
  FormControl, InputLabel, Select, MenuItem, Avatar, Checkbox, ListItemText,
  Dialog, DialogTitle, DialogContent, Tooltip, Chip
} from '@mui/material';
import AddIcon from "@mui/icons-material/Add";
import SendIcon from "@mui/icons-material/Send";
import { PageAvatar, PersonAvatar } from '../App';

const formatMoney = (n) => {
  const sign = n < 0 ? '-$' : '$';
  return `${sign}${Math.abs(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const SPECIAL_OPTION_LABELS = { live: 'En vivo', free_bet: 'Apuesta gratis' };

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

const CreateBet = ({ pages, tipsters, sports, bankroll, addBet, addTipster, addSport }) => {
  const [date, setDate] = useState(getArgentinaDate());
  const [description, setDescription] = useState('');
  const [tipsterId, setTipsterId] = useState('');
  const [pageId, setPageId] = useState('');
  const [sportId, setSportId] = useState('');
  const [specialOptions, setSpecialOptions] = useState([]);
  const [stakePct, setStakePct] = useState('');
  const [amount, setAmount] = useState('');
  const [odds, setOdds] = useState('');

  const [openNewTipster, setOpenNewTipster] = useState(false);
  const [newTipsterName, setNewTipsterName] = useState('');
  const [openNewSport, setOpenNewSport] = useState(false);
  const [newSportName, setNewSportName] = useState('');

  // El Monto y el Stake % se sincronizan contra el banco actual: escribir uno
  // recalcula el otro. Lo que queda guardado en la apuesta es el Monto ($) y el
  // Stake % ya congelado a ese banco — si el banco cambia después, esta apuesta no se toca.
  const handleStakeChange = (value) => {
    setStakePct(value);
    const pct = parseFloat(value);
    if (Number.isFinite(pct) && bankroll > 0) {
      setAmount((bankroll * pct / 100).toFixed(2));
    }
  };

  const handleAmountChange = (value) => {
    setAmount(value);
    const amt = parseFloat(value);
    if (Number.isFinite(amt) && bankroll > 0) {
      setStakePct(((amt / bankroll) * 100).toFixed(2));
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!date || !description.trim() || !pageId || !amount || !odds) {
      alert('Completá fecha, descripción, casa, monto y cuota.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      alert('El monto debe ser un número mayor a 0.');
      return;
    }

    const parsedOdds = parseFloat(odds);
    if (!Number.isFinite(parsedOdds) || parsedOdds < 1) {
      alert('La cuota debe ser un número mayor o igual a 1.');
      return;
    }

    addBet({
      date,
      description: description.trim(),
      tipsterId: tipsterId ? parseInt(tipsterId) : null,
      pageId: parseInt(pageId),
      sportId: sportId ? parseInt(sportId) : null,
      specialOptions,
      stakePct: stakePct === '' ? null : parseFloat(stakePct),
      amount: parsedAmount,
      odds: parsedOdds,
    });

    setDescription('');
    setSpecialOptions([]);
    setStakePct('');
    setAmount('');
    setOdds('');
    setDate(getArgentinaDate());
  };

  const handleSubmitTipster = (event) => {
    event.preventDefault();
    if (newTipsterName.trim() === '') {
      alert('El nombre es obligatorio.');
      return;
    }
    addTipster({ name: newTipsterName.trim() });
    setNewTipsterName('');
    setOpenNewTipster(false);
  };

  const handleSubmitSport = (event) => {
    event.preventDefault();
    if (newSportName.trim() === '') {
      alert('El nombre es obligatorio.');
      return;
    }
    addSport({ name: newSportName.trim() });
    setNewSportName('');
    setOpenNewSport(false);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 0, mb: 2 }}>
      <Paper sx={{ p: 2.5 }}>
        <Typography variant="h6" align="center" sx={{ mb: 2, fontWeight: 700, color: 'primary.main' }}>
          🎯 Nueva Apuesta
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
          <TextField
            label="Fecha"
            type="date"
            variant="outlined"
            size="small"
            sx={{ minWidth: 150 }}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Quién la pasó</InputLabel>
            <Select
              value={tipsterId}
              onChange={(e) => {
                if (e.target.value === "__nueva__") {
                  setOpenNewTipster(true);
                } else {
                  setTipsterId(e.target.value);
                }
              }}
              label="Quién la pasó"
              renderValue={(value) => {
                const tipster = tipsters.find(t => t.id === value);
                return tipster ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonAvatar name={tipster.name} size={20} />
                    {tipster.name}
                  </Box>
                ) : '';
              }}
            >
              {tipsters.map((tipster) => (
                <MenuItem key={tipster.id} value={tipster.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonAvatar name={tipster.name} size={20} />
                    {tipster.name}
                  </Box>
                </MenuItem>
              ))}
              <MenuItem value="__nueva__" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ width: 20, height: 20, bgcolor: 'transparent', color: 'primary.main', fontSize: 16 }}>
                  <AddIcon sx={{ fontSize: 18 }} />
                </Avatar>
                <Typography color="primary.main" fontWeight={600}>Nueva Persona</Typography>
              </MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel>Casa</InputLabel>
            <Select
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
              label="Casa"
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
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Deporte</InputLabel>
            <Select
              value={sportId}
              onChange={(e) => {
                if (e.target.value === "__nuevo__") {
                  setOpenNewSport(true);
                } else {
                  setSportId(e.target.value);
                }
              }}
              label="Deporte"
            >
              <MenuItem value="">
                <Typography color="text.secondary">Sin especificar</Typography>
              </MenuItem>
              {sports.map((sport) => (
                <MenuItem key={sport.id} value={sport.id}>{sport.name}</MenuItem>
              ))}
              <MenuItem value="__nuevo__" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ width: 20, height: 20, bgcolor: 'transparent', color: 'primary.main', fontSize: 16 }}>
                  <AddIcon sx={{ fontSize: 18 }} />
                </Avatar>
                <Typography color="primary.main" fontWeight={600}>Nuevo Deporte</Typography>
              </MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Opciones</InputLabel>
            <Select
              multiple
              value={specialOptions}
              onChange={(e) => setSpecialOptions(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              label="Opciones"
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {selected.map((key) => (
                    <Chip key={key} label={SPECIAL_OPTION_LABELS[key]} size="small" />
                  ))}
                </Box>
              )}
            >
              {Object.entries(SPECIAL_OPTION_LABELS).map(([key, label]) => (
                <MenuItem key={key} value={key}>
                  <Checkbox checked={specialOptions.includes(key)} size="small" />
                  <ListItemText primary={label} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Tooltip title={bankroll > 0 ? `Calculado sobre el banco actual (${formatMoney(bankroll)})` : 'Cargá un banco actual para autocompletar'}>
            <TextField
              label="Stake %"
              type="number"
              variant="outlined"
              size="small"
              sx={{ minWidth: 100 }}
              value={stakePct}
              onChange={(e) => handleStakeChange(e.target.value)}
              inputProps={{ min: 0, step: '0.1' }}
            />
          </Tooltip>

          <TextField
            label="Monto"
            type="number"
            variant="outlined"
            size="small"
            sx={{ minWidth: 130 }}
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            inputProps={{ min: 0, step: '0.01' }}
          />

          <TextField
            label="Cuota"
            type="number"
            variant="outlined"
            size="small"
            sx={{ minWidth: 100 }}
            value={odds}
            onChange={(e) => setOdds(e.target.value)}
            inputProps={{ min: 1, step: '0.01' }}
          />

          <TextField
            label="Descripción de la apuesta"
            variant="outlined"
            size="small"
            sx={{ minWidth: 260, flexGrow: 1 }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Lautaro Martínez 4+ tiros vs Cagliari"
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

      <Dialog open={openNewTipster} onClose={() => setOpenNewTipster(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Nueva Persona</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1, minWidth: 300 }}>
            <TextField
              label="Nombre"
              size="small"
              fullWidth
              value={newTipsterName}
              onChange={(e) => setNewTipsterName(e.target.value)}
              placeholder="Ej: Christian, Buitre, Yo"
              autoFocus
            />
            <Button
              onClick={handleSubmitTipster}
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              fullWidth
            >
              Agregar Persona
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog open={openNewSport} onClose={() => setOpenNewSport(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Nuevo Deporte</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1, minWidth: 300 }}>
            <TextField
              label="Nombre"
              size="small"
              fullWidth
              value={newSportName}
              onChange={(e) => setNewSportName(e.target.value)}
              placeholder="Ej: Fútbol, Tenis, Básquet"
              autoFocus
            />
            <Button
              onClick={handleSubmitSport}
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              fullWidth
            >
              Agregar Deporte
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default CreateBet;
