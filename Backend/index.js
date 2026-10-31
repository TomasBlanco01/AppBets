const app = require('./app');
const { ensureReady } = require('./db/connection');

// Servidor de la API para desarrollo local. El frontend lo sirve Vite
// (`npm run dev` en Frontend, que reenvía /api a este puerto). En producción
// no se usa: Vercel corre la misma app como función (api/index.js).
app.get('/', (req, res) => {
  res.send('Ges.Eco API funcionando 🚀');
});

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
