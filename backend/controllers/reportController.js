const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const { Op } = require('sequelize');
const sequelize = require('../config/db');
const PERU_TZ = 'America/Lima';

// Devuelve "YYYY-MM-DD" en hora peruana, sin depender de la zona horaria del servidor.
const getLocalYMD = (d) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: PERU_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(d);
};

// Devuelve las partes de fecha/hora en zona horaria peruana.
const getPeruDateParts = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: PERU_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(date).reduce((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value;
    return acc;
  }, {});
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: parts.hour === '24' ? 0 : Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second)
  };
};

// Devuelve el nombre abreviado del día de la semana en español, usando la zona horaria de Perú.
const getPeruWeekdayShort = (date) => {
  return new Intl.DateTimeFormat('es-PE', {
    timeZone: PERU_TZ,
    weekday: 'short'
  }).format(date);
};

// Dado un conjunto de registros de asistencia, se queda con el más reciente
// por par (student_id, fecha). Evita contar dobles registros del mismo día.
const getLatestAttendanceByStudentAndDate = (records = []) => {
  const latestByKey = new Map();

  records.forEach((record) => {
    const studentId = record.student_id;
    const dateKey = record.attendance_date
      ? getLocalYMD(new Date(record.attendance_date))
      : record.check_in
        ? getLocalYMD(new Date(record.check_in))
        : null;

    if (!studentId || !dateKey) return;

    const mapKey = `${studentId}-${dateKey}`;
    const existing = latestByKey.get(mapKey);
    const existingTime = existing
      ? new Date(existing.updatedAt || existing.check_in || existing.attendance_date || 0).getTime()
      : -Infinity;
    const currentTime = new Date(
      record.updatedAt || record.check_in || record.attendance_date || 0
    ).getTime();

    if (!existing || currentTime >= existingTime) {
      latestByKey.set(mapKey, record);
    }
  });

  return Array.from(latestByKey.values());
};

// Construye el where de Student según el filtro de grado
const buildStudentWhere = (grade) => {
  if (!grade || grade === 'TODOS') return {};
  return { grade_section: grade };
};

