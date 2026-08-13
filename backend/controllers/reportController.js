const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const { Op } = require('sequelize');
const sequelize = require('../config/db');
const PERU_TZ = 'America/Lima';

const getLatestAttendanceByStudentAndDate = (records = []) => {
  const latestByKey = new Map();

  records.forEach((record) => {
    const studentId = record.student_id;
    const dateKey = record.attendance_date
      ? new Date(record.attendance_date).toISOString().slice(0, 10)
      : record.check_in
        ? new Date(record.check_in).toISOString().slice(0, 10)
        : null;

    if (!studentId || !dateKey) {
      return;
    }

    const mapKey = `${studentId}-${dateKey}`;
    const existing = latestByKey.get(mapKey);
    const existingTime = existing ? new Date(existing.updatedAt || existing.check_in || existing.attendance_date || 0).getTime() : -Infinity;
    const currentTime = new Date(record.updatedAt || record.check_in || record.attendance_date || 0).getTime();

    if (!existing || currentTime >= existingTime) {
      latestByKey.set(mapKey, record);
    }
  });

  return Array.from(latestByKey.values());
};

exports.getGeneralStats = async (req, res) => {
  try {
    const totalStudents = await Student.count();

    const getLocalYMD = (d) => {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: PERU_TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return formatter.format(d); // ya devuelve YYYY-MM-DD
    };

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

    // Asistencia de hoy
    const today = new Date();
    const { year, month, day } = getPeruDateParts(today);
    const todayString = getLocalYMD(today);
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 5, 0, 0, 0));      // 00:00 Perú = 05:00 UTC
    const endOfDay = new Date(Date.UTC(year, month - 1, day + 1, 4, 59, 59, 999)); // 23:59:59 Perú

    const attendanceToday = await Attendance.findAll({
      where: {
        [Op.or]: [
          { attendance_date: todayString },
          sequelize.where(
            sequelize.fn('DATE', sequelize.col('check_in')),
            Op.eq,
            todayString
          )
        ]
      },
      order: [['updatedAt', 'DESC'], ['check_in', 'DESC']]
    });

    const uniqueList = getLatestAttendanceByStudentAndDate(attendanceToday);
    const present = uniqueList.filter(a => a.status === 'presente').length;
    const tardy = uniqueList.filter(a => a.status === 'tardanza').length;
    let absent = totalStudents - (present + tardy);
    if (absent < 0) absent = 0;

    // Tendencia de los últimos 7 días
    // (Simplificado para este ejemplo)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0,0,0,0);
        last7Days.push(date);
    }

    const statsByDay = await Promise.all(last7Days.map(async (date) => {
        const dateString = getLocalYMD(date);

        const dayRecords = await Attendance.findAll({
            where: {
              [Op.or]: [
                { attendance_date: dateString },
                sequelize.where(
                  sequelize.fn('DATE', sequelize.col('check_in')),
                  Op.eq,
                  dateString
                )
              ]
            },
            order: [['updatedAt', 'DESC'], ['check_in', 'DESC']]
        });

        const uniqueDayRecords = getLatestAttendanceByStudentAndDate(dayRecords);
        const count = uniqueDayRecords.filter(record =>
            record.status === 'presente' || record.status === 'tardanza'
        ).length;

        return {
            name: date.toLocaleDateString('es-ES', { weekday: 'short' }),
            asistencia: count
        };
    }));

    res.json({
      summary: {
        total: totalStudents,
        present,
        tardy,
        absent
      },
      chartData: statsByDay
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener estadísticas', error: error.message });
  }
};
