const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');

router.get('/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;
    if (!uuid) {
      return res.status(400).send('UUID inválido');
    }
    res.setHeader('Content-Type', 'image/png');
    await QRCode.toFileStream(res, uuid);
  } catch (error) {
    console.error('Error al generar QR:', error);
    res.status(500).send('Error al generar QR');
  }
});

module.exports = router;
