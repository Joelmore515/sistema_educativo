const { Op } = require('sequelize');
const {
  User,
  Parent,
  Student,
  StudentParent,
  Attendance,
  Meeting,
  MeetingAttendance
} = require('../models');

// Helper para obtener la fecha de hoy en formato YYYY-MM-DD
const getTodayString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * GET /api/me/profile
 * Devuelve el perfil del usuario autenticado y su registro asociado (padre o estudiante).
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'email', 'role_id'],
      include: [{ association: 'Role', attributes: ['id', 'name'] }]
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const roleName = req.user.role;
    let parent = null;
    let student = null;
    let children = [];
    let parents = [];

    if (roleName === 'padre') {
      parent = await Parent.findOne({
        where: { user_id: user.id },
        include: [
          {
            model: Student,
            attributes: ['id', 'first_name', 'last_name', 'dni', 'grade_section', 'qr_code_uuid'],
            through: { attributes: [] }
          }
        ]
      });

      if (parent) {
        children = parent.Students || [];
      }
    } else if (roleName === 'estudiante') {
      student = await Student.findOne({
        where: { user_id: user.id },
        include: [
          {
            model: Parent,
            attributes: ['id', 'first_name', 'last_name', 'dni', 'phone'],
            through: { attributes: [] }
          }
        ]
      });

      if (student) {
        parents = student.Parents || [];
      }
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: roleName
      },
      parent,
      children,
      student,
      parents
    });
  } catch (error) {
    console.error('Error en getProfile:', error);
    res.status(500).json({ message: 'Error al obtener perfil', error: error.message });
  }
};

/**
 * GET /api/me/children
 * Devuelve la lista de hijos vinculados al padre autenticado.
 */
exports.getChildren = async (req, res) => {
  try {
    if (req.user.role !== 'padre') {
      return res.status(403).json({ message: 'Acceso reservado a padres de familia' });
    }

    const parent = await Parent.findOne({ where: { user_id: req.user.id } });
    if (!parent) {
      return res.json([]);
    }

    // Buscar estudiantes vinculados mediante StudentParent
    const links = await StudentParent.findAll({
      where: { parent_id: parent.id },
      attributes: ['student_id']
    });

    const studentIds = links.map((l) => l.student_id);

    if (studentIds.length === 0) {
      return res.json([]);
    }

    const children = await Student.findAll({
      where: { id: { [Op.in]: studentIds } },
      attributes: ['id', 'first_name', 'last_name', 'dni', 'grade_section', 'qr_code_uuid']
    });

    res.json(children);
  } catch (error) {
    console.error('Error en getChildren:', error);
    res.status(500).json({ message: 'Error al obtener lista de hijos', error: error.message });
  }
};

/**
 * GET /api/me/student
 * Devuelve los datos del estudiante vinculado a la cuenta del estudiante autenticado.
 */
exports.getStudent = async (req, res) => {
  try {
    if (req.user.role !== 'estudiante') {
      return res.status(403).json({ message: 'Acceso reservado a estudiantes' });
    }

    const student = await Student.findOne({
      where: { user_id: req.user.id },
      attributes: ['id', 'first_name', 'last_name', 'dni', 'grade_section', 'qr_code_uuid', 'user_id'],
      include: [
        {
          model: Parent,
          attributes: ['id', 'first_name', 'last_name', 'dni', 'phone'],
          through: { attributes: [] }
        }
      ]
    });

    if (!student) {
      return res.status(404).json({ message: 'No hay estudiante vinculado a esta cuenta de usuario' });
    }

    res.json(student);
  } catch (error) {
    console.error('Error en getStudent:', error);
    res.status(500).json({ message: 'Error al obtener datos del estudiante', error: error.message });
  }
};

/**
 * GET /api/me/attendance?child_id=&from=&to=&status=
 * Devuelve el historial y resumen de asistencia de un estudiante con validación estricta de alcance.
 */
