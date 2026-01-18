import React, { useEffect, useRef } from 'react';
import QRious from 'qrious';
import { MoreVertical, Settings, Smartphone, QrCode as QrCodeIcon } from 'lucide-react';
// import { BaseModal } from '../BaseModal'; // Removido para criar um modal full-screen customizado ou similar

interface QrCodeModalProps {
  qrCode: string | undefined;
  onClose: () => void;
  status?: string;
}

const QrCodeModal: React.FC<QrCodeModalProps> = ({ qrCode, onClose }) => {
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (qrCanvasRef.current && qrCode) {
      new QRious({
        element: qrCanvasRef.current,
        value: qrCode,
        size: 264, // Tamanho compatível com o design
        padding: 0,
        level: 'H',
        foreground: '#111B21',
        background: '#FFFFFF',
      });
    }
  }, [qrCode]);

  // Renderização customizada para imitar a tela de login do WhatsApp Web
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-100/90 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[1000px] h-auto min-h-[70vh] flex flex-col overflow-hidden relative animate-in fade-in zoom-in-95 duration-300">

        {/* Botão de Fechar (Customizado) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors z-10"
        >
          <span className="sr-only">Fechar</span>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex flex-col md:flex-row h-full">
          {/* Esquerda: Instruções */}
          <div className="p-10 md:p-14 md:w-2/3 flex flex-col justify-center">
            <h1 className="text-[28px] font-light text-[#41525d] mb-10">
              Etapas para acessar
            </h1>

            <ol className="space-y-6 text-[18px] text-[#3b4a54] leading-tight">
              <li className="flex items-start gap-4">
                <span className="flex items-center justify-center w-6 h-6 border-2 border-[#3b4a54] rounded-full font-medium text-sm mt-0.5 shrink-0">1</span>
                <div>
                  Abra o WhatsApp <span className="inline-flex items-center justify-center"><Smartphone size={16} className="mx-1 text-green-500" /></span> no seu celular.
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="flex items-center justify-center w-6 h-6 border-2 border-[#3b4a54] rounded-full font-medium text-sm mt-0.5 shrink-0">2</span>
                <div>
                  Toque em <strong>Mais opções</strong> <span className="inline-flex items-center justify-center bg-gray-100 rounded px-1 py-0.5 align-middle mx-1"><MoreVertical size={14} className="text-gray-600" /></span> no Android ou em <br />
                  <strong>Configurações</strong> <span className="inline-flex items-center justify-center bg-gray-100 rounded px-1 py-0.5 align-middle mx-1"><Settings size={14} className="text-gray-600" /></span> no iPhone.
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="flex items-center justify-center w-6 h-6 border-2 border-[#3b4a54] rounded-full font-medium text-sm mt-0.5 shrink-0">3</span>
                <div>
                  Toque em <strong>Dispositivos conectados</strong> e, em seguida, em <br /><strong>Conectar dispositivo</strong>.
                </div>
              </li>
              <li className="flex items-start gap-4">
                <span className="flex items-center justify-center w-6 h-6 border-2 border-[#3b4a54] rounded-full font-medium text-sm mt-0.5 shrink-0">4</span>
                <div>
                  Escaneie o QR code para confirmar
                </div>
              </li>
            </ol>

          </div>

          {/* Direita: QR Code */}
          <div className="md:w-1/3 flex flex-col items-center justify-center p-10 md:border-l border-gray-100">
            <div className="relative">
              {qrCode ? (
                <>
                  <canvas
                    ref={qrCanvasRef}
                    className="border-4 border-white shadow-sm"
                    style={{ imageRendering: 'pixelated' }}
                  ></canvas>
                </>
              ) : (
                <div className="w-[264px] h-[264px] bg-gray-100 flex flex-col items-center justify-center rounded-lg animate-pulse text-gray-400">
                  <QrCodeIcon size={48} className="mb-4 opacity-20" />
                  <span className="text-sm">Aguardando QR Code...</span>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default QrCodeModal;
