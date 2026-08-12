const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const { Op } = require('sequelize');
const sequelize = require('../config/db');

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalStudents = await Student.count();

    // formatear a YYYY-MM-DD de forma segura
    const getLocalYMD = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Asistencia de hoy
    const todayString = getLocalYMD(today);
    const attendanceToday = await Attendance.findAll({
      where: {
        attendance_date: todayString
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
                attendance_date: dateString
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
