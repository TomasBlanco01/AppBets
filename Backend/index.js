const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');

const { ready } = require('./db/connection');
const { requireAuth } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const pagesRoutes = require('./routes/pages');
const movementsRoutes = require('./routes/movements');
const betsRoutes = require('./routes/bets');
const tipstersRoutes = require('./routes/tipsters');
const bankrollRoutes = require('./routes/bankroll');
const sportsRoutes = require('./routes/sports');
const exportRoutes = require('./routes/export');

const app = express();

// Render corre la app detrás de un proxy: sin esto, req.ip sería la IP
// interna del proxy y el rate-limit de login no distinguiría clientes.
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.use('/api/pages', requireAuth, pagesRoutes);
app.use('/api/movements', requireAuth, movementsRoutes);
app.use('/api/bets', requireAuth, betsRoutes);
app.use('/api/tipsters', requireAuth, tipstersRoutes);
app.use('/api/bankroll', requireAuth, bankrollRoutes);
app.use('/api/sports', requireAuth, sportsRoutes);
app.use('/api/export', requireAuth, exportRoutes);

// En producción, el frontend ya compilado (Frontend/dist) se sirve desde este
// mismo servidor: una sola app, una sola URL, sin CORS entre front y back.
const FRONTEND_DIST = path.join(__dirname, '../Frontend/dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.use((req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('AppBets API funcionando 🚀');
  });
}

const PORT = process.env.PORT || 3000;
ready
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en puerto ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('No se pudo iniciar el servidor:', err);
    process.exit(1);
  });
