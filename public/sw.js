// Man2Man Service Worker
const CACHE_NAME = "man2man-v2";

// Keep precache minimal and guaranteed to exist to avoid install failures.
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/favicon.ico",
];

function isSameOrigin(url) {
  return url.startsWith(self.location.origin);
}

function isApiRequest(url) {
  return url.includes("/api/") || url.includes("convex.cloud") || url.includes("/convex/");
}

function isStaticAssetRequest(pathname) {
  return (
    pathname.startsWith("/assets/") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".woff2")
  );
}

async function precacheAssets() {
  const cache = await caches.open(CACHE_NAME);
  await Promise.allSettled(
    STATIC_ASSETS.map(async (asset) => {
      try {
        await cache.add(asset);
      } catch {
        // Ignore missing optional assets in precache list.
      }
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheAssets());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
            return Promise.resolve(false);
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(event, cache) {
  const cached = await cache.match(event.request);
  if (cached) {
    void fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          void cache.put(event.request, networkResponse.clone());
        }
      })
      .catch(() => {
        // Ignore background refresh failures.
      });
    return cached;
  }

  const networkResponse = await fetch(event.request);
  if (networkResponse && networkResponse.status === 200) {
    void cache.put(event.request, networkResponse.clone());
  }
  return networkResponse;
}

async function networkFirstNavigation(event, cache) {
  try {
    const networkResponse = await fetch(event.request);
    if (networkResponse && networkResponse.status === 200) {
      void cache.put(event.request, networkResponse.clone());
    }
    return networkResponse;
  } catch {

    const cachedResponse = await cache.match(event.request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const cachedRoot = await cache.match("/");
    if (cachedRoot) {
      return cachedRoot;
    }

    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (!isSameOrigin(url.href)) return;
  if (isApiRequest(url.href)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Navigation requests must be network-first to avoid stale app-shell redirects.
      if (event.request.mode === "navigate") {
        return networkFirstNavigation(event, cache);
      }

      if (isStaticAssetRequest(url.pathname)) {
        try {
          return await cacheFirst(event, cache);
        } catch (error) {
          const cached = await cache.match(event.request);
          if (cached) return cached;
          throw error;
        }
      }

      // Default strategy: network first with cache fallback.
      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.status === 200) {
          void cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        throw error;
      }
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
