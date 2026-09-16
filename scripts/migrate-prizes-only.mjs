import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';
import dns from 'node:dns';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

async function migratePrizesOnly() {
  const pgUrl = process.env.DATABASE_URL;
  if (!pgUrl || (!pgUrl.startsWith('postgres://') && !pgUrl.startsWith('postgresql://'))) {
    console.error('❌ Error: DATABASE_URL is not set or invalid (must start with postgresql://)');
    console.error('👉 Please set $env:DATABASE_URL before running this script.');
    process.exit(1);
  }

  const sqliteCandidates = [
    resolve(process.cwd(), 'data', 'chess.sqlite'),
    resolve(process.cwd(), 'backend', 'data', 'chess.sqlite')
  ];

  let sqlitePath = '';
  for (const cand of sqliteCandidates) {
    if (existsSync(cand)) {
      sqlitePath = cand;
      break;
    }
  }

  if (!sqlitePath) {
    console.error('❌ Error: SQLite local file not found (data/chess.sqlite).');
    process.exit(1);
  }

  const maskedUrl = pgUrl.replace(/:[^:@]+@/, ':****@');
  console.log(`🚀 Connecting to Supabase PostgreSQL (${maskedUrl})...`);

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

  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to Supabase PostgreSQL successfully.');
  } catch (err) {
    console.error('❌ Connection to Supabase PostgreSQL failed:', err.message);
    process.exit(1);
  }

  const sqlite = new DatabaseSync(sqlitePath);
  mkdirSync(resolve(process.cwd(), 'scratch'), { recursive: true });

  // STEP 1: BACKUP
  console.log('\n====================================');
  console.log('BƯỚC 1: BACKUP');
  console.log('====================================');
  
  const sqlitePrizes = sqlite.prepare('SELECT * FROM prizes').all();
  console.log(`SQLite prizes count before migrate: ${sqlitePrizes.length}`);
  writeFileSync(resolve(process.cwd(), 'scratch', 'sqlite_prizes_backup.json'), JSON.stringify(sqlitePrizes, null, 2));
  console.log('💾 SQLite prizes saved to scratch/sqlite_prizes_backup.json');

  let supabasePrizesBefore = [];
  try {
    const res = await pool.query('SELECT * FROM prizes');
    supabasePrizesBefore = res.rows;
  } catch (e) {
    console.log('Supabase prizes table query warning:', e.message);
  }
  console.log(`Supabase prizes count BEFORE migrate: ${supabasePrizesBefore.length}`);
  writeFileSync(resolve(process.cwd(), 'scratch', 'supabase_prizes_backup.json'), JSON.stringify(supabasePrizesBefore, null, 2));
  console.log('💾 Supabase prizes saved to scratch/supabase_prizes_backup.json');

  // STEP 2: SCHEMA CHECK
  console.log('\n====================================');
  console.log('BƯỚC 2: KIỂM TRA SCHEMA');
  console.log('====================================');

  // Ensure table exists on Supabase
  await pool.query(`
    CREATE TABLE IF NOT EXISTS prizes (
      id VARCHAR(255) PRIMARY KEY,
      tournament_id VARCHAR(255) NOT NULL,
      group_name VARCHAR(255) NOT NULL,
      rank_from INT NOT NULL,
      rank_to INT NOT NULL,
      medal VARCHAR(255) NOT NULL,
      prize_name VARCHAR(255) NOT NULL,
      description TEXT,
      created_at VARCHAR(255),
      updated_at VARCHAR(255)
    );
    CREATE INDEX IF NOT EXISTS idx_prizes_tour ON prizes(tournament_id);
  `);

  console.log('✅ Supabase table "prizes" schema verified (id, tournament_id, group_name, rank_from, rank_to, medal, prize_name, description, created_at, updated_at).');

  // STEP 3: MIGRATE ONLY TABLE PRIZES
  console.log('\n====================================');
  console.log('BƯỚC 3: MIGRATE CHỈ TABLE PRIZES');
  console.log('====================================');

  let migratedCount = 0;
  for (const row of sqlitePrizes) {
    await pool.query(`
      INSERT INTO prizes (id, tournament_id, group_name, rank_from, rank_to, medal, prize_name, description, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (id) DO UPDATE SET
        tournament_id = EXCLUDED.tournament_id,
        group_name = EXCLUDED.group_name,
        rank_from = EXCLUDED.rank_from,
        rank_to = EXCLUDED.rank_to,
        medal = EXCLUDED.medal,
        prize_name = EXCLUDED.prize_name,
        description = EXCLUDED.description,
        created_at = EXCLUDED.created_at,
        updated_at = EXCLUDED.updated_at
    `, [
      row.id,
      row.tournament_id,
      row.group_name,
      Number(row.rank_from),
      Number(row.rank_to),
      row.medal,
      row.prize_name,
      row.description || '',
      row.created_at || new Date().toISOString(),
      row.updated_at || new Date().toISOString()
    ]);
    migratedCount++;
  }
  console.log(`✅ Successfully migrated ${migratedCount} prize rows to Supabase PostgreSQL.`);

  // STEP 4: VERIFY
  console.log('\n====================================');
  console.log('BƯỚC 4: VERIFY SUPABASE DATA');
  console.log('====================================');

  const verifyRes = await pool.query("SELECT * FROM prizes WHERE tournament_id = '1461992' ORDER BY rank_from ASC");
  console.log(`Supabase rows for tournament_id '1461992': ${verifyRes.rows.length} rows`);
  console.log(JSON.stringify(verifyRes.rows, null, 2));

  await pool.end();
  sqlite.close();
  console.log('\n✅ Selective migration completed successfully.');
}

migratePrizesOnly().catch(e => {
  console.error('❌ Migration error:', e);
  process.exit(1);
});
