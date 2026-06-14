/// <reference types="vite/client" />

/**
 * Sistema de URL dinâmico e unificado — Zé Entregas
 *
 * MODO PRODUÇÃO (servidor unificado):
 *   Frontend e backend rodam no MESMO servidor/porta.
 *   Todas as chamadas são relativas (sem domínio) — ex: /api/chat
 *   Não é necessária nenhuma variável de ambiente de URL.
 *
 * MODO DESENVOLVIMENTO (Vite + Express separados):
 *   Vite roda na porta 3000, Express na porta 4000.
 *   O Vite tem proxy configurado: /api/* → localhost:4000
 *   As chamadas vão para window.location.origin (porta 3000)
 *   e o proxy redireciona automaticamente para o backend.
 *
 * Em ambos os casos, o código do frontend não precisa saber
 * o endereço do backend — tudo funciona de forma transparente.
 */

/**
 * Retorna a URL base do backend.
 * - Em produção unificada: '' (string vazia = mesmo servidor, URLs relativas)
 * - Em desenvolvimento: window.location.origin (passa pelo proxy do Vite)
 * - Se VITE_API_BASE_URL estiver definida com URL remota: usa ela (deploy externo)
 */
export const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;

  // Se houver uma URL explícita de backend externo (não localhost), usa ela
  if (envUrl && envUrl.trim() !== '') {
    const isLocalhost = envUrl.includes('localhost') || envUrl.includes('127.0.0.1');
    if (!isLocalhost) {
      return envUrl.replace(/\/+$/, '');
    }
  }

  // Em desenvolvimento local: usa a origem do browser para passar pelo proxy do Vite
  // Em produção unificada: window.location.origin é o mesmo servidor do backend
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }

  return '';
};

/**
 * Retorna a URL para conexão WebSocket.
 * - Em produção unificada: mesmo host do site, protocolo ws:// ou wss://
 * - Em desenvolvimento: passa pelo proxy do Vite (/ws-chat)
 */
export const getWsUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;

  // URL externa explícita
  if (envUrl && envUrl.trim() !== '') {
    const isLocalhost = envUrl.includes('localhost') || envUrl.includes('127.0.0.1');
    if (!isLocalhost) {
      return envUrl
        .replace(/^https:\/\//i, 'wss://')
        .replace(/^http:\/\//i, 'ws://')
        .replace(/\/+$/, '') + '/ws-chat';
    }
  }

  // Mesmo servidor (produção unificada ou dev via proxy Vite)
  if (typeof window !== 'undefined' && window.location) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws-chat`;
  }

  return '';
};

/** Alias para retrocompatibilidade */
export const getApiRootUrl = (): string => getBaseUrl();

/** URL base do chat interno */
export const getApiBaseUrl = (): string => `${getBaseUrl()}/api/chat`;

/** URL do WebSocket do chat (alias) */
export const getWebSocketUrl = (): string => getWsUrl();

/** URL base do WhatsBot */
export const getWhatsBotApiBaseUrl = (): string => `${getBaseUrl()}/api/whatsbot`;
