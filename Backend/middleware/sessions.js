const jwt = require('jsonwebtoken');
const { get, run } = require('../db/helpers');

// Cada token lleva la "versión de sesión" vigente al iniciar sesión. Cerrar
// sesión en todos los dispositivos sube la versión y los tokens viejos dejan de
// valer. Los tokens emitidos antes de esta función no tienen `v` y cuentan como 0.
const TOKEN_TTL = '90d';
const CACHE_MS = 30 * 1000;
let cached = null;

const getTokenVersion = async () => {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  const row = await get("SELECT value FROM app_settings WHERE key = 'tokenVersion'");
  const value = row ? Number(row.value) : 0;
  cached = { value, at: Date.now() };
  return value;
};

const bumpTokenVersion = async () => {
  const next = (await getTokenVersion()) + 1;
  await run(
    `INSERT INTO app_settings (key, value) VALUES ('tokenVersion', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [String(next)]
  );
  cached = { value: next, at: Date.now() };
  return next;
};

const signToken = async () => jwt.sign({ v: await getTokenVersion() }, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL });

// Devuelve true si el token es válido y de la versión vigente. Otras
// instancias serverless pueden tardar hasta CACHE_MS en enterarse de un cierre global.
const isTokenValid = async (token) => {
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return false;
  }
  return (payload.v || 0) === (await getTokenVersion());
};

module.exports = { signToken, isTokenValid, bumpTokenVersion };
