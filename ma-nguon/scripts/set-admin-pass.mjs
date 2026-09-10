import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';

const enc = new TextEncoder();
const hex = (b) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const unhex = (s) => Uint8Array.from(s.match(/.{2}/g).map(x => parseInt(x, 16)));

async function makeCreds(username, password) {
  const saltBuf = crypto.getRandomValues(new Uint8Array(24));
  const salt = hex(saltBuf);
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const hash = hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: saltBuf, iterations: 100000 }, key, 256));
  return { username, salt, hash, iterations: 100000 };
}

async function run() {
  const dbPath = resolve('data/chess.sqlite');
  const sql = new DatabaseSync(dbPath);
  const creds = await makeCreds('admin', 'admin123');
  sql.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  sql.prepare(`INSERT INTO settings (key, value) VALUES ('admin_credentials', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(JSON.stringify(creds));
  console.log('Admin credentials updated for password "admin123"!');
  sql.close();
}

run().catch(console.error);
