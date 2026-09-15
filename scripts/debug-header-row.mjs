import { rowsOf } from '../ma-nguon/lib/chess-source.ts';

async function checkHeaderRows() {
  const url = 'https://s2.chess-results.com/tnr1461992.aspx?lan=29&art=1&zeilen=99999';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  const rows = rowsOf(html);

  console.log('Total Rows in HTML:', rows.length);
  rows.forEach((r, idx) => {
    const rowText = r.map(c => c.text).filter(Boolean).join(' | ');
    if (/kỳ thủ|ten|name|sbd|sno|rk|rank|stnr|thứ hạng|điểm/i.test(rowText)) {
      console.log(`Row ${idx}:`, rowText.slice(0, 120));
    }
  });
}

checkHeaderRows().catch(console.error);
