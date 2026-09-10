async function findCategories() {
  const url = 'https://chess-results.com/tnr1461992.aspx?lan=1';

  // Let's test fetching various art and turdet parameters
  const params = [
    'lan=1',
    'lan=1&art=0',
    'lan=1&art=1',
    'lan=1&art=4',
    'lan=1&art=14',
    'lan=1&art=79',
    'lan=1&turdet=0',
    'lan=1&turdet=1',
    'lan=1&turdet=YES',
    'lan=1&flag=30',
    'lan=1&art=4&turdet=0'
  ];

  for (const p of params) {
    const u = `https://chess-results.com/tnr1461992.aspx?${p}`;
    const r = await fetch(u, { headers: { 'User-Agent': 'ChessFamilyResults/2.0' } });
    const text = await r.text();
    const tnrMatches = [...text.matchAll(/href=["']([^"']*tnr\d+[^"']*)["']/gi)].map(m => m[1]);
    console.log(`Param: ${p} | Length: ${text.length} | tnr links found: ${tnrMatches.length}`);
    if (tnrMatches.length > 0) {
      tnrMatches.forEach(l => console.log('   Link:', l));
    }
  }

  // Also check if there are links to other tnr on organizer page or tournament selection page
  // Let's search tnr1461992 page for any organizer link, fed link, or header info!
  const mainRes = await fetch(url, { headers: { 'User-Agent': 'ChessFamilyResults/2.0' } });
  const mainHtml = await mainRes.text();
  
  // Print all links in mainHtml containing 'aspx'
  const allAspx = [...mainHtml.matchAll(/href=["']([^"']+\.aspx[^"']*)["']/gi)].map(m => m[1]);
  console.log('\nAll ASPX links on main page:');
  allAspx.forEach(l => console.log('   ', l));
}

findCategories().catch(console.error);
