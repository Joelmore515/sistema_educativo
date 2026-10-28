const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const sequelize = require('./config/db');
const { apiLimiter } = require('./middlewares/rateLimiters');

const app = express();

// Inicializar modelos y asociaciones
require('./models');

app.set('trust proxy', 1);

// Configuración CORS por variable de entorno
const defaultOrigins = [
  'https://www.controlasistencia.pro',
  'https://controlasistencia.pro',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];
const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = configuredOrigins.length > 0 ? configuredOrigins : defaultOrigins;

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    const error = new Error('Origen no permitido por CORS');
    error.status = 403;
    return callback(error);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

// Middlewares - CORS debe ir primero que todo
app.use(cors(corsOptions));
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(express.json({ limit: '1mb' }));
app.use('/api', apiLimiter);

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

      // Seeder del Administrador inicial (solo con variables de entorno)
      const adminRole = await Role.findOne({ where: { name: 'admin' } });
      const defaultEmail = process.env.ADMIN_DEFAULT_EMAIL;
      const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD;

      if (adminRole && defaultEmail && defaultPassword) {
        try {
          const existingAdmin = await User.findOne({ where: { email: defaultEmail } });
          if (!existingAdmin) {
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);
            await User.create({
              email: defaultEmail,
              password: hashedPassword,
              role_id: adminRole.id
            });
            console.log('[BOOTSTRAP] Administrador inicial creado');
          }
        } catch (seedErr) {
          console.error('[BOOTSTRAP] Error creando admin:', seedErr.message);
        }
      } else {
        console.log('[BOOTSTRAP] ADMIN_DEFAULT_EMAIL/PASSWORD no definidos, se omite la creación del admin');
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
      error: 'Error de conexión con la base de datos'
    });
  }
});

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 16) {
  console.error('[SECURITY] JWT_SECRET no está configurado o es demasiado corto. La API rechazará autenticaciones.');
}

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

// 404 JSON para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'El cuerpo de la petición no es un JSON válido' });
  }

  if (err.status === 403 || err.message === 'Origen no permitido por CORS') {
    return res.status(403).json({ message: 'Origen no permitido' });
  }

  console.error('[ERROR]', err);
  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : err.message || 'Error interno del servidor'
  });
});

// Levantar servidor local si se ejecuta directamente con node o npm start
if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Servidor backend ejecutándose en http://localhost:${PORT}`);
  });
}

// Exportar para Vercel
module.exports = app;
