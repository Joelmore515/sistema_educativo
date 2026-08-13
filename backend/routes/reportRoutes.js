const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

// Estadísticas generales + resumen del día (acepta ?date=YYYY-MM-DD&grade=X)
router.get('/general', reportController.getGeneralStats);

// Detalle de asistencia de un día para exportar (acepta ?date=YYYY-MM-DD&grade=X)
router.get('/detail', reportController.getDetailedAttendance);

module.exports = router;
