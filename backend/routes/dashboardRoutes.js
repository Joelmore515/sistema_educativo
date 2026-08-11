const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Student, Attendance } = require('../models');
const Meeting = require('../models/Meeting');

router.get('/stats', async (req, res) => {
  try {
    // 1. Total students
    const totalStudents = await Student.count();

    // 2. Today's attendance percentage
    const today = new Date();
    // formatear a YYYY-MM-DD para compatibilidad con db
    const todayStr = today.toISOString().split('T')[0];

    const attendancesToday = await Attendance.count({
      where: {
        attendance_date: todayStr,
        status: { [Op.in]: ['presente', 'tardanza'] }
      }
    });

    const attendancePercentage = totalStudents > 0 
      ? Math.round((attendancesToday / totalStudents) * 100) 
      : 0;

    // 3. Upcoming meetings
    const upcomingMeetings = await Meeting.count({
      where: {
        date: {
          [Op.gte]: todayStr
        }
      }
    });

    // 4. Recent activity
    const recentAttendances = await Attendance.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [{ model: Student, attributes: ['first_name', 'last_name'] }]
    });

    const formattedActivity = recentAttendances.map(a => {
      // Calculate time difference
      const diffMs = new Date() - new Date(a.createdAt);
      const diffMins = Math.floor(diffMs / 60000);
      const diffHrs = Math.floor(diffMins / 60);
      let timeStr = 'Hace un momento';
      if (diffHrs > 0) timeStr = `Hace ${diffHrs}h`;
      else if (diffMins > 0) timeStr = `Hace ${diffMins} min`;

      return {
        name: a.Student ? `${a.Student.first_name} ${a.Student.last_name}` : 'Estudiante',
        action: a.status === 'presente' ? 'Registró asistencia' : (a.status === 'tardanza' ? 'Registró tardanza' : 'Ausente'),
        time: timeStr,
        tone: a.status === 'presente' ? 'emerald' : (a.status === 'tardanza' ? 'amber' : 'red')
      };
    });

    // 5. Performance Bars (last 6 days attendance %)
    const performanceBars = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      
      const dayAttendances = await Attendance.count({
        where: {
          attendance_date: dStr,
          status: { [Op.in]: ['presente', 'tardanza'] }
        }
      });
      performanceBars.push(totalStudents > 0 ? Math.round((dayAttendances / totalStudents) * 100) : 0);
    }

    res.json({
      success: true,
      data: {
        stats: {
          totalStudents,
          attendancePercentage,
          upcomingMeetings,
          totalReports: 12 // Placeholder for reports
        },
        recentActivity: formattedActivity,
        performanceBars
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Error en el servidor', error: error.message });
  }
});

module.exports = router;
