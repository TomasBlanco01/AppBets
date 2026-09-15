const express = require('express');
const { login } = require('../controllers/authController');
const { loginRateLimit } = require('../middleware/loginRateLimit');

const router = express.Router();

router.post('/login', loginRateLimit, login);

module.exports = router;
