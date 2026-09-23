const CACHE_NAME = 'anaesthetic-night-roster-v37-16';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css?v=37.16',
  './theme-bootstrap.js?v=37.16',
  './app-core.js?v=37.16',
  './app-ui.js?v=37.16',
  './manifest.webmanifest?v=37.16',
  './release.json',
  './icon-192.png?v=37.16',
  './icon-512.png?v=37.16',
  './icon-maskable-192.png?v=37.16',
  './icon-maskable-512.png?v=37.16',
  './apple-touch-icon.png?v=37.16',
  './anaesthesia-header.jpg?v=37.16',
  './mater-dei-logo.png?v=37.16'
];

function isSupabaseLibrary(requestUrl) {
  return requestUrl.hostname === 'cdn.jsdelivr.net' &&
    requestUrl.pathname === '/npm/@supabase/supabase-js@2.105.0';
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
  if (event.data && event.data.type === 'GET_CACHE_VERSION' && event.source) {
    event.source.postMessage({ type: 'CACHE_VERSION', value: CACHE_NAME });
  }
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

  // Release information is network-first so an installed app can describe
  // the incoming version before the waiting service worker is activated.
  if (requestUrl.pathname.endsWith('/release.json')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put('./release.json', copy));
          }
          return response;
        })
        .catch(() => caches.match('./release.json'))
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
