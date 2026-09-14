import { useState, useMemo } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  Paper, Container, Box, Typography, Chip, Pagination, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, Grid, Checkbox, ListItemText
} from '@mui/material';
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from '@mui/icons-material/Edit';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import FilterListIcon from '@mui/icons-material/FilterList';
import { PageAvatar, PersonAvatar } from '../App';
import { SPECIAL_OPTION_LABELS } from './CreateBet';

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

const STATUS_LABELS = { pending: 'Pendiente', won: 'Ganada', half_won: 'Medio Ganada', lost: 'Perdida', half_lost: 'Medio Perdida', void: 'Push/Anulada', cashed_out: 'Cashout' };
const STATUS_COLORS = { pending: 'default', won: 'success', half_won: 'success', lost: 'error', half_lost: 'error', void: 'warning', cashed_out: 'info' };

const isFreeCredit = (b) => (b.specialOptions || []).includes('free_bet');

// half_won/half_lost cubren hándicap asiático de cuarto de bola (ej. -0.25): la mitad
// del monto se resuelve a favor y la otra mitad se pierde o se devuelve según el caso.
//
// "Apuesta gratis": el monto nunca fue plata real arriesgada (es un crédito de la casa).
// Si gana, solo se cobra la ganancia neta (no se "devuelve" el monto); si pierde o
// empata, no hay ninguna pérdida real.
//
// "Cashout": se resolvió retirando un monto manual antes de que termine el evento.
// La ganancia/pérdida sale de comparar ese monto retirado contra lo apostado —
// no de la cuota original.
export const profitOf = (b) => {
  if (b.status === 'cashed_out') return (b.cashoutAmount ?? 0) - b.amount;
  if (isFreeCredit(b)) {
    if (b.status === 'won') return b.amount * (b.odds - 1);
    if (b.status === 'half_won') return (b.amount / 2) * (b.odds - 1);
    return 0;
  }
  if (b.status === 'won') return b.amount * (b.odds - 1);
  if (b.status === 'half_won') return (b.amount / 2) * (b.odds - 1);
  if (b.status === 'half_lost') return -(b.amount / 2);
  if (b.status === 'lost') return -b.amount;
  return 0;
};

export const returnOf = (b) => {
  if (b.status === 'cashed_out') return b.cashoutAmount ?? 0;
  if (isFreeCredit(b)) {
    if (b.status === 'won') return b.amount * (b.odds - 1);
    if (b.status === 'half_won') return (b.amount / 2) * (b.odds - 1);
    return 0;
  }
  if (b.status === 'won') return b.amount * b.odds;
  if (b.status === 'half_won') return (b.amount / 2) * b.odds + b.amount / 2;
  if (b.status === 'void') return b.amount;
  if (b.status === 'half_lost') return b.amount / 2;
  return 0;
};

// El monto de una apuesta gratis no era plata real arriesgada: no debe sumar al
// "Total apostado" ni al denominador del ROI.
export const stakedAmountOf = (b) => (isFreeCredit(b) ? 0 : b.amount);

const EMPTY_FILTERS = { status: 'all', tipsterId: 'all', pageId: 'all', sportId: 'all', search: '' };

