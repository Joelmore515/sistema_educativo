const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  action: {
    type: DataTypes.STRING(80),
    allowNull: false
  },
  entity: {
    type: DataTypes.STRING(80),
    allowNull: true
  },
  entity_id: {
    type: DataTypes.STRING(80),
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'success'
  },
  ip: {
    type: DataTypes.STRING(64),
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'audit_logs',
  indexes: [
    { fields: ['user_id'] },
    { fields: ['action'] },
    { fields: ['createdAt'] }
  ]
});

module.exports = AuditLog;
