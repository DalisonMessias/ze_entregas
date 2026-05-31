/// <reference types="vite/client" />

/**
 * Retorna a URL base do backend da API.
 *
 * Ordem de prioridade:
 * 1. Variável de ambiente VITE_API_BASE_URL (definida no Vercel ou no .env local)
 * 2. Fallback para localhost em desenvolvimento
 *
 * NUNCA deve conter IPs hardcoded (127.0.0.1) nem portas fixas (:4000).
 */
export const getApiRootUrl = (): string => {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (envUrl) {
        return envUrl.replace(/\/+$/, ''); // Remove barra final
    }
    // Fallback apenas para desenvolvimento local
    return 'http://localhost:4000';
};

/**
 * Retorna a URL base da API de chat interno.
 */
export const getApiBaseUrl = (): string => {
    return `${getApiRootUrl()}/api/chat`;
};

/**
 * Retorna a URL do WebSocket do chat interno.
 *
 * Converte automaticamente:
 * - http:// → ws://  (desenvolvimento)
 * - https:// → wss:// (produção com SSL)
 */
export const getWebSocketUrl = (): string => {
    const base = getApiRootUrl();

    // Converte protocolo HTTP → WS automaticamente
    // https:// → wss://  |  http:// → ws://
    return base.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://') + '/ws-chat';
};

/**
 * Retorna a URL base da API do WhatsBot.
 */
export const getWhatsBotApiBaseUrl = (): string => {
    return `${getApiRootUrl()}/api/whatsbot`;
};
