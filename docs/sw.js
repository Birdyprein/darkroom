/* 暗房画廊 · Service Worker
   策略：网络优先，成功就顺带更新缓存；断网时回退缓存。
   HTML 必须保持「网络优先」，否则改版后用户会一直看到旧版。 */
const CACHE = 'darkroom-shell-v1';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   // 字体等外链不接管

  e.respondWith((async () => {
    try {
      const net = await fetch(req);
      if (net && net.ok) {
        const copy = net.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return net;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const shell = await caches.match('./index.html') || await caches.match('./');
        if (shell) return shell;
      }
      throw err;
    }
  })());
});
