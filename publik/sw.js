const CACHE_NAME = "asuma-cache-v1";
const STATIC_URLS = [
  '/',
  '/index.html',
  '/page2.html',
  '/manifest.json'
];

const EXTERNAL_RESOURCES = [
  'https://cdn.asuma.my.id/o8v8wq8x12.jpg',
  'https://cdn.asuma.my.id/zjsvcos194.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(STATIC_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then(response => {
        if (event.request.method === 'GET' && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseToCache));
        }
        return response;
      }).catch(() => {
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/index.html');
        }
        
        if (EXTERNAL_RESOURCES.includes(event.request.url)) {
          return fetch(event.request.url);
        }
      });
    })
  );
});
