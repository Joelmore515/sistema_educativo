import { useState, useEffect } from 'react';
import api from '../services/api';
import { UserPlus, Search, Phone, Mail, QrCode, X, Loader2, Download, Printer, Edit2, Trash2 } from 'lucide-react';

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
    phone: ''
  };

  const [newParent, setNewParent] = useState(initialParentState);

  const [loadingDni, setLoadingDni] = useState(false);

  useEffect(() => {
    fetchParents();
  }, []);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingParent) {
        await api.put(`/parents/${editingParent}`, newParent);
      } else {
        await api.post('/parents', newParent);
      }
      setShowModal(false);
      setEditingParent(null);
      setNewParent(initialParentState);
      fetchParents();
    } catch (error) {
      alert(error.response?.data?.message || `Error al ${editingParent ? 'actualizar' : 'registrar'} padre`);
    }
  };

  const handleEdit = (parent) => {
    setNewParent({
      dni: parent.dni || '',
      first_name: parent.first_name,
      last_name: parent.last_name,
      email: parent.User?.email || '',
      password: '',
      phone: parent.phone || ''
    });
    setEditingParent(parent.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este padre?')) {
      try {
        await api.delete(`/parents/${id}`);
        fetchParents();
      } catch (error) {
        alert(error.response?.data?.message || 'Error al eliminar padre');
      }
    }
  };

  const filteredParents = parents.filter(p => 
    `${p.first_name} ${p.last_name} ${p.dni || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <h2 className="text-2xl font-bold text-slate-900">Gestión de Padres</h2>
        <button 
          type="button"
          onClick={() => {
            setEditingParent(null);
            setNewParent(initialParentState);
            setShowModal(true);
          }}
          className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          <UserPlus size={20} className="mr-2" />
          Nuevo Padre
        </button>
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
              <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase">Contacto</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase text-center">Código QR</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="4" className="px-6 py-10 text-center text-slate-400">Cargando...</td></tr>
            ) : filteredParents.length === 0 ? (
              <tr><td colSpan="4" className="px-6 py-10 text-center text-slate-400">No se encontraron registros</td></tr>
            ) : filteredParents.map(parent => (
              <tr key={parent.id} className="hover:bg-slate-50/50 transition-all">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900">{parent.first_name} {parent.last_name}</span>
                    <span className="text-xs text-slate-500 mt-1">DNI: {parent.dni || 'N/A'}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col space-y-1">
                    <span className="flex items-center text-sm text-slate-500"><Phone size={14} className="mr-1" /> {parent.phone || 'Sin tel.'}</span>
                    <span className="flex items-center text-sm text-slate-500"><Mail size={14} className="mr-1" /> {parent.User?.email || 'Sin cuenta web'}</span>
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
                      onClick={() => handleDelete(parent.id)}
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
              <h3 className="text-xl font-bold text-slate-900">{editingParent ? 'Editar Padre' : 'Registrar Nuevo Padre'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-500">
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
                <p className="text-xs font-bold text-primary-700 uppercase tracking-wider">Credenciales de Portal (Opcional)</p>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" 
                    value={newParent.email} onChange={e => setNewParent({...newParent, email: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                  <input type="password" title="Si se deja vacío, no se creará cuenta de acceso" className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" 
                    value={newParent.password} onChange={e => setNewParent({...newParent, password: e.target.value})} />
                </div>
              </div>
              <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">
                {editingParent ? 'Actualizar Registro' : 'Guardar Registro'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal QR Viewer */}
      {qrModal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl animate-in zoom-in duration-300 overflow-hidden flex flex-col items-center p-8 relative">
            <button onClick={() => setQrModal({ show: false, uuid: null, name: '' })} className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-all text-slate-500">
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-1 text-center mt-2">Código QR</h3>
            <p className="text-sm text-slate-500 mb-6 text-center">{qrModal.name}</p>
            
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-8 flex justify-center w-full">
              <img 
                src={`${api.defaults.baseURL}/qr/${qrModal.uuid}`} 
                alt={`QR ${qrModal.name}`} 
                className="w-48 h-48 object-contain"
              />
            </div>

            <div className="flex flex-col sm:flex-row w-full gap-3">
              <a 
                href={`${api.defaults.baseURL}/qr/${qrModal.uuid}`} 
                download={`QR_${qrModal.name.replace(/\s+/g, '_')}.png`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 flex justify-center items-center py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
              >
                <Download size={18} className="mr-2" />
                Descargar
              </a>
              <button 
                type="button"
                onClick={() => {
                  const printWindow = window.open(`${api.defaults.baseURL}/qr/${qrModal.uuid}`);
                  printWindow.onload = () => printWindow.print();
                }}
                className="flex justify-center items-center gap-2 p-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
              >
                <Printer size={18} />
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentManagement;
