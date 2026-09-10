import { openDatabase } from '../portable/database.ts';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dbFile = resolve(root, process.env.DATA_DIR || '../data', 'chess.sqlite');
const migrationsDir = resolve(root, '../migrations');

console.log(`Đang khởi tạo cơ sở dữ liệu SQLite tại: ${dbFile}`);
console.log(`Áp dụng migrations từ: ${migrationsDir}`);

try {
  const db = openDatabase(dbFile, migrationsDir);
  console.log('✓ Khởi tạo bảng dữ liệu thành công!');
  
  // Verify tables
  const tablesResult = await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const tableNames = tablesResult.results.map((r) => r.name);
  console.log('Các bảng hiện có trong database:', tableNames.join(', '));
  
  db.close();
  console.log('🎉 npm run init-db hoàn thành tốt đẹp!');
} catch (err) {
  console.error('❌ Lỗi khởi tạo cơ sở dữ liệu:', err.message);
  process.exit(1);
}
