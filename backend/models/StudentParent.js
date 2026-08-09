const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StudentParent = sequelize.define('StudentParent', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  }
});

module.exports = StudentParent;
