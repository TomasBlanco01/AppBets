import { createOfflineStore, readArray, writeArray } from './offlineStore';

export const betsStore = createOfflineStore({
  cacheKey: 'geseco_bets_cache_movements',
  outboxKey: 'geseco_bets_outbox',
  fields: ['pageId', 'type', 'amount', 'date', 'note'],
});

// Las casas también se cachean: sin ellas no se puede elegir dónde cargar un
// movimiento ni mostrar los avatares cuando no hay conexión.
const PAGES_KEY = 'geseco_bets_cache_pages';
export const loadCachedPages = () => readArray(PAGES_KEY);
export const saveCachedPages = (pages) => writeArray(PAGES_KEY, pages);
