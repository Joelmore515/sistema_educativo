import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Download, Filter, TrendingUp, Users, CheckCircle, Clock, AlertTriangle, X, ChevronDown } from 'lucide-react';

// ─── Utilidad: exportar PDF con jsPDF si está disponible, si no usa window.print ───
const exportToPDF = async (stats, detailRecords, filters) => {
  try {
    const { jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const today = filters.date || new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
    const grade = filters.grade && filters.grade !== 'TODOS' ? ` — Grado: ${filters.grade}` : '';

    // Encabezado
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text('Reporte de Asistencia Escolar', pageW / 2, 18, { align: 'center' });
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(`Fecha: ${today}${grade}`, pageW / 2, 26, { align: 'center' });
    doc.text(`Generado: ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}`, pageW / 2, 32, { align: 'center' });

    // Línea separadora
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 36, pageW - 14, 36);

    // Resumen
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text('Resumen del Día', 14, 44);

    const summaryData = [
      ['Total Estudiantes', stats.total],
      ['Presentes', stats.present],
      ['Tardanzas', stats.tardy],
      ['Ausentes', stats.absent],
    ];

    autoTable(doc, {
      startY: 48,
      head: [['Indicador', 'Cantidad']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 1: { halign: 'center' } },
      margin: { left: 14, right: 14 }
    });

    // Detalle de asistencia
    if (detailRecords && detailRecords.length > 0) {
      const startY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(13);
      doc.setTextColor(30, 41, 59);
      doc.text('Detalle de Asistencia', 14, startY);

      const statusLabel = (s, justified) => {
        if (s === 'presente') return 'Presente';
        if (s === 'tardanza') return 'Tardanza';
        if (s === 'ausente') return justified ? 'Ausente (Justificado)' : 'Ausente';
        return s;
      };

      const tableRows = detailRecords.map(r => [
        r.student_name,
        r.grade_section,
        r.dni,
        statusLabel(r.status, r.is_justified),
        r.check_in,
        r.check_out
      ]);

      autoTable(doc, {
        startY: startY + 4,
        head: [['Alumno', 'Grado', 'DNI', 'Estado', 'Ingreso', 'Salida']],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 3) {
            const val = data.cell.raw;
            if (val === 'Presente') data.cell.styles.textColor = [5, 150, 105];
            else if (val === 'Tardanza') data.cell.styles.textColor = [217, 119, 6];
            else if (val?.startsWith('Ausente')) data.cell.styles.textColor = [220, 38, 38];
          }
        },
        margin: { left: 14, right: 14 }
      });
    }

    // Pie de página
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Sistema Educativo — Página ${i} de ${pageCount}`, pageW / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
    }

    doc.save(`reporte-asistencia-${today.replace(/\//g, '-')}.pdf`);
  } catch (err) {
    console.error('Error al generar PDF con jsPDF:', err);
    // Fallback: ventana de impresión del navegador
    exportViaPrint(stats, detailRecords, filters);
  }
};

