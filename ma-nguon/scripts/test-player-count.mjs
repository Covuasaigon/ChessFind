async function testPlayerCount() {
  const ids = [1461970, 1461971, 1461973, 1461977, 1461981, 1461982, 1461986, 1461987, 1461992];

  for (const id of ids) {
    // Try fetching with art=1&zeilen=99999
    const url = `https://chess-results.com/tnr${id}.aspx?lan=1&art=1&zeilen=99999`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    const html = await res.text();

    // Check player count in html
    const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
    let count = 0;
    for (const r of rows) {
      if (r[1].includes('snr=') || r[1].includes('CR-Ph-Detail')) {
        count++;
      }
    }

    const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '';
    const cleanTitle = titleMatch.replace(/Chess-Results Server Chess-results\.com\s*-\s*/i, '').trim();

    console.log(`tnr${id} -> count: ${count} | title: ${cleanTitle}`);
    if (count === 0) {
      // Check why count is 0, print snippet
      console.log(`   tnr${id} html snippet:`, html.slice(0, 1500));
    }
  }
}

testPlayerCount().catch(console.error);
