// Royal Cabana Service Worker — v4
// Cache versioning, precache, stale-while-revalidate, network-first,
// offline fallback, push notifications, background sync

const CACHE_VERSION = "royal-cabana-v6";
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/icons/Icon-192.png",
  "/icons/Icon-512.png",
];

// ─── Install: precache critical assets ───
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

// ─── Activate: delete old caches ───
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ─── Push Notifications ───
self.addEventListener("push", (event) => {
  var data = { title: "Royal Cabana", body: "Yeni bildirim", url: "/" };

  if (event.data) {
    try {
      data = Object.assign(data, event.data.json());
    } catch {
      data.body = event.data.text();
    }
  }

  var options = {
    body: data.body,
    icon: "/icons/Icon-192.png",
    badge: "/icons/Icon-96.png",
    vibrate: [100, 50, 100],
    data: { url: data.url || "/" },
    actions: [{ action: "open", title: "Aç" }],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// ─── Notification Click ───
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  var url =
    event.notification.data && event.notification.data.url
      ? event.notification.data.url
      : "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clients) {
        for (var i = 0; i < clients.length; i++) {
          if (clients[i].url.includes(url) && "focus" in clients[i]) {
            return clients[i].focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      }),
  );
});

// ─── Fetch: route-based strategy selection ───
self.addEventListener("fetch", (event) => {
  var request = event.request;
  var url = new URL(request.url);

  // Only handle same-origin GET requests
  // Cache API does not support POST/PUT/DELETE
  if (url.origin !== self.location.origin || request.method !== "GET") {
    return;
  }

  // Skip SSE / EventSource endpoints — streams cannot be cached or cloned
  if (
    url.pathname.startsWith("/api/sse") ||
    request.headers.get("accept") === "text/event-stream"
  ) {
    return;
  }

  // Navigation requests: network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          var clone = response.clone();
          caches.open(RUNTIME_CACHE).then(function (cache) {
            cache.put(request, clone);
          });
          return response;
        })
        .catch(function () {
          return caches.match(request).then(function (cached) {
            return cached || caches.match("/offline.html");
          });
        }),
    );
    return;
  }

  // Static assets: stale-while-revalidate
  if (isStaticAsset(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // API GET requests: network-only to avoid persisting authenticated payloads
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // Everything else: cache-first with network fallback
  event.respondWith(cacheFirst(request));
});

// ─── Strategy: stale-while-revalidate ───
function staleWhileRevalidate(request) {
  return caches.open(STATIC_CACHE).then(function (cache) {
    return cache.match(request).then(function (cached) {
      var fetchPromise = fetch(request)
        .then(function (response) {
          if (response && response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(function () {
          return cached;
        });

      return cached || fetchPromise;
    });
  });
}

// ─── Strategy: cache-first with network fallback ───
function cacheFirst(request) {
  return caches.match(request).then(function (cached) {
    if (cached) {
      return cached;
    }
    return fetch(request).then(function (response) {
      if (response && response.ok) {
        var clone = response.clone();
        caches.open(RUNTIME_CACHE).then(function (cache) {
          cache.put(request, clone);
        });
      }
      return response;
    });
  });
}

// ─── Helpers ───
function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/fonts/") ||
    pathname.startsWith("/icons/") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".woff2") ||
    pathname.endsWith(".woff") ||
    pathname.endsWith(".ttf")
  );
}

// ─── Background Sync ───
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-pending-actions") {
    event.waitUntil(syncPendingActions());
  }
});

function syncPendingActions() {
  return caches.open(RUNTIME_CACHE).then(function (cache) {
    return cache.match("/__pending_actions").then(function (response) {
      if (!response) return Promise.resolve();

      return response.json().then(function (actions) {
        var promises = actions.map(function (action) {
          return fetch(action.url, {
            method: action.method,
            headers: action.headers,
            body: action.body,
          }).catch(function () {
            // Will retry on next sync
          });
        });

        return Promise.all(promises).then(function () {
          return cache.delete("/__pending_actions");
        });
      });
    });
  });
}
