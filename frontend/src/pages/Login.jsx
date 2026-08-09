import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Credenciales incorrectas o error en el servidor');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="max-w-md w-full glass p-8 rounded-3xl shadow-2xl space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <img
              src="src/assets/logo_colegio.jpg"
              alt="EduControl Logo"
              className="h-24 w-auto drop-shadow-md"
            />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900">EduControl QR</h2>
          <p className="mt-2 text-slate-600">Bienvenido al sistema de asistencia</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-xl text-sm border border-red-100">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Correo electrónico</label>
              <input
                type="email"
                required
                className="mt-1 block w-full px-4 py-3 bg-slate-100 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all outline-none"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-white font-bold premium-gradient hover:opacity-90 transition-all shadow-lg shadow-primary-200"
          >
            <LogIn className="mr-2" size={20} />
            Iniciar Sesión
          </button>
        </form>

        <div className="text-center pt-4 border-t border-slate-100">
          <p className="text-sm text-slate-600">
            ¿No tienes una cuenta?{' '}
            <Link to="/register" className="font-bold text-primary-600 hover:text-primary-700 transition-colors">
              Registrar nuevo usuario
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
