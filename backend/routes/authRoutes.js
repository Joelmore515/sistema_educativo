const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Bloqueo explícito del registro público: las cuentas son gestionadas por la administración
router.post('/register', (req, res) => {
  return res.status(403).json({
    message: 'El registro público está deshabilitado. Las cuentas son creadas por la administración del colegio.'
  });
});

router.post('/login', authController.login);

module.exports = router;
