import { useState, useEffect } from 'react';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Download, Filter, TrendingUp, Users, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const Reports = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/reports/general');
      setStats(response.data);
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Cargando estadísticas...</div>;

  const safeStats = stats || {
    summary: { total: 0, present: 0, tardy: 0, absent: 0 },
    chartData: []
  };

  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];
  const pieData = [
    { name: 'Presentes', value: safeStats.summary.present || 0 },
    { name: 'Tardanzas', value: safeStats.summary.tardy || 0 },
    { name: 'Ausentes', value: safeStats.summary.absent || 0 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <h2 className="text-2xl font-bold text-slate-900">Reportes y Estadísticas</h2>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
          <button className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">
            <Filter size={18} className="mr-2" />
            Filtrar
          </button>
          <button className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-200">
            <Download size={18} className="mr-2" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Estudiantes" value={safeStats.summary.total || 0} icon={Users} color="text-primary-600" bg="bg-primary-50" />
        <StatCard title="Presentes Hoy" value={safeStats.summary.present || 0} icon={CheckCircle} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard title="Tardanzas Hoy" value={safeStats.summary.tardy || 0} icon={Clock} color="text-amber-600" bg="bg-amber-50" />
        <StatCard title="Ausentes Hoy" value={safeStats.summary.absent || 0} icon={AlertTriangle} color="text-red-600" bg="bg-red-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weekly Chart */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
            <TrendingUp size={20} className="mr-2 text-primary-500" />
            Tendencia de Asistencia (Últimos 7 días)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={safeStats.chartData || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="asistencia" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white p-4 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Distribución de Hoy</h3>
          <div className="h-[350px] sm:h-64 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex flex-row sm:flex-col flex-wrap justify-center gap-4 sm:gap-0">
              {pieData.map((item, i) => (
                <div key={item.name} className="flex items-center text-sm">
                  <div className="w-3 h-3 rounded-full mr-2 shrink-0" style={{backgroundColor: COLORS[i]}}></div>
                  <span className="text-slate-600">{item.name}: </span>
                  <span className="font-bold ml-1">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color, bg }) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center space-x-4">
    <div className={`${bg} ${color} p-3 rounded-2xl`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className={`text-2xl font-bold text-slate-900`}>{value}</p>
    </div>
  </div>
);

export default Reports;
