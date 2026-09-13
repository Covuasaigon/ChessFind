import { DatabaseSync } from 'node:sqlite';
import pg from 'pg';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

async function migrateImages() {
  const pgUrl = process.env.DATABASE_URL;
  const isPg = pgUrl && (pgUrl.startsWith('postgres://') || pgUrl.startsWith('postgresql://'));

  console.log('🚀 Bắt đầu chuyển đổi hình ảnh local sang Cloud/Data URLs...');

  const root = process.cwd();
  const getFileBuffer = (localPath) => {
    const cleanPath = localPath.replace(/^https?:\/\/[^\/]+/, '').replace(/^\//, '');
    const possibleFiles = [
      resolve(root, cleanPath),
      resolve(root, 'backend', cleanPath),
      resolve(root, 'public', cleanPath),
      resolve(root, 'web', cleanPath),
      resolve(root, 'backend/uploads/banner', cleanPath.split('/').pop())
    ];
    for (const f of possibleFiles) {
      try {
        if (existsSync(f)) {
          return { buffer: readFileSync(f), ext: f.split('.').pop() || 'png' };
        }
      } catch {}
    }
    return null;
  };

  const toDataUrl = (fileInfo) => {
    const mimeType = fileInfo.ext === 'png' ? 'image/png' : fileInfo.ext === 'webp' ? 'image/webp' : 'image/jpeg';
    return `data:${mimeType};base64,${fileInfo.buffer.toString('base64')}`;
  };

  if (isPg) {
    const pool = new pg.Pool({
      connectionString: pgUrl,
      ssl: process.env.NODE_ENV === 'production' ||
           pgUrl.includes('render.com') ||
           pgUrl.includes('supabase') ||
           pgUrl.includes('neon') ||
           pgUrl.includes('railway') ||
           process.env.PGSSLMODE === 'require' ||
           process.env.PGSSLMODE === 'no-verify' ? { rejectUnauthorized: false } : false
    });

    const banners = await pool.query("SELECT id, image_url FROM home_banners WHERE image_url LIKE '/uploads/%' OR image_url LIKE 'http%://%/uploads/%'");
    for (const row of banners.rows) {
      const fileInfo = getFileBuffer(row.image_url);
      if (fileInfo) {
        const dataUrl = toDataUrl(fileInfo);
        await pool.query('UPDATE home_banners SET image_url = $1 WHERE id = $2', [dataUrl, row.id]);
        console.log(`✅ Cập nhật banner PG [${row.id}] sang persistent Data URL.`);
      }
    }

    const slides = await pool.query("SELECT id, image_url FROM tournament_slides WHERE image_url LIKE '/uploads/%' OR image_url LIKE 'http%://%/uploads/%'");
    for (const row of slides.rows) {
      const fileInfo = getFileBuffer(row.image_url);
      if (fileInfo) {
        const dataUrl = toDataUrl(fileInfo);
        await pool.query('UPDATE tournament_slides SET image_url = $1 WHERE id = $2', [dataUrl, row.id]);
        console.log(`✅ Cập nhật slide PG [${row.id}] sang persistent Data URL.`);
      }
    }

    await pool.end();
  }

  const sqliteCandidates = [
    resolve(root, 'data', 'chess.sqlite'),
    resolve(root, 'backend', 'data', 'chess.sqlite')
  ];

  for (const sqlitePath of sqliteCandidates) {
    if (existsSync(sqlitePath)) {
      const sqlite = new DatabaseSync(sqlitePath);
      try {
        const banners = sqlite.prepare("SELECT id, image_url FROM home_banners WHERE image_url LIKE '/uploads/%' OR image_url LIKE 'http%://%/uploads/%'").all();
        for (const row of banners) {
          const fileInfo = getFileBuffer(row.image_url);
          if (fileInfo) {
            const dataUrl = toDataUrl(fileInfo);
            sqlite.prepare('UPDATE home_banners SET image_url = ? WHERE id = ?').run(dataUrl, row.id);
            console.log(`✅ Cập nhật banner SQLite [${row.id}] sang persistent Data URL.`);
          }
        }

        const slides = sqlite.prepare("SELECT id, image_url FROM tournament_slides WHERE image_url LIKE '/uploads/%' OR image_url LIKE 'http%://%/uploads/%'").all();
        for (const row of slides) {
          const fileInfo = getFileBuffer(row.image_url);
          if (fileInfo) {
            const dataUrl = toDataUrl(fileInfo);
            sqlite.prepare('UPDATE tournament_slides SET image_url = ? WHERE id = ?').run(dataUrl, row.id);
            console.log(`✅ Cập nhật slide SQLite [${row.id}] sang persistent Data URL.`);
          }
        }
      } catch (err) {
        console.warn(`⚠️ Warning SQLite image migration: ${err.message}`);
      }
      sqlite.close();
    }
  }

  console.log('🎉 MIGRATE HÌNH ẢNH SANG PERSISTENT STORAGE HOÀN TẤT!');
}

migrateImages().catch(err => {
  console.error('❌ Lỗi migrate hình ảnh:', err);
  process.exit(1);
});
