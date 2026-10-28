const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/:uuid', verifyToken, async (req, res) => {
  try {
    const { uuid } = req.params;
    if (!uuid || uuid.length > 100) {
      return res.status(400).json({ message: 'UUID inválido' });
    }
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'private, max-age=300');
    await QRCode.toFileStream(res, uuid);
  } catch (error) {
    console.error('Error al generar QR:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Error al generar QR' });
    }
  }
});

module.exports = router;
