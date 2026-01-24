import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './components/App';
import { AuthWrapper } from './components/AuthWrapper';
import { DialogProvider } from './utils/dialogService'; // Import DialogProvider
import { initURLPolicy, validateEnvConfig } from './src/policy/urlPolicy';

import ErrorBoundary from './components/ErrorBoundary'; // Import ErrorBoundary

// Capture PWA install prompt early to prevent missing it during app load
if (typeof window !== 'undefined') {
  initURLPolicy();
  validateEnvConfig();
  window.addEventListener('url-policy-blocked', (e: any) => {
    try {
      const d = e?.detail || {};
      // console.warn('URL bloqueada em desenvolvimento', d.url || '');
    } catch { }
  });
  window.addEventListener('url-policy-allowed', (e: any) => {
    try {
      const d = e?.detail || {};
      // console.log('URL liberada em desenvolvimento', d.url || '');
    } catch { }
  });
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    (window as any).deferredPrompt = e;
    // console.log("PWA Install Prompt captured in index.tsx");
  });

  // Global error handlers to catch unhandled exceptions and promise rejections
  window.addEventListener('error', (event: ErrorEvent) => {
    try {
      // console.error('Global error captured:', event.error || event.message, event);
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
      // console.error('Unhandled rejection captured:', event.reason);
      const detail = { ts: Date.now(), reason: event.reason };
      try {
        const logs = JSON.parse(localStorage.getItem('__appLogs') || '[]');
        logs.push({ level: 'warn', ...detail });
        localStorage.setItem('__appLogs', JSON.stringify(logs.slice(-200)));
      } catch { }
      window.dispatchEvent(new CustomEvent('app-unhandledrejection', { detail }));
    } catch { }
  });
}

const rootElement = typeof document !== 'undefined' ? document.getElementById('root') : null;
if (typeof window !== 'undefined' && !rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Register Service Worker
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');

      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000); // Check every hour
    } catch (err) {
      // console.log('ServiceWorker registration failed: ', err);
    }
  });
}

import { NotificationProvider } from './contexts/NotificationContext';
import { UserDataProvider } from './contexts/UserDataContext';


// ... existing code ...

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary> {/* Add ErrorBoundary here */}
      <DialogProvider> {/* Wrap AuthWrapper with DialogProvider */}
        <NotificationProvider>
          <UserDataProvider>
            <AuthWrapper />
          </UserDataProvider>
        </NotificationProvider>
      </DialogProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
