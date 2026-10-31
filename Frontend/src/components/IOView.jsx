import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ioService from '../services/io';
import IODashboard from './IODashboard';
import IOMonthlyChart from './IOMonthlyChart';
import IOBudget from './IOBudget';
import CreateIO from './CreateIO';
import IOList from './IOList';
import { Container, Divider, Alert, Button } from '@mui/material';
import {
  loadCachedMovements,
  saveCachedMovements,
  loadCachedBudgets,
  saveCachedBudgets,
  loadOutbox,
  mergePendingMovements,
  enqueueMovement,
  updateQueuedMovement,
  removeQueuedMovement,
  hasMovementChanges,
  createClientId,
} from '../services/ioOffline';

const IOView = () => {
  const [movements, setMovements] = useState(() => mergePendingMovements(loadCachedMovements()));
  const [budgets, setBudgets] = useState(() => loadCachedBudgets());
  const [serverUnavailable, setServerUnavailable] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);
  const mountedRef = useRef(true);
  const refreshRequestRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // La caché se actualiza sola con cada cambio de estado, así al abrir la app
  // se ven los últimos datos aunque el backend todavía esté despertando.
  useEffect(() => {
    saveCachedMovements(movements);
  }, [movements]);

  useEffect(() => {
    saveCachedBudgets(budgets);
  }, [budgets]);

  const pendingCount = useMemo(
    () => movements.filter((movement) => movement.pending).length,
    [movements]
  );

  const refreshFromServer = useCallback(async () => {
    const requestId = refreshRequestRef.current + 1;
    refreshRequestRef.current = requestId;

    const [movementsResult, budgetsResult] = await Promise.allSettled([
      ioService.getAll(),
      ioService.getBudgets(),
    ]);

    // Si mientras tanto se disparó otro refresh (por ejemplo, después de
    // sincronizar un pendiente), ignoramos esta respuesta vieja.
    if (!mountedRef.current || requestId !== refreshRequestRef.current) return false;

    if (movementsResult.status === 'fulfilled') {
      setMovements(mergePendingMovements(movementsResult.value.data));
    } else {
      console.error('Error fetching I/O movements:', movementsResult.reason);
    }

    if (budgetsResult.status === 'fulfilled') {
      setBudgets(Array.isArray(budgetsResult.value.data) ? budgetsResult.value.data : []);
    } else {
      console.error('Error fetching I/O budgets:', budgetsResult.reason);
    }

    const allOk = movementsResult.status === 'fulfilled' && budgetsResult.status === 'fulfilled';
    setServerUnavailable(!allOk);
    return allOk;
  }, []);

  const syncOutbox = useCallback(async () => {
    if (syncingRef.current) return 'busy';
    if (loadOutbox().length === 0) return 'empty';

    syncingRef.current = true;
    setSyncing(true);
    setSyncError('');

    let syncedAny = false;
    let failed = false;
    const attempted = new Set();

    try {
      while (!failed) {
        const item = loadOutbox().find((queued) => !attempted.has(queued.clientId));
        if (!item) break;
        attempted.add(item.clientId);

        try {
          const response = await ioService.create(item, { timeout: 60000 });
          const current = loadOutbox().find((queued) => queued.clientId === item.clientId);

          if (!current) {
            // Se eliminó mientras el POST estaba en vuelo: eliminamos también
            // el registro que acaba de crear el servidor.
            try {
              await ioService.remove(response.data.id);
            } catch (deleteError) {
              if (deleteError.response?.status !== 404) {
                console.error('Error deleting I/O movement after in-flight create:', deleteError);
                if (mountedRef.current) {
                  setSyncError('No se pudo eliminar un movimiento que se estaba sincronizando.');
                }
              }
            }
            continue;
          }

          if (hasMovementChanges(current, item)) {
            // Se editó mientras el POST estaba en vuelo. Dejamos el movimiento
            // en la cola: el próximo sync manda los datos nuevos y el backend
            // actualiza el mismo clientId.
            continue;
          }

          removeQueuedMovement(item.clientId);
          syncedAny = true;

          if (mountedRef.current) {
            setMovements((prev) => prev.map((movement) => (
              movement.clientId === item.clientId
                ? { ...response.data, pending: false }
                : movement
            )));
          }
        } catch (error) {
          const status = error.response?.status;
          console.error('Error syncing I/O movement:', error);

          if (status && status >= 400 && status < 500 && status !== 401 && status !== 429) {
            // Error de validación: reintentarlo para siempre no sirve.
            removeQueuedMovement(item.clientId);
            if (mountedRef.current) {
              setMovements((prev) => prev.filter((movement) => movement.clientId !== item.clientId));
              setSyncError(error.response?.data?.message || 'No se pudo guardar un movimiento pendiente.');
            }
            continue;
          }

          // 401 lo maneja el interceptor de axios. Para red/5xx/429 dejamos
          // el movimiento en la cola y reintentamos más adelante.
          failed = true;
          if (mountedRef.current) setServerUnavailable(true);
        }
      }
    } finally {
      syncingRef.current = false;
      if (mountedRef.current) setSyncing(false);
    }

    if (mountedRef.current && syncedAny && !failed) {
      await refreshFromServer();
    }

    return failed ? 'pending' : 'synced';
  }, [refreshFromServer]);

  useEffect(() => {
    refreshFromServer();
    syncOutbox();
  }, [refreshFromServer, syncOutbox]);

  useEffect(() => {
    const handleOnline = () => {
      refreshFromServer();
      syncOutbox();
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshFromServer();
        syncOutbox();
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshFromServer, syncOutbox]);

  // Mientras haya pendientes, reintentamos cada minuto. Si el backend sigue
  // dormido, el movimiento queda a salvo en localStorage.
  useEffect(() => {
    if (pendingCount === 0) return undefined;
    const interval = setInterval(() => {
      syncOutbox();
    }, 60000);
    return () => clearInterval(interval);
  }, [pendingCount, syncOutbox]);

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

  const addMovement = (newMovement) => {
    const clientId = createClientId();
    const queuedMovement = {
      clientId,
      type: newMovement.type,
      category: newMovement.category,
      amount: newMovement.amount,
      date: newMovement.date,
      note: newMovement.note || '',
      createdAt: new Date().toISOString(),
    };

    enqueueMovement(queuedMovement);
    setMovements((prev) => [{ ...queuedMovement, id: clientId, pending: true }, ...prev]);
    setSyncError('');
    syncOutbox();
  };

  const updateMovement = (movementId, data) => {
    const target = movements.find((movement) => movement.id === movementId);

    if (target?.pending) {
      const payload = {
        type: data.type,
        category: data.category,
        amount: data.amount,
        date: data.date,
        note: data.note || '',
      };
      updateQueuedMovement(target.clientId, payload);
      setMovements((prev) => prev.map((movement) => (
        movement.id === movementId ? { ...movement, ...payload } : movement
      )));
      return Promise.resolve();
    }

    return ioService.update(movementId, data)
      .then(() => refreshFromServer())
      .catch((error) => {
        console.error('Error updating I/O movement:', error);
        setSyncError('No se pudo actualizar el movimiento. Revisá la conexión e intentá de nuevo.');
      });
  };

  const deleteMovement = (movementId) => {
    const target = movements.find((movement) => movement.id === movementId);

    if (target?.pending) {
      removeQueuedMovement(target.clientId);
      setMovements((prev) => prev.filter((movement) => movement.id !== movementId));
      return Promise.resolve();
    }

    return ioService.remove(movementId)
      .then(() => setMovements((prev) => prev.filter((movement) => movement.id !== movementId)))
      .catch((error) => {
        console.error('Error deleting I/O movement:', error);
        setSyncError('No se pudo eliminar el movimiento. Revisá la conexión e intentá de nuevo.');
      });
  };

  const saveBudgets = async (newBudgets) => {
    try {
      const response = await ioService.saveBudgets(newBudgets);
      setBudgets(response.data);
      setServerUnavailable(false);
      return response;
    } catch (error) {
      console.error('Error saving I/O budgets:', error);
      setServerUnavailable(true);
      setSyncError('No se pudieron guardar los presupuestos. Revisá la conexión e intentá de nuevo.');
      throw error;
    }
  };

  return (
    <>
      {(pendingCount > 0 || (serverUnavailable && pendingCount === 0) || syncError) && (
        <Container maxWidth="xl" sx={{ mt: 2 }}>
          {pendingCount > 0 && (
            <Alert
              severity="warning"
              sx={{ mb: 2 }}
              action={(
                <Button
                  color="inherit"
                  size="small"
                  disabled={syncing}
                  onClick={() => {
                    refreshFromServer();
                    syncOutbox();
                  }}
                >
                  {syncing ? 'Sincronizando…' : 'Reintentar'}
                </Button>
              )}
            >
              {pendingCount === 1
                ? 'Hay 1 movimiento guardado localmente. Se sincronizará cuando el servidor esté disponible.'
                : `Hay ${pendingCount} movimientos guardados localmente. Se sincronizarán cuando el servidor esté disponible.`}
            </Alert>
          )}

          {serverUnavailable && pendingCount === 0 && (
            <Alert
              severity="info"
              sx={{ mb: 2 }}
              action={(
                <Button
                  color="inherit"
                  size="small"
                  disabled={syncing}
                  onClick={() => {
                    refreshFromServer();
                    syncOutbox();
                  }}
                >
                  Reintentar
                </Button>
              )}
            >
              No se pudo conectar con el servidor. Podés seguir cargando movimientos; se guardarán localmente.
            </Alert>
          )}

          {syncError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSyncError('')}>
              {syncError}
            </Alert>
          )}
        </Container>
      )}

      <IODashboard movements={sortedMovements} />
      <IOMonthlyChart movements={sortedMovements} />
      <IOBudget movements={sortedMovements} budgets={budgets} onSave={saveBudgets} />
      <CreateIO addMovement={addMovement} />
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
