async function testLiveRender() {
  const baseUrl = 'https://chessfind.onrender.com';
  console.log('=== TESTING LIVE RENDER BACKEND API (https://chessfind.onrender.com) ===\n');

  // 1. Authenticate
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Tuan@123' })
  });

  const loginData = await loginRes.json();
  if (!loginRes.ok || !loginData.token) {
    console.error('❌ Login failed:', loginData);
    return;
  }

  const token = loginData.token;
  const csrf = loginData.csrf;
  console.log('✅ Logged in successfully! Token:', token.slice(0, 12) + '..., CSRF:', csrf.slice(0, 12) + '...');

  // 2. Test detect with https://s2.chess-results.com/tnr1461967.aspx?lan=29
  const targetUrl = 'https://s2.chess-results.com/tnr1461967.aspx?lan=29';
  console.log(`\nCalling POST /api/admin with action: 'detect' and url: "${targetUrl}"...`);

  const startTime = Date.now();
  const detectRes = await fetch(`${baseUrl}/api/admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': token,
      'X-CSRF-Token': csrf
    },
    body: JSON.stringify({
      action: 'detect',
      url: targetUrl
    })
  });

  const durationMs = Date.now() - startTime;
  console.log(`HTTP Status: ${detectRes.status} (took ${(durationMs / 1000).toFixed(2)}s)`);

  const data = await detectRes.json();

  if (detectRes.ok && data.detected) {
    console.log('\n--- LIVE RENDER BACKEND RESPONSE ---');
    console.log('Main Tournament Name:', data.detected.mainName);
    console.log('Categories Count:', data.detected.categories?.length);

    const categories = data.detected.categories || [];
    console.table(categories.map((c, i) => ({
      index: i + 1,
      id: c.id || c.source?.match(/tnr(\d+)/)?.[1],
      group: c.group,
      playerCount: c.playerCount,
      status: c.status,
      error: c.error || ''
    })));

    const totalPlayers = categories.reduce((sum, c) => sum + (c.playerCount || 0), 0);
    console.log(`TOTAL PLAYERS ACROSS ALL CATEGORIES: ${totalPlayers}`);

    const has1461992 = categories.some(c => c.id === '1461992' || c.source?.includes('tnr1461992'));
    if (has1461992) {
      console.log('\n✅ Bảng Trẻ Nam (tnr1461992) IS PRESENT in Live Render Backend response!');
    } else {
      console.error('\n❌ Bảng Trẻ Nam (tnr1461992) IS MISSING in Live Render Backend response!');
    }
  } else {
    console.error('❌ Error from Live Render Backend:', data);
  }
}

testLiveRender().catch(console.error);
