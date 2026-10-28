const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validate } = require('../middlewares/validate');
const {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} = require('../validators/schemas');
const { authLimiter, passwordResetLimiter } = require('../middlewares/rateLimiters');

// Bloqueo explícito del registro público: las cuentas son gestionadas por la administración
router.post('/register', (req, res) => {
  return res.status(403).json({
    message: 'El registro público está deshabilitado. Las cuentas son creadas por la administración del colegio.'
  });
});

// Manejo explicativo para peticiones GET accidentales desde el navegador
router.get('/login', (req, res) => {
  return res.status(405).json({
    message: 'El método GET no está soportado en este endpoint. El inicio de sesión requiere una petición HTTP POST enviando email y password en el cuerpo (body).'
  });
});

router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);
router.post(
  '/reset-password',
  passwordResetLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword
);

module.exports = router;