exports.getAttendance = async (req, res) => {
  try {
    const { child_id, from, to, status } = req.query;
    let targetStudentId = null;

    if (req.user.role === 'padre') {
      const parent = await Parent.findOne({ where: { user_id: req.user.id } });
      if (!parent) {
        return res.status(404).json({ message: 'Perfil de padre no encontrado' });
      }

      const links = await StudentParent.findAll({
        where: { parent_id: parent.id },
        attributes: ['student_id']
      });
      const allowedStudentIds = links.map((l) => l.student_id);

      if (allowedStudentIds.length === 0) {
        return res.json({
          student: null,
          summary: {
            total: 0,
            presentes: 0,
            tardanzas: 0,
            faltas: 0,
            faltas_justificadas: 0,
            porcentaje: 0
          },
          records: []
        });
      }

      if (child_id) {
        const parsedChildId = Number(child_id);
        if (!Number.isInteger(parsedChildId) || !allowedStudentIds.includes(parsedChildId)) {
          return res.status(403).json({ message: 'No tienes acceso a los datos de este estudiante' });
        }
        targetStudentId = parsedChildId;
      } else {
        // Si no especifica hijo, tomar el primero de la lista
        targetStudentId = allowedStudentIds[0];
      }
    } else if (req.user.role === 'estudiante') {
      const student = await Student.findOne({ where: { user_id: req.user.id } });
      if (!student) {
        return res.status(404).json({ message: 'Perfil de estudiante no encontrado' });
      }

      if (child_id && Number(child_id) !== student.id) {
        return res.status(403).json({ message: 'Solo puedes consultar tu propia asistencia' });
      }

      targetStudentId = student.id;
    } else {
      // Para admin, director o docente que consulten el endpoint
      if (child_id) {
        targetStudentId = Number(child_id);
      } else {
        return res.status(400).json({ message: 'Debe especificar el parámetro child_id' });
      }
    }

    const student = await Student.findByPk(targetStudentId, {
      attributes: ['id', 'first_name', 'last_name', 'dni', 'grade_section', 'qr_code_uuid']
    });

    if (!student) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }

    // Construcción de filtros de asistencia
    const whereConditions = {
      student_id: targetStudentId
    };

    if (from && to) {
      whereConditions.attendance_date = { [Op.between]: [from, to] };
    } else if (from) {
      whereConditions.attendance_date = { [Op.gte]: from };
    } else if (to) {
      whereConditions.attendance_date = { [Op.lte]: to };
    }

    if (status) {
      if (status === 'justificada') {
        whereConditions.is_justified = true;
      } else if (['presente', 'tardanza', 'ausente'].includes(status)) {
        whereConditions.status = status;
        if (status === 'ausente') {
          whereConditions.is_justified = false;
        }
      }
    }

    const records = await Attendance.findAll({
      where: whereConditions,
      order: [
        ['attendance_date', 'DESC'],
        ['check_in', 'DESC']
      ]
    });

    // Calcular resumen de asistencia sobre el conjunto filtrado
    let presentes = 0;
    let tardanzas = 0;
    let faltas = 0;
    let faltas_justificadas = 0;

    records.forEach((r) => {
      if (r.is_justified) {
        faltas_justificadas += 1;
      } else if (r.status === 'presente') {
        presentes += 1;
      } else if (r.status === 'tardanza') {
        tardanzas += 1;
      } else if (r.status === 'ausente') {
        faltas += 1;
      }
    });

    const total = records.length;
    // Porcentaje de asistencia: (presentes + tardanzas) / total * 100
    const porcentaje = total > 0 ? Math.round(((presentes + tardanzas) / total) * 100) : 0;

    res.json({
      student,
      summary: {
        total,
        presentes,
        tardanzas,
        faltas,
        faltas_justificadas,
        porcentaje
      },
      records
    });
  } catch (error) {
    console.error('Error en getAttendance:', error);
    res.status(500).json({ message: 'Error al obtener asistencia', error: error.message });
  }
};

/**
 * GET /api/me/meetings
 * Devuelve las reuniones del colegio y el estado de asistencia del padre.
 */
exports.getMeetings = async (req, res) => {
  try {
    const todayStr = getTodayString();
    let parent = null;
    let attendancesMap = {};

    if (req.user.role === 'padre') {
      parent = await Parent.findOne({ where: { user_id: req.user.id } });
      if (parent) {
        const attendances = await MeetingAttendance.findAll({
          where: { parent_id: parent.id }
        });
        attendances.forEach((att) => {
          attendancesMap[att.meeting_id] = att;
        });
      }
    }

    const meetings = await Meeting.findAll({
      order: [
        ['date', 'DESC'],
        ['time', 'ASC']
      ]
    });

    const formattedMeetings = meetings.map((meeting) => {
      const att = attendancesMap[meeting.id];
      const isUpcoming = meeting.date >= todayStr;

      let attendanceStatus = 'pendiente';
      if (att) {
        attendanceStatus = 'presente';
      } else if (!isUpcoming) {
        attendanceStatus = 'ausente';
      }

      return {
        id: meeting.id,
        title: meeting.title,
        date: meeting.date,
        time: meeting.time,
        description: meeting.description,
        type: meeting.type,
        is_upcoming: isUpcoming,
        attendance_status: req.user.role === 'padre' ? attendanceStatus : 'informativo',
        check_in: att ? att.check_in : null,
        check_out: att ? att.check_out : null
      };
    });

    res.json(formattedMeetings);
  } catch (error) {
    console.error('Error en getMeetings:', error);
    res.status(500).json({ message: 'Error al obtener reuniones', error: error.message });
  }
};

