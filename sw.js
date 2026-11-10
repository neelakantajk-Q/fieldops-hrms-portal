/*
  Offline shell for the Field Operations portal.

  Only same-origin GET requests are cached. Backend calls are POSTs to another
  origin and are deliberately never intercepted - the app keeps its own offline
  queue and retries when the connection returns.
*/

const VERSION = 'fieldops-shell-v41';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './assets/quantum-logo.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(SHELL).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.indexOf('fieldops-shell-') === 0 && key !== VERSION)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (error) {
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstShell(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function networkFirstShell(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(VERSION);
      cache.put('./index.html', response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match('./index.html');
    return cached || new Response(
      '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Offline</title><body style="font-family:system-ui;padding:24px;background:#0b1220;color:#e2e8f0">' +
      '<h1 style="font-size:18px">Offline</h1><p>The portal shell has not been cached yet. Reconnect once to enable offline use.</p></body>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type === 'basic') {
      const cache = await caches.open(VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('', { status: 504, statusText: 'Offline' });
  }
}

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});














