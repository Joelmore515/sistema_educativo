const QRCode = require('qrcode');

/**
 * Genera un UUID único y su representación en código QR (Base64)
 */
const generateQR = async () => {
  const { v4: uuidv4 } = await import('uuid');
  const uuid = uuidv4();

  try {
    const qrDataURL = await QRCode.toDataURL(uuid);
    return { uuid, qrDataURL };
  } catch (err) {
    console.error('Error al generar QR:', err);
    throw err;
  }
};

module.exports = { generateQR };
