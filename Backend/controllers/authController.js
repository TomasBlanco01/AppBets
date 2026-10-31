const { signToken } = require('../middleware/sessions');
const { registerFailedAttempt, clearAttempts } = require('../middleware/loginRateLimit');

const login = async (req, res) => {
  const { password } = req.body;

  if (!process.env.APP_PASSWORD || !process.env.JWT_SECRET) {
    console.error('Faltan APP_PASSWORD / JWT_SECRET en el entorno');
    return res.status(500).json({ message: 'El servidor no tiene la autenticación configurada' });
  }

  if (password !== process.env.APP_PASSWORD) {
    await registerFailedAttempt(req.ip);
    return res.status(401).json({ message: 'Contraseña incorrecta' });
  }

  await clearAttempts(req.ip);
  res.json({ token: await signToken() });
};

module.exports = { login };
