const { Student, Parent, User, Role, StudentParent } = require('../models');
const sequelize = require('../config/db');
const bcrypt = require('bcryptjs');
const { generateQR } = require('../utils/qrGenerator');

const buildHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const normalizeEmail = (value) => (value || '').trim().toLowerCase();

const formatStudentResponse = (student) => ({
  id: student.id,
  first_name: student.first_name,
  last_name: student.last_name,
  dni: student.dni,
  grade_section: student.grade_section,
  qr_code_uuid: student.qr_code_uuid,
  user_id: student.user_id,
  User: student.User ? { id: student.User.id, email: student.User.email } : null
});

const parentInclude = () => ({
  model: Parent,
  include: [{ model: User, attributes: ['id', 'email', 'role_id'] }]
});

const getRole = async (name, transaction) => {
  const role = await Role.findOne({ where: { name }, transaction });
  if (!role) {
    throw buildHttpError(500, `Error de configuración: Rol ${name} no encontrado`);
  }
  return role;
};

const ensureParentAccount = async (parent, parentData, transaction, { requireAccount = true } = {}) => {
  if (parent.user_id) {
    const linkedUser = await User.findByPk(parent.user_id, { transaction });
    if (linkedUser) {
      return parent;
    }
    parent.user_id = null;
  }

  const email = normalizeEmail(parentData.parent_email);
  const password = parentData.parent_password;

  if (!email || !password) {
    if (!requireAccount) {
      return parent;
    }
    throw buildHttpError(
      400,
      'El apoderado principal necesita correo y contraseña para crear su cuenta de acceso'
    );
  }

  const existingUser = await User.findOne({ where: { email }, transaction });
  if (existingUser) {
    throw buildHttpError(400, 'El correo electrónico ya está registrado para otro usuario');
  }

  const role = await getRole('padre', transaction);
  const user = await User.create({
    email,
    password: await bcrypt.hash(password, 10),
    role_id: role.id
  }, { transaction });

  parent.user_id = user.id;
  await parent.save({ transaction });

  return parent;
};

const getOrCreateParent = async (parentData, transaction, options = {}) => {
  let parent = null;

  if (parentData.id) {
    parent = await Parent.findByPk(parentData.id, { transaction });
  }

  if (!parent && parentData.parent_dni) {
    parent = await Parent.findOne({ where: { dni: parentData.parent_dni }, transaction });
  }

  if (!parent) {
    if (!parentData.parent_dni) {
      throw buildHttpError(400, 'El DNI del apoderado es obligatorio');
    }

    const { uuid: parentUuid } = await generateQR();
    parent = await Parent.create({
      first_name: parentData.parent_first_name || '',
      last_name: parentData.parent_last_name || '',
      dni: parentData.parent_dni,
      phone: parentData.parent_phone || null,
      qr_code_uuid: parentUuid
    }, { transaction });
  } else {
    const updates = {};

    if (parentData.parent_first_name) updates.first_name = parentData.parent_first_name;
    if (parentData.parent_last_name) updates.last_name = parentData.parent_last_name;
    if (parentData.parent_phone !== undefined && parentData.parent_phone !== null && parentData.parent_phone !== '') {
      updates.phone = parentData.parent_phone;
    }

    if (Object.keys(updates).length > 0) {
      await parent.update(updates, { transaction });
    }
  }

  await ensureParentAccount(parent, parentData, transaction, options);
  return parent;
};

const handleParentAssociation = async (student, parentData, transaction, options = {}) => {
  if (!parentData) return null;
  if (!parentData.id && !parentData.parent_dni) return null;

  const parent = await getOrCreateParent(parentData, transaction, options);

  await StudentParent.findOrCreate({
    where: {
      student_id: student.id,
      parent_id: parent.id
    },
    transaction
  });

  return parent;
};

