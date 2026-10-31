const express = require('express');
const cors = require('cors');

const { ensureReady } = require('./db/connection');
const { requireAuth } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const pagesRoutes = require('./routes/pages');
const movementsRoutes = require('./routes/movements');
const betsRoutes = require('./routes/bets');
const ioRoutes = require('./routes/io');
const tipstersRoutes = require('./routes/tipsters');
const bankrollRoutes = require('./routes/bankroll');
const sportsRoutes = require('./routes/sports');
const exportRoutes = require('./routes/export');

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

// En serverless no hay un arranque previo donde migrar la base: la primera
// petición de cada instancia espera a que las tablas estén listas.
app.use('/api', async (req, res, next) => {
  await ensureReady();
  next();
});

app.use('/api/auth', authRoutes);

app.use('/api/pages', requireAuth, pagesRoutes);
app.use('/api/movements', requireAuth, movementsRoutes);
app.use('/api/bets', requireAuth, betsRoutes);
app.use('/api/io', requireAuth, ioRoutes);
app.use('/api/tipsters', requireAuth, tipstersRoutes);
app.use('/api/bankroll', requireAuth, bankrollRoutes);
app.use('/api/sports', requireAuth, sportsRoutes);
app.use('/api/export', requireAuth, exportRoutes);

module.exports = app;
