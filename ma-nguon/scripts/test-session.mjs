async function testSession() {
  const url = 'https://chess-results.com/tnr1461992.aspx?lan=1';

  const r1 = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
  const cookies = r1.headers.get('set-cookie')?.split(';')[0] || '';
  console.log('Cookies from r1:', cookies);
  const html1 = await r1.text();

  const viewstate = html1.match(/id="__VIEWSTATE"\s+value="([^"]+)"/)?.[1] || '';
  const viewstategen = html1.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]+)"/)?.[1] || '';
  const eventvalidation = html1.match(/id="__EVENTVALIDATION"\s+value="([^"]+)"/)?.[1] || '';

  const body = new URLSearchParams({
    '__EVENTTARGET': 'ctl00$P1$LinkButton2',
    '__EVENTARGUMENT': '',
    '__VIEWSTATE': viewstate,
    '__VIEWSTATEGENERATOR': viewstategen,
    '__EVENTVALIDATION': eventvalidation
  });

  const r2 = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Cookie': cookies,
      'Referer': url
    },
    body: body.toString()
  });

  const html2 = await r2.text();
  console.log('r2 response length:', html2.length);
  
  // Let's see if html2 has more text or links!
  const links2 = [...html2.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  console.log('Links in r2:', links2.length);
  links2.forEach(m => {
    const href = m[1];
    const text = m[2].replace(/<[^>]*>/g, '').trim();
    if (href.includes('tnr') || href.includes('art=')) {
      console.log('   FOUND LINK:', href, '-->', text);
    }
  });

  // Check table content in html2
  const tables = [...html2.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];
  console.log('Tables count:', tables.length);
}

testSession().catch(console.error);