exports.getGeneralStats = async (req, res) => {
  try {
    // --- Parámetros de filtro ---
    // date: "YYYY-MM-DD" – día específico a analizar (default: hoy en Perú)
    // dateFrom / dateTo: rango de fechas para la tendencia (opcional)
    // grade: grado/sección a filtrar (default: todos)
    const { date, grade } = req.query;

    // Determinar el día de referencia para el resumen
    const now = new Date();
    let referenceDate;
    if (date) {
      // Interpretar date como día local en Perú (mediodía UTC para evitar desplazamientos)
      const [y, m, d] = date.split('-').map(Number);
      referenceDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
    } else {
      referenceDate = now;
    }

    const referenceDateString = getLocalYMD(referenceDate); // "YYYY-MM-DD" en hora Perú

    // Filtro de estudiantes por grado
    const studentWhere = buildStudentWhere(grade);
    const totalStudents = await Student.count({ where: studentWhere });

    // IDs de los estudiantes filtrados (para filtrar asistencia también)
    let studentIds = null;
    if (grade && grade !== 'TODOS') {
      const filteredStudents = await Student.findAll({
        where: studentWhere,
        attributes: ['id']
      });
      studentIds = filteredStudents.map(s => s.id);
      if (studentIds.length === 0) {
        return res.json({
          summary: { total: 0, present: 0, tardy: 0, absent: 0 },
          chartData: [],
          grades: await getAvailableGrades()
        });
      }
    }

    // --- Resumen del día de referencia ---
    const attendanceTodayWhere = {
      [Op.or]: [
        { attendance_date: referenceDateString },
        sequelize.where(
          sequelize.fn('DATE', sequelize.col('check_in')),
          Op.eq,
          referenceDateString
        )
      ]
    };
    if (studentIds) {
      attendanceTodayWhere.student_id = { [Op.in]: studentIds };
    }

    const attendanceToday = await Attendance.findAll({
      where: attendanceTodayWhere,
      order: [['updatedAt', 'DESC'], ['check_in', 'DESC']]
    });

    // Deduplicar: un único registro por estudiante para el día de referencia
    const uniqueToday = getLatestAttendanceByStudentAndDate(attendanceToday);

    const present = uniqueToday.filter(a => a.status === 'presente').length;
    const tardy   = uniqueToday.filter(a => a.status === 'tardanza').length;
    const absentRecorded = uniqueToday.filter(a => a.status === 'ausente').length;
    const studentsWithRecordToday = new Set(uniqueToday.map(a => a.student_id)).size;
    const studentsWithoutRecord   = Math.max(0, totalStudents - studentsWithRecordToday);
    const absent = absentRecorded + studentsWithoutRecord;

    // --- Tendencia de los últimos 7 días ---
    const last7Dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(referenceDate.getTime() - i * 24 * 60 * 60 * 1000);
      last7Dates.push(d);
    }

    const statsByDay = await Promise.all(
      last7Dates.map(async (dayDate) => {
        const dateString = getLocalYMD(dayDate);

        const dayWhere = {
          [Op.or]: [
            { attendance_date: dateString },
            sequelize.where(
              sequelize.fn('DATE', sequelize.col('check_in')),
              Op.eq,
              dateString
            )
          ]
        };
        if (studentIds) {
          dayWhere.student_id = { [Op.in]: studentIds };
        }

        const dayRecords = await Attendance.findAll({
          where: dayWhere,
          order: [['updatedAt', 'DESC'], ['check_in', 'DESC']]
        });

        const uniqueDayRecords = getLatestAttendanceByStudentAndDate(dayRecords);

        const attendedCount = uniqueDayRecords.filter(
          r => r.status === 'presente' || r.status === 'tardanza'
        ).length;

        const dayName = getPeruWeekdayShort(dayDate);

        return {
          name: dayName.charAt(0).toUpperCase() + dayName.slice(1),
          asistencia: attendedCount,
          fecha: dateString
        };
      })
    );

    // --- Lista de grados disponibles para el filtro ---
    const grades = await getAvailableGrades();

    res.json({
      summary: {
        total: totalStudents,
        present,
        tardy,
        absent,
        referenceDate: referenceDateString
      },
      chartData: statsByDay,
      grades
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener estadísticas', error: error.message });
  }
};

// Devuelve los grados/secciones únicos disponibles en la BD
async function getAvailableGrades() {
  try {
    const results = await Student.findAll({
      attributes: [
        [sequelize.fn('DISTINCT', sequelize.col('grade_section')), 'grade_section']
      ],
      where: {
        grade_section: { [Op.ne]: null, [Op.ne]: '' }
      },
      raw: true
    });
    return results.map(r => r.grade_section).filter(Boolean).sort();
  } catch {
    return [];
  }
}

// Endpoint para obtener el detalle de asistencia de un día con filtros (para exportar PDF)
exports.getDetailedAttendance = async (req, res) => {
  try {
    const { date, grade } = req.query;
    const now = new Date();

    let referenceDate;
    if (date) {
      const [y, m, d] = date.split('-').map(Number);
      referenceDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
    } else {
      referenceDate = now;
    }

    const referenceDateString = getLocalYMD(referenceDate);

    // Incluir Student en la query con filtro de grado si aplica
    const studentWhere = buildStudentWhere(grade);
    const include = [{
      model: Student,
      attributes: ['id', 'first_name', 'last_name', 'grade_section', 'dni'],
      where: Object.keys(studentWhere).length > 0 ? studentWhere : undefined,
      required: Object.keys(studentWhere).length > 0
    }];

    const attendanceWhere = {
      [Op.or]: [
        { attendance_date: referenceDateString },
        sequelize.where(
          sequelize.fn('DATE', sequelize.col('Attendance.check_in')),
          Op.eq,
          referenceDateString
        )
      ]
    };

    const records = await Attendance.findAll({
      where: attendanceWhere,
      include,
      order: [['check_in', 'ASC']]
    });

    const unique = getLatestAttendanceByStudentAndDate(records);

    const detail = unique.map(r => ({
      student_name: r.Student ? `${r.Student.first_name} ${r.Student.last_name}` : '—',
      grade_section: r.Student?.grade_section || '—',
      dni: r.Student?.dni || '—',
      status: r.status,
      check_in: r.check_in ? new Date(r.check_in).toLocaleTimeString('es-PE', { timeZone: PERU_TZ, hour: '2-digit', minute: '2-digit' }) : '—',
      check_out: r.check_out ? new Date(r.check_out).toLocaleTimeString('es-PE', { timeZone: PERU_TZ, hour: '2-digit', minute: '2-digit' }) : '—',
      is_justified: r.is_justified || false,
      justification_reason: r.justification_reason || ''
    }));

    res.json({ date: referenceDateString, records: detail });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener detalle de asistencia', error: error.message });
  }
};
