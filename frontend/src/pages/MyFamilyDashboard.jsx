import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/authContextValue';
import api from '../services/api';
import {
  Users,
  Calendar,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  ChevronRight,
  Loader2,
  GraduationCap,
  ArrowRight,
  Bell
} from 'lucide-react';

const MyFamilyDashboard = () => {
  const { user } = useAuth();
  const isParent = user?.role === 'padre';

  // Estados comunes
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estados para Padre
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);

  // Estados para Estudiante
  const [studentProfile, setStudentProfile] = useState(null);

  // Estados de Asistencia y Reuniones
  const [attendanceData, setAttendanceData] = useState(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);

  // 1. Cargar perfil inicial (Hijos si es padre, Perfil si es estudiante)
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError('');

        if (isParent) {
          const res = await api.get('/me/children');
          const kids = Array.isArray(res.data) ? res.data : [];
          setChildren(kids);
          if (kids.length > 0) {
            setSelectedChild(kids[0]);
          }
        } else {
          const res = await api.get('/me/student');
          setStudentProfile(res.data);
        }

        // Cargar próximas reuniones
        try {
          const meetingsRes = await api.get('/me/meetings');
          const meetings = Array.isArray(meetingsRes.data) ? meetingsRes.data : [];
          const upcoming = meetings.filter((m) => m.is_upcoming).slice(0, 2);
          setUpcomingMeetings(upcoming);
        } catch (meetingErr) {
          console.error('Error cargando reuniones:', meetingErr);
        }
      } catch (err) {
        console.error('Error cargando portal familiar:', err);
        setError(err.response?.data?.message || 'Error al conectar con el servidor');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [isParent]);

  // 2. Cargar asistencia cuando cambia el estudiante seleccionado
  useEffect(() => {
    const studentId = isParent ? selectedChild?.id : studentProfile?.id;
    if (!studentId) {
      setAttendanceData(null);
      return;
    }

    const fetchAttendance = async () => {
      try {
        setLoadingAttendance(true);
        const params = isParent ? { child_id: studentId } : {};
        const res = await api.get('/me/attendance', { params });
        setAttendanceData(res.data);
      } catch (err) {
        console.error('Error cargando asistencia:', err);
      } finally {
        setLoadingAttendance(false);
      }
    };

    fetchAttendance();
  }, [isParent, selectedChild, studentProfile]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] p-8">
        <Loader2 className="animate-spin text-emerald-600 mb-3" size={36} />
        <p className="text-slate-500 font-medium text-sm">Cargando información familiar...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-lg mx-auto my-8">
        <AlertCircle className="text-red-500 mx-auto mb-2" size={32} />
        <h3 className="text-red-800 font-bold mb-1">No se pudo cargar la información</h3>
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // Caso: Padre sin hijos vinculados en la base de datos
  if (isParent && children.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 md:p-8 text-white shadow-lg">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-sm mb-3">
            <ShieldCheck size={14} /> Portal de Padres
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold mb-2">Bienvenido(a) a EduControl</h2>
          <p className="text-emerald-100 text-sm md:text-base max-w-2xl">
            Desde este portal podrás consultar en tiempo real la asistencia, el carnet QR y las convocatorias a reuniones.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <Users size={30} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No hay estudiantes vinculados a tu cuenta</h3>
          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            Tu cuenta de usuario está activa, pero aún no tiene ningún hijo asociado. Por favor comunícate con la dirección o secretaría del colegio para verificar que tu DNI esté registrado como apoderado en la ficha del estudiante.
          </p>
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-100 px-4 py-2 rounded-xl">
            <span>Usuario autenticado:</span>
            <strong className="text-slate-800">{user?.email}</strong>
          </div>
        </div>
      </div>
    );
  }

  const activeStudent = isParent ? selectedChild : studentProfile;
  const summary = attendanceData?.summary || {
    total: 0,
    presentes: 0,
    tardanzas: 0,
    faltas: 0,
    faltas_justificadas: 0,
    porcentaje: 0
  };
  const recentRecords = (attendanceData?.records || []).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Banner de Bienvenida */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-700 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur-sm mb-3">
            <ShieldCheck size={14} />
            {isParent ? 'Portal de Apoderados' : 'Portal del Estudiante'}
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold mb-1">
            Hola, {activeStudent ? `${activeStudent.first_name}` : user?.email?.split('@')[0]}
          </h2>
          <p className="text-emerald-100 text-sm md:text-base max-w-2xl">
            {isParent
              ? 'Monitorea la asistencia de tus hijos, descarga sus carnets QR y mantente informado de las reuniones.'
              : 'Revisa tu registro diario de asistencia escolar y tu código QR de ingreso.'}
          </p>
        </div>

        <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 opacity-10 pointer-events-none">
          <GraduationCap size={220} />
        </div>
      </div>

      {/* Selector de Hijo (si es padre y tiene más de 1 hijo) */}
      {isParent && children.length > 1 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Selecciona el estudiante a consultar:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {children.map((child) => {
              const isSelected = selectedChild?.id === child.id;
              return (
                <button
                  key={child.id}
                  onClick={() => setSelectedChild(child)}
                  className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                      isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {child.first_name?.[0]}
                    {child.last_name?.[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 text-sm truncate">
                      {child.first_name} {child.last_name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {child.grade_section || 'Sin grado'} • DNI: {child.dni || 'S/D'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tarjeta con Identificación del Estudiante Actual */}
      {activeStudent && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-extrabold text-xl shrink-0">
              {activeStudent.first_name?.[0]}
              {activeStudent.last_name?.[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-slate-900">
                  {activeStudent.first_name} {activeStudent.last_name}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  {activeStudent.grade_section || 'Estudiante'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                DNI: <strong>{activeStudent.dni || 'No registrado'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/dashboard/my-qr"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold transition-colors border border-sky-200/60"
            >
              <QrCode size={16} /> Ver Carnet QR
            </Link>
            <Link
              to="/dashboard/my-attendance"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold transition-all shadow-md shadow-emerald-200"
            >
              <Calendar size={16} /> Historial Completo
            </Link>
          </div>
        </div>
      )}

      {/* Métricas Resumen de Asistencia */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        {/* Asistencia general % */}
        <div className="col-span-2 lg:col-span-1 bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Asistencia</span>
            <ShieldCheck size={18} className="text-emerald-600" />
          </div>
          <div>
            <div className="text-3xl font-extrabold text-slate-900 mb-1">
              {loadingAttendance ? '--' : `${summary.porcentaje}%`}
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  summary.porcentaje >= 85
                    ? 'bg-emerald-500'
                    : summary.porcentaje >= 70
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(summary.porcentaje, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Presentes */}
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Presentes</span>
            <CheckCircle2 size={18} className="text-emerald-600" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-emerald-600">
            {loadingAttendance ? '--' : summary.presentes}
          </div>
          <span className="text-[11px] text-slate-400">Días a tiempo</span>
        </div>

        {/* Tardanzas */}
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Tardanzas</span>
            <Clock size={18} className="text-amber-500" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-amber-500">
            {loadingAttendance ? '--' : summary.tardanzas}
          </div>
          <span className="text-[11px] text-slate-400">Ingresos tarde</span>
        </div>

        {/* Faltas injustificadas */}
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Inasistencias</span>
            <AlertCircle size={18} className="text-red-500" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-red-500">
            {loadingAttendance ? '--' : summary.faltas}
          </div>
          <span className="text-[11px] text-slate-400">Sin justificar</span>
        </div>

        {/* Faltas justificadas */}
        <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Justificadas</span>
            <FileCheck size={18} className="text-sky-600" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-sky-600">
            {loadingAttendance ? '--' : summary.faltas_justificadas}
          </div>
          <span className="text-[11px] text-slate-400">Permisos válidos</span>
        </div>
      </div>

      {/* Grid: Actividad Reciente + Próximas Reuniones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Actividad Reciente de Asistencia (2 columnas) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Últimos Registros de Asistencia</h3>
              <p className="text-xs text-slate-500">Actividad reciente registrada en la puerta escolar</p>
            </div>
            <Link
              to="/dashboard/my-attendance"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
            >
              Ver todo <ArrowRight size={14} />
            </Link>
          </div>

          {loadingAttendance ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="animate-spin text-slate-400" size={24} />
            </div>
          ) : recentRecords.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">
              <Calendar size={36} className="mx-auto mb-2 text-slate-300" />
              <p>Aún no hay asistencias registradas para este estudiante.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentRecords.map((item) => {
                const isJustified = item.is_justified;
                let badgeClass = 'bg-emerald-100 text-emerald-800';
                let label = 'Presente';
                let Icon = CheckCircle2;

                if (isJustified) {
                  badgeClass = 'bg-sky-100 text-sky-800';
                  label = 'Justificada';
                  Icon = FileCheck;
                } else if (item.status === 'tardanza') {
                  badgeClass = 'bg-amber-100 text-amber-800';
                  label = 'Tardanza';
                  Icon = Clock;
                } else if (item.status === 'ausente') {
                  badgeClass = 'bg-red-100 text-red-800';
                  label = 'Inasistencia';
                  Icon = AlertCircle;
                }

                const checkInTime = item.check_in
                  ? new Date(item.check_in).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
                  : '--:--';
                const checkOutTime = item.check_out
                  ? new Date(item.check_out).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
                  : null;

                return (
                  <div key={item.id} className="py-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl shrink-0 ${badgeClass}`}>
                        <Icon size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 capitalize">
                          {new Date(`${item.attendance_date}T12:00:00`).toLocaleDateString('es-ES', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short'
                          })}
                        </p>
                        <p className="text-xs text-slate-500">
                          Ingreso: <strong className="text-slate-700">{checkInTime}</strong>
                          {checkOutTime && (
                            <>
                              {' '}
                              • Salida: <strong className="text-slate-700">{checkOutTime}</strong>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${badgeClass}`}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Próximas Reuniones y Carnet (1 columna) */}
        <div className="space-y-6">
          {/* Card: Próximas Reuniones */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Bell size={18} className="text-violet-600" /> Convocatorias
              </h3>
              <Link
                to="/dashboard/my-meetings"
                className="text-xs font-bold text-violet-600 hover:text-violet-700"
              >
                Ver más
              </Link>
            </div>

            {upcomingMeetings.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                No hay reuniones programadas para los próximos días.
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="p-3.5 rounded-2xl bg-violet-50/60 border border-violet-100 flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded bg-violet-200 text-violet-800">
                        {meeting.type || 'Reunión'}
                      </span>
                      <span className="text-xs font-semibold text-violet-700">
                        {meeting.date} • {meeting.time?.slice(0, 5)}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">{meeting.title}</h4>
                    {meeting.description && (
                      <p className="text-xs text-slate-600 line-clamp-2">{meeting.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card: Acceso Rápido al Carnet QR */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-lg flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-sky-400 mb-3">
                <QrCode size={22} />
              </div>
              <h4 className="text-lg font-bold mb-1">Carnet QR Escolar</h4>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                Lleva contigo el carnet digital de tu estudiante para registrar el ingreso y salida en los torniquetes o escáner del colegio.
              </p>
            </div>
            <Link
              to="/dashboard/my-qr"
              className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs text-center transition-colors shadow-md shadow-sky-500/20"
            >
              Abrir Carnet QR
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyFamilyDashboard;

