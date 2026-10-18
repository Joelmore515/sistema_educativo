const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// Todas las rutas de usuarios requieren autenticación y rol de administrador o director
router.get('/', verifyToken, requireRole('admin', 'director'), userController.getAllUsers);
router.post('/', verifyToken, requireRole('admin'), userController.createUser);
router.put('/:id/password', verifyToken, requireRole('admin'), userController.updatePassword);
router.delete('/:id', verifyToken, requireRole('admin'), userController.deleteUser);

module.exports = router;
