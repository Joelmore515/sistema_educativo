const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const { createStudentSchema, updateStudentSchema } = require('../validators/schemas');
const { auditRoute } = require('../utils/audit');

const READ_ROLES = ['admin', 'director', 'docente'];
const WRITE_ROLES = ['admin', 'director'];

router.get('/', verifyToken, requireRole(...READ_ROLES), studentController.getAllStudents);
router.get('/qr/:uuid', verifyToken, requireRole(...READ_ROLES), studentController.getStudentByQR);
router.post(
  '/',
  verifyToken,
  requireRole(...WRITE_ROLES),
  validate(createStudentSchema),
  auditRoute('create', 'student'),
  studentController.registerStudent
);
router.put(
  '/:id',
  verifyToken,
  requireRole(...WRITE_ROLES),
  validate(updateStudentSchema),
  auditRoute('update', 'student'),
  studentController.updateStudent
);
router.delete(
  '/:id',
  verifyToken,
  requireRole(...WRITE_ROLES),
  auditRoute('delete', 'student'),
  studentController.deleteStudent
);

module.exports = router;
