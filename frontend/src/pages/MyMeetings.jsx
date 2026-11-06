import { useState, useEffect } from 'react';
import { useAuth } from '../context/authContextValue';
import api from '../services/api';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Hourglass,
  QrCode,
  Loader2,
  Users,
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';

const MyMeetings = () => {
  const { user } = useAuth();
  const isParent = user?.role === 'padre';

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'upcoming', 'past'

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get('/me/meetings');
        setMeetings(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Error al cargar reuniones:', err);
        setError('No se pudieron obtener las reuniones programadas');
      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
  }, []);

  const filteredMeetings = meetings.filter((m) => {
    if (activeTab === 'upcoming') return m.is_upcoming;
    if (activeTab === 'past') return !m.is_upcoming;
    return true;
  });

  const upcomingCount = meetings.filter((m) => m.is_upcoming).length;
  const attendedCount = meetings.filter((m) => m.attendance_status === 'presente').length;

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            {isParent ? 'Convocatorias y Reuniones de Padres' : 'Reuniones y Eventos Institucionales'}
          </h2>
          <p className="text-xs md:text-sm text-slate-500">
            Revisa las asambleas generales, reuniones de APAFA y tu constancia de asistencia.
          </p>
        </div>

        {isParent && (
          <Link
            to="/dashboard/my-qr"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition-colors shadow-md shadow-violet-200 self-start sm:self-auto"
          >
            <QrCode size={16} /> Ver mi QR de Padre
          </Link>
        )}
      </div>

      {/* Nota informativa para padres */}
      {isParent && (
        <div className="bg-violet-50/70 border border-violet-200/80 rounded-2xl p-4 flex items-start gap-3 text-xs md:text-sm text-violet-900">
          <Info size={20} className="text-violet-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>¿Cómo registrar tu asistencia?</strong> Al ingresar a la institución el día de la reunión, presenta tu <strong>código QR de padre/apoderado</strong> en el punto de control para que sea escaneado. Tu asistencia quedará registrada inmediatamente en esta pantalla.
          </p>
        </div>
      )}

      {/* Métricas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Total Convocadas</span>
          <div className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">
            {loading ? '--' : meetings.length}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <span className="text-[11px] font-bold text-violet-600 uppercase">Próximas Reuniones</span>
          <div className="text-2xl md:text-3xl font-extrabold text-violet-600 mt-1">
            {loading ? '--' : upcomingCount}
          </div>
        </div>

        {isParent && (
          <div className="col-span-2 md:col-span-1 bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-emerald-600 uppercase">Asistidas por ti</span>
            <div className="text-2xl md:text-3xl font-extrabold text-emerald-600 mt-1">
              {loading ? '--' : attendedCount}
            </div>
          </div>
        )}
      </div>

      {/* Selector de pestañas */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'all'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Todas ({meetings.length})
        </button>
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'upcoming'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Próximas ({upcomingCount})
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'past'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Pasadas ({meetings.length - upcomingCount})
        </button>
      </div>

      {/* Listado de Reuniones */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="animate-spin text-violet-600 mb-2" size={32} />
          <p className="text-sm font-medium">Cargando convocatorias...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-600 text-sm">
          <AlertCircle size={32} className="mx-auto mb-2 text-red-500" />
          <p>{error}</p>
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center text-slate-400">
          <Calendar size={48} className="mx-auto mb-3 text-slate-300" />
          <h4 className="text-base font-bold text-slate-700 mb-1">
            No hay reuniones en esta categoría
          </h4>
          <p className="text-xs text-slate-400">
            {activeTab === 'upcoming'
              ? 'No hay reuniones programadas para fechas próximas.'
              : 'No se encontraron registros de reuniones.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMeetings.map((m) => {
            const isUpcoming = m.is_upcoming;
            const status = m.attendance_status;

            let badgeConfig = {
              text: 'Informativo',
              className: 'bg-slate-100 text-slate-700',
              icon: Info
            };

            if (isParent) {
              if (status === 'presente') {
                badgeConfig = {
                  text: 'Presente',
                  className: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
                  icon: CheckCircle2
                };
              } else if (status === 'ausente') {
                badgeConfig = {
                  text: 'Inasistencia',
                  className: 'bg-red-100 text-red-800 border border-red-200',
                  icon: AlertCircle
                };
              } else {
                badgeConfig = {
                  text: 'Pendiente',
                  className: 'bg-violet-100 text-violet-800 border border-violet-200',
                  icon: Hourglass
                };
              }
            }

            const BadgeIcon = badgeConfig.icon;

            return (
              <div
                key={m.id}
                className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-extrabold text-[11px] uppercase tracking-wider">
                      {m.type || 'Reunión'}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${badgeConfig.className}`}
                    >
                      <BadgeIcon size={13} />
                      {badgeConfig.text}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-2">{m.title}</h3>

                  {m.description && (
                    <p className="text-xs md:text-sm text-slate-600 leading-relaxed mb-4">
                      {m.description}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <Calendar size={14} className="text-violet-600" />
                      {new Date(`${m.date}T12:00:00`).toLocaleDateString('es-ES', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <Clock size={14} className="text-violet-600" />
                      {m.time ? m.time.slice(0, 5) : 'Por definir'}
                    </span>
                  </div>

                  {isParent && status === 'presente' && m.check_in && (
                    <p className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-3 py-1.5 rounded-xl">
                      Hora de registro: {new Date(m.check_in).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyMeetings;

