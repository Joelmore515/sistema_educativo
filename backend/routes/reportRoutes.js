const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/general', reportController.getGeneralStats);

module.exports = router;
