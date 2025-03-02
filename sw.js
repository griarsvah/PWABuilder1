// Подключаем Workbox
importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

// Название кеша и версия
const CACHE_NAME = "pwabuilder-offline-page-v2"; 

// Страница для отображения в оффлайн-режиме
const offlineFallbackPage = "index.html";

// Список статических ресурсов, которые должны быть закешированы
const staticAssets = [
  offlineFallbackPage,
  'images/vector.svg',
  'images/favicons/favicon.ico',
  'manifest.webmanifest',
  'robots.txt',
  'sitemap.xml',
  'sw.js',
];

// Функция для кэширования статических ресурсов
async function cacheResources(cacheName, resources) {
  const cache = await caches.open(cacheName);
  await cache.addAll(resources);
}

// Событие установки: кэшируем оффлайн-страницу и другие ресурсы
self.addEventListener('install', (event) => {
  event.waitUntil(
    cacheResources(CACHE_NAME, staticAssets)
  );
});

// Событие активации: удаляем старые кеши
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Поддержка предзагрузки (Navigation Preload)
if (workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

// Регистрация маршрутов для кеширования статических ресурсов
workbox.routing.registerRoute(
  new RegExp('.*\.(?:css|js|jpg|jpeg|png|svg|woff2)$'),
  new workbox.strategies.CacheFirst({
    cacheName: 'static-resources',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60, // 1 день
      }),
    ],
  })
);

// Регистрация маршрута для страниц с использованием стратегии CacheFirst
workbox.routing.registerRoute(
  new RegExp('/.*'),
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: CACHE_NAME,
  })
);

// Обработка сообщений от клиента (например, для активации нового сервис-воркера)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Обработка запросов: если ошибка сети, показываем оффлайн-страницу
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preloadResp = await event.preloadResponse;
        if (preloadResp) {
          return preloadResp;
        }

        const networkResp = await fetch(event.request);
        return networkResp;
      } catch (error) {
        console.error('Fetch failed; returning offline page instead.', error);

        // Возвращаем оффлайн-страницу из кеша
        const cache = await caches.open(CACHE_NAME);
        const cachedResp = await cache.match(offlineFallbackPage);
        return cachedResp;
      }
    })());
  }
});

// Фоновая синхронизация: синхронизируем данные при возвращении в сеть
self.addEventListener('sync', (event) => {
  if (event.tag === 'sendFormData') {
    event.waitUntil(
      sendDataToServer() // Функция для отправки данных на сервер
    );
  }
});

// Пример функции для отправки данных на сервер
async function sendDataToServer() {
  // Здесь логика для синхронизации данных (например, отправка формы)
  try {
    const response = await fetch('/sync-endpoint', {
      method: 'POST',
      body: JSON.stringify({ /* данные для синхронизации */ }),
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error('Sync failed');
    }

    console.log('Data synchronized successfully!');
  } catch (error) {
    console.error('Sync error: ', error);
  }
}

// Логирование ошибок в процессе работы
self.addEventListener('fetch', (event) => {
  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      return response;
    } catch (error) {
      console.error('Failed to fetch', event.request.url, error);
      return new Response('Network error happened', { status: 408 });
    }
  })());
});


// Respond to the user selecting the toast notification.
self.addEventListener('notificationclick', function (event) {
    event.notification.close(); // Android needs explicit close.
    event.waitUntil(
        clients.openWindow(event.notification.data.url) // This line will open the URL saved in 'data' when the notification was first created.
    );
});
