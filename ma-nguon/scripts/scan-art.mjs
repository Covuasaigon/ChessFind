async function testRange() {
  const baseUrl = 'https://chess-results.com/tnr1461992.aspx';

  // Check art values from 0 to 85
  for (let art = 0; art <= 85; art++) {
    const r = await fetch(`${baseUrl}?lan=1&art=${art}`, { headers: { 'User-Agent': 'ChessFamilyResults/2.0' } });
    const h = await r.text();
    const matches = [...h.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
    const tnrLinks = matches.filter(m => /tnr\d|art=\d/i.test(m[1]));
    if (tnrLinks.length > 2 || h.includes('U06') || h.includes('U08') || h.includes('U10') || h.includes('U12') || h.includes('Nam') || h.includes('Nữ')) {
      console.log(`art=${art} -> length: ${h.length}, tnr/art links: ${tnrLinks.length}`);
      tnrLinks.forEach(m => console.log(`   [art=${art}]`, m[1], '-->', m[2].replace(/<[^>]*>/g, '').trim()));
    }
  }
}

testRange().catch(console.error);
