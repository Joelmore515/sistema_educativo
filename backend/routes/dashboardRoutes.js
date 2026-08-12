const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Student, Attendance } = require('../models');
const Meeting = require('../models/Meeting');

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

router.get('/stats', async (req, res) => {
  try {
    // 1. Total students
    const totalStudents = await Student.count();

    // 2. Today's attendance percentage
    const today = new Date();
    // formatear a YYYY-MM-DD de forma segura (zona horaria local)
    const getLocalYMD = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const todayStr = getLocalYMD(today);

    const attendanceToday = await Attendance.findAll({
      where: {
        attendance_date: todayStr,
      },
      order: [['updatedAt', 'DESC'], ['check_in', 'DESC']]
    });

    const uniqueAttendancesToday = getLatestAttendanceByStudentAndDate(attendanceToday);
    const attendancesToday = uniqueAttendancesToday.filter(record =>
      record.status === 'presente' || record.status === 'tardanza'
    ).length;

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

    // 5. Performance Bars (current week attendance %: Monday to Saturday)
    const performanceBars = [];
    const currentDayOfWeek = today.getDay(); // 0: Sunday, 1: Monday, ... 6: Saturday
    const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek; 
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);

    let currentWeekTotalAttendances = 0;
    let daysPassedThisWeek = currentDayOfWeek === 0 ? 6 : currentDayOfWeek; // 1 to 6 (Monday to Saturday)

    for (let i = 0; i <= 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dStr = getLocalYMD(d);

      const dayRecords = await Attendance.findAll({
        where: {
          attendance_date: dStr,
        },
        order: [['updatedAt', 'DESC'], ['check_in', 'DESC']]
      });
      const uniqueDayRecords = getLatestAttendanceByStudentAndDate(dayRecords);
      const dayAttendances = uniqueDayRecords.filter(record =>
        record.status === 'presente' || record.status === 'tardanza'
      ).length;

      performanceBars.push(totalStudents > 0 ? Math.round((dayAttendances / totalStudents) * 100) : 0);

      if (i < daysPassedThisWeek) {
        currentWeekTotalAttendances += dayAttendances;
      }
    }
    
    // 6. Trend calculation (this week vs last week)
    let lastWeekTotalAttendances = 0;
    const lastWeekMonday = new Date(monday);
    lastWeekMonday.setDate(lastWeekMonday.getDate() - 7);
    
    for (let i = 0; i < daysPassedThisWeek; i++) {
      const d = new Date(lastWeekMonday);
      d.setDate(lastWeekMonday.getDate() + i);
      const dStr = getLocalYMD(d);

      const dayRecords = await Attendance.findAll({
        where: {
          attendance_date: dStr,
        },
        order: [['updatedAt', 'DESC'], ['check_in', 'DESC']]
      });

      const uniqueDayRecords = getLatestAttendanceByStudentAndDate(dayRecords);
      const dayAttendances = uniqueDayRecords.filter(record =>
        record.status === 'presente' || record.status === 'tardanza'
      ).length;

      lastWeekTotalAttendances += dayAttendances;
    }
    
    const currentWeekAvg = totalStudents > 0 && daysPassedThisWeek > 0 
      ? (currentWeekTotalAttendances / (totalStudents * daysPassedThisWeek)) * 100 
      : 0;
      
    const lastWeekAvg = totalStudents > 0 && daysPassedThisWeek > 0
      ? (lastWeekTotalAttendances / (totalStudents * daysPassedThisWeek)) * 100
      : 0;
      
    const attendanceTrend = Number((currentWeekAvg - lastWeekAvg).toFixed(1));

    res.json({
      success: true,
      data: {
        stats: {
          totalStudents,
          attendancePercentage,
          upcomingMeetings,
          totalReports: 0, // Generated reports count not tracked in DB
          attendanceTrend
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
