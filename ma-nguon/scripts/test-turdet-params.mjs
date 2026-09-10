async function testTurdetParams() {
  const id = 1461992;
  const testParams = [
    'lan=1&art=1&zeilen=99999',
    'lan=1&art=1&zeilen=99999&turdet=0',
    'lan=1&art=1&zeilen=99999&turdet=1',
    'lan=1&art=1&zeilen=99999&turdet=YES',
    'lan=1&art=0&zeilen=99999',
    'lan=1&art=0&turdet=0',
    'lan=1&art=0&turdet=YES',
    'lan=1&art=1&snr=1',
    'lan=1&art=4&zeilen=99999',
    'lan=1&art=8&zeilen=99999'
  ];

  for (const p of testParams) {
    const url = `https://chess-results.com/tnr${id}.aspx?${p}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    const html = await res.text();
    
    // Check for player rows or table rows
    const hasPlayers = html.includes('CR-Ph-Detail') || html.includes('snr=') || html.includes('Starting rank');
    const rowsCount = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].length;
    console.log(`Param: ${p} | Length: ${html.length} | Has Players: ${hasPlayers} | Rows: ${rowsCount}`);
  }
}

testTurdetParams().catch(console.error);
