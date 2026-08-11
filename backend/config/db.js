const { Sequelize } = require('sequelize');
require('mysql2'); // fuerza a Vercel a incluir este paquete en el bundle serverless

require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 4000,
    dialect: 'mysql',
    logging: false,

    dialectOptions: {
      ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
      }
    }
  }
);

module.exports = sequelize;
