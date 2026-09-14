const express = require('express');
const { getSports, createSport, deleteSport } = require('../controllers/sportsController');

const router = express.Router();

router.get('/', getSports);
router.post('/', createSport);
router.delete('/:id', deleteSport);

module.exports = router;
