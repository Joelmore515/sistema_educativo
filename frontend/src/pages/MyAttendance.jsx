import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/authContextValue';
import api from '../services/api';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  Filter,
  RotateCcw,
  Loader2,
  ChevronDown,
  Info,
  CalendarRange
} from 'lucide-react';

const MyAttendance = () => {
  const { user } = useAuth();
  const isParent = user?.role === 'padre';

  // Hijos para el selector (si es padre)
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Filtros
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Datos de asistencia
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedJustification, setExpandedJustification] = useState(null);

  // 1. Cargar hijos si es padre
  useEffect(() => {
    const fetchChildren = async () => {
      try {
        setLoadingInitial(true);
        if (isParent) {
          const res = await api.get('/me/children');
          const kids = Array.isArray(res.data) ? res.data : [];
          setChildren(kids);
          if (kids.length > 0) {
            setSelectedChildId(String(kids[0].id));
          }
        }
      } catch (err) {
        console.error('Error al cargar hijos:', err);
        setError('No se pudo cargar la lista de estudiantes vinculados');
      } finally {
        setLoadingInitial(false);
      }
    };

    fetchChildren();
  }, [isParent]);

  // 2. Cargar historial y resumen de asistencia
  const fetchAttendance = async () => {
    if (isParent && !selectedChildId) return;

    try {
      setLoading(true);
      setError('');
      const params = {};
      if (isParent && selectedChildId) params.child_id = selectedChildId;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/me/attendance', { params });
      setData(res.data);
    } catch (err) {
      console.error('Error al cargar asistencia:', err);
      setError(err.response?.data?.message || 'Error al obtener registros de asistencia');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loadingInitial) {
      fetchAttendance();
    }
  }, [selectedChildId, statusFilter, loadingInitial]);

  // Helper filtros rápidos de fecha
  const setQuickRange = (type) => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    if (type === 'month') {
      const firstDay = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
      setFromDate(firstDay);
      setToDate(todayStr);
    } else if (type === '30days') {
      const past = new Date(now);
      past.setDate(past.getDate() - 30);
      setFromDate(`${past.getFullYear()}-${pad(past.getMonth() + 1)}-${pad(past.getDate())}`);
      setToDate(todayStr);
    } else if (type === 'clear') {
      setFromDate('');
      setToDate('');
      setStatusFilter('');
    }
  };

  const selectedChild = useMemo(() => {
    if (!isParent) return data?.student;
    return children.find((c) => String(c.id) === String(selectedChildId));
  }, [isParent, children, selectedChildId, data?.student]);

  if (loadingInitial) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] p-8">
        <Loader2 className="animate-spin text-emerald-600 mb-3" size={36} />
        <p className="text-slate-500 font-medium text-sm">Cargando módulo de asistencia...</p>
      </div>
    );
  }

  if (isParent && children.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center max-w-lg mx-auto my-8">
        <AlertCircle size={40} className="text-amber-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900 mb-1">Sin hijos vinculados</h3>
        <p className="text-slate-500 text-sm">
          No tienes estudiantes asociados a tu cuenta para consultar asistencia.
        </p>
      </div>
    );
  }

  const summary = data?.summary || {
    total: 0,
    presentes: 0,
    tardanzas: 0,
    faltas: 0,
    faltas_justificadas: 0,
    porcentaje: 0
  };
  const records = data?.records || [];

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">
            {isParent ? 'Asistencia Escolar de mis Hijos' : 'Mi Historial de Asistencia'}
          </h2>
          <p className="text-xs md:text-sm text-slate-500">
            Revisa los días asistidos, tardanzas, justificaciones y porcentaje de cumplimiento.
          </p>
        </div>

        {/* Selector de hijo si el padre tiene más de 1 */}
        {isParent && children.length > 1 && (
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase">Estudiante:</span>
            <select
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="bg-transparent font-bold text-sm text-slate-800 outline-none cursor-pointer"
            >
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.first_name} {child.last_name} ({child.grade_section || 'Sin grado'})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Ficha rápida del estudiante seleccionado */}
      {selectedChild && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs md:text-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
              {selectedChild.first_name?.[0]}
              {selectedChild.last_name?.[0]}
            </div>
            <div>
              <p className="font-bold text-slate-900">
                {selectedChild.first_name} {selectedChild.last_name}
              </p>
              <p className="text-slate-500 text-xs">
                DNI: <strong>{selectedChild.dni || 'S/D'}</strong> • Grado/Sección:{' '}
                <strong>{selectedChild.grade_section || 'No asignado'}</strong>
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
            {summary.porcentaje}% Cumplimiento
          </span>
        </div>
      )}

      {/* Tarjetas de Métricas Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        {/* Asistencia general % */}
        <div className="col-span-2 md:col-span-1 bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase">Cumplimiento</span>
          <div className="my-1">
            <span className="text-3xl font-extrabold text-slate-900">
              {loading ? '--' : `${summary.porcentaje}%`}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${
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

        {/* Presentes */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase text-slate-500">Presente</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <span className="text-2xl md:text-3xl font-extrabold text-emerald-600">
            {loading ? '--' : summary.presentes}
          </span>
          <p className="text-[11px] text-slate-400 mt-0.5">Días a tiempo</p>
        </div>

        {/* Tardanzas */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase text-slate-500">Tardanza</span>
            <Clock size={16} className="text-amber-500" />
          </div>
          <span className="text-2xl md:text-3xl font-extrabold text-amber-500">
            {loading ? '--' : summary.tardanzas}
          </span>
          <p className="text-[11px] text-slate-400 mt-0.5">Ingresos tarde</p>
        </div>

        {/* Inasistencias */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase text-slate-500">Faltas</span>
            <AlertCircle size={16} className="text-red-500" />
          </div>
          <span className="text-2xl md:text-3xl font-extrabold text-red-500">
            {loading ? '--' : summary.faltas}
          </span>
          <p className="text-[11px] text-slate-400 mt-0.5">Sin justificar</p>
        </div>

        {/* Justificadas */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-bold uppercase text-slate-500">Justificadas</span>
            <FileCheck size={16} className="text-sky-600" />
          </div>
          <span className="text-2xl md:text-3xl font-extrabold text-sky-600">
            {loading ? '--' : summary.faltas_justificadas}
          </span>
          <p className="text-[11px] text-slate-400 mt-0.5">Con justificación</p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white rounded-2xl p-4 md:p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          {/* Desde */}
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-600 mb-1">Desde fecha:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 outline-none"
            />
          </div>

          {/* Hasta */}
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-600 mb-1">Hasta fecha:</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 outline-none"
            />
          </div>

          {/* Estado */}
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-600 mb-1">Filtrar por estado:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 outline-none bg-white cursor-pointer"
            >
              <option value="">Todos los estados</option>
              <option value="presente">Solo Presentes</option>
              <option value="tardanza">Solo Tardanzas</option>
              <option value="ausente">Solo Faltas sin justificar</option>
              <option value="justificada">Solo Justificadas</option>
            </select>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAttendance}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Filter size={15} /> Filtrar
            </button>
            <button
              onClick={() => {
                setQuickRange('clear');
                setTimeout(() => fetchAttendance(), 50);
              }}
              title="Limpiar filtros"
              className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        {/* Accesos rápidos de rango */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap text-xs">
          <span className="text-slate-400 font-semibold flex items-center gap-1">
            <CalendarRange size={13} /> Rango rápido:
          </span>
          <button
            onClick={() => {
              setQuickRange('month');
              setTimeout(() => fetchAttendance(), 50);
            }}
            className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
          >
            Este mes
          </button>
          <button
            onClick={() => {
              setQuickRange('30days');
              setTimeout(() => fetchAttendance(), 50);
            }}
            className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
          >
            Últimos 30 días
          </button>
        </div>
      </div>

      {/* Listado / Tabla de Asistencias */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="animate-spin text-emerald-600 mb-2" size={32} />
            <p className="text-sm font-medium">Buscando registros...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-red-500 text-sm">
            <AlertCircle size={32} className="mx-auto mb-2" />
            <p>{error}</p>
          </div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center text-slate-400 px-4">
            <Calendar size={44} className="mx-auto mb-3 text-slate-300" />
            <h4 className="text-base font-bold text-slate-700 mb-1">
              No se encontraron registros de asistencia
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {fromDate || toDate || statusFilter
                ? 'No hay registros que coincidan con los filtros aplicados. Intenta ampliar el rango de fechas.'
                : 'Aún no se han registrado asistencias para este estudiante.'}
            </p>
          </div>
        ) : (
          <div>
            {/* Tabla en Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Fecha</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Ingreso</th>
                    <th className="px-6 py-4">Salida</th>
                    <th className="px-6 py-4">Detalle / Justificación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {records.map((r) => {
                    const isJustified = r.is_justified;
                    let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                    let label = 'Presente';
                    let Icon = CheckCircle2;

                    if (isJustified) {
                      badgeClass = 'bg-sky-100 text-sky-800 border-sky-200';
                      label = 'Justificada';
                      Icon = FileCheck;
                    } else if (r.status === 'tardanza') {
                      badgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
                      label = 'Tardanza';
                      Icon = Clock;
                    } else if (r.status === 'ausente') {
                      badgeClass = 'bg-red-100 text-red-800 border-red-200';
                      label = 'Inasistencia';
                      Icon = AlertCircle;
                    }

                    const checkInTime = r.check_in
                      ? new Date(r.check_in).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
                      : '--:--';
                    const checkOutTime = r.check_out
                      ? new Date(r.check_out).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
                      : '--:--';

                    const dateFormatted = new Date(`${r.attendance_date}T12:00:00`).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    });

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4 font-semibold capitalize text-slate-900">
                          {dateFormatted}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${badgeClass}`}
                          >
                            <Icon size={13} /> {label}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-700">{checkInTime}</td>
                        <td className="px-6 py-4 font-medium text-slate-700">{checkOutTime}</td>
                        <td className="px-6 py-4 text-xs text-slate-600">
                          {isJustified ? (
                            <div className="bg-sky-50/80 p-2.5 rounded-xl border border-sky-100 max-w-xs">
                              <p className="font-bold text-sky-900 mb-0.5">
                                Motivo: {r.justification_reason || 'Sin motivo detallado'}
                              </p>
                              {r.justification_date && (
                                <p className="text-[11px] text-sky-700">
                                  Justificado el: {new Date(r.justification_date).toLocaleDateString('es-PE')}
                                </p>
                              )}
                            </div>
                          ) : r.notes ? (
                            <span className="text-slate-500">{r.notes}</span>
                          ) : (
                            <span className="text-slate-400 italic">Sin observaciones</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Tarjetas en Móvil */}
            <div className="md:hidden divide-y divide-slate-100">
              {records.map((r) => {
                const isJustified = r.is_justified;
                let badgeClass = 'bg-emerald-100 text-emerald-800';
                let label = 'Presente';
                let Icon = CheckCircle2;

                if (isJustified) {
                  badgeClass = 'bg-sky-100 text-sky-800';
                  label = 'Justificada';
                  Icon = FileCheck;
                } else if (r.status === 'tardanza') {
                  badgeClass = 'bg-amber-100 text-amber-800';
                  label = 'Tardanza';
                  Icon = Clock;
                } else if (r.status === 'ausente') {
                  badgeClass = 'bg-red-100 text-red-800';
                  label = 'Inasistencia';
                  Icon = AlertCircle;
                }

                const checkInTime = r.check_in
                  ? new Date(r.check_in).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
                  : '--:--';
                const checkOutTime = r.check_out
                  ? new Date(r.check_out).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
                  : '--:--';

                const isExpanded = expandedJustification === r.id;

                return (
                  <div key={r.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm capitalize">
                        {new Date(`${r.attendance_date}T12:00:00`).toLocaleDateString('es-ES', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short'
                        })}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${badgeClass}`}>
                        <Icon size={12} /> {label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Ingreso</span>
                        <strong className="text-slate-800">{checkInTime}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Salida</span>
                        <strong className="text-slate-800">{checkOutTime}</strong>
                      </div>
                    </div>

                    {isJustified && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setExpandedJustification(isExpanded ? null : r.id)}
                          className="text-xs font-bold text-sky-700 flex items-center gap-1"
                        >
                          <Info size={13} />
                          {isExpanded ? 'Ocultar motivo' : 'Ver motivo de justificación'}
                        </button>
                        {isExpanded && (
                          <div className="mt-2 bg-sky-50 p-2.5 rounded-xl border border-sky-100 text-xs text-sky-900">
                            <p className="font-semibold">{r.justification_reason || 'Sin detalle'}</p>
                            {r.justification_date && (
                              <p className="text-[10px] text-sky-700 mt-0.5">
                                Justificado: {new Date(r.justification_date).toLocaleDateString('es-PE')}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyAttendance;

