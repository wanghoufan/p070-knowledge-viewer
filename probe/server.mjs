import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8765);
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.mp4':'video/mp4', '.json':'application/json', '.png':'image/png' };

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url.startsWith('/report')) {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 2e6) req.destroy(); });
    req.on('end', () => {
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      fs.writeFileSync(path.join(root, `report-${url.searchParams.get('kind')||'full'}-${stamp}.json`), body);
      res.writeHead(200, { 'content-type':'text/plain' });
      res.end('ok');
    });
    return;
  }
  const url = new URL(req.url, 'http://x');
  let file = path.join(root, decodeURIComponent(url.pathname));
  if (url.pathname === '/') file = path.join(root, 'index.html');
  if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
});
server.listen(port, '127.0.0.1', () => console.log('probe server on ' + port));
