import { useState, useEffect } from 'react';
import { useAuth } from '../context/authContextValue';
import api from '../services/api';
import {
  QrCode,
  Download,
  Printer,
  ShieldCheck,
  User,
  GraduationCap,
  Loader2,
  AlertCircle,
  Sparkles
} from 'lucide-react';

const MyQR = () => {
  const { user } = useAuth();
  const isParent = user?.role === 'padre';

  // Datos de padre / estudiante
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pestaña en caso de padre: 'children' o 'parent'
  const [activeTab, setActiveTab] = useState('children');
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);

  // Estados de imagen QR
  const [qrBlobUrl, setQrBlobUrl] = useState('');
  const [loadingQr, setLoadingQr] = useState(false);

  // 1. Cargar perfil completo desde /api/me/profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get('/me/profile');
        setProfile(res.data);
      } catch (err) {
        console.error('Error al cargar perfil:', err);
        setError('No se pudo obtener la información del carnet');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Determinar qué sujeto se está visualizando (padre o hijo seleccionado)
  const currentSubject = (() => {
    if (!profile) return null;
    if (isParent) {
      if (activeTab === 'parent') {
        return {
          type: 'parent',
          name: profile.parent
            ? `${profile.parent.first_name} ${profile.parent.last_name}`
            : user?.email,
          dni: profile.parent?.dni || 'S/D',
          subtitle: 'Apoderado / Padre de Familia',
          uuid: profile.parent?.qr_code_uuid
        };
      } else {
        const child = profile.children?.[selectedChildIndex];
        if (!child) return null;
        return {
          type: 'student',
          name: `${child.first_name} ${child.last_name}`,
          dni: child.dni || 'S/D',
          subtitle: child.grade_section || 'Estudiante',
          uuid: child.qr_code_uuid
        };
      }
    } else {
      const student = profile.student;
      if (!student) return null;
      return {
        type: 'student',
        name: `${student.first_name} ${student.last_name}`,
        dni: student.dni || 'S/D',
        subtitle: student.grade_section || 'Estudiante',
        uuid: student.qr_code_uuid
      };
    }
  })();

  // 2. Cargar el QR cuando cambia el UUID seleccionado
  useEffect(() => {
    let active = true;
    let url = '';

    const loadQrImage = async () => {
      if (!currentSubject?.uuid) {
        setQrBlobUrl('');
        return;
      }

      try {
        setLoadingQr(true);
        const res = await api.get(`/qr/${currentSubject.uuid}`, {
          responseType: 'blob'
        });
        if (!active) return;
        url = URL.createObjectURL(res.data);
        setQrBlobUrl(url);
      } catch (err) {
        console.error('Error al cargar imagen QR:', err);
      } finally {
        if (active) setLoadingQr(false);
      }
    };

    loadQrImage();

    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [currentSubject?.uuid]);

  const handleDownload = () => {
    if (!qrBlobUrl || !currentSubject) return;
    const link = document.createElement('a');
    link.href = qrBlobUrl;
    const safeName = currentSubject.name.replace(/\s+/g, '_');
    link.download = `Carnet_QR_${safeName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[360px] p-8">
        <Loader2 className="animate-spin text-sky-600 mb-3" size={36} />
        <p className="text-slate-500 font-medium text-sm">Generando carnet escolar...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-center max-w-md mx-auto my-8">
        <AlertCircle size={36} className="text-red-500 mx-auto mb-2" />
        <h3 className="font-bold text-red-900 mb-1">Error al cargar carnet</h3>
        <p className="text-sm text-red-600">{error || 'No se encontró información'}</p>
      </div>
    );
  }

  const childrenList = profile.children || [];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Cabecera */}
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold mb-2">
          <ShieldCheck size={14} /> Identificación Digital Oficial
        </span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
          Carnet de Identificación QR
        </h2>
        <p className="text-xs md:text-sm text-slate-500 max-w-md mx-auto mt-1">
          Presenta este código en la entrada del colegio para registrar asistencia en segundos.
        </p>
      </div>

      {/* Pestañas para Padre (Hijo vs Padre) */}
      {isParent && (
        <div className="flex justify-center">
          <div className="bg-slate-200/80 p-1 rounded-2xl inline-flex gap-1">
            <button
              onClick={() => setActiveTab('children')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'children'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              QR de Hijos (Asistencia)
            </button>
            <button
              onClick={() => setActiveTab('parent')}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'parent'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mi QR de Padre (Reuniones)
            </button>
          </div>
        </div>
      )}

      {/* Selector de Hijo si hay más de 1 y está en pestaña de hijos */}
      {isParent && activeTab === 'children' && childrenList.length > 1 && (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500">Seleccionar hijo:</span>
          {childrenList.map((child, index) => (
            <button
              key={child.id}
              onClick={() => setSelectedChildIndex(index)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                selectedChildIndex === index
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {child.first_name} {child.last_name}
            </button>
          ))}
        </div>
      )}

      {/* Carnet Escolar Tipo Tarjeta */}
      {currentSubject ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 md:p-8 flex flex-col items-center relative print:shadow-none print:border-2 print:border-slate-800">
          {/* Banda Superior del Carnet */}
          <div className="w-full flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-sky-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md shadow-sky-200">
                E
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-widest text-sky-600">
                  Institución Educativa
                </p>
                <h4 className="text-base font-extrabold text-slate-900 leading-tight">
                  EduControl
                </h4>
              </div>
            </div>

            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
              Vigente 2026
            </span>
          </div>

          {/* Imagen del Código QR */}
          <div className="bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-sm flex items-center justify-center min-w-[210px] min-h-[210px] mb-6">
            {loadingQr ? (
              <Loader2 className="animate-spin text-slate-400" size={36} />
            ) : qrBlobUrl ? (
              <img
                src={qrBlobUrl}
                alt={`QR ${currentSubject.name}`}
                className="w-48 h-48 md:w-56 md:h-56 object-contain"
              />
            ) : (
              <p className="text-xs text-slate-400">QR no disponible</p>
            )}
          </div>

          {/* Datos del Titular */}
          <div className="text-center w-full max-w-sm mb-6">
            <h3 className="text-xl md:text-2xl font-black text-slate-900">
              {currentSubject.name}
            </h3>
            <p className="text-xs md:text-sm font-bold text-sky-700 mt-1 uppercase tracking-wider">
              {currentSubject.subtitle}
            </p>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-700">
              <span>DNI:</span>
              <strong className="text-slate-900">{currentSubject.dni}</strong>
            </div>
          </div>

          {/* Pie del Carnet */}
          <div className="w-full pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Sistema Escolar Digital</span>
            <span className="font-mono text-[10px]">
              UUID: {currentSubject.uuid?.slice(0, 12)}...
            </span>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center text-slate-500">
          No hay carnet disponible para este perfil.
        </div>
      )}

      {/* Botones de Acción */}
      {currentSubject && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 print:hidden">
          <button
            onClick={handleDownload}
            disabled={!qrBlobUrl}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm transition-all shadow-lg shadow-sky-200 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Download size={18} /> Descargar Código QR
          </button>
          <button
            onClick={handlePrint}
            disabled={!qrBlobUrl}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Printer size={18} /> Imprimir Carnet
          </button>
        </div>
      )}

      {/* Indicación para móvil */}
      <div className="text-center text-xs text-slate-400 print:hidden">
        💡 <em>Consejo: Puedes guardar esta pantalla como captura en tu teléfono para tener siempre a mano el código QR de acceso.</em>
      </div>
    </div>
  );
};

export default MyQR;

