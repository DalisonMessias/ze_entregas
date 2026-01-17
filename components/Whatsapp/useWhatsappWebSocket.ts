import { useState, useEffect, useRef } from 'react';
import { WAMessage } from '@whiskeysockets/baileys';
import { WhatsappStatus, WebSocketMessagePayload } from './types';
import { getWebSocketUrl } from '../../utils/apiConfig';

const WEBSOCKET_URL = getWebSocketUrl();

export const useWhatsappWebSocket = () => {
  const [status, setStatus] = useState<WhatsappStatus>({ status: 'CONNECTING' });
  const [lastMessage, setLastMessage] = useState<WAMessage | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const connect = () => {
      console.log('Tentando conectar ao WebSocket...');
      ws.current = new WebSocket(WEBSOCKET_URL);

      ws.current.onopen = () => {
        console.log('WebSocket Conectado.');
        // O status inicial é enviado pelo servidor no momento da conexão
      };

      ws.current.onclose = () => {
        console.log('WebSocket Desconectado. Tentando reconectar em 3 segundos...');
        setStatus({ status: 'DISCONNECTED' });
        setTimeout(connect, 3000); // Tenta reconectar
      };

      ws.current.onerror = (err) => {
        console.error('Erro no WebSocket:', err);
        ws.current?.close();
      };

      ws.current.onmessage = (event) => {
        try {
          const data: WebSocketMessagePayload = JSON.parse(event.data);
          console.log('📱 WebSocket Msg recebida:', data);

          switch (data.type) {
            case 'whatsapp.status':
              setStatus(data.payload as WhatsappStatus);
              break;
            case 'whatsapp.qr':
              setStatus({ status: 'WAITING_QR', qrCode: data.payload.qr });
              break;
            case 'whatsapp.message':
              setLastMessage(data.payload as WAMessage);
              break;
            default:
              break;
          }
        } catch (error) {
          console.error('Erro ao processar mensagem do WebSocket:', error);
        }
      };
    };

    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  return { status, lastMessage };
};
