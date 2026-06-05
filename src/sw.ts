/// <reference lib="webworker" />

import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from "workbox-strategies";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision?: string }>;
};

const PAGE_CACHE = "syllabix-pages-v1";
const ASSET_CACHE = "syllabix-assets-v1";
const FONT_CACHE = "syllabix-fonts-v1";
const API_CACHE = "syllabix-api-v1";

// Precache the full app shell (built JS/CSS/HTML/icons) plus the root route so
// the app boots instantly and works offline after the first visit.
precacheAndRoute([{ url: "/", revision: null }, ...self.__WB_MANIFEST]);

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(self.clients.claim());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({
    cacheName: PAGE_CACHE,
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  })
);

registerRoute(
  ({ request }) =>
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "image" ||
    request.destination === "font",
  new StaleWhileRevalidate({
    cacheName: ASSET_CACHE,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  })
);

// API data (Supabase REST GET reads): stale-while-revalidate so screens render
// instantly from cache on low connectivity while a fresh copy is fetched in the
// background. Only GET reads are cached — mutations and auth always hit network.
registerRoute(
  ({ url, request }) =>
    request.method === "GET" &&
    url.pathname.startsWith("/rest/v1/"),
  new StaleWhileRevalidate({
    cacheName: API_CACHE,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 }),
    ],
  }),
  "GET"
);

registerRoute(
  ({ url }) =>
    url.origin === "https://fonts.googleapis.com" ||
    url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: FONT_CACHE,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  })
);

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
