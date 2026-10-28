# API y seguridad - Fase 1

Base URL local: `http://localhost:5000/api`

Las rutas protegidas requieren el header:

```http
Authorization: Bearer <token>
```

## Roles

| Rol | Acceso general |
| --- | --- |
| `admin` | Administración completa |
| `director` | Gestión académica y reportes, sin crear usuarios |
| `docente` | Lectura de estudiantes, asistencia, reuniones, reportes y DNI |
| `padre` | Reuniones; sin acceso a datos de otras familias |
| `estudiante` | Reuniones; sin acceso a datos de otros estudiantes |

## Autenticación

| Método | Ruta | Acceso | Descripción |
| --- | --- | --- | --- |
| POST | `/auth/register` | Público | Deshabilitado. Responde `403`. |
| GET | `/auth/login` | Público | Responde `405`; el login es `POST`. |
| POST | `/auth/login` | Público | Body `{ email, password }`. Devuelve `{ token, user }`. |
| POST | `/auth/forgot-password` | Público | Body `{ email }`. Respuesta genérica para no revelar si el correo existe. |
| POST | `/auth/reset-password` | Público | Body `{ token, password }`. El token viene del correo y es de un solo uso. |

Reglas del login:

- El usuario debe tener un rol asignado; si no, responde `403`.
- El JWT usa `JWT_SECRET`, sin valor por defecto. Si falta o tiene menos de 16 caracteres, el login responde `500`.
- Tras 5 fallos por email + IP en 15 minutos, se bloquea el login 15 minutos y se responde `429`.
- La expiración se controla con `JWT_EXPIRES_IN` (por defecto `8h`).

Recuperación de contraseña:

1. `POST /auth/forgot-password` genera un token aleatorio, guarda solo su hash SHA-256 y envía un enlace a `FRONTEND_URL/reset-password?token=...`.
2. El token expira según `PASSWORD_RESET_EXPIRES_MINUTES` (60 minutos por defecto).
3. `POST /auth/reset-password` valida el token, actualiza la contraseña y marca el token como usado dentro de una transacción.
4. Los JWT ya emitidos no se revocan hasta su expiración; la revocación completa queda pendiente para una fase posterior.

## Usuarios

| Método | Ruta | Roles |
| --- | --- | --- |
| GET | `/users` | `admin`, `director` |
| POST | `/users` | `admin` |
| PUT | `/users/:id/password` | `admin` |
| DELETE | `/users/:id` | `admin` |

## Estudiantes

| Método | Ruta | Roles |
| --- | --- | --- |
| GET | `/students` | `admin`, `director`, `docente` |
| GET | `/students/qr/:uuid` | `admin`, `director`, `docente` |
| POST | `/students` | `admin`, `director` |
| PUT | `/students/:id` | `admin`, `director` |
| DELETE | `/students/:id` | `admin`, `director` |

## Padres

| Método | Ruta | Roles |
| --- | --- | --- |
| GET | `/parents` | `admin`, `director` |
| POST | `/parents` | `admin`, `director` |
| PUT | `/parents/:id` | `admin`, `director` |
| DELETE | `/parents/:id` | `admin`, `director` |

## Asistencia

