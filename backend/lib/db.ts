import { openDatabase } from '../database';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import type { Database } from './api';

let dbInstance: (Database & { close(): void }) | null = null;

export function getDb(): Database {
  if (!dbInstance) {
    const root = process.cwd();
    const rawUrl = process.env.DATABASE_URL;
    const isPg = rawUrl && (rawUrl.startsWith('postgres://') || rawUrl.startsWith('postgresql://'));
    const dbPath = isPg
      ? rawUrl
      : rawUrl
      ? resolve(root, rawUrl)
      : resolve(root, process.env.DATA_DIR || 'data', 'chess.sqlite');

    let migrationsPath = resolve(root, 'migrations');
    if (!existsSync(migrationsPath) && existsSync(resolve(root, '../migrations'))) {
      migrationsPath = resolve(root, '../migrations');
    } else if (!existsSync(migrationsPath) && existsSync(resolve(root, 'drizzle'))) {
      migrationsPath = resolve(root, 'drizzle');
    } else if (!existsSync(migrationsPath) && existsSync(resolve(root, '../drizzle'))) {
      migrationsPath = resolve(root, '../drizzle');
    }
    
    dbInstance = openDatabase(dbPath, migrationsPath);
  }
  return dbInstance;
}

export const db = getDb();
