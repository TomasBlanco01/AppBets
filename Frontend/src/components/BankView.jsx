import { useState, useEffect, useMemo } from 'react'
import movementService from '../services/movements'
import pageService from '../services/pages'
import Dashboard from './Dashboard'
import CreateMovement from './CreateMovement'
import MovementList from './MovementList'
import { Typography, Container, Box, Divider, Tooltip, Paper, Grid, Chip, Button } from "@mui/material";
import VisibilityIcon from '@mui/icons-material/Visibility';
import WidgetsIcon from '@mui/icons-material/Widgets';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import { PageAvatar } from '../App';

const formatMoney = (n) => {
  const sign = n < 0 ? '-$' : '$';
  return `${sign}${Math.abs(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const BankView = () => {
  const [movements, setMovements] = useState([]);
  const [pages, setPages] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState(null);

  useEffect(() => {
    movementService.getAll()
      .then(response => setMovements(response.data))
      .catch(error => console.error('Error fetching movements:', error));
  }, []);

  useEffect(() => {
    pageService.getAll()
      .then(response => setPages(response.data))
      .catch(error => console.error('Error fetching pages:', error));
  }, []);

  const filteredMovements = useMemo(() => {
    const list = selectedPageId === null ? movements : movements.filter(m => m.pageId === selectedPageId);
    return [...list].sort((a, b) => b.id - a.id);
  }, [movements, selectedPageId]);

  const addMovement = (newMovement) => {
    movementService.create(newMovement)
      .then(() => movementService.getAll().then(resp => setMovements(resp.data)))
      .catch(error => console.error('Error adding movement:', error));
  };

  const updateMovement = (movementId, data) => {
    movementService.update(movementId, data)
      .then(() => movementService.getAll().then(resp => setMovements(resp.data)))
      .catch(error => console.error('Error updating movement:', error));
  };

  const deleteMovement = (movementId) => {
    movementService.remove(movementId)
      .then(() => setMovements(prev => prev.filter(m => m.id !== movementId)))
      .catch(error => console.error('Error deleting movement:', error));
  };

  const addPage = (newPage) => {
    pageService.create(newPage)
      .then(() => pageService.getAll().then(resp => setPages(resp.data)))
      .catch(error => console.error('Error adding page:', error));
  };

  const totalsByPage = useMemo(() => {
    return pages.map(page => {
      const pageMovs = movements.filter(m => m.pageId === page.id);
      const deposits = pageMovs.filter(m => m.type === 'deposit').reduce((sum, m) => sum + m.amount, 0);
      const withdrawals = pageMovs.filter(m => m.type === 'withdrawal').reduce((sum, m) => sum + m.amount, 0);
      const balance = deposits - withdrawals;
      const profit = withdrawals - deposits;
      return { ...page, deposits, withdrawals, balance, profit };
    }).filter(p => p.deposits > 0 || p.withdrawals > 0);
  }, [pages, movements]);

  const selectedPageName = selectedPageId
    ? pages.find(p => p.id === selectedPageId)?.name || 'Página'
    : 'General';

  return (
    <>
      <Container maxWidth="xl" sx={{ mt: 2 }}>
        <Paper
          sx={{
            display: 'flex',
            gap: 0.5,
            flexWrap: 'wrap',
            justifyContent: 'center',
            mb: 2,
            p: 1,
            bgcolor: 'rgba(15,25,35,0.5)',
            border: '1px solid #2a3a4a',
          }}
        >
          <Tooltip title="General" arrow>
            <Box
              onClick={() => setSelectedPageId(null)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 54,
                height: 54,
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '24px',
                border: selectedPageId === null ? '2px solid #00e676' : '2px solid transparent',
                bgcolor: selectedPageId === null ? 'rgba(0,230,118,0.1)' : 'transparent',
                transition: 'all 0.15s ease',
                '&:hover': { bgcolor: 'rgba(0,230,118,0.05)' },
              }}
            >
              <WidgetsIcon sx={{ fontSize: 24 }} />
            </Box>
          </Tooltip>
          {pages.map(page => (
            <Tooltip key={page.id} title={page.name} arrow>
              <Box
                onClick={() => setSelectedPageId(page.id)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 54,
                  height: 54,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  border: selectedPageId === page.id ? '2px solid #00e676' : '2px solid transparent',
                  bgcolor: selectedPageId === page.id ? 'rgba(0,230,118,0.1)' : 'transparent',
                  transition: 'all 0.15s ease',
                  '&:hover': { bgcolor: 'rgba(0,230,118,0.05)' },
                }}
              >
                <PageAvatar name={page.name} size={38} />
              </Box>
            </Tooltip>
          ))}
        </Paper>
      </Container>

      <Dashboard movements={filteredMovements} />

      <CreateMovement
        pages={pages}
        addMovement={addMovement}
        addPage={addPage}
        defaultPageId={selectedPageId}
      />

      {filteredMovements.length > 0 && totalsByPage.length > 0 && selectedPageId === null && (
        <>
          <Container maxWidth="xl">
            <Divider sx={{ borderColor: '#2a3a4a', my: 3 }} />
          </Container>
          <Container maxWidth="xl" sx={{ mb: 3 }}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="h6" align="center" sx={{ mb: 2, fontWeight: 700 }}>
              <CurrencyExchangeIcon sx={{ fontSize: 28, verticalAlign: 'middle', mr: 0.5 }} /> Resumen por Página
            </Typography>
            <Grid container spacing={2}>
              {totalsByPage.map((page) => (
                <Grid key={page.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Paper
                    sx={{
                      p: 2,
                      textAlign: 'center',
                      bgcolor: 'rgba(15,25,35,0.6)',
                      border: '1px solid #2a3a4a',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: '#00e676',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 4px 20px rgba(0,230,118,0.15)',
                        cursor: 'pointer',
                      },
                    }}
                    onClick={() => setSelectedPageId(page.id)}
                  >
                    <Box sx={{ mx: 'auto', mb: 0.5, width: 48 }}>
                      <PageAvatar name={page.name} size={48} />
                    </Box>
                    <Typography variant="subtitle2" fontWeight={700} color="text.primary" sx={{ mb: 1 }}>
                      {page.name}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 1 }}>
                      <Box>
                        <Typography variant="caption" color="error.main" sx={{ display: 'block', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase' }}>
                          Depositado
                        </Typography>
                        <Typography variant="body2" color="error.main" fontWeight={700}>
                          {formatMoney(page.deposits)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="success.main" sx={{ display: 'block', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase' }}>
                          Retirado
                        </Typography>
                        <Typography variant="body2" color="success.main" fontWeight={700}>
                          {formatMoney(page.withdrawals)}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={`En página: ${formatMoney(page.balance)}`}
                        color={page.balance > 0 ? 'error' : 'success'}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                      />
                      <Chip
                        label={`Beneficio: ${formatMoney(page.profit)}`}
                        color={page.profit >= 0 ? 'success' : 'error'}
                        size="small"
                        variant="filled"
                        sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                      />
                    </Box>
                    <Box sx={{ mt: 1 }}>
                      <Button
                        size="small"
                        variant="text"
                        color="primary"
                        startIcon={<VisibilityIcon />}
                        sx={{ fontSize: '0.7rem', fontWeight: 600 }}
                      >
                        Ver detalle
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Container>
        </>
      )}

      <Container maxWidth="xl">
        <Divider sx={{ borderColor: '#2a3a4a', my: 3 }} />
      </Container>
      <MovementList
        movements={filteredMovements}
        pages={pages}
        updateMovement={updateMovement}
        deleteMovement={deleteMovement}
        selectedPageName={selectedPageName}
      />
    </>
  );
};

export default BankView;
