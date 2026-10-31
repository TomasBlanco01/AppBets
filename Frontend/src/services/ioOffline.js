import { createOfflineStore } from './offlineStore';

// Las claves no cambian: así se conservan los pendientes guardados por
// versiones anteriores de la app.
export const ioStore = createOfflineStore({
  cacheKey: 'geseco_io_cache_movements',
  outboxKey: 'geseco_io_outbox',
  fields: ['type', 'category', 'amount', 'date', 'note'],
});
