

const CACHE_NAME = 'delivery-tracker-v1';
const MAP_CACHE_NAME = 'delivery-tracker-maps-v1';

const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', // Adicionado Supabase ao Cache
  'https://cdn.jsdelivr.net/npm/qrious/dist/qrious.min.js',
  'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js'
];

// Install Event - Cache Files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME && key !== MAP_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Estratégia de Cache para Mapas (CartoDB Clean Tiles & OSM)
  // Armazena todos os tiles carregados para uso offline
  // Inclui openstreetmap.org (legado) e cartocdn.com (novo design clean)
  if (
      url.hostname.includes('openstreetmap.org') || 
      url.hostname.includes('cartocdn.com') ||
      url.hostname.includes('tile.openstreetmap')
  ) {
    event.respondWith(
      caches.open(MAP_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          // Retorna do cache se existir, senão busca na rede e cacheia
          return response || fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          }).catch(() => {
             // Se falhar (offline e sem cache), retorna uma imagem vazia ou nada
             return new Response(); 
          });
        });
      })
    );
    return;
  }

  // Estratégia Padrão: Network First, fall back to Cache
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
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
    icon: 'https://picsum.photos/192/192', // Replace with real app icon
    badge: 'https://picsum.photos/96/96',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification Click Event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus if already open
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      // Open if not
      return clients.openWindow('/');
    })
  );
});