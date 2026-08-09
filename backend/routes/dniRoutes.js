const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/', async (req, res) => {
  try {
    const { dni } = req.body;
    if (!dni || dni.length !== 8) {
      return res.status(400).json({ success: false, message: 'DNI inválido' });
    }

    const response = await axios.post('https://instance-01.apierp.dev/api/dni/', {
      setAuthToken: 'cA3n99ItceJFXXmXxO4NuiYbRR6MW1S5MISvSa8_K8Y',
      numDoc: dni
    });

    if (response.data && response.data.success) {
      return res.json({
        success: true,
        data: response.data.message
      });
    } else {
      return res.status(404).json({
        success: false,
        message: response.data.message || 'Sin Resultados'
      });
    }
  } catch (error) {
    console.error('Error al consultar DNI:', error.message);
    return res.status(500).json({ success: false, message: 'Error al consultar DNI externo' });
  }
});

module.exports = router;
