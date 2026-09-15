import { validateSource, textOf, fetchSourceWithRetry } from '../backend/lib/chess-source.ts';
import { normalize } from '../backend/lib/chess.ts';

async function debugTnrs() {
  const targetId = 1461967;
  const baseName = "Giải Cờ Vua Vui Học Hè Cụm 2 Năm 2026";
  const normBase = normalize(baseName).replace(/\s+/g, ' ');

  console.log('Target BaseName Normalized:', normBase);

  const testIds = [1461967, 1461970, 1461971, 1461973, 1461977, 1461981, 1461982, 1461986, 1461987, 1461992];

  for (const catId of testIds) {
    const u = new URL(`https://s2.chess-results.com/tnr${catId}.aspx?lan=29&art=1&zeilen=99999`);
    try {
      const pageHtml = await fetchSourceWithRetry(u, 2, 600);
      const tStr = textOf(pageHtml.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/^Chess-Results Server Chess-results\.com\s*-\s*/i, '').trim();
      const normTitle = normalize(tStr).replace(/\s+/g, ' ');
      const isMatch = normTitle.includes(normBase) || (normBase.length > 6 && normTitle.includes(normBase.slice(0, 15))) || catId === targetId;

      console.log(`TNR ${catId}: Title="${tStr}" | NormTitle="${normTitle}" | Match=${isMatch}`);
    } catch (err) {
      console.error(`TNR ${catId}: FETCH ERROR -> ${err.message}`);
    }
  }
}

debugTnrs().catch(console.error);
