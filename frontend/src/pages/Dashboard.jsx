import { useAuth } from '../context/AuthContext';
import { LogOut, User, Users, Calendar, BarChart3, QrCode } from 'lucide-react';
import { Link, Routes, Route } from 'react-router-dom';
import StudentManagement from './StudentManagement';
import ParentManagement from './ParentManagement';
import AttendancePanel from './AttendancePanel';
import Reports from './Reports';
import MeetingManagement from './MeetingManagement';

const Dashboard = () => {
  const { user, logout } = useAuth();

  const menuItems = [
    { title: 'Escáner QR', icon: QrCode, path: '/scanner', color: 'bg-primary-500', role: ['admin', 'docente', 'director'] },
    { title: 'Estudiantes', icon: Users, path: '/dashboard/students', color: 'bg-emerald-500', role: ['admin', 'docente', 'director'] },
    { title: 'Padres o Apoderados', icon: User, path: '/dashboard/parents', color: 'bg-blue-500', role: ['admin', 'director'] },
    { title: 'Reuniones', icon: Calendar, path: '/dashboard/meetings', color: 'bg-indigo-500', role: ['admin', 'director'] },
    { title: 'Asistencia', icon: Calendar, path: '/dashboard/attendance', color: 'bg-amber-500', role: ['admin', 'docente', 'director', 'padre'] },
    { title: 'Reportes', icon: BarChart3, path: '/dashboard/reports', color: 'bg-purple-500', role: ['admin', 'director'] },
  ];

  const filteredMenu = menuItems.filter(item => item.role.includes(user?.role));

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-primary-600">EduControl QR</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {filteredMenu.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center p-3 rounded-xl hover:bg-slate-100 transition-all text-slate-600 hover:text-primary-600"
            >
              <item.icon className="mr-3" size={20} />
              <span className="font-medium">{item.title}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={logout}
            className="flex items-center w-full p-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-medium"
          >
            <LogOut className="mr-3" size={20} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Hola, {user?.email?.split('@')[0] || 'Usuario'}</h2>
            <p className="text-slate-500 capitalize">Rol: {user?.role}</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-white p-2 rounded-full shadow-sm">
              <User className="text-slate-400" />
            </div>
          </div>
        </header>

        {/* Contenido Dinámico según la Ruta */}
        <Routes>
          <Route index element={
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredMenu.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="premium-card p-6 flex flex-col items-start"
                >
                  <div className={`${item.color} p-3 rounded-2xl text-white mb-4 shadow-lg shadow-current/20`}>
                    <item.icon size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                  <p className="text-sm text-slate-500">Acceder al módulo</p>
                </Link>
              ))}
            </div>
          } />
          <Route path="students" element={<StudentManagement />} />
          <Route path="parents" element={<ParentManagement />} />
          <Route path="meetings" element={<MeetingManagement />} />
          <Route path="attendance" element={<AttendancePanel />} />
          <Route path="reports" element={<Reports />} />
        </Routes>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-3 z-40 pb-safe">
        {filteredMenu.map((item) => (
          <Link key={item.path} to={item.path} className="flex flex-col items-center text-slate-500 hover:text-primary-600">
            <item.icon size={20} />
            <span className="text-[10px] mt-1">{item.title}</span>
          </Link>
        ))}
        <button onClick={logout} className="flex flex-col items-center text-red-500">
          <LogOut size={20} />
          <span className="text-[10px] mt-1">Salir</span>
        </button>
      </nav>
    </div>
  );
};

export default Dashboard;
