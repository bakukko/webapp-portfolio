const CACHE_NAME = 'cronometraggio-v1.0.0';
const STATIC_CACHE = 'cronometraggio-static-v1';
const DYNAMIC_CACHE = 'cronometraggio-dynamic-v1';

// File da cacheare immediatamente
const STATIC_FILES = [
  '/',
  '/js/app.js',
  '/manifest.json',
  'https://cdn.tailwindcss.com/3.3.0'
];

// File da cacheare dinamicamente
const CACHE_PATTERNS = [
  /^https:\/\/cdn\.tailwindcss\.com/,
  /\/api\/cronometraggi$/,
  /\/api\/tempi\/\d+$/
];

// File che non devono mai essere cachati
const NO_CACHE_PATTERNS = [
  /\/api\/export\//,
  /\/api\/upload-csv\//,
  /\/api\/health$/
];

// Installazione del Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Installed successfully');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Attivazione del Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cache => {
            if (cache !== STATIC_CACHE && cache !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache', cache);
              return caches.delete(cache);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated successfully');
        return self.clients.claim();
      })
  );
});

// Intercettazione delle richieste
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Salta le richieste non HTTP/HTTPS
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Non cachare le richieste esplicite
  if (NO_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
    return;
  }
  
  // Strategia di cache
  if (request.method === 'GET') {
    if (STATIC_FILES.includes(url.pathname) || CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
      // Cache First per file statici e API selezionate
      event.respondWith(cacheFirst(request));
    } else if (url.pathname.startsWith('/api/')) {
      // Network First per API
      event.respondWith(networkFirst(request));
    } else {
      // Stale While Revalidate per tutto il resto
      event.respondWith(staleWhileRevalidate(request));
    }
  }
});

// Strategia Cache First
async function cacheFirst(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Cache First failed:', error);
    return new Response('Offline - Content not available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Strategia Network First
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', error);
    
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Risposta offline personalizzata per API
    if (request.url.includes('/api/')) {
      return new Response(JSON.stringify({
        error: 'Connessione non disponibile',
        offline: true
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Offline', { status: 503 });
  }
}

// Strategia Stale While Revalidate
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // Fallback silenzioso se la rete fallisce
    return cachedResponse;
  });
  
  return cachedResponse || fetchPromise;
}

// Gestione messaggi dal client
self.addEventListener('message', event => {
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
        
      case 'CACHE_URLS':
        event.waitUntil(
          caches.open(DYNAMIC_CACHE)
            .then(cache => cache.addAll(event.data.urls))
        );
        break;
        
      case 'CLEAR_CACHE':
        event.waitUntil(
          caches.delete(DYNAMIC_CACHE)
            .then(() => caches.open(DYNAMIC_CACHE))
        );
        break;
        
      case 'GET_CACHE_SIZE':
        event.waitUntil(
          getCacheSize().then(size => {
            event.ports[0].postMessage({ size });
          })
        );
        break;
    }
  }
});

// Utilità per calcolare la dimensione della cache
async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }
  
  return totalSize;
}

// Sync in background (per future implementazioni)
self.addEventListener('sync', event => {
  console.log('Background Sync:', event.tag);
  
  if (event.tag === 'backup-data') {
    event.waitUntil(backupLocalData());
  }
});

async function backupLocalData() {
  try {
    // Implementazione futura per backup automatico
    console.log('Background backup started');
  } catch (error) {
    console.error('Background backup failed:', error);
  }
}

// Gestione notifiche push (per future implementazioni)
self.addEventListener('push', event => {
  console.log('Push notification received:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'Aggiornamento cronometraggio',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Apri app',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Chiudi',
        icon: '/icons/xmark.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Cronometraggio Sportivo', options)
  );
});

// Click su notifica
self.addEventListener('notificationclick', event => {
  console.log('Notification click received.');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('Service Worker: Script loaded');
