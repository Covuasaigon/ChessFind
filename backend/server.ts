import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, extname, sep } from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { createApi } from './lib/api.ts';
import { openDatabase } from './database.ts';

const root = process.cwd();
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';

// Database location from DATABASE_URL or fallback DATA_DIR
const dbPath = process.env.DATABASE_URL
  ? resolve(root, process.env.DATABASE_URL)
  : resolve(root, process.env.DATA_DIR || 'data', 'chess.sqlite');

const migrationsPath = resolve(root, 'migrations');

const db = openDatabase(dbPath, migrationsPath);
const api = createApi(db);

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

function getCorsHeaders(reqOrigin?: string | null): Record<string, string> {
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.PUBLIC_ORIGIN,
    process.env.API_URL,
    'http://localhost:5173',
    'http://localhost:3000'
  ].filter(Boolean) as string[];

  let allowOrigin = reqOrigin || '*';
  if (reqOrigin) {
    if (
      allowedOrigins.includes(reqOrigin) ||
      reqOrigin.endsWith('.vercel.app') ||
      reqOrigin.includes('localhost') ||
      process.env.NODE_ENV !== 'production'
    ) {
      allowOrigin = reqOrigin;
    }
  } else if (process.env.FRONTEND_URL) {
    allowOrigin = process.env.FRONTEND_URL;
  }

  return {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Token, Authorization'
  };
}

const server = createServer(async (req, res) => {
  try {
    const reqOrigin = req.headers.origin;
    const security = getCorsHeaders(reqOrigin);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, security);
      res.end();
      return;
    }

    const hostHeader = req.headers.host || `${host}:${port}`;
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const origin = process.env.PUBLIC_ORIGIN || `${protocol}://${hostHeader}`;
    const url = new URL(req.url || '/', origin);

    // Health check endpoint for Railway & monitoring
    if (url.pathname === '/health' || url.pathname === '/api/health') {
      res.writeHead(200, { ...security, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString(), env: process.env.NODE_ENV || 'development' }));
      return;
    }

    if (url.pathname.startsWith('/api/')) {
      let body: Buffer | undefined;
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        const chunks: Buffer[] = [];
        let n = 0;
        for await (const chunk of req) {
          n += chunk.length;
          if (n > 6000000) {
            res.writeHead(413, security);
            res.end('Yêu cầu quá lớn.');
            return;
          }
          chunks.push(chunk);
        }
        body = Buffer.concat(chunks);
      }

      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (v) headers.set(k, Array.isArray(v) ? v.join(',') : v);
      }

      const r = await api(
        new Request(url, { method: req.method, headers, body: body as any }),
        req.socket.remoteAddress || 'unknown'
      );

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
        resolve(root, '.' + path),
        resolve(root, 'uploads', '.' + path.replace('/uploads', '')),
        resolve(root, 'public', '.' + path)
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

    res.writeHead(404, security);
    res.end('Cờ Vua Sài Gòn API Server is running.');
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Không thể xử lý yêu cầu. Vui lòng thử lại.' }));
  }
});

server.listen(port, host, () => {
  console.log(`[Cờ Vua Sài Gòn Backend Server] Listening on http://${host}:${port}`);
  console.log(`[Environment] NODE_ENV=${process.env.NODE_ENV || 'development'}`);
  console.log(`[Database] Path=${dbPath}`);
});

server.on('error', (e: NodeJS.ErrnoException) => {
  console.error(`Server startup error: ${e.message}`);
  process.exit(1);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => { db.close(); process.exit(0); }));
}
