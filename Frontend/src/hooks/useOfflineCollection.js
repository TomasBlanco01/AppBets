import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createClientId } from '../services/offlineStore';

// Estado de una colección que se puede cargar sin conexión (I/O o Bets).
//
// - Al abrir, muestra la caché local y después la refresca desde el servidor.
// - Los registros nuevos van primero a la cola local y se sincronizan cuando
//   hay conexión (al volver online, al volver a la app y cada minuto).
// - Editar o eliminar un pendiente solo toca la cola; editar o eliminar uno
//   ya sincronizado requiere conexión.
//
// `service` debe exponer getAll, create(item, config), update(id, data) y remove(id).
const useOfflineCollection = ({ service, store, label }) => {
  const [items, setItems] = useState(() => store.mergePending(store.loadCached()));
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
  // se ven los últimos datos aunque no haya conexión.
  useEffect(() => {
    store.saveCached(items);
  }, [items, store]);

  const pendingCount = useMemo(
    () => items.filter((item) => item.pending).length,
    [items]
  );

  const refreshFromServer = useCallback(async () => {
    const requestId = refreshRequestRef.current + 1;
    refreshRequestRef.current = requestId;

    try {
      const response = await service.getAll();

      // Si mientras tanto se disparó otro refresh (por ejemplo, después de
      // sincronizar un pendiente), ignoramos esta respuesta vieja.
      if (!mountedRef.current || requestId !== refreshRequestRef.current) return false;

      setItems(store.mergePending(response.data));
      setServerUnavailable(false);
      return true;
    } catch (error) {
      if (!mountedRef.current || requestId !== refreshRequestRef.current) return false;

      console.error(`Error fetching ${label}:`, error);
      setServerUnavailable(true);
      return false;
    }
  }, [service, store, label]);

  const syncOutbox = useCallback(async () => {
    if (syncingRef.current) return 'busy';
    if (store.loadOutbox().length === 0) return 'empty';

    syncingRef.current = true;
    setSyncing(true);
    setSyncError('');

    let syncedAny = false;
    let failed = false;
    const attempted = new Set();

    try {
      while (!failed) {
        const item = store.loadOutbox().find((queued) => !attempted.has(queued.clientId));
        if (!item) break;
        attempted.add(item.clientId);

        try {
          const response = await service.create(item, { timeout: 60000 });
          const current = store.loadOutbox().find((queued) => queued.clientId === item.clientId);

          if (!current) {
            // Se eliminó mientras el POST estaba en vuelo: eliminamos también
            // el registro que acaba de crear el servidor.
            try {
              await service.remove(response.data.id);
            } catch (deleteError) {
              if (deleteError.response?.status !== 404) {
                console.error(`Error deleting ${label} after in-flight create:`, deleteError);
                if (mountedRef.current) {
                  setSyncError('No se pudo eliminar un movimiento que se estaba sincronizando.');
                }
              }
            }
            continue;
          }

          if (store.hasChanges(current, item)) {
            // Se editó mientras el POST estaba en vuelo. Lo dejamos en la cola:
            // el próximo sync manda los datos nuevos y el backend actualiza
            // el mismo clientId.
            continue;
          }

          store.removeQueued(item.clientId);
          syncedAny = true;

          if (mountedRef.current) {
            setItems((prev) => prev.map((existing) => (
              existing.clientId === item.clientId
                ? { ...response.data, pending: false }
                : existing
            )));
          }
        } catch (error) {
          const status = error.response?.status;
          console.error(`Error syncing ${label}:`, error);

          if (status && status >= 400 && status < 500 && status !== 401 && status !== 429) {
            // Error de validación: reintentarlo para siempre no sirve.
            store.removeQueued(item.clientId);
            if (mountedRef.current) {
              setItems((prev) => prev.filter((existing) => existing.clientId !== item.clientId));
              setSyncError(error.response?.data?.message || 'No se pudo guardar un movimiento pendiente.');
            }
            continue;
          }

          // 401 lo maneja el interceptor de axios. Para red/5xx/429 dejamos
          // el registro en la cola y reintentamos más adelante.
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
  }, [service, store, label, refreshFromServer]);

  const retry = useCallback(() => {
    refreshFromServer();
    syncOutbox();
  }, [refreshFromServer, syncOutbox]);

  useEffect(() => {
    retry();
  }, [retry]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') retry();
    };

    window.addEventListener('online', retry);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('online', retry);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [retry]);

  // Mientras haya pendientes, reintentamos cada minuto.
  useEffect(() => {
    if (pendingCount === 0) return undefined;
    const interval = setInterval(() => {
      syncOutbox();
    }, 60000);
    return () => clearInterval(interval);
  }, [pendingCount, syncOutbox]);

  const add = (newItem) => {
    const clientId = createClientId();
    const queued = {
      clientId,
      ...store.pick(newItem),
      createdAt: new Date().toISOString(),
    };

    store.enqueue(queued);
    setItems((prev) => [{ ...queued, id: clientId, pending: true }, ...prev]);
    setSyncError('');
    syncOutbox();
  };

  const update = (itemId, data) => {
    const target = items.find((item) => item.id === itemId);

    if (target?.pending) {
      const payload = store.pick({ ...target, ...data });
      store.updateQueued(target.clientId, payload);
      setItems((prev) => prev.map((item) => (
        item.id === itemId ? { ...item, ...payload } : item
      )));
      return Promise.resolve();
    }

    return service.update(itemId, data)
      .then(() => refreshFromServer())
      .catch((error) => {
        console.error(`Error updating ${label}:`, error);
        setSyncError('No se pudo actualizar el movimiento. Revisá la conexión e intentá de nuevo.');
      });
  };

  const remove = (itemId) => {
    const target = items.find((item) => item.id === itemId);

    if (target?.pending) {
      store.removeQueued(target.clientId);
      setItems((prev) => prev.filter((item) => item.id !== itemId));
      return Promise.resolve();
    }

    return service.remove(itemId)
      .then(() => setItems((prev) => prev.filter((item) => item.id !== itemId)))
      .catch((error) => {
        console.error(`Error deleting ${label}:`, error);
        setSyncError('No se pudo eliminar el movimiento. Revisá la conexión e intentá de nuevo.');
      });
  };

  return {
    items,
    pendingCount,
    serverUnavailable,
    syncError,
    clearSyncError: () => setSyncError(''),
    syncing,
    retry,
    refresh: refreshFromServer,
    add,
    update,
    remove,
  };
};

export default useOfflineCollection;
