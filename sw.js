importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

const CACHE = "pwabuilder-offline-page";

const offlineFallbackPage = "index.html";

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener('install', async (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.add(offlineFallbackPage))
  );
});

if (workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

workbox.routing.registerRoute(
  new RegExp('/*'),
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: CACHE
  })
);


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

        const cache = await caches.open(CACHE);
        const cachedResp = await cache.match(offlineFallbackPage);
        return cachedResp;
      }
    })());
  }
});















// Respond to a server push with a user notification.
self.addEventListener('push', function (event) {
    if (Notification.permission === "granted") {
        let notification_data = JSON.parse(event.data.text());
        const notificationText = notification_data["description"];
        const notification_title = notification_data["notifier_DisplayName"];
        let notificaiotn_timestampt = notification_data["CreatedAt"];
        // Convert the string date to a date object. And unix timestamp to milliseconds
        let notification_timestamp = new Date(notificaiotn_timestampt * 1000);
        // Convert the date object to a string, using the locale language
        let notification_timestamp_string = notification_timestamp.toLocaleString();
        let notificaiton_sid = notification_data["sid"];


        const showNotification = self.registration.showNotification(notification_title, {
            // title: notification_title,
            body: notificationText,
            icon: '/images/vector.svg',
            tag: notificaiton_sid,
            data: {
                url: notification_data["url"]
            },
            // actions: [
            //     { action: 'actionName', title: 'Mark as read', icon: '/static/images/Logos/logo.png' },
            //     { action: 'actionName', title: 'Mark as unread', icon: '/static/images/Logos/logo.png' },
            // ],
            timestamp: notification_timestamp_string,
        });
        // Make sure the toast notification is displayed.
        event.waitUntil(showNotification);
    }
});

// Respond to the user selecting the toast notification.
self.addEventListener('notificationclick', function (event) {
    event.notification.close(); // Android needs explicit close.
    event.waitUntil(
        clients.openWindow(event.notification.data.url) // This line will open the URL saved in 'data' when the notification was first created.
    );
});
