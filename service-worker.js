const CACHE_NAME = 'anaesthetic-night-roster-v37-44';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css?v=37.45',
  './theme-bootstrap.js?v=37.45',
  './app-core.js?v=37.45',
  './app-ui.js?v=37.45',
  './manifest.webmanifest?v=37.45',
  './release.json',
  './icon-192.png?v=37.45',
  './icon-512.png?v=37.45',
  './apple-touch-icon.png?v=37.45',
  './anaesthesia-header.jpg?v=37.45',
  './mater-dei-logo.png?v=37.45'
];

// Vite injects the fingerprinted React/CSS assets here at build time.
// Legacy app-shell URLs remain explicit so updates of installed 37.x PWAs
// keep the existing network and update semantics.
const BUILD_SHELL = (self.__WB_MANIFEST || []).map(entry => new URL(entry.url, self.registration.scope).href);

function isSupabaseLibrary(requestUrl) {
  return requestUrl.hostname === 'cdn.jsdelivr.net' &&
    requestUrl.pathname === '/npm/@supabase/supabase-js@2.105.0';
}

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL.concat(BUILD_SHELL))));
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


self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let payload = {};
    try {
      payload = event.data ? event.data.json() : {};
    } catch (error) {
      payload = {};
    }

    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const visibleClient = windows.find(client => client.visibilityState === 'visible');
    const type = payload.type || 'chat';
    const messageType = type === 'roster'
      ? 'ROSTER_PUSH_RECEIVED'
      : type === 'access_request'
      ? 'ACCESS_REQUEST_PUSH_RECEIVED'
      : 'CHAT_PUSH_RECEIVED';

    if (visibleClient) {
      visibleClient.postMessage({
        type: messageType,
        conversationId: payload.conversation_id || '',
        rosterDate: payload.roster_date || ''
      });
      return;
    }

    try {
      if (self.navigator && self.navigator.setAppBadge) await self.navigator.setAppBadge();
    } catch (error) {}

    const title = payload.title || 'Night Roster';
    const options = {
      body: payload.body || (type === 'chat' ? 'New chat message' : 'Night Roster has an update'),
      icon: new URL('./icon-192.png?v=37.45', self.registration.scope).href,
      badge: new URL('./icon-192.png?v=37.45', self.registration.scope).href,
      tag: payload.tag || 'night-roster',
      renotify: true,
      data: {
        type,
        url: payload.url || new URL('./', self.registration.scope).href,
        conversationId: payload.conversation_id || '',
        rosterDate: payload.roster_date || ''
      }
    };

    await self.registration.showNotification(title, options);
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const data = event.notification.data || {};
    const targetUrl = data.url || new URL('./', self.registration.scope).href;
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

    for (const client of windows) {
      if ('focus' in client) {
        try {
          if ('navigate' in client) await client.navigate(targetUrl);
        } catch (error) {}
        await client.focus();
        client.postMessage({
          type: 'OPEN_APP_NOTIFICATION',
          conversationId: data.conversationId || '',
          rosterDate: data.rosterDate || '',
          notificationType: data.type || 'chat'
        });
        return;
      }
    }

    if (self.clients.openWindow) await self.clients.openWindow(targetUrl);
  })());
});
