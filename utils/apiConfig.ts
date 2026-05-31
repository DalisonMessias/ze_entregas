/// <reference types="vite/client" />

/**
 * ============================================================
 * SISTEMA DE URL AUTOMÁTICO — Zé Entregas
 * ============================================================
 *
 * Princípio: ZERO URLs hardcoded no código.
 *
 * Como funciona:
 *
 * Em desenvolvimento (Vite dev server):
 *   - O frontend roda em http://localhost:3000
 *   - O Vite proxy redireciona /api/* e /ws-chat para o backend local (:4000)
 *   - getApiBaseUrl() retorna '/api/chat'  → proxy resolve para localhost:4000/api/chat
 *   - getWebSocketUrl() retorna 'ws://localhost:3000/ws-chat' → proxy resolve para ws://localhost:4000/ws-chat
 *
 * Em produção (qualquer domínio):
 *   - O frontend e o backend devem estar no mesmo domínio (via proxy reverso, Railway, etc.)
 *   - OU o VITE_API_BASE_URL deve ser configurado com a URL do backend externo
 *   - getWebSocketUrl() detecta automaticamente o protocolo: https → wss, http → ws
 *   - Funciona em: localhost, IP local, Vercel, domínio customizado, subdomínio, preview
 *
 * Prioridade de resolução:
 *   1. VITE_API_BASE_URL (se definido — ex: URL de backend externo no Railway)
 *   2. window.location (mesmo domínio — via proxy ou servidor unificado)
 * ============================================================
 */

/**
 * Retorna a URL raiz do backend.
 *
 * Se VITE_API_BASE_URL estiver definida, usa ela.
 * Senão, usa o mesmo domínio/porta da aplicação (via proxy Vite em dev, ou servidor unificado em prod).
 *
 * Retorna string vazia '' para usar caminhos relativos (mesmo domínio).
 */
export const getApiRootUrl = (): string => {
    // Prioridade 1: variável de ambiente explícita (backend em domínio separado)
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (envUrl && envUrl.trim()) {
        return envUrl.replace(/\/+$/, '');
    }

    // Prioridade 2: mesmo domínio (caminho relativo)
    // O Vite proxy em dev e o servidor unificado em prod resolvem automaticamente
    return '';
};

/**
 * Retorna a URL completa da API de chat.
 * Usa caminho relativo quando possível (mesmo domínio).
 */
export const getApiBaseUrl = (): string => {
    const root = getApiRootUrl();
    return `${root}/api/chat`;
};

/**
 * Gera automaticamente a URL do WebSocket com base no ambiente atual.
 *
 * Detecção automática:
 * - https:// → wss://  (produção com SSL)
 * - http://  → ws://   (desenvolvimento local)
 *
 * Usa window.location para determinar o host e protocolo corretos,
 * garantindo funcionamento em qualquer domínio sem configuração manual.
 *
 * Se VITE_API_BASE_URL estiver definida, usa o host dela (backend separado).
 * Senão, usa o host atual (window.location.host) com proxy Vite em dev.
 */
export const getWebSocketUrl = (): string => {
    const envUrl = import.meta.env.VITE_API_BASE_URL;

    if (envUrl && envUrl.trim()) {
        // Backend externo: deriva WS da URL configurada
        const cleanUrl = envUrl.replace(/\/+$/, '');
        return cleanUrl
            .replace(/^https:\/\//, 'wss://')
            .replace(/^http:\/\//, 'ws://') + '/ws-chat';
    }

    // Mesmo domínio: usa window.location para detecção automática
    // Funciona em: localhost, IP local, Vercel, domínio customizado, preview deploy, subdomínio
    if (typeof window !== 'undefined') {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host; // inclui porta se houver (ex: localhost:3000)
        return `${protocol}//${host}/ws-chat`;
    }

    // SSR fallback (não deve ocorrer em browser)
    return 'ws://localhost:3000/ws-chat';
};

/**
 * Retorna a URL base da API do WhatsBot.
 */
export const getWhatsBotApiBaseUrl = (): string => {
    const root = getApiRootUrl();
    return `${root}/api/whatsbot`;
};
