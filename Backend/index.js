const path = require('path');
const fs = require('fs');
const express = require('express');

const app = require('./app');
const { ensureReady } = require('./db/connection');

// Servidor tradicional (local o Render). En Vercel no se usa: el frontend lo
// sirve el CDN y la API corre como función (api/index.js en la raíz).
// Si existe Frontend/dist, se sirve desde acá: una sola URL, sin CORS.
const FRONTEND_DIST = path.join(__dirname, '../Frontend/dist');
if (fs.existsSync(FRONTEND_DIST)) {
  // El service worker, el HTML y el manifest tienen nombre fijo: si el navegador
  // o un CDN los cachea, la PWA no detecta el deploy nuevo. Los bundles de
  // /assets llevan hash en el nombre, así que pueden cachearse para siempre.
  const NO_CACHE_FILES = new Set(['sw.js', 'registerSW.js', 'index.html', 'manifest.webmanifest']);
  app.use(express.static(FRONTEND_DIST, {
    setHeaders: (res, filePath) => {
      const relative = path.relative(FRONTEND_DIST, filePath).split(path.sep).join('/');
      if (NO_CACHE_FILES.has(relative)) {
        res.set('Cache-Control', 'no-cache');
      } else if (relative.startsWith('assets/')) {
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));
  // Un bundle que ya no existe (de un deploy anterior) debe dar 404, no el
  // index.html: así el frontend detecta el error y recarga la versión nueva.
  app.use('/assets', (req, res) => {
    res.status(404).end();
  });
  app.use((req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('Ges.Eco API funcionando 🚀');
  });
}

const PORT = process.env.PORT || 3000;
ensureReady()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en puerto ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('No se pudo iniciar el servidor:', err);
    process.exit(1);
  });
