# Plan de mejoras — Sistema Educativo EduControl

**Fecha:** 2026-10-20
**Alcance:** un solo colegio (single-tenant), sin multi-colegio ni facturación.
**Stack actual:** React 19 + Vite + Tailwind, Express 5 + Sequelize/MySQL, despliegue Vercel.
**Zona horaria oficial:** America/Lima.
**Objetivo:** seguridad, portal familiar, notificaciones confiables, automatización, gestión académica, reportes y operación estable.

---

## Reglas de trabajo

- Una rama y un PR por fase: `feat/fase-0-estabilizacion`, `feat/fase-1-seguridad`, etc.
- Cada fase termina con migraciones aplicadas, pruebas pasando y build correcto.
- No usar `sequelize.sync` para cambios de esquema en producción: usar `sequelize-cli` y migraciones.
- Toda credencial nueva va en variables de entorno; nunca en el código.
- No romper endpoints existentes: los cambios de contrato se hacen de forma compatible y se actualiza el frontend en el mismo PR.
- Respaldar la base de datos antes de cada fase que modifique el esquema.
- Documentar cada endpoint nuevo en `README.md` o en `docs/API.md`.

---

## Supuestos y decisiones pendientes

| Tema | Decisión propuesta | Alternativa |
|---|---|---|
| WhatsApp | Meta WhatsApp Cloud API | Mantener Wapsat |
| Almacenamiento de archivos | Cloudinary | AWS S3 / Supabase Storage |
| Notificaciones push | Firebase Cloud Messaging (opcional) | Solo email y WhatsApp |
| Portal del estudiante | Incluido | Solo portal de padres |
| 2FA para administradores | Recomendado, opcional | Solo contraseña |
| Pagos APAFA/pensiones | Fuera de este plan | Culqi / Mercado Pago / Niubiz |
| Multi-colegio | No aplica | Diseño multi-tenant futuro |

---

## Resumen de fases

| Fase | Nombre | Resultado | Estimación |
|---|---|---|---|
| 0 | Preparación y estabilización | Proyecto ejecutable y seguro para empezar | 0.5 - 1 día |
| 1 | Seguridad y control de acceso | API protegida por rol y datos filtrados | 4 - 6 días |
| 2 | Portal de padres y estudiantes | Cada familia ve solo su información | 4 - 6 días |
| 3 | Notificaciones confiables | Email/WhatsApp con registro y reintentos | 3 - 5 días |
| 4 | Automatización escolar | Faltas, feriados, horarios y recordatorios | 3 - 4 días |
| 5 | Gestión académica | Grados, secciones, cursos, docentes, matrícula | 5 - 8 días |
| 6 | Reportes y exportación | PDF/Excel en servidor, historial y paginación | 3 - 4 días |
| 7 | Operación, calidad y despliegue | Migraciones, tests, CI, monitoreo, PWA | 4 - 6 días |
| 8 | Integraciones opcionales | Hardware, calendario, pagos, BI | Según necesidad |

**Total estimado:** 5 - 7 semanas con un desarrollador. El MVP recomendado (fases 0 a 3) toma aproximadamente 2.5 - 3.5 semanas.

---

## Fase 0 — Preparación y estabilización

**Objetivo:** dejar el proyecto en un estado reproducible, documentado y sin bloqueos evidentes antes de tocar seguridad.

### Tareas

- [ ] Crear una rama de trabajo y respaldar la base de datos con `mysqldump`.
- [ ] Verificar que `backend/.env` no esté versionado y rotar cualquier secreto expuesto.
- [ ] Crear `backend/.env.example` con: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`, `JWT_SECRET`, `ADMIN_DEFAULT_EMAIL`, `ADMIN_DEFAULT_PASSWORD`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`, `WAPSAT_API_KEY`, `WAPSAT_DEVICE_ID`, `DNI_API_KEY`, `CORS_ORIGINS`.
- [ ] Agregar scripts `dev` (`node --watch server.js`) y `start` en `backend/package.json`.
- [ ] Corregir `frontend/index.html`: `lang="es"`, título del colegio y metadatos básicos.
- [ ] Eliminar la página y la ruta muerta de `Register.jsx` (`frontend/src/App.jsx` ya redirige a login).
- [ ] Hacer configurable CORS por variable de entorno, incluyendo `http://localhost:5173` en desarrollo.
- [ ] Agregar endpoint `GET /api/health` para verificar API y base de datos.
- [ ] Agregar middleware global de errores y respuesta JSON 404.
- [ ] Probar localmente: login, alta de estudiante, escaneo QR y reunión.
- [ ] Documentar en `README.md` los comandos de instalación, migración y arranque.

