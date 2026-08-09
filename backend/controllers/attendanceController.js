const { Attendance, Student, Parent, User } = require('../models');
const { sendEmail } = require('../utils/mailer');
const { sendWhatsApp } = require('../utils/wapsat');
const { Op } = require('sequelize');

const parseLocalDateString = (dateStr) => {
  if (!dateStr) return new Date();
  if (typeof dateStr === 'string' && dateStr.includes('-') && !dateStr.includes('T')) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr);
};

const getDayRange = (dateValue = new Date()) => {
  const start = new Date(dateValue);
  start.setHours(0, 0, 0, 0);

  const end = new Date(dateValue);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const formatLocalDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatLocalDateTime = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const parseLocalDateTime = (value) => {
  if (!value) return null;
  const normalized = value.replace(' ', 'T');
  return new Date(normalized);
};

const attachStudent = (attendance) => Attendance.findByPk(attendance.id, {
  include: [{ model: Student, attributes: ['first_name', 'last_name', 'grade_section'] }]
});

exports.scanQR = async (req, res) => {
  try {
    const { uuid } = req.body;

    // Buscar estudiante por UUID
    const student = await Student.findOne({
      where: { qr_code_uuid: uuid },
      include: [{ model: Parent }]
    });

    if (!student) {
      return res.status(404).json({ message: 'Código QR no reconocido o estudiante no encontrado' });
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Buscar si ya tiene un ingreso hoy sin salida
    let attendance = await Attendance.findOne({
      where: {
        student_id: student.id,
        check_out: null,
        check_in: {
          [Op.gte]: startOfDay,
          [Op.lte]: endOfDay
        }
      },
      order: [['check_in', 'DESC']]
    });

    let type = '';
    if (!attendance) {
      // Registrar Ingreso
      type = 'INGRESO';

      // Lógica simple de tardanza (Ejemplo: después de las 8:15 AM)
      const hours = now.getHours();
      const minutes = now.getMinutes();
      let status = 'presente';
      if (hours > 8 || (hours === 8 && minutes > 15)) {
        status = 'tardanza';
      }

      attendance = await Attendance.create({
        student_id: student.id,
        attendance_date: formatLocalDate(now),
        check_in: now,
        status: status
      });
    } else {
      // Registrar Salida
      type = 'SALIDA';
      attendance.check_out = now;

      // Calcular duración (opcional)
      const checkInDate = new Date(attendance.check_in);
      const diff = Math.abs(now - checkInDate);
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      attendance.duration = `${hours}h ${minutes}m`;

      await attendance.save();
    }

    // --- NOTIFICACIONES ---
    const parent = student.Parent;
    if (parent) {
      const message = `Hola ${parent.first_name}, se ha registrado el ${type} de su hijo(a) ${student.first_name} ${student.last_name} a las ${now.toLocaleTimeString()}. Estado: ${attendance.status}.`;

      // Enviar Email
      if (parent.User && parent.User.email) {
        sendEmail(parent.User.email, `Notificación de Asistencia - ${type}`, message)
          .catch(err => console.error('Error enviando email:', err));
      }

      // Enviar WhatsApp (Wapsat)
      if (parent.phone) {
        sendWhatsApp(parent.phone, message)
          .catch(err => console.error('Error enviando WhatsApp:', err));
      }
    }

    res.json({
      message: `Registro de ${type} exitoso`,
      student: `${student.first_name} ${student.last_name}`,
      time: now.toLocaleTimeString(),
      status: attendance.status
    });

  } catch (error) {
    res.status(500).json({ message: 'Error al procesar asistencia', error: error.message });
  }
};

exports.createAbsence = async (req, res) => {
  try {
    const { student_id, student_ids, date, notes, justification_reason } = req.body;

    const normalizedStudentIds = Array.isArray(student_ids)
      ? student_ids
      : student_id
        ? [student_id]
        : [];

    const uniqueStudentIds = [...new Set(normalizedStudentIds.filter(Boolean))];

    if (!uniqueStudentIds.length) {
      return res.status(400).json({ message: 'Debe seleccionar al menos un estudiante' });
    }

    const targetDate = parseLocalDateString(date);
    const { start, end } = getDayRange(targetDate);

    for (const currentStudentId of uniqueStudentIds) {
      const student = await Student.findByPk(currentStudentId);
      if (!student) {
        return res.status(404).json({ message: 'Estudiante no encontrado' });
      }

      const targetDayString = formatLocalDate(targetDate);
      const existingAbsence = await Attendance.findOne({
        where: {
          student_id: currentStudentId,
          is_absence: true,
          attendance_date: targetDayString
        }
      });

      if (existingAbsence) {
        return res.status(400).json({ message: 'Ya existe una falta registrada para uno de los estudiantes en la fecha indicada' });
      }
    }

    const createdAttendances = [];
    for (const currentStudentId of uniqueStudentIds) {
      const attendance = await Attendance.create({
        student_id: currentStudentId,
        attendance_date: formatLocalDate(targetDate),
        check_in: targetDate,
        status: 'ausente',
        is_absence: true,
        is_justified: Boolean(justification_reason),
        justification_reason: justification_reason || null,
        justification_date: justification_reason ? new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0) : null,
        notes: notes || null
      });

      const attendanceWithStudent = await attachStudent(attendance);
      createdAttendances.push(attendanceWithStudent);
    }

    res.status(201).json({
      message: createdAttendances.length === 1 ? 'Falta registrada con éxito' : `${createdAttendances.length} faltas registradas con éxito`,
      attendance: createdAttendances[0] || null,
      attendances: createdAttendances
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al registrar la falta', error: error.message });
  }
};

exports.justifyAbsence = async (req, res) => {
  try {
    const { id } = req.params;
    const { justification_reason } = req.body;

    const attendance = await Attendance.findByPk(id);
    if (!attendance) {
      return res.status(404).json({ message: 'Registro de asistencia no encontrado' });
    }

    if (!attendance.is_absence) {
      return res.status(400).json({ message: 'Este registro no corresponde a una falta' });
    }

    attendance.is_justified = true;
    attendance.justification_reason = justification_reason || attendance.justification_reason;
    attendance.justification_date = attendance.justification_date || new Date();
    await attendance.save();

    const attendanceWithStudent = await attachStudent(attendance);

    res.json({
      message: 'Falta justificada con éxito',
      attendance: attendanceWithStudent
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al justificar la falta', error: error.message });
  }
};

exports.updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { check_in, check_out, status, notes, is_absence, is_justified, justification_reason } = req.body;

    const attendance = await Attendance.findByPk(id);
    if (!attendance) {
      return res.status(404).json({ message: 'Registro de asistencia no encontrado' });
    }

    if (check_in !== undefined) {
      if (check_in) {
        const checkInDate = new Date(check_in);
        attendance.check_in = checkInDate;
        attendance.attendance_date = formatLocalDate(checkInDate);
      } else {
        attendance.check_in = null;
      }
    }
    if (check_out !== undefined) {
      if (check_out) {
        const checkOutDate = new Date(check_out);
        attendance.check_out = checkOutDate;
      } else {
        attendance.check_out = null;
      }
    }
    if (status !== undefined) {
      attendance.status = status;
    }
    if (notes !== undefined) {
      attendance.notes = notes || null;
    }
    if (is_absence !== undefined) {
      attendance.is_absence = Boolean(is_absence);
    }
    if (is_justified !== undefined) {
      attendance.is_justified = Boolean(is_justified);
    }
    if (justification_reason !== undefined) {
      attendance.justification_reason = justification_reason || null;
    }

    if (attendance.is_absence) {
      attendance.check_out = null;
      attendance.duration = null;
      if (!attendance.attendance_date) {
        attendance.attendance_date = formatLocalDate(new Date());
      }
    }
    if (!attendance.is_absence) {
      attendance.is_justified = false;
      attendance.justification_reason = null;
      attendance.justification_date = null;
    } else if (attendance.is_justified && !attendance.justification_date) {
      attendance.justification_date = new Date();
    }

    if (attendance.check_in && attendance.check_out) {
      const durationMs = Math.abs(new Date(attendance.check_out) - new Date(attendance.check_in));
      const hours = Math.floor(durationMs / 3600000);
      const minutes = Math.floor((durationMs % 3600000) / 60000);
      attendance.duration = `${hours}h ${minutes}m`;
    } else {
      attendance.duration = null;
    }

    await attendance.save();
    const attendanceWithStudent = await attachStudent(attendance);

    res.json({
      message: 'Registro actualizado con éxito',
      attendance: attendanceWithStudent
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar el registro', error: error.message });
  }
};

exports.deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const attendance = await Attendance.findByPk(id);
    if (!attendance) {
      return res.status(404).json({ message: 'Registro de asistencia no encontrado' });
    }

    await attendance.destroy();

    res.json({ message: 'Registro eliminado con éxito' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el registro', error: error.message });
  }
};

exports.getAllAttendance = async (req, res) => {
  try {
    const attendances = await Attendance.findAll({
      include: [
        { model: Student, attributes: ['first_name', 'last_name', 'grade_section'] }
      ],
      order: [['check_in', 'DESC']]
    });
    res.json(attendances);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener historial de asistencias', error: error.message });
  }
};
