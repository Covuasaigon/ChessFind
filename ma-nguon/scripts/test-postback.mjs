async function test() {
  const baseUrl = 'https://chess-results.com/tnr1461992.aspx';

  // Test 1: POST request doing ASP.NET __doPostBack('ctl00$P1$LinkButton2','')
  const getRes = await fetch(`${baseUrl}?lan=1`);
  const getHtml = await getRes.text();
  const viewstate = getHtml.match(/id="__VIEWSTATE"\s+value="([^"]+)"/)?.[1] || '';
  const viewstategen = getHtml.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]+)"/)?.[1] || '';
  const eventvalidation = getHtml.match(/id="__EVENTVALIDATION"\s+value="([^"]+)"/)?.[1] || '';

  const body = new URLSearchParams({
    '__EVENTTARGET': 'ctl00$P1$LinkButton2',
    '__EVENTARGUMENT': '',
    '__VIEWSTATE': viewstate,
    '__VIEWSTATEGENERATOR': viewstategen,
    '__EVENTVALIDATION': eventvalidation
  });

  const postRes = await fetch(`${baseUrl}?lan=1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'ChessFamilyResults/2.0'
    },
    body: body.toString()
  });

  const postHtml = await postRes.text();
  console.log('POST html length:', postHtml.length);
  const links = [...postHtml.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  console.log('POST <a> links count:', links.length);
  links.filter(m => /tnr\d|art=/i.test(m[1])).forEach(m => {
    console.log('LINK:', m[1], '-->', m[2].replace(/<[^>]*>/g, '').trim());
  });

  // Test 2: Try art= parameters e.g. art=0, art=1, art=79, turdet=0, turdet=1, etc.
  for (const art of [0, 1, 2, 4, 14, 79, 80]) {
    const r = await fetch(`${baseUrl}?lan=1&art=${art}`, { headers: { 'User-Agent': 'ChessFamilyResults/2.0' } });
    const h = await r.text();
    const l = [...h.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
    const tnrLinks = l.filter(m => /tnr\d|art=/i.test(m[1]));
    console.log(`art=${art}: total links ${l.length}, tnr/art links ${tnrLinks.length}`);
    if (tnrLinks.length > 1) {
      tnrLinks.slice(0, 15).forEach(m => console.log(`  art=${art} link:`, m[1], '-->', m[2].replace(/<[^>]*>/g, '').trim()));
    }
  }
}

test().catch(console.error);
