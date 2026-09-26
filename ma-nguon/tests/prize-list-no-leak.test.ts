import assert from 'node:assert';
import { resolve } from 'node:path';
import { openDatabase } from '../portable/database';
import { createApi } from '../lib/api';

async function main() {
  console.log('--- STARTING PRIZE LIST NO-LEAK TEST ---');
  const dbFile = resolve(process.cwd(), 'data', 'chess.sqlite');
  const db = openDatabase(dbFile, resolve(process.cwd(), 'migrations'));
  const api = createApi(db);

  // Clear prizes & tournaments in sqlite for test isolation or test with real DB
  const req = new Request('http://localhost:3000/api/tournaments');
  const res = await api(req);
  const data = await res.json() as any;

  assert.equal(res.status, 200, 'Status should be 200');
  assert.ok(Array.isArray(data.tournaments), 'tournaments should be an array');

  // Verify tournament 1461970 (has 4 prizes in SQLite)
  const tourA = data.tournaments.find((t: any) => t.id === '1461970');
  assert.ok(tourA, 'Tournament 1461970 should exist');
  assert.equal(tourA.prizes.length, 4, 'Tournament 1461970 must have 4 prize rules');

  // Check field normalization for tourA rules
  for (const rule of tourA.prizes) {
    assert.equal(typeof rule.rankFrom, 'number', 'rankFrom must be a number');
    assert.equal(typeof rule.rankTo, 'number', 'rankTo must be a number');
    assert.ok(rule.prizeName, 'prizeName must be present');
    assert.ok(rule.medal, 'medal must be present');
    assert.equal(rule.tournamentId, '1461970', 'rule tournamentId must match tourA.id');
  }

  // Create dummy tournament B without prizes in DB payload
  const dummyTourB = {
    id: '9999999',
    name: 'Giải Test B Không Có Giải Thưởng',
    group: 'Bảng Test B',
    rounds: 5
  };
  await db.prepare("INSERT INTO tournaments (id, payload, published, updated) VALUES (?, ?, 1, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload").bind('9999999', JSON.stringify(dummyTourB), new Date().toISOString()).run();

  // Call GET /api/tournaments again
  const res2 = await api(req);
  const data2 = await res2.json() as any;
  const tourB = data2.tournaments.find((t: any) => t.id === '9999999');
  assert.ok(tourB, 'Tournament 9999999 should exist');

  console.log(`Tournament A (1461970) prizes.length = ${tourA.prizes.length}`);
  console.log(`Tournament B (9999999) prizes.length = ${tourB.prizes ? tourB.prizes.length : 0}`);

  // Assert Tournament B has 0 prizes (no fallback / no leak from Tournament A)
  assert.equal(tourB.prizes.length, 0, 'Tournament B with 0 prize rules in DB must have prizes.length === 0 (NO LEAK FROM OTHER TOURNAMENTS)');

  // Clean up test tournament B
  await db.prepare("DELETE FROM tournaments WHERE id = '9999999'").run();

  console.log('✅ PRIZE LIST NO-LEAK TEST PASSED SUCCESSFULLY!');
}

main().catch(err => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
