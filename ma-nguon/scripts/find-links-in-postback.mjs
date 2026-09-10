import fs from 'node:fs';

const html = fs.readFileSync('scripts/postback_html2.html', 'utf8');

// Find all hrefs
const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map(m => m[1]);
console.log('All Hrefs count:', hrefs.length);
hrefs.forEach(h => console.log('HREF:', h));

// Find all onclicks
const onclicks = [...html.matchAll(/onclick=["']([^"']+)["']/gi)].map(m => m[1]);
console.log('All Onclicks count:', onclicks.length);
onclicks.forEach(o => console.log('ONCLICK:', o));

// Find all links containing tnr or art
const tnrLinks = hrefs.filter(h => h.includes('tnr') || h.includes('art'));
console.log('TNR/ART links:', tnrLinks);
