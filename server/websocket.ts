import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';
import whatsappService from './services/whatsappService.js';

let wss: WebSocketServer;

/**
 * Define a estrutura padrão para mensagens trocadas via WebSocket.
 */
export interface WebSocketMessage {
  type: string;
  payload: any;
}

/**
 * Inicializa o servidor WebSocket e o anexa a um servidor HTTP existente.
 * Também configura os listeners para os eventos do WhatsappService.
 * @param server O servidor HTTP no qual o WebSocket será anexado.
 */
export const initializeWebSocket = (server: HttpServer) => {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Novo cliente WebSocket conectado.');

    // Envia o status atual da conexão do WhatsApp imediatamente após a conexão do cliente.
    const status = whatsappService.getStatus();

    const sendToWs = (type: string, payload: any) => {
      console.log(`📤 Enviando para WS: ${type}`);
      ws.send(JSON.stringify({ type, payload }));
    };

    if (status.status === 'WAITING_QR' && status.qrCode) {
      sendToWs('whatsapp.qr', { qr: status.qrCode });
    } else {
      sendToWs('whatsapp.status', status);
    }

    ws.on('close', () => {
      console.log('Cliente WebSocket desconectado.');
    });

    ws.on('error', (error) => {
      console.error('Erro no WebSocket:', error);
    });
  });

  // Re-transmite os eventos do WhatsappService para todos os clientes conectados.

  whatsappService.on('qr.update', (qr) => {
    broadcast({ type: 'whatsapp.qr', payload: { qr } });
  });

  whatsappService.on('status.change', (status) => {
    const statusPayload = whatsappService.getStatus();
    broadcast({ type: 'whatsapp.status', payload: statusPayload });
  });

  whatsappService.on('messages.upsert', (message) => {
    broadcast({ type: 'whatsapp.message', payload: message });
  });

  console.log('Servidor WebSocket inicializado e anexado ao servidor HTTP.');
};

/**
 * Envia uma mensagem para todos os clientes WebSocket conectados.
 * @param message O objeto da mensagem a ser enviada.
 */
export const broadcast = (message: WebSocketMessage) => {
  if (!wss) {
    console.error('O WebSocket Server ainda não foi inicializado.');
    return;
  }

  const jsonMessage = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(jsonMessage);
    }
  });
};
