import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, extname, sep } from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { createApi } from './lib/api';
import { openDatabase } from './database';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 3000), host = process.env.HOST || '0.0.0.0';
const publicOrigin = process.env.PUBLIC_ORIGIN ? new URL(process.env.PUBLIC_ORIGIN).origin : null;
const db = openDatabase(resolve(root, process.env.DATA_DIR || 'data', 'chess.sqlite'), resolve(root, 'migrations'));
const api = createApi(db);
const web = resolve(root, 'web');
const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
  '.json': 'application/json'
};
const security = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; connect-src 'self'; font-src 'self' https://fonts.gstatic.com; object-src 'none'; base-uri 'self'; frame-ancestors 'self'"
};

const server = createServer(async (req, res) => {
  try {
    const requestedHost = req.headers.host || `localhost:${port}`;
    const allowedHosts = new Set([`localhost:${port}`, `127.0.0.1:${port}`, `[::1]:${port}`]);
    if (publicOrigin) {
      try { allowedHosts.add(new URL(publicOrigin).host); } catch {}
    }
    const isCloudHost = requestedHost.endsWith('.onrender.com') || requestedHost.endsWith('.railway.app') || requestedHost.endsWith('.vercel.app');
    if (publicOrigin && !allowedHosts.has(requestedHost) && !isCloudHost && process.env.STRICT_HOST_CHECK === 'true') {
      if (req.url?.startsWith('/api')) {
        res.writeHead(400, { ...security, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Host không hợp lệ. Cấu hình PUBLIC_ORIGIN khi dùng tên miền.' }));
        return;
      }
      res.writeHead(400, security);
      res.end('Host không hợp lệ. Cấu hình PUBLIC_ORIGIN khi dùng tên miền.');
      return;
    }
    const origin = publicOrigin || `http://${requestedHost}`;
    const url = new URL(req.url || '/', origin);

    if (url.pathname.startsWith('/api/') || url.pathname === '/api') {
      let body: Buffer | undefined;
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        const chunks: Buffer[] = [];
        let n = 0;
        for await (const chunk of req) {
          n += chunk.length;
          if (n > 12000000) {
            res.writeHead(413, { ...security, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Yêu cầu quá lớn.' }));
            return;
          }
          chunks.push(chunk);
        }
        body = Buffer.concat(chunks);
      }
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) if (v) headers.set(k, Array.isArray(v) ? v.join(',') : v);
      const r = await api(new Request(url, { method: req.method, headers, body: body as any }), req.socket.remoteAddress || 'unknown');
      const outgoing: Record<string, string | string[]> = { ...security, 'Content-Type': 'application/json' };
      r.headers.forEach((v, k) => { outgoing[k] = v; });
      const setCookies = r.headers.get('set-cookie');
      if (setCookies) outgoing['set-cookie'] = setCookies;
      res.writeHead(r.status, outgoing);
      res.end(Buffer.from(await r.arrayBuffer()));
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, security);
      res.end();
      return;
    }

    const path = decodeURIComponent(url.pathname);

    // Static upload file serving fallback handler (/uploads/...)
    if (path.startsWith('/uploads/')) {
      const candidates = [
        resolve(web, '.' + path),
        resolve(root, 'web', '.' + path),
        resolve(root, 'public', '.' + path),
        resolve(process.cwd(), 'web', '.' + path),
        resolve(process.cwd(), 'public', '.' + path),
        resolve(process.cwd(), '.' + path)
      ];
      let fileFound: string | null = null;
      for (const cand of candidates) {
        try {
          if ((await stat(cand)).isFile()) {
            fileFound = cand;
            break;
          }
        } catch {}
      }
      if (fileFound) {
        const bytes = await readFile(fileFound);
        const ext = extname(fileFound).toLowerCase();
        res.writeHead(200, {
          ...security,
          'Content-Type': types[ext] || 'image/webp',
          'Cache-Control': 'public, max-age=31536000, immutable'
        });
        res.end(req.method === 'HEAD' ? undefined : bytes);
        return;
      }
    }

    const asset = path === '/' || path === '/admin' || path === '/admin/' ? 'index.html' : '.' + path;
    const full = resolve(web, asset);
    if (!full.startsWith(web + sep)) {
      res.writeHead(403, security);
      res.end();
      return;
    }
    try {
      if (!(await stat(full)).isFile()) throw Error();
      const bytes = await readFile(full);
      res.writeHead(200, {
        ...security,
        'Content-Type': types[extname(full)] || 'application/octet-stream',
        'Cache-Control': path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache'
      });
      res.end(req.method === 'HEAD' ? undefined : bytes);
    } catch {
      res.writeHead(404, security);
      res.end('Không tìm thấy trang.');
    }
  } catch {
    res.writeHead(500, { ...security, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Không thể xử lý yêu cầu. Vui lòng thử lại.' }));
  }
});

server.listen(port, host, () => console.log(`Cờ Vua Sài Gòn đang chạy: ${publicOrigin || `http://localhost:${port}`}\nQuản trị: ${publicOrigin || `http://localhost:${port}`}/admin\nNhấn Ctrl+C để dừng.`));
server.on('error', (e: NodeJS.ErrnoException) => { console.error(e.code === 'EADDRINUSE' ? `Cổng ${port} đang được sử dụng. Đổi PORT trong CAU-HINH.env rồi chạy lại.` : e.message); process.exitCode = 1 });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => { db.close(); process.exit(0) }));
