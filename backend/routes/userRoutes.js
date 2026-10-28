const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const { createUserSchema, updateUserPasswordSchema } = require('../validators/schemas');
const { auditRoute } = require('../utils/audit');

// Todas las rutas de usuarios requieren autenticación y rol de administrador o director
router.get('/', verifyToken, requireRole('admin', 'director'), userController.getAllUsers);
router.post(
  '/',
  verifyToken,
  requireRole('admin'),
  validate(createUserSchema),
  auditRoute('create', 'user'),
  userController.createUser
);
router.put(
  '/:id/password',
  verifyToken,
  requireRole('admin'),
  validate(updateUserPasswordSchema),
  auditRoute('update_password', 'user'),
  userController.updatePassword
);
router.delete(
  '/:id',
  verifyToken,
  requireRole('admin'),
  auditRoute('delete', 'user'),
  userController.deleteUser
);

module.exports = router;
