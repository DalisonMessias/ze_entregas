import { useState, useEffect, useRef, useCallback } from 'react';
import { ChatStatus, WebSocketMessagePayload, ChatMessage } from './types';
import { getWebSocketUrl } from '../../utils/apiConfig';

// Configurações de reconexão com backoff exponencial
const INITIAL_RETRY_DELAY_MS = 2000;   // 2 segundos na 1ª tentativa
const MAX_RETRY_DELAY_MS = 30000;       // Máximo de 30 segundos entre tentativas
const MAX_RETRY_ATTEMPTS = 10;          // Desiste após 10 tentativas sem sucesso
const CONNECTION_TIMEOUT_MS = 10000;    // 10 segundos para estabelecer conexão
const HEARTBEAT_INTERVAL_MS = 25000;    // Ping a cada 25 segundos para manter vivo

export const useChatWebSocket = (storeId: string) => {
  const [status, setStatus] = useState<ChatStatus>({ status: 'CONNECTING' });
  const [lastMessage, setLastMessage] = useState<ChatMessage | null>(null);
  const [lastStatusUpdate, setLastStatusUpdate] = useState<{ messageId: string, status: string } | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);
  const isConnecting = useRef(false);

  const clearTimers = useCallback(() => {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    if (connectionTimer.current) {
      clearTimeout(connectionTimer.current);
      connectionTimer.current = null;
    }
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    clearTimers();
    if (ws.current) {
      // Remove listeners antes de fechar para evitar reconexão automática no onclose
      ws.current.onopen = null;
      ws.current.onclose = null;
      ws.current.onerror = null;
      ws.current.onmessage = null;
      if (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING) {
        ws.current.close(1000, 'Componente desmontado');
      }
      ws.current = null;
    }
    isConnecting.current = false;
  }, [clearTimers]);

  const scheduleReconnect = useCallback(() => {
    if (!isMounted.current) return;

    if (retryCount.current >= MAX_RETRY_ATTEMPTS) {
      console.warn(`[WebSocket] Limite de ${MAX_RETRY_ATTEMPTS} tentativas atingido. Desistindo.`);
      if (isMounted.current) setStatus({ status: 'DISCONNECTED' });
      return;
    }

    // Backoff exponencial: 2s, 4s, 8s, 16s... até 30s
    const delay = Math.min(
      INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount.current),
      MAX_RETRY_DELAY_MS
    );

    console.log(`[WebSocket] Reconectando em ${delay / 1000}s (tentativa ${retryCount.current + 1}/${MAX_RETRY_ATTEMPTS})...`);
    retryCount.current += 1;

    retryTimer.current = setTimeout(() => {
      if (isMounted.current) connect();
    }, delay);
  }, []);

  const connect = useCallback(() => {
    if (!isMounted.current || isConnecting.current) return;
    if (!storeId) return;

    // Verifica se WebSocket é suportado pelo navegador
    if (typeof WebSocket === 'undefined') {
      console.error('[WebSocket] WebSocket não é suportado neste ambiente.');
      setStatus({ status: 'DISCONNECTED' });
      return;
    }

    // Fecha conexão anterior se existir
    if (ws.current) {
      ws.current.onopen = null;
      ws.current.onclose = null;
      ws.current.onerror = null;
      ws.current.onmessage = null;
      if (ws.current.readyState !== WebSocket.CLOSED) {
        ws.current.close();
      }
      ws.current = null;
    }

    clearTimers();
    isConnecting.current = true;

    // Obtém URL em call-time (não em module-time) para garantir que VITE_API_BASE_URL esteja disponível
    const wsBaseUrl = getWebSocketUrl();
    const urlWithStore = `${wsBaseUrl}?storeId=${storeId}`;

    let socket: WebSocket;
    try {
      socket = new WebSocket(urlWithStore);
    } catch (err) {
      console.error('[WebSocket] Erro ao criar conexão:', err);
      isConnecting.current = false;
      if (isMounted.current) {
        setStatus({ status: 'DISCONNECTED' });
        scheduleReconnect();
      }
      return;
    }

    ws.current = socket;

    // Timeout de conexão — se não conectar em X segundos, força reconexão
    connectionTimer.current = setTimeout(() => {
      if (socket.readyState !== WebSocket.OPEN) {
        console.warn('[WebSocket] Timeout de conexão. Forçando reconexão...');
        socket.close();
        isConnecting.current = false;
        if (isMounted.current) {
          setStatus({ status: 'DISCONNECTED' });
          scheduleReconnect();
        }
      }
    }, CONNECTION_TIMEOUT_MS);

    socket.onopen = () => {
      if (!isMounted.current) {
        socket.close();
        return;
      }

      clearTimeout(connectionTimer.current!);
      connectionTimer.current = null;
      isConnecting.current = false;
      retryCount.current = 0; // Reseta contador de retentativas ao conectar

      // Inicia heartbeat para manter a conexão ativa (evita timeout de proxy/servidor)
      heartbeatTimer.current = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping' }));
        }
      }, HEARTBEAT_INTERVAL_MS);
    };

    socket.onclose = (event) => {
      clearTimers();
      isConnecting.current = false;

      if (!isMounted.current) return;

      // Código 1000 = fechamento normal (componente desmontado), não reconectar
      if (event.code !== 1000) {
        setStatus({ status: 'DISCONNECTED' });
        scheduleReconnect();
      }
    };

    socket.onerror = () => {
      // O evento onclose será disparado logo após, que cuidará da reconexão
      isConnecting.current = false;
    };

    socket.onmessage = (event) => {
      if (!isMounted.current) return;

      try {
        const data: WebSocketMessagePayload = JSON.parse(event.data);

        switch (data.type) {
          case 'chat.status':
            setStatus(data.payload as ChatStatus);
            break;
          case 'chat.qr':
            setStatus({ status: 'WAITING_QR', qrCode: data.payload.qr });
            break;
          case 'chat.message':
            setLastMessage(data.payload as ChatMessage);
            break;
          case 'chat.message_status':
            setLastStatusUpdate(data.payload as { messageId: string, status: string });
            break;
          case 'pong':
            // Resposta do servidor ao nosso ping — conexão está viva
            break;
          default:
            break;
        }
      } catch (error) {
        console.error('[WebSocket] Erro ao processar mensagem:', error);
      }
    };
  }, [storeId, clearTimers, scheduleReconnect]);

  useEffect(() => {
    isMounted.current = true;
    retryCount.current = 0;

    if (storeId) {
      connect();
    }

    return () => {
      isMounted.current = false;
      disconnect();
    };
  }, [storeId]);

  return { status, setStatus, lastMessage, lastStatusUpdate };
};