### Archivos principales

- `backend/server.js`
- `backend/package.json`
- `backend/.env.example`
- `frontend/index.html`
- `frontend/src/App.jsx`
- `README.md`

### Criterios de aceptación

- El proyecto arranca en local siguiendo el README.
- No hay secretos en el repositorio.
- El login y el escaneo QR funcionan sin errores de CORS.
- Existe `/api/health` y responde correctamente. 

---

## Fase 1 — Seguridad y control de acceso

**Objetivo:** que ninguna ruta sensible quede pública y que cada rol acceda solo a lo que le corresponde.

### Problemas actuales a corregir

- Solo `/api/users` usa `verifyToken` y `requireRole` (`backend/routes/userRoutes.js`).
- Estudiantes, padres, asistencia, reuniones, reportes y dashboard están abiertos.
- `/scanner` está fuera de `PrivateRoute` (`frontend/src/App.jsx`).
- `AttendancePanel` permite ver y borrar asistencias de todo el colegio a cualquier usuario.
- `authController.login` asigna rol `admin` si el usuario no tiene rol (`backend/controllers/authController.js`).
- La API key de DNI está hardcodeada (`backend/routes/dniRoutes.js`).
- `authMiddleware` usa un secreto de respaldo si falta `JWT_SECRET`.

### Tareas

- [ ] Quitar el rol `admin` por defecto en el login; si el usuario no tiene rol, responder error.
- [ ] Quitar el secreto JWT de respaldo; exigir `JWT_SECRET` configurado.
- [ ] Proteger todas las rutas con `verifyToken` y `requireRole` según esta matriz:

| Recurso | Lectura | Escritura |
|---|---|---|
| Estudiantes | admin, director, docente | admin, director |
| Padres | admin, director | admin, director |
| Asistencia diaria | admin, director, docente | admin, director, docente |
| Reuniones | todos los autenticados | admin, director |
| Escaneo QR de padres | admin, director, docente | admin, director, docente |
| Reportes y dashboard | admin, director, docente | no aplica |
| DNI | admin, director, docente | no aplica |
| Usuarios | admin, director | admin |

- [ ] Crear middleware de alcance (`scopeMiddleware` o helpers) para que padre y estudiante solo consulten sus propios datos.
- [ ] Proteger `/scanner` en el frontend con `PrivateRoute` y validación de rol.
- [ ] En `AttendancePanel`, ocultar acciones de creación/edición/eliminación para roles no autorizados y mostrar modo solo lectura.
- [ ] Proteger `GET /api/qr/:uuid` para que solo usuarios autenticados generen imágenes QR.
- [ ] Mover `DNI_API_KEY` a variables de entorno y agregar caché con TTL para evitar consultas repetidas.
- [ ] Agregar `helmet`, `express-rate-limit` y validación de payloads con Zod o Joi.
- [ ] Limitar intentos de login y agregar bloqueo temporal por IP/email.
- [ ] Implementar recuperación de contraseña: tabla `password_reset_tokens`, endpoints `forgot-password` y `reset-password`, correo con token de un solo uso.
- [ ] Evaluar migración del JWT de `localStorage` a cookie `httpOnly`; si no se migra, agregar CSP estricta.
- [ ] Crear tabla `audit_logs` para registrar acciones sensibles: usuario, acción, entidad, IP y fecha.
- [ ] Escribir pruebas de 401, 403 y acceso indebido entre padres/estudiantes.

### Criterios de aceptación

- Toda ruta que no sea login o recuperación exige token válido.
- Un padre no puede consultar ni modificar datos de otro padre.
- Un estudiante solo ve su propia asistencia.
- Un docente no puede crear usuarios ni eliminar estudiantes.
- No hay secretos en el código.
- Las pruebas de autorización pasan.

