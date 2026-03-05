const CACHE_NAME = 'team-management-v6';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-512.png',
  '/icons/icon-192.png'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/tasks',
  '/api/global-tasks',
  '/api/notes',
  '/api/quizzes',
  '/api/subjects',
  '/api/auth/me'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first with cache fallback for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // For API requests - network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached response if offline
          return caches.match(request).then((cached) => {
            if (cached) {
              return cached;
            }
            // Return empty data for uncached API requests
            return new Response(JSON.stringify({ 
              offline: true,
              tasks: [], 
              notes: [], 
              quizzes: [],
              subjects: [],
              message: 'أنت غير متصل بالإنترنت'
            }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // For navigation requests (HTML pages) - network first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match('/').then((cached) => {
            return cached || new Response('Offline', { status: 503 });
          });
        })
    );
    return;
  }

  // For static assets - cache first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request).then((response) => {
        // Don't cache non-successful responses
        if (response.status !== 200) {
          return response;
        }
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
        return response;
      });
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks());
  }
  if (event.tag === 'sync-notes') {
    event.waitUntil(syncNotes());
  }
});

async function syncTasks() {
  console.log('Background sync: tasks');
  // Get pending tasks from IndexedDB and sync
}

async function syncNotes() {
  console.log('Background sync: notes');
  // Get pending notes from IndexedDB and sync
}

// Handle push notifications
self.addEventListener('push', (event) => {
  let data = {};
  
  try {
    data = event.data?.json() || {};
  } catch (e) {
    data = {
      title: 'منصة إدارة الفريق',
      body: event.data?.text() || 'تحديث جديد'
    };
  }

  const options = {
    body: data.body || 'تحديث جديد',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      type: data.type || 'general',
      id: data.id
    },
    actions: data.actions || [],
    dir: 'rtl',
    lang: 'ar',
    tag: data.tag || 'general-notification',
    renotify: true,
    requireInteraction: data.requireInteraction || false
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'منصة إدارة الفريق', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let url = data.url || '/';

  // Handle action clicks
  if (event.action) {
    switch (event.action) {
      case 'view':
        url = data.url || '/';
        break;
      case 'complete':
        // Mark task as complete via API
        if (data.id) {
          fetch(`/api/tasks/${data.id}/complete`, { method: 'POST' });
        }
        url = '/?tab=tasks';
        break;
      case 'dismiss':
        return;
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if no existing one
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification);
});

// Push subscription change
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Push subscription changed');
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    }).then((subscription) => {
      // Send new subscription to server
      return fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
    })
  );
});
