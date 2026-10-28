const { z } = require('zod');

const email = z.string().trim().max(255).email('Correo electrónico inválido');
const optionalEmail = z.union([z.literal(''), email]).optional().nullable();
const password = z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(128);
const optionalPassword = z.union([z.literal(''), password]).optional().nullable();
const dni = z.string().trim().regex(/^\d{8}$/, 'El DNI debe tener 8 dígitos');
const optionalDni = z.union([z.literal(''), dni]).optional().nullable();
const text = (max = 255) => z.string().trim().max(max);
const idValue = z.union([z.string().regex(/^\d+$/), z.number().int().positive()]);
const dateValue = z.union([z.string().min(1), z.null()]).optional();
const roleName = z.enum(['admin', 'director', 'docente', 'padre', 'estudiante']);

const loginSchema = z.object({
  email: email,
  password: z.string().min(1, 'La contraseña es obligatoria').max(128)
});

const forgotPasswordSchema = z.object({
  email: email
});

const resetPasswordSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/i, 'Token inválido'),
  password: password
});

const createUserSchema = z.object({
  email,
  password,
  roleName
});

const updateUserPasswordSchema = z.object({
  password
});

const parentPayloadSchema = z.object({
  id: idValue.optional().nullable(),
  parent_dni: optionalDni,
  parent_first_name: text(100).optional().nullable(),
  parent_last_name: text(100).optional().nullable(),
  parent_phone: text(30).optional().nullable()
});

const createStudentSchema = z.object({
  first_name: text(100).min(1, 'El nombre es obligatorio'),
  last_name: text(100).min(1, 'El apellido es obligatorio'),
  dni: optionalDni,
  section_id: z.union([z.string().max(30), z.number()]).optional().nullable(),
  grade_section: text(50).optional().nullable(),
  parents: z.array(parentPayloadSchema).optional(),
  email: optionalEmail,
  password: optionalPassword
});

const updateStudentSchema = z.object({
  first_name: text(100).min(1).optional(),
  last_name: text(100).min(1).optional(),
  dni: optionalDni,
  section_id: z.union([z.string().max(30), z.number()]).optional().nullable(),
  grade_section: text(50).optional().nullable(),
  parents: z.array(parentPayloadSchema).optional(),
  email: optionalEmail,
  password: optionalPassword
});

const createParentSchema = z.object({
  first_name: text(100).min(1, 'El nombre es obligatorio'),
  last_name: text(100).min(1, 'El apellido es obligatorio'),
  dni: optionalDni,
  email: optionalEmail,
  password: optionalPassword,
  phone: text(30).optional().nullable()
});

const updateParentSchema = z.object({
  first_name: text(100).min(1).optional(),
  last_name: text(100).min(1).optional(),
  dni: optionalDni,
  email: optionalEmail,
  password: optionalPassword,
  phone: text(30).optional().nullable()
});

const scanStudentSchema = z.object({
  uuid: z.string().trim().min(1, 'El código QR es obligatorio').max(100)
});

const createAttendanceSchema = z.object({
  student_id: idValue.optional(),
  student_ids: z.array(idValue).min(1).optional(),
  date: z.string().max(40).optional().nullable(),
  notes: text(1000).optional().nullable(),
  justification_reason: text(500).optional().nullable()
}).refine((data) => data.student_id || (data.student_ids && data.student_ids.length), {
  message: 'Debe seleccionar al menos un estudiante',
  path: ['student_ids']
});

const justifyAttendanceSchema = z.object({
  justification_reason: text(500).min(1, 'El motivo de justificación es obligatorio')
});

const updateAttendanceSchema = z.object({
  check_in: dateValue,
  check_out: dateValue,
  status: z.enum(['presente', 'tardanza', 'ausente']).optional(),
  notes: text(1000).optional().nullable(),
  is_absence: z.boolean().optional(),
  is_justified: z.boolean().optional(),
  justification_reason: text(500).optional().nullable()
});

const meetingSchema = z.object({
  title: text(150).min(1, 'El título es obligatorio'),
  date: z.string().min(1, 'La fecha es obligatoria').max(40),
  time: z.string().min(1, 'La hora es obligatoria').max(20),
  description: text(1000).optional().nullable(),
  type: z.enum(['APAFA', 'ESCUELA_PADRES', 'OTRO']).optional()
});

const updateMeetingSchema = meetingSchema.partial();

const scanParentSchema = z.object({
  uuid: z.string().trim().min(1, 'El código QR es obligatorio').max(100),
  meeting_id: idValue
});

const meetingAttendanceSchema = z.object({
  parent_id: idValue,
  check_in: dateValue,
  check_out: dateValue
});

const updateMeetingAttendanceSchema = z.object({
  check_in: dateValue,
  check_out: dateValue
});

const dniSchema = z.object({
  dni
});

module.exports = {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  createUserSchema,
  updateUserPasswordSchema,
  createStudentSchema,
  updateStudentSchema,
  createParentSchema,
  updateParentSchema,
  scanStudentSchema,
  createAttendanceSchema,
  justifyAttendanceSchema,
  updateAttendanceSchema,
  meetingSchema,
  updateMeetingSchema,
  scanParentSchema,
  meetingAttendanceSchema,
  updateMeetingAttendanceSchema,
  dniSchema
};
