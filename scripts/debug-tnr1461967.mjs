import { detectCategories, validateSource, fetchSourceWithRetry } from '../ma-nguon/lib/chess-source.ts';

async function run() {
  const url = 'https://s2.chess-results.com/tnr1461967.aspx?lan=29';
  console.log('=== DEBUGGING URL:', url, '===');
  const res = await detectCategories(url);
  console.log('\nMAIN NAME:', res.mainName);
  console.log('CATEGORIES COUNT:', res.categories.length);
  console.log('CATEGORIES LIST:', res.categories.map(c => `${c.id}:${c.group}(${c.playerCount})`).join(', '));
  
  if (!res.categories.some(c => c.id === '1461992')) {
    console.error('❌ MISSING tnr1461992!');
  } else {
    console.log('✓ tnr1461992 IS PRESENT!');
  }
}

run().catch(console.error);
