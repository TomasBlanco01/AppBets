// Caché local y cola de salida genérica para colecciones que se pueden
// cargar sin conexión (I/O y movimientos de Bets).
//
// La app puede abrirse y cargarse sin conexión o sin que el backend responda.
// Los registros creados mientras tanto se guardan en la cola (outbox) y se
// reintentan cuando el servidor vuelve. Cada uno lleva un clientId estable
// para que el backend no los duplique si un reintento llega dos veces.

export const readArray = (key) => {
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

export const writeArray = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`No se pudo guardar ${key} en localStorage:`, error);
  }
};

export const createClientId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `cl-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const toPendingItem = (item) => ({
  ...item,
  id: item.clientId,
  pending: true,
});

// `fields` son los campos editables: los metadatos (id, pending, createdAt)
// cambian entre la copia local y la del servidor sin que sea una edición real.
export const createOfflineStore = ({ cacheKey, outboxKey, fields }) => {
  const loadCached = () => readArray(cacheKey);
  const saveCached = (items) => writeArray(cacheKey, items);
  const loadOutbox = () => readArray(outboxKey);
  const saveOutbox = (outbox) => writeArray(outboxKey, outbox);

  const hasChanges = (a, b) => fields.some(
    (field) => String(a?.[field] ?? '') !== String(b?.[field] ?? '')
  );

  // Los pendientes se muestran arriba. Si el servidor ya tiene un registro
  // con el mismo clientId pero los datos locales son más nuevos (el usuario lo
  // editó antes de que terminara el sync), gana la versión local. Si son
  // iguales, gana la del servidor y la cola se limpia en el próximo sync.
  const mergePending = (items, outbox = loadOutbox()) => {
    const safeItems = Array.isArray(items) ? items : [];
    const safeOutbox = Array.isArray(outbox) ? outbox : [];
    const serverByClientId = new Map(
      safeItems
        .filter((item) => !item.pending && item.clientId)
        .map((item) => [item.clientId, item])
    );
    const pending = [];
    const overriddenClientIds = new Set();

    safeOutbox.forEach((item) => {
      const serverCopy = serverByClientId.get(item.clientId);
      if (!serverCopy) {
        pending.push(toPendingItem(item));
        return;
      }
      if (hasChanges(item, serverCopy)) {
        pending.push(toPendingItem(item));
        overriddenClientIds.add(item.clientId);
      }
    });

    const serverItems = safeItems.filter((item) => (
      !item.pending && !overriddenClientIds.has(item.clientId)
    ));

    return [...pending, ...serverItems];
  };

  const enqueue = (item) => {
    const outbox = loadOutbox();
    if (outbox.some((queued) => queued.clientId === item.clientId)) return outbox;

    const next = [...outbox, item];
    saveOutbox(next);
    return next;
  };

  const updateQueued = (clientId, data) => {
    const next = loadOutbox().map((item) => (
      item.clientId === clientId ? { ...item, ...data, clientId } : item
    ));
    saveOutbox(next);
    return next;
  };

  const removeQueued = (clientId) => {
    const next = loadOutbox().filter((item) => item.clientId !== clientId);
    saveOutbox(next);
    return next;
  };

  // Arma el registro que va a la cola con solo los campos editables.
  const pick = (item) => Object.fromEntries(
    fields.map((field) => [field, field === 'note' ? (item.note || '') : item[field]])
  );

  return {
    fields,
    loadCached,
    saveCached,
    loadOutbox,
    saveOutbox,
    hasChanges,
    mergePending,
    enqueue,
    updateQueued,
    removeQueued,
    pick,
  };
};
