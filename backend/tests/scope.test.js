const { Op } = require('sequelize');

const { Parent, Student, StudentParent } = require('../models');
const {
  resolveFamilyScope,
  ensureStudentAccess,
  buildStudentWhere,
  buildAttendanceWhere
} = require('../middlewares/scopeMiddleware');

describe('Alcance de datos para familias', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('un padre solo obtiene los estudiantes vinculados a su cuenta', async () => {
    vi.spyOn(Parent, 'findOne').mockResolvedValue({ id: 10 });
    vi.spyOn(StudentParent, 'findAll').mockResolvedValue([
      { student_id: 1 },
      { student_id: 3 }
    ]);

    const scope = await resolveFamilyScope({ id: 5, role: 'padre' });

    expect(scope.parentId).toBe(10);
    expect(scope.studentIds).toEqual([1, 3]);
  });

  it('un estudiante solo obtiene su propio identificador', async () => {
    vi.spyOn(Student, 'findOne').mockResolvedValue({ id: 42 });

    const scope = await resolveFamilyScope({ id: 9, role: 'estudiante' });

    expect(scope.studentIds).toEqual([42]);
  });

  it('el personal administrativo no queda limitado por alcance familiar', async () => {
    const scope = await resolveFamilyScope({ id: 1, role: 'docente' });
    expect(scope.studentIds).toBeNull();
  });

  it('impide que un padre consulte a un estudiante de otra familia', async () => {
    const req = {
      user: { id: 5, role: 'padre' },
      scope: { parentId: 10, studentIds: [1, 3] },
      params: { id: '99' }
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    const next = vi.fn();

    await ensureStudentAccess()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('permite que un padre consulte a su propio hijo', async () => {
    const req = {
      user: { id: 5, role: 'padre' },
      scope: { parentId: 10, studentIds: [1, 3] },
      params: { id: '3' }
    };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    const next = vi.fn();

    await ensureStudentAccess()(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('construye filtros de estudiantes y asistencia limitados al alcance', () => {
    const req = {
      user: { role: 'padre' },
      scope: { parentId: 10, studentIds: [1, 3] }
    };

    const studentWhere = buildStudentWhere(req, { grade_section: '1 A' });
    const attendanceWhere = buildAttendanceWhere(req, { status: 'ausente' });

    expect(studentWhere.grade_section).toBe('1 A');
    expect(studentWhere.id[Op.in]).toEqual([1, 3]);
    expect(attendanceWhere.status).toBe('ausente');
    expect(attendanceWhere.student_id[Op.in]).toEqual([1, 3]);
  });
});
