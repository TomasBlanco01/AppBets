import { useMemo, lazy, Suspense } from 'react';
import ioService from '../services/io';
import { ioStore } from '../services/ioOffline';
import useOfflineCollection from '../hooks/useOfflineCollection';
import IODashboard from './IODashboard';
import CreateIO from './CreateIO';
import IOList from './IOList';
import OfflineStatus from './OfflineStatus';
import IORecurring from './IORecurring';
import { Container, Divider, Box } from '@mui/material';

// @mui/x-charts es la dependencia más pesada: se descarga recién al abrir I/O.
const IOMonthlyChart = lazy(() => import('./IOMonthlyChart'));
const IOCategoryChart = lazy(() => import('./IOCategoryChart'));

const IOView = () => {
  const {
    items: movements,
    pendingCount,
    serverUnavailable,
    syncError,
    clearSyncError,
    syncing,
    retry,
    refresh,
    add: addMovement,
    update: updateMovement,
    remove: deleteMovement,
  } = useOfflineCollection({ service: ioService, store: ioStore, label: 'I/O movements' });

  const sortedMovements = useMemo(() => {
    return [...movements].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      if (Boolean(a.pending) !== Boolean(b.pending)) return a.pending ? -1 : 1;
      if (a.pending && b.pending) {
        return String(b.clientId || b.id).localeCompare(String(a.clientId || a.id));
      }
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });
  }, [movements]);

  return (
    <>
      <OfflineStatus
        pendingCount={pendingCount}
        serverUnavailable={serverUnavailable}
        syncError={syncError}
        onClearError={clearSyncError}
        syncing={syncing}
        onRetry={retry}
      />

      <IODashboard movements={sortedMovements} />
      {/* Reserva el alto del gráfico para que el formulario no salte al cargarlo */}
      <Suspense fallback={<Box sx={{ minHeight: { xs: 330, sm: 410 }, mb: 3 }} />}>
        <IOMonthlyChart movements={sortedMovements} />
      </Suspense>
      <Suspense fallback={<Box sx={{ minHeight: { xs: 300, sm: 340 }, mb: 3 }} />}>
        <IOCategoryChart movements={sortedMovements} />
      </Suspense>
      <CreateIO addMovement={addMovement} />
      <IORecurring onChanged={refresh} />
      <Container maxWidth="xl">
        <Divider sx={{ borderColor: '#2a3a4a', my: 3 }} />
      </Container>
      <IOList
        movements={sortedMovements}
        updateMovement={updateMovement}
        deleteMovement={deleteMovement}
      />
    </>
  );
};

export default IOView;
