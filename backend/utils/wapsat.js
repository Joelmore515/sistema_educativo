const axios = require('axios');
require('dotenv').config();

const sendWhatsApp = async (phone, message) => {
  try {
    // Ejemplo de endpoint típico para gateways de WhatsApp
    // Esto debe ajustarse según la documentación real de Wapsat
    const response = await axios.post('https://api.wapsat.com/v1/send', {
      api_key: process.env.WAPSAT_API_KEY,
      device_id: process.env.WAPSAT_DEVICE_ID,
      phone: phone,
      message: message
    });
    console.log('Mensaje de WhatsApp enviado:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error al enviar WhatsApp (Wapsat):', error.response ? error.response.data : error.message);
    // No lanzamos error para no detener el flujo principal si WhatsApp falla
    return null;
  }
};

module.exports = { sendWhatsApp };
