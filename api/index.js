// Función serverless de Vercel: toda la API (/api/* y /health, ver vercel.json)
// la atiende la misma app Express que corre en local.
module.exports = require('../Backend/app');
