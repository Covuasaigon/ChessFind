import fs from 'node:fs';

const html = fs.readFileSync('scripts/postback_html2.html', 'utf8');

// Search for any links or forms or tables in postback_html2.html
console.log('=== SEARCH FOR LINKS ===');
const linkMatches = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
linkMatches.forEach(m => {
  const href = m[1];
  const text = m[2].replace(/<[^>]*>/g, '').trim();
  console.log(`Href: ${href} | Text: ${text}`);
});

console.log('\n=== SEARCH FOR CREATOR / ORGANIZER / OTHER TOURNAMENTS ===');
// Search for "Co Vua Sai Gon" or creator links
const creatorMatch = html.match(/Creator\/Last Upload:\s*<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i) || html.match(/Creator\/Last Upload:\s*([^<]+)/i);
console.log('Creator match:', creatorMatch ? creatorMatch[0] : 'None');

// Search for dropdowns, options, sub-links, etc.
const options = [...html.matchAll(/<option\b[^>]*value=["']([^"']+)["'][^>]*>([\s\S]*?)<\/option>/gi)];
console.log('Options count:', options.length);
options.forEach(o => console.log('Option:', o[1], '-->', o[2].replace(/<[^>]*>/g, '')));

// Let's check for any mention of other age groups in the document (like U06, U08, U10, U11, U12)
const ageGroups = [...html.matchAll(/(?:U\d+|Bảng\s+\w+)/gi)].map(m => m[0]);
console.log('Age group mentions in page:', Array.from(new Set(ageGroups)));
