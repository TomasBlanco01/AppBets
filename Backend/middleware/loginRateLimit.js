const { get, run } = require('../db/helpers');

// Bloqueo simple por IP tras varios intentos fallidos de login. Se guarda en
// Turso porque en serverless cada petición puede caer en otra instancia y un
// contador en memoria se perdería entre intentos.
const MAX_ATTEMPTS = 5;
const BLOCK_MS = 15 * 60 * 1000;

const loginRateLimit = async (req, res, next) => {
  const entry = await get('SELECT blockedUntil FROM login_attempts WHERE ip = ?', [req.ip]);
  const now = Date.now();

  if (entry?.blockedUntil && entry.blockedUntil > now) {
    const minutesLeft = Math.ceil((entry.blockedUntil - now) / 60000);
    return res.status(429).json({ message: `Demasiados intentos. Probá de nuevo en ${minutesLeft} min.` });
  }

  next();
};

const registerFailedAttempt = async (ip) => {
  const entry = await get('SELECT count FROM login_attempts WHERE ip = ?', [ip]);
  const count = (entry?.count || 0) + 1;
  const blocked = count >= MAX_ATTEMPTS;

  await run(
    `INSERT INTO login_attempts (ip, count, blockedUntil) VALUES (?, ?, ?)
     ON CONFLICT(ip) DO UPDATE SET count = excluded.count, blockedUntil = excluded.blockedUntil`,
    [ip, blocked ? 0 : count, blocked ? Date.now() + BLOCK_MS : null]
  );
};

const clearAttempts = async (ip) => {
  await run('DELETE FROM login_attempts WHERE ip = ?', [ip]);
};

module.exports = { loginRateLimit, registerFailedAttempt, clearAttempts };
