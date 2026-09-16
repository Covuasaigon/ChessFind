import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('./backend/data/chess.sqlite');

try {
  const pzStruct = db.prepare('SELECT * FROM prize_structures').all();
  console.log('\n--- PRIZE_STRUCTURES TABLE ---');
  console.log('Count:', pzStruct.length);
  console.log('Rows:', JSON.stringify(pzStruct, null, 2));
} catch (e) {
  console.log('Error querying prize_structures:', e.message);
}

try {
  const tours = db.prepare('SELECT id, payload FROM tournaments').all();
  for (const t of tours) {
    try {
      const p = JSON.parse(t.payload);
      if (p.prizes && p.prizes.length > 0) {
        console.log(`\nTournament ID ${t.id} has ${p.prizes.length} prizes in payload:`, JSON.stringify(p.prizes, null, 2));
      }
    } catch {}
  }
} catch (e) {
  console.log('Error querying tournaments payload:', e.message);
}