// Fallback: abre ventana de impresión con HTML formateado
const exportViaPrint = (stats, detailRecords, filters) => {
  const today = filters.date || new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima' });
  const grade = filters.grade && filters.grade !== 'TODOS' ? ` &mdash; Grado: ${filters.grade}` : '';

  const statusBadge = (s, justified) => {
    if (s === 'presente') return `<span style="color:#059669;font-weight:600">Presente</span>`;
    if (s === 'tardanza') return `<span style="color:#d97706;font-weight:600">Tardanza</span>`;
    if (s === 'ausente') return justified
      ? `<span style="color:#2563eb;font-weight:600">Ausente (Justificado)</span>`
      : `<span style="color:#dc2626;font-weight:600">Ausente</span>`;
    return s;
  };

  const rows = (detailRecords || []).map(r => `
    <tr>
      <td>${r.student_name}</td>
      <td>${r.grade_section}</td>
      <td>${r.dni}</td>
      <td>${statusBadge(r.status, r.is_justified)}</td>
      <td>${r.check_in}</td>
      <td>${r.check_out}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Reporte de Asistencia</title>
    <style>
      body{font-family:Arial,sans-serif;color:#1e293b;margin:24px;font-size:12px}
      h1{text-align:center;font-size:18px;margin-bottom:4px}
      .sub{text-align:center;color:#64748b;font-size:11px;margin-bottom:20px}
      .summary{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap}
      .card{border:1px solid #e2e8f0;border-radius:8px;padding:10px 20px;text-align:center;flex:1;min-width:100px}
      .card-label{font-size:10px;color:#64748b}
      .card-value{font-size:22px;font-weight:700}
      table{width:100%;border-collapse:collapse;margin-top:12px;font-size:11px}
      th{background:#1e293b;color:#fff;padding:6px 8px;text-align:left}
      td{padding:5px 8px;border-bottom:1px solid #f1f5f9}
      tr:nth-child(even){background:#f8fafc}
      @media print{body{margin:12px}button{display:none}}
    </style></head><body>
    <h1>Reporte de Asistencia Escolar</h1>
    <div class="sub">Fecha: ${today}${grade} &nbsp;|&nbsp; Generado: ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}</div>
    <div class="summary">
      <div class="card"><div class="card-label">Total</div><div class="card-value">${stats.total}</div></div>
      <div class="card"><div class="card-label">Presentes</div><div class="card-value" style="color:#059669">${stats.present}</div></div>
      <div class="card"><div class="card-label">Tardanzas</div><div class="card-value" style="color:#d97706">${stats.tardy}</div></div>
      <div class="card"><div class="card-label">Ausentes</div><div class="card-value" style="color:#dc2626">${stats.absent}</div></div>
    </div>
    ${rows ? `<table><thead><tr><th>Alumno</th><th>Grado</th><th>DNI</th><th>Estado</th><th>Ingreso</th><th>Salida</th></tr></thead><tbody>${rows}</tbody></table>` : '<p style="color:#64748b;text-align:center">Sin registros de asistencia para los filtros seleccionados.</p>'}
    <script>window.onload=()=>window.print();</script>
    </body></html>`;

  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
};

// ─── Componente principal ───────────────────────────────────────────────────────
const Reports = () => {
  const [stats, setStats]           = useState(null);
  const [loading, setLoading]       = useState(true);
  const [exporting, setExporting]   = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filtros
  const todayISO = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' }); // YYYY-MM-DD
  const [filterDate, setFilterDate]   = useState(todayISO);
  const [filterGrade, setFilterGrade] = useState('TODOS');

  const fetchStats = useCallback(async (date, grade) => {
    setLoading(true);
    try {
      const params = {};
      if (date) params.date = date;
      if (grade && grade !== 'TODOS') params.grade = grade;
      const response = await api.get('/reports/general', { params });
      setStats(response.data);
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(filterDate, filterGrade);
  }, []); // Solo al montar

  const handleApplyFilters = () => {
    fetchStats(filterDate, filterGrade);
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    setFilterDate(todayISO);
    setFilterGrade('TODOS');
    fetchStats(todayISO, 'TODOS');
    setShowFilters(false);
  };

  const handleExportPDF = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const params = {};
      if (filterDate) params.date = filterDate;
      if (filterGrade && filterGrade !== 'TODOS') params.grade = filterGrade;
      const detailRes = await api.get('/reports/detail', { params });
      const safeS = stats?.summary || { total: 0, present: 0, tardy: 0, absent: 0 };
      await exportToPDF(safeS, detailRes.data.records || [], { date: filterDate, grade: filterGrade });
    } catch (err) {
      console.error('Error al exportar PDF:', err);
    } finally {
      setExporting(false);
    }
  };

  const safeStats = stats || {
    summary: { total: 0, present: 0, tardy: 0, absent: 0 },
    chartData: [],
    grades: []
  };

  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];
  const pieData = [
    { name: 'Presentes',  value: safeStats.summary?.present || 0 },
    { name: 'Tardanzas',  value: safeStats.summary?.tardy   || 0 },
    { name: 'Ausentes',   value: safeStats.summary?.absent  || 0 },
  ];
  const pieHasData = pieData.some(d => d.value > 0);

  const grades = safeStats.grades || [];

  // Etiqueta del día de referencia para los cards
  const referenceDateLabel = safeStats.summary?.referenceDate
    ? new Date(safeStats.summary.referenceDate + 'T12:00:00').toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reportes y Estadísticas</h2>
          {referenceDateLabel && !loading && (
            <p className="text-sm text-slate-500 mt-1 capitalize">{referenceDateLabel}</p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-3">
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`w-full sm:w-auto flex items-center justify-center px-4 py-2 rounded-xl border transition-all ${showFilters ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <Filter size={18} className="mr-2" />
            Filtrar
            <ChevronDown size={16} className={`ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={handleExportPDF}
            disabled={exporting || loading}
            className="w-full sm:w-auto flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Download size={18} className={`mr-2 ${exporting ? 'animate-bounce' : ''}`} />
            {exporting ? 'Generando...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {/* Panel de Filtros */}
      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Filtros</h3>
            <button onClick={() => setShowFilters(false)} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Fecha de referencia</label>
              <input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Grado / Sección</label>
              <select
                value={filterGrade}
                onChange={e => setFilterGrade(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-sm bg-white"
              >
                <option value="TODOS">Todos los grados</option>
                {grades.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4 justify-end">
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
            >
              Restablecer
            </button>
            <button
              onClick={handleApplyFilters}
              className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm"
            >
              Aplicar filtros
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard title="Total Estudiantes" value={safeStats.summary?.total   || 0} icon={Users}         color="text-primary-600" bg="bg-primary-50"  />
            <StatCard title="Presentes"          value={safeStats.summary?.present || 0} icon={CheckCircle}   color="text-emerald-600" bg="bg-emerald-50"  />
            <StatCard title="Tardanzas"          value={safeStats.summary?.tardy   || 0} icon={Clock}         color="text-amber-600"   bg="bg-amber-50"    />
            <StatCard title="Ausentes"           value={safeStats.summary?.absent  || 0} icon={AlertTriangle} color="text-red-600"     bg="bg-red-50"      />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Gráfico de barras – tendencia 7 días */}
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
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} allowDecimals={false} />
                    <Tooltip
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                      formatter={(value) => [value, 'Asistentes']}
                      labelFormatter={(label, payload) => {
                        const fecha = payload?.[0]?.payload?.fecha;
                        return fecha ? `${label} (${fecha})` : label;
                      }}
                    />
                    <Bar dataKey="asistencia" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart – distribución del día */}
            <div className="bg-white p-4 sm:p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-1">Distribución del Día</h3>
              {safeStats.summary?.referenceDate && (
                <p className="text-xs text-slate-400 mb-5">{safeStats.summary.referenceDate}</p>
              )}
              <div className="h-[300px] sm:h-64 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-0">
                {pieHasData ? (
                  <>
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
                        <Tooltip formatter={(value, name) => [value, name]} />
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
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                    <p className="text-sm font-medium">Sin registros para los filtros seleccionados</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
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
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  </div>
);

export default Reports;
