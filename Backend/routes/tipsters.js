const express = require('express');
const { getTipsters, createTipster, deleteTipster } = require('../controllers/tipstersController');

const router = express.Router();

router.get('/', getTipsters);
router.post('/', createTipster);
router.delete('/:id', deleteTipster);

module.exports = router;
