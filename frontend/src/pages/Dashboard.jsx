import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  LogOut,
  User,
  Users,
  Calendar,
  BarChart3,
  QrCode,
  Bell,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { Link, Routes, Route } from 'react-router-dom';
import StudentManagement from './StudentManagement';
import ParentManagement from './ParentManagement';
import AttendancePanel from './AttendancePanel';
import Reports from './Reports';
import MeetingManagement from './MeetingManagement';
import MeetingAttendancePanel from './MeetingAttendancePanel';

const Dashboard = () => {
  const { user, logout } = useAuth();

  const menuItems = [
    { title: 'Escáner QR', icon: QrCode, path: '/scanner', color: 'bg-sky-500', role: ['admin', 'docente', 'director'] },
    { title: 'Estudiantes', icon: Users, path: '/dashboard/students', color: 'bg-emerald-500', role: ['admin', 'docente', 'director'] },
    { title: 'Padres o Apoderados', icon: User, path: '/dashboard/parents', color: 'bg-blue-500', role: ['admin', 'director'] },
    { title: 'Reuniones', icon: Calendar, path: '/dashboard/meetings', color: 'bg-violet-500', role: ['admin', 'director'] },
    { title: 'Asistencia', icon: Calendar, path: '/dashboard/attendance', color: 'bg-amber-500', role: ['admin', 'docente', 'director', 'padre'] },
    { title: 'Reportes', icon: BarChart3, path: '/dashboard/reports', color: 'bg-fuchsia-500', role: ['admin', 'director'] },
  ];

  const filteredMenu = menuItems.filter(item => item.role.includes(user?.role));

  const [loadingStats, setLoadingStats] = useState(true);
  const [statsData, setStatsData] = useState({
    totalStudents: 0,
    attendancePercentage: 0,
    upcomingMeetings: 0,
    totalReports: 0,
    attendanceTrend: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [performanceBars, setPerformanceBars] = useState([0, 0, 0, 0, 0, 0]);
  const [targetBars, setTargetBars] = useState([0, 0, 0, 0, 0, 0]);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoadingStats(true);
        const { data } = await api.get('/dashboard/stats');
        if (data.success) {
          setStatsData(data.data.stats);
          setRecentActivity(data.data.recentActivity);
          setTargetBars(data.data.performanceBars);
        }
      } catch (error) {
        console.error('Error cargando estadísticas del dashboard:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchDashboardStats();
  }, []);

  useEffect(() => {
    if (!loadingStats) {
      const timer = setTimeout(() => {
        setPerformanceBars(targetBars);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [loadingStats, targetBars]);

  const summaryStats = [
    { label: 'Estudiantes activos', value: statsData.totalStudents, change: '+0%', icon: Users, tone: 'cyan' },
    { label: 'Asistencia hoy', value: `${statsData.attendancePercentage}%`, change: '+0%', icon: ShieldCheck, tone: 'emerald' },
    { label: 'Próximas reuniones', value: statsData.upcomingMeetings, change: '+0', icon: Calendar, tone: 'violet' },
    { label: 'Reportes', value: statsData.totalReports, change: '+0', icon: BarChart3, tone: 'amber' },
  ];

  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="dashboard-shell min-h-screen bg-slate-100 text-slate-800">
      <aside className="dashboard-sidebar hidden md:flex flex-col">
        <div className="p-6 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="logo-mark">E</div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-sky-600 font-semibold">Colegio</p>
              <h1 className="text-xl font-bold text-slate-900">EduControl</h1>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {filteredMenu.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="nav-item"
            >
              <div className={`${item.color} nav-icon`}>
                <item.icon size={18} />
              </div>
              <span>{item.title}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200/80">
          <button
            onClick={logout}
            className="logout-btn"
          >
            <LogOut className="mr-3" size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="dashboard-main flex-1 p-4 md:p-8 pb-24 md:pb-8">
        <header className="dashboard-header mb-8">
          <div>
            <p className="eyebrow">Panel principal</p>
            <h2 className="header-title">Hola, {user?.email?.split('@')[0] || 'Usuario'}</h2>
            <p className="text-sm text-slate-500 capitalize">{today}</p>
          </div>

          <div className="header-actions">
            <button className="icon-button" aria-label="Notificaciones">
              <Bell size={18} />
            </button>
            <div className="profile-pill">
              <div className="profile-avatar">
                <User size={18} />
              </div>
              <div>
                <p className="profile-name">{user?.role || 'Usuario'}</p>
                <p className="profile-role">Cuenta activa</p>
              </div>
            </div>
          </div>
        </header>

        <Routes>
          <Route
            index
            element={
              <>
                <section className="welcome-panel">
                  <div className="welcome-copy">
                    <div className="inline-flex items-center gap-2 badge-soft">
                      <Sparkles size={14} />
                      Rendimiento escolar
                    </div>
                    <h3>Tu operación educativa está en marcha.</h3>
                    <p>
                      Monitorea la asistencia, gestiona estudiantes y revisa reportes de forma más ágil y organizada.
                    </p>
                    <div className="welcome-actions">
                      <Link to={filteredMenu[0]?.path || '/dashboard'} className="primary-action group">
                        Ir al módulo
                        <ChevronRight size={18} className="transition-transform group-hover:translate-x-1" />
                      </Link>
                      <button className="secondary-action hover:bg-white/20 transition-colors">Ver resumen</button>
                    </div>
                  </div>

                  <div className="mini-stats">
                    <div className="mini-stat">
                      <span>Presencia</span>
                      <strong>{loadingStats ? '--' : `${statsData.attendancePercentage}%`}</strong>
                    </div>
                    <div className="mini-stat">
                      <span>Estudiantes</span>
                      <strong>{loadingStats ? '--' : statsData.totalStudents}</strong>
                    </div>
                  </div>
                </section>

                <section className="stats-grid">
                  {summaryStats.map((stat) => (
                    <div key={stat.label} className="stat-card">
                      <div className="stat-top">
                        <div className={`stat-icon ${stat.tone}`}>
                          <stat.icon size={20} />
                        </div>
                        <span className="stat-change">{stat.change}</span>
                      </div>
                      <p className="stat-label">{stat.label}</p>
                      <h4 className="stat-value">{stat.value}</h4>
                    </div>
                  ))}
                </section>

                <section className="content-grid">
                  <div className="panel-panel large-panel">
                    <div className="panel-header">
                      <div>
                        <p className="label-muted">Vista general</p>
                        <h3>Asistencia por semana</h3>
                      </div>
                      <div className={`trend-badge ${statsData.attendanceTrend < 0 ? 'bg-red-100 text-red-600' : ''}`}>
                        {statsData.attendanceTrend >= 0 ? (
                          <ArrowUpRight size={14} />
                        ) : (
                          <ArrowUpRight size={14} className="rotate-90" />
                        )}
                        {statsData.attendanceTrend > 0 ? '+' : ''}{statsData.attendanceTrend}%
                      </div>
                    </div>

                    <div className="chart-bars">
                      {performanceBars.map((bar, index) => (
                        <div key={index} className="chart-column">
                          <span className="chart-value">{bar}%</span>
                          <div className="chart-fill" style={{ height: `${bar}%` }} />
                          <small>{['L', 'M', 'M', 'J', 'V', 'S'][index]}</small>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="panel-panel side-panel">
                    <div className="panel-header">
                      <div>
                        <p className="label-muted">Actividad</p>
                        <h3>Reciente</h3>
                      </div>
                    </div>

                    <div className="activity-list relative min-h-[150px]">
                      {loadingStats ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Loader2 className="animate-spin text-emerald-500" size={24} />
                        </div>
                      ) : recentActivity.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center mt-8">No hay actividad reciente hoy</p>
                      ) : recentActivity.map((item, index) => (
                        <div key={index} className="activity-item">
                          <div className={`activity-dot ${item.tone}`} />
                          <div className="activity-copy">
                            <strong>{item.name}</strong>
                            <span>{item.action}</span>
                          </div>
                          <time>{item.time}</time>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="modules-panel panel-panel">
                  <div className="panel-header">
                    <div>
                      <p className="label-muted">Acceso rápido</p>
                      <h3>Módulos del sistema</h3>
                    </div>
                  </div>

                  <div className="modules-grid">
                    {filteredMenu.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className="module-card"
                      >
                        <div className={`${item.color} module-icon`}>
                          <item.icon size={22} />
                        </div>
                        <div className="module-text">
                          <h4>{item.title}</h4>
                          <p>Acceder al módulo</p>
                        </div>
                        <ChevronRight size={18} className="module-arrow" />
                      </Link>
                    ))}
                  </div>
                </section>
              </>
            }
          />
          <Route path="students" element={<StudentManagement />} />
          <Route path="parents" element={<ParentManagement />} />
          <Route path="meetings" element={<MeetingManagement />} />
          <Route path="meetings/:id/attendance" element={<MeetingAttendancePanel />} />
          <Route path="attendance" element={<AttendancePanel />} />
          <Route path="reports" element={<Reports />} />
        </Routes>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 flex justify-around p-3 z-40 pb-safe">
        {filteredMenu.map((item) => (
          <Link key={item.path} to={item.path} className="mobile-nav-item">
            <item.icon size={18} />
            <span>{item.title}</span>
          </Link>
        ))}
        <button onClick={logout} className="mobile-nav-item text-red-500">
          <LogOut size={18} />
          <span>Salir</span>
        </button>
      </nav>
    </div>
  );
};

export default Dashboard;