const BetsList = ({ bets, pages, tipsters, sports, updateBet, deleteBet }) => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingBet, setEditingBet] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [cashoutBet, setCashoutBet] = useState(null);
  const [cashoutValue, setCashoutValue] = useState('');
  const betsPorPagina = 8;

  const filteredBets = useMemo(() => {
    return bets.filter((b) => {
      if (filters.status !== 'all' && b.status !== filters.status) return false;
      if (filters.pageId !== 'all' && b.pageId !== filters.pageId) return false;
      if (filters.tipsterId !== 'all' && b.tipsterId !== filters.tipsterId) return false;
      if (filters.sportId !== 'all' && b.sportId !== filters.sportId) return false;
      if (filters.search && !(b.description || '').toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
  }, [bets, filters]);

  const hasActiveFilters = filters.status !== 'all' || filters.pageId !== 'all' || filters.tipsterId !== 'all' || filters.sportId !== 'all' || filters.search;

  const summary = useMemo(() => {
    const totalApostado = bets.reduce((sum, b) => sum + stakedAmountOf(b), 0);
    const cerradas = bets.filter(b => b.status !== 'pending');
    const totalRetorno = cerradas.reduce((sum, b) => sum + returnOf(b), 0);
    const apostadoCerrado = cerradas.reduce((sum, b) => sum + stakedAmountOf(b), 0);
    const neto = cerradas.reduce((sum, b) => sum + profitOf(b), 0);
    const roi = apostadoCerrado ? (neto / apostadoCerrado) * 100 : 0;
    const ganadas = bets.filter(b => b.status === 'won').length;
    const perdidas = bets.filter(b => b.status === 'lost').length;
    return { totalApostado, totalRetorno, neto, roi, ganadas, perdidas };
  }, [bets]);

  const totalPaginas = Math.ceil(filteredBets.length / betsPorPagina);
  const betsPagina = filteredBets.slice((page - 1) * betsPorPagina, page * betsPorPagina);

  const handleFilterChange = (patch) => {
    setFilters(prev => ({ ...prev, ...patch }));
    setPage(1);
  };

  const handleStatusChange = (bet, status) => {
    if (status === 'cashed_out') {
      setCashoutBet(bet);
      setCashoutValue(bet.cashoutAmount != null ? String(bet.cashoutAmount) : '');
      return;
    }
    updateBet(bet.id, { status });
  };

  const handleConfirmCashout = () => {
    const parsed = parseFloat(cashoutValue);
    if (!Number.isFinite(parsed) || parsed < 0) {
      alert('El monto retirado debe ser un número mayor o igual a 0.');
      return;
    }
    updateBet(cashoutBet.id, { status: 'cashed_out', cashoutAmount: parsed });
    setCashoutBet(null);
    setCashoutValue('');
  };

  const handleOpenEdit = (bet) => {
    setEditingBet(bet);
    setEditForm({
      date: bet.date,
      description: bet.description,
      tipsterId: bet.tipsterId || '',
      pageId: bet.pageId,
      sportId: bet.sportId || '',
      specialOptions: bet.specialOptions || [],
      stakePct: bet.stakePct ?? '',
      amount: String(bet.amount),
      odds: String(bet.odds),
      status: bet.status,
      cashoutAmount: bet.cashoutAmount != null ? String(bet.cashoutAmount) : '',
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingBet || !editForm) return;

    const parsedAmount = parseFloat(editForm.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      alert('El monto debe ser un número mayor a 0.');
      return;
    }
    const parsedOdds = parseFloat(editForm.odds);
    if (!Number.isFinite(parsedOdds) || parsedOdds < 1) {
      alert('La cuota debe ser un número mayor o igual a 1.');
      return;
    }
    if (!editForm.description.trim()) {
      alert('La descripción no puede estar vacía.');
      return;
    }

    let parsedCashoutAmount = null;
    if (editForm.status === 'cashed_out') {
      parsedCashoutAmount = parseFloat(editForm.cashoutAmount);
      if (!Number.isFinite(parsedCashoutAmount) || parsedCashoutAmount < 0) {
        alert('Para Cashout, el monto retirado debe ser un número mayor o igual a 0.');
        return;
      }
    }

    updateBet(editingBet.id, {
      date: editForm.date,
      description: editForm.description.trim(),
      tipsterId: editForm.tipsterId ? parseInt(editForm.tipsterId) : null,
      pageId: parseInt(editForm.pageId),
      sportId: editForm.sportId ? parseInt(editForm.sportId) : null,
      specialOptions: editForm.specialOptions,
      stakePct: editForm.stakePct === '' ? null : parseFloat(editForm.stakePct),
      amount: parsedAmount,
      odds: parsedOdds,
      status: editForm.status,
      cashoutAmount: parsedCashoutAmount,
    });
    setEditDialogOpen(false);
    setEditingBet(null);
  };

  const handleCloseEdit = () => {
    setEditDialogOpen(false);
    setEditingBet(null);
  };

  return (
    <Container maxWidth="xl" sx={{ mb: 3 }}>
      <Paper sx={{ p: 2.5, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.65rem' }}>Total apostado</Typography>
            <Typography variant="h6" fontWeight={800}>{formatMoney(summary.totalApostado)}</Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.65rem' }}>Total retornado</Typography>
            <Typography variant="h6" fontWeight={800}>{formatMoney(summary.totalRetorno)}</Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.65rem' }}>Neto</Typography>
            <Typography variant="h6" fontWeight={800} color={summary.neto >= 0 ? 'success.main' : 'error.main'}>{formatMoney(summary.neto)}</Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.65rem' }}>ROI</Typography>
            <Typography variant="h6" fontWeight={800} color={summary.roi >= 0 ? 'success.main' : 'error.main'}>{summary.roi.toFixed(2)}%</Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.65rem' }}>Ganadas</Typography>
            <Typography variant="h6" fontWeight={800} color="success.main">{summary.ganadas}</Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textTransform: 'uppercase', fontWeight: 700, fontSize: '0.65rem' }}>Perdidas</Typography>
            <Typography variant="h6" fontWeight={800} color="error.main">{summary.perdidas}</Typography>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: 2.5, overflow: 'hidden' }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Typography variant="h6" align="center" sx={{ mb: 2, fontWeight: 700, color: 'primary.main' }}>
            <ReceiptLongIcon sx={{ fontSize: 24, verticalAlign: 'middle', mr: 0.5 }} /> Apuestas
          </Typography>

          <Box
            sx={{
              display: 'flex',
              gap: 1.5,
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
              mb: 2,
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'rgba(15,25,35,0.5)',
              border: '1px solid #2a3a4a',
            }}
          >
            <FilterListIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Estado</InputLabel>
              <Select
                value={filters.status}
                label="Estado"
                onChange={(e) => handleFilterChange({ status: e.target.value })}
              >
                <MenuItem value="all">Todos</MenuItem>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <MenuItem key={value} value={value}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Casa</InputLabel>
              <Select
                value={filters.pageId}
                label="Casa"
                onChange={(e) => handleFilterChange({ pageId: e.target.value })}
              >
                <MenuItem value="all">Todas</MenuItem>
                {pages.map(p => (
                  <MenuItem key={p.id} value={p.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PageAvatar name={p.name} size={20} />
                      {p.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Quién la pasó</InputLabel>
              <Select
                value={filters.tipsterId}
                label="Quién la pasó"
                onChange={(e) => handleFilterChange({ tipsterId: e.target.value })}
              >
                <MenuItem value="all">Todos</MenuItem>
                {tipsters.map(t => (
                  <MenuItem key={t.id} value={t.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonAvatar name={t.name} size={20} />
                      {t.name}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Deporte</InputLabel>
              <Select
                value={filters.sportId}
                label="Deporte"
                onChange={(e) => handleFilterChange({ sportId: e.target.value })}
              >
                <MenuItem value="all">Todos</MenuItem>
                {sports.map(s => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Buscar apuesta"
              size="small"
              value={filters.search}
              onChange={(e) => handleFilterChange({ search: e.target.value })}
              sx={{ minWidth: 180 }}
            />
            {hasActiveFilters && (
              <Button size="small" color="inherit" onClick={() => handleFilterChange(EMPTY_FILTERS)}>
                Limpiar filtros
              </Button>
            )}
          </Box>

          {filteredBets.length === 0 ? (
            <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
              {hasActiveFilters ? 'Ninguna apuesta coincide con los filtros.' : 'No hay apuestas cargadas aún.'}
            </Typography>
          ) : (
            <>
              <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', bgcolor: 'transparent', border: '1px solid #2a3a4a' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell align="center">Fecha</TableCell>
                      <TableCell align="center">Apuesta</TableCell>
                      <TableCell align="center">Quién la pasó</TableCell>
                      <TableCell align="center">Casa</TableCell>
                      <TableCell align="center">Deporte</TableCell>
                      <TableCell align="center">Stake</TableCell>
                      <TableCell align="center">Apostado</TableCell>
                      <TableCell align="center">Cuota</TableCell>
                      <TableCell align="center">Ganancia/Pérdida</TableCell>
                      <TableCell align="center">Estado</TableCell>
                      <TableCell align="center">Acción</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {betsPagina.map((bet) => {
                      const profit = profitOf(bet);
                      return (
                        <TableRow key={bet.id} sx={{ '&:hover': { backgroundColor: '#1e2d3d' }, transition: 'background-color 0.15s ease' }}>
                          <TableCell align="center">
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                              {formatDate(bet.date)}
                            </Typography>
                          </TableCell>
                          <TableCell align="left" sx={{ maxWidth: 220 }}>
                            <Typography variant="body2" fontWeight={600}>{bet.description}</Typography>
                            {bet.specialOptions && bet.specialOptions.length > 0 && (
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                                {bet.specialOptions.map((key) => (
                                  <Chip key={key} label={SPECIAL_OPTION_LABELS[key] || key} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />
                                ))}
                              </Box>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {bet.tipsterName ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, justifyContent: 'center' }}>
                                <PersonAvatar name={bet.tipsterName} size={22} />
                                <Typography variant="body2">{bet.tipsterName}</Typography>
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">—</Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, justifyContent: 'center' }}>
                              <PageAvatar name={bet.pageName} size={22} />
                              <Typography variant="body2">{bet.pageName}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            {bet.sportName ? (
                              <Chip label={bet.sportName} size="small" variant="outlined" />
                            ) : (
                              <Typography variant="body2" color="text.secondary">—</Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">{bet.stakePct ? `${bet.stakePct}%` : '—'}</Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">{formatMoney(bet.amount)}</Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2">{bet.odds.toFixed(2)}</Typography>
                          </TableCell>
                          <TableCell align="center" sx={{ color: profit > 0 ? 'success.main' : profit < 0 ? 'error.main' : 'text.secondary', fontWeight: 800 }}>
                            {profit > 0 ? '+' : ''}{formatMoney(profit)}
                          </TableCell>
                          <TableCell align="center">
                            <FormControl size="small" sx={{ minWidth: 140 }}>
                              <Select
                                value={bet.status}
                                onChange={(e) => handleStatusChange(bet, e.target.value)}
                                sx={{ fontWeight: 700 }}
                              >
                                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                                  <MenuItem key={value} value={value}>
                                    <Chip label={label} color={STATUS_COLORS[value]} size="small" sx={{ fontWeight: 700 }} />
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                              <Tooltip title="Editar apuesta">
                                <IconButton
                                  color="info"
                                  size="small"
                                  onClick={() => handleOpenEdit(bet)}
                                  sx={{ border: '1px solid rgba(33,150,243,0.3)', '&:hover': { backgroundColor: 'rgba(33,150,243,0.1)' } }}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Eliminar apuesta">
                                <IconButton
                                  color="error"
                                  size="small"
                                  onClick={() => {
                                    if (window.confirm('¿Eliminar esta apuesta?')) deleteBet(bet.id);
                                  }}
                                  sx={{ border: '1px solid rgba(255,23,68,0.3)', '&:hover': { backgroundColor: 'rgba(255,23,68,0.1)' } }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              {totalPaginas > 1 && (
                <Box display="flex" justifyContent="center" mt={2}>
                  <Pagination
                    count={totalPaginas}
                    page={page}
                    onChange={(e, value) => setPage(value)}
                    color="primary"
                    size="small"
                    sx={{
                      '& .MuiPaginationItem-root': { color: '#9aa0a6', borderColor: '#2a3a4a' },
                      '& .Mui-selected': { backgroundColor: '#00e676 !important', color: '#0f1923', fontWeight: 700 },
                    }}
                  />
                </Box>
              )}
            </>
          )}
        </Box>
      </Paper>

      <Dialog open={editDialogOpen} onClose={handleCloseEdit} maxWidth="sm" fullWidth
        PaperProps={{ sx: { bgcolor: '#1a2332', color: 'white', backgroundImage: 'none' } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Editar Apuesta</DialogTitle>
        <DialogContent>
          {editForm && (
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Fecha"
                  type="date"
                  size="small"
                  fullWidth
                  value={editForm.date}
                  onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Quién la pasó</InputLabel>
                  <Select
                    value={editForm.tipsterId}
                    label="Quién la pasó"
                    onChange={(e) => setEditForm(prev => ({ ...prev, tipsterId: e.target.value }))}
                    renderValue={(value) => {
                      const t = tipsters.find(ts => ts.id === value);
                      return t ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PersonAvatar name={t.name} size={20} />
                          {t.name}
                        </Box>
                      ) : '';
                    }}
                  >
                    <MenuItem value="">
                      <Typography color="text.secondary">Sin especificar</Typography>
                    </MenuItem>
                    {tipsters.map((t) => (
                      <MenuItem key={t.id} value={t.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PersonAvatar name={t.name} size={20} />
                          {t.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Casa</InputLabel>
                  <Select
                    value={editForm.pageId}
                    label="Casa"
                    onChange={(e) => setEditForm(prev => ({ ...prev, pageId: e.target.value }))}
                    renderValue={(value) => {
                      const p = pages.find(pg => pg.id === value);
                      return p ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PageAvatar name={p.name} size={20} />
                          {p.name}
                        </Box>
                      ) : '';
                    }}
                  >
                    {pages.map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PageAvatar name={p.name} size={20} />
                          {p.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Deporte</InputLabel>
                  <Select
                    value={editForm.sportId}
                    label="Deporte"
                    onChange={(e) => setEditForm(prev => ({ ...prev, sportId: e.target.value }))}
                  >
                    <MenuItem value="">
                      <Typography color="text.secondary">Sin especificar</Typography>
                    </MenuItem>
                    {sports.map((s) => (
                      <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Opciones</InputLabel>
                  <Select
                    multiple
                    value={editForm.specialOptions}
                    label="Opciones"
                    onChange={(e) => setEditForm(prev => ({ ...prev, specialOptions: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value }))}
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
                        <Checkbox checked={editForm.specialOptions.includes(key)} size="small" />
                        <ListItemText primary={label} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Stake %"
                  type="number"
                  size="small"
                  fullWidth
                  value={editForm.stakePct}
                  onChange={(e) => setEditForm(prev => ({ ...prev, stakePct: e.target.value }))}
                  inputProps={{ min: 0, step: '0.1' }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Monto"
                  type="number"
                  size="small"
                  fullWidth
                  value={editForm.amount}
                  onChange={(e) => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
                  inputProps={{ min: 0, step: '0.01' }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  label="Cuota"
                  type="number"
                  size="small"
                  fullWidth
                  value={editForm.odds}
                  onChange={(e) => setEditForm(prev => ({ ...prev, odds: e.target.value }))}
                  inputProps={{ min: 1, step: '0.01' }}
                />
              </Grid>
              <Grid size={12}>
                <TextField
                  label="Descripción"
                  variant="outlined"
                  fullWidth
                  multiline
                  rows={2}
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Estado</InputLabel>
                  <Select
                    value={editForm.status}
                    label="Estado"
                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                  >
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <MenuItem key={value} value={value}>{label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {editForm.status === 'cashed_out' && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Monto retirado (cashout)"
                    type="number"
                    size="small"
                    fullWidth
                    value={editForm.cashoutAmount}
                    onChange={(e) => setEditForm(prev => ({ ...prev, cashoutAmount: e.target.value }))}
                    inputProps={{ min: 0, step: '0.01' }}
                  />
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseEdit} sx={{ color: '#9aa0a6' }}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSaveEdit}
            sx={{ bgcolor: '#00e676', color: '#0f1923', fontWeight: 700, '&:hover': { bgcolor: '#00c853' } }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!cashoutBet} onClose={() => setCashoutBet(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { bgcolor: '#1a2332', color: 'white', backgroundImage: 'none' } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Cashout</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            ¿Cuánto retiraste en el cash out? Se compara contra el monto apostado ({cashoutBet && formatMoney(cashoutBet.amount)}) para calcular la ganancia o pérdida real.
          </Typography>
          <TextField
            label="Monto retirado"
            type="number"
            size="small"
            fullWidth
            autoFocus
            value={cashoutValue}
            onChange={(e) => setCashoutValue(e.target.value)}
            inputProps={{ min: 0, step: '0.01' }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCashoutBet(null)} sx={{ color: '#9aa0a6' }}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleConfirmCashout}
            sx={{ bgcolor: '#00e676', color: '#0f1923', fontWeight: 700, '&:hover': { bgcolor: '#00c853' } }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BetsList;
