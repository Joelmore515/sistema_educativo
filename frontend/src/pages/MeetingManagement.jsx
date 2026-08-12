import { useState, useEffect } from 'react';
import api from '../services/api';
import { Calendar, Search, Plus, X, Loader2, Users, Edit2, Trash2, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MeetingManagement = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  
  const initialFormState = {
    title: '',
    date: '',
    time: '',
    type: 'APAFA',
    description: ''
  };

  const [formData, setFormData] = useState(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editingMeeting, setEditingMeeting] = useState(null);

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

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/meetings');
      setMeetings(response.data);
    } catch (error) {
      console.error('Error al obtener reuniones:', error);
      setMessage({ type: 'error', text: 'Error al cargar las reuniones' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      if (editingMeeting) {
        const response = await api.put(`/meetings/${editingMeeting.id}`, formData);
        setMeetings(meetings.map(m => m.id === editingMeeting.id ? response.data : m));
        setMessage({ type: 'success', text: 'Reunión actualizada exitosamente' });
      } else {
        const response = await api.post('/meetings', formData);
        setMeetings([response.data, ...meetings]);
        setMessage({ type: 'success', text: 'Reunión creada exitosamente' });
      }
      setShowModal(false);
      setFormData(initialFormState);
      setEditingMeeting(null);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Error al guardar la reunión' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (meeting) => {
    setEditingMeeting(meeting);
    setFormData({
      title: meeting.title,
      date: meeting.date ? meeting.date.split('T')[0] : '', // Assuming ISO date format
      time: meeting.time || '',
      type: meeting.type,
      description: meeting.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta reunión?')) {
      try {
        await api.delete(`/meetings/${id}`);
        setMeetings(meetings.filter(m => m.id !== id));
        setMessage({ type: 'success', text: 'Reunión eliminada exitosamente' });
      } catch (error) {
        setMessage({ type: 'error', text: 'Error al eliminar la reunión' });
      }
    }
  };

  const filteredMeetings = meetings.filter(meeting => 
    meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    meeting.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center">
          <Calendar className="mr-2 text-indigo-500" />
          Gestión de Reuniones
        </h2>
        <button
          onClick={() => {
            setEditingMeeting(null);
            setFormData(initialFormState);
            setShowModal(true);
          }}
          className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-sm"
        >
          <Plus size={20} className="mr-2" />
          Nueva Reunión
        </button>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl border ${message.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
          {message.text}
        </div>
      )}

      {/* Barra de Búsqueda */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por título o tipo..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de Reuniones */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-500 uppercase tracking-wider">Título</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-500 uppercase tracking-wider">Hora</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-500 uppercase tracking-wider">Descripción</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-10 text-center">
                    <Loader2 className="animate-spin text-indigo-500 mx-auto" size={24} />
                    <p className="mt-2 text-slate-500">Cargando reuniones...</p>
                  </td>
                </tr>
              ) : filteredMeetings.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-10 text-center text-slate-500">
                    No se encontraron reuniones
                  </td>
                </tr>
              ) : (
                filteredMeetings.map((meeting) => (
                  <tr key={meeting.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{meeting.title}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        meeting.type === 'APAFA' ? 'bg-amber-100 text-amber-800' :
                        meeting.type === 'ESCUELA_PADRES' ? 'bg-blue-100 text-blue-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {meeting.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {meeting.date ? parseLocalDateValue(meeting.date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {meeting.time ? meeting.time.slice(0, 5) : '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-600 truncate max-w-xs">
                      {meeting.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => navigate(`/dashboard/meetings/${meeting.id}/attendance`)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Ver asistencia"
                        >
                          <ClipboardList size={18} />
                        </button>
                        <button
                          onClick={() => handleEdit(meeting)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar reunión"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(meeting.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar reunión"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">
                {editingMeeting ? 'Editar Reunión' : 'Nueva Reunión'}
              </h3>
              <button onClick={() => {
                setShowModal(false);
                setEditingMeeting(null);
                setFormData(initialFormState);
              }} className="text-slate-400 hover:text-slate-600 transition-colors bg-slate-100 hover:bg-slate-200 p-2 rounded-full">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-96px)]">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Título de la Reunión</label>
                <input
                  type="text"
                  required
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ej. Primera Reunión APAFA 2026"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo de Reunión</label>
                <select
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="APAFA">APAFA</option>
                  <option value="ESCUELA_PADRES">Escuela para Padres</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Hora</label>
                  <input
                    type="time"
                    required
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Descripción (Opcional)</label>
                <textarea
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalles sobre los temas a tratar..."
                ></textarea>
              </div>

              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingMeeting(null);
                    setFormData(initialFormState);
                  }}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all disabled:opacity-70 flex items-center justify-center"
                >
                  {submitting ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
                  {submitting ? 'Guardando...' : editingMeeting ? 'Guardar Cambios' : 'Crear Reunión'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingManagement;
