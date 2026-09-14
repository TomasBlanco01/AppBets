import { useState, useMemo } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  Paper, Container, Box, Typography, Chip, Pagination, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, Grid
} from '@mui/material';
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from '@mui/icons-material/Edit';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import FilterListIcon from '@mui/icons-material/FilterList';
import ArrowCircleDownIcon from '@mui/icons-material/ArrowCircleDown';
import ArrowCircleUpIcon from '@mui/icons-material/ArrowCircleUp';
import { PageAvatar } from '../App';

  const formatMoney = (n) => {
    return `$${Math.abs(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

const EMPTY_FILTERS = { dateFrom: '', dateTo: '', type: 'all', note: '' };

const MovementList = ({ movements, pages, updateMovement, deleteMovement, selectedPageName }) => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState(null);
  const [editPageId, setEditPageId] = useState('');
  const [editType, setEditType] = useState('deposit');
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editNote, setEditNote] = useState('');
  const movsPorPagina = 8;

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (filters.type !== 'all' && m.type !== filters.type) return false;
      if (filters.dateFrom && m.date < filters.dateFrom) return false;
      if (filters.dateTo && m.date > filters.dateTo) return false;
      if (filters.note && !(m.note || '').toLowerCase().includes(filters.note.toLowerCase())) return false;
      return true;
    });
  }, [movements, filters]);

  const hasActiveFilters = filters.type !== 'all' || filters.dateFrom || filters.dateTo || filters.note;

  const totalPaginas = Math.ceil(filteredMovements.length / movsPorPagina);
  const movsPagina = filteredMovements.slice(
    (page - 1) * movsPorPagina,
    page * movsPorPagina
  );

  const handleFilterChange = (patch) => {
    setFilters(prev => ({ ...prev, ...patch }));
    setPage(1);
  };

  const handleOpenEdit = (mov) => {
    setEditingMovement(mov);
    setEditPageId(mov.pageId);
    setEditType(mov.type);
    setEditAmount(String(mov.amount));
    setEditDate(mov.date);
    setEditNote(mov.note || '');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingMovement) return;

    const parsedAmount = parseFloat(editAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      alert('El monto debe ser un número mayor a 0.');
      return;
    }
    if (!editDate) {
      alert('La fecha es obligatoria.');
      return;
    }

    updateMovement(editingMovement.id, {
      pageId: parseInt(editPageId),
      type: editType,
      amount: parsedAmount,
      date: editDate,
      note: editNote,
    });
    setEditDialogOpen(false);
    setEditingMovement(null);
  };

  const handleCloseEdit = () => {
    setEditDialogOpen(false);
    setEditingMovement(null);
  };

  return (
    <Container maxWidth="xl" sx={{ mb: 3 }}>
      <Paper sx={{ p: 2.5, overflow: 'hidden' }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Typography variant="h6" align="center" sx={{ mb: 2, fontWeight: 700, color: 'primary.main' }}>
            <ReceiptLongIcon sx={{ fontSize: 24, verticalAlign: 'middle', mr: 0.5 }} /> Movimientos {selectedPageName !== 'General' ? `- ${selectedPageName}` : ''}
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
            <TextField
              label="Desde"
              type="date"
              size="small"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange({ dateFrom: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 150 }}
            />
            <TextField
              label="Hasta"
              type="date"
              size="small"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange({ dateTo: e.target.value })}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 150 }}
            />
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Tipo</InputLabel>
              <Select
                value={filters.type}
                label="Tipo"
                onChange={(e) => handleFilterChange({ type: e.target.value })}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="deposit">Depósito</MenuItem>
                <MenuItem value="withdrawal">Retiro</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Buscar en nota"
              size="small"
              value={filters.note}
              onChange={(e) => handleFilterChange({ note: e.target.value })}
              sx={{ minWidth: 180 }}
            />
            {hasActiveFilters && (
              <Button size="small" color="inherit" onClick={() => handleFilterChange(EMPTY_FILTERS)}>
                Limpiar filtros
              </Button>
            )}
          </Box>

          {filteredMovements.length === 0 ? (
            <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
              {hasActiveFilters ? 'Ningún movimiento coincide con los filtros.' : 'No hay movimientos aún.'}
            </Typography>
          ) : (
            <>
              <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', bgcolor: 'transparent', border: '1px solid #2a3a4a' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="center">Fecha</TableCell>
                    <TableCell align="center">Página</TableCell>
                    <TableCell align="center">Tipo</TableCell>
                    <TableCell align="center">Monto</TableCell>
                    <TableCell align="center">Nota</TableCell>
                    <TableCell align="center">Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {movsPagina.map((mov) => (
                    <TableRow
                      key={mov.id}
                      sx={{
                        '&:hover': { backgroundColor: '#1e2d3d' },
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <TableCell align="center">
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                          {formatDate(mov.date)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={600}>
                          {mov.pageName}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={mov.type === 'deposit' ? 'Depósito' : 'Retiro'}
                          color={mov.type === 'deposit' ? 'error' : 'success'}
                          size="small"
                          variant="outlined"
                          icon={mov.type === 'deposit' ? <ArrowCircleDownIcon sx={{ fontSize: '16px' }} /> : <ArrowCircleUpIcon sx={{ fontSize: '16px' }} />}
                          sx={{ fontWeight: 600, px: 0.5 }}
                        />
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          color: mov.type === 'deposit' ? 'error.main' : 'success.main',
                          fontWeight: 800,
                          fontSize: '0.95rem',
                        }}
                      >
                        {mov.type === 'deposit' ? '-' : '+'}{formatMoney(mov.amount)}
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{ cursor: 'pointer' }}
                        onClick={() => handleOpenEdit(mov)}
                      >
                        <Typography
                          variant="body2"
                          color={mov.note ? 'text.primary' : 'text.secondary'}
                          sx={{ fontStyle: mov.note ? 'normal' : 'italic' }}
                        >
                          {mov.note || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                          <Tooltip title="Editar movimiento">
                            <IconButton
                              color="info"
                              size="small"
                              onClick={() => handleOpenEdit(mov)}
                              sx={{
                                border: '1px solid rgba(33,150,243,0.3)',
                                '&:hover': { backgroundColor: 'rgba(33,150,243,0.1)' },
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar movimiento">
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => {
                                if (window.confirm(`¿Eliminar movimiento de ${formatMoney(mov.amount)}?`)) {
                                  deleteMovement(mov.id);
                                }
                              }}
                              sx={{
                                border: '1px solid rgba(255,23,68,0.3)',
                                '&:hover': { backgroundColor: 'rgba(255,23,68,0.1)' },
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
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
                      '& .MuiPaginationItem-root': {
                        color: '#9aa0a6',
                        borderColor: '#2a3a4a',
                      },
                      '& .Mui-selected': {
                        backgroundColor: '#00e676 !important',
                        color: '#0f1923',
                        fontWeight: 700,
                      },
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
        <DialogTitle sx={{ fontWeight: 700 }}>
          Editar Movimiento
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Página</InputLabel>
                <Select
                  value={editPageId}
                  label="Página"
                  onChange={(e) => setEditPageId(e.target.value)}
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
                <InputLabel>Tipo</InputLabel>
                <Select value={editType} label="Tipo" onChange={(e) => setEditType(e.target.value)}>
                  <MenuItem value="deposit">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ArrowCircleDownIcon color="error" fontSize="small" /> Depósito
                    </Box>
                  </MenuItem>
                  <MenuItem value="withdrawal">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ArrowCircleUpIcon color="success" fontSize="small" /> Retiro
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Monto"
                type="number"
                size="small"
                fullWidth
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                inputProps={{ min: 0, step: '0.01' }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Fecha"
                type="date"
                size="small"
                fullWidth
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                label="Nota"
                variant="outlined"
                fullWidth
                multiline
                rows={3}
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseEdit} sx={{ color: '#9aa0a6' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEdit}
            sx={{
              bgcolor: '#00e676',
              color: '#0f1923',
              fontWeight: 700,
              '&:hover': { bgcolor: '#00c853' },
            }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MovementList;
