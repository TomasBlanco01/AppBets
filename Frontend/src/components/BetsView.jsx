import { useState, useEffect, useMemo } from 'react'
import movementService from '../services/movements'
import pageService from '../services/pages'
import { betsStore, loadCachedPages, saveCachedPages } from '../services/betsOffline'
import useOfflineCollection from '../hooks/useOfflineCollection'
import OfflineStatus from './OfflineStatus'
import Dashboard from './Dashboard'
import CreateMovement from './CreateMovement'
import MovementList from './MovementList'
import { Typography, Container, Box, Divider, Tooltip, Paper, Grid, Chip, Button, useMediaQuery } from "@mui/material";
import VisibilityIcon from '@mui/icons-material/Visibility';
import WidgetsIcon from '@mui/icons-material/Widgets';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PageAvatar from './PageAvatar';
import PageDetailDialog from './PageDetailDialog';

const formatMoney = (n) => {
  const sign = n < 0 ? '-$' : '$';
  return `${sign}${Math.abs(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const BetsView = () => {
  const [pages, setPages] = useState(loadCachedPages);
  const [selectedPageId, setSelectedPageId] = useState(null);
  const [detailPageId, setDetailPageId] = useState(null);
  const isMobile = useMediaQuery('(max-width:600px)');

  const {
    items: rawMovements,
    pendingCount,
    serverUnavailable,
    syncError,
    clearSyncError,
    syncing,
    retry,
    add: addMovement,
    update: updateMovement,
    remove: deleteMovement,
  } = useOfflineCollection({ service: movementService, store: betsStore, label: 'bets movements' });

  const refreshPages = () => pageService.getAll()
    .then(response => {
      setPages(response.data);
      saveCachedPages(response.data);
    })
    .catch(error => console.error('Error fetching pages:', error));

  useEffect(() => {
    refreshPages();
  }, []);

  // Los pendientes todavía no tienen el nombre de la casa que agrega el backend.
  const movements = useMemo(() => rawMovements.map(m => (
    m.pageName ? m : { ...m, pageName: pages.find(p => p.id === m.pageId)?.name || '—' }
  )), [rawMovements, pages]);

  const filteredMovements = useMemo(() => {
    const list = selectedPageId === null ? movements : movements.filter(m => m.pageId === selectedPageId);
    // Pendientes primero; después, del más nuevo al más viejo.
    return [...list].sort((a, b) => {
      if (Boolean(a.pending) !== Boolean(b.pending)) return a.pending ? -1 : 1;
      if (a.pending && b.pending) return String(b.createdAt).localeCompare(String(a.createdAt));
      return b.id - a.id;
    });
  }, [movements, selectedPageId]);

  const addPage = (newPage) => {
    pageService.create(newPage)
      .then(() => refreshPages())
      .catch(error => {
        console.error('Error adding page:', error);
        alert('No se pudo crear la página. Revisá la conexión e intentá de nuevo.');
      });
  };

  const totalsByPage = useMemo(() => {
    return pages.map(page => {
      const pageMovs = movements.filter(m => m.pageId === page.id);
      const deposits = pageMovs.filter(m => m.type === 'deposit').reduce((sum, m) => sum + m.amount, 0);
      const withdrawals = pageMovs.filter(m => m.type === 'withdrawal').reduce((sum, m) => sum + m.amount, 0);
      const balance = deposits - withdrawals;
      const profit = withdrawals - deposits;
      const lastDate = pageMovs.reduce((latest, m) => (m.date > latest ? m.date : latest), '') || null;
      return { ...page, deposits, withdrawals, balance, profit, movementCount: pageMovs.length, lastDate };
    }).filter(p => p.deposits > 0 || p.withdrawals > 0);
  }, [pages, movements]);

  const detailPage = useMemo(
    () => totalsByPage.find(p => p.id === detailPageId) || null,
    [totalsByPage, detailPageId]
  );

  const viewPageMovements = (pageId) => {
    setSelectedPageId(pageId);
    setDetailPageId(null);
    setTimeout(() => {
      document.getElementById('movimientos')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  };

  const selectedPageName = selectedPageId
    ? pages.find(p => p.id === selectedPageId)?.name || 'Página'
    : 'General';

  return (
    <>
      <OfflineStatus
        pendingCount={pendingCount}
        serverUnavailable={serverUnavailable}
        syncError={syncError}
        onClearError={clearSyncError}
        syncing={syncing}
        onRetry={() => {
          retry();
          refreshPages();
        }}
      />

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
            <Paper sx={{ p: { xs: 1.5, sm: 2.5 } }}>
              <Typography variant="h6" align="center" sx={{ mb: 2, fontWeight: 700 }}>
                <CurrencyExchangeIcon sx={{ fontSize: 28, verticalAlign: 'middle', mr: 0.5 }} /> Resumen por Página
              </Typography>

              {isMobile ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {totalsByPage.map((page) => (
                    <Paper
                      key={page.id}
                      onClick={() => setDetailPageId(page.id)}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        p: 1.25,
                        bgcolor: 'rgba(15,25,35,0.6)',
                        border: '1px solid #2a3a4a',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        '&:active': { borderColor: '#00e676', bgcolor: 'rgba(0,230,118,0.06)' },
                      }}
                    >
                      <PageAvatar name={page.name} size={44} />
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" fontWeight={700} noWrap>
                          {page.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" component="div" noWrap>
                          Dep.{' '}
                          <Box component="span" sx={{ color: 'error.main', fontWeight: 700 }}>
                            {formatMoney(page.deposits)}
                          </Box>
                          {' · '}
                          Ret.{' '}
                          <Box component="span" sx={{ color: 'success.main', fontWeight: 700 }}>
                            {formatMoney(page.withdrawals)}
                          </Box>
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', fontSize: '0.6rem', textTransform: 'uppercase', fontWeight: 700 }}
                        >
                          Beneficio
                        </Typography>
                        <Typography
                          variant="body2"
                          fontWeight={800}
                          color={page.profit >= 0 ? 'success.main' : 'error.main'}
                        >
                          {formatMoney(page.profit)}
                        </Typography>
                      </Box>
                      <ChevronRightIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </Paper>
                  ))}
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {totalsByPage.map((page) => (
                    <Grid key={page.id} size={{ xs: 12, sm: 6, md: 4 }}>
                      <Paper
                        sx={{
                          p: 2,
                          textAlign: 'center',
                          bgcolor: 'rgba(15,25,35,0.6)',
                          border: '1px solid #2a3a4a',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            borderColor: '#00e676',
                            transform: 'translateY(-2px)',
                            boxShadow: '0 4px 20px rgba(0,230,118,0.15)',
                          },
                        }}
                        onClick={() => setDetailPageId(page.id)}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              setDetailPageId(page.id);
                            }}
                            sx={{ fontSize: '0.7rem', fontWeight: 600 }}
                          >
                            Ver detalle
                          </Button>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
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

      <PageDetailDialog
        page={detailPage}
        open={Boolean(detailPage)}
        onClose={() => setDetailPageId(null)}
        onViewMovements={viewPageMovements}
      />
    </>
  );
};

export default BetsView;
