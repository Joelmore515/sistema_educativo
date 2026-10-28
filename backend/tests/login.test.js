const express = require('express');
const request = require('supertest');
const bcrypt = require('bcryptjs');

process.env.JWT_SECRET = 'test-secret-key-with-more-than-32-characters';
process.env.AUTH_RATE_LIMIT_MAX = '1000';

const { User, AuditLog } = require('../models');
const { resetLoginGuard } = require('../utils/loginGuard');
const authRoutes = require('../routes/authRoutes');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  return app;
};

describe('Login seguro', () => {
  let app;
  let passwordHash;

  beforeAll(async () => {
    app = buildApp();
    passwordHash = await bcrypt.hash('clave-segura-123', 4);
  });

  beforeEach(() => {
    resetLoginGuard();
    process.env.JWT_SECRET = 'test-secret-key-with-more-than-32-characters';
    vi.spyOn(AuditLog, 'create').mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetLoginGuard();
  });

  it('rechaza el login si el usuario no tiene rol asignado', async () => {
    vi.spyOn(User, 'findOne').mockResolvedValue({
      id: 7,
      email: 'sin-rol@colegio.edu.pe',
      password: passwordHash,
      Role: null
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sin-rol@colegio.edu.pe', password: 'clave-segura-123' });

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('rol');
  });

  it('no firma tokens si JWT_SECRET no está configurado', async () => {
    delete process.env.JWT_SECRET;
    vi.spyOn(User, 'findOne').mockResolvedValue({
      id: 8,
      email: 'admin@colegio.edu.pe',
      password: passwordHash,
      Role: { name: 'admin' }
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@colegio.edu.pe', password: 'clave-segura-123' });

    expect(response.status).toBe(500);
    expect(response.body.message).toContain('seguridad');
  });

  it('devuelve token y rol cuando las credenciales son correctas', async () => {
    vi.spyOn(User, 'findOne').mockResolvedValue({
      id: 9,
      email: 'docente@colegio.edu.pe',
      password: passwordHash,
      Role: { name: 'docente' }
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'docente@colegio.edu.pe', password: 'clave-segura-123' });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeTruthy();
    expect(response.body.user.role).toBe('docente');
  });

  it('bloquea temporalmente tras varios intentos fallidos', async () => {
    vi.spyOn(User, 'findOne').mockResolvedValue(null);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'atacante@colegio.edu.pe', password: 'incorrecta' });
      expect(response.status).toBe(400);
    }

    const lockedResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'atacante@colegio.edu.pe', password: 'incorrecta' });

    expect(lockedResponse.status).toBe(429);
    expect(lockedResponse.headers['retry-after']).toBeDefined();
  });
});
