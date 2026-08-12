import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { UserPlus, ArrowLeft, Mail, Lock, ShieldCheck, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import logoColegio from '../assets/logo_colegio.jpg';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleName, setRoleName] = useState('padre');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white overflow-hidden relative">
      {/* Panel Izquierdo - Decorativo (Oculto en móviles) */}
      <div className="hidden lg:flex lg:w-1/2 relative premium-gradient items-center justify-center overflow-hidden">
        {/* Elementos decorativos dinámicos de fondo */}
        <motion.div 
          animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }} 
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 right-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" 
        />
        <motion.div 
          animate={{ y: [0, 40, 0], scale: [1, 1.15, 1] }} 
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-10 left-10 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl" 
        />
        
        <div className="relative z-10 flex flex-col items-center text-center px-12 text-white">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-white p-4 rounded-3xl shadow-2xl mb-8"
          >
            <img
              src={logoColegio}
              alt="EduControl Logo"
              className="h-32 w-auto object-contain rounded-xl"
            />
          </motion.div>
          
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-4xl font-extrabold tracking-tight mb-4 drop-shadow-lg"
          >
            Únete a EduControl
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-lg text-blue-50 max-w-md font-medium"
          >
            Crea una cuenta para acceder a la plataforma de gestión escolar más avanzada.
          </motion.p>
          
          <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 0.6 }}
             className="mt-12 flex items-center space-x-2 text-white/80 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm border border-white/20"
          >
            <ShieldCheck size={18} />
            <span className="text-sm">Tus datos están protegidos</span>
          </motion.div>
        </div>
      </div>

      {/* Panel Derecho - Formulario de Registro */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-slate-50 relative">
        {/* Decorative background elements for mobile */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none lg:hidden">
            <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-primary-200/40 rounded-full blur-3xl"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-blue-200/40 rounded-full blur-3xl"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md relative z-10"
        >
          <Link to="/login" className="inline-flex items-center text-sm font-semibold text-slate-500 hover:text-primary-600 mb-8 transition-colors group">
            <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" />
            Volver al inicio de sesión
          </Link>

          {/* Logo solo visible en móvil */}
          <div className="lg:hidden flex justify-center mb-8">
            <img
              src={logoColegio}
              alt="EduControl Logo"
              className="h-24 w-auto drop-shadow-md rounded-2xl"
            />
          </div>

          <div className="text-center lg:text-left mb-10">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Crear Cuenta</h2>
            <p className="mt-3 text-slate-500 font-medium">Completa los datos para registrarte en el sistema.</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-200 flex items-center font-medium shadow-sm"
              >
                <div className="w-1 h-full bg-red-500 mr-3 rounded-full"></div>
                {error}
              </motion.div>
            )}
            
            {success && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="bg-green-50 text-green-700 p-4 rounded-xl text-sm border border-green-200 flex items-center font-medium shadow-sm"
              >
                <div className="w-1 h-full bg-green-500 mr-3 rounded-full"></div>
                {success}
              </motion.div>
            )}
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Correo electrónico</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors">
                    <Mail size={20} />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="tucorreo@institucion.edu.pe"
                    className="block w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none shadow-sm hover:border-slate-300"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Contraseña</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors">
                    <Lock size={20} />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="block w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none shadow-sm hover:border-slate-300"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Tipo de Usuario</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary-500 transition-colors">
                    <Users size={20} />
                  </div>
                  <select
                    className="block w-full pl-11 pr-10 py-3.5 bg-white border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all outline-none shadow-sm hover:border-slate-300 appearance-none text-slate-700 font-medium"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    disabled={isLoading}
                  >
                    <option value="admin">Administrador</option>
                    <option value="director">Director</option>
                    <option value="docente">Docente</option>
                    <option value="padre">Padre de familia</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400">
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className={`w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-white font-bold premium-gradient transition-all shadow-lg shadow-primary-200/50 mt-8 ${isLoading ? 'opacity-75 cursor-not-allowed' : 'hover:opacity-90'}`}
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <UserPlus className="mr-2" size={20} />
                  Registrar Usuario
                </>
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
