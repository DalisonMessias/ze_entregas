import { useState, useEffect, useRef } from 'react';
import { WAMessage } from '@whiskeysockets/baileys';
import { WhatsappStatus, WebSocketMessagePayload } from './types';
import { getWebSocketUrl } from '../../utils/apiConfig';

const WEBSOCKET_URL = getWebSocketUrl();

export const useWhatsappWebSocket = (storeId: string) => {
  const [status, setStatus] = useState<WhatsappStatus>({ status: 'CONNECTING' });
  const [lastMessage, setLastMessage] = useState<WAMessage | null>(null);
  const [lastStatusUpdate, setLastStatusUpdate] = useState<{ messageId: string, status: string } | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const connect = () => {
      const urlWithStore = `${WEBSOCKET_URL}?storeId=${storeId}`;
      // console.log(`Tentando conectar ao WebSocket da loja ${storeId}...`);
      ws.current = new WebSocket(urlWithStore);

      const connectionTimeout = setTimeout(() => {
        setStatus(current => {
          if (current.status === 'CONNECTING') {
            console.log('⏱️ Timeout de conexão (Top Level): Forçando status DISCONNECTED');
            return { status: 'DISCONNECTED' };
          }
          return current;
        });
      }, 5000);

      ws.current.onopen = () => {
        // console.log('WebSocket Conectado.');
        clearTimeout(connectionTimeout);
      };

      ws.current.onclose = () => {
        // console.log('WebSocket Desconectado. Tentando reconectar em 3 segundos...');
        setStatus({ status: 'DISCONNECTED' });
        setTimeout(connect, 3000); // Tenta reconectar
      };

      ws.current.onerror = (err) => {
        // Silenciando erro do WebSocket para não poluir o console do usuário
        // console.error('Erro no WebSocket:', err);
        ws.current?.close();
      };

      ws.current.onmessage = (event) => {
        try {
          const data: WebSocketMessagePayload = JSON.parse(event.data);

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
            case 'whatsapp.message_status':
              setLastStatusUpdate(data.payload as { messageId: string, status: string });
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

  return { status, setStatus, lastMessage, lastStatusUpdate };
};
