const { Op } = require('sequelize');
const { Parent, Student, StudentParent } = require('../models');

const FAMILY_ROLES = ['padre', 'estudiante'];

const isFamilyRole = (role) => FAMILY_ROLES.includes(role);

const resolveFamilyScope = async (user) => {
  if (!user || !isFamilyRole(user.role)) {
    return { role: user?.role || null, parentId: null, studentIds: null };
  }

  if (user.role === 'padre') {
    const parent = await Parent.findOne({
      where: { user_id: user.id },
      attributes: ['id']
    });

    if (!parent) {
      return { role: user.role, parentId: null, studentIds: [] };
    }

    const links = await StudentParent.findAll({
      where: { parent_id: parent.id },
      attributes: ['student_id']
    });

    return {
      role: user.role,
      parentId: parent.id,
      studentIds: links.map((link) => link.student_id)
    };
  }

  const student = await Student.findOne({
    where: { user_id: user.id },
    attributes: ['id']
  });

  return {
    role: user.role,
    parentId: null,
    studentIds: student ? [student.id] : []
  };
};

const attachFamilyScope = async (req, res, next) => {
  try {
    req.scope = await resolveFamilyScope(req.user);
    next();
  } catch (error) {
    res.status(500).json({ message: 'No se pudo resolver el alcance del usuario' });
  }
};

const getScope = async (req) => {
  if (!req.scope) {
    req.scope = await resolveFamilyScope(req.user);
  }
  return req.scope;
};

const ensureStudentAccess = (getStudentId = (req) => req.params.id) => async (req, res, next) => {
  try {
    if (!isFamilyRole(req.user?.role)) {
      return next();
    }

    const scope = await getScope(req);
    const targetId = Number(getStudentId(req));

    if (!Number.isInteger(targetId) || !scope.studentIds.includes(targetId)) {
      return res.status(403).json({ message: 'No tienes acceso a los datos de este estudiante' });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: 'No se pudo verificar el acceso al estudiante' });
  }
};

const buildStudentWhere = (req, baseWhere = {}) => {
  if (!isFamilyRole(req.user?.role)) {
    return baseWhere;
  }

  const studentIds = req.scope?.studentIds || [];
  return {
    ...baseWhere,
    id: { [Op.in]: studentIds }
  };
};

const buildAttendanceWhere = (req, baseWhere = {}) => {
  if (!isFamilyRole(req.user?.role)) {
    return baseWhere;
  }

  const studentIds = req.scope?.studentIds || [];
  return {
    ...baseWhere,
    student_id: { [Op.in]: studentIds }
  };
};

module.exports = {
  FAMILY_ROLES,
  isFamilyRole,
  resolveFamilyScope,
  attachFamilyScope,
  ensureStudentAccess,
  buildStudentWhere,
  buildAttendanceWhere
};
