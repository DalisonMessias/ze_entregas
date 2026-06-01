import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // URL do backend — usa variável de ambiente ou fallback para localhost em dev
  const backendUrl = env.VITE_API_BASE_URL || 'http://localhost:4000';

  // URL do WebSocket derivada da URL do backend
  const backendWsUrl = backendUrl
    .replace(/^https:\/\//, 'wss://')
    .replace(/^http:\/\//, 'ws://');

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: {
        host: 'localhost',
      },

      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: backendUrl,
          ws: true,
        },
        // WebSocket do Chat Interno
        '/ws-chat': {
          target: backendWsUrl,
          ws: true,
          rewrite: (path) => path.replace(/^\/ws-chat/, '')
        },
        '/pwa': {
          target: backendUrl,
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
