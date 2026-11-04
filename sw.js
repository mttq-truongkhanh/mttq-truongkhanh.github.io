/* Bản đồ số hộ nghèo — service worker
   Có mạng: luôn lấy bản mới nhất của ứng dụng. Mất mạng: mở từ bộ nhớ đệm.
   Nhận file chia sẻ từ Zalo (Android): Zalo → Chia sẻ → Hộ nghèo. Dữ liệu hộ không đi qua mạng. */
const CACHE = 'ho-ngheo-v2';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== 'share-inbox').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method === 'POST' && url.origin === self.location.origin && url.searchParams.has('share-target')) {
    e.respondWith((async () => {
      try {
        const fd = await req.formData();
        const f = fd.get('file') || [...fd.values()].find(v => typeof v === 'object' && v && 'size' in v);
        if (f) { const c = await caches.open('share-inbox'); await c.put(new URL('shared-file', self.registration.scope).href, new Response(f)); }
      } catch (err) {}
      return Response.redirect(new URL('./?shared=1', self.registration.scope).href, 303);
    })());
    return;
  }
  if (req.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(req, { cache: 'no-cache' });
      if (res && res.ok) { const c = await caches.open(CACHE); await c.put(req, res.clone()); }
      return res;
    } catch (err) {
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') return (await caches.match('./index.html')) || (await caches.match('./'));
      throw err;
    }
  })());
});
