const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const {
  scanStudentSchema,
  createAttendanceSchema,
  justifyAttendanceSchema,
  updateAttendanceSchema
} = require('../validators/schemas');
const { auditRoute } = require('../utils/audit');

const ATTENDANCE_ROLES = ['admin', 'director', 'docente'];

router.use(verifyToken, requireRole(...ATTENDANCE_ROLES));

router.post('/scan', validate(scanStudentSchema), auditRoute('scan', 'attendance'), attendanceController.scanQR);
router.post('/', validate(createAttendanceSchema), auditRoute('create', 'attendance'), attendanceController.createAbsence);
router.post(
  '/:id/justify',
  validate(justifyAttendanceSchema),
  auditRoute('justify', 'attendance'),
  attendanceController.justifyAbsence
);
router.patch(
  '/:id',
  validate(updateAttendanceSchema),
  auditRoute('update', 'attendance'),
  attendanceController.updateAttendance
);
router.delete('/:id', auditRoute('delete', 'attendance'), attendanceController.deleteAttendance);
router.get('/', attendanceController.getAllAttendance);

module.exports = router;
