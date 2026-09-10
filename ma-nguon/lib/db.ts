import { openDatabase } from '../portable/database';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import type { Database } from './api';

let dbInstance: (Database & { close(): void }) | null = null;

export function getDb(): Database {
  if (!dbInstance) {
    const root = process.cwd();
    const dbPath = process.env.DATABASE_URL
      ? resolve(root, process.env.DATABASE_URL)
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
