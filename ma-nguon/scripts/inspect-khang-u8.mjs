import { getDb } from '../lib/db.js';
import { createApi } from '../lib/api.js';

const db = getDb();
const api = createApi(db);

async function inspectRealDb() {
  console.log('--- 1. CHECK ALL PRIZES IN DATABASE ---');
  const prizes = await db.prepare('SELECT * FROM prizes').all();
  console.log('Prizes count in DB:', prizes.results?.length);
  console.log('Prizes data:', JSON.stringify(prizes.results, null, 2));

  console.log('\n--- 2. CHECK TOURNAMENTS IN DATABASE ---');
  const tRes = await api(new Request('http://localhost:3000/api/tournaments'));
  const tData = await tRes.json();
  const tourneys = tData.tournaments || [];
  console.log('Tournaments count:', tourneys.length);

  for (const t of tourneys) {
    console.log(`Tournament ID: ${t.id}, Name: ${t.name}, Group: ${t.group}, Players: ${t.players?.length}, Prizes count: ${t.prizes?.length}`);
    if (t.id.includes('1461973') || t.name.includes('U8') || t.group?.includes('U8')) {
      console.log('\n========================================');
      console.log('MATCHED TOURNAMENT U8:', t.id, t.name, 'group:', t.group);
      console.log('Tournament prizes on object:', JSON.stringify(t.prizes, null, 2));
      const khang = t.players?.find((p) => p.name.includes('Vũ Bảo Khang') || p.snr === 37 || p.snr === '37');
      const rank1 = t.players?.find((p) => p.rank === 1);
      console.log('Rank 1 player:', rank1 ? `${rank1.name} (SBD ${rank1.snr}, Rank ${rank1.rank}, ID ${rank1.id})` : 'Not found');
      console.log('Vũ Bảo Khang:', khang ? `${khang.name} (SBD ${khang.snr}, Rank ${khang.rank}, ID ${khang.id})` : 'Not found');

      if (khang) {
        console.log('\n>>> CALLING /api/player FOR KHANG <<<');
        const rKhang = await api(new Request(`http://localhost:3000/api/player?t=${encodeURIComponent(t.id)}&p=${encodeURIComponent(khang.id)}`));
        const dKhang = await rKhang.json();
        console.log('Khang player response detailsLoaded/medalPrediction:');
        console.log('rank:', dKhang.player?.rank);
        console.log('categoryName:', dKhang.player?.categoryName);
        console.log('medalPrediction:', JSON.stringify(dKhang.player?.medalPrediction, null, 2));
      }

      if (rank1) {
        console.log('\n>>> CALLING /api/player FOR RANK 1 <<<');
        const r1 = await api(new Request(`http://localhost:3000/api/player?t=${encodeURIComponent(t.id)}&p=${encodeURIComponent(rank1.id)}`));
        const d1 = await r1.json();
        console.log('Rank 1 player response detailsLoaded/medalPrediction:');
        console.log('rank:', d1.player?.rank);
        console.log('categoryName:', d1.player?.categoryName);
        console.log('medalPrediction:', JSON.stringify(d1.player?.medalPrediction, null, 2));
      }
    }
  }
}

inspectRealDb().catch(console.error);
