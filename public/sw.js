// Service Worker for Offline Capabilities and Cache Management
const CACHE_NAME = 'galaltix-energy-v1';
const STATIC_CACHE_NAME = 'galaltix-static-v1';
const DYNAMIC_CACHE_NAME = 'galaltix-dynamic-v1';
const API_CACHE_NAME = 'galaltix-api-v1';

// Files to cache immediately for offline functionality
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  // Add other critical static assets
];

// API endpoints to cache for offline functionality
const API_ENDPOINTS = [
  '/api/inventory',
  '/api/transactions',
  '/api/audit',
  '/api/customers'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('[SW] Static files cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Error caching static files:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches that don't match current version
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME && 
                cacheName !== API_CACHE_NAME &&
                cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement offline-first caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle API requests with cache-first strategy for offline support
  if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) {
    event.respondWith(apiCacheFirstStrategy(request));
    return;
  }

  // Handle static assets with cache-first strategy
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Handle navigation requests with network-first, fallback to cache
  if (request.mode === 'navigate') {
    event.respondWith(navigationStrategy(request));
    return;
  }

  // Default to network-first for other requests
  event.respondWith(networkFirstStrategy(request));
});

// API Cache-first strategy for offline functionality
async function apiCacheFirstStrategy(request) {
  try {
    // Try cache first for API requests
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving API from cache:', request.url);
      
      // Update cache in background if online
      if (navigator.onLine) {
        fetch(request)
          .then(response => {
            if (response.ok) {
              const cache = caches.open(API_CACHE_NAME);
              cache.then(c => c.put(request, response.clone()));
            }
          })
          .catch(() => {
            // Silently fail background update
          });
      }
      
      return cachedResponse;
    }
    
    // Cache miss, try network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
      console.log('[SW] API response cached:', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] API request failed, no cache available:', request.url);
    
    // Return offline response for API calls
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'This data is not available offline',
        offline: true 
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Network-first strategy (good for dynamic content)
async function networkFirstStrategy(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // If successful, cache the response and return it
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Cache-first strategy (good for static assets)
async function cacheFirstStrategy(request) {
  // Try cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    // Cache miss, try network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Failed to fetch:', request.url, error);
    throw error;
  }
}

// Navigation strategy with offline fallback
async function navigationStrategy(request) {
  try {
    // Try network first for navigation
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('[SW] Navigation failed, serving offline page');
    
    // Network failed, try to serve cached index.html
    const cachedResponse = await caches.match('/index.html');
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If no cached index.html, return basic offline page
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Galaltix Energy - Offline</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              text-align: center; 
              padding: 50px; 
              background: #f8fafc;
            }
            .offline-container {
              max-width: 400px;
              margin: 0 auto;
              background: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .offline-icon { font-size: 48px; margin-bottom: 20px; }
            h1 { color: #334155; margin-bottom: 16px; }
            p { color: #64748b; margin-bottom: 24px; }
            button {
              background: #4f46e5;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 16px;
            }
            button:hover { background: #4338ca; }
          </style>
        </head>
        <body>
          <div class="offline-container">
            <div class="offline-icon">📡</div>
            <h1>You're Offline</h1>
            <p>Please check your internet connection and try again.</p>
            <button onclick="window.location.reload()">Retry</button>
          </div>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Check if URL is a static asset
function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some(ext => url.pathname.endsWith(ext));
}

// Handle cache cleanup messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[SW] Received cache clear request');
    
    event.waitUntil(
      caches.keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              if (event.data.cacheTypes && event.data.cacheTypes.includes(cacheName)) {
                console.log('[SW] Clearing cache:', cacheName);
                return caches.delete(cacheName);
              }
            })
          );
        })
        .then(() => {
          console.log('[SW] Cache clearing completed');
          // Notify main thread that cache clearing is done
          self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({ type: 'CACHE_CLEARED' });
            });
          });
        })
    );
  }

  // Handle offline status requests
  if (event.data && event.data.type === 'GET_OFFLINE_STATUS') {
    event.ports[0].postMessage({
      type: 'OFFLINE_STATUS',
      isOffline: !navigator.onLine
    });
  }
});

// Periodic cache cleanup (every 6 hours)
setInterval(() => {
  console.log('[SW] Performing periodic cache cleanup');
  
  caches.keys().then((cacheNames) => {
    cacheNames.forEach((cacheName) => {
      if (cacheName.includes('dynamic') || cacheName.includes('api')) {
        caches.open(cacheName).then((cache) => {
          cache.keys().then((requests) => {
            // Remove old entries (older than 24 hours)
            const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
            
            requests.forEach((request) => {
              cache.match(request).then((response) => {
                if (response) {
                  const dateHeader = response.headers.get('date');
                  if (dateHeader) {
                    const responseDate = new Date(dateHeader).getTime();
                    if (responseDate < oneDayAgo) {
                      console.log('[SW] Removing old cache entry:', request.url);
                      cache.delete(request);
                    }
                  }
                }
              });
            });
          });
        });
      }
    });
  });
}, 6 * 60 * 60 * 1000); // 6 hours

// Handle sync events for background sync when back online
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Background sync function
async function doBackgroundSync() {
  try {
    // Sync any pending data when back online
    console.log('[SW] Performing background sync...');
    
    // Notify main thread that we're back online
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({ 
        type: 'BACK_ONLINE',
        timestamp: new Date().toISOString()
      });
    });
    
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

console.log('[SW] Service worker script loaded');