exports.registerStudent = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      dni,
      section_id,
      grade_section,
      parents,
      email,
      password
    } = req.body;

    if (!Array.isArray(parents) || parents.length === 0) {
      return res.status(400).json({
        message: 'Debe registrar al menos un apoderado principal'
      });
    }

    const student = await sequelize.transaction(async (transaction) => {
      if (dni) {
        const existingStudent = await Student.findOne({ where: { dni }, transaction });
        if (existingStudent) {
          throw buildHttpError(400, 'El DNI del estudiante ya está registrado');
        }
      }

      let userId = null;

      if (email) {
        const normalizedEmail = normalizeEmail(email);
        const existingUser = await User.findOne({ where: { email: normalizedEmail }, transaction });
        if (existingUser) {
          throw buildHttpError(400, 'El correo electrónico ya está registrado para otro usuario');
        }

        const role = await getRole('estudiante', transaction);
        const rawPassword = password && password.trim() ? password : (dni || '123456');
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        const user = await User.create({
          email: normalizedEmail,
          password: hashedPassword,
          role_id: role.id
        }, { transaction });
        userId = user.id;
      }

      const { uuid } = await generateQR();

      const createdStudent = await Student.create({
        first_name,
        last_name,
        dni,
        grade_section: grade_section || section_id || null,
        qr_code_uuid: uuid,
        user_id: userId
      }, { transaction });

      for (const [index, parentData] of parents.entries()) {
        const parent = await handleParentAssociation(createdStudent, parentData, transaction, {
          requireAccount: index === 0
        });
        if (!parent) {
          throw buildHttpError(400, 'Los datos del apoderado están incompletos');
        }
      }

      return createdStudent;
    });

    const fullStudent = await Student.findByPk(student.id, {
      include: [
        parentInclude(),
        { model: User, attributes: ['id', 'email', 'role_id'] }
      ]
    });

    res.status(201).json({
      message: 'Estudiante registrado con éxito',
      student: fullStudent || formatStudentResponse(student)
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Ya existe un registro con los mismos datos' });
    }

    res.status(error.status || 500).json({
      message: error.status ? error.message : 'Error al registrar estudiante',
      error: error.message
    });
  }
};

exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.findAll({
      include: [
        parentInclude(),
        { model: User, attributes: ['id', 'email', 'role_id'] }
      ],
      order: [['id', 'ASC']]
    });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener estudiantes', error: error.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      dni,
      section_id,
      grade_section,
      parents,
      email,
      password
    } = req.body;

    await sequelize.transaction(async (transaction) => {
      const student = await Student.findByPk(id, { transaction });
      if (!student) {
        throw buildHttpError(404, 'Estudiante no encontrado');
      }

      if (dni && dni !== student.dni) {
        const existingStudent = await Student.findOne({ where: { dni }, transaction });
        if (existingStudent && existingStudent.id !== Number(id)) {
          throw buildHttpError(400, 'El DNI del estudiante ya está registrado');
        }
      }

      student.first_name = first_name ?? student.first_name;
      student.last_name = last_name ?? student.last_name;
      student.dni = dni ?? student.dni;
      student.grade_section = grade_section ?? section_id ?? student.grade_section;

      if (email) {
        const normalizedEmail = normalizeEmail(email);

        if (student.user_id) {
          const user = await User.findByPk(student.user_id, { transaction });
          if (!user) {
            throw buildHttpError(404, 'La cuenta del estudiante no existe');
          }

          const existingEmailUser = await User.findOne({ where: { email: normalizedEmail }, transaction });
          if (existingEmailUser && existingEmailUser.id !== user.id) {
            throw buildHttpError(400, 'El correo electrónico ya está registrado para otro usuario');
          }

          const updates = { email: normalizedEmail };
          if (password && password.trim()) {
            updates.password = await bcrypt.hash(password, 10);
          }
          await user.update(updates, { transaction });
        } else {
          const existingEmailUser = await User.findOne({ where: { email: normalizedEmail }, transaction });
          if (existingEmailUser) {
            throw buildHttpError(400, 'El correo electrónico ya está registrado para otro usuario');
          }

          const role = await getRole('estudiante', transaction);
          const rawPassword = password && password.trim() ? password : (dni || student.dni || '123456');

          const newUser = await User.create({
            email: normalizedEmail,
            password: await bcrypt.hash(rawPassword, 10),
            role_id: role.id
          }, { transaction });
          student.user_id = newUser.id;
        }
      }

      await student.save({ transaction });

      if (parents && Array.isArray(parents)) {
        for (const [index, parentData] of parents.entries()) {
          await handleParentAssociation(student, parentData, transaction, {
            requireAccount: index === 0
          });
        }
      }
    });

    const updatedStudent = await Student.findByPk(id, {
      include: [
        parentInclude(),
        { model: User, attributes: ['id', 'email', 'role_id'] }
      ]
    });

    res.json({
      message: 'Estudiante actualizado con éxito',
      student: updatedStudent
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Ya existe un registro con los mismos datos' });
    }

    res.status(error.status || 500).json({
      message: error.status ? error.message : 'Error al actualizar estudiante',
      error: error.message
    });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await Student.findByPk(id, { include: [{ model: Parent }] });

    if (!student) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }

    if (student.Parents && student.Parents.length > 0) {
      await student.removeParents(student.Parents);
    }

    if (student.user_id) {
      await User.destroy({ where: { id: student.user_id } });
    }

    await student.destroy();
    res.json({ message: 'Estudiante eliminado con éxito' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar estudiante', error: error.message });
  }
};

exports.getStudentByQR = async (req, res) => {
  try {
    const { uuid } = req.params;
    const student = await Student.findOne({
      where: { qr_code_uuid: uuid },
      include: [{ model: Parent }]
    });

    if (!student) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }

    res.json(student);
  } catch (error) {
    res.status(500).json({ message: 'Error al buscar estudiante', error: error.message });
  }
};
