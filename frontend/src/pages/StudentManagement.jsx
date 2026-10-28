import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/authContextValue';
import QrModal from '../components/QrModal';
import { GraduationCap, Search, QrCode, X, Filter, Loader2, Pencil, Trash2, Mail, Key } from 'lucide-react';

const createEmptyParent = () => ({
  id: null,
  parent_dni: '',
  parent_first_name: '',
  parent_last_name: '',
  parent_phone: ''
});

const createEmptyStudent = () => ({
  dni: '',
  first_name: '',
  last_name: '',
  grade: '',
  section: '',
  email: '',
  password: '',
  parents: [createEmptyParent()]
});

const StudentManagement = () => {
  const { user } = useAuth();
  const canWrite = ['admin', 'director'].includes(user?.role);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('Registrar Nuevo Estudiante');
  const [editingStudentId, setEditingStudentId] = useState(null);

  // QR Modal
  const [qrModal, setQrModal] = useState({ show: false, uuid: null, name: '' });

  const [newStudent, setNewStudent] = useState(createEmptyStudent());

  const [loadingStudentDni, setLoadingStudentDni] = useState(false);
  const [loadingParentDni, setLoadingParentDni] = useState({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/students');
      setStudents(response.data);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    api.get('/students')
      .then((response) => {
        if (active) setStudents(response.data);
      })
      .catch((error) => {
        console.error('Error al cargar datos:', error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const resetStudentForm = () => {
    setNewStudent(createEmptyStudent());
    setEditingStudentId(null);
    setModalTitle('Registrar Nuevo Estudiante');
  };

  const openCreateModal = () => {
    resetStudentForm();
    setShowModal(true);
  };

  const openEditModal = (student) => {
    const parents = (student.Parents || []).length > 0
      ? (student.Parents || []).map(parent => ({
          id: parent.id,
          parent_dni: parent.dni || '',
          parent_first_name: parent.first_name || '',
          parent_last_name: parent.last_name || '',
          parent_phone: parent.phone || ''
        }))
      : [createEmptyParent()];

    const gradeMatch = student.grade_section?.match(/\b([1-6])\b/);
    const sectionMatch = student.grade_section?.match(/\b([A-F])\b/i);
    setNewStudent({
      dni: student.dni || '',
      first_name: student.first_name || '',
      last_name: student.last_name || '',
      grade: gradeMatch ? gradeMatch[1] : '',
      section: sectionMatch ? sectionMatch[1].toUpperCase() : '',
      email: student.User?.email || '',
      password: '',
      parents
    });
    setEditingStudentId(student.id);
    setModalTitle('Editar Estudiante');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetStudentForm();
  };

  const handleDniLookup = async (dni, type, index = null) => {
    if (dni.length !== 8) return;

    if (type === 'student') setLoadingStudentDni(true);
    else setLoadingParentDni(prev => ({ ...prev, [index]: true }));

    try {
      const { data } = await api.post('/dni', { dni });
      if (data.success) {
        if (type === 'student') {
          setNewStudent(prev => ({ ...prev, first_name: data.data.nombres, last_name: data.data.apellidos }));
        } else {
          setNewStudent(prev => {
            const newParents = [...prev.parents];
            newParents[index] = { ...newParents[index], parent_first_name: data.data.nombres, parent_last_name: data.data.apellidos };
            return { ...prev, parents: newParents };
          });
        }
      }
    } catch (error) {
      console.error('Error buscando DNI:', error);
    } finally {
      if (type === 'student') setLoadingStudentDni(false);
      else setLoadingParentDni(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleDniChange = (e, type, index = null) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 8);
    if (type === 'student') {
      setNewStudent(prev => ({ ...prev, dni: value }));
      if (value.length === 8) handleDniLookup(value, 'student');
    } else {
      setNewStudent(prev => {
        const newParents = [...prev.parents];
        newParents[index] = { ...newParents[index], parent_dni: value };
        return { ...prev, parents: newParents };
      });
      if (value.length === 8) handleDniLookup(value, 'parent', index);
    }
  };

  const handleParentChange = (e, index, field) => {
    const value = e.target.value;
    setNewStudent(prev => {
      const newParents = [...prev.parents];
      newParents[index] = { ...newParents[index], [field]: value };
      return { ...prev, parents: newParents };
    });
  };

  const addParent = () => {
    setNewStudent(prev => ({
      ...prev,
      parents: [...prev.parents, createEmptyParent()]
    }));
  };

  const removeParent = (index) => {
    setNewStudent(prev => ({
      ...prev,
      parents: prev.parents.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        first_name: newStudent.first_name,
        last_name: newStudent.last_name,
        dni: newStudent.dni,
        grade_section: [newStudent.grade, newStudent.section].filter(Boolean).join(' '),
        parents: newStudent.parents,
        email: newStudent.email ? newStudent.email.trim() : null,
        password: newStudent.password ? newStudent.password.trim() : null
      };

      if (editingStudentId) {
        await api.put(`/students/${editingStudentId}`, payload);
      } else {
        await api.post('/students', payload);
      }
      closeModal();
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al guardar estudiante');
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm('¿Seguro que deseas eliminar este estudiante?')) return;

    try {
      await api.delete(`/students/${studentId}`);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || 'Error al eliminar estudiante');
    }
  };

  const filteredStudents = students.filter(s =>
    `${s.first_name} ${s.last_name} ${s.dni || ''}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <h2 className="text-2xl font-bold text-slate-900">Gestión de Estudiantes</h2>
        {canWrite ? (
          <button
            onClick={openCreateModal}
            className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
          >
            <GraduationCap size={20} className="mr-2" />
            Nuevo Estudiante
          </button>
        ) : (
          <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500">
            Modo solo lectura
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre o DNI..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="w-full sm:w-auto px-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all flex justify-center items-center">
          <Filter size={20} />
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase">Estudiante</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase">Padre/Apoderado</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase text-center">Código QR</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="4" className="px-6 py-10 text-center text-slate-400">Cargando...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-10 text-center text-slate-400">No se encontraron registros</td></tr>
              ) : filteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-slate-50/50 transition-all">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold mr-3 shrink-0">
                        {student.first_name[0]}{student.last_name[0]}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{student.first_name} {student.last_name}</span>
                        <span className="text-xs text-slate-500">DNI: {student.dni || 'N/A'}</span>
                        {student.User?.email ? (
                          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                            <Mail size={12} /> {student.User.email}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Sin acceso web</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col space-y-2">
                      {student.Parents && student.Parents.length > 0 ? student.Parents.map(parent => (
                        <div key={parent.id} className="flex flex-col border-l-2 border-emerald-200 pl-2">
                          <span className="text-sm font-medium text-slate-700">{parent.first_name} {parent.last_name}</span>
                          <span className="text-xs text-slate-500">DNI: {parent.dni || 'N/A'} • {parent.phone || 'Sin tel.'}</span>
                        </div>
                      )) : (
                        <span className="text-sm text-slate-400">Sin apoderados</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => setQrModal({ show: true, uuid: student.qr_code_uuid, name: `${student.first_name} ${student.last_name}` })}
                      className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 transition-all inline-flex justify-center"
                    >
                      <QrCode size={20} />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {canWrite ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(student)}
                          className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all"
                          title="Editar estudiante"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.id)}
                          className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all"
                          title="Eliminar estudiante"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-slate-400">Solo lectura</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl animate-in zoom-in duration-300 overflow-hidden my-8">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-xl font-bold text-slate-900">{modalTitle}</h3>
              <button type="button" onClick={closeModal} className="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-500">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-wider border-b pb-2">Datos del Estudiante</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">DNI Estudiante</label>
                    <div className="relative">
                      <input required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none pr-10"
                        value={newStudent.dni} onChange={e => handleDniChange(e, 'student')} placeholder="8 dígitos" maxLength="8" />
                      {loadingStudentDni && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-emerald-500" size={18} />}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Grado</label>
                    <select
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={newStudent.grade}
                      onChange={e => setNewStudent({ ...newStudent, grade: e.target.value })}
                    >
                      <option value="">Selecciona grado</option>
                      {[1, 2, 3, 4, 5, 6].map((grade) => (
                        <option key={grade} value={grade}>{grade}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Sección</label>
                    <select
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={newStudent.section}
                      onChange={e => setNewStudent({ ...newStudent, section: e.target.value })}
                    >
                      <option value="">Selecciona sección</option>
                      {['A', 'B', 'C', 'D', 'E', 'F'].map((section) => (
                        <option key={section} value={section}>{section}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombres</label>
                    <input required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={newStudent.first_name} onChange={e => setNewStudent({ ...newStudent, first_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Apellidos</label>
                    <input required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={newStudent.last_name} onChange={e => setNewStudent({ ...newStudent, last_name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                      <Mail size={14} className="text-emerald-600" /> Correo Institucional / Acceso
                    </label>
                    <input
                      type="email"
                      placeholder="estudiante@colegio.edu.pe"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={newStudent.email}
                      onChange={e => setNewStudent({ ...newStudent, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                      <Key size={14} className="text-emerald-600" /> {editingStudentId ? 'Cambiar Contraseña' : 'Contraseña de Acceso'}
                    </label>
                    <input
                      type="password"
                      placeholder={editingStudentId ? 'Dejar en blanco para mantener actual' : 'Por defecto DNI si se deja vacío'}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={newStudent.password}
                      onChange={e => setNewStudent({ ...newStudent, password: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <h4 className="text-sm font-bold text-emerald-600 uppercase tracking-wider">Datos de Apoderados</h4>
                  <button type="button" onClick={addParent} className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full hover:bg-emerald-200 transition-all font-bold">
                    + Agregar Apoderado
                  </button>
                </div>

                {newStudent.parents.map((parent, index) => (
                  <div key={index} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative">
                    {newStudent.parents.length > 1 && (
                      <button type="button" onClick={() => removeParent(index)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500">
                        <X size={16} />
                      </button>
                    )}
                    <h5 className="text-xs font-bold text-slate-500 mb-3">Apoderado {index + 1}</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">DNI Apoderado</label>
                        <div className="relative">
                          <input className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none pr-10"
                            value={parent.parent_dni} onChange={e => handleDniChange(e, 'parent', index)} placeholder="8 dígitos" maxLength="8" />
                          {loadingParentDni[index] && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-emerald-500" size={18} />}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                        <input className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                          value={parent.parent_phone} onChange={e => handleParentChange(e, index, 'parent_phone')} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nombres</label>
                        <input className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                          value={parent.parent_first_name} onChange={e => handleParentChange(e, index, 'parent_first_name')} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Apellidos</label>
                        <input className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                          value={parent.parent_last_name} onChange={e => handleParentChange(e, index, 'parent_last_name')} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl">
                <p className="text-xs text-emerald-700">Al guardar, el sistema generará automáticamente los códigos QR para el estudiante y el padre (si es nuevo).</p>
              </div>
              <button type="submit" className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all">
                Guardar Registros
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
        accent="emerald"
      />
    </div>
  );
};

export default StudentManagement;
