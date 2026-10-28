const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

const { User, Role, PasswordResetToken } = require('../models');
const sequelize = require('../config/db');
const { sendEmail } = require('../utils/mailer');
const { logAudit } = require('../utils/audit');
const { getJwtSecret } = require('../middlewares/authMiddleware');
const {
  getLockStatus,
  recordFailure,
  recordSuccess
} = require('../utils/loginGuard');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const getClientUrl = () => (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

exports.register = async (req, res) => {
  try {
    const { email, password, roleName } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    const role = await Role.findOne({ where: { name: roleName } });
    if (!role) {
      return res.status(400).json({ message: 'Rol no válido' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashedPassword,
      role_id: role.id
    });

    res.status(201).json({ message: 'Usuario registrado con éxito', userId: user.id });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';

  try {
    const lockStatus = getLockStatus(email, ip);
    if (lockStatus.locked) {
      res.set('Retry-After', String(lockStatus.retryAfterSeconds));
      return res.status(429).json({
        message: `Demasiados intentos fallidos. Intenta nuevamente en ${Math.ceil(lockStatus.retryAfterSeconds / 60)} minuto(s).`
      });
    }

    const user = await User.findOne({
      where: { email },
      include: [{ model: Role }]
    });

    if (!user) {
      recordFailure(email, ip);
      await logAudit({
        req,
        email,
        action: 'login_failed',
        entity: 'user',
        status: 'failure',
        metadata: { reason: 'invalid_credentials' }
      });
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      recordFailure(email, ip);
      await logAudit({
        req,
        userId: user.id,
        email: user.email,
        action: 'login_failed',
        entity: 'user',
        entityId: user.id,
        status: 'failure',
        metadata: { reason: 'invalid_credentials' }
      });
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    if (!user.Role || !user.Role.name) {
      recordFailure(email, ip);
      await logAudit({
        req,
        userId: user.id,
        email: user.email,
        action: 'login_failed',
        entity: 'user',
        entityId: user.id,
        status: 'failure',
        metadata: { reason: 'missing_role' }
      });
      return res.status(403).json({
        message: 'Tu usuario no tiene un rol asignado. Contacta a la administración del colegio.'
      });
    }

    const token = jwt.sign(
      { id: user.id, role: user.Role.name, email: user.email },
      getJwtSecret(),
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    recordSuccess(email, ip);
    await logAudit({
      req,
      userId: user.id,
      email: user.email,
      action: 'login_success',
      entity: 'user',
      entityId: user.id
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.Role.name
      }
    });
  } catch (error) {
    if (error.code === 'JWT_CONFIG_ERROR') {
      console.error('[AUTH]', error.message);
      return res.status(500).json({ message: 'Configuración de seguridad incompleta' });
    }
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  const genericMessage = 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.';

  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.json({ message: genericMessage });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiresMinutes = Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES || 60);
    const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

    await PasswordResetToken.destroy({ where: { user_id: user.id } });
    await PasswordResetToken.create({
      user_id: user.id,
      token_hash: hashToken(rawToken),
      expires_at: expiresAt
    });

    const resetUrl = `${getClientUrl()}/reset-password?token=${rawToken}`;
    const subject = 'Recuperación de contraseña - EduControl';
    const text = `Hola,\n\nRecibimos una solicitud para restablecer tu contraseña. Usa este enlace (válido por ${expiresMinutes} minutos):\n\n${resetUrl}\n\nSi no solicitaste este cambio, ignora este correo.`;
    const html = `
      <p>Hola,</p>
      <p>Recibimos una solicitud para restablecer tu contraseña. El enlace es válido por <strong>${expiresMinutes} minutos</strong>.</p>
      <p><a href="${resetUrl}">Restablecer contraseña</a></p>
      <p>Si no solicitaste este cambio, ignora este correo.</p>
    `;

    try {
      await sendEmail(email, subject, text, html);
    } catch (mailError) {
      console.error('[AUTH] No se pudo enviar el correo de recuperación:', mailError.message);
    }

    await logAudit({
      req,
      userId: user.id,
      email: user.email,
      action: 'password_reset_requested',
      entity: 'user',
      entityId: user.id
    });

    res.json({ message: genericMessage });
  } catch (error) {
    res.status(500).json({ message: 'No se pudo procesar la solicitud' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const tokenHash = hashToken(token);

    const resetToken = await PasswordResetToken.findOne({
      where: {
        token_hash: tokenHash,
        used_at: null,
        expires_at: { [Op.gt]: new Date() }
      }
    });

    if (!resetToken) {
      return res.status(400).json({ message: 'El enlace de recuperación es inválido o expiró' });
    }

    const user = await User.findByPk(resetToken.user_id);
    if (!user) {
      return res.status(400).json({ message: 'El enlace de recuperación es inválido o expiró' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await sequelize.transaction(async (transaction) => {
      await user.update({ password: hashedPassword }, { transaction });
      await PasswordResetToken.update(
        { used_at: new Date() },
        { where: { id: resetToken.id }, transaction }
      );
      await PasswordResetToken.destroy({
        where: { user_id: user.id, id: { [Op.ne]: resetToken.id } },
        transaction
      });
    });

    await logAudit({
      req,
      userId: user.id,
      email: user.email,
      action: 'password_reset_completed',
      entity: 'user',
      entityId: user.id
    });

    res.json({ message: 'Contraseña actualizada con éxito. Ya puedes iniciar sesión.' });
  } catch (error) {
    res.status(500).json({ message: 'No se pudo restablecer la contraseña' });
  }
};
