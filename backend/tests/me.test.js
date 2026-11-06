const meController = require('../controllers/meController');
const { Parent, Student, StudentParent, Attendance, Meeting, MeetingAttendance } = require('../models');

describe('Portal de familias (/api/me)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/me/children', () => {
    it('rechaza a un estudiante o rol no-padre con 403', async () => {
      const req = { user: { id: 1, role: 'estudiante' } };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

      await meController.getChildren(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('devuelve los hijos del padre autenticado', async () => {
      vi.spyOn(Parent, 'findOne').mockResolvedValue({ id: 20 });
      vi.spyOn(StudentParent, 'findAll').mockResolvedValue([{ student_id: 101 }, { student_id: 102 }]);
      vi.spyOn(Student, 'findAll').mockResolvedValue([
        { id: 101, first_name: 'Ana', last_name: 'Gómez' },
        { id: 102, first_name: 'Carlos', last_name: 'Gómez' }
      ]);

      const req = { user: { id: 2, role: 'padre' } };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

      await meController.getChildren(req, res);

      expect(res.json).toHaveBeenCalledWith([
        { id: 101, first_name: 'Ana', last_name: 'Gómez' },
        { id: 102, first_name: 'Carlos', last_name: 'Gómez' }
      ]);
    });
  });

  describe('GET /api/me/student', () => {
    it('rechaza a un padre con 403', async () => {
      const req = { user: { id: 2, role: 'padre' } };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

      await meController.getStudent(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('devuelve el perfil del estudiante autenticado', async () => {
      vi.spyOn(Student, 'findOne').mockResolvedValue({
        id: 55,
        first_name: 'Mateo',
        last_name: 'Díaz',
        grade_section: '3ro A'
      });

      const req = { user: { id: 8, role: 'estudiante' } };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

      await meController.getStudent(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: 55, first_name: 'Mateo' })
      );
    });
  });

  describe('GET /api/me/attendance', () => {
    it('rechaza a un padre si child_id no le pertenece con 403', async () => {
      vi.spyOn(Parent, 'findOne').mockResolvedValue({ id: 10 });
      vi.spyOn(StudentParent, 'findAll').mockResolvedValue([{ student_id: 1 }]);

      const req = {
        user: { id: 5, role: 'padre' },
        query: { child_id: '99' }
      };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

      await meController.getAttendance(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'No tienes acceso a los datos de este estudiante'
      });
    });

    it('un estudiante no puede consultar la asistencia de otro estudiante', async () => {
      vi.spyOn(Student, 'findOne').mockResolvedValue({ id: 42 });

      const req = {
        user: { id: 12, role: 'estudiante' },
        query: { child_id: '99' }
      };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

      await meController.getAttendance(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Solo puedes consultar tu propia asistencia'
      });
    });

    it('calcula resumen de asistencia correctamente (presentes, tardanzas, faltas, porcentaje)', async () => {
      vi.spyOn(Parent, 'findOne').mockResolvedValue({ id: 10 });
      vi.spyOn(StudentParent, 'findAll').mockResolvedValue([{ student_id: 1 }]);
      vi.spyOn(Student, 'findByPk').mockResolvedValue({
        id: 1,
        first_name: 'Lucía',
        last_name: 'Paredes'
      });

      const mockRecords = [
        { status: 'presente', is_justified: false, attendance_date: '2026-11-01' },
        { status: 'presente', is_justified: false, attendance_date: '2026-11-02' },
        { status: 'tardanza', is_justified: false, attendance_date: '2026-11-03' },
        { status: 'ausente', is_justified: false, attendance_date: '2026-11-04' },
        { status: 'ausente', is_justified: true, attendance_date: '2026-11-05' }
      ];
      vi.spyOn(Attendance, 'findAll').mockResolvedValue(mockRecords);

      const req = {
        user: { id: 5, role: 'padre' },
        query: { child_id: '1' }
      };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

      await meController.getAttendance(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          summary: {
            total: 5,
            presentes: 2,
            tardanzas: 1,
            faltas: 1,
            faltas_justificadas: 1,
            porcentaje: 60 // (2 + 1) / 5 * 100 = 60%
          },
          records: mockRecords
        })
      );
    });
  });

  describe('GET /api/me/meetings', () => {
    it('mapea estado de asistencia a reuniones para un padre', async () => {
      vi.spyOn(Parent, 'findOne').mockResolvedValue({ id: 10 });
      vi.spyOn(MeetingAttendance, 'findAll').mockResolvedValue([
        { meeting_id: 1, check_in: '2026-10-15T18:05:00', check_out: '2026-10-15T19:30:00' }
      ]);
      vi.spyOn(Meeting, 'findAll').mockResolvedValue([
        { id: 1, title: 'Reunión 1', date: '2026-10-15', time: '18:00', type: 'APAFA' },
        { id: 2, title: 'Reunión Futura', date: '2099-01-01', time: '19:00', type: 'ESCUELA_PADRES' },
        { id: 3, title: 'Reunión Pasada Inasistida', date: '2026-09-01', time: '18:00', type: 'OTRO' }
      ]);

      const req = { user: { id: 5, role: 'padre' } };
      const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };

      await meController.getMeetings(req, res);

      expect(res.json).toHaveBeenCalledWith([
        expect.objectContaining({ id: 1, attendance_status: 'presente' }),
        expect.objectContaining({ id: 2, attendance_status: 'pendiente', is_upcoming: true }),
        expect.objectContaining({ id: 3, attendance_status: 'ausente', is_upcoming: false })
      ]);
    });
  });
});

