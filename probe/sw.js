/* P070 T0 probe service worker: Range from Cache Storage */
const CACHE = 'p070-probe-media';
const PREFIX = '/media/';

self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

function parseRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header || '');
  if (!m) return null;
  let start = m[1] === '' ? null : Number(m[1]);
  let end = m[2] === '' ? null : Number(m[2]);
  if (start === null) { start = Math.max(0, size - end); end = size - 1; }
  else if (end === null || end >= size) end = size - 1;
  if (Number.isNaN(start) || Number.isNaN(end) || start > end) return null;
  return { start, end };
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (!url.pathname.startsWith(PREFIX)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(url.pathname);
    if (!cached) return new Response('not cached', { status: 404 });
    const buf = await cached.arrayBuffer();
    const size = buf.byteLength;
    const range = parseRange(event.request.headers.get('range'), size);
    if (!range) {
      return new Response(buf, { status: 200, headers: { 'content-type':'video/mp4', 'accept-ranges':'bytes', 'content-length':String(size) } });
    }
    const chunk = buf.slice(range.start, range.end + 1);
    return new Response(chunk, { status: 206, headers: {
      'content-type':'video/mp4', 'accept-ranges':'bytes',
      'content-range':`bytes ${range.start}-${range.end}/${size}`,
      'content-length':String(chunk.byteLength)
    }});
  })());
});
