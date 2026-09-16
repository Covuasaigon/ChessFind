import assert from 'node:assert';
import { resolve } from 'node:path';
import { openDatabase } from '../portable/database.ts';
import { createApi } from '../lib/api.ts';

async function digest(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function main() {
  console.log('--- STARTING BULK DELETE PRIZES TESTS ---');
  const dbFile = resolve(process.cwd(), 'backend', 'data', 'chess.sqlite');
  const db = openDatabase(dbFile, resolve(process.cwd(), 'backend', 'migrations'));
  const api = createApi(db);

  const now = new Date().toISOString();

  // Create valid admin session
  const testToken = '1234567890123456789012345678901234567890123456789012345678901234';
  const tokenHash = await digest(testToken);
  await db.prepare('INSERT INTO admin_sessions (hash, csrf, expires) VALUES (?, ?, ?) ON CONFLICT(hash) DO UPDATE SET expires = excluded.expires').bind(tokenHash, 'test_csrf', Date.now() + 3600000).run();

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${testToken}`,
    'X-CSRF-Token': 'test_csrf'
  };

  // Reset prizes table and insert 5 dummy prizes
  await db.prepare('DELETE FROM prizes').run();
  const dummyPrizes = [
    { id: 'prize_test_1', tournament_id: '1461986', group_name: 'Bảng U11', rank_from: 1, rank_to: 1, medal: 'Gold', prize_name: 'Vàng' },
    { id: 'prize_test_2', tournament_id: '1461986', group_name: 'Bảng U11', rank_from: 2, rank_to: 2, medal: 'Silver', prize_name: 'Bạc' },
    { id: 'prize_test_3', tournament_id: '1461986', group_name: 'Bảng U11', rank_from: 3, rank_to: 3, medal: 'Bronze', prize_name: 'Đồng' },
    { id: 'prize_test_4', tournament_id: '1461986', group_name: 'Bảng U11', rank_from: 4, rank_to: 5, medal: 'Certificate', prize_name: 'Khuyến Khích' },
    { id: 'prize_test_5', tournament_id: '1461986', group_name: 'Bảng U11', rank_from: 6, rank_to: 10, medal: 'Certificate', prize_name: 'Top 10' }
  ];

  for (const p of dummyPrizes) {
    await db.prepare(`
      INSERT INTO prizes (id, tournament_id, group_name, rank_from, rank_to, medal, prize_name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(p.id, p.tournament_id, p.group_name, p.rank_from, p.rank_to, p.medal, p.prize_name, '', now, now).run();
  }

  const initialCount = (await db.prepare('SELECT COUNT(*) as count FROM prizes').first<{ count: number }>())?.count;
  assert.equal(initialCount, 5, 'Should have 5 initial dummy prizes');
  console.log('✓ Initial setup: 5 dummy prizes inserted');

  // TEST 1: Xóa 1 dòng (Delete 1 item)
  console.log('\n--- TEST 1: Xóa 1 dòng (Deleting prize_test_1) ---');
  let req = new Request('http://localhost:3000/api/prizes/bulk-delete', {
    method: 'DELETE',
    headers: authHeaders,
    body: JSON.stringify({ ids: ['prize_test_1'] })
  });
  let res = await api(req, '127.0.0.1');
  let data = await res.json() as any;
  assert.equal(res.status, 200, 'Status should be 200');
  assert.equal(data.deletedCount, 1, 'Should delete 1 item');
  const countAfter1 = (await db.prepare('SELECT COUNT(*) as count FROM prizes').first<{ count: number }>())?.count;
  assert.equal(countAfter1, 4, 'Remaining prizes should be 4');
  console.log('✓ Test 1 Passed: Xóa 1 dòng thành công!');

  // TEST 2: Xóa nhiều dòng (Delete 2 items: prize_test_2 and prize_test_3)
  console.log('\n--- TEST 2: Xóa nhiều dòng (Deleting prize_test_2 & prize_test_3) ---');
  req = new Request('http://localhost:3000/api/prizes/bulk-delete', {
    method: 'DELETE',
    headers: authHeaders,
    body: JSON.stringify({ ids: ['prize_test_2', 'prize_test_3'] })
  });
  res = await api(req, '127.0.0.1');
  data = await res.json() as any;
  assert.equal(res.status, 200, 'Status should be 200');
  assert.equal(data.deletedCount, 2, 'Should delete 2 items');
  const countAfter2 = (await db.prepare('SELECT COUNT(*) as count FROM prizes').first<{ count: number }>())?.count;
  assert.equal(countAfter2, 2, 'Remaining prizes should be 2');
  console.log('✓ Test 2 Passed: Xóa nhiều dòng thành công!');

  // TEST 3: Xóa toàn bộ cơ cấu (Delete all remaining items: prize_test_4 & prize_test_5)
  console.log('\n--- TEST 3: Xóa toàn bộ cơ cấu còn lại (Deleting prize_test_4 & prize_test_5) ---');
  req = new Request('http://localhost:3000/api/prizes/bulk-delete', {
    method: 'DELETE',
    headers: authHeaders,
    body: JSON.stringify({ ids: ['prize_test_4', 'prize_test_5'] })
  });
  res = await api(req, '127.0.0.1');
  data = await res.json() as any;
  assert.equal(res.status, 200, 'Status should be 200');
  assert.equal(data.deletedCount, 2, 'Should delete all remaining items');
  const finalCount = (await db.prepare('SELECT COUNT(*) as count FROM prizes').first<{ count: number }>())?.count;
  assert.equal(finalCount, 0, 'Remaining prizes should be 0');
  console.log('✓ Test 3 Passed: Xóa toàn bộ cơ cấu thành công!');

  console.log('\n✅ ALL BULK DELETE PRIZE TESTS PASSED WITH 0 ERRORS!');
}

main().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
