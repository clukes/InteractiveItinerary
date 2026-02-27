/* ====================================================================
   Interactive Trip Itinerary — Service Worker (Offline-First)
   ==================================================================== */
"use strict";

const CACHE_VERSION = 1;
const SHELL_CACHE = `itinerary-shell-v${CACHE_VERSION}`;
const TILE_CACHE = "itinerary-tiles-v1";
const IMAGE_CACHE = "itinerary-images-v1";
const FONT_CACHE = "itinerary-fonts-v1";

/** App shell files — precached on install */
const SHELL_FILES = [
    "./",
    "./index.html",
    "./assets/styles/app.css",
    "./assets/scripts/app.js",
    "./assets/scripts/modules/validation.js",
    "./assets/scripts/modules/map-rendering.js",
    "./assets/scripts/modules/map-interaction.js",
    "./assets/data/sample-itinerary.json",
    "./version.json",
];

/** Max tiles/images to cache so we don't blow up storage */
const MAX_TILE_ENTRIES = 600;
const MAX_IMAGE_ENTRIES = 150;

// ── Install ──
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(SHELL_CACHE)
            .then((cache) => cache.addAll(SHELL_FILES))
            .then(() => self.skipWaiting()),
    );
});

// ── Activate — clean up old caches ──
self.addEventListener("activate", (event) => {
    const keepCaches = new Set([
        SHELL_CACHE,
        TILE_CACHE,
        IMAGE_CACHE,
        FONT_CACHE,
    ]);
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((k) => !keepCaches.has(k))
                        .map((k) => caches.delete(k)),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

// ── Fetch strategy router ──
self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET (e.g. POST to Cloudflare Worker)
    if (event.request.method !== "GET") return;

    // Map tiles — cache-first, immutable
    if (url.hostname === "basemaps.cartocdn.com") {
        event.respondWith(cacheFirst(event.request, TILE_CACHE));
        return;
    }

    // Google Fonts CSS + font files — cache-first
    if (
        url.hostname === "fonts.googleapis.com" ||
        url.hostname === "fonts.gstatic.com"
    ) {
        event.respondWith(cacheFirst(event.request, FONT_CACHE));
        return;
    }

    // External images (Unsplash etc.) — cache-first
    if (isExternalImage(event.request)) {
        event.respondWith(cacheFirst(event.request, IMAGE_CACHE));
        return;
    }

    // App shell — stale-while-revalidate so updates arrive next load
    if (url.origin === self.location.origin) {
        event.respondWith(staleWhileRevalidate(event.request, SHELL_CACHE));
        return;
    }
});

// ── Message handler for bulk precaching ──
self.addEventListener("message", (event) => {
    if (!event.data) return;

    if (event.data.type === "PRECACHE_URLS") {
        const { urls, cacheName, _batch } = event.data;
        if (!urls || !cacheName) return;

        const maxEntries =
            cacheName === TILE_CACHE ? MAX_TILE_ENTRIES : MAX_IMAGE_ENTRIES;

        event.waitUntil(
            precacheUrls(urls, cacheName, maxEntries, event, _batch),
        );
    }

    if (event.data.type === "GET_CACHE_STATS") {
        event.waitUntil(
            getCacheStats().then((stats) => {
                if (event.source) {
                    event.source.postMessage({
                        type: "CACHE_STATS",
                        stats,
                    });
                }
            }),
        );
    }
});

// ── Strategy: cache-first ──
async function cacheFirst(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch (_) {
        // Offline and not cached — return a lightweight fallback
        if (isImageRequest(request)) {
            return offlineImageFallback();
        }
        return new Response("Offline", {
            status: 503,
            statusText: "Service Unavailable",
        });
    }
}

// ── Strategy: stale-while-revalidate ──
async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    const fetchPromise = fetch(request)
        .then((response) => {
            if (response.ok) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => null);

    // Return cached immediately if available, else wait for network
    if (cached) return cached;

    const networkResponse = await fetchPromise;
    if (networkResponse) return networkResponse;

    return new Response("Offline", {
        status: 503,
        statusText: "Service Unavailable",
    });
}

// ── Bulk precache with concurrency throttling ──
async function precacheUrls(urls, cacheName, maxEntries, event, batchId) {
    const cache = await caches.open(cacheName);
    const existing = await cache.keys();
    const existingUrls = new Set(existing.map((r) => r.url));

    // Filter to only URLs not yet cached
    const needed = urls.filter((u) => !existingUrls.has(u));

    // Respect max entries — skip if cache is already near limit
    const available = Math.max(0, maxEntries - existing.length);
    const toFetch = needed.slice(0, available);

    const alreadyCached = urls.length - needed.length;

    if (toFetch.length === 0) {
        notifyProgress(event, {
            cached: 0,
            total: 0,
            alreadyCached,
            done: true,
            _batch: batchId,
        });
        return;
    }

    let cached = 0;
    const total = toFetch.length;
    const CONCURRENCY = 3; // Limit parallel fetches to save bandwidth

    for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
        const batch = toFetch.slice(i, i + CONCURRENCY);
        const results = await Promise.allSettled(
            batch.map(async (url) => {
                const response = await fetch(url);
                if (response.ok) {
                    await cache.put(url, response);
                    cached++;
                }
            }),
        );
        // Report progress back to page
        notifyProgress(event, {
            cached,
            total,
            alreadyCached,
            done: false,
            _batch: batchId,
        });
    }

    notifyProgress(event, {
        cached,
        total,
        alreadyCached,
        done: true,
        _batch: batchId,
    });
}

function notifyProgress(event, data) {
    if (event.source) {
        event.source.postMessage({ type: "PRECACHE_PROGRESS", ...data });
    }
}

// ── Helpers ──
function isExternalImage(request) {
    const url = new URL(request.url);
    if (url.origin === self.location.origin) return false;
    const accept = request.headers.get("Accept") || "";
    if (accept.includes("image/")) return true;
    return /\.(jpe?g|png|webp|gif|avif|svg)(\?|$)/i.test(url.pathname);
}

function isImageRequest(request) {
    const accept = request.headers.get("Accept") || "";
    if (accept.includes("image/")) return true;
    return /\.(jpe?g|png|webp|gif|avif|svg)(\?|$)/i.test(request.url);
}

function offlineImageFallback() {
    // Return a tiny 1x1 transparent PNG with an offline indicator
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120" viewBox="0 0 200 120">
    <rect width="200" height="120" fill="#f0f0f0" rx="8"/>
    <text x="100" y="55" text-anchor="middle" fill="#999" font-family="sans-serif" font-size="12">Offline</text>
    <text x="100" y="75" text-anchor="middle" fill="#bbb" font-family="sans-serif" font-size="10">Image unavailable</text>
  </svg>`;
    return new Response(svg, {
        headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "no-store",
        },
    });
}

async function getCacheStats() {
    const stats = {};
    for (const name of [SHELL_CACHE, TILE_CACHE, IMAGE_CACHE, FONT_CACHE]) {
        try {
            const cache = await caches.open(name);
            const keys = await cache.keys();
            stats[name] = keys.length;
        } catch (_) {
            stats[name] = 0;
        }
    }
    return stats;
}
