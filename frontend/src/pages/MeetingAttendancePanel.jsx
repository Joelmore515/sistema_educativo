import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Edit2,
  Trash2,
  Loader2,
  Users,
  X,
  AlertCircle
} from 'lucide-react';

const MeetingAttendancePanel = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, Presente, Ausente
  
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  
  const [formData, setFormData] = useState({
    check_in: '',
    check_out: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAttendance();
  }, [id]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/meetings/${id}/attendance`);
      setAttendance(response.data);
    } catch (error) {
      console.error('Error al obtener asistencia:', error);
      setMessage({ type: 'error', text: 'Error al cargar la lista de asistencia' });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPresent = async (parent) => {
    try {
      setSubmitting(true);
      const response = await api.post(`/meetings/${id}/attendance`, {
        parent_id: parent.parent_id,
        check_in: new Date().toISOString()
      });
      
      // Update local state
      setAttendance(attendance.map(a => {
        if (a.parent_id === parent.parent_id) {
          return {
            ...a,
            status: 'Presente',
            attendance_id: response.data.id,
            check_in: response.data.check_in,
            check_out: response.data.check_out
          };
        }
        return a;
      }));
      setMessage({ type: 'success', text: `Asistencia registrada para ${parent.first_name}` });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al registrar asistencia manual' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAttendance = async (attendanceId, parentName) => {
    if (!window.confirm(`¿Estás seguro de anular la asistencia de ${parentName}?`)) return;
    
    try {
      await api.delete(`/meetings/attendance/${attendanceId}`);
      // Update local state
      setAttendance(attendance.map(a => {
        if (a.attendance_id === attendanceId) {
          return {
            ...a,
            status: 'Ausente',
            attendance_id: null,
            check_in: null,
            check_out: null
          };
        }
        return a;
      }));
      setMessage({ type: 'success', text: 'Asistencia anulada correctamente' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al anular asistencia' });
    }
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    
    const formatTime = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toTimeString().slice(0, 5); // HH:mm
    };

    setFormData({
      check_in: formatTime(record.check_in),
      check_out: formatTime(record.check_out)
    });
    setShowEditModal(true);
  };

  const handleUpdateAttendance = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // Keep date, change time
      const updateDateWithTime = (originalDate, timeStr) => {
        if (!timeStr) return null;
        const base = originalDate ? new Date(originalDate) : new Date();
        const [hours, minutes] = timeStr.split(':');
        base.setHours(hours, minutes, 0, 0);
        return base.toISOString();
      };

      const payload = {
        check_in: updateDateWithTime(editingRecord.check_in, formData.check_in),
        check_out: updateDateWithTime(editingRecord.check_out || editingRecord.check_in, formData.check_out)
      };

      const response = await api.put(`/meetings/attendance/${editingRecord.attendance_id}`, payload);
      
      setAttendance(attendance.map(a => {
        if (a.attendance_id === editingRecord.attendance_id) {
          return {
            ...a,
            check_in: response.data.check_in,
            check_out: response.data.check_out
          };
        }
        return a;
      }));
      
      setMessage({ type: 'success', text: 'Horarios actualizados correctamente' });
      setShowEditModal(false);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al actualizar horarios' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAttendance = attendance.filter(record => {
    const matchesSearch = 
      `${record.first_name} ${record.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.dni && record.dni.includes(searchTerm));
      
    const matchesStatus = filterStatus === 'ALL' || record.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const totalParents = attendance.length;
  const presentCount = attendance.filter(a => a.status === 'Presente').length;
  const absentCount = totalParents - presentCount;
  
  const presentPercentage = totalParents > 0 ? Math.round((presentCount / totalParents) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/dashboard/meetings')}
          className="p-2 hover:bg-slate-200 bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center">
            Asistencia de Reunión
          </h2>
          <p className="text-sm text-slate-500 mt-1">Gestión del registro y control de padres</p>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 ${message.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
          {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          {message.text}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Convocados</p>
            <h3 className="text-2xl font-bold text-slate-900">{totalParents}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Presentes</p>
            <h3 className="text-2xl font-bold text-slate-900">{presentCount}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-red-100 p-3 rounded-xl text-red-600">
            <XCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Ausentes</p>
            <h3 className="text-2xl font-bold text-slate-900">{absentCount}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="bg-amber-100 p-3 rounded-xl text-amber-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Participación</p>
            <h3 className="text-2xl font-bold text-slate-900">{presentPercentage}%</h3>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre o DNI..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-w-[200px]"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="ALL">Todos los estados</option>
          <option value="Presente">Solo Presentes</option>
          <option value="Ausente">Solo Ausentes</option>
        </select>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-500 uppercase tracking-wider">Padre / Apoderado</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-500 uppercase tracking-wider">DNI</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-500 uppercase tracking-wider">Ingreso</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-500 uppercase tracking-wider">Salida</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center">
                    <Loader2 className="animate-spin text-indigo-500 mx-auto" size={24} />
                    <p className="mt-2 text-slate-500">Cargando registro de asistencia...</p>
                  </td>
                </tr>
              ) : filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-slate-500">
                    No se encontraron registros que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredAttendance.map((record) => (
                  <tr key={record.parent_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{record.first_name} {record.last_name}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {record.dni || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        record.status === 'Presente' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {record.check_in ? new Date(record.check_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {record.check_out ? new Date(record.check_out).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {record.status === 'Ausente' ? (
                        <button
                          onClick={() => handleMarkPresent(record)}
                          disabled={submitting}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg text-sm font-medium transition-colors"
                        >
                          Marcar Presente
                        </button>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditModal(record)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar hora"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleRemoveAttendance(record.attendance_id, `${record.first_name} ${record.last_name}`)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Anular asistencia"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">Editar Horarios</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 bg-slate-50/50">
              <p className="text-sm text-slate-600 mb-4">
                Modificando registro de: <strong>{editingRecord.first_name} {editingRecord.last_name}</strong>
              </p>
              
              <form onSubmit={handleUpdateAttendance} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Hora de Ingreso</label>
                  <input
                    type="time"
                    required
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white"
                    value={formData.check_in}
                    onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Hora de Salida (Opcional)</label>
                  <input
                    type="time"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white"
                    value={formData.check_out}
                    onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                  />
                </div>

                <div className="pt-4 flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all disabled:opacity-70 flex items-center justify-center"
                  >
                    {submitting ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingAttendancePanel;
