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

async function fetchPage(urlStr) {
  // Try direct GET art=1
  let res = await fetch(urlStr, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
  let html = await res.text();
  
  // Check if page contains player rows
  const rows = rowsOf(html);
  const hi = rows.findIndex(r => findCol(r, ['name']) >= 0 && (findCol(r, ['rk', 'rank']) >= 0 || findCol(r, ['sno', 'no']) >= 0));
  
  if (hi >= 0) return html;

  // If art=1 failed to show table, try art=0 or POST LinkButton2
  const art0Url = urlStr.replace('art=1', 'art=0');
  res = await fetch(art0Url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
  html = await res.text();
  return html;
}

async function testParseAllCats() {
  const catIds = [1461970, 1461971, 1461973, 1461977, 1461981, 1461982, 1461986, 1461987, 1461992];
  let grandTotalPlayers = 0;

  for (const id of catIds) {
    const url = `https://chess-results.com/tnr${id}.aspx?lan=1&art=1&zeilen=99999`;
    const html = await fetchPage(url);
    const rows = rowsOf(html);

    const hi = rows.findIndex(r => findCol(r, ['name']) >= 0 && (findCol(r, ['rk', 'rank']) >= 0 || findCol(r, ['sno', 'no']) >= 0));
    if (hi < 0) {
      console.log(`tnr${id} -> FAILED TO PARSE ROWS`);
      continue;
    }

    const h = rows[hi];
    const ni = findCol(h, ['name']);
    const si = findCol(h, ['sno', 'no']);

    const players = [];
    const seen = new Set();

    for (const row of rows.slice(hi + 1)) {
      if (findCol(row, ['name']) >= 0) continue;
      if (row.length < h.length || !row[ni]?.text) continue;
      const link = row[ni].raw.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
      const snr = link ? new URL(textOf(link), url).searchParams.get('snr') : row[si]?.text;
      if (!snr || !/^\d+$/.test(snr)) continue;
      if (seen.has(snr)) continue;
      seen.add(snr);
      players.push({ snr, name: row[ni].text });
    }

    const title = textOf(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/Chess-Results Server Chess-results\.com\s*-\s*/i, '').trim();
    console.log(`tnr${id} (${title}) -> parsed ${players.length} players`);
    grandTotalPlayers += players.length;
  }

  console.log(`\nGrand Total Players across all categories: ${grandTotalPlayers}`);
}

testParseAllCats().catch(console.error);
