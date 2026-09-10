async function scanTnrDetails() {
  const results = [];
  for (let id = 1461980; id <= 1462000; id++) {
    try {
      // Fetch ranking list art=1 with zeilen=99999
      const url = `https://chess-results.com/tnr${id}.aspx?lan=1&art=1&zeilen=99999`;
      const res = await fetch(url, { headers: { 'User-Agent': 'ChessFamilyResults/2.0' } });
      const html = await res.text();
      
      const titleMatch = html.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1] || html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '';
      const title = titleMatch.replace(/<[^>]*>/g, '').trim();

      // Count players in table
      const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
      let playerCount = 0;
      for (const r of rows) {
        if (r[1].includes('snr=') || r[1].includes('CR-Ph-Detail')) {
          playerCount++;
        }
      }

      if (title.includes('Cụm 2') || title.includes('Giải Cờ Vua Vui Học Hè') || title.includes('Bảng')) {
        results.push({ id, title, playerCount, url });
      }
    } catch (e) {
      // skip
    }
  }

  console.log('=== MATCHED TOURNAMENTS & CATEGORIES ===');
  console.log(JSON.stringify(results, null, 2));
  console.log(`Total categories found: ${results.length}`);
  const totalPlayers = results.reduce((sum, r) => sum + r.playerCount, 0);
  console.log(`Total players across categories: ${totalPlayers}`);
}

scanTnrDetails().catch(console.error);
