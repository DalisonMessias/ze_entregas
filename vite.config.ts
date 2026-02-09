import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: {
        host: 'localhost',
      },

      proxy: {
        '/api': {
          target: 'http://127.0.0.1:4000',
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: 'http://127.0.0.1:4000',
          ws: true,
        },
        // Configuração genérica para o WebSocket do WhatsApp
        '/ws-chat': {
          target: 'ws://127.0.0.1:4000',
          ws: true,
          rewrite: (path) => path.replace(/^\/ws-chat/, '')
        },
        '/pwa': {
          target: 'http://127.0.0.1:4000',
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
