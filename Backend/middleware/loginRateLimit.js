// Bloqueo simple por IP tras varios intentos fallidos de login. En memoria:
// alcanza para una app de un solo usuario, no necesita persistencia externa.
const attempts = new Map();

const MAX_ATTEMPTS = 5;
const BLOCK_MS = 15 * 60 * 1000;

const loginRateLimit = (req, res, next) => {
  const entry = attempts.get(req.ip);
  const now = Date.now();

  if (entry?.blockedUntil && entry.blockedUntil > now) {
    const minutesLeft = Math.ceil((entry.blockedUntil - now) / 60000);
    return res.status(429).json({ message: `Demasiados intentos. Probá de nuevo en ${minutesLeft} min.` });
  }

  next();
};

const registerFailedAttempt = (ip) => {
  const now = Date.now();
  const entry = attempts.get(ip) || { count: 0 };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_MS;
    entry.count = 0;
  }
  attempts.set(ip, entry);
};

const clearAttempts = (ip) => {
  attempts.delete(ip);
};

module.exports = { loginRateLimit, registerFailedAttempt, clearAttempts };
