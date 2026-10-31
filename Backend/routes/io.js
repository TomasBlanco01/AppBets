const express = require('express');
const {
  getIOMovements,
  createIOMovement,
  updateIOMovement,
  deleteIOMovement,
} = require('../controllers/ioController');
const {
  getRecurring,
  createRecurring,
  updateRecurring,
  deleteRecurring,
} = require('../controllers/ioRecurringController');

const router = express.Router();

// Antes de /:id para que "recurring" no se tome como un id.
router.get('/recurring', getRecurring);
router.post('/recurring', createRecurring);
router.put('/recurring/:id', updateRecurring);
router.delete('/recurring/:id', deleteRecurring);

router.get('/', getIOMovements);
router.post('/', createIOMovement);
router.put('/:id', updateIOMovement);
router.delete('/:id', deleteIOMovement);

module.exports = router;
