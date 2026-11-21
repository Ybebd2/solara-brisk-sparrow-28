// SOLARA round 10 — serve.ts
// Serves game/ over HTTP for local testing.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const gameDir = join(root, 'game');
const port = parseInt(process.env.PORT || '4173', 10);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };

createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const p = join(gameDir, url === '/' ? 'index.html' : url);
  if (!p.startsWith(gameDir) || !existsSync(p) || !statSync(p).isFile()) {
    res.writeHead(404); res.end('not found'); return;
  }
  res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' });
  res.end(readFileSync(p));
}).listen(port, () => console.log('SOLARA at http://localhost:' + port));
