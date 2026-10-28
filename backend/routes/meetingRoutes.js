const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meetingController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const {
  meetingSchema,
  updateMeetingSchema,
  scanParentSchema,
  meetingAttendanceSchema,
  updateMeetingAttendanceSchema
} = require('../validators/schemas');
const { auditRoute } = require('../utils/audit');

router.use(verifyToken);

// Lectura de reuniones: cualquier usuario autenticado
router.get('/', meetingController.getAllMeetings);
router.get('/active', meetingController.getActiveMeetings);

// Escritura de reuniones: administración
router.post(
  '/',
  requireRole('admin', 'director'),
  validate(meetingSchema),
  auditRoute('create', 'meeting'),
  meetingController.createMeeting
);
router.put(
  '/:id',
  requireRole('admin', 'director'),
  validate(updateMeetingSchema),
  auditRoute('update', 'meeting'),
  meetingController.updateMeeting
);
router.delete(
  '/:id',
  requireRole('admin', 'director'),
  auditRoute('delete', 'meeting'),
  meetingController.deleteMeeting
);

// Escaneo QR de padres: personal autorizado
router.post(
  '/scan',
  requireRole('admin', 'director', 'docente'),
  validate(scanParentSchema),
  auditRoute('scan', 'meeting'),
  meetingController.scanParentQR
);

// Detalle de asistencia: personal autorizado
router.get(
  '/:id/attendance',
  requireRole('admin', 'director', 'docente'),
  meetingController.getMeetingAttendance
);
router.post(
  '/:id/attendance',
  requireRole('admin', 'director'),
  validate(meetingAttendanceSchema),
  auditRoute('create', 'meeting_attendance'),
  meetingController.manualAddAttendance
);
router.put(
  '/attendance/:attendanceId',
  requireRole('admin', 'director'),
  validate(updateMeetingAttendanceSchema),
  auditRoute('update', 'meeting_attendance'),
  meetingController.updateAttendance
);
router.delete(
  '/attendance/:attendanceId',
  requireRole('admin', 'director'),
  auditRoute('delete', 'meeting_attendance'),
  meetingController.deleteAttendance
);

module.exports = router;
