const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const TEST_SECRET = 'test-secret-key-with-more-than-32-characters';
process.env.JWT_SECRET = TEST_SECRET;
process.env.DNI_API_KEY = '';

const studentRoutes = require('../routes/studentRoutes');
const parentRoutes = require('../routes/parentRoutes');
const attendanceRoutes = require('../routes/attendanceRoutes');
const meetingRoutes = require('../routes/meetingRoutes');
const reportRoutes = require('../routes/reportRoutes');
const dashboardRoutes = require('../routes/dashboardRoutes');
const dniRoutes = require('../routes/dniRoutes');
const qrRoutes = require('../routes/qrRoutes');
const userRoutes = require('../routes/userRoutes');
const authRoutes = require('../routes/authRoutes');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/students', studentRoutes);
  app.use('/api/parents', parentRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/meetings', meetingRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/dni', dniRoutes);
  app.use('/api/qr', qrRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/auth', authRoutes);
  return app;
};

const tokenFor = (role, id = 1) => jwt.sign(
  { id, role, email: `${role}@colegio.edu.pe` },
  TEST_SECRET,
  { expiresIn: '1h' }
);

describe('Autorización de rutas', () => {
  let app;

  beforeAll(() => {
    app = buildApp();
  });

  it('rechaza con 401 todas las rutas sensibles sin token', async () => {
    const requests = [
      request(app).get('/api/students'),
      request(app).post('/api/students').send({}),
      request(app).get('/api/parents'),
      request(app).post('/api/parents').send({}),
      request(app).get('/api/attendance'),
      request(app).post('/api/attendance').send({}),
      request(app).get('/api/meetings'),
      request(app).get('/api/meetings/1/attendance'),
      request(app).post('/api/meetings').send({}),
      request(app).get('/api/reports/general'),
      request(app).get('/api/users'),
      request(app).post('/api/dni').send({ dni: '12345678' }),
      request(app).get('/api/qr/abc'),
      request(app).get('/api/dashboard/stats')
    ];

    const responses = await Promise.all(requests);
    responses.forEach((response) => {
      expect(response.status).toBe(401);
    });
  });

  it('un padre no puede consultar estudiantes, padres, asistencia ni reportes', async () => {
    const token = tokenFor('padre');

    const responses = await Promise.all([
      request(app).get('/api/students').set('Authorization', `Bearer ${token}`),
      request(app).get('/api/parents').set('Authorization', `Bearer ${token}`),
      request(app).get('/api/attendance').set('Authorization', `Bearer ${token}`),
      request(app).get('/api/reports/general').set('Authorization', `Bearer ${token}`),
      request(app).get('/api/dashboard/stats').set('Authorization', `Bearer ${token}`),
      request(app).post('/api/dni').set('Authorization', `Bearer ${token}`).send({ dni: '12345678' }),
      request(app).post('/api/meetings/scan').set('Authorization', `Bearer ${token}`).send({
        uuid: 'uuid-de-prueba',
        meeting_id: 1
      }),
      request(app).get('/api/meetings/1/attendance').set('Authorization', `Bearer ${token}`)
    ]);

    responses.forEach((response) => {
      expect(response.status).toBe(403);
    });
  });

  it('un estudiante no puede consultar datos globales de asistencia ni estudiantes', async () => {
    const token = tokenFor('estudiante');

    const responses = await Promise.all([
      request(app).get('/api/attendance').set('Authorization', `Bearer ${token}`),
      request(app).get('/api/students').set('Authorization', `Bearer ${token}`),
      request(app).get('/api/parents').set('Authorization', `Bearer ${token}`)
    ]);

    responses.forEach((response) => {
      expect(response.status).toBe(403);
    });
  });

  it('un docente no puede crear usuarios, estudiantes, padres ni reuniones', async () => {
    const token = tokenFor('docente');

    const responses = await Promise.all([
      request(app).post('/api/users').set('Authorization', `Bearer ${token}`).send({
        email: 'nuevo@colegio.edu.pe',
        password: '12345678',
        roleName: 'docente'
      }),
      request(app).post('/api/students').set('Authorization', `Bearer ${token}`).send({
        first_name: 'Nuevo',
        last_name: 'Estudiante'
      }),
      request(app).delete('/api/students/1').set('Authorization', `Bearer ${token}`),
      request(app).post('/api/parents').set('Authorization', `Bearer ${token}`).send({
        first_name: 'Nuevo',
        last_name: 'Padre'
      }),
      request(app).post('/api/meetings').set('Authorization', `Bearer ${token}`).send({})
    ]);

    responses.forEach((response) => {
      expect(response.status).toBe(403);
    });

    const scanValidation = await request(app)
      .post('/api/meetings/scan')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(scanValidation.status).toBe(400);
  });

  it('un director no puede crear usuarios ni eliminar otros usuarios', async () => {
    const token = tokenFor('director');

    const responses = await Promise.all([
      request(app).post('/api/users').set('Authorization', `Bearer ${token}`).send({
        email: 'nuevo@colegio.edu.pe',
        password: '12345678',
        roleName: 'docente'
      }),
      request(app).delete('/api/users/2').set('Authorization', `Bearer ${token}`)
    ]);

    responses.forEach((response) => {
      expect(response.status).toBe(403);
    });
  });

  it('permite generar imágenes QR solo con sesión autenticada', async () => {
    const withoutToken = await request(app).get('/api/qr/abc');
    expect(withoutToken.status).toBe(401);

    const withToken = await request(app)
      .get('/api/qr/abc')
      .set('Authorization', `Bearer ${tokenFor('estudiante')}`);

    expect(withToken.status).toBe(200);
    expect(withToken.headers['content-type']).toContain('image/png');
  });

  it('valida payloads antes de tocar la base de datos', async () => {
    const token = tokenFor('admin');

    const responses = await Promise.all([
      request(app).post('/api/students').set('Authorization', `Bearer ${token}`).send({}),
      request(app).post('/api/users').set('Authorization', `Bearer ${token}`).send({}),
      request(app).post('/api/dni').set('Authorization', `Bearer ${token}`).send({ dni: '123' }),
      request(app).post('/api/attendance').set('Authorization', `Bearer ${token}`).send({}),
      request(app).post('/api/auth/login').send({ email: 'no-es-email', password: '' }),
      request(app).post('/api/auth/reset-password').send({ token: 'invalido', password: '123456' })
    ]);

    responses.forEach((response) => {
      expect(response.status).toBe(400);
    });
  });
});
