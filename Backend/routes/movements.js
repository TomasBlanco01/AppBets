const express = require('express');
const { getMovements, createMovement, updateMovement, deleteMovement } = require('../controllers/movementsController');

const router = express.Router();

router.get('/', getMovements);
router.post('/', createMovement);
router.put('/:id', updateMovement);
router.delete('/:id', deleteMovement);

module.exports = router;
