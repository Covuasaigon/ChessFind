import { openDatabase } from '../portable/database.ts';
import { importTournament, importPlayer } from '../lib/chess-source.ts';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dbFile = resolve(root, process.env.DATA_DIR || '../data', 'chess.sqlite');
const migrationsDir = resolve(root, '../migrations');

console.log(`=== RE-IMPORTING EXISTING TOURNAMENTS ===`);
console.log(`Database: ${dbFile}`);

try {
  const db = openDatabase(dbFile, migrationsDir);
  const toursRes = await db.prepare("SELECT * FROM tournaments").all();
  const tournaments = toursRes.results || [];

  console.log(`Found ${tournaments.length} existing tournaments in database.`);

  for (const tRow of tournaments) {
    if (!tRow.source || !tRow.source.includes('chess-results.com')) continue;
    console.log(`\nRe-syncing tournament: ${tRow.name} (${tRow.id})...`);
    try {
      const tour = await importTournament(tRow.source, tRow.group || 'Toàn giải');
      console.log(`  ✓ Updated ranking for ${tour.players.length} players.`);

      // Update cached player details if present in database
      const detailsRes = await db.prepare("SELECT pid, payload FROM details WHERE tid = ?").all({ args: [tRow.id] });
      const cachedDetails = detailsRes.results || [];

      for (const pRow of cachedDetails) {
        const pObj = JSON.parse(pRow.payload);
        const playerInTour = tour.players.find(x => x.snr === pObj.snr) || pObj;
        try {
          console.log(`  Updating matches & details for player ${playerInTour.name}...`);
          const updatedPlayer = await importPlayer(tour, playerInTour);

          // Update matches table
          for (const rd of updatedPlayer.rounds) {
            const matchId = `${updatedPlayer.id}-rd${rd.round}`;
            await db.prepare(`
              INSERT INTO matches (id, category_id, player_id, player_white, player_black, round, board, result, score, color, opponent_id, opponent_name)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                player_white = excluded.player_white,
                player_black = excluded.player_black,
                board = excluded.board,
                result = excluded.result,
                score = excluded.score,
                color = excluded.color
            `).bind(matchId, playerInTour.categoryId || tRow.id, updatedPlayer.id, rd.playerWhite || null, rd.playerBlack || null, rd.round, rd.board || null, rd.result || null, rd.score, rd.color || null, rd.opponentId || null, rd.opponent || null).run();
          }

          // Update details table
          await db.prepare('INSERT INTO details (tid,pid,revision,payload) VALUES (?,?,?,?) ON CONFLICT(tid,pid,revision) DO UPDATE SET payload=excluded.payload')
            .bind(tRow.id, pRow.pid, tour.updated, JSON.stringify(updatedPlayer)).run();
        } catch (pErr) {
          console.warn(`  ⚠️ Could not update player ${pObj.name}: ${pErr.message}`);
        }
      }
    } catch (tErr) {
      console.error(`  ❌ Failed to re-sync tournament ${tRow.name}:`, tErr.message);
    }
  }

  db.close();
  console.log('\n🎉 Re-import completed successfully!');
} catch (err) {
  console.error('❌ Re-import script failed:', err);
}