---

## Fase 2 — Portal de padres y estudiantes

**Objetivo:** reemplazar el panel administrativo para familias por vistas propias y seguras.

### Backend

- [ ] Crear rutas `/api/me`:
  - `GET /api/me/profile`
  - `GET /api/me/children` (padre)
  - `GET /api/me/student` (estudiante)
  - `GET /api/me/attendance?child_id=&from=&to=`
  - `GET /api/me/meetings`
  - `GET /api/me/notifications`
- [ ] Resolver el vínculo padre-hijo con `StudentParent` y el vínculo estudiante-usuario con `Student.user_id`.
- [ ] Validar que `child_id` pertenezca al padre autenticado antes de devolver datos.
- [ ] Devolver resumen de asistencia: presentes, tardanzas, faltas, faltas justificadas y porcentaje.
- [ ] Devolver próximas reuniones y estado de asistencia del padre.

### Frontend

- [ ] Crear `MyFamilyDashboard.jsx` con selector de hijo cuando el padre tenga más de uno.
- [ ] Crear `MyAttendance.jsx` con historial, filtros por fecha y estado, y detalle de justificaciones.
- [ ] Crear `MyMeetings.jsx` con reuniones próximas y estado de asistencia.
- [ ] Crear `MyQR.jsx` para mostrar y descargar el carnet QR del estudiante o del padre.
- [ ] Actualizar el menú de `Dashboard.jsx` para que padre y estudiante solo vean sus módulos.
- [ ] Eliminar el acceso de padre/estudiante al `AttendancePanel` administrativo.
- [ ] Mostrar mensajes claros cuando no haya hijos vinculados o no haya asistencia registrada.

### Criterios de aceptación

- Un padre ve únicamente a sus hijos y la asistencia de ellos.
- Un estudiante ve únicamente su propia asistencia.
- Ningún rol familiar puede crear, editar o eliminar asistencias.
- El portal funciona en móvil.

---

## Fase 3 — Notificaciones confiables

**Objetivo:** enviar avisos por email y WhatsApp con trazabilidad, reintentos y plantillas.

### Problemas actuales a corregir

- `backend/.env` no tiene variables `EMAIL_*` ni `WAPSAT_*`.
- La notificación busca `student.Parent`, pero la relación muchos-a-muchos expone `student.Parents`.
- `sendWhatsApp` falla silenciosamente y no registra el intento.
- En Vercel, una promesa lanzada después de responder puede cancelarse.

### Tareas

- [ ] Corregir la asociación usada en `attendanceController`: usar `student.Parents` e incluir `User` del padre.
- [ ] Crear modelo `NotificationLog`: canal, destinatario, plantilla, estado, error, intentos, fecha.
- [ ] Crear `services/notificationService.js` con una interfaz única: `sendEmail`, `sendWhatsApp`, `sendPush`.
- [ ] Crear plantillas para ingreso, salida, tardanza, falta, falta justificada, recordatorio de reunión y resumen semanal.
- [ ] Implementar patrón outbox: guardar la notificación antes de enviarla y procesarla con un job.
- [ ] Configurar reintentos con backoff exponencial y límite de intentos.
- [ ] Integrar Meta WhatsApp Cloud API o Wapsat según la decisión final, con timeout y manejo de errores.
- [ ] Integrar email con nodemailer y un proveedor SMTP confiable (Brevo, Resend o SendGrid).
- [ ] Agregar preferencias por padre: recibir email sí/no, WhatsApp sí/no.
- [ ] Agregar panel de administración de notificaciones: historial, estado y reenvío manual.
- [ ] Enviar alerta de ausencia cuando el job diario marque una falta.
- [ ] Implementar push con Firebase solo si se decide incluirlo.

### Criterios de aceptación

- Un ingreso y una salida generan notificación y quedan registrados.
- Si un canal falla, el sistema reintenta y deja evidencia del error.
- El padre puede desactivar un canal sin afectar al otro.
- No hay envíos duplicados para el mismo evento.

---

## Fase 4 — Automatización escolar

**Objetivo:** reducir trabajo manual y hacer configurable el comportamiento del colegio.

### Tareas

