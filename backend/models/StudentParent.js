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
  tableName: 'StudentParents',
  indexes: [
    {
      unique: true,
      fields: ['student_id', 'parent_id']
    }
  ]
});

module.exports = StudentParent;
