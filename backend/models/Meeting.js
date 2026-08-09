const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Meeting = sequelize.define('Meeting', {
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  time: {
    type: DataTypes.TIME,
    allowNull: false,
    defaultValue: '00:00:00'
  },
  description: {
    type: DataTypes.TEXT
  },
  type: {
    type: DataTypes.ENUM('APAFA', 'ESCUELA_PADRES', 'OTRO'),
    defaultValue: 'OTRO'
  }
});

module.exports = Meeting;
