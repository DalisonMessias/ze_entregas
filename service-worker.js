

const CACHE_NAME = 'delivery-tracker-v2';
const MAP_CACHE_NAME = 'delivery-tracker-maps-v1';

const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Utility: network with timeout
function networkTimeout(request, ms = 7000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('network-timeout')), ms);
    fetch(request).then((res) => {
      clearTimeout(timer);
      resolve(res);
    }, (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

// Install Event - Cache Files (tolerant)
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      await cache.addAll(ASSETS);
    } catch (err) {
      // If some assets fail, attempt individual caching to avoid blocking install
      console.warn('service-worker: addAll failed, attempting per-item cache', err);
      for (const asset of ASSETS) {
        try { await cache.add(asset); } catch(e) { console.warn('service-worker: failed to cache', asset, e); }
      }
    }
    await self.skipWaiting();
  })());
});

// Activate Event - Clean old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keyList = await caches.keys();
    await Promise.all(keyList.map((key) => {
      if (key !== CACHE_NAME && key !== MAP_CACHE_NAME) {
        return caches.delete(key);
      }
      return Promise.resolve();
    }));
    await self.clients.claim();
  })());
});

// Allow pages to trigger skipWaiting via postMessage
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch Event - strategies: navigation, API (network-first with timeout), static assets (cache-first)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return; // ignore non-GET

  // Navigation requests -> network-first with fallback to cached index.html
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await networkTimeout(req, 7000);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put('/', response.clone());
          return response;
        }
        throw new Error('bad-network-response');
      } catch (err) {
        const cached = await caches.match('/index.html');
        if (cached) return cached;
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      }
    })());
    return;
  }

  const accept = req.headers.get('accept') || '';
  const isLikelyApi = url.pathname.startsWith('/api/') || accept.includes('application/json');
  const isSameOrigin = url.origin === self.location.origin;

  if (isLikelyApi) {
    // network-first with timeout and cached fallback
    event.respondWith((async () => {
      try {
        const response = await networkTimeout(req, 7000);
        return response;
      } catch (err) {
        const cached = await caches.match(req);
        if (cached) return cached;
        return new Response(JSON.stringify({ error: 'Service unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    })());
    return;
  }

  // Static assets (same-origin styles/scripts/images/fonts) -> cache-first, update in background
  if (isSameOrigin && (req.destination === 'style' || req.destination === 'script' || req.destination === 'image' || req.destination === 'font')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) {
        // Update cache in background
        networkTimeout(req, 7000).then(async (resp) => {
          if (resp && resp.ok) await cache.put(req, resp.clone());
        }).catch(() => {});
        return cached;
      }
      try {
        const networkResponse = await networkTimeout(req, 7000);
        if (networkResponse && networkResponse.ok) await cache.put(req, networkResponse.clone());
        return networkResponse;
      } catch (err) {
        const fallback = await cache.match('/index.html');
        return fallback || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  // Default: network-first with cache fallback
  event.respondWith((async () => {
    try {
      const resp = await networkTimeout(req, 7000);
      return resp;
    } catch (err) {
      const cached = await caches.match(req);
      return cached || new Response('Offline', { status: 503 });
    }
  })());
});

// Push Notification Event (Handles backend pushes)
self.addEventListener('push', function(event) {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch(e) {
      data = { title: 'Nova Notificação', body: event.data.text() };
    }
  } else {
    data = { title: 'Zé Entregas', body: 'Você tem uma nova atualização.' };
  }

  const options = {
    body: data.body,
    icon: 'https://raw.githubusercontent.com/DalisonMessias/cdn.rabbit.gg/refs/heads/main/assets/192-192.png',
    badge: 'https://raw.githubusercontent.com/DalisonMessias/cdn.rabbit.gg/refs/heads/main/assets/96-96.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification Click Event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    if (clientList.length > 0) {
      let client = clientList[0];
      for (let i = 0; i < clientList.length; i++) {
        if (clientList[i].focused) client = clientList[i];
      }
      return client.focus();
    }
    return clients.openWindow('/');
  }));
});
