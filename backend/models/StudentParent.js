const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StudentParent = sequelize.define('StudentParent', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  parent_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'StudentParents'
});

module.exports = StudentParent;
