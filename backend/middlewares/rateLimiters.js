const rateLimit = require('express-rate-limit');

const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const apiLimit = Number(process.env.RATE_LIMIT_MAX || 300);
const authLimit = Number(process.env.AUTH_RATE_LIMIT_MAX || 10);

const apiLimiter = rateLimit({
  windowMs,
  limit: apiLimit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Demasiadas solicitudes. Intenta nuevamente más tarde.' }
});

const authLimiter = rateLimit({
  windowMs,
  limit: authLimit,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: 'Demasiados intentos de autenticación. Intenta nuevamente más tarde.' }
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: Number(process.env.PASSWORD_RESET_RATE_LIMIT_MAX || 5),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Demasiadas solicitudes de recuperación. Intenta nuevamente más tarde.' }
});

module.exports = {
  apiLimiter,
  authLimiter,
  passwordResetLimiter
};
