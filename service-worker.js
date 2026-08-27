const CACHE_NAME = 'anaesthetic-night-roster-v31-0';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css?v=31.0',
  './app-core.js?v=31.0',
  './app-ui.js?v=31.0',
  './manifest.webmanifest?v=31.0',
  './icon-192.png?v=31.0',
  './icon-512.png?v=31.0',
  './icon-maskable-192.png?v=31.0',
  './icon-maskable-512.png?v=31.0',
  './apple-touch-icon.png?v=31.0',
  './anaesthesia-header.jpg?v=31.0',
  './mater-dei-logo.png?v=31.0'
];

function isSupabaseLibrary(requestUrl) {
  return requestUrl.hostname === 'cdn.jsdelivr.net' &&
    requestUrl.pathname === '/npm/@supabase/supabase-js@2.49.4';
}

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'ACTIVATE_UPDATE') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);

  // Supabase authentication, REST and Realtime traffic always stays on the
  // network. Only the fixed public client library is eligible for caching.
  if (requestUrl.origin !== self.location.origin && !isSupabaseLibrary(requestUrl)) return;

  if (isSupabaseLibrary(requestUrl)) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
        if (response.ok || response.type === 'opaque') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        }
        return response;
      }))
    );
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return response;
    }))
  );
});
