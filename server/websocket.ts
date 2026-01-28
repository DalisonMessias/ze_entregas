import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket as WebSocketBase } from 'ws';
import internalChatService from './services/internalChatService.js';
import url from 'url';

// Estende a interface WebSocket padrão para incluir storeId e visitorId
interface WebSocket extends WebSocketBase {
  storeId?: string;
  visitorId?: string;
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
 * Também configura os listeners para os eventos do InternalChatService.
 * @param server O servidor HTTP no qual o WebSocket será anexado.
 */
export const initializeWebSocket = (server: HttpServer) => {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket, req) => {
    // Extract storeId and visitorId from the WebSocket connection URL
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const storeId = url.searchParams.get('storeId');
    const visitorId = url.searchParams.get('visitorId');

    // Visitantes conectam com visitorId + storeId
    // Lojas conectam apenas com storeId
    if (!storeId && !visitorId) {
      console.error('Cliente WebSocket conectado sem storeId ou visitorId. Fechando conexão.');
      ws.close(1008, 'Missing storeId or visitorId');
      return;
    }

    ws.storeId = storeId || undefined;
    ws.visitorId = visitorId || undefined;

    const clientType = visitorId ? 'Visitante' : 'Loja';
    console.log(`Novo cliente WebSocket conectado: ${clientType} (storeId: ${storeId || 'N/A'}, visitorId: ${visitorId || 'N/A'})`);

    // Envia o status atual do Chat Interno imediatamente (apenas para lojas)
    if (storeId && !visitorId) {
      const status = internalChatService.getStatus(storeId);

      const sendToWs = (type: string, payload: any) => {
        console.log(`📤 Enviando para WS (loja ${storeId}): ${type}`);
        ws.send(JSON.stringify({ type, payload }));
      };

      if (status.status === 'WAITING_QR' && (status as any).qrCode) {
        sendToWs('chat.qr', { qr: (status as any).qrCode });
      } else {
        sendToWs('chat.status', status);
      }
    }

    // Eventos de conexão (aplicam a todos os clientes)
    ws.on('close', () => {
      const identifier = visitorId || storeId;
      console.log(`Cliente WebSocket ${clientType} (${identifier}) desconectado.`);
    });

    ws.on('error', (error) => {
      const identifier = visitorId || storeId;
      console.error(`Erro no WebSocket para ${clientType} (${identifier}):`, error);
    });
  });

  // Re-transmite os eventos do InternalChatService para os clientes da loja correspondente.

  internalChatService.on('qr.update', ({ storeId, qr }) => {
    broadcastByStore(storeId, { type: 'chat.qr', payload: { qr } });
  });

  internalChatService.on('status.change', ({ storeId, status }) => {
    const statusPayload = internalChatService.getStatus(storeId);
    broadcastByStore(storeId, { type: 'chat.status', payload: statusPayload });
  });

  internalChatService.on('messages.upsert', ({ storeId, msg }) => {
    broadcastByStore(storeId, { type: 'chat.message', payload: msg });
  });

  internalChatService.on('message.status.update', ({ storeId, messageId, status }) => {
    broadcastByStore(storeId, { type: 'chat.message_status', payload: { messageId, status } });
  });

  internalChatService.on('presence.update', ({ storeId, presence }) => {
    broadcastByStore(storeId, { type: 'chat.presence', payload: presence });
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
