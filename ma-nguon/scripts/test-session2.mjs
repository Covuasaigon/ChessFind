import fs from 'node:fs';

async function inspectHtml2() {
  const url = 'https://chess-results.com/tnr1461992.aspx?lan=1';

  const r1 = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
  const cookies = r1.headers.get('set-cookie')?.split(';')[0] || '';
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
  fs.writeFileSync('scripts/postback_html2.html', html2);
  console.log('Saved postback_html2.html');
  
  // Find all text in html2
  const textWithoutTags = html2.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  console.log('Snippet of postback_html2 text:', textWithoutTags.slice(0, 3000));
}

inspectHtml2().catch(console.error);
