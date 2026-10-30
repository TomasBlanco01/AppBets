const express = require('express');
const {
  getIOMovements,
  createIOMovement,
  updateIOMovement,
  deleteIOMovement,
  getIOBudgets,
  saveIOBudgets,
} = require('../controllers/ioController');

const router = express.Router();

router.get('/budgets', getIOBudgets);
router.put('/budgets', saveIOBudgets);
router.get('/', getIOMovements);
router.post('/', createIOMovement);
router.put('/:id', updateIOMovement);
router.delete('/:id', deleteIOMovement);

module.exports = router;
