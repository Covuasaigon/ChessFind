import fs from 'node:fs';

async function test() {
  const url = 'https://chess-results.com/tnr1461992.aspx?lan=1';
  const res = await fetch(url, { headers: { 'User-Agent': 'ChessFamilyResults/2.0' } });
  const html = await res.text();
  fs.writeFileSync('scripts/tnr1461992.html', html);
  console.log('Saved tnr1461992.html, length:', html.length);
  
  // Check for iframe, tables, links, select, javascript redirects, etc.
  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  console.log('Total <a> tags:', links.length);
  links.slice(0, 40).forEach(m => {
    console.log('LINK:', m[1], '-->', m[2].replace(/<[^>]*>/g, '').trim());
  });

  const selects = [...html.matchAll(/<select\b[^>]*>([\s\S]*?)<\/select>/gi)];
  console.log('Total <select> tags:', selects.length);
  selects.forEach((s, i) => {
    console.log(`SELECT ${i}:`, s[1]);
  });
}

test().catch(console.error);
