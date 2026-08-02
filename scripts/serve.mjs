import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 4173);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error('PORT muss zwischen 1 und 65535 liegen.');
  process.exit(1);
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime'
};

const server = http.createServer((request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || `${host}:${port}`}`);
    const pathname = url.pathname === '/' ? '/web/index.html' : decodeURIComponent(url.pathname);
    if (pathname.includes('\0') || pathname.split('/').some((part) => part === '..' || part.startsWith('.'))) {
      return send(response, 400, 'Ungültiger Pfad.');
    }

    const filePath = path.resolve(root, `.${pathname}`);
    const allowedPrefix = `${path.resolve(root)}${path.sep}`;
    if (!filePath.startsWith(allowedPrefix)) return send(response, 403, 'Zugriff verweigert.');
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return send(response, 404, 'Datei nicht gefunden.');

    const stat = fs.statSync(filePath);
    const range = request.headers.range;
    const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';

    response.setHeader('Content-Type', contentType);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cache-Control', pathname.includes('/catalog/') ? 'no-store' : 'public, max-age=300');

    if (range && contentType.startsWith('video/')) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match) return send(response, 416, 'Ungültiger Range-Header.');
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Math.min(Number(match[2]), stat.size - 1) : stat.size - 1;
      if (start > end || start >= stat.size) return send(response, 416, 'Bereich nicht verfügbar.');
      response.writeHead(206, {
        'Accept-Ranges': 'bytes',
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Content-Length': end - start + 1
      });
      fs.createReadStream(filePath, { start, end }).pipe(response);
      return;
    }

    response.setHeader('Content-Length', stat.size);
    fs.createReadStream(filePath).pipe(response);
  } catch (error) {
    send(response, 500, error instanceof Error ? error.message : 'Serverfehler.');
  }
});

server.listen(port, host, () => {
  console.log(`Visual Asset Hub: http://${host}:${port}`);
});

function send(response, status, text) {
  response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
  response.end(text);
}
