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

async function testDetectAlgo(inputUrl) {
  console.time('DetectCategories');
  const m = inputUrl.match(/\/tnr(\d+)\.aspx/i);
  if (!m) throw new Error('Invalid URL');
  const targetId = parseInt(m[1], 10);

  // Fetch initial page
  const baseUrl = `https://chess-results.com/tnr${targetId}.aspx?lan=1`;
  const res = await fetch(baseUrl, { headers: { 'User-Agent': 'ChessFamilyResults/2.0' } });
  const html = await res.text();

  const rawTitle = textOf(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || html.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1] || '');
  const cleanTitle = rawTitle.replace(/^Chess-Results Server Chess-results\.com\s*-\s*/i, '').trim();

  // Extract base tournament name by stripping common category prefixes/suffixes
  // E.g. "Bảng Trẻ Nam - Giải Cờ Vua Vui Học Hè Cụm 2 Năm 2026" -> "Giải Cờ Vua Vui Học Hè Cụm 2 Năm 2026"
  const baseName = cleanTitle
    .replace(/^(?:Bảng|Group|Category|Section|Kỳ thủ|Danh sách|Bảng đấu)\s+[^--–]+[-–]\s*/i, '')
    .trim();

  console.log('Target ID:', targetId);
  console.log('Clean Title:', cleanTitle);
  console.log('Extracted Base Name:', baseName);

  const categories = [];
  const range = 35;
  const idsToScan = [];
  for (let offset = -range; offset <= range; offset++) {
    idsToScan.push(targetId + offset);
  }

  // Scan in parallel with concurrency
  const CONCURRENCY = 10;
  const results = [];

  for (let i = 0; i < idsToScan.length; i += CONCURRENCY) {
    const chunk = idsToScan.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map(async (id) => {
        try {
          const u = `https://chess-results.com/tnr${id}.aspx?lan=1&art=1&zeilen=99999`;
          const r = await fetch(u, { headers: { 'User-Agent': 'ChessFamilyResults/2.0' }, signal: AbortSignal.timeout(10000) });
          if (!r.ok) return null;
          const h = await r.text();
          const t = textOf(h.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '');
          const cTitle = t.replace(/^Chess-Results Server Chess-results\.com\s*-\s*/i, '').trim();
          
          if (!cTitle || cTitle.includes('Tournament-Database') || cTitle.includes('Error')) return null;

          // Check if title matches baseName or shares significant substring
          const isMatch = cTitle.includes(baseName) || (baseName.length > 5 && cTitle.includes(baseName.slice(0, 15)));
          if (!isMatch) return null;

          // Extract category name
          let catName = cTitle;
          if (cTitle.includes(' - ')) {
            catName = cTitle.split(' - ')[0].trim();
          }

          // Count players in table
          // Table rows with player link snr=
          const rows = [...h.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
          let playerCount = 0;
          for (const row of rows) {
            if (row[1].includes('snr=') || row[1].includes('CR-Ph-Detail')) {
              playerCount++;
            }
          }

          return {
            id: String(id),
            group: catName,
            fullTitle: cTitle,
            playerCount,
            source: `https://chess-results.com/tnr${id}.aspx?lan=1`
          };
        } catch (err) {
          return null;
        }
      })
    );

    for (const res of chunkResults) {
      if (res) results.push(res);
    }
  }

  // Sort categories by ID or Group name
  results.sort((a, b) => Number(a.id) - Number(b.id));

  console.timeEnd('DetectCategories');
  console.log('\nDetected Categories:');
  console.table(results);

  const totalPlayers = results.reduce((sum, r) => sum + r.playerCount, 0);
  console.log(`Total Categories: ${results.length}`);
  console.log(`Total Players: ${totalPlayers}`);
}

testDetectAlgo('https://chess-results.com/tnr1461992.aspx').catch(console.error);
