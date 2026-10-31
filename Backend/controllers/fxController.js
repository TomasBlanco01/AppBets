// Cotizaciones del dólar para mostrar montos en USD.
//
// Histórico: api.argentinadatos.com (una cotización por día hábil).
// Actual: dolarapi.com (se actualiza durante el día).
// Cada movimiento se convierte con la cotización de su fecha, así los totales
// en USD no cambian cuando sube el dólar.
const CASAS = ['blue', 'bolsa', 'oficial'];
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

module.exports = { getRates };