- [ ] Crear tabla `settings` con: nombre del colegio, zona horaria, hora límite de tardanza, días laborables, notificaciones activas.
- [ ] Crear tabla `holidays` con fecha y descripción.
- [ ] Crear pantalla de configuración para administrador y director.
- [ ] Crear job diario que marque como ausentes a los estudiantes sin registro en días laborables.
- [ ] Evitar duplicados: no marcar falta si ya existe registro o si el día es feriado/fin de semana.
- [ ] Hacer configurable la hora de tardanza por nivel o sección; hoy está fija a las 8:15.
- [ ] Crear job de recordatorio de reuniones: 24 horas antes y el mismo día.
- [ ] Crear job de resumen semanal para dirección.
- [ ] Implementar subida de archivos de justificación a Cloudinary o S3 con límite de tamaño y tipos permitidos.
- [ ] Agregar confirmación de asistencia a reuniones (RSVP) para padres.
- [ ] Programar los jobs con Vercel Cron, GitHub Actions o un servicio externo; documentar la limitación del plan de Vercel.

### Criterios de aceptación

- El administrador puede cambiar la hora de tardanza sin tocar código.
- Los feriados no generan faltas.
- Ejecutar el job dos veces no duplica registros.
- Una justificación puede incluir imagen o PDF.
- El padre puede confirmar o rechazar una reunión.

---

## Fase 5 — Gestión académica

**Objetivo:** dejar de depender de `grade_section` como texto libre y modelar la estructura del colegio.

### Modelos nuevos

- `academic_years`: nombre, fecha de inicio, fecha de fin, activo.
- `sections`: grado, nombre de sección, año académico, capacidad.
- `courses`: nombre y código.
- `teaching_assignments`: docente, curso, sección, año académico.
- `student_enrollments`: estudiante, sección, año académico, estado.

### Tareas

- [ ] Crear migraciones y modelos con asociaciones en `backend/models/index.js`.
- [ ] Mantener `grade_section` como campo de compatibilidad durante la transición.
- [ ] Agregar `section_id` a estudiantes y rellenar los datos existentes desde `grade_section`.
- [ ] Crear CRUD de años académicos, secciones y cursos.
- [ ] Crear asignación de docentes a cursos y secciones.
- [ ] Crear matrícula de estudiantes por año académico.
- [ ] Actualizar filtros de reportes y dashboard para usar secciones reales.
- [ ] Crear importación masiva de estudiantes desde CSV/Excel con vista previa y validación.
- [ ] Crear generación masiva de carnets QR en PDF por sección.
- [ ] Actualizar formularios de estudiante para elegir sección y año académico.
- [ ] Mostrar al docente solo las secciones que tiene asignadas.

### Criterios de aceptación

- Se pueden crear secciones y cursos desde la interfaz.
- Los estudiantes existentes conservan su grado/sección tras la migración.
- Los reportes filtran por sección real.
- La importación rechaza filas inválidas sin detener todo el proceso.
- Se pueden imprimir los QR de una sección completa.

---

## Fase 6 — Reportes y exportación

**Objetivo:** generar reportes oficiales en servidor, con historial y buen rendimiento.

### Tareas

- [ ] Agregar paginación y filtros a `GET /api/attendance`, `/api/students` y `/api/parents`.
- [ ] Crear índices en `attendance(student_id, attendance_date)`, `attendance(check_in)`, `students(grade_section)` y `meeting_attendance(meeting_id, parent_id)`.
- [ ] Generar PDF en servidor con `pdfkit` o plantilla HTML, incluyendo logo y nombre del colegio.
- [ ] Generar Excel con `exceljs`.
- [ ] Crear tabla `report_history` con tipo, filtros, usuario, archivo y fecha.
- [ ] Crear pantalla de historial de reportes con descarga y reenvío por email.
- [ ] Programar reportes semanales y mensuales por email.
- [ ] Agregar reportes por estudiante, sección, curso y rango de fechas.
- [ ] Mantener la exportación actual del navegador como opción rápida, pero usar la del servidor para reportes oficiales.
- [ ] Unificar el cálculo de fechas en America/Lima en `dashboardRoutes`.

### Criterios de aceptación

