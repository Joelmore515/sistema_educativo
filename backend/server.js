const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const sequelize = require('./config/db');

const app = express();

// Inicializar modelos y asociaciones
require('./models');

// Configuración CORS
const corsOptions = {
  origin: [
    'https://www.controlasistencia.pro',
    'https://controlasistencia.pro'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Middlewares - CORS debe ir primero que todo
app.use(cors(corsOptions));

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

      const { User, Role } = require('./models');
      const bcrypt = require('bcryptjs');

      const roles = ['admin', 'director', 'docente', 'padre', 'estudiante'];

      for (const roleName of roles) {
        await Role.findOrCreate({
          where: { name: roleName }
        });
      }

      // Migración segura: asegurar que students tenga columna user_id
      try {
        const queryInterface = sequelize.getQueryInterface();
        const tableDesc = await queryInterface.describeTable('students').catch(() => null);
        if (tableDesc && !tableDesc.user_id) {
          await queryInterface.addColumn('students', 'user_id', {
            type: sequelize.Sequelize.INTEGER,
            allowNull: true
          });
          console.log('[MIGRATION] Columna user_id añadida a la tabla students');
        }
      } catch (migErr) {
        console.log('[MIGRATION] Verificación students.user_id:', migErr.message);
      }

      // Seeder automático del primer Administrador (si no existe ninguno)
      const adminRole = await Role.findOne({ where: { name: 'admin' } });
      if (adminRole) {
        const adminCount = await User.count({ where: { role_id: adminRole.id } });
        if (adminCount === 0) {
          const defaultEmail = process.env.ADMIN_DEFAULT_EMAIL || 'admin@colegio.edu.pe';
          const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'AdminColegio2026!';
          const hashedPassword = await bcrypt.hash(defaultPassword, 10);

          await User.create({
            email: defaultEmail,
            password: hashedPassword,
            role_id: adminRole.id
          });
          console.log(`[BOOTSTRAP] Primer Administrador creado exitosamente: ${defaultEmail}`);
        }
      }

      dbInitialized = true;

      console.log('Base de datos conectada y sincronizada');
      console.log('Roles inicializados (incluido estudiante)');
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
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/parents', require('./routes/parentRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/meetings', require('./routes/meetingRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/dni', require('./routes/dniRoutes'));
app.use('/api/qr', require('./routes/qrRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// Ruta principal
app.get('/', (req, res) => {
  res.send('API del Sistema de Asistencia Escolar funcionando');
});

// Exportar para Vercel
module.exports = app;