const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentController');

router.post('/', parentController.registerParent);
router.get('/', parentController.getAllParents);
router.put('/:id', parentController.updateParent);
router.delete('/:id', parentController.deleteParent);

module.exports = router;