- Un reporte de 1000 registros se genera sin bloquear la interfaz.
- El PDF y el Excel coinciden con los datos mostrados.
- Queda registro de quién generó cada reporte.
- Las consultas paginadas responden en menos de un segundo con datos de prueba.

---

## Fase 7 — Operación, calidad y despliegue

**Objetivo:** que el sistema sea mantenible, observable y recuperable.

### Tareas

- [ ] Instalar y configurar `sequelize-cli`.
- [ ] Crear migraciones para todo el esquema actual y los cambios de fases anteriores.
- [ ] Reemplazar `sequelize.sync` por migraciones al arrancar o por un paso explícito de despliegue.
- [ ] Actualizar o eliminar `database.sql` para que no contradiga los modelos.
- [ ] Crear seeders para roles, usuario administrador y datos de prueba.
- [ ] Agregar pruebas de backend con Vitest + Supertest.
- [ ] Agregar pruebas de frontend con Vitest + React Testing Library.
- [ ] Agregar un flujo E2E básico con Playwright: login, escaneo, consulta de reporte.
- [ ] Configurar GitHub Actions: lint, tests y build en cada PR.
- [ ] Integrar Sentry para errores de backend y frontend.
- [ ] Agregar logs estructurados con pino y un ID de correlación por petición.
- [ ] Configurar respaldos automáticos de MySQL y probar una restauración.
- [ ] Convertir el frontend en PWA con manifest y service worker.
- [ ] Implementar modo offline del escáner con cola de sincronización.
- [ ] Agregar Error Boundary y pantalla de error amigable.
- [ ] Actualizar `README.md` con arquitectura, variables, migraciones, despliegue y runbook.

### Criterios de aceptación

- Un entorno nuevo se levanta solo con migraciones y seeders.
- El CI falla si hay errores de lint, tests o build.
- Los errores de producción llegan a Sentry.
- Existe un respaldo restaurable.
- La app se puede instalar como PWA y el escáner tolera cortes de red.

---

## Fase 8 — Integraciones opcionales

Implementar solo si el colegio lo necesita:

- [ ] Lectores RFID/NFC o biometría para asistencia.
- [ ] Modo kiosco para tablet en la entrada.
- [ ] Sincronización con Google Calendar para reuniones.
- [ ] Pasarela de pagos para APAFA o pensiones (Culqi, Mercado Pago, Niubiz).
- [ ] Analítica externa con Looker Studio, Power BI o Metabase.
- [ ] Reconocimiento facial con consentimiento expreso y cumplimiento de protección de datos.
- [ ] Firma digital de actas de reunión.

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Cambios de esquema rompen producción | Migraciones, respaldo previo y entorno de staging |
| Notificaciones se pierden en Vercel | Outbox + job programado, no promesas sueltas |
| Se rompe el escaneo al exigir login | Desplegar backend y frontend juntos; probar en staging |
| Padres ven datos de otros | Pruebas de autorización y filtros por vínculo |
| Proveedor de WhatsApp no aprueba la cuenta | Tener Wapsat como respaldo y abstraer el proveedor |
| Alcance demasiado grande | Cerrar cada fase antes de iniciar la siguiente |
| Costos de Vercel por cron/funciones | Revisar límites del plan y usar jobs externos si hace falta |

---

## Definición de terminado global

- Todas las rutas sensibles requieren autenticación y rol.
- Padre y estudiante solo acceden a sus datos.
- Notificaciones con registro, reintentos y preferencias.
- Jobs automáticos sin duplicados.
- Migraciones y seeders funcionando desde cero.
- Tests de backend, frontend y E2E en CI.
- Documentación actualizada y secretos fuera del repositorio.
- Respaldos y monitoreo activos.

---

## Orden de ejecución recomendado

1. Fase 0: estabilizar y documentar.
2. Fase 1: cerrar la API y corregir roles.
3. Fase 2: portal familiar.
4. Fase 3: notificaciones.
5. Fase 4: automatización.
6. Fase 5: gestión académica.
7. Fase 6: reportes.
8. Fase 7: calidad y operación.
9. Fase 8: opcionales según presupuesto.

No avanzar a la siguiente fase sin cumplir los criterios de aceptación de la anterior.
