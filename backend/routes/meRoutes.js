const express = require('express');
const router = express.Router();
const meController = require('../controllers/meController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/profile', meController.getProfile);
router.get('/children', requireRole('padre'), meController.getChildren);
router.get('/student', requireRole('estudiante'), meController.getStudent);
router.get('/attendance', meController.getAttendance);
router.get('/meetings', meController.getMeetings);
router.get('/notifications', meController.getNotifications);

module.exports = router;

