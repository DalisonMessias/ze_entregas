/// <reference types="vite/client" />

const getDevApiRootUrl = () => {
    if (!import.meta.env.DEV) return '';
    return 'http://127.0.0.1:4000';
};

export const getApiRootUrl = () => import.meta.env.VITE_API_BASE_URL || getDevApiRootUrl();

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
