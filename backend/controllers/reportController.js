const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const { Op } = require('sequelize');
const sequelize = require('../config/db');

exports.getGeneralStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalStudents = await Student.count();

    // Asistencia de hoy
    const todayString = today.toISOString().split('T')[0];
    const attendanceToday = await Attendance.findAll({
      where: {
        attendance_date: todayString
      }
    });

    // Deduplicate by student_id
    const uniqueAttendances = {};
    attendanceToday.forEach(a => {
      if (!uniqueAttendances[a.student_id]) {
        uniqueAttendances[a.student_id] = a;
      }
    });

    const uniqueList = Object.values(uniqueAttendances);
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
        const dateString = date.toISOString().split('T')[0];

        const count = await Attendance.count({
            where: {
                attendance_date: dateString
            }
        });

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
