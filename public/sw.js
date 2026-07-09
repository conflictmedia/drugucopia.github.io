/* eslint-disable no-restricted-globals */
/**
 * Drugucopia service worker.
 *
 * Round 1 (C2): adds offline support so the dose logger works at
 * festivals / bars / basements with no signal. Strategy:
 *
 *   1. Precache a small set of critical assets on install
 *      (app shell, logo, manifest, notification sound).
 *   2. For navigation requests, fall back to the cached app shell
 *      (network-first, fall back to cache when offline).
 *   3. For other same-origin GET requests, use stale-while-revalidate
 *      so cached substance data and JS chunks load instantly offline.
 *   4. Leave cross-origin requests alone (don't proxy them).
 *
 * Notification + notificationclick handlers are preserved unchanged.
 *
 * NOTE: Firestore / Firebase traffic is cross-origin and will fall
 * through to the network. Sync will simply fail offline and queue
 * locally; that's already handled by the sync context.
 */

// Bump this when changing the precache list or fetch strategy.
// The activate handler drops any cache with a different version.
const CACHE_VERSION = 'drugucopia-v1'
const PRECACHE_NAME = `${CACHE_VERSION}-precache`
const RUNTIME_NAME = `${CACHE_VERSION}-runtime`

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/logo.png',
  '/manifest.webmanifest',
  '/notification.wav',
  '/robots.txt',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE_NAME)
      // Use { cache: 'reload' } to bypass the HTTP cache for the precache
      // so we get fresh responses on install. Best-effort: ignore failures
      // for individual assets (e.g. notification.wav if it ever moves).
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            await cache.add(new Request(url, { cache: 'reload' }))
          } catch {
            /* skip missing asset — don't fail the whole install */
          }
        }),
      )
      // Take over from the previous SW as soon as possible so the new
      // fetch handler is active on the next navigation. (C5 — versioned
      // SW — is the long-term plan; for now skipWaiting keeps the
      // update flow simple for users who have never seen a SW update.)
      self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from previous versions.
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request

  // Only handle GET; let everything else (POST/PUT/DELETE) hit the network.
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // Cross-origin requests (Firebase, Google Fonts, etc.) — bypass SW.
  if (url.origin !== self.location.origin) return

  // Navigation requests: network-first, fall back to cached app shell.
  // This is what makes the app open offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req)
          // Cache the latest navigation response so a later offline
          // visit gets the freshest app shell we've seen.
          const cache = await caches.open(RUNTIME_NAME)
          cache.put('/', fresh.clone()).catch(() => { })
          return fresh
        } catch {
          const cached = await caches.match('/')
            ?? (await caches.match('/index.html'))
          if (cached) return cached
          // Last resort: a minimal offline placeholder.
          return new Response(
            '<!doctype html><meta charset="utf-8"><title>Offline</title>' +
            '<body style="font-family:system-ui;padding:2rem;text-align:center">' +
            '<h1>You&rsquo;re offline</h1>' +
            '<p>Drugucopia can&rsquo;t reach the network right now. ' +
            'Your logged doses are still saved locally and will sync when you reconnect.</p>' +
            '<p><button onclick="location.reload()">Try again</button></p>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
          )
        }
      })(),
    )
    return
  }

  // Same-origin static assets: stale-while-revalidate.
  // Serves from cache immediately (instant offline), refreshes in background.
  event.respondWith(
    (async () => {
      const cache = await caches.open(RUNTIME_NAME)
      const cached = await cache.match(req)
      const network = fetch(req)
        .then((res) => {
          // Only cache successful, basic (non-opaque) responses.
          if (res && res.status === 200 && res.type === 'basic') {
            cache.put(req, res.clone()).catch(() => { })
          }
          return res
        })
        .catch(() => null)

      // Return cached immediately if we have it; otherwise wait for network.
      if (cached) {
        // Revalidate in the background.
        event.waitUntil(network)
        return cached
      }
      const fresh = await network
      if (fresh) return fresh
      // No cache, no network — return a clean error so callers can handle it.
      return new Response('Offline and not cached', {
        status: 504,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, icon, data } = event.data.payload
    self.registration.showNotification(title, {
      body,
      tag,
      icon: icon || '/logo.png',
      data,
      requireInteraction: true,
      vibrate: [200, 100, 200],
    })
  }

  // Allow the page to trigger an immediate SW update.
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  // Focus or open the app
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        if (clients.length > 0) {
          clients[0].focus()
        } else {
          self.clients.openWindow('/')
        }
      }),
  )
})

