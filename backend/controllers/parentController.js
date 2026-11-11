const { Parent, User, Role, Student, StudentParent } = require('../models');
const sequelize = require('../config/db');
const bcrypt = require('bcryptjs');
const { generateQR } = require('../utils/qrGenerator');

const buildHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const normalizeEmail = (value) => (value || '').trim().toLowerCase();

const getUserInclude = () => ({
  model: User,
  attributes: ['id', 'email', 'role_id']
});

const getRole = async (name, transaction) => {
  const role = await Role.findOne({ where: { name }, transaction });
  if (!role) {
    throw buildHttpError(500, `Error de configuración: Rol ${name} no encontrado`);
  }
  return role;
};

exports.registerParent = async (req, res) => {
  try {
    const { first_name, last_name, dni, email, password, phone } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!dni) {
      return res.status(400).json({ message: 'El DNI del apoderado es obligatorio' });
    }

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        message: 'El correo y la contraseña son obligatorios para crear la cuenta del apoderado'
      });
    }

    const parent = await sequelize.transaction(async (transaction) => {
      if (dni) {
        const existingParent = await Parent.findOne({ where: { dni }, transaction });
        if (existingParent) {
          throw buildHttpError(400, 'El DNI ya está registrado para otro padre');
        }
      }

      const existingUser = await User.findOne({ where: { email: normalizedEmail }, transaction });
      if (existingUser) {
        throw buildHttpError(400, 'El correo electrónico ya está registrado');
      }

      const role = await getRole('padre', transaction);
      const user = await User.create({
        email: normalizedEmail,
        password: await bcrypt.hash(password, 10),
        role_id: role.id
      }, { transaction });

      const { uuid } = await generateQR();

      return Parent.create({
        first_name,
        last_name,
        dni,
        phone,
        qr_code_uuid: uuid,
        user_id: user.id
      }, { transaction });
    });

    res.status(201).json({
      message: 'Padre registrado con éxito',
      parent: {
        id: parent.id,
        first_name: parent.first_name,
        last_name: parent.last_name,
        dni: parent.dni,
        qr_code_uuid: parent.qr_code_uuid,
        user_id: parent.user_id
      }
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Ya existe un registro con los mismos datos' });
    }

    res.status(error.status || 500).json({
      message: error.status ? error.message : 'Error al registrar padre',
      error: error.message
    });
  }
};

exports.getAllParents = async (req, res) => {
  try {
    const parents = await Parent.findAll({
      include: [
        getUserInclude(),
        {
          model: Student,
          attributes: ['id', 'first_name', 'last_name', 'grade_section'],
          through: { attributes: [] }
        }
      ],
      order: [['id', 'ASC']]
    });
    res.json(parents);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener padres', error: error.message });
  }
};

exports.getParentByDni = async (req, res) => {
  try {
    const { dni } = req.params;

    if (!/^\d{8}$/.test(dni || '')) {
      return res.status(400).json({ message: 'El DNI debe tener 8 dígitos' });
    }

    const parent = await Parent.findOne({
      where: { dni },
      include: [getUserInclude()]
    });

    if (!parent) {
      return res.status(404).json({ message: 'Apoderado no encontrado' });
    }

    res.json(parent);
  } catch (error) {
    res.status(500).json({ message: 'Error al buscar apoderado', error: error.message });
  }
};

exports.updateParent = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, dni, email, password, phone } = req.body;

    await sequelize.transaction(async (transaction) => {
      const parent = await Parent.findByPk(id, { transaction });
      if (!parent) {
        throw buildHttpError(404, 'Padre no encontrado');
      }

      if (dni && dni !== parent.dni) {
        const existingParent = await Parent.findOne({ where: { dni }, transaction });
        if (existingParent && existingParent.id !== parent.id) {
          throw buildHttpError(400, 'El DNI ya está registrado para otro padre');
        }
      }

      await parent.update({
        first_name: first_name ?? parent.first_name,
        last_name: last_name ?? parent.last_name,
        dni: dni ?? parent.dni,
        phone: phone ?? parent.phone
      }, { transaction });

      const normalizedEmail = normalizeEmail(email);
      let user = parent.user_id ? await User.findByPk(parent.user_id, { transaction }) : null;

      if (user) {
        const updates = {};

        if (normalizedEmail) {
          const existingEmailUser = await User.findOne({
            where: { email: normalizedEmail },
            transaction
          });
          if (existingEmailUser && existingEmailUser.id !== user.id) {
            throw buildHttpError(400, 'El correo electrónico ya está registrado');
          }
          updates.email = normalizedEmail;
        }

        if (password && password.trim()) {
          updates.password = await bcrypt.hash(password, 10);
        }

        if (Object.keys(updates).length > 0) {
          await user.update(updates, { transaction });
        }
      } else if (normalizedEmail || password) {
        if (!normalizedEmail || !password) {
          throw buildHttpError(
            400,
            'Debe enviar correo y contraseña juntos para crear la cuenta de acceso del apoderado'
          );
        }

        const existingEmailUser = await User.findOne({
          where: { email: normalizedEmail },
          transaction
        });
        if (existingEmailUser) {
          throw buildHttpError(400, 'El correo electrónico ya está registrado');
        }

        const role = await getRole('padre', transaction);
        user = await User.create({
          email: normalizedEmail,
          password: await bcrypt.hash(password, 10),
          role_id: role.id
        }, { transaction });

        await parent.update({ user_id: user.id }, { transaction });
      }
    });

    const updatedParent = await Parent.findByPk(id, {
      include: [getUserInclude()]
    });

    res.json({ message: 'Padre actualizado con éxito', parent: updatedParent });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Ya existe un registro con los mismos datos' });
    }

    res.status(error.status || 500).json({
      message: error.status ? error.message : 'Error al actualizar padre',
      error: error.message
    });
  }
};

exports.deleteParent = async (req, res) => {
  try {
    const { id } = req.params;
    const parent = await Parent.findByPk(id, {
      include: [{ model: Student, attributes: ['id'], through: { attributes: [] } }]
    });

    if (!parent) {
      return res.status(404).json({ message: 'Padre no encontrado' });
    }

    const linkedStudents = parent.Students || [];

    if (linkedStudents.length > 0 && req.query.force !== 'true') {
      return res.status(409).json({
        message: `El apoderado tiene ${linkedStudents.length} estudiante(s) vinculado(s). Confirma la eliminación para continuar.`,
        student_count: linkedStudents.length
      });
    }

    await sequelize.transaction(async (transaction) => {
      await StudentParent.destroy({ where: { parent_id: parent.id }, transaction });

      if (parent.user_id) {
        await User.destroy({ where: { id: parent.user_id }, transaction });
      }

      await parent.destroy({ transaction });
    });

    res.json({ message: 'Padre eliminado con éxito' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar padre', error: error.message });
  }
};