/**
 * GET /api/me/notifications
 * Devuelve notificaciones y avisos recientes relevantes para la familia.
 */
exports.getNotifications = async (req, res) => {
  try {
    const notifications = [];
    const todayStr = getTodayString();

    if (req.user.role === 'padre') {
      const parent = await Parent.findOne({ where: { user_id: req.user.id } });
      if (parent) {
        // 1. Obtener hijos
        const links = await StudentParent.findAll({
          where: { parent_id: parent.id },
          attributes: ['student_id']
        });
        const studentIds = links.map((l) => l.student_id);

        if (studentIds.length > 0) {
          // Últimas asistencias (últimos 3 días)
          const recentAttendances = await Attendance.findAll({
            where: { student_id: { [Op.in]: studentIds } },
            limit: 10,
            order: [['createdAt', 'DESC']],
            include: [{ model: Student, attributes: ['first_name', 'last_name'] }]
          });

          recentAttendances.forEach((att) => {
            const studentName = att.Student
              ? `${att.Student.first_name} ${att.Student.last_name}`
              : 'Tu hijo(a)';

            let title = 'Registro de Asistencia';
            let message = `${studentName} registró asistencia el ${att.attendance_date}`;
            let type = 'asistencia';

            if (att.status === 'presente') {
              title = 'Ingreso escolar';
              message = `${studentName} ingresó a clase a las ${att.check_in ? new Date(att.check_in).toLocaleTimeString('es-PE') : '--:--'}`;
            } else if (att.status === 'tardanza') {
              title = 'Tardanza escolar';
              message = `${studentName} registró ingreso con tardanza (${att.attendance_date})`;
              type = 'tardanza';
            } else if (att.status === 'ausente') {
              if (att.is_justified) {
                title = 'Falta justificada';
                message = `La inasistencia de ${studentName} (${att.attendance_date}) ha sido justificada.`;
                type = 'justificacion';
              } else {
                title = 'Inasistencia escolar';
                message = `${studentName} figuró ausente en la fecha ${att.attendance_date}.`;
                type = 'falta';
              }
            }

            notifications.push({
              id: `att-${att.id}`,
              type,
              title,
              message,
              date: att.createdAt || att.check_in || att.attendance_date,
              read: true
            });
          });
        }

        // 2. Próximas reuniones convocadas
        const upcomingMeetings = await Meeting.findAll({
          where: { date: { [Op.gte]: todayStr } },
          limit: 3,
          order: [['date', 'ASC']]
        });

        upcomingMeetings.forEach((m) => {
          notifications.push({
            id: `meet-${m.id}`,
            type: 'reunion',
            title: `Convocatoria: ${m.title}`,
            message: `Reunión programada para el ${m.date} a las ${m.time}.`,
            date: m.createdAt || m.date,
            read: false
          });
        });
      }
    } else if (req.user.role === 'estudiante') {
      const student = await Student.findOne({ where: { user_id: req.user.id } });
      if (student) {
        const recentAttendances = await Attendance.findAll({
          where: { student_id: student.id },
          limit: 5,
          order: [['createdAt', 'DESC']]
        });

        recentAttendances.forEach((att) => {
          notifications.push({
            id: `att-${att.id}`,
            type: att.status,
            title: `Asistencia: ${att.status.toUpperCase()}`,
            message: `Registro del día ${att.attendance_date}`,
            date: att.createdAt || att.check_in,
            read: true
          });
        });
      }
    }

    // Ordenar notificaciones de más reciente a más antigua
    notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json(notifications);
  } catch (error) {
    console.error('Error en getNotifications:', error);
    res.status(500).json({ message: 'Error al obtener notificaciones', error: error.message });
  }
};

