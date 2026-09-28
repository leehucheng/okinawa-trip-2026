// Offline copy of the public trip page. Same-origin files (the page, weather.json) come from the network first so updates
// show up, and fall back to the last saved copy when offline or after 4 s on a weak signal. Google Fonts are saved once.
const CACHE = 'oki-v1';
const CORE = ['./', 'index.html', 'weather.json', 'manifest.webmanifest', 'icon-192.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(CORE.map(f => c.add(f)))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys()
  .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === location.origin) e.respondWith(fresh(r));
  else if (/^fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) e.respondWith(saved(r));
});
async function fresh(r) {
  const c = await caches.open(CACHE), old = c.match(r, {ignoreSearch: true});
  const net = fetch(r).then(res => { if (res.ok) c.put(r, res.clone()); return res; });
  net.catch(() => {});
  const slow = new Promise(ok => setTimeout(ok, 4000)).then(() => old);
  try { return (await Promise.race([net, slow])) || await net; }
  catch (err) { return (await old) || (r.mode === 'navigate' && await c.match('index.html')) || Response.error(); }
}
async function saved(r) {
  const c = await caches.open(CACHE), hit = await c.match(r);
  if (hit) return hit;
  const res = await fetch(r);
  if (res.ok || res.type === 'opaque') c.put(r, res.clone());
  return res;
}
