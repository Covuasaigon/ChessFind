async function testTnrRange() {
  // Check tnr1461990 to tnr1462000
  for (let id = 1461985; id <= 1462000; id++) {
    try {
      const url = `https://chess-results.com/tnr${id}.aspx?lan=1`;
      const res = await fetch(url, { headers: { 'User-Agent': 'ChessFamilyResults/2.0' } });
      const text = await res.text();
      const titleMatch = text.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.replace(/Chess-Results Server Chess-results.com -/i, '').trim();
      const h2Match = text.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1]?.replace(/<[^>]*>/g, '').trim();
      console.log(`tnr${id} -> title: ${titleMatch || h2Match || 'N/A'}`);
    } catch (e) {
      console.log(`tnr${id} -> error: ${e.message}`);
    }
  }
}

testTnrRange().catch(console.error);
