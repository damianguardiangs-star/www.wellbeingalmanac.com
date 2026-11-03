// Minimal service worker so browsers treat 24/7 Intel as an installable app.
// It doesn't cache anything: intel must always be fresh from the network.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
