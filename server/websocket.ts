import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket as WebSocketBase } from 'ws';
import whatsappService from './services/whatsappService.js';
import url from 'url';

// Estende a interface WebSocket padrão para incluir storeId
interface WebSocket extends WebSocketBase {
  storeId?: string;
}

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

  wss.on('connection', (ws: WebSocket, req) => {
    // Extract storeId from the WebSocket connection URL
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const storeId = url.searchParams.get('storeId');

    if (!storeId) {
      console.error('Cliente WebSocket conectado sem storeId. Fechando conexão.');
      ws.close(1008, 'Missing storeId');
      return;
    }

    ws.storeId = storeId;
    console.log(`Novo cliente WebSocket conectado para a loja: ${storeId}`);

    // Envia o status atual da conexão do WhatsApp imediatamente após a conexão do cliente.
    const status = whatsappService.getStatus(storeId);

    const sendToWs = (type: string, payload: any) => {
      console.log(`📤 Enviando para WS (loja ${storeId}): ${type}`);
      ws.send(JSON.stringify({ type, payload }));
    };

    if (status.status === 'WAITING_QR' && status.qrCode) {
      sendToWs('whatsapp.qr', { qr: status.qrCode });
    } else {
      sendToWs('whatsapp.status', status);
    }

    ws.on('close', () => {
      console.log(`Cliente WebSocket da loja ${storeId} desconectado.`);
    });

    ws.on('error', (error) => {
      console.error(`Erro no WebSocket para loja ${storeId}:`, error);
    });
  });

  // Re-transmite os eventos do WhatsappService para os clientes da loja correspondente.

  whatsappService.on('qr.update', ({ storeId, qr }) => {
    broadcastByStore(storeId, { type: 'whatsapp.qr', payload: { qr } });
  });

  whatsappService.on('status.change', ({ storeId, status }) => {
    // Aqui status já é o novo status, mas se quisermos pegar o objeto completo (incluindo qrCode se houver):
    const statusPayload = whatsappService.getStatus(storeId);
    broadcastByStore(storeId, { type: 'whatsapp.status', payload: statusPayload });
  });

  whatsappService.on('messages.upsert', ({ storeId, msg }) => {
    broadcastByStore(storeId, { type: 'whatsapp.message', payload: msg });
  });

  whatsappService.on('message.status.update', ({ storeId, messageId, status }) => {
    broadcastByStore(storeId, { type: 'whatsapp.message_status', payload: { messageId, status } });
  });

  console.log('Servidor WebSocket inicializado e anexado ao servidor HTTP.');
};

export const broadcastByStore = (storeId: string, message: any) => {
  if (!wss) return;
  const jsonMessage = JSON.stringify(message);
  wss.clients.forEach((client: any) => {
    if (client.readyState === WebSocketBase.OPEN && client.storeId === storeId) {
      client.send(jsonMessage);
    }
  });
};

/**
 * Envia uma mensagem para todos os clientes WebSocket conectados (Global).
 * @param message O objeto da mensagem a ser enviada.
 */
export const broadcast = (message: any) => {
  if (!wss) {
    console.error('O WebSocket Server ainda não foi inicializado.');
    return;
  }

  const jsonMessage = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocketBase.OPEN) {
      client.send(jsonMessage);
    }
  });
};
