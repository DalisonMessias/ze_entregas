import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './components/App';
import { AuthWrapper } from './components/AuthWrapper';
import { DialogProvider } from './utils/dialogService'; // Import DialogProvider
import { initURLPolicy, validateEnvConfig } from './src/policy/urlPolicy';

import ErrorBoundary from './components/ErrorBoundary'; // Import ErrorBoundary

// Capture PWA install prompt early to prevent missing it during app load
initURLPolicy();
validateEnvConfig();
window.addEventListener('url-policy-blocked', (e: any) => {
  try {
    const d = e?.detail || {};
    console.warn('URL bloqueada em desenvolvimento', d.url || '');
  } catch { }
});
window.addEventListener('url-policy-allowed', (e: any) => {
  try {
    const d = e?.detail || {};
    console.log('URL liberada em desenvolvimento', d.url || '');
  } catch { }
});
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).deferredPrompt = e;
  console.log("PWA Install Prompt captured in index.tsx");
});

// Global error handlers to catch unhandled exceptions and promise rejections
window.addEventListener('error', (event: ErrorEvent) => {
  try {
    console.error('Global error captured:', event.error || event.message, event);
    const detail = { ts: Date.now(), message: event.message, stack: (event.error && event.error.stack) || null };
    // persist locally to help debugging in production if needed
    try {
      const logs = JSON.parse(localStorage.getItem('__appLogs') || '[]');
      logs.push({ level: 'error', ...detail });
      localStorage.setItem('__appLogs', JSON.stringify(logs.slice(-200)));
    } catch { }
    window.dispatchEvent(new CustomEvent('app-error', { detail }));
  } catch { }
});

window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  try {
    console.error('Unhandled rejection captured:', event.reason);
    const detail = { ts: Date.now(), reason: event.reason };
    try {
      const logs = JSON.parse(localStorage.getItem('__appLogs') || '[]');
      logs.push({ level: 'warn', ...detail });
      localStorage.setItem('__appLogs', JSON.stringify(logs.slice(-200)));
    } catch { }
    window.dispatchEvent(new CustomEvent('app-unhandledrejection', { detail }));
  } catch { }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');

      // If there's an updated worker already waiting, ask it to skip waiting
      if (registration.waiting) {
        try { registration.waiting.postMessage({ type: 'SKIP_WAITING' }); } catch (e) { console.warn('Failed to message waiting SW', e); }
      }

      // Listen for new SW being installed
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed') {
            // If there's an existing controller, new worker is waiting -> activate it
            if (navigator.serviceWorker.controller) {
              console.log('New service worker installed and waiting; requesting skipWaiting');
              try { registration.waiting?.postMessage({ type: 'SKIP_WAITING' }); } catch (e) { console.warn(e); }
            }
          }
        });
      });

      // When the new SW takes control, reload to apply updated assets/state
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service worker controller changed — reloading to apply update');
        window.location.reload();
      });
    } catch (err) {
      console.log('ServiceWorker registration failed: ', err);
    }
  });
}

import { NotificationProvider } from './contexts/NotificationContext';

// ... existing code ...

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary> {/* Add ErrorBoundary here */}
      <DialogProvider> {/* Wrap AuthWrapper with DialogProvider */}
        <NotificationProvider>
          <AuthWrapper />
        </NotificationProvider>
      </DialogProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
