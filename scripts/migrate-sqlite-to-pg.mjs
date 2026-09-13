import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';
import dns from 'node:dns';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Force IPv4 resolution first to prevent ETIMEDOUT on networks without IPv6 routing
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

async function runMigration() {
  const pgUrl = process.env.DATABASE_URL;
  if (!pgUrl || (!pgUrl.startsWith('postgres://') && !pgUrl.startsWith('postgresql://'))) {
    console.error('❌ Lỗi: DATABASE_URL chưa được cấu hình hoặc không phải là đường dẫn PostgreSQL (postgresql://...)');
    console.error('👉 Vui lòng đặt biến môi trường DATABASE_URL trước khi chạy migrate.');
    process.exit(1);
  }

  const sqliteCandidates = [
    resolve(process.cwd(), 'backend', 'data', 'chess.sqlite'),
    resolve(process.cwd(), 'data', 'chess.sqlite'),
    resolve(process.cwd(), '..', 'data', 'chess.sqlite')
  ];

  let sqlitePath = '';
  for (const cand of sqliteCandidates) {
    if (existsSync(cand)) {
      sqlitePath = cand;
      break;
    }
  }

  if (!sqlitePath) {
    console.error('❌ Lỗi: Không tìm thấy file SQLite local (backend/data/chess.sqlite).');
    process.exit(1);
  }

  const maskedUrl = pgUrl.replace(/:[^:@]+@/, ':****@');
  console.log(`🚀 Connecting to PostgreSQL (${maskedUrl})...`);

  const pool = new pg.Pool({
    connectionString: pgUrl,
    ssl: process.env.NODE_ENV === 'production' ||
         pgUrl.includes('render.com') ||
         pgUrl.includes('supabase') ||
         pgUrl.includes('neon') ||
         pgUrl.includes('railway') ||
         process.env.PGSSLMODE === 'require' ||
         process.env.PGSSLMODE === 'no-verify' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 15000
  });

  // STEP 1: Test Connection
  try {
    const res = await pool.query('SELECT NOW() AS current_time');
    console.log(`✅ Connection successful`);
  } catch (connErr) {
    console.error(`\n❌ PostgreSQL connection failed: ${connErr.message}`);
    console.error('👉 Please check DATABASE_URL, database password, or try Supabase Connection Pooler URL (port 6543 / pooler host).\n');
    await pool.end().catch(() => {});
    process.exit(1);
  }

  // STEP 2: Apply DDL Schema
  console.log('\nCreating schema...');
  try {
    const possibleSchemaPaths = [
      resolve(process.cwd(), 'backend', 'migrations', 'pg_schema.sql'),
      resolve(process.cwd(), 'migrations', 'pg_schema.sql')
    ];
    let ddl = '';
    for (const p of possibleSchemaPaths) {
      if (existsSync(p)) {
        ddl = readFileSync(p, 'utf8');
        break;
      }
    }
    if (!ddl) {
      console.error('❌ Lỗi: Không tìm thấy file schema pg_schema.sql.');
      await pool.end().catch(() => {});
      process.exit(1);
    }
    await pool.query(ddl);
    console.log('✅ Schema created successfully.\n');
  } catch (schemaErr) {
    console.error(`❌ Error applying DDL schema: ${schemaErr.message}`);
    await pool.end().catch(() => {});
    process.exit(1);
  }

  // STEP 3: Migrate Data
  const sqlite = new DatabaseSync(sqlitePath);

  const tables = [
    'sgc_migrations',
    'tournaments',
    'categories',
    'players',
    'rankings',
    'matches',
    'admin_sessions',
    'auth_attempts',
    'settings',
    'home_banners',
    'tournament_slides',
    'prizes',
    'details',
    'locks',
    'logs',
    'sync_logs',
    'previews'
  ];

  let hasError = false;

  for (const table of tables) {
    try {
      let rows = [];
      try {
        rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
      } catch {
        console.log(`Migrating ${table}: 0 rows`);
        continue;
      }

      if (!rows || rows.length === 0) {
        console.log(`Migrating ${table}: 0 rows`);
        continue;
      }

      const keys = Object.keys(rows[0]);
      const colsStr = keys.map(k => `"${k}"`).join(', ');

      for (const row of rows) {
        const values = keys.map(k => row[k]);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

        let updateSetStr = '';
        if (table === 'details') {
          updateSetStr = `ON CONFLICT (tid, pid, revision) DO UPDATE SET payload = EXCLUDED.payload`;
        } else if (table === 'matches' && keys.includes('id')) {
          updateSetStr = `ON CONFLICT (id) DO UPDATE SET player_white = EXCLUDED.player_white, player_black = EXCLUDED.player_black, board = EXCLUDED.board, result = EXCLUDED.result, score = EXCLUDED.score, color = EXCLUDED.color`;
        } else if (table === 'rankings' && keys.includes('player_id')) {
          updateSetStr = `ON CONFLICT (player_id) DO UPDATE SET rank = EXCLUDED.rank, points = EXCLUDED.points, buchholz = EXCLUDED.buchholz, sonneborn_berger = EXCLUDED.sonneborn_berger, performance = EXCLUDED.performance, ties_json = EXCLUDED.ties_json`;
        } else if (keys.includes('id')) {
          const updateCols = keys.filter(k => k !== 'id').map(k => `"${k}" = EXCLUDED."${k}"`).join(', ');
          updateSetStr = updateCols ? `ON CONFLICT (id) DO UPDATE SET ${updateCols}` : `ON CONFLICT (id) DO NOTHING`;
        } else if (keys.includes('key')) {
          const updateCols = keys.filter(k => k !== 'key').map(k => `"${k}" = EXCLUDED."${k}"`).join(', ');
          updateSetStr = updateCols ? `ON CONFLICT (key) DO UPDATE SET ${updateCols}` : `ON CONFLICT (key) DO NOTHING`;
        } else if (keys.includes('hash')) {
          const updateCols = keys.filter(k => k !== 'hash').map(k => `"${k}" = EXCLUDED."${k}"`).join(', ');
          updateSetStr = updateCols ? `ON CONFLICT (hash) DO UPDATE SET ${updateCols}` : `ON CONFLICT (hash) DO NOTHING`;
        } else if (keys.includes('name')) {
          updateSetStr = `ON CONFLICT (name) DO NOTHING`;
        } else {
          updateSetStr = `ON CONFLICT DO NOTHING`;
        }

        const queryStr = `INSERT INTO "${table}" (${colsStr}) VALUES (${placeholders}) ${updateSetStr}`;
        await pool.query(queryStr, values);
      }
      console.log(`Migrating ${table}: ${rows.length} rows`);
    } catch (err) {
      console.error(`\n❌ Error migrating ${table}: ${err.message}`);
      hasError = true;
      break;
    }
  }

  await pool.end().catch(() => {});
  sqlite.close();

  if (hasError) {
    console.error('\n❌ Migration failed due to errors.');
    process.exit(1);
  }

  console.log('\nMigration completed successfully');
}

runMigration().catch(err => {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
});
