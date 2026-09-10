async function scanTnrTitles() {
  for (let id = 1461970; id <= 1462010; id++) {
    try {
      const url = `https://chess-results.com/tnr${id}.aspx?lan=1`;
      const res = await fetch(url, { headers: { 'User-Agent': 'ChessFamilyResults/2.0' } });
      const html = await res.text();
      const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '';
      const cleanTitle = titleMatch.replace(/Chess-Results Server Chess-results.com -/i, '').trim();
      if (cleanTitle && !cleanTitle.includes('Tournament-Database')) {
        console.log(`tnr${id}: ${cleanTitle}`);
      }
    } catch (e) {
      // skip
    }
  }
}

scanTnrTitles().catch(console.error);
