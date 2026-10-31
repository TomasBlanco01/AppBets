const express = require('express');
const cors = require('cors');

const { ensureReady } = require('./db/connection');
const { requireAuth } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const pagesRoutes = require('./routes/pages');
const movementsRoutes = require('./routes/movements');
const ioRoutes = require('./routes/io');
const exportRoutes = require('./routes/export');
const fxRoutes = require('./routes/fx');

// Solo la API. La usan tanto el servidor local (index.js) como la función
// serverless de Vercel (api/index.js en la raíz del repo).
const app = express();

// En Vercel la app corre detrás de un proxy: sin esto, req.ip sería la IP
// interna del proxy y el rate-limit de login no distinguiría clientes.
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

// Endpoint público y liviano para comprobar que la API responde.
// No requiere autenticación ni consulta la base de datos.
app.get('/health', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ status: 'ok', service: 'geseco', timestamp: new Date().toISOString() });
});

// Cotizaciones públicas del dólar: no necesitan sesión ni base de datos.
app.use('/api/fx', fxRoutes);

// En serverless no hay un arranque previo donde migrar la base: la primera
// petición de cada instancia espera a que las tablas estén listas.
app.use('/api', async (req, res, next) => {
  await ensureReady();
  next();
});

app.use('/api/auth', authRoutes);

app.use('/api/pages', requireAuth, pagesRoutes);
app.use('/api/movements', requireAuth, movementsRoutes);
app.use('/api/io', requireAuth, ioRoutes);
app.use('/api/export', requireAuth, exportRoutes);

module.exports = app;
