import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Mail, Lock, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import logoColegio from '../assets/logo_colegio.jpg';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Credenciales incorrectas o error en el servidor');
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
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-10 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" 
        />
        <motion.div 
          animate={{ y: [0, 30, 0], scale: [1, 1.1, 1] }} 
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-20 right-20 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl" 
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
            EduControl QR
          </motion.h1>
          <motion.p 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-lg text-blue-50 max-w-md font-medium"
          >
            Sistema de gestión de asistencia moderno, seguro e inteligente para tu institución educativa.
          </motion.p>
          
          <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ delay: 0.6 }}
             className="mt-12 flex items-center space-x-2 text-white/80 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm border border-white/20"
          >
            <ShieldCheck size={18} />
            <span className="text-sm">Acceso seguro y encriptado</span>
          </motion.div>
        </div>
      </div>

      {/* Panel Derecho - Formulario de Login */}
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
          {/* Logo solo visible en móvil */}
          <div className="lg:hidden flex justify-center mb-8">
            <img
              src={logoColegio}
              alt="EduControl Logo"
              className="h-24 w-auto drop-shadow-md rounded-2xl"
            />
          </div>

          <div className="text-center lg:text-left mb-10">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">¡Hola de nuevo!</h2>
            <p className="mt-3 text-slate-500 font-medium">Por favor, ingresa tus credenciales para continuar.</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-200 flex items-center font-medium"
              >
                <div className="w-1 h-full bg-red-500 mr-3 rounded-full"></div>
                {error}
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
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                   <label className="block text-sm font-bold text-slate-700">Contraseña</label>
                </div>
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
                  />
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
                  <LogIn className="mr-2" size={20} />
                  Iniciar Sesión
                </>
              )}
            </motion.button>
          </form>

          <div className="text-center mt-10">
            <p className="text-sm text-slate-500 font-medium">
              ¿No tienes una cuenta?{' '}
              <Link to="/register" className="font-bold text-primary-600 hover:text-primary-700 transition-colors relative after:content-[''] after:absolute after:w-full after:scale-x-0 after:h-0.5 after:bottom-0 after:left-0 after:bg-primary-600 after:origin-bottom-right after:transition-transform after:duration-300 hover:after:scale-x-100 hover:after:origin-bottom-left">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
