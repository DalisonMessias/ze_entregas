import React, { useEffect, useRef } from 'react';
import QRious from 'qrious';
import { BaseModal } from '../BaseModal';
import { QrCode as QrCodeIcon } from 'lucide-react';

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
        size: 256,
        padding: 16,
        level: 'H',
      });
    }
  }, [qrCode]);

  return (
    <BaseModal
      isOpen={true}
      onClose={onClose}
      title="Conectar ao WhatsApp"
      icon={<QrCodeIcon className="w-6 h-6 text-green-600" />}
    >
      <div className="text-center">
        <p className="text-gray-600 mb-6">Abra o WhatsApp no seu celular e escaneie o código abaixo.</p>
        <div className="flex justify-center">
          {qrCode ? (
            <canvas ref={qrCanvasRef}></canvas>
          ) : (
            <div className="w-64 h-64 bg-gray-200 flex items-center justify-center rounded-lg animate-pulse">
              <p className="text-gray-500">Gerando QR Code...</p>
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
};

export default QrCodeModal;
