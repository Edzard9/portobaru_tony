import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = 'D:\\CODING DI LUAR KULIAH\\New\\porto new';
const PORT = 8121;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.glb':  'model/gltf-binary',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

http.createServer(async (req, res) => {
  try {
    const url = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
    let path = normalize(join(ROOT, url));
    if (!path.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
    const s = await stat(path);
    if (s.isDirectory()) path = join(path, 'index.html');
    const data = await readFile(path);
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(data);
  } catch (e) {
    res.writeHead(404);
    res.end('not found: ' + req.url);
  }
}).listen(PORT, () => console.log(`serving on http://localhost:${PORT}`));
