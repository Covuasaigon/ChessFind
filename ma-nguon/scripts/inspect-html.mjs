import fs from 'node:fs';

const html = fs.readFileSync('scripts/tnr1461992.html', 'utf8');

// Find all href attributes in html
const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map(m => m[1]);
console.log('All hrefs count:', hrefs.length);
console.log('Hrefs:', hrefs);

// Print all text in h1, h2, h3, h4, td, div class/id
const h1s = [...html.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)].map(m => m[1].replace(/<[^>]*>/g, '').trim());
console.log('Headings:', h1s);

// Print tables or main content text snippet
console.log('Snippet of html:', html.slice(0, 3000));
