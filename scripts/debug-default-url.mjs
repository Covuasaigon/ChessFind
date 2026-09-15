import { rowsOf } from '../ma-nguon/lib/chess-source.ts';

async function checkDefaultUrl() {
  const urls = [
    'https://s2.chess-results.com/tnr1461992.aspx?lan=29',
    'https://s2.chess-results.com/tnr1461992.aspx?lan=29&art=0',
    'https://s2.chess-results.com/tnr1461992.aspx?lan=29&art=1',
    'https://s2.chess-results.com/tnr1461992.aspx?lan=1&art=1',
    'https://s2.chess-results.com/tnr1461992.aspx?lan=1&art=0'
  ];

  for (const u of urls) {
    const res = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    const rows = rowsOf(html);
    console.log(`\nURL: ${u}`);
    console.log('Total Rows:', rows.length);
    rows.forEach((r, idx) => {
      const rowText = r.map(c => c.text).filter(Boolean).join(' | ');
      if (rowText.includes('Tên') || rowText.includes('Name') || rowText.includes('Kỳ thủ') || rowText.includes('1') && rowText.length > 20) {
        if (idx < 25) console.log(`  Row ${idx}:`, rowText.slice(0, 100));
      }
    });
  }
}

checkDefaultUrl().catch(console.error);
