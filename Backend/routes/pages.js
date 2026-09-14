const express = require('express');
const { getPages, createPage, deletePage } = require('../controllers/pagesController');

const router = express.Router();

router.get('/', getPages);
router.post('/', createPage);
router.delete('/:id', deletePage);

module.exports = router;
