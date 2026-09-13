import pg from 'pg';
import dns from 'node:dns';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Database, Statement } from './lib/api';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

export function openDatabase(fileOrUrl: string, migrations: string): Database & { close(): void } {
  const isPostgres = fileOrUrl.startsWith('postgres://') || fileOrUrl.startsWith('postgresql://');

  if (isPostgres) {
    const useSsl = process.env.NODE_ENV === 'production' ||
                   fileOrUrl.includes('render.com') ||
                   fileOrUrl.includes('supabase') ||
                   fileOrUrl.includes('neon') ||
                   fileOrUrl.includes('railway') ||
                   process.env.PGSSLMODE === 'require' ||
                   process.env.PGSSLMODE === 'no-verify';

    const pool = new pg.Pool({
      connectionString: fileOrUrl,
      ssl: useSsl ? { rejectUnauthorized: false } : false
    });

    // Auto-initialize PostgreSQL Schema
    const initPgSchema = async () => {
      try {
        let ddl = '';
        const possibleSchemaPaths = [
          resolve(migrations, 'pg_schema.sql'),
          resolve(process.cwd(), 'backend', 'migrations', 'pg_schema.sql'),
          resolve(process.cwd(), 'migrations', 'pg_schema.sql')
        ];
        for (const p of possibleSchemaPaths) {
          if (existsSync(p)) {
            ddl = readFileSync(p, 'utf8');
            break;
          }
        }
        if (ddl) {
          await pool.query(ddl);
        }
      } catch (err) {
        console.error('Error initializing PostgreSQL schema:', err);
      }
    };
    initPgSchema();

    function convertSqlForPg(sql: string): string {
      let paramIndex = 1;
      let converted = sql.replace(/\?/g, () => `$${paramIndex++}`);
      if (/INSERT\s+OR\s+IGNORE\s+INTO/i.test(converted)) {
        converted = converted.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');
        if (!/ON\s+CONFLICT/i.test(converted)) {
          converted += ' ON CONFLICT DO NOTHING';
        }
      }
      return converted;
    }

    class PgQuery implements Statement {
      text: string;
      args: any[] = [];
      constructor(text: string) {
        this.text = text;
      }
      bind(...args: any[]) {
        const q = new PgQuery(this.text);
        q.args = args;
        return q;
      }
      async executePg(client?: pg.PoolClient | pg.Pool) {
        const target = client || pool;
        const pgSql = convertSqlForPg(this.text);
        const res = await target.query(pgSql, this.args);
        return res;
      }
      async first<T = any>(): Promise<T | null> {
        const res = await this.executePg();
        return (res.rows[0] as T) || null;
      }
      async all<T = any>() {
        const res = await this.executePg();
        return { results: res.rows as T[] };
      }
      async run() {
        const res = await this.executePg();
        return { meta: { changes: res.rowCount || 0 } };
      }
      execute() {
        return this.run();
      }
    }

    return {
      prepare: (s: string) => new PgQuery(s),
      async batch(ss: Statement[]) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const results = [];
          for (const s of ss) {
            const pgQ = s as PgQuery;
            results.push(await pgQ.executePg(client));
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
      close: () => {
        pool.end();
      }
    };
  }

  // SQLite fallback
  mkdirSync(dirname(fileOrUrl), { recursive: true });
  const sql = new DatabaseSync(fileOrUrl);
  sql.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  sql.exec('CREATE TABLE IF NOT EXISTS sgc_migrations (name TEXT PRIMARY KEY, applied TEXT NOT NULL)');

  if (existsSync(migrations)) {
    for (const name of readdirSync(migrations).filter(n => n.endsWith('.sql')).sort()) {
      if (!sql.prepare('SELECT name FROM sgc_migrations WHERE name = ?').get(name)) {
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
