
import React, { useState } from 'react';
import { Phone, Shield, Flame, Heart, X, AlertTriangle, ChevronRight } from 'lucide-react';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({ isOpen, onClose }) => {
  const [confirmCall, setConfirmCall] = useState<{ name: string; number: string; colorClass: string; icon: React.ReactNode } | null>(null);

  const emergencyContacts = [
    { 
      name: 'Polícia', 
      number: '190', 
      icon: <Shield className="w-8 h-8" />, 
      colorClass: 'bg-blue-600 shadow-blue-200 dark:shadow-none' 
    },
    { 
      name: 'SAMU', 
      number: '192', 
      icon: <Heart className="w-8 h-8" />, 
      colorClass: 'bg-red-600 shadow-red-200 dark:shadow-none' 
    },
    { 
      name: 'Bombeiros', 
      number: '193', 
      icon: <Flame className="w-8 h-8" />, 
      colorClass: 'bg-orange-500 shadow-orange-200 dark:shadow-none' 
    },
  ];

  const handleCall = () => {
    if (confirmCall) {
      window.location.href = `tel:${confirmCall.number}`;
      setConfirmCall(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Emergency Options Modal */}
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center p-4 z-[150] animate-in fade-in duration-300">
        <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-10 border border-gray-100 dark:border-gray-800">
          
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-500" /> Emergência
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-xs font-medium mt-1">Toque para ligar imediatamente.</p>
            </div>
            <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {emergencyContacts.map((contact) => (
              <button
                key={contact.number}
                onClick={() => setConfirmCall(contact)}
                className={`w-full flex items-center p-4 rounded-3xl text-white shadow-xl transition-transform transform active:scale-95 group ${contact.colorClass}`}
              >
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm mr-4 group-hover:scale-110 transition-transform">
                  {contact.icon}
                </div>
                <div className="text-left flex-1">
                  <div className="font-bold text-lg leading-none opacity-90">{contact.name}</div>
                  <div className="text-3xl font-black tracking-tight">{contact.number}</div>
                </div>
                <div className="bg-white/20 p-2 rounded-full">
                    <ChevronRight className="w-5 h-5 text-white" />
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 text-center">
             <button onClick={onClose} className="text-sm font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
               Cancelar
             </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmCall && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center p-6 z-[200] animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 w-full max-w-xs rounded-[32px] overflow-hidden shadow-2xl relative">
            
            {/* Header Color Block */}
            <div className={`h-32 ${confirmCall.colorClass} flex items-center justify-center relative`}>
                <div className="absolute inset-0 bg-white/10" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)', backgroundSize: '10px 10px' }}></div>
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md shadow-inner">
                    {confirmCall.icon}
                </div>
            </div>

            <div className="p-8 text-center">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Ligar {confirmCall.number}?</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 font-medium">Você está ligando para {confirmCall.name}.</p>
                
                <div className="flex flex-col gap-3">
                <button
                    onClick={handleCall}
                    className={`w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg transition-transform active:scale-95 ${confirmCall.colorClass}`}
                >
                    Confirmar
                </button>
                <button
                    onClick={() => setConfirmCall(null)}
                    className="w-full py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                    Voltar
                </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
