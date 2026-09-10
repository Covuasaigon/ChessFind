const entities = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", frac12: '½' };
function textOf(s) {
  return s.replace(/<[^>]*>/g, ' ').replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (_, x) => {
    if (x[0] === '#') {
      const n = x[1].toLowerCase() === 'x' ? parseInt(x.slice(2), 16) : parseInt(x.slice(1), 10);
      return n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
    }
    return entities[x] ?? ' ';
  }).replace(/\s+/g, ' ').trim();
}

const catIds = [1461970, 1461971, 1461973, 1461977, 1461981, 1461982, 1461986, 1461987, 1461992];

async function testSearchPlayer2() {
  for (const id of catIds) {
    const url = `https://chess-results.com/tnr${id}.aspx?lan=1&art=0&zeilen=99999`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    const rawHtml = await res.text();
    const cleanText = textOf(rawHtml);

    if (cleanText.toLowerCase().includes('nhat') || cleanText.toLowerCase().includes('nhật')) {
      console.log(`\nFOUND 'Nhật' in tnr${id}!`);
      // Find all matches
      const rows = [...rawHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
      rows.forEach(r => {
        const txt = textOf(r[1]);
        if (txt.toLowerCase().includes('nhật') || txt.toLowerCase().includes('nhat')) {
          console.log(`   tnr${id} match:`, txt);
        }
      });
    }
  }
}

testSearchPlayer2().catch(console.error);
