import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // Porta local do backend Express (sempre localhost em dev)
  const localBackendPort = env.PORT || '4000';
  const localBackendUrl = `http://localhost:${localBackendPort}`;
  const localBackendWsUrl = `ws://localhost:${localBackendPort}`;

  // URL do backend para o código do browser (pode ser remoto em produção)
  // Usada apenas para definições do Vite, não para o proxy do servidor
  const backendUrl = env.VITE_API_BASE_URL || localBackendUrl;

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: {
        host: 'localhost',
      },

      proxy: {
        '/api': {
          target: localBackendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: localBackendUrl,
          ws: true,
        },
        // WebSocket do Chat Interno
        '/ws-chat': {
          target: localBackendWsUrl,
          ws: true,
          rewrite: (path) => path.replace(/^\/ws-chat/, '')
        },
        '/pwa': {
          target: localBackendUrl,
          changeOrigin: true
        }
      }
    },
    plugins: [react({ jsxRuntime: 'automatic' }), tailwindcss()],
    test: {
      environment: 'jsdom'
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom']
    },
    build: {
      chunkSizeWarningLimit: 1000,
      minify: 'esbuild',
      reportCompressedSize: false
    }
  };
});
