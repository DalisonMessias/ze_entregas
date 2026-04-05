/// <reference types="vite/client" />

export const getApiRootUrl = () => import.meta.env.VITE_API_BASE_URL || '';

export const getApiBaseUrl = () => {
    return `${getApiRootUrl()}/api/chat`;
};

export const getWebSocketUrl = () => {
    const baseUrl = getApiRootUrl();

    if (baseUrl) {
        return baseUrl.replace(/^http/, 'ws') + '/ws-chat';
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws-chat`;
};

export const getWhatsBotApiBaseUrl = () => `${getApiRootUrl()}/api/whatsbot`;
