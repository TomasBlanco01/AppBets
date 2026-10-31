const express = require('express');
const { login } = require('../controllers/authController');
const {
  listPasskeys,
  registrationOptions,
  registrationVerify,
  authenticationOptions,
  authenticationVerify,
  deletePasskey,
  logoutAll,
} = require('../controllers/passkeyController');
const { loginRateLimit } = require('../middleware/loginRateLimit');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', loginRateLimit, login);

// Entrar con passkey (sin sesión).
router.post('/passkey/login/options', loginRateLimit, authenticationOptions);
router.post('/passkey/login/verify', loginRateLimit, authenticationVerify);

// Administrar passkeys y sesiones (con sesión).
router.get('/passkeys', requireAuth, listPasskeys);
router.post('/passkey/register/options', requireAuth, registrationOptions);
router.post('/passkey/register/verify', requireAuth, registrationVerify);
router.delete('/passkeys/:id', requireAuth, deletePasskey);
router.post('/logout-all', requireAuth, logoutAll);

module.exports = router;
