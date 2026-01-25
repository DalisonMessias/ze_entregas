/// <reference types="vite/client" />

export const getApiBaseUrl = () => {
    // Se definirmos VITE_API_BASE_URL no .env, usamos ela (ex: https://meu-backend.com)
    // Caso contrário, usamos '/api/chat' para cair no Proxy local do Vite
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    return `${baseUrl}/api/chat`;
};

export const getWebSocketUrl = () => {
    // Se houver uma URL base definida, precisamos converter para WS/WSS
    const baseUrl = import.meta.env.VITE_API_BASE_URL;

    if (baseUrl) {
        // Substitui http por ws e https por wss
        return baseUrl.replace(/^http/, 'ws') + '/ws-chat';
    }

    // Fallback para localhost (proxy Vite)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws-chat`;
};
