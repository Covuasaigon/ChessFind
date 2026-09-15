async function inspectHtml(tnrId) {
  const url = `https://s2.chess-results.com/tnr${tnrId}.aspx?lan=29`;
  console.log('\n=== INSPECTING FULL HTML FOR TNR:', tnrId, '===');
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();

  console.log('HTML Length:', html.length);
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
  console.log('Title:', title);

  const selects = [...html.matchAll(/<select[\s\S]*?<\/select>/gi)].map(m => m[0]);
  console.log('Select elements found:', selects.length);
  for (const s of selects) {
    console.log('Select snippet:', s.slice(0, 300));
  }

  const matches = [...html.matchAll(/tnr(\d+)/gi)].map(m => m[1]);
  const uniqueTnrs = Array.from(new Set(matches)).map(Number).sort((a, b) => a - b);
  console.log('All TNR occurrences in HTML:', uniqueTnrs);
}

inspectHtml(1461992).catch(console.error);
