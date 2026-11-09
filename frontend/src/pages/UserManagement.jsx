import { useEffect, useState } from 'react';
import { useAuth } from '../context/authContextValue';
import api from '../services/api';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X
} from 'lucide-react';

const CREATE_ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'director', label: 'Director' },
  { value: 'docente', label: 'Docente' }
];

const ROLE_LABELS = {
  admin: 'Administrador',
  director: 'Director',
  docente: 'Docente',
  padre: 'Padre / Apoderado',
  estudiante: 'Estudiante'
};

const ROLE_STYLES = {
  admin: 'bg-indigo-100 text-indigo-800',
  director: 'bg-violet-100 text-violet-800',
  docente: 'bg-sky-100 text-sky-800',
  padre: 'bg-emerald-100 text-emerald-800',
  estudiante: 'bg-amber-100 text-amber-800'
};

const initialCreateForm = {
  email: '',
  password: '',
  confirmPassword: '',
  roleName: 'docente'
};

const initialPasswordForm = {
  password: '',
  confirmPassword: ''
};

const UserManagement = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('todos');
  const [message, setMessage] = useState({ type: '', text: '' });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const [passwordModal, setPasswordModal] = useState({ show: false, user: null });
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [deletingId, setDeletingId] = useState(null);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'No se pudo cargar la lista de usuarios'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    api.get('/users')
      .then((response) => {
        if (active) setUsers(Array.isArray(response.data) ? response.data : []);
      })
      .catch((error) => {
        if (active) {
          setMessage({
            type: 'error',
            text: error.response?.data?.message || 'No se pudo cargar la lista de usuarios'
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const openCreateModal = () => {
    setCreateForm(initialCreateForm);
    setCreateError('');
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateForm(initialCreateForm);
    setCreateError('');
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setCreateError('');

    if (createForm.password.length < 6) {
      setCreateError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (createForm.password !== createForm.confirmPassword) {
      setCreateError('Las contraseñas no coinciden');
      return;
    }

    try {
      setCreating(true);
      const response = await api.post('/users', {
        email: createForm.email.trim(),
        password: createForm.password,
        roleName: createForm.roleName
      });

      setMessage({
        type: 'success',
        text: response.data?.message || 'Usuario creado con éxito'
      });
      closeCreateModal();
      fetchUsers();
    } catch (error) {
      setCreateError(error.response?.data?.message || 'No se pudo crear el usuario');
    } finally {
      setCreating(false);
    }
  };

  const openPasswordModal = (user) => {
    setPasswordModal({ show: true, user });
    setPasswordForm(initialPasswordForm);
    setPasswordError('');
  };

  const closePasswordModal = () => {
    setPasswordModal({ show: false, user: null });
    setPasswordForm(initialPasswordForm);
    setPasswordError('');
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setPasswordError('');

    if (passwordForm.password.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setPasswordError('Las contraseñas no coinciden');
      return;
    }

    try {
      setSavingPassword(true);
      const response = await api.put(`/users/${passwordModal.user.id}/password`, {
        password: passwordForm.password
      });
      setMessage({
        type: 'success',
        text: response.data?.message || 'Contraseña actualizada con éxito'
      });
      closePasswordModal();
    } catch (error) {
      setPasswordError(error.response?.data?.message || 'No se pudo actualizar la contraseña');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.id === currentUser?.id) return;

    const confirmed = window.confirm(
      `¿Estás seguro de que deseas eliminar la cuenta de ${user.email}?`
    );
    if (!confirmed) return;

    try {
      setDeletingId(user.id);
      const response = await api.delete(`/users/${user.id}`);
      setMessage({
        type: 'success',
        text: response.data?.message || 'Usuario eliminado con éxito'
      });
      setUsers((prev) => prev.filter((item) => item.id !== user.id));
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'No se pudo eliminar el usuario'
      });
    } finally {
      setDeletingId(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    const email = String(user.email || '').toLowerCase();
    const matchesSearch = email.includes(searchTerm.toLowerCase());
    const roleName = user.Role?.name || 'sin-rol';
    const matchesRole = roleFilter === 'todos' || roleName === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center">
            <Users className="mr-2 text-indigo-600" size={24} />
            Gestión de Usuarios
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Crea y administra las cuentas de administradores, directores y docentes.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
        >
          <UserPlus size={20} className="mr-2" />
          Nuevo Usuario
        </button>
      </div>

      {message.text && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm flex items-start justify-between gap-3 ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <span className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {message.text}
          </span>
          <button
            type="button"
            onClick={() => setMessage({ type: '', text: '' })}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Cerrar mensaje"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por correo electrónico..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          className="w-full sm:w-56 px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm text-slate-700"
        >
          <option value="todos">Todos los roles</option>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase">Usuario</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase">Rol</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase">Creado</th>
                <th className="px-6 py-4 text-sm font-bold text-slate-600 uppercase text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-10 text-center text-slate-400">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={18} className="animate-spin" />
                      Cargando usuarios...
                    </span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-10 text-center text-slate-400">
                    No se encontraron usuarios con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const roleName = user.Role?.name || 'sin-rol';
                  const isCurrentUser = user.id === currentUser?.id;
                  const createdDate = user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('es-PE', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })
                    : 'No registrada';

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <ShieldCheck size={18} />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{user.email}</span>
                            {isCurrentUser && (
                              <span className="text-[11px] font-semibold text-indigo-600">
                                Tu cuenta
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                            ROLE_STYLES[roleName] || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {ROLE_LABELS[roleName] || roleName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{createdDate}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openPasswordModal(user)}
                            className="p-2 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-all"
                            title="Cambiar contraseña"
                          >
                            <KeyRound size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user)}
                            disabled={isCurrentUser || deletingId === user.id}
                            className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            title={isCurrentUser ? 'No puedes eliminar tu propia cuenta' : 'Eliminar usuario'}
                          >
                            {deletingId === user.id ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : (
                              <Trash2 size={18} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl shadow-2xl animate-in zoom-in duration-300 overflow-hidden my-8">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-xl font-bold text-slate-900">Registrar Nuevo Usuario</h3>
              <button
                type="button"
                onClick={closeCreateModal}
                className="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-500"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4 overflow-y-auto">
              {createError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle size={18} />
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Correo electrónico</label>
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="usuario@colegio.edu.pe"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={createForm.email}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                <select
                  value={createForm.roleName}
                  onChange={(event) =>
                    setCreateForm((prev) => ({ ...prev, roleName: event.target.value }))
                  }
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {CREATE_ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={createForm.password}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, password: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar contraseña</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Repite la contraseña"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={createForm.confirmPassword}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-indigo-50 px-4 py-3 text-xs text-indigo-800">
                Las cuentas de padres y estudiantes se crean desde sus módulos correspondientes para
                vincularlas con su ficha y su código QR.
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Crear Usuario'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {passwordModal.show && passwordModal.user && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl shadow-2xl animate-in zoom-in duration-300 overflow-hidden my-8">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Cambiar contraseña</h3>
                <p className="text-xs text-slate-500 mt-0.5">{passwordModal.user.email}</p>
              </div>
              <button
                type="button"
                onClick={closePasswordModal}
                className="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-500"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="p-6 space-y-4 overflow-y-auto">
              {passwordError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle size={18} />
                  {passwordError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nueva contraseña</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoFocus
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                  value={passwordForm.password}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({ ...prev, password: event.target.value }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar contraseña</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Repite la contraseña"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                  }
                />
              </div>

              <button
                type="submit"
                disabled={savingPassword}
                className="w-full py-3 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 shadow-lg shadow-amber-200 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {savingPassword ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Actualizar Contraseña'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
