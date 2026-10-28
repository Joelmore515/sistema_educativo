import { useEffect, useState } from 'react';
import { Download, Loader2, Printer, QrCode, X } from 'lucide-react';
import api from '../services/api';

const ACCENTS = {
  emerald: {
    button: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200',
    icon: 'text-emerald-600'
  },
  blue: {
    button: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200',
    icon: 'text-blue-600'
  }
};

const QrModal = ({ show, onClose, uuid, name, accent = 'emerald' }) => {
  const [objectUrl, setObjectUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!show || !uuid) return undefined;

    let active = true;
    let currentUrl = '';

    const loadQr = async () => {
      setLoading(true);
      setError('');
      setObjectUrl('');

      try {
        const response = await api.get(`/qr/${uuid}`, { responseType: 'blob' });
        if (!active) return;
        currentUrl = URL.createObjectURL(response.data);
        setObjectUrl(currentUrl);
      } catch {
        if (active) {
          setError('No se pudo cargar el código QR');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadQr();

    return () => {
      active = false;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [show, uuid]);

  if (!show) return null;

  const accentClasses = ACCENTS[accent] || ACCENTS.emerald;
  const safeName = (name || 'codigo').replace(/\s+/g, '_');

  const handleDownload = () => {
    if (!objectUrl) return;
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `QR_${safeName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    if (!objectUrl) return;
    const printWindow = window.open(objectUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl animate-in zoom-in duration-300 overflow-hidden flex flex-col items-center p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-all text-slate-500"
          aria-label="Cerrar"
        >
          <X size={20} />
        </button>
        <h3 className="text-lg font-bold text-slate-900 mb-1 text-center mt-2">Código QR</h3>
        <p className="text-sm text-slate-500 mb-6 text-center">{name}</p>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-8 flex justify-center items-center w-full min-h-[224px]">
          {loading ? (
            <Loader2 className="animate-spin text-slate-400" size={32} />
          ) : error ? (
            <p className="text-sm text-red-500 text-center">{error}</p>
          ) : (
            <img
              src={objectUrl}
              alt={`QR ${name}`}
              className="w-48 h-48 object-contain"
            />
          )}
        </div>

        <div className="flex flex-col sm:flex-row w-full gap-3">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!objectUrl}
            className={`flex-1 flex justify-center items-center py-3 text-white font-bold rounded-xl transition-all shadow-lg disabled:opacity-50 ${accentClasses.button}`}
          >
            <Download size={18} className="mr-2" />
            Descargar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={!objectUrl}
            className="flex justify-center items-center p-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all disabled:opacity-50"
            aria-label="Imprimir"
          >
            <Printer size={18} />
          </button>
        </div>

        <p className="mt-4 text-xs text-slate-400 flex items-center gap-1">
          <QrCode size={12} className={accentClasses.icon} />
          Imagen protegida: requiere sesión activa
        </p>
      </div>
    </div>
  );
};

export default QrModal;
