async function testTurnierDB2() {
  const url = 'https://chess-results.com/TurnierDB.aspx?lan=1';

  const r1 = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
  const html1 = await r1.text();

  const viewstate = html1.match(/id="__VIEWSTATE"\s+value="([^"]+)"/)?.[1] || '';
  const viewstategen = html1.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]+)"/)?.[1] || '';
  const eventvalidation = html1.match(/id="__EVENTVALIDATION"\s+value="([^"]+)"/)?.[1] || '';

  // Input fields in form:
  // ctl00$P1$txt_turnier (Tournament name)
  // ctl00$P1$txt_autor (Organizer / creator)
  // ctl00$P1$cb_suchen (Button Search)

  const searchPayload = async (turnier, autor) => {
    const body = new URLSearchParams({
      '__EVENTTARGET': '',
      '__EVENTARGUMENT': '',
      '__VIEWSTATE': viewstate,
      '__VIEWSTATEGENERATOR': viewstategen,
      '__EVENTVALIDATION': eventvalidation,
      'ctl00$P1$txt_turnier': turnier,
      'ctl00$P1$txt_sparte': '',
      'ctl00$P1$txt_autor': autor,
      'ctl00$P1$cb_suchen': 'Search'
    });

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': url
      },
      body: body.toString()
    });

    const h = await r.text();
    const links = [...h.matchAll(/<a\b[^>]*href=["']([^"']*tnr\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)];
    console.log(`Search turnier="${turnier}" autor="${autor}" -> total tnr links: ${links.length}`);
    links.forEach(l => {
      console.log('   LINK:', l[1], '-->', l[2].replace(/<[^>]*>/g, '').trim());
    });
  };

  await searchPayload('Giải Cờ Vua Vui Học Hè Cụm 2', '');
  await searchPayload('', 'Co Vua Sai Gon');
  await searchPayload('Cụm 2 Năm 2026', '');
}

testTurnierDB2().catch(console.error);
