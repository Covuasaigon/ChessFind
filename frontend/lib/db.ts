import { openDatabase } from '../portable/database';
import { resolve } from 'node:path';
import { existsSync, statSync } from 'node:fs';
import type { Database } from './api';

let dbInstance: (Database & { close(): void }) | null = null;

export function getDb(): Database {
  if (!dbInstance) {
    const root = process.cwd();
    let dbPath = process.env.DATABASE_URL
      ? resolve(root, process.env.DATABASE_URL)
      : resolve(root, process.env.DATA_DIR || 'data', 'chess.sqlite');

    if (!process.env.DATABASE_URL && existsSync(resolve(root, '../data', 'chess.sqlite'))) {
      const rootDbPath = resolve(root, '../data', 'chess.sqlite');
      if (!existsSync(dbPath) || (existsSync(rootDbPath) && statSync(rootDbPath).size > statSync(dbPath).size)) {
        dbPath = rootDbPath;
      }
    }

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
