const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Parent = require('./Parent');

const Student = sequelize.define('Student', {
  first_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  last_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  dni: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true
  },
  grade_section: {
    type: DataTypes.STRING,
    allowNull: true
  },
  qr_code_uuid: {
    type: DataTypes.STRING,
    unique: true
  },
  parent_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
});

module.exports = Student;
