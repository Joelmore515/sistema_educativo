const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Student = require('./Student');

const Attendance = sequelize.define('Attendance', {
  attendance_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  check_in: {
    type: DataTypes.DATE,
    allowNull: true
  },
  check_out: {
    type: DataTypes.DATE
  },
  status: {
    type: DataTypes.ENUM('presente', 'tardanza', 'ausente'),
    defaultValue: 'presente'
  },
  duration: {
    type: DataTypes.STRING
  },
  is_absence: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_justified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  justification_reason: {
    type: DataTypes.TEXT
  },
  justification_date: {
    type: DataTypes.DATE
  },
  notes: {
    type: DataTypes.TEXT
  }
});

Attendance.belongsTo(Student, { foreignKey: 'student_id' });

module.exports = Attendance;
