const { isTokenValid } = require('./sessions');

const requireAuth = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  if (!(await isTokenValid(token))) {
    return res.status(401).json({ message: 'Sesión inválida o expirada' });
  }

  next();
};

module.exports = { requireAuth };
