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

function rowsOf(html) {
  return [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m => [...m[1].matchAll(/<t[dh]\b([^>]*)>([\s\S]*?)<\/t[dh]>/gi)].flatMap(c => {
    const col = { text: textOf(c[2]), raw: c[2] };
    const span = Math.min(10, Number(c[1].match(/colspan\s*=\s*["']?(\d+)/i)?.[1] || 1));
    return [col, ...Array.from({ length: span - 1 }, () => ({ text: '', raw: '' }))];
  })).filter(x => x.length);
}

const key = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim().replace(/[.\s:]/g, '');
function findCol(headers, names) { return headers.findIndex(h => names.includes(key(h.text))); }

async function testParserV2() {
  const id = 1461971; // Bảng U7 Nam
  const url = `https://chess-results.com/tnr${id}.aspx?lan=1&art=1&zeilen=99999`;
  let res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
  let html = await res.text();

  if (!html.includes('CR-Ph-Detail') && !html.includes('snr=')) {
    const art0Url = `https://chess-results.com/tnr${id}.aspx?lan=1&art=0&zeilen=99999`;
    res = await fetch(art0Url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    html = await res.text();
  }

  const rows = rowsOf(html);
  const hi = rows.findIndex(r => findCol(r, ['name']) >= 0 && (findCol(r, ['rk', 'rank']) >= 0 || findCol(r, ['sno', 'no']) >= 0));
  console.log('Header Row index:', hi);
  if (hi >= 0) {
    const h = rows[hi];
    console.log('Headers:', h.map((c, i) => `${i}: "${c.text}" (key: "${key(c.text)}")`));
  }

  // Also check player details page (art=9) for a player in tnr1461971
  const playerUrl = `https://chess-results.com/tnr${id}.aspx?lan=1&art=9&snr=27`;
  const pRes = await fetch(playerUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
  const pHtml = await pRes.text();
  const pRows = rowsOf(pHtml);
  console.log('\nPlayer art=9 Details snippet for SNR 27 (Nguyễn Minh Nhật):');
  pRows.slice(0, 25).forEach(r => {
    console.log('   Row:', r.map(c => c.text).filter(Boolean).join(' | '));
  });
}

testParserV2().catch(console.error);
