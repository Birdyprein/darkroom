/* 暗房画廊 · Service Worker
   策略：网络优先，成功就顺带更新缓存；断网时回退缓存。
   - 不做 install 阶段预缓存（避免首装等待，装完即激活）
   - HTML 始终网络优先，改版后不会看到旧版 */
const CACHE = 'darkroom-shell-v1';

self.addEventListener('install', () => self.skipWaiting());

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
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;   // 字体等外链不接管

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
