import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { UserPlus, ArrowLeft } from 'lucide-react';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleName, setRoleName] = useState('padre');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await api.post('/auth/register', {
        email,
        password,
        roleName
      });
      setSuccess('Usuario registrado con éxito. Redirigiendo al login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrar el usuario');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="max-w-md w-full glass p-8 rounded-3xl shadow-2xl space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center">
          <Link to="/login" className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 mb-6 transition-colors">
            <ArrowLeft size={16} className="mr-1" />
            Volver al inicio de sesión
          </Link>
          <div className="inline-flex p-4 rounded-2xl bg-primary-500 text-white mb-4">
            <UserPlus size={40} />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900">Crear Cuenta</h2>
          <p className="mt-2 text-slate-600">Regístrate en el sistema EduControl QR</p>
        </div>
        
        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm border border-red-100">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 text-green-600 p-3 rounded-xl text-sm border border-green-100">
              {success}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Correo electrónico</label>
              <input
                type="email"
                required
                className="mt-1 block w-full px-4 py-3 bg-slate-100 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700">Contraseña</label>
              <input
                type="password"
                required
                className="mt-1 block w-full px-4 py-3 bg-slate-100 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Tipo de Usuario</label>
              <select
                className="mt-1 block w-full px-4 py-3 bg-slate-100 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all outline-none appearance-none"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
              >
                <option value="admin">Administrador</option>
                <option value="director">Director</option>
                <option value="docente">Docente</option>
                <option value="padre">Padre de familia</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-white font-bold premium-gradient hover:opacity-90 transition-all shadow-lg shadow-primary-200"
          >
            Registrar Usuario
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
