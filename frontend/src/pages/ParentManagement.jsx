import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import QrModal from '../components/QrModal';
import { Info, Search, Phone, Mail, QrCode, X, Loader2, Edit2, Trash2, Users } from 'lucide-react';

const ParentManagement = () => {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingParent, setEditingParent] = useState(null);
  
  // QR Modal
  const [qrModal, setQrModal] = useState({ show: false, uuid: null, name: '' });

  const initialParentState = {
    dni: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    has_account: false
  };

  const [newParent, setNewParent] = useState(initialParentState);

  const [loadingDni, setLoadingDni] = useState(false);

  const fetchParents = async () => {
    try {
      const response = await api.get('/parents');
      setParents(response.data);
    } catch (error) {
      console.error('Error al obtener padres:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    api.get('/parents')
      .then((response) => {
        if (active) setParents(response.data);
      })
      .catch((error) => {
        console.error('Error al obtener padres:', error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleDniLookup = async (dni) => {
    if (dni.length !== 8) return;
    setLoadingDni(true);
    try {
      const { data } = await api.post('/dni', { dni });
      if (data.success) {
        setNewParent(prev => ({ 
          ...prev, 
          first_name: data.data.nombres, 
          last_name: data.data.apellidos 
        }));
      }
    } catch (error) {
      console.error('Error buscando DNI:', error);
    } finally {
      setLoadingDni(false);
    }
  };

  const handleDniChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 8);
    setNewParent(prev => ({ ...prev, dni: value }));
    if (value.length === 8) {
      handleDniLookup(value);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingParent(null);
    setNewParent(initialParentState);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingParent) return;

    if (!newParent.has_account && Boolean(newParent.email) !== Boolean(newParent.password)) {
      alert('Ingresa correo y contraseña juntos para crear la cuenta, o deja ambos campos vacíos.');
      return;
    }

    try {
      await api.put(`/parents/${editingParent}`, newParent);
      closeModal();
      fetchParents();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al actualizar el apoderado');
    }
  };

  const handleEdit = (parent) => {
    setNewParent({
      dni: parent.dni || '',
      first_name: parent.first_name,
      last_name: parent.last_name,
      email: parent.User?.email || '',
      password: '',
      phone: parent.phone || '',
      has_account: Boolean(parent.User?.id)
    });
    setEditingParent(parent.id);
    setShowModal(true);
  };

  const handleDelete = async (parent) => {
    const linkedStudents = parent.Students || [];
    const confirmMessage = linkedStudents.length > 0
      ? `Este apoderado tiene ${linkedStudents.length} estudiante(s) vinculado(s). Se eliminarán sus vínculos y su cuenta de acceso. ¿Deseas continuar?`
      : '¿Estás seguro de que deseas eliminar este apoderado?';

    if (!window.confirm(confirmMessage)) return;

    try {
      await api.delete(`/parents/${parent.id}?force=true`);
      fetchParents();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al eliminar padre');
    }
  };

  const filteredParents = parents.filter(p => 
    `${p.first_name} ${p.last_name} ${p.dni || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <h2 className="text-2xl font-bold text-slate-900">Gestión de Padres</h2>
        <Link
          to="/dashboard/students"
          className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
        >
          <Users size={20} className="mr-2" />
          Ir a Estudiantes
        </Link>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 flex items-start gap-2">
        <Info size={18} className="mt-0.5 shrink-0" />
        <span>
          Los apoderados se crean automáticamente al registrar un estudiante. Desde esta sección puedes
          consultar sus datos, actualizar su cuenta de acceso y administrar sus vínculos.
        </span>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Buscar por nombre o DNI..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none transition-all shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase">Nombre</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase">Estudiantes</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase">Contacto</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase text-center">Código QR</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-400">Cargando...</td></tr>
            ) : filteredParents.length === 0 ? (
              <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-400">No se encontraron registros</td></tr>
            ) : filteredParents.map(parent => (
              <tr key={parent.id} className="hover:bg-slate-50/50 transition-all">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900">{parent.first_name} {parent.last_name}</span>
                    <span className="text-xs text-slate-500 mt-1">DNI: {parent.dni || 'N/A'}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {(parent.Students || []).length > 0 ? (
                    <div className="flex flex-col space-y-1">
                      {(parent.Students || []).map(student => (
                        <span key={student.id} className="text-sm text-slate-700">
                          {student.first_name} {student.last_name}
                          {student.grade_section ? (
                            <span className="text-xs text-slate-400"> · {student.grade_section}</span>
                          ) : null}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-amber-600">Sin estudiantes vinculados</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col space-y-1">
                    <span className="flex items-center text-sm text-slate-500"><Phone size={14} className="mr-1" /> {parent.phone || 'Sin tel.'}</span>
                    <span className={`flex items-center text-sm ${parent.User?.email ? 'text-slate-500' : 'text-amber-600'}`}><Mail size={14} className="mr-1" /> {parent.User?.email || 'Sin cuenta de acceso'}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => setQrModal({ show: true, uuid: parent.qr_code_uuid, name: `${parent.first_name} ${parent.last_name}` })}
                    className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-primary-50 hover:text-primary-600 transition-all inline-flex justify-center"
                    title="Ver QR"
                  >
                    <QrCode size={20} />
                  </button>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-2">
                    <button 
                      onClick={() => handleEdit(parent)}
                      className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all"
                      title="Editar"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(parent)}
                      className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-all"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* Modal Registro */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl shadow-2xl animate-in zoom-in duration-300 overflow-hidden my-8">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-xl font-bold text-slate-900">Editar Padre / Apoderado</h3>
              <button onClick={closeModal} className="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-500">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">DNI</label>
                <div className="relative">
                  <input required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none pr-10" 
                    value={newParent.dni} onChange={handleDniChange} placeholder="8 dígitos" maxLength="8" />
                  {loadingDni && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-primary-500" size={18} />}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                  <input required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" 
                    value={newParent.first_name} onChange={e => setNewParent({...newParent, first_name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Apellido</label>
                  <input required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" 
                    value={newParent.last_name} onChange={e => setNewParent({...newParent, last_name: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono (WhatsApp)</label>
                <input className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" 
                  value={newParent.phone} onChange={e => setNewParent({...newParent, phone: e.target.value})} />
              </div>
              <div className="p-4 bg-primary-50 rounded-2xl space-y-4">
                <div>
                  <p className="text-xs font-bold text-primary-700 uppercase tracking-wider">Credenciales de Acceso</p>
                  <p className="text-[11px] text-primary-600 mt-1">
                    {newParent.has_account
                      ? 'El apoderado ya tiene una cuenta. Puede cambiar el correo o dejar la contraseña vacía para mantenerla.'
                      : 'Este apoderado aún no tiene cuenta. Ingresa correo y contraseña para crearla, o deja ambos vacíos para mantenerlo sin acceso.'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email {!newParent.has_account && <span className="text-[11px] font-normal text-slate-400">(opcional)</span>}
                  </label>
                  <input type="email" required={newParent.has_account} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    value={newParent.email} onChange={e => setNewParent({...newParent, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Contraseña {!newParent.has_account && <span className="text-[11px] font-normal text-slate-400">(opcional)</span>}
                  </label>
                  <input
                    type="password"
                    placeholder={newParent.has_account ? 'Dejar vacío para mantener la actual' : 'Mínimo 6 caracteres'}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    value={newParent.password}
                    onChange={e => setNewParent({...newParent, password: e.target.value})}
                  />
                </div>
              </div>
              <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">
                Actualizar Registro
              </button>
            </form>
          </div>
        </div>
      )}

      <QrModal
        show={qrModal.show}
        onClose={() => setQrModal({ show: false, uuid: null, name: '' })}
        uuid={qrModal.uuid}
        name={qrModal.name}
        accent="blue"
      />
    </div>
  );
};

export default ParentManagement;
