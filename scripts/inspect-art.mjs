import { textOf, rowsOf } from '../ma-nguon/lib/chess-source.ts';

async function inspectTnr1461992Arts() {
  const arts = [0, 1, 2, 4, 8];

  for (const art of arts) {
    const url = `https://s2.chess-results.com/tnr1461992.aspx?lan=29&art=${art}&zeilen=99999`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    const rows = rowsOf(html);

    const hi = rows.findIndex(r => r.some(c => /name|ten|sno|stnr|rk|rank/i.test(c.text)));
    if (hi >= 0) {
      const headerRow = rows[hi].map(c => c.text).filter(Boolean);
      const dataRows = rows.slice(hi + 1).filter(r => r.length >= 3 && /^\d+$/.test(r[0]?.text || r[1]?.text || ''));
      console.log(`\n=== art=${art} ===`);
      console.log('Header Row (hi=' + hi + '):', headerRow.join(' | '));
      console.log('Data Rows Count:', dataRows.length);
      if (dataRows.length > 0) {
        console.log('Sample Data Row 1:', dataRows[0].map(c => c.text).filter(Boolean).slice(0, 5).join(' | '));
      }
    } else {
      console.log(`\n=== art=${art} === Header Row NOT FOUND! Rows count:`, rows.length);
    }
  }
}

inspectTnr1461992Arts().catch(console.error);
