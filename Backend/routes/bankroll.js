const express = require('express');
const { getBankroll, getBankrollHistory, addBankrollEntry } = require('../controllers/bankrollController');

const router = express.Router();

router.get('/', getBankroll);
router.get('/history', getBankrollHistory);
router.post('/', addBankrollEntry);

module.exports = router;
