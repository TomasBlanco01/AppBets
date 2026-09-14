const express = require('express');
const { getBets, createBet, updateBet, deleteBet } = require('../controllers/betsController');

const router = express.Router();

router.get('/', getBets);
router.post('/', createBet);
router.put('/:id', updateBet);
router.delete('/:id', deleteBet);

module.exports = router;
