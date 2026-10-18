const { Student, Parent, User, Role } = require('../models');
const bcrypt = require('bcryptjs');
const { generateQR } = require('../utils/qrGenerator');

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

const handleParentAssociation = async (student, parentData) => {
  if (!parentData || !parentData.parent_dni) return null;

  let parent = null;

  if (parentData.id) {
    parent = await Parent.findByPk(parentData.id);
  }

  if (!parent) {
    parent = await Parent.findOne({ where: { dni: parentData.parent_dni } });
  }

  if (!parent) {
    const { uuid: parentUuid } = await generateQR();
    parent = await Parent.create({
      first_name: parentData.parent_first_name || '',
      last_name: parentData.parent_last_name || '',
      dni: parentData.parent_dni,
      phone: parentData.parent_phone || null,
      qr_code_uuid: parentUuid
    });
  } else {
    let updated = false;
    if (parentData.parent_first_name !== undefined) {
      parent.first_name = parentData.parent_first_name;
      updated = true;
    }
    if (parentData.parent_last_name !== undefined) {
      parent.last_name = parentData.parent_last_name;
      updated = true;
    }
    if (parentData.parent_phone !== undefined) {
      parent.phone = parentData.parent_phone;
      updated = true;
    }
    if (updated) await parent.save();
  }

  const isAssociated = await student.hasParent(parent);
  if (!isAssociated) {
    await student.addParent(parent);
  }

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

    if (dni) {
      const existingStudent = await Student.findOne({ where: { dni } });
      if (existingStudent) {
        return res.status(400).json({ message: 'El DNI del estudiante ya está registrado' });
      }
    }

    let userId = null;
    // Crear cuenta de usuario si se proporciona email
    if (email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'El correo electrónico ya está registrado para otro usuario' });
      }

      const role = await Role.findOne({ where: { name: 'estudiante' } });
      if (!role) {
        return res.status(500).json({ message: 'Error de configuración: Rol estudiante no encontrado' });
      }

      const rawPassword = password && password.trim() ? password : (dni || '123456');
      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      const user = await User.create({
        email,
        password: hashedPassword,
        role_id: role.id
      });
      userId = user.id;
    }

    const { uuid } = await generateQR();

    const student = await Student.create({
      first_name,
      last_name,
      dni,
      grade_section: grade_section || section_id || null,
      qr_code_uuid: uuid,
      user_id: userId
    });

    if (parents && Array.isArray(parents)) {
      for (const parentData of parents) {
        await handleParentAssociation(student, parentData);
      }
    }

    const fullStudent = await Student.findByPk(student.id, {
      include: [
        { model: Parent },
        { model: User, attributes: ['id', 'email', 'role_id'] }
      ]
    });

    res.status(201).json({
      message: 'Estudiante registrado con éxito',
      student: fullStudent || formatStudentResponse(student)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al registrar estudiante', error: error.message });
  }
};

exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.findAll({
      include: [
        { model: Parent },
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

    const student = await Student.findByPk(id, {
      include: [
        { model: Parent },
        { model: User }
      ]
    });
    if (!student) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }

    if (dni && dni !== student.dni) {
      const existingStudent = await Student.findOne({ where: { dni } });
      if (existingStudent && existingStudent.id !== Number(id)) {
        return res.status(400).json({ message: 'El DNI del estudiante ya está registrado' });
      }
    }

    student.first_name = first_name ?? student.first_name;
    student.last_name = last_name ?? student.last_name;
    student.dni = dni ?? student.dni;
    student.grade_section = grade_section ?? section_id ?? student.grade_section;

    // Gestionar cuenta de usuario del estudiante
    if (email) {
      if (student.user_id) {
        const user = await User.findByPk(student.user_id);
        if (user) {
          const existingEmailUser = await User.findOne({ where: { email } });
          if (existingEmailUser && existingEmailUser.id !== user.id) {
            return res.status(400).json({ message: 'El correo electrónico ya está registrado para otro usuario' });
          }

          const updates = { email };
          if (password && password.trim()) {
            updates.password = await bcrypt.hash(password, 10);
          }
          await user.update(updates);
        }
      } else {
        const existingEmailUser = await User.findOne({ where: { email } });
        if (existingEmailUser) {
          return res.status(400).json({ message: 'El correo electrónico ya está registrado para otro usuario' });
        }

        const role = await Role.findOne({ where: { name: 'estudiante' } });
        const rawPassword = password && password.trim() ? password : (dni || '123456');
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        const newUser = await User.create({
          email,
          password: hashedPassword,
          role_id: role.id
        });
        student.user_id = newUser.id;
      }
    }

    await student.save();

    if (parents && Array.isArray(parents)) {
      for (const parentData of parents) {
        await handleParentAssociation(student, parentData);
      }
    }

    const updatedStudent = await Student.findByPk(id, {
      include: [
        { model: Parent },
        { model: User, attributes: ['id', 'email', 'role_id'] }
      ]
    });

    res.json({
      message: 'Estudiante actualizado con éxito',
      student: updatedStudent
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar estudiante', error: error.message });
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
