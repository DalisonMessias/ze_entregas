import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  /**
   * URL do backend para o proxy de desenvolvimento.
   *
   * O proxy do Vite é usado APENAS em desenvolvimento local.
   * Em produção, o frontend usa o mesmo domínio (sem proxy)
   * ou VITE_API_BASE_URL se o backend estiver em domínio separado.
   *
   * Lógica:
   * - Se VITE_API_BASE_URL estiver definida → usa como alvo do proxy
   * - Senão → usa localhost:4000 (backend local padrão)
   *
   * Obs: Esta variável é usada APENAS pelo Vite (build/dev tool),
   * nunca fica no bundle JavaScript enviado ao browser.
   */
  const backendDevUrl = env.VITE_API_BASE_URL?.startsWith('http')
    ? env.VITE_API_BASE_URL
    : 'http://localhost:4000';

  // Versão WebSocket do alvo (http → ws, https → wss)
  const backendDevWsUrl = backendDevUrl
    .replace(/^https:\/\//, 'wss://')
    .replace(/^http:\/\//, 'ws://');

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: {
        host: 'localhost',
      },

      /**
       * Proxy de desenvolvimento: redireciona chamadas do frontend
       * para o servidor Node.js local (:4000).
       *
       * Em produção isso NÃO existe — o servidor deve servir
       * os arquivos estáticos e as rotas de API no mesmo processo.
       */
      proxy: {
        // Todas as rotas de API
        '/api': {
          target: backendDevUrl,
          changeOrigin: true,
          secure: false,
        },
        // Socket.IO (se necessário)
        '/socket.io': {
          target: backendDevUrl,
          ws: true,
          changeOrigin: true,
        },
        // WebSocket do Chat Interno
        // O browser conecta em ws://localhost:3000/ws-chat
        // O Vite proxy redireciona para ws://localhost:4000/ws-chat
        '/ws-chat': {
          target: backendDevWsUrl,
          ws: true,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ws-chat/, '/ws-chat'),
        },
        // Rotas PWA
        '/pwa': {
          target: backendDevUrl,
          changeOrigin: true,
        },
      },
    },
    plugins: [react({ jsxRuntime: 'automatic' }), tailwindcss()],
    test: {
      environment: 'jsdom',
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    build: {
      chunkSizeWarningLimit: 1000,
      minify: 'esbuild',
      reportCompressedSize: false,
    },
  };
});
