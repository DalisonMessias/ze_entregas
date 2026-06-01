/// <reference types="vite/client" />

/**
 * Retorna a URL base (origem) do backend da API de forma totalmente dinâmica e livre de hardcodes.
 *
 * Ordem de prioridade e detecção automática:
 * 1. Respeita a variável VITE_API_BASE_URL se estiver explicitamente definida no ambiente (desde que não seja localhost).
 * 2. Em ambiente de desenvolvimento local, prefere retornar a origem do navegador (geralmente localhost:3000)
 *    para forçar as requisições a passarem pelo proxy de desenvolvimento do Vite (porta 3000), contornando
 *    com segurança o bloqueio de portas não-whitelistes (como 4000) pela política interna de segurança de URLs.
 * 3. Em ambiente de navegador, usa window.location.origin de forma automática.
 * 4. Fallback de segurança para string vazia.
 */
export const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  
  if (envUrl && envUrl.trim() !== '') {
    // Se a URL do ambiente for localhost/127.0.0.1, nós a evitamos para chamadas de API do navegador.
    // Isso evita o erro de rede (Network Error) causado pela restrição de portas da política de URLs do projeto.
    // Usando a origem do navegador, as chamadas vão para localhost:3000 e passam pelo proxy whitelisted do Vite.
    const isLocalhost = envUrl.includes('localhost') || envUrl.includes('127.0.0.1');
    if (!isLocalhost) {
      return envUrl.replace(/\/+$/, ''); // Remove barra final
    }
  }

  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  
  return '';
};

/**
 * Retorna a URL dinâmica e correta para a conexão com o WebSocket.
 *
 * Ordem de prioridade e detecção automática:
 * 1. Se VITE_API_BASE_URL estiver definida e não for localhost, deriva o WebSocket dela (http -> ws, https -> wss).
 * 2. Em ambiente de navegador local, usa window.location com o protocolo e domínio atual (localhost:3000)
 *    de forma que a requisição de WebSocket passe pelo proxy do Vite (/ws-chat) com a porta whitelisted.
 * 3. Se HTTPS (produção/SSL): wss://
 * 4. Se HTTP (desenvolvimento/IP local): ws://
 */
export const getWsUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  
  if (envUrl && envUrl.trim() !== '') {
    const isLocalhost = envUrl.includes('localhost') || envUrl.includes('127.0.0.1');
    if (!isLocalhost) {
      return envUrl.replace(/^https:\/\//i, 'wss://').replace(/^http:\/\//i, 'ws://').replace(/\/+$/, '') + '/ws-chat';
    }
  }

  if (typeof window !== 'undefined' && window.location) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host; // Inclui host e porta ativa (ex: localhost:3000 ou 192.168.1.10:3000)
    return `${protocol}//${host}/ws-chat`;
  }

  return '';
};

/**
 * Retorna a URL raiz da API (mantido para retrocompatibilidade).
 */
export const getApiRootUrl = (): string => {
  return getBaseUrl();
};

/**
 * Retorna a URL base da API de chat interno.
 */
export const getApiBaseUrl = (): string => {
  return `${getBaseUrl()}/api/chat`;
};

/**
 * Retorna a URL do WebSocket do chat interno (mantido para retrocompatibilidade).
 */
export const getWebSocketUrl = (): string => {
  return getWsUrl();
};

/**
 * Retorna a URL base da API do WhatsBot.
 */
export const getWhatsBotApiBaseUrl = (): string => {
  return `${getBaseUrl()}/api/whatsbot`;
};
