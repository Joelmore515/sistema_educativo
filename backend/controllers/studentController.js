const { Student, Parent } = require('../models');
const { generateQR } = require('../utils/qrGenerator');

const formatStudentResponse = (student) => ({
  id: student.id,
  first_name: student.first_name,
  last_name: student.last_name,
  dni: student.dni,
  grade_section: student.grade_section,
  qr_code_uuid: student.qr_code_uuid
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
      parents
    } = req.body;

    if (dni) {
      const existingStudent = await Student.findOne({ where: { dni } });
      if (existingStudent) {
        return res.status(400).json({ message: 'El DNI del estudiante ya está registrado' });
      }
    }

    const { uuid } = await generateQR();

    const student = await Student.create({
      first_name,
      last_name,
      dni,
      grade_section: grade_section || section_id || null,
      qr_code_uuid: uuid
    });

    if (parents && Array.isArray(parents)) {
      for (const parentData of parents) {
        await handleParentAssociation(student, parentData);
      }
    }

    res.status(201).json({
      message: 'Estudiante registrado con éxito',
      student: formatStudentResponse(student)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al registrar estudiante', error: error.message });
  }
};

exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.findAll({
      include: [{ model: Parent }],
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
      parents
    } = req.body;

    const student = await Student.findByPk(id, { include: [{ model: Parent }] });
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
    await student.save();

    if (parents && Array.isArray(parents)) {
      for (const parentData of parents) {
        await handleParentAssociation(student, parentData);
      }
    }

    const updatedStudent = await Student.findByPk(id, { include: [{ model: Parent }] });
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
