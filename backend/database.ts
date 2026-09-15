import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import pg from 'pg';
import dns from 'node:dns';
import type { Database, Statement } from './lib/api';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

function convertSql(sql: string): string {
  let paramCount = 0;
  let inString = false;
  let stringChar = '';
  let result = '';
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (inString) {
      result += char;
      if (char === stringChar) {
        if (i + 1 < sql.length && sql[i + 1] === stringChar) {
          result += stringChar;
          i++;
        } else {
          inString = false;
        }
      }
    } else {
      if (char === "'" || char === '"') {
        inString = true;
        stringChar = char;
        result += char;
      } else if (char === '?') {
        paramCount++;
        result += `$${paramCount}`;
      } else {
        result += char;
      }
    }
  }
  return result;
}

export function openDatabase(connectionStringOrFile: string, migrations: string): Database & { close(): Promise<void> | void; source: 'postgresql' | 'sqlite' } {
  const isPg = connectionStringOrFile.startsWith('postgres://') || connectionStringOrFile.startsWith('postgresql://');

  if (isPg) {
    const pool = new pg.Pool({
      connectionString: connectionStringOrFile,
      ssl: process.env.NODE_ENV === 'production' ||
           connectionStringOrFile.includes('render.com') ||
           connectionStringOrFile.includes('supabase') ||
           connectionStringOrFile.includes('neon') ||
           connectionStringOrFile.includes('railway') ||
           process.env.PGSSLMODE === 'require' ||
           process.env.PGSSLMODE === 'no-verify' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 15000,
      max: 20
    });

    class PgQuery implements Statement {
      text: string;
      args: any[] = [];
      constructor(text: string) { this.text = text; }
      bind(...args: any[]) { const q = new PgQuery(this.text); q.args = args; return q; }
      async first<T = any>(): Promise<T | null> {
        if (this.text.includes('PRAGMA')) return null;
        if (this.text.includes('sqlite_master')) return null;
        const pgSql = convertSql(this.text);
        const res = await pool.query(pgSql, this.args);
        return (res.rows[0] as T) || null;
      }
      async all<T = any>() {
        if (this.text.includes('PRAGMA')) return { results: [] };
        if (this.text.includes('sqlite_master')) return { results: [] };
        const pgSql = convertSql(this.text);
        const res = await pool.query(pgSql, this.args);
        return { results: res.rows as T[] };
      }
      async run() {
        if (this.text.includes('PRAGMA')) return { meta: { changes: 0 } };
        if (this.text.includes('sqlite_master')) return { meta: { changes: 0 } };
        const pgSql = convertSql(this.text);
        const res = await pool.query(pgSql, this.args);
        return { meta: { changes: res.rowCount || 0 } };
      }
    }

    return {
      source: 'postgresql',
      prepare: s => new PgQuery(s),
      async batch(ss: Statement[]) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const results = [];
          for (const s of ss) {
            const query = s as PgQuery;
            if (query.text.includes('PRAGMA') || query.text.includes('sqlite_master')) continue;
            const pgSql = convertSql(query.text);
            const r = await client.query(pgSql, query.args);
            results.push({ meta: { changes: r.rowCount || 0 } });
          }
          await client.query('COMMIT');
          return results;
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        } finally {
          client.release();
        }
      },
      close: () => pool.end()
    };
  }

  mkdirSync(dirname(connectionStringOrFile), { recursive: true });
  const sql = new DatabaseSync(connectionStringOrFile);
  sql.exec('PRAGMA busy_timeout=30000; PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
  sql.exec('CREATE TABLE IF NOT EXISTS sgc_migrations (name TEXT PRIMARY KEY, applied TEXT NOT NULL)');

  if (existsSync(migrations)) {
    for (const name of readdirSync(migrations).filter(n => n.endsWith('.sql')).sort()) {
      let isApplied = false;
      try {
        isApplied = !!sql.prepare('SELECT name FROM sgc_migrations WHERE name = ?').get(name);
      } catch {}
      if (!isApplied) {
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            sql.exec('BEGIN IMMEDIATE');
            try {
              if (!sql.prepare('SELECT name FROM sgc_migrations WHERE name = ?').get(name)) {
                sql.exec(readFileSync(resolve(migrations, name), 'utf8'));
                sql.prepare('INSERT OR IGNORE INTO sgc_migrations (name,applied) VALUES (?,?)').run(name, new Date().toISOString());
              }
              sql.exec('COMMIT');
            } catch (e) {
              sql.exec('ROLLBACK');
              throw e;
            }
            break;
          } catch (err: any) {
            if (attempt === 4 || !/locked|busy/i.test(err?.message || '')) throw err;
            const delay = Math.floor(Math.random() * 200) + 100;
            const start = Date.now();
            while (Date.now() - start < delay) {}
          }
        }
      }
    }
  }

  class Query implements Statement {
    text: string;
    args: any[] = [];
    constructor(text: string) { this.text = text; }
    bind(...args: any[]) { const q = new Query(this.text); q.args = args; return q; }
    async first<T = any>(): Promise<T | null> { return sql.prepare(this.text).get(...this.args) as T || null; }
    async all<T = any>() { return { results: sql.prepare(this.text).all(...this.args) as T[] }; }
    execute() { const r = sql.prepare(this.text).run(...this.args); return { meta: { changes: Number(r.changes) } }; }
    async run() { return this.execute(); }
  }

  return {
    source: 'sqlite',
    prepare: s => new Query(s),
    async batch(ss: Statement[]) {
      sql.exec('BEGIN IMMEDIATE');
      try {
        const r = ss.map(s => (s as Query).execute());
        sql.exec('COMMIT');
        return r;
      } catch (e) {
        sql.exec('ROLLBACK');
        throw e;
      }
    },
    close: () => sql.close()
  };
}
