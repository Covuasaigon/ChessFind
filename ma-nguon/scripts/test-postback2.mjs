async function testPostbackButton() {
  const url = 'https://chess-results.com/tnr1461992.aspx?lan=1';

  const r1 = await fetch(url, { headers: { 'User-Agent': 'ChessFamilyResults/2.0' } });
  const html1 = await r1.text();

  const viewstate = html1.match(/id="__VIEWSTATE"\s+value="([^"]+)"/)?.[1] || '';
  const viewstategen = html1.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]+)"/)?.[1] || '';
  const eventvalidation = html1.match(/id="__EVENTVALIDATION"\s+value="([^"]+)"/)?.[1] || '';

  // Look for any link buttons or hidden inputs in html1
  const buttons = [...html1.matchAll(/LinkButton\d+/g)].map(m => m[0]);
  console.log('Buttons found:', buttons);

  // Let's do POST with LinkButton2
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
      'User-Agent': 'ChessFamilyResults/2.0',
      'Referer': url
    },
    body: body.toString()
  });

  const html2 = await r2.text();
  console.log('Postback response length:', html2.length);
  
  // Find all links in html2
  const links2 = [...html2.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  console.log('Total links in html2:', links2.length);
  links2.forEach(m => {
    const href = m[1];
    const text = m[2].replace(/<[^>]*>/g, '').trim();
    if (!href.startsWith('Default.aspx?lan=') && !href.startsWith('#')) {
      console.log('   LINK2:', href, '-->', text);
    }
  });

  // Also check if there are option dropdowns in html2
  const opts2 = [...html2.matchAll(/<option\b[^>]*value=["']([^"']+)["'][^>]*>([\s\S]*?)<\/option>/gi)];
  console.log('Options count in html2:', opts2.length);
  opts2.forEach(o => console.log('   OPT2:', o[1], '-->', o[2].replace(/<[^>]*>/g, '').trim()));
}

testPostbackButton().catch(console.error);
