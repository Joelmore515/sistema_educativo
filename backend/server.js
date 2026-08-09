const express = require('express');
const cors = require('cors');
require('dotenv').config();
const sequelize = require('./config/db');

const app = express();

// Initialize models and associations
require('./models');


// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/parents', require('./routes/parentRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/meetings', require('./routes/meetingRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/dni', require('./routes/dniRoutes'));
app.use('/api/qr', require('./routes/qrRoutes'));

// Routes Placeholder
app.get('/', (req, res) => {
  res.send('API del Sistema de Asistencia Escolar funcionando');
});

// Sync Database and Start Server
const PORT = process.env.PORT || 5000;

sequelize.sync({ alter: false })
  .then(async () => {
    console.log('Base de datos conectada y sincronizada con alter: true');
    
    // Crear roles iniciales si no existen
    const Role = require('./models/Role');
    const roles = ['admin', 'director', 'docente', 'padre'];
    for (const roleName of roles) {
      await Role.findOrCreate({ where: { name: roleName } });
    }
    console.log('Roles inicializados');

    app.listen(PORT, () => {
      console.log(`Servidor ejecutándose en el puerto ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Error al conectar con la base de datos:', err);
  });
