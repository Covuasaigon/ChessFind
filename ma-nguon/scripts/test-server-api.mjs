async function testServerApi() {
  try {
    const res = await fetch('http://localhost:3000/api/tournaments');
    const data = await res.json();
    console.log('Tournaments API Status:', res.status);
    console.log('Tournaments count:', data.tournaments?.length || 0);

    const bRes = await fetch('http://localhost:3000/api/banners');
    const bData = await bRes.json();
    console.log('Banners API Status:', bRes.status);
    console.log('Banners count:', bData.banners?.length || 0);
    console.log('First Banner:', bData.banners?.[0]);
  } catch (err) {
    console.log('Server check message:', err.message);
  }
}

testServerApi().catch(console.error);
