/**
 * Minimal static file server for Playwright tests (repo root, port 4173).
 * No API routes, no browser auto-open.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4173;
const HOST = '127.0.0.1';
const ROOT = path.join(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff'
};

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  } catch {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }

  const relPath = urlPath === '/' ? '/visual-bench.html' : urlPath;
  const filePath = path.normalize(path.join(ROOT, relPath.replace(/^\//, '')));

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
});

server.listen(PORT, HOST, () => {
  process.stdout.write(`Playwright static server at http://${HOST}:${PORT}/\n`);
});