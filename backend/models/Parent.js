const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

const Parent = sequelize.define('Parent', {
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
  phone: {
    type: DataTypes.STRING
  },
  qr_code_uuid: {
    type: DataTypes.STRING,
    unique: true
  }
});

module.exports = Parent;
