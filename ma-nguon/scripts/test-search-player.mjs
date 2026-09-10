const catIds = [1461970, 1461971, 1461973, 1461977, 1461981, 1461982, 1461986, 1461987, 1461992];

async function testSearchPlayer() {
  for (const id of catIds) {
    for (const art of [1, 0]) {
      const url = `https://chess-results.com/tnr${id}.aspx?lan=1&art=${art}&zeilen=99999`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
      const html = await res.text();
      if (html.toLowerCase().includes('minh nhật') || html.toLowerCase().includes('nhat')) {
        console.log(`FOUND 'Nhật' in tnr${id} (art=${art})!`);
        const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
        rows.forEach(r => {
          const txt = r[1].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          if (txt.toLowerCase().includes('nhật') || txt.toLowerCase().includes('nhat')) {
            console.log('   MATCH:', txt);
          }
        });
      }
    }
  }
}

testSearchPlayer().catch(console.error);
