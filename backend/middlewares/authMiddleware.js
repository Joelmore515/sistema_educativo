const jwt = require('jsonwebtoken');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length < 16) {
    const error = new Error('JWT_SECRET no está configurado o es demasiado corto');
    error.code = 'JWT_CONFIG_ERROR';
    throw error;
  }
  return secret;
};

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'Token de autenticación no proporcionado' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader.trim();

  if (!token) {
    return res.status(401).json({ message: 'Formato de token no válido' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (!decoded || !decoded.id || !decoded.role) {
      return res.status(401).json({ message: 'Token inválido o incompleto' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    if (err.code === 'JWT_CONFIG_ERROR') {
      console.error('[AUTH]', err.message);
      return res.status(500).json({ message: 'Configuración de seguridad incompleta' });
    }
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Acceso denegado: permisos insuficientes' });
    }
    next();
  };
};

module.exports = {
  verifyToken,
  requireRole,
  getJwtSecret
};
