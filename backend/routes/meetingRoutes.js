const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meetingController');

router.get('/', meetingController.getAllMeetings);
router.get('/active', meetingController.getActiveMeetings);
router.post('/', meetingController.createMeeting);
router.post('/scan', meetingController.scanParentQR);
router.put('/:id', meetingController.updateMeeting);
router.delete('/:id', meetingController.deleteMeeting);

module.exports = router;
