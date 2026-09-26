import assert from 'node:assert';
import { resolve } from 'node:path';
import { openDatabase } from '../portable/database';
import { createApi } from '../lib/api';

async function digest(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function main() {
  console.log('--- STARTING BULK PRIZE APPLY MULTI TOURNAMENT TEST ---');
  const dbFile = resolve(process.cwd(), 'data', 'chess.sqlite');
  const db = openDatabase(dbFile, resolve(process.cwd(), 'migrations'));
  const api = createApi(db);

  // Setup admin session
  const testToken = '1234567890123456789012345678901234567890123456789012345678901234';
  const tokenHash = await digest(testToken);
  await db.prepare('INSERT INTO admin_sessions (hash, csrf, expires) VALUES (?, ?, ?) ON CONFLICT(hash) DO UPDATE SET expires = excluded.expires').bind(tokenHash, 'test_csrf', Date.now() + 3600000).run();

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${testToken}`,
    'X-CSRF-Token': 'test_csrf'
  };

  const selectedTournamentIds = ["1461970", "1461982", "1461992"];

  const payload = {
    targets: selectedTournamentIds.map(id => ({ tournament_id: id, group_name: 'Tất cả' })),
    rules: [
      { rank_from: 1, rank_to: 1, medal: 'Gold Medal', prize_name: 'Cúp Vô Địch + Huy Chương Vàng', description: 'Giải Nhất' },
      { rank_from: 2, rank_to: 2, medal: 'Silver Medal', prize_name: 'Huy Chương Bạc', description: 'Giải Nhì' },
      { rank_from: 3, rank_to: 4, medal: 'Bronze Medal', prize_name: 'Huy Chương Đồng', description: 'Giải Ba' },
      { rank_from: 5, rank_to: 10, medal: 'Other', prize_name: 'Khuyến khích', description: 'Giải Khuyến Khích' }
    ],
    conflictStrategy: 'overwrite'
  };

  console.log('Sending Bulk Apply request for IDs:', selectedTournamentIds);
  const req = new Request('http://localhost:3000/api/admin/prizes/bulk', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(payload)
  });

  const res = await api(req, '127.0.0.1');
  const resData = await res.json() as any;
  console.log('API Bulk Apply response status:', res.status, resData.message);
  assert.equal(res.status, 200, 'Status should be 200');

  // Verify rows in DB for each selected tournament ID
  for (const tourId of selectedTournamentIds) {
    const rows = await db.prepare('SELECT * FROM prizes WHERE tournament_id = ? ORDER BY rank_from ASC').bind(tourId).all<any>();
    const count = (rows.results || []).length;
    console.log(`Tournament ${tourId} -> Prize Rows Count: ${count}`);
    assert.equal(count, 4, `Tournament ${tourId} must have exactly 4 prize rows`);

    const r1 = rows.results.find((r: any) => r.rank_from === 1 && r.rank_to === 1);
    assert.ok(r1, `Rank 1 rule must exist for ${tourId}`);
    assert.equal(r1.prize_name, 'Cúp Vô Địch + Huy Chương Vàng');

    const r2 = rows.results.find((r: any) => r.rank_from === 2 && r.rank_to === 2);
    assert.ok(r2, `Rank 2 rule must exist for ${tourId}`);
    assert.equal(r2.prize_name, 'Huy Chương Bạc');

    const r3 = rows.results.find((r: any) => r.rank_from === 3 && r.rank_to === 4);
    assert.ok(r3, `Rank 3-4 rule must exist for ${tourId}`);

    const r5 = rows.results.find((r: any) => r.rank_from === 5 && r.rank_to === 10);
    assert.ok(r5, `Rank 5-10 rule must exist for ${tourId}`);
  }

  // TEST IDEMPOTENCY / NO DUPLICATES ON SECOND BULK APPLY
  console.log('\nTesting Idempotency (re-applying bulk rules)...');
  const req2 = new Request('http://localhost:3000/api/admin/prizes/bulk', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(payload)
  });
  const res2 = await api(req2, '127.0.0.1');
  assert.equal(res2.status, 200);

  for (const tourId of selectedTournamentIds) {
    const rows = await db.prepare('SELECT * FROM prizes WHERE tournament_id = ? ORDER BY rank_from ASC').bind(tourId).all<any>();
    const count = (rows.results || []).length;
    console.log(`After second apply: Tournament ${tourId} -> Prize Rows Count: ${count}`);
    assert.equal(count, 4, `Tournament ${tourId} must still have exactly 4 rows (no duplicates)`);
  }

  console.log('\n✅ ALL BULK PRIZE APPLY MULTI TESTS PASSED!');
}

main().catch(err => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
