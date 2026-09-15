import { normalize } from '../ma-nguon/lib/chess.ts';

async function check() {
  const u29 = 'https://s2.chess-results.com/tnr1461967.aspx?lan=29';
  const u1_992 = 'https://s2.chess-results.com/tnr1461992.aspx?lan=1';

  const r29 = await fetch(u29, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const h29 = await r29.text();
  const t29 = h29.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '';

  const r1 = await fetch(u1_992, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const h1 = await r1.text();
  const t1 = h1.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '';

  console.log('Title lan=29 (tnr1461967):', t29);
  console.log('Title lan=1 (tnr1461992):', t1);

  console.log('Normalized Title lan=29:', normalize(t29));
  console.log('Normalized Title lan=1:', normalize(t1));
}

check().catch(console.error);
