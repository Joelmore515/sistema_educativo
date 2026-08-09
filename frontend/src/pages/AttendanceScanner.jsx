import { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../services/api';
import { QrCode, ArrowLeft, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const AttendanceScanner = () => {
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [scanMode, setScanMode] = useState('alumnos'); // 'alumnos' o 'padres'
  const [activeMeetings, setActiveMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState('');
  const lastScanned = useRef({ uuid: null, time: 0 });

  useEffect(() => {
    if (scanMode === 'padres') {
      fetchMeetings();
    }
  }, [scanMode]);

  const fetchMeetings = async () => {
    try {
      const response = await api.get('/meetings/active');
      setActiveMeetings(response.data);
      if (response.data.length > 0) {
        setSelectedMeeting(response.data[0].id.toString());
      }
    } catch (err) {
      console.error('Error fetching meetings:', err);
    }
  };

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', {
      qrbox: { width: 250, height: 250 },
      fps: 10,
    });

    scanner.render(onScanSuccess, onScanError);

    async function onScanSuccess(decodedText) {
      const now = Date.now();
      // Si escaneamos el mismo código en menos de 5 segundos, lo ignoramos
      if (lastScanned.current.uuid === decodedText && now - lastScanned.current.time < 5000) {
        return;
      }
      
      lastScanned.current = { uuid: decodedText, time: now };
      handleAttendance(decodedText);
    }

    function onScanError(err) {
      // console.warn(err);
    }

    return () => {
      scanner.clear();
    };
  }, []);

  const handleAttendance = async (uuid) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setScanResult(null);
    setFeedbackMessage('');

    try {
      let response;
      if (scanMode === 'padres') {
        if (!selectedMeeting) {
          setError('Debe seleccionar una reunión activa primero');
          setLoading(false);
          return;
        }
        response = await api.post('/meetings/scan', { uuid, meeting_id: selectedMeeting });
      } else {
        response = await api.post('/attendance/scan', { uuid });
      }
      
      const payload = response?.data || {};
      const resultMessage = payload.message || 'Registro procesado correctamente';
      const personName = payload.student || payload.parent || 'Persona';
      const status = payload.status || 'Registrado';
      const timeText = payload.time || new Date().toLocaleTimeString();

      setScanResult({
        message: resultMessage,
        student: personName,
        status,
        time: timeText
      });
      setFeedbackMessage(resultMessage);
      setTimeout(() => {
        setScanResult(null);
        setFeedbackMessage('');
      }, 5000);
    } catch (err) {
      const message = err.response?.data?.message || 'Error al procesar el código QR';
      setError(message);
      setFeedbackMessage(message);
      setTimeout(() => {
        setError(null);
        setFeedbackMessage('');
      }, 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 flex flex-col items-center">
      <div className="w-full max-w-2xl flex justify-between items-center mb-8">
        <Link to="/dashboard" className="p-2 hover:bg-white/10 rounded-full transition-all">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold flex items-center">
          <QrCode className="mr-2 text-primary-400" />
          Escáner de Asistencia
        </h1>
        <div className="w-10"></div>
      </div>

      <div className="w-full max-w-md mb-6 flex bg-slate-800 rounded-2xl p-1 shadow-inner">
        <button
          onClick={() => setScanMode('alumnos')}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
            scanMode === 'alumnos' 
              ? 'bg-primary-500 text-white shadow-lg' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
          }`}
        >
          Alumnos (Diaria)
        </button>
        <button
          onClick={() => setScanMode('padres')}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
            scanMode === 'padres' 
              ? 'bg-primary-500 text-white shadow-lg' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
          }`}
        >
          Padres (Eventos)
        </button>
      </div>

      {scanMode === 'padres' && (
        <div className="w-full max-w-md mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">Seleccione la Reunión Activa</label>
          {activeMeetings.length === 0 ? (
            <div className="bg-amber-500/10 border border-amber-500/50 text-amber-200 p-3 rounded-xl text-sm text-center">
              No hay reuniones programadas para hoy.
            </div>
          ) : (
            <select 
              value={selectedMeeting}
              onChange={(e) => setSelectedMeeting(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500"
            >
              {activeMeetings.map(meeting => (
                <option key={meeting.id} value={meeting.id}>
                  {meeting.title} - {meeting.type !== 'OTRO' ? meeting.type : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="relative w-full max-w-md aspect-square bg-black rounded-3xl overflow-hidden border-4 border-primary-500/30 shadow-2xl shadow-primary-500/20">
        <div id="reader"></div>
        {loading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
          </div>
        )}
      </div>

      <div className="mt-8 w-full max-w-md">
        <AnimatePresence>
          {scanResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-emerald-500/10 border border-emerald-500/50 p-6 rounded-3xl flex items-start space-x-4"
            >
              <CheckCircle className="text-emerald-500 shrink-0" size={32} />
              <div>
                <h3 className="text-xl font-bold text-emerald-400">{scanResult.message}</h3>
                <p className="text-emerald-100/80">{scanResult.student}</p>
                <div className="mt-2 flex items-center text-sm text-emerald-200/60">
                  <Clock size={14} className="mr-1" />
                  {scanResult.time} - <span className="capitalize ml-1">{scanResult.status}</span>
                </div>
              </div>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-red-500/10 border border-red-500/50 p-6 rounded-3xl flex items-start space-x-4"
            >
              <XCircle className="text-red-500 shrink-0" size={32} />
              <div>
                <h3 className="text-xl font-bold text-red-400">Error</h3>
                <p className="text-red-100/80">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {!scanResult && !error && !feedbackMessage && (
          <div className="text-center text-slate-400 animate-pulse">
            <p>Coloque el código QR frente a la cámara</p>
          </div>
        )}

        {feedbackMessage && !scanResult && !error && (
          <div className="rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm text-slate-200">
            {feedbackMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceScanner;
