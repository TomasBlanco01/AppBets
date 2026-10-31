// Cotizaciones del dólar para mostrar montos en USD.
//
// Histórico: api.argentinadatos.com (una cotización por día hábil).
// Actual: dolarapi.com (se actualiza durante el día).
// Cada movimiento se convierte con la cotización de su fecha, así los totales
// en USD no cambian cuando sube el dólar.
const { all, batch } = require('../db/helpers');

const CASAS = ['blue', 'bolsa', 'oficial'];
// La cotización que queda guardada en cada movimiento (dólar MEP).
const STORED_CASA = 'bolsa';
const CACHE_MS = 60 * 60 * 1000;
const cache = new Map();

const fetchJson = async (url) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`${url} respondió ${response.status}`);
  return response.json();
};

const loadRates = async (casa) => {
  const cached = cache.get(casa);
  if (cached && Date.now() - cached.loadedAt < CACHE_MS) return cached.data;

  const [history, current] = await Promise.all([
    fetchJson(`https://api.argentinadatos.com/v1/cotizaciones/dolares/${casa}`),
    // Si la cotización en vivo falla, alcanza con la última del histórico.
    fetchJson(`https://dolarapi.com/v1/dolares/${casa}`).catch(() => null),
  ]);

  const data = {
    casa,
    // [fecha, venta] ordenado por fecha: ocupa mucho menos que los objetos.
    history: history
      .filter((r) => r.fecha && Number(r.venta) > 0)
      .map((r) => [r.fecha, Number(r.venta)])
      .sort((a, b) => (a[0] < b[0] ? -1 : 1)),
    current: current && Number(current.venta) > 0
      ? { venta: Number(current.venta), updatedAt: current.fechaActualizacion }
      : null,
  };

  cache.set(casa, { data, loadedAt: Date.now() });
  return data;
};

// Cotización del último día hábil <= date. Fechas posteriores al histórico
// (por ejemplo, hoy antes del cierre) usan la cotización en vivo.
const rateForDate = (data, date) => {
  const { history, current } = data;
  const last = history[history.length - 1];
  if (current && (!last || date > last[0])) return current.venta;
  if (!history.length) return null;
  if (date < history[0][0]) return history[0][1];

  let lo = 0;
  let hi = history.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (history[mid][0] <= date) lo = mid;
    else hi = mid - 1;
  }
  return history[lo][1];
};

// Guarda la cotización MEP en los movimientos que todavía no la tienen: los
// recién cargados (queda la del momento de la carga), los generados por fijos,
// los que cambiaron de fecha y, la primera vez, todos los anteriores. Se llama
// al listar; si la API de cotizaciones no responde, se reintenta la próxima vez.
const fillMissingRates = async (table) => {
  const rows = await all(`SELECT id, date FROM ${table} WHERE fxRate IS NULL LIMIT 5000`);
  if (rows.length === 0) return;

  let data;
  try {
    data = await loadRates(STORED_CASA);
  } catch (error) {
    console.error('No se pudo completar la cotización de los movimientos:', error.message);
    return;
  }

  const statements = rows
    .map((row) => ({ row, rate: rateForDate(data, row.date) }))
    .filter(({ rate }) => rate > 0)
    .map(({ row, rate }) => ({
      sql: `UPDATE ${table} SET fxRate = ?, fxCasa = ? WHERE id = ? AND fxRate IS NULL`,
      args: [rate, STORED_CASA, row.id],
    }));

  for (let i = 0; i < statements.length; i += 200) {
    await batch(statements.slice(i, i + 200));
  }
};

// Para tests: evita pedir cotizaciones reales a la API.
const primeRates = (casa, data) => cache.set(casa, { data: { casa, ...data }, loadedAt: Date.now() });

const getRates = async (req, res) => {
  const { casa } = req.params;
  if (!CASAS.includes(casa)) {
    return res.status(400).json({ message: `Cotización inválida. Opciones: ${CASAS.join(', ')}` });
  }

  try {
    const data = await loadRates(casa);
    // El CDN de Vercel guarda la respuesta 6 h y la renueva en segundo plano.
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400');
    res.json(data);
  } catch (error) {
    console.error('Error obteniendo cotizaciones:', error);
    res.status(502).json({ message: 'No se pudo obtener la cotización del dólar' });
  }
};

module.exports = { getRates, fillMissingRates, rateForDate, primeRates, STORED_CASA };
