const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meetingController');

router.get('/', meetingController.getAllMeetings);
router.get('/active', meetingController.getActiveMeetings);
router.post('/', meetingController.createMeeting);
router.post('/scan', meetingController.scanParentQR);
router.put('/:id', meetingController.updateMeeting);
router.delete('/:id', meetingController.deleteMeeting);

// Attendance routes
router.get('/:id/attendance', meetingController.getMeetingAttendance);
router.post('/:id/attendance', meetingController.manualAddAttendance);
router.put('/attendance/:attendanceId', meetingController.updateAttendance);
router.delete('/attendance/:attendanceId', meetingController.deleteAttendance);


module.exports = router;
