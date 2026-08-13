import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Calendar, Search, Filter, CheckCircle, XCircle, Clock, AlertTriangle, FileText, Trash2, Pencil, X, ChevronDown } from 'lucide-react';

const AttendancePanel = () => {
  const [attendances, setAttendances] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('TODOS');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeAction, setActiveAction] = useState(null);
  const [editingAttendance, setEditingAttendance] = useState(null);
  const [editForm, setEditForm] = useState({
    date: '',
    check_in_time: '',
    check_out_time: '',
    status: 'presente',
    notes: '',
    justification_reason: ''
  });
  // ahora manejamos múltiples campos de búsqueda para agregar varios estudiantes
  const [absenceSearchFields, setAbsenceSearchFields] = useState([{ id: Date.now(), value: '', selectedId: null }]);
  const [justificationSearch, setJustificationSearch] = useState('');
  const justificationInputRef = useRef(null);
  const [absenceForm, setAbsenceForm] = useState({
    student_ids: [],
    date: '',
    notes: '',
    justification_reason: ''
  });
  const [justifyForm, setJustifyForm] = useState({
    student_ids: [],
    date: '',
    justification_reason: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [attendanceResponse, studentsResponse] = await Promise.all([
        api.get('/attendance'),
        api.get('/students')
      ]);
      setAttendances(attendanceResponse.data);
      setStudents(studentsResponse.data);
    } catch (error) {
      console.error('Error al obtener asistencias:', error);
      setMessage({ type: 'error', text: 'No se pudo cargar la información' });
    } finally {
      setLoading(false);
    }
  };

  // Obtener la fecha de hoy en formato local YYYY-MM-DD
  const getTodayLocal = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const handleFilterToday = () => {
    const todayStr = getTodayLocal();
    if (filterDate === todayStr && filterStatus === 'TODOS') {
      // Si ya está filtrado por hoy, quitar filtro
      setFilterDate('');
    } else {
      setFilterDate(todayStr);
    }
  };

  const handleClearFilters = () => {
    setFilterDate('');
    setFilterStatus('TODOS');
    setShowFilters(false);
  };

  const hasActiveFilters = filterDate !== '' || filterStatus !== 'TODOS';

  const filtered = attendances.filter(a => {
    // Filtro por nombre
    const name = `${a.Student?.first_name || ''} ${a.Student?.last_name || ''}`.toLowerCase();
    if (!name.includes(searchTerm.toLowerCase())) return false;

    // Filtro por fecha
    if (filterDate) {
      const attDate = a.attendance_date
        ? (typeof a.attendance_date === 'string' ? a.attendance_date.split('T')[0] : '')
        : (a.check_in ? new Date(a.check_in).toLocaleDateString('en-CA') : '');
      if (attDate !== filterDate) return false;
    }

    // Filtro por estado
    if (filterStatus !== 'TODOS') {
      if (filterStatus === 'justificado') {
        if (!(a.is_absence && a.is_justified)) return false;
      } else {
        if (a.status !== filterStatus) return false;
      }
    }

    return true;
  });

  // Los filtros por campo se calculan en línea según cada `absenceSearchFields`.


  const toggleAbsenceStudentSelection = (studentId) => {
    const normalizedId = studentId.toString();

    setAbsenceForm(prev => {
      const alreadySelected = prev.student_ids.includes(normalizedId);
      return {
        ...prev,
        student_ids: alreadySelected
          ? prev.student_ids.filter(id => id !== normalizedId)
          : [...prev.student_ids, normalizedId]
      };
    });
  };

  const addAbsenceField = () => {
    setAbsenceSearchFields(prev => {
      // evitar añadir un nuevo campo si ya existe uno vacío (sin texto ni selección)
      const hasEmpty = prev.some(f => f.value.trim().length === 0 && !f.selectedId);
      if (hasEmpty) return prev;
      return [...prev, { id: Date.now(), value: '', selectedId: null }];
    });
  };

  const updateAbsenceFieldValue = (fieldId, value) => {
    setAbsenceSearchFields(prev => prev.map(f => f.id === fieldId ? { ...f, value, selectedId: null } : f));
    // si el usuario escribe, desasociar la selección previa de ese campo
    setAbsenceForm(prev => ({ ...prev, student_ids: prev.student_ids }));
  };

  const selectStudentInField = (fieldId, student) => {
    const studentIdStr = student.id.toString();
    const alreadySelectedElsewhere = absenceForm.student_ids.includes(studentIdStr);
    
    if (alreadySelectedElsewhere) {
      setMessage({ type: 'error', text: 'El estudiante ya fue agregado' });
      return;
    }

    setAbsenceForm(prev => {
      return { ...prev, student_ids: [...prev.student_ids, studentIdStr] };
    });

    // Clear the input so another student can be searched immediately
    setAbsenceSearchFields(prev => prev.map(f => {
      if (f.id !== fieldId) return f;
      return { ...f, value: '', selectedId: null };
    }));
  };

  const addJustificationField = () => {
    setJustificationSearch('');
    justificationInputRef.current?.focus();
  };

  const updateJustificationSearch = (value) => {
    setJustificationSearch(value);
  };

  const selectStudentForJustification = (student) => {
    const studentIdStr = student.id.toString();
    if (justifyForm.student_ids.includes(studentIdStr)) {
      setMessage({ type: 'error', text: 'El estudiante ya fue agregado' });
      return;
    }

    setJustifyForm(prev => ({
      ...prev,
      student_ids: [...prev.student_ids, studentIdStr]
    }));
    setJustificationSearch('');
    justificationInputRef.current?.focus();
  };

  const removeJustificationStudent = (studentId) => {
    const normalizedId = studentId.toString();
    setJustifyForm(prev => ({
      ...prev,
      student_ids: prev.student_ids.filter(id => id !== normalizedId)
    }));
  };

  const removeAbsenceField = (fieldId) => {
    setAbsenceSearchFields(prev => {
      const target = prev.find(f => f.id === fieldId);
      const sel = target?.selectedId;
      const next = prev.length === 1 ? [{ id: Date.now(), value: '', selectedId: null }] : prev.filter(f => f.id !== fieldId);

      // actualizar selections
      setAbsenceForm(prevForm => {
        if (!sel) return prevForm;
        return { ...prevForm, student_ids: prevForm.student_ids.filter(id => id !== sel) };
      });

      return next;
    });
  };

  const parseLocalDateValue = (value) => {
    if (!value) return null;
    let strValue = typeof value === 'string' ? value : value.toString();
    if (strValue.includes('T')) {
      strValue = strValue.split('T')[0];
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(strValue)) {
      const [year, month, day] = strValue.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatLocalDate = (value) => {
    const date = parseLocalDateValue(value);
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatLocalTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const parseDateTime = (date, time) => {
    if (!date || !time) return null;
    return new Date(`${date}T${time}:00`);
  };

  const startEditAttendance = (attendance) => {
    setEditingAttendance(attendance);
    setEditForm({
      date: formatLocalDate(attendance.attendance_date || attendance.check_in),
      check_in_time: formatLocalTime(attendance.check_in),
      check_out_time: formatLocalTime(attendance.check_out),
      status: attendance.status || 'presente',
      notes: attendance.notes || '',
      justification_reason: attendance.justification_reason || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingAttendance(null);
    setEditForm({
      date: '',
      check_in_time: '',
      check_out_time: '',
      status: 'presente',
      notes: '',
      justification_reason: ''
    });
  };

  const handleUpdateAttendance = async (e) => {
    e.preventDefault();
    if (!editingAttendance) return;

    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const updatedCheckIn = parseDateTime(editForm.date, editForm.check_in_time);
      const updatedCheckOut = editForm.check_out_time ? parseDateTime(editForm.date, editForm.check_out_time) : null;
      const isAbsence = editForm.status === 'ausente';
      const isJustified = isAbsence && editForm.justification_reason.trim().length > 0;

      const response = await api.patch(`/attendance/${editingAttendance.id}`, {
        check_in: updatedCheckIn,
        check_out: updatedCheckOut,
        status: editForm.status,
        notes: editForm.notes,
        is_absence: isAbsence,
        is_justified: isJustified,
        justification_reason: isAbsence ? editForm.justification_reason : null
      });

      setAttendances(prev => prev.map(att => att.id === editingAttendance.id ? response.data.attendance : att));
      setMessage({ type: 'success', text: 'Registro actualizado correctamente' });
      handleCancelEdit();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'No se pudo actualizar el registro' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAttendance = async (attendanceId) => {
    const confirmed = window.confirm('¿Estás seguro de que deseas eliminar este registro de asistencia?');
    if (!confirmed) return;

    try {
      await api.delete(`/attendance/${attendanceId}`);
      setAttendances(prev => prev.filter(att => att.id !== attendanceId));
      setMessage({ type: 'success', text: 'Registro eliminado correctamente' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'No se pudo eliminar el registro' });
    }
  };

  const handleRegisterAbsence = async (e) => {
    e.preventDefault();
    if (!absenceForm.student_ids.length) {
      setMessage({ type: 'error', text: 'Debe seleccionar al menos un estudiante' });
      return;
    }

    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.post('/attendance', {
        student_ids: absenceForm.student_ids,
        date: absenceForm.date || new Date().toISOString(),
        notes: absenceForm.notes,
        justification_reason: absenceForm.justification_reason
      });

      const createdAttendances = response.data.attendances || (response.data.attendance ? [response.data.attendance] : []);
      setAttendances(prev => [...createdAttendances, ...prev]);
      setAbsenceForm({ student_ids: [], date: '', notes: '', justification_reason: '' });
      setAbsenceSearchFields([{ id: Date.now(), value: '', selectedId: null }]);
      setMessage({ type: 'success', text: response.data.message });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'No se pudo registrar la falta' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleJustifyAbsence = async (e) => {
    e.preventDefault();
    
    if (!justifyForm.student_ids.length) {
      setMessage({ type: 'error', text: 'Debe seleccionar al menos un estudiante' });
      return;
    }
    if (!justifyForm.date) {
      setMessage({ type: 'error', text: 'Debe seleccionar una fecha' });
      return;
    }

    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.post('/attendance', {
        student_ids: justifyForm.student_ids,
        date: justifyForm.date,
        justification_reason: justifyForm.justification_reason
      });

      const createdAttendances = response.data.attendances || (response.data.attendance ? [response.data.attendance] : []);
      setAttendances(prev => [...createdAttendances, ...prev]);

      setJustifyForm({ student_ids: [], date: '', justification_reason: '' });
      setJustificationSearch('');
      setMessage({ type: 'success', text: response.data.message });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'No se pudo registrar la justificación' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center">
          <Calendar className="mr-2 text-amber-500" />
          Historial de Asistencia
        </h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleFilterToday}
            className={`flex-1 sm:flex-none flex items-center justify-center px-4 py-2 rounded-xl border transition-all ${
              filterDate === getTodayLocal()
                ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Calendar size={18} className="mr-2" />
            {filterDate === getTodayLocal() ? 'Solo Hoy ✓' : 'Filtrar Hoy'}
          </button>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex-1 sm:flex-none flex items-center justify-center px-4 py-2 rounded-xl border transition-all ${
              showFilters || hasActiveFilters
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter size={18} className="mr-2" />
            Filtros
            {hasActiveFilters && <span className="ml-1.5 w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>}
            <ChevronDown size={16} className={`ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Panel de filtros */}
      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 text-sm">Filtros avanzados</h3>
            <button onClick={() => setShowFilters(false)} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Fecha</label>
              <input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-amber-400 transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Estado</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-amber-400 transition-all text-sm bg-white"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="presente">Presente</option>
                <option value="tardanza">Tardanza</option>
                <option value="ausente">Ausente</option>
                <option value="justificado">Justificado</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4 justify-end">
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              Limpiar filtros
            </button>
          </div>
        </div>
      )}

      {message.text && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveAction('absence')}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition-all ${activeAction === 'absence' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            <span className="flex items-center">
              <AlertTriangle className="mr-2" size={16} />
              Registrar Falta
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveAction('justification')}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition-all ${activeAction === 'justification' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            <span className="flex items-center">
              <FileText className="mr-2" size={16} />
              Registrar Justificación
            </span>
          </button>
        </div>

        {(activeAction || editingAttendance) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  {editingAttendance ? 'Editar registro de asistencia' : activeAction === 'absence' ? 'Registrar Falta' : 'Registrar Justificación'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setActiveAction(null);
                    handleCancelEdit();
                  }}
                  className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 hover:bg-slate-200"
                >
                  Cerrar
                </button>
              </div>

              {editingAttendance ? (
                <form onSubmit={handleUpdateAttendance} className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Fecha</label>
                    <input
                      type="date"
                      value={editForm.date}
                      onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600">Hora de ingreso</label>
                      <input
                        type="time"
                        value={editForm.check_in_time}
                        onChange={(e) => setEditForm(prev => ({ ...prev, check_in_time: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600">Hora de salida</label>
                      <input
                        type="time"
                        value={editForm.check_out_time}
                        onChange={(e) => setEditForm(prev => ({ ...prev, check_out_time: e.target.value }))}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Estado</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                    >
                      <option value="presente">Presente</option>
                      <option value="tardanza">Tardanza</option>
                      <option value="ausente">Ausente</option>
                    </select>
                  </div>
                  {editForm.status === 'ausente' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-600">Motivo de justificación</label>
                      <textarea
                        value={editForm.justification_reason}
                        onChange={(e) => setEditForm(prev => ({ ...prev, justification_reason: e.target.value }))}
                        placeholder="Describe el motivo de la justificación"
                        rows="3"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Notas</label>
                    <textarea
                      value={editForm.notes}
                      onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Detalle u observación"
                      rows="3"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-2xl bg-amber-500 px-4 py-3 font-semibold text-white hover:bg-amber-600 transition-all disabled:opacity-70"
                  >
                    {submitting ? 'Guardando...' : 'Actualizar registro'}
                  </button>
                </form>
              ) : activeAction === 'absence' ? (
                <form onSubmit={handleRegisterAbsence} className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-slate-600">Estudiantes</label>
                        <p className="text-xs text-slate-400">Puedes seleccionar varios estudiantes para registrar la falta en una sola operación.</p>
                      </div>
                      <button type="button" onClick={addAbsenceField} className="rounded-full bg-amber-500 text-white px-3 py-1 text-sm">+</button>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 space-y-3">
                      {absenceSearchFields.map(field => (
                        <div key={field.id}>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={field.value}
                              onChange={(e) => updateAbsenceFieldValue(field.id, e.target.value)}
                              placeholder="Escribe el nombre del estudiante"
                              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none"
                            />
                          </div>
                          <div className="mt-2 max-h-40 space-y-1 overflow-auto">
                            {field.value.trim().length === 0 ? (
                              <p className="px-2 py-1 text-sm text-slate-400">Escribe un nombre para buscar estudiantes.</p>
                            ) : (() => {
                              const list = students.filter(student => {
                                const fullName = `${student.first_name || ''} ${student.last_name || ''}`.toLowerCase();
                                return fullName.includes(field.value.toLowerCase());
                              });
                              if (list.length === 0) return <p className="px-2 py-1 text-sm text-slate-400">No se encontraron estudiantes.</p>;
                              return list.map(student => {
                                const isSelected = absenceForm.student_ids.includes(student.id.toString());
                                const disabled = isSelected && field.selectedId !== student.id;
                                return (
                                  <button
                                    key={student.id}
                                    type="button"
                                    onClick={() => selectStudentInField(field.id, student)}
                                    disabled={disabled}
                                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${isSelected ? 'bg-amber-100 text-amber-800' : 'bg-white hover:bg-slate-100'}`}
                                  >
                                    <span>{student.first_name} {student.last_name}</span>
                                    <span className="text-xs font-semibold">{isSelected ? '✓' : 'Seleccionar'}</span>
                                  </button>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                    {absenceForm.student_ids.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {absenceForm.student_ids.map(studentId => {
                          const student = students.find(item => item.id.toString() === studentId);
                          if (!student) return null;

                          return (
                            <button
                              key={studentId}
                              type="button"
                              onClick={() => toggleAbsenceStudentSelection(studentId)}
                              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200"
                            >
                              <span>{student.first_name} {student.last_name}</span>
                              <Trash2 size={14} />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Fecha</label>
                    <input
                      type="date"
                      value={absenceForm.date}
                      onChange={(e) => setAbsenceForm({ ...absenceForm, date: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                    />
                  </div>
                  <textarea
                    value={absenceForm.notes}
                    onChange={(e) => setAbsenceForm({ ...absenceForm, notes: e.target.value })}
                    placeholder="Detalle o observación"
                    rows="3"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                  />
                  {/* Campo de justificación eliminado según requerimiento */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-2xl bg-amber-500 px-4 py-3 font-semibold text-white hover:bg-amber-600 transition-all disabled:opacity-70"
                  >
                    {submitting ? 'Guardando...' : 'Registrar falta'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleJustifyAbsence} className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-slate-600">Estudiantes</label>
                        <p className="text-xs text-slate-400">Busca y selecciona varios estudiantes desde un único campo.</p>
                      </div>
                      <button type="button" onClick={addJustificationField} className="rounded-full bg-emerald-500 text-white px-3 py-1 text-sm">+</button>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
                      <input
                        ref={justificationInputRef}
                        type="text"
                        value={justificationSearch}
                        onChange={(e) => updateJustificationSearch(e.target.value)}
                        placeholder="Escribe el nombre del estudiante"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none"
                      />
                      <div className="mt-2 max-h-40 space-y-1 overflow-auto">
                        {justificationSearch.trim().length === 0 ? (
                          <p className="px-2 py-1 text-sm text-slate-400">Escribe un nombre para buscar estudiantes.</p>
                        ) : (() => {
                          const list = students.filter(student => {
                            const fullName = `${student.first_name || ''} ${student.last_name || ''}`.toLowerCase();
                            return fullName.includes(justificationSearch.toLowerCase());
                          });
                          if (list.length === 0) return <p className="px-2 py-1 text-sm text-slate-400">No se encontraron estudiantes.</p>;
                          return list.map(student => {
                            const isSelected = justifyForm.student_ids.includes(student.id.toString());
                            return (
                              <button
                                key={student.id}
                                type="button"
                                onClick={() => selectStudentForJustification(student)}
                                disabled={isSelected}
                                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${isSelected ? 'bg-emerald-100 text-emerald-800' : 'bg-white hover:bg-slate-100'}`}
                              >
                                <span>{student.first_name} {student.last_name}</span>
                                <span className="text-xs font-semibold">{isSelected ? '✓' : 'Seleccionar'}</span>
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>
                    {justifyForm.student_ids.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {justifyForm.student_ids.map(studentId => {
                          const student = students.find(item => item.id.toString() === studentId);
                          if (!student) return null;

                          return (
                            <button
                              key={studentId}
                              type="button"
                              onClick={() => removeJustificationStudent(studentId)}
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-200"
                            >
                              <span>{student.first_name} {student.last_name}</span>
                              <Trash2 size={14} />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-600">Fecha</label>
                    <input
                      type="date"
                      value={justifyForm.date}
                      onChange={(e) => setJustifyForm({ ...justifyForm, date: e.target.value })}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                    />
                  </div>
                  <select
                    value={justifyForm.justification_reason}
                    onChange={(e) => setJustifyForm({ ...justifyForm, justification_reason: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
                  >
                    <option value="">Seleccione motivo</option>
                    <option value="Problemas de salud">Problemas de salud</option>
                    <option value="Motivos familiares">Motivos familiares</option>
                    <option value="Cita médica">Cita médica</option>
                    <option value="Actividades institucionales">Actividades institucionales</option>
                    <option value="Emergencia personal">Emergencia personal</option>
                    <option value="Otros">Otros</option>
                  </select>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-white hover:bg-emerald-600 transition-all disabled:opacity-70"
                  >
                    {submitting ? 'Guardando...' : 'Justificar falta'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Buscar por nombre de alumno..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none transition-all shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase">Alumno</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase">Fecha</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase">Ingreso</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase">Salida</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase">Estado</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-400">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-10 text-center text-slate-400">No hay registros de asistencia.</td></tr>
              ) : filtered.map(att => (
                <tr key={att.id} className="hover:bg-slate-50/50 transition-all">
                  <td className="px-6 py-4 font-bold text-slate-900">
                    {att.Student?.first_name} {att.Student?.last_name}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {att.attendance_date ? parseLocalDateValue(att.attendance_date).toLocaleDateString() : (att.check_in ? new Date(att.check_in).toLocaleDateString() : '-')}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {!att.check_in ? '-' : new Date(att.check_in).toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {att.check_out ? new Date(att.check_out).toLocaleTimeString() : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                      {att.is_absence ? (
                        att.is_justified ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <FileText size={12} className="mr-1" />
                            Justificado
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <XCircle size={12} className="mr-1" />
                            Ausente
                          </span>
                        )
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                          ${att.status === 'presente' ? 'bg-emerald-100 text-emerald-800' :
                            att.status === 'tardanza' ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'}`}
                        >
                          {att.status === 'presente' ? <CheckCircle size={12} className="mr-1" /> :
                            att.status === 'tardanza' ? <Clock size={12} className="mr-1" /> :
                            <XCircle size={12} className="mr-1" />}
                          {att.status}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEditAttendance(att)}
                        className="rounded-full bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAttendance(att.id)}
                        className="rounded-full bg-slate-100 p-2 text-red-600 hover:bg-red-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendancePanel;
