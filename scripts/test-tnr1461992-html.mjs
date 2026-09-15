import { textOf, rowsOf } from '../ma-nguon/lib/chess-source.ts';
import { normalize } from '../ma-nguon/lib/chess.ts';

async function testHtml() {
  const url29 = 'https://s2.chess-results.com/tnr1461967.aspx?lan=29';
  const res29 = await fetch(url29, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html29 = await res29.text();
  const rawTitle29 = textOf(html29.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/^Chess-Results Server Chess-results\.com\s*-\s*/i, '').trim();

  let baseName29 = rawTitle29;
  if (rawTitle29.includes(' - ')) {
    const parts = rawTitle29.split(/\s+[-–]\s+|\s*-\s*/);
    const mainPart = parts.find(p => !/^(?:bảng|u\d+|nam|nữ|trẻ|nhi|baby|open|girls|boys|group|cat|category|junior|senior)/i.test(p.trim()));
    if (mainPart) baseName29 = mainPart.trim();
  }

  console.log('rawTitle29:', rawTitle29);
  console.log('baseName29:', baseName29);
  console.log('normBase29:', normalize(baseName29).replace(/\s+/g, ' '));

  // Now test candidate 1461992 with lan=29
  const url992 = 'https://s2.chess-results.com/tnr1461992.aspx?lan=29&art=1&zeilen=99999';
  const res992 = await fetch(url992, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html992 = await res992.text();
  const rawTitle992 = textOf(html992.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/^Chess-Results Server Chess-results\.com\s*-\s*/i, '').trim();
  const normTitle992 = normalize(rawTitle992).replace(/\s+/g, ' ');

  console.log('\nCandidate 1461992 (lan=29):');
  console.log('rawTitle992:', rawTitle992);
  console.log('normTitle992:', normTitle992);

  const normBase = normalize(baseName29).replace(/\s+/g, ' ');
  const isMatch = normTitle992.includes(normBase) || (normBase.length > 6 && normTitle992.includes(normBase.slice(0, 15)));
  console.log('Is Match:', isMatch);

  const pageRows = rowsOf(html992);
  const hi = pageRows.findIndex(r => r.some(c => /name|ten|sno|rk|rank/i.test(c.text)));
  console.log('Header Row Index (hi):', hi);

  const pCount = pageRows.slice(hi + 1).filter(r => r.length >= 3 && /^\d+$/.test(r[0]?.text || r[1]?.text || '')).length;
  console.log('Player Count:', pCount);
}

testHtml().catch(console.error);
