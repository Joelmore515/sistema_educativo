const AuditLog = require('../models/AuditLog');

const getRequestIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
};

const logAudit = async ({
  req = null,
  userId = null,
  email = null,
  action,
  entity = null,
  entityId = null,
  status = 'success',
  metadata = null
}) => {
  try {
    await AuditLog.create({
      user_id: userId ?? req?.user?.id ?? null,
      email: email ?? req?.user?.email ?? null,
      action,
      entity,
      entity_id: entityId === null || entityId === undefined ? null : String(entityId),
      status,
      ip: req ? getRequestIp(req) : null,
      user_agent: req?.headers?.['user-agent'] || null,
      metadata
    });
  } catch (error) {
    console.error('[AUDIT] No se pudo registrar la acción:', error.message);
  }
};

const auditRoute = (action, entity) => (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    const status = res.statusCode >= 400 ? 'failure' : 'success';
    const entityId = req.params.id || req.params.attendanceId || body?.id || null;

    const auditPromise = logAudit({
      req,
      action,
      entity,
      entityId,
      status,
      metadata: status === 'failure' ? { message: body?.message || 'Error' } : null
    });

    auditPromise.finally(() => originalJson(body));
    return res;
  };

  next();
};

module.exports = {
  logAudit,
  auditRoute,
  getRequestIp
};
