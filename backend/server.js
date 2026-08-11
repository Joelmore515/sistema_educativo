const express = require('express');
const cors = require('cors');
require('dotenv').config();

const sequelize = require('./config/db');

const app = express();

// Inicializar modelos y asociaciones
require('./models');

// Middlewares
app.use(cors());
app.use(express.json());

// Inicialización de base de datos
let dbInitialized = false;
let dbInitializationPromise = null;

async function initializeDatabase() {
  if (dbInitialized) {
    return;
  }

  if (!dbInitializationPromise) {
    dbInitializationPromise = (async () => {
      await sequelize.authenticate();

      await sequelize.sync({ alter: false });

      const Role = require('./models/Role');

      const roles = ['admin', 'director', 'docente', 'padre'];

      for (const roleName of roles) {
        await Role.findOrCreate({
          where: { name: roleName }
        });
      }

      dbInitialized = true;

      console.log('Base de datos conectada y sincronizada');
      console.log('Roles inicializados');
    })();
  }

  await dbInitializationPromise;
}

// IMPORTANTE: este middleware debe estar ANTES de las rutas
app.use(async (req, res, next) => {
  try {
    await initializeDatabase();
    next();
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error);

    res.status(500).json({
      error: 'Error de conexión con la base de datos',
      details: error.message
    });
  }
});

// Rutas
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/parents', require('./routes/parentRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/meetings', require('./routes/meetingRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/dni', require('./routes/dniRoutes'));
app.use('/api/qr', require('./routes/qrRoutes'));

// Ruta principal
app.get('/', (req, res) => {
  res.send('API del Sistema de Asistencia Escolar funcionando');
});

// Exportar para Vercel
module.exports = app;