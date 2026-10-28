const express = require('express');
const router = express.Router();
const axios = require('axios');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validate');
const { dniSchema } = require('../validators/schemas');
const { auditRoute } = require('../utils/audit');

const CACHE_TTL_MS = Number(process.env.DNI_CACHE_TTL_MS || 24 * 60 * 60 * 1000);
const CACHE_MAX_ENTRIES = Number(process.env.DNI_CACHE_MAX_ENTRIES || 1000);
const DNI_API_URL = process.env.DNI_API_URL || 'https://instance-01.apierp.dev/api/dni/';
const cache = new Map();

const getCached = (dni) => {
  const entry = cache.get(dni);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    cache.delete(dni);
    return null;
  }

  return entry.data;
};

const setCached = (dni, data) => {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) {
      cache.delete(oldestKey);
    }
  }
  cache.set(dni, { data, expiresAt: Date.now() + CACHE_TTL_MS });
};

router.post(
  '/',
  verifyToken,
  requireRole('admin', 'director', 'docente'),
  validate(dniSchema),
  auditRoute('consult', 'dni'),
  async (req, res) => {
    try {
      const { dni } = req.body;
      const cached = getCached(dni);
      if (cached) {
        return res.json({ success: true, data: cached, cached: true });
      }

      const apiKey = process.env.DNI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          success: false,
          message: 'La consulta de DNI no está configurada en el servidor'
        });
      }

      const response = await axios.post(
        DNI_API_URL,
        { setAuthToken: apiKey, numDoc: dni },
        { timeout: Number(process.env.DNI_API_TIMEOUT_MS || 8000) }
      );

      if (response.data && response.data.success) {
        setCached(dni, response.data.message);
        return res.json({
          success: true,
          data: response.data.message
        });
      }

      return res.status(404).json({
        success: false,
        message: response.data?.message || 'Sin resultados'
      });
    } catch (error) {
      console.error('Error al consultar DNI:', error.message);
      const status = error.code === 'ECONNABORTED' ? 504 : 500;
      return res.status(status).json({
        success: false,
        message: status === 504
          ? 'La consulta de DNI tardó demasiado'
          : 'Error al consultar DNI externo'
      });
    }
  }
);

module.exports = router;
