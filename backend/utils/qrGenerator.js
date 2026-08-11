const QRCode = require('qrcode');
const { randomUUID } = require('crypto');

/**
 * Genera un UUID único y su representación en código QR (Base64)
 */
const generateQR = async () => {
  const uuid = randomUUID();

  try {
    const qrDataURL = await QRCode.toDataURL(uuid);
    return { uuid, qrDataURL };
  } catch (err) {
    console.error('Error al generar QR:', err);
    throw err;
  }
};

module.exports = { generateQR };
