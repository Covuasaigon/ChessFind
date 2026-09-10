async function testTurnierDB() {
  // Let's test searching TurnierDB.aspx for "Giải Cờ Vua Vui Học Hè Cụm 2"
  const url = 'https://chess-results.com/TurnierDB.aspx?lan=1';

  // Fetch initial page to get ASP.NET ViewState
  const r1 = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
  const html1 = await r1.text();

  const viewstate = html1.match(/id="__VIEWSTATE"\s+value="([^"]+)"/)?.[1] || '';
  const viewstategen = html1.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]+)"/)?.[1] || '';
  const eventvalidation = html1.match(/id="__EVENTVALIDATION"\s+value="([^"]+)"/)?.[1] || '';

  console.log('TurnierDB initial html length:', html1.length);
  // Find all form fields on TurnierDB.aspx
  const inputs = [...html1.matchAll(/<input\b[^>]*name=["']([^"']+)["'][^>]*>/gi)].map(m => m[1]);
  console.log('Form input names:', inputs);

  // Let's search by submitting search form on TurnierDB.aspx with query "Giải Cờ Vua Vui Học Hè Cụm 2" or "Cụm 2" or "tnr1461992"
  const body = new URLSearchParams({
    '__EVENTTARGET': 'ctl00$P1$cb_suchen',
    '__EVENTARGUMENT': '',
    '__VIEWSTATE': viewstate,
    '__VIEWSTATEGENERATOR': viewstategen,
    '__EVENTVALIDATION': eventvalidation,
    'ctl00$P1$txt_turnier': 'Giải Cờ Vua Vui Học Hè Cụm 2',
    'ctl00$P1$txt_sparte': '',
    'ctl00$P1$txt_autor': ''
  });

  const r2 = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Referer': url
    },
    body: body.toString()
  });

  const html2 = await r2.text();
  console.log('TurnierDB search result html length:', html2.length);

  const links = [...html2.matchAll(/<a\b[^>]*href=["']([^"']*tnr\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  console.log('Found tnr links count:', links.length);
  links.forEach(l => {
    console.log('   FOUND CATEGORY LINK:', l[1], '-->', l[2].replace(/<[^>]*>/g, '').trim());
  });
}

testTurnierDB().catch(console.error);
