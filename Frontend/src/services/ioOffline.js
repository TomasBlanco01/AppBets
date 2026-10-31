// Caché local y cola de salida para I/O.
//
// La app puede abrirse y cargarse sin que el backend esté despierto (Render
// free duerme tras 15 minutos sin tráfico). Los movimientos creados mientras
// tanto se guardan acá y se reintentan cuando el servidor vuelve.

const MOVEMENTS_KEY = 'geseco_io_cache_movements';
const BUDGETS_KEY = 'geseco_io_cache_budgets';
const OUTBOX_KEY = 'geseco_io_outbox';

const readArray = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn(`No se pudo leer ${key} de localStorage:`, error);
    return [];
  }
};

const writeArray = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`No se pudo guardar ${key} en localStorage:`, error);
  }
};

export const loadCachedMovements = () => readArray(MOVEMENTS_KEY);
export const saveCachedMovements = (movements) => writeArray(MOVEMENTS_KEY, movements);

export const loadCachedBudgets = () => readArray(BUDGETS_KEY);
export const saveCachedBudgets = (budgets) => writeArray(BUDGETS_KEY, budgets);

export const loadOutbox = () => readArray(OUTBOX_KEY);
export const saveOutbox = (outbox) => writeArray(OUTBOX_KEY, outbox);

export const createClientId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `io-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const toPendingMovement = (item) => ({
  ...item,
  id: item.clientId,
  pending: true,
});

const MOVEMENT_FIELDS = ['type', 'category', 'amount', 'date', 'note'];

// Compara solo los campos editables: los metadatos (id, pending, createdAt)
// cambian entre la copia local y la del servidor sin que sea una edición real.
export const hasMovementChanges = (a, b) => MOVEMENT_FIELDS.some(
  (field) => String(a?.[field] ?? '') !== String(b?.[field] ?? '')
);

// Los pendientes se muestran arriba. Si el servidor ya tiene un movimiento
// con el mismo clientId pero los datos locales son más nuevos (el usuario lo
// editó antes de que terminara el sync), gana la versión local. Si son
// iguales, gana la del servidor y la cola se limpia en el próximo sync.
export const mergePendingMovements = (movements, outbox = loadOutbox()) => {
  const safeMovements = Array.isArray(movements) ? movements : [];
  const safeOutbox = Array.isArray(outbox) ? outbox : [];
  const serverByClientId = new Map(
    safeMovements
      .filter((item) => !item.pending && item.clientId)
      .map((item) => [item.clientId, item])
  );
  const pending = [];
  const overriddenClientIds = new Set();

  safeOutbox.forEach((item) => {
    const serverCopy = serverByClientId.get(item.clientId);
    if (!serverCopy) {
      pending.push(toPendingMovement(item));
      return;
    }
    if (hasMovementChanges(item, serverCopy)) {
      pending.push(toPendingMovement(item));
      overriddenClientIds.add(item.clientId);
    }
  });

  const serverMovements = safeMovements.filter((item) => (
    !item.pending && !overriddenClientIds.has(item.clientId)
  ));

  return [...pending, ...serverMovements];
};

export const enqueueMovement = (movement) => {
  const outbox = loadOutbox();
  if (outbox.some((item) => item.clientId === movement.clientId)) return outbox;

  const next = [...outbox, movement];
  saveOutbox(next);
  return next;
};

export const updateQueuedMovement = (clientId, data) => {
  const next = loadOutbox().map((item) => (
    item.clientId === clientId ? { ...item, ...data, clientId } : item
  ));
  saveOutbox(next);
  return next;
};

export const removeQueuedMovement = (clientId) => {
  const next = loadOutbox().filter((item) => item.clientId !== clientId);
  saveOutbox(next);
  return next;
};