Todas las rutas requieren `admin`, `director` o `docente`.

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/attendance` | Lista de asistencias |
| POST | `/attendance/scan` | Escaneo QR de estudiante. Body `{ uuid }` |
| POST | `/attendance` | Registrar ausencia/falta. Body con `student_id` o `student_ids` |
| POST | `/attendance/:id/justify` | Justificar. Body `{ justification_reason }` |
| PATCH | `/attendance/:id` | Actualizar estado, horarios o notas |
| DELETE | `/attendance/:id` | Eliminar registro |

## Reuniones

Lectura disponible para cualquier usuario autenticado. La escritura y el detalle de asistencia requieren personal autorizado.

| Método | Ruta | Roles |
| --- | --- | --- |
| GET | `/meetings` | Cualquier usuario autenticado |
| GET | `/meetings/active` | Cualquier usuario autenticado |
| POST | `/meetings` | `admin`, `director` |
| PUT | `/meetings/:id` | `admin`, `director` |
| DELETE | `/meetings/:id` | `admin`, `director` |
| POST | `/meetings/scan` | `admin`, `director`, `docente`. Body `{ uuid, meeting_id }` |
| GET | `/meetings/:id/attendance` | `admin`, `director`, `docente` |
| POST | `/meetings/:id/attendance` | `admin`, `director` |
| PUT | `/meetings/attendance/:attendanceId` | `admin`, `director` |
| DELETE | `/meetings/attendance/:attendanceId` | `admin`, `director` |

## Reportes, dashboard, DNI y QR

| Método | Ruta | Roles |
| --- | --- | --- |
| GET | `/reports/general` | `admin`, `director`, `docente` |
| GET | `/reports/detail` | `admin`, `director`, `docente` |
| GET | `/dashboard/stats` | `admin`, `director`, `docente` |
| POST | `/dni` | `admin`, `director`, `docente` |
| GET | `/qr/:uuid` | Cualquier usuario autenticado. Devuelve `image/png` |

`POST /dni` recibe `{ dni }`, usa `DNI_API_KEY` desde el entorno y cachea resultados durante `DNI_CACHE_TTL_MS`. Responde `503` si la API no está configurada y `504` si se agota el timeout.

## Validación, límites y auditoría

- Los payloads se validan con Zod. Un payload inválido responde `400` con `errors`.
- Rate limiting global: `RATE_LIMIT_MAX` por `RATE_LIMIT_WINDOW_MS` (300 por 15 minutos por defecto).
- Login: `AUTH_RATE_LIMIT_MAX` por ventana (10 por 15 minutos por defecto).
- Recuperación de contraseña: `PASSWORD_RESET_RATE_LIMIT_MAX` por ventana (5 por 15 minutos por defecto).
- Se registran eventos en `audit_logs`: login exitoso/fallido, solicitud y cambio de contraseña, creación/edición/eliminación de usuarios, estudiantes, padres, reuniones y asistencias, escaneos QR y consultas DNI.
- No se guardan contraseñas, tokens ni códigos QR en la auditoría.

## Variables de entorno

Copiar `backend/.env.example` a `backend/.env` y completar:

| Variable | Uso |
| --- | --- |
| `PORT` | Puerto local del backend (por defecto `5000`) |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` | Conexión MySQL/TiDB |
| `JWT_SECRET` | Obligatoria, mínimo 16 caracteres; recomendado 32 o más |
| `JWT_EXPIRES_IN` | Expiración del token |
| `CORS_ORIGINS` | Orígenes permitidos, separados por coma |
| `FRONTEND_URL` | URL usada en el enlace de recuperación |
| `DNI_API_KEY` | Clave de la API externa de DNI |
| `DNI_API_URL`, `DNI_CACHE_TTL_MS`, `DNI_API_TIMEOUT_MS`, `DNI_CACHE_MAX_ENTRIES` | Configuración y caché de DNI |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` | Envío de correos |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` | Límite global |
| `AUTH_RATE_LIMIT_MAX`, `PASSWORD_RESET_RATE_LIMIT_MAX` | Límites de autenticación |
| `LOGIN_MAX_ATTEMPTS`, `LOGIN_ATTEMPT_WINDOW_MS`, `LOGIN_LOCK_MS` | Bloqueo de login |
| `PASSWORD_RESET_EXPIRES_MINUTES` | Vigencia del enlace de recuperación |

`backend/.env` no debe versionarse. En producción configurar estas variables en el panel de Vercel.

## Migración

Antes de desplegar, ejecutar en la base de datos de producción:

```bash
mysql -h <host> -P <puerto> -u <usuario> -p <base_de_datos> < backend/migrations/001_phase1_security.sql
```

La migración crea `password_reset_tokens` y `audit_logs`.

## Pruebas

```bash
cd backend
npm test
```

Cubren `401` sin token, `403` por rol, login sin rol, JWT_SECRET ausente, bloqueo temporal, alcance de padres/estudiantes y validación de payloads.

## Limitaciones conocidas

- El bloqueo de login se guarda en memoria del proceso. En Vercel/serverless no se comparte entre instancias; para producción multi-instancia se recomienda Redis o una tabla de intentos.
- El JWT se conserva en `localStorage`. Como mitigación se añadió una CSP estricta en `frontend/vercel.json`; una migración a cookie `httpOnly` requiere coordinación de CORS y CSRF.
- El token de recuperación no invalida JWT ya emitidos.
- `frontend/vercel.json` incluye los dominios de producción y desarrollo en `connect-src`; si cambia la URL del backend, actualizar la CSP.
