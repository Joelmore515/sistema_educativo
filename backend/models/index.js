const Role = require('./Role');
const User = require('./User');
const Parent = require('./Parent');
const Student = require('./Student');
const StudentParent = require('./StudentParent');
const Attendance = require('./Attendance');
const Meeting = require('./Meeting');
const MeetingAttendance = require('./MeetingAttendance');
const PasswordResetToken = require('./PasswordResetToken');
const AuditLog = require('./AuditLog');

// Define associations here to avoid circular dependencies

// User & Role
User.belongsTo(Role, { foreignKey: 'role_id' });
Role.hasMany(User, { foreignKey: 'role_id' });

// Password reset tokens
User.hasMany(PasswordResetToken, { foreignKey: 'user_id' });
PasswordResetToken.belongsTo(User, { foreignKey: 'user_id' });

// Audit logs
User.hasMany(AuditLog, { foreignKey: 'user_id' });
AuditLog.belongsTo(User, { foreignKey: 'user_id' });

// Parent & User
Parent.belongsTo(User, { foreignKey: 'user_id' });
User.hasOne(Parent, { foreignKey: 'user_id' });

// Student & User
Student.belongsTo(User, { foreignKey: 'user_id' });
User.hasOne(Student, { foreignKey: 'user_id' });

// Parent & Student (Many to Many)
Parent.belongsToMany(Student, { through: StudentParent, foreignKey: 'parent_id' });
Student.belongsToMany(Parent, { through: StudentParent, foreignKey: 'student_id' });

// Direct associations for StudentParent
StudentParent.belongsTo(Student, { foreignKey: 'student_id' });
StudentParent.belongsTo(Parent, { foreignKey: 'parent_id' });
Student.hasMany(StudentParent, { foreignKey: 'student_id' });
Parent.hasMany(StudentParent, { foreignKey: 'parent_id' });

// Attendance & Student
Student.hasMany(Attendance, { foreignKey: 'student_id' });
Attendance.belongsTo(Student, { foreignKey: 'student_id' });

// Meeting & MeetingAttendance
Meeting.hasMany(MeetingAttendance, { foreignKey: 'meeting_id' });
MeetingAttendance.belongsTo(Meeting, { foreignKey: 'meeting_id' });
Parent.hasMany(MeetingAttendance, { foreignKey: 'parent_id' });
MeetingAttendance.belongsTo(Parent, { foreignKey: 'parent_id' });

module.exports = {
  Role,
  User,
  Parent,
  Student,
  StudentParent,
  Attendance,
  Meeting,
  MeetingAttendance,
  PasswordResetToken,
  AuditLog
};
