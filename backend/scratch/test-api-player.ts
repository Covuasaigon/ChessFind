import { resolve } from 'node:path';
import { openDatabase } from '../database.ts';
import { createApi } from '../lib/api.ts';

async function main() {
  const dbUrl = process.env.DATABASE_URL || resolve(process.cwd(), 'backend', 'data', 'chess.sqlite');
  console.log('Using DB URL:', dbUrl);
  const db = openDatabase(dbUrl, resolve(process.cwd(), 'backend', 'migrations'));
  const api = createApi(db);

  const req = new Request('http://localhost:3000/api/player?t=1461992&p=1461992-52');
  const res = await api(req, '127.0.0.1');
  const status = res.status;
  const data = await res.json() as any;

  console.log('\n--- API Response Status ---', status);
  console.log('Player name:', data.player?.name);
  console.log('totalGames:', data.totalGames ?? data.player?.totalGames);
  console.log('whiteGames:', data.whiteGames ?? data.player?.whiteGames);
  console.log('blackGames:', data.blackGames ?? data.player?.blackGames);
  console.log('wins:', data.wins ?? data.player?.wins);
  console.log('losses:', data.losses ?? data.player?.losses);
  console.log('rounds count:', data.player?.rounds?.length);

  console.log('\nSample rounds:');
  data.player?.rounds?.forEach((r: any) => {
    console.log(`- Round ${r.round}: vs "${r.opponent}", color="${r.color}", result="${r.result}"`);
  });
}

main().catch(err => console.error(err));
