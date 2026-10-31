const express = require('express');
const { getRates } = require('../controllers/fxController');

const router = express.Router();

router.get('/:casa', getRates);

module.exports = router;
