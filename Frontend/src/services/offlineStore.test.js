import { describe, it, expect, beforeEach } from 'vitest';
import { createOfflineStore } from './offlineStore';

// localStorage mínimo en memoria (los tests corren en Node).
beforeEach(() => {
  const data = new Map();
  globalThis.localStorage = {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
});

const makeStore = () => createOfflineStore({
  cacheKey: 'test_cache',
  outboxKey: 'test_outbox',
  fields: ['type', 'amount', 'date', 'note'],
});

const queued = (clientId, amount = 100) => ({ clientId, type: 'expense', amount, date: '2026-10-01', note: '' });

describe('offlineStore', () => {
  it('encola sin duplicar el mismo clientId', () => {
    const store = makeStore();
    store.enqueue(queued('a'));
    store.enqueue(queued('a'));
    expect(store.loadOutbox()).toHaveLength(1);
  });

  it('muestra los pendientes arriba, marcados como pending', () => {
    const store = makeStore();
    store.enqueue(queued('a'));
    const merged = store.mergePending([{ id: 1, type: 'income', amount: 5, date: '2026-09-01', note: '' }]);
    expect(merged.map((m) => [m.id, Boolean(m.pending)])).toEqual([['a', true], [1, false]]);
  });

  it('si el servidor ya tiene el mismo dato, gana la versión del servidor', () => {
    const store = makeStore();
    store.enqueue(queued('a'));
    const merged = store.mergePending([{ id: 7, clientId: 'a', ...queued('a') }]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ id: 7 });
    expect(merged[0].pending).toBeUndefined();
  });

  it('si se editó localmente después de sincronizar, gana la versión local', () => {
    const store = makeStore();
    store.enqueue(queued('a', 999));
    const merged = store.mergePending([{ id: 7, ...queued('a', 100) }]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ id: 'a', amount: 999, pending: true });
  });

  it('editar y quitar de la cola', () => {
    const store = makeStore();
    store.enqueue(queued('a'));
    store.enqueue(queued('b'));
    store.updateQueued('a', { amount: 50 });
    store.removeQueued('b');
    expect(store.loadOutbox()).toEqual([{ ...queued('a'), amount: 50 }]);
  });

  it('pick se queda solo con los campos editables', () => {
    expect(makeStore().pick({ id: 1, pending: true, type: 'expense', amount: 3, date: 'd' }))
      .toEqual({ type: 'expense', amount: 3, date: 'd', note: '' });
  });

  it('localStorage corrupto no rompe la app', () => {
    localStorage.setItem('test_outbox', '{no es json');
    expect(makeStore().loadOutbox()).toEqual([]);
  });
});
