// Minimaler Service Worker: macht die App installierbar (PWA-Kriterium).
// Die App braucht Netz (OpenAI/Supabase), daher kein aggressives Offline-Caching.
const CACHE = "blitztext-shell-v1";
const SHELL = ["/", "/login", "/manifest.webmanifest", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Nur GET-Navigationen behandeln; API/POST immer direkt ans Netz.
  if (request.method !== "GET") return;

  event.respondWith(
    fetch(request).catch(() => caches.match(request).then((r) => r ?? caches.match("/")))
  );
});
