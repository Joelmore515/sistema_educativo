const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');

router.post('/scan', attendanceController.scanQR);
router.post('/', attendanceController.createAbsence);
router.post('/:id/justify', attendanceController.justifyAbsence);
router.patch('/:id', attendanceController.updateAttendance);
router.delete('/:id', attendanceController.deleteAttendance);
router.get('/', attendanceController.getAllAttendance);

module.exports = router;
