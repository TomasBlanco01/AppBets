const express = require('express');
const {
  getIOMovements,
  createIOMovement,
  updateIOMovement,
  deleteIOMovement,
} = require('../controllers/ioController');

const router = express.Router();

router.get('/', getIOMovements);
router.post('/', createIOMovement);
router.put('/:id', updateIOMovement);
router.delete('/:id', deleteIOMovement);

module.exports = router;
