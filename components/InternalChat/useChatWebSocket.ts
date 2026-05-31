import { useState, useEffect, useRef } from 'react';
import { ChatStatus, WebSocketMessagePayload, ChatMessage } from './types';
import { getWebSocketUrl } from '../../utils/apiConfig';

// ─── Constantes de reconexão ─────────────────────────────────────────────────
const INITIAL_RETRY_DELAY_MS = 1500;  // 1,5s na 1ª tentativa
const MAX_RETRY_DELAY_MS = 30000;     // Máximo 30s entre tentativas
const MAX_RETRY_ATTEMPTS = 12;        // Para depois de 12 tentativas sem sucesso
const CONNECTION_TIMEOUT_MS = 10000; // 10s para estabelecer a conexão
const HEARTBEAT_INTERVAL_MS = 20000; // Ping a cada 20s (mantém vivo em prod)

// Calcula delay com backoff exponencial com jitter para evitar thundering herd
const calcRetryDelay = (attempt: number): number => {
    const base = Math.min(INITIAL_RETRY_DELAY_MS * Math.pow(1.8, attempt), MAX_RETRY_DELAY_MS);
    const jitter = base * 0.2 * Math.random(); // ±20% aleatório
    return Math.floor(base + jitter);
};

export const useChatWebSocket = (storeId: string) => {
    const [status, setStatus] = useState<ChatStatus>({ status: 'CONNECTING' });
    const [lastMessage, setLastMessage] = useState<ChatMessage | null>(null);
    const [lastStatusUpdate, setLastStatusUpdate] = useState<{ messageId: string; status: string } | null>(null);

    // ─── Refs de controle (não causam re-render) ─────────────────────────────
    const wsRef = useRef<WebSocket | null>(null);
    const retryCountRef = useRef(0);
    const isMountedRef = useRef(true);

    // Timers via ref para cleanup garantido
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const connectionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ─── Cleanup de todos os timers ──────────────────────────────────────────
    const clearAllTimers = () => {
        if (retryTimerRef.current) { clearTimeout(retryTimerRef.current); retryTimerRef.current = null; }
        if (connectionTimerRef.current) { clearTimeout(connectionTimerRef.current); connectionTimerRef.current = null; }
        if (heartbeatTimerRef.current) { clearInterval(heartbeatTimerRef.current); heartbeatTimerRef.current = null; }
    };

    // ─── Desconecta sem disparar reconexão ───────────────────────────────────
    const silentClose = (socket: WebSocket) => {
        socket.onopen = null;
        socket.onclose = null;
        socket.onerror = null;
        socket.onmessage = null;
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
            socket.close(1000, 'Componente desmontado');
        }
    };

    useEffect(() => {
        if (!storeId) return;

        isMountedRef.current = true;
        retryCountRef.current = 0;

        // ── Função de conexão (definida dentro do effect para acesso ao escopo) ──
        const connect = () => {
            if (!isMountedRef.current) return;

            // Fecha conexão anterior sem disparar onclose
            if (wsRef.current) {
                silentClose(wsRef.current);
                wsRef.current = null;
            }

            clearAllTimers();

            // URL gerada em call-time a partir do domínio atual (window.location)
            const wsUrl = `${getWebSocketUrl()}?storeId=${storeId}`;
            const attempt = retryCountRef.current;

            console.log(`[WebSocket] Iniciando conexão (tentativa ${attempt + 1})...`);
            console.log(`[WebSocket] URL: ${wsUrl}`);

            let socket: WebSocket;
            try {
                socket = new WebSocket(wsUrl);
            } catch (err) {
                console.error('[WebSocket] Falha ao criar conexão:', err);
                scheduleRetry();
                return;
            }

            wsRef.current = socket;

            // Timeout de conexão: se não conectar em X segundos, força retry
            connectionTimerRef.current = setTimeout(() => {
                if (socket.readyState !== WebSocket.OPEN) {
                    console.warn(`[WebSocket] ⏱️ Timeout de ${CONNECTION_TIMEOUT_MS / 1000}s — reconectando...`);
                    silentClose(socket);
                    if (wsRef.current === socket) wsRef.current = null;
                    scheduleRetry();
                }
            }, CONNECTION_TIMEOUT_MS);

            socket.onopen = () => {
                if (!isMountedRef.current || wsRef.current !== socket) {
                    silentClose(socket);
                    return;
                }

                clearTimeout(connectionTimerRef.current!);
                connectionTimerRef.current = null;
                retryCountRef.current = 0; // Reseta contador ao conectar com sucesso

                console.log(`[WebSocket] ✅ Conectado! (${wsUrl.split('?')[0]})`);

                // Heartbeat: envia ping periódico para manter a conexão ativa
                // Evita que proxies/balanceadores matem conexões ociosas
                heartbeatTimerRef.current = setInterval(() => {
                    if (socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({ type: 'ping' }));
                    }
                }, HEARTBEAT_INTERVAL_MS);
            };

            socket.onclose = (event) => {
                if (!isMountedRef.current) return;
                if (wsRef.current !== socket) return; // Ignorar fechamento de socket antigo

                clearAllTimers();
                wsRef.current = null;

                // Código 1000 = fechamento limpo (desmontagem) — não reconectar
                if (event.code === 1000) {
                    console.log('[WebSocket] 🔴 Conexão encerrada normalmente.');
                    return;
                }

                const reason = event.reason || `código ${event.code}`;
                console.warn(`[WebSocket] 🔌 Desconectado (${reason}) — agendando reconexão...`);

                if (isMountedRef.current) {
                    setStatus({ status: 'DISCONNECTED' });
                    scheduleRetry();
                }
            };

            socket.onerror = (event) => {
                // O navegador não expõe detalhes do erro de WS por segurança
                // O evento onclose será disparado em seguida e cuidará da reconexão
                if (wsRef.current === socket) {
                    console.error('[WebSocket] ❌ Erro de conexão. Aguardando onclose para reconectar...');
                }
            };

            socket.onmessage = (event) => {
                if (!isMountedRef.current) return;

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
                            setLastStatusUpdate(data.payload as { messageId: string; status: string });
                            break;
                        case 'pong':
                            // Resposta ao heartbeat — conexão confirmada como ativa
                            break;
                        default:
                            break;
                    }
                } catch (err) {
                    console.error('[WebSocket] Erro ao processar mensagem:', err);
                }
            };
        };

        // ── Agenda retry com backoff exponencial ─────────────────────────────
        const scheduleRetry = () => {
            if (!isMountedRef.current) return;

            retryCountRef.current += 1;

            if (retryCountRef.current > MAX_RETRY_ATTEMPTS) {
                console.error(`[WebSocket] 🚫 Limite de ${MAX_RETRY_ATTEMPTS} tentativas atingido. Desistindo.`);
                if (isMountedRef.current) setStatus({ status: 'DISCONNECTED' });
                return;
            }

            const delay = calcRetryDelay(retryCountRef.current - 1);
            console.log(`[WebSocket] 🔁 Reconectando em ${(delay / 1000).toFixed(1)}s (tentativa ${retryCountRef.current}/${MAX_RETRY_ATTEMPTS})...`);

            retryTimerRef.current = setTimeout(() => {
                if (isMountedRef.current) connect();
            }, delay);
        };

        // ── Inicia conexão ───────────────────────────────────────────────────
        connect();

        // ── Cleanup ao desmontar o componente ────────────────────────────────
        return () => {
            console.log('[WebSocket] 🔄 Componente desmontado — encerrando conexão.');
            isMountedRef.current = false;
            clearAllTimers();
            if (wsRef.current) {
                silentClose(wsRef.current);
                wsRef.current = null;
            }
        };
    }, [storeId]); // Reconecta se o storeId mudar

    return { status, setStatus, lastMessage, lastStatusUpdate };
};
