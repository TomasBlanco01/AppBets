import { useState, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer,
  Paper, Container, Box, Typography, Chip, Pagination, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  FormControl, InputLabel, Select, MenuItem, Grid, useMediaQuery
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import FilterListIcon from '@mui/icons-material/FilterList';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { IO_CATEGORIES, ALL_IO_CATEGORIES, DEFAULT_IO_CATEGORY } from '../constants/ioCategories';
import { formatMoney as formatArs } from '../utils/money';

// Los montos de cada movimiento se muestran siempre en pesos (como se cargaron).
const formatMoney = (n) => formatArs(Math.abs(n));

const formatDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
};

const EMPTY_FILTERS = { dateFrom: '', dateTo: '', type: 'all', category: 'all', note: '' };

const IOList = ({ movements, updateMovement, deleteMovement }) => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState(null);
  const [editType, setEditType] = useState('expense');
  const [editCategory, setEditCategory] = useState(DEFAULT_IO_CATEGORY.expense);
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editNote, setEditNote] = useState('');
  const isMobile = useMediaQuery('(max-width:600px)');
  const movsPorPagina = 8;

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (filters.type !== 'all' && m.type !== filters.type) return false;
      if (filters.category !== 'all' && m.category !== filters.category) return false;
      if (filters.dateFrom && m.date < filters.dateFrom) return false;
      if (filters.dateTo && m.date > filters.dateTo) return false;
      if (filters.note && !(m.note || '').toLowerCase().includes(filters.note.toLowerCase())) return false;
      return true;
    });
  }, [movements, filters]);

  const hasActiveFilters = filters.type !== 'all' || filters.category !== 'all' || filters.dateFrom || filters.dateTo || filters.note;

  const filterCategoryOptions = useMemo(() => {
    const base = filters.type === 'all' ? ALL_IO_CATEGORIES : IO_CATEGORIES[filters.type];
    const known = new Set(base);
    const extra = [...new Set(
      movements
        .filter(m => filters.type === 'all' || m.type === filters.type)
        .map(m => m.category || DEFAULT_IO_CATEGORY[m.type])
        .filter(category => category && !known.has(category))
    )];
    return [...base, ...extra];
  }, [filters.type, movements]);

  const totalPaginas = Math.ceil(filteredMovements.length / movsPorPagina);
  const movsPagina = filteredMovements.slice(
    (page - 1) * movsPorPagina,
    page * movsPorPagina
  );

  const handleFilterChange = (patch) => {
    setFilters(prev => {
      const next = { ...prev, ...patch };
      if (patch.type !== undefined) next.category = 'all';
      return next;
    });
    setPage(1);
  };

  const handleOpenEdit = (mov) => {
    setEditingMovement(mov);
    setEditType(mov.type);
    setEditCategory(mov.category || DEFAULT_IO_CATEGORY[mov.type]);
    setEditAmount(String(mov.amount));
    setEditDate(mov.date);
    setEditNote(mov.note || '');
    setEditDialogOpen(true);
  };

  const handleEditTypeChange = (newType) => {
    setEditType(newType);
    setEditCategory(DEFAULT_IO_CATEGORY[newType]);
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
      type: editType,
      category: editCategory,
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
      <Paper sx={{ p: { xs: 1.5, sm: 2.5 }, overflow: 'hidden' }}>
        <Box>
          <Typography variant="h6" align="center" sx={{ mb: 2, fontWeight: 700, color: 'primary.main' }}>
            <SwapHorizIcon sx={{ fontSize: 24, verticalAlign: 'middle', mr: 0.5 }} /> Movimientos I/O
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
                <MenuItem value="income">Ingreso</MenuItem>
                <MenuItem value="expense">Gasto</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel>Categoría</InputLabel>
              <Select
                value={filters.category}
                label="Categoría"
                onChange={(e) => handleFilterChange({ category: e.target.value })}
              >
                <MenuItem value="all">Todas</MenuItem>
                {filterCategoryOptions.map((cat) => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Buscar en descripción"
              size="small"
              value={filters.note}
              onChange={(e) => handleFilterChange({ note: e.target.value })}
              sx={{ minWidth: 200 }}
            />
            {hasActiveFilters && (
              <Button size="small" color="inherit" onClick={() => handleFilterChange(EMPTY_FILTERS)}>
                Limpiar filtros
              </Button>
            )}
          </Box>

          {filteredMovements.length === 0 ? (
            <Typography align="center" color="text.secondary" sx={{ py: 3 }}>
              {hasActiveFilters ? 'Ningún movimiento coincide con los filtros.' : 'No hay movimientos I/O aún.'}
            </Typography>
          ) : (
            <>
              {isMobile && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', textAlign: 'center', mb: 1 }}
                >
                  Deslizá la tabla hacia los costados para ver todas las columnas →
                </Typography>
              )}
              <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, overflowX: 'auto', WebkitOverflowScrolling: 'touch', bgcolor: 'transparent', border: '1px solid #2a3a4a' }}>
                <Table size="small" sx={{ minWidth: 880, '& .MuiTableCell-root': { whiteSpace: 'nowrap' } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell align="center">Fecha</TableCell>
                      <TableCell align="center">Tipo</TableCell>
                      <TableCell align="center">Categoría</TableCell>
                      <TableCell align="center">Monto</TableCell>
                      <TableCell align="center">Descripción</TableCell>
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
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              label={mov.type === 'income' ? 'Ingreso' : 'Gasto'}
                              color={mov.type === 'income' ? 'success' : 'error'}
                              size="small"
                              variant="outlined"
                              icon={mov.type === 'income'
                                ? <TrendingUpIcon sx={{ fontSize: '16px' }} />
                                : <TrendingDownIcon sx={{ fontSize: '16px' }} />}
                              sx={{ fontWeight: 600, px: 0.5 }}
                            />
                            {mov.pending && (
                              <Chip
                                label="Pendiente"
                                color="warning"
                                size="small"
                                variant="outlined"
                                sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700 }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={mov.category || DEFAULT_IO_CATEGORY[mov.type]}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontWeight: 600,
                              color: mov.type === 'income' ? 'success.light' : 'error.light',
                              borderColor: mov.type === 'income' ? 'rgba(0,230,118,0.35)' : 'rgba(255,23,68,0.35)',
                            }}
                          />
                        </TableCell>
                        <TableCell
                          align="center"
                          sx={{
                            color: mov.type === 'income' ? 'success.main' : 'error.main',
                            fontWeight: 800,
                            fontSize: '0.95rem',
                          }}
                        >
                          {mov.type === 'income' ? '+' : '-'}{formatMoney(mov.amount)}
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
          Editar Movimiento I/O
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select value={editType} label="Tipo" onChange={(e) => handleEditTypeChange(e.target.value)}>
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
              <FormControl size="small" fullWidth>
                <InputLabel>Categoría</InputLabel>
                <Select
                  value={editCategory}
                  label="Categoría"
                  onChange={(e) => setEditCategory(e.target.value)}
                >
                  {(IO_CATEGORIES[editType] || []).map((cat) => (
                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                  ))}
                  {editCategory && !(IO_CATEGORIES[editType] || []).includes(editCategory) && (
                    <MenuItem value={editCategory}>{editCategory}</MenuItem>
                  )}
                </Select>
              </FormControl>
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
                label="Descripción"
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

export default IOList;
