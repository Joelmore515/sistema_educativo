const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Parent = require('./Parent');
const Meeting = require('./Meeting');

const MeetingAttendance = sequelize.define('MeetingAttendance', {
  check_in: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  check_out: {
    type: DataTypes.DATE
  }
});

MeetingAttendance.belongsTo(Parent, { foreignKey: 'parent_id' });
MeetingAttendance.belongsTo(Meeting, { foreignKey: 'meeting_id' });

module.exports = MeetingAttendance;
