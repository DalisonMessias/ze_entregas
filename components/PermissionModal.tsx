import React, { useEffect, useState } from 'react';
import { MapPin, Mic, Bell, CheckCircle, AlertTriangle, Settings, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PermissionModalProps {
  onClose: () => void;
}

type PermissionStatusState = 'granted' | 'denied' | 'prompt' | 'unknown';

export const PermissionModal: React.FC<PermissionModalProps> = ({ onClose }) => {
  const [geoStatus, setGeoStatus] = useState<PermissionStatusState>('unknown');
  const [micStatus, setMicStatus] = useState<PermissionStatusState>('unknown');
  const [notifStatus, setNotifStatus] = useState<PermissionStatusState>('unknown');

  // Check initial statuses
  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    // 1. Geolocation Check
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const geo = await navigator.permissions.query({ name: 'geolocation' });
        setGeoStatus(geo.state as PermissionStatusState);
        geo.onchange = () => setGeoStatus(geo.state as PermissionStatusState);
      } catch (e) {
        setGeoStatus('prompt'); // Fallback
      }
    } else {
      setGeoStatus('prompt');
    }

    // 2. Microphone Check
    if (navigator.permissions && navigator.permissions.query) {
      try {
        // @ts-ignore - microphone name type issue in some TS versions
        const mic = await navigator.permissions.query({ name: 'microphone' });
        setMicStatus(mic.state as PermissionStatusState);
        mic.onchange = () => setMicStatus(mic.state as PermissionStatusState);
      } catch (e) {
        setMicStatus('prompt');
      }
    } else {
       setMicStatus('prompt');
    }

    // 3. Notification Check
    if ('Notification' in window) {
      if (Notification.permission === 'granted') setNotifStatus('granted');
      else if (Notification.permission === 'denied') setNotifStatus('denied');
      else setNotifStatus('prompt');
    } else {
      setNotifStatus('denied'); // Not supported
    }
  };

  const requestGeo = () => {
    navigator.geolocation.getCurrentPosition(
      () => setGeoStatus('granted'),
      (err) => setGeoStatus('denied')
    );
  };

  const requestMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStatus('granted');
      // Stop immediately, we just wanted permission
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      setMicStatus('denied');
    }
  };

  const requestNotif = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotifStatus(permission === 'granted' ? 'granted' : 'denied');
  };

  const allGranted = geoStatus === 'granted' && micStatus === 'granted'; // Notifications are optional/bonus
  
  // Helper to render row
  const renderRow = (
    icon: React.ReactNode, 
    title: string, 
    desc: string, 
    status: PermissionStatusState, 
    action: () => void
  ) => {
    const isGranted = status === 'granted';
    const isDenied = status === 'denied';

    return (
      <div className={`flex items-center justify-between p-4 rounded-xl border mb-3 transition-colors ${isGranted ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${isGranted ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-600 dark:text-gray-300'}`}>
            {icon}
          </div>
          <div>
            <div className="font-bold text-gray-900 dark:text-white text-sm">{title}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 max-w-[150px] sm:max-w-xs leading-tight">{desc}</div>
          </div>
        </div>
        
        <div>
           {isGranted ? (
             <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-bold text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded-lg shadow-sm">
                <CheckCircle className="w-4 h-4" /> OK
             </div>
           ) : isDenied ? (
             <button onClick={() => alert('Esta permissão foi bloqueada. Por favor, acesse as configurações do seu navegador (ícone de cadeado na barra de endereço) e clique em "Redefinir permissões".')} className="flex items-center gap-1 text-red-500 font-bold text-xs bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg border border-red-100 dark:border-red-800">
                <Settings className="w-3 h-3" /> Ajustes
             </button>
           ) : (
             <button onClick={action} className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-sm flex items-center gap-1 animate-pulse">
                Ativar <ChevronRight className="w-3 h-3" />
             </button>
           )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-[200] animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">
        <div className="text-center mb-6">
           <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-brand-600" />
           </div>
           <h2 className="text-2xl font-black text-gray-900 dark:text-white">Acesso Necessário</h2>
           <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
             Para que o Zé Entregas funcione corretamente (mapa, voz e alertas), precisamos das seguintes permissões:
           </p>
        </div>

        <div className="space-y-1">
          {renderRow(
            <MapPin className="w-5 h-5" />, 
            "Localização", 
            "Para mostrar onde você está no mapa e calcular rotas.", 
            geoStatus, 
            requestGeo
          )}
          {renderRow(
            <Mic className="w-5 h-5" />, 
            "Microfone", 
            "Para pesquisar endereços falando.", 
            micStatus, 
            requestMic
          )}
          {renderRow(
            <Bell className="w-5 h-5" />, 
            "Notificações", 
            "Para lembretes diários de registro.", 
            notifStatus, 
            requestNotif
          )}
        </div>

        <div className="mt-6">
           <Button fullWidth onClick={onClose} variant={allGranted ? 'success' : 'outline'}>
             {allGranted ? 'Tudo Pronto! Continuar' : 'Continuar Mesmo Assim'}
           </Button>
           {!allGranted && (
             <p className="text-center text-[10px] text-gray-400 mt-3">
               * Sem essas permissões, algumas funções não funcionarão.
             </p>
           )}
        </div>
      </div>
    </div>
  );
};