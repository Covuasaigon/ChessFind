import { readFileSync } from 'node:fs';

async function testUploadFlow() {
  console.log('=== TEST UPLOAD FLOW & DATABASE BANNER PERSISTENCE ===');

  const origin = 'http://localhost:3000';

  // 1. Login to admin
  const loginRes = await fetch(`${origin}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': origin },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });

  const cookie = loginRes.headers.get('set-cookie');
  const loginData = await loginRes.json();
  console.log('1. Login response:', loginRes.status, loginData);

  if (!loginRes.ok || !loginData.csrf) {
    throw new Error('Login failed: ' + JSON.stringify(loginData));
  }

  const csrf = loginData.csrf;

  // 2. Upload test image via base64 or multipart
  const sampleImagePath = 'ma-nguon/public/hero-chess-king.png';
  const sampleBuffer = readFileSync(sampleImagePath);

  const uploadRes = await fetch(`${origin}/api/admin/upload-image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': origin,
      'Cookie': cookie,
      'X-CSRF-Token': csrf
    },
    body: JSON.stringify({
      image: `data:image/png;base64,${sampleBuffer.toString('base64')}`
    })
  });

  const uploadData = await uploadRes.json();
  console.log('2. Upload response:', uploadRes.status, uploadData);

  if (!uploadRes.ok || !uploadData.url) {
    throw new Error('Upload failed: ' + JSON.stringify(uploadData));
  }

  const uploadedUrl = uploadData.url;
  console.log('Uploaded image URL:', uploadedUrl);

  // 3. Test static file URL accessibility
  const staticRes = await fetch(`${origin}${uploadedUrl}`);
  console.log('3. Static file fetch status:', staticRes.status, staticRes.headers.get('content-type'));
  if (staticRes.status !== 200) {
    throw new Error('Static file serving failed with status ' + staticRes.status);
  }

  // 4. Save banner to database via action: 'banner_create' / 'banner_update'
  const saveRes = await fetch(`${origin}/api/admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': origin,
      'Cookie': cookie,
      'X-CSRF-Token': csrf
    },
    body: JSON.stringify({
      action: 'banner_update',
      id: 'b1',
      title: 'Cờ Vua Sài Gòn — Đào tạo & Thi đấu',
      description: 'Nền tảng tra cứu kết quả thi đấu chuyên nghiệp dành cho phụ huynh và huấn luyện viên.',
      image_url: uploadedUrl,
      button_text: 'Xem kết quả',
      button_link: '/?view=tournaments',
      is_active: 1,
      sort_order: 1
    })
  });

  const saveData = await saveRes.json();
  console.log('4. Save banner response:', saveRes.status, saveData);

  // 5. Fetch public banners GET /api/banners
  const publicRes = await fetch(`${origin}/api/banners`);
  const publicData = await publicRes.json();
  console.log('5. Public GET /api/banners:', publicRes.status, JSON.stringify(publicData, null, 2));

  const activeBanner = publicData.banners?.find(b => b.id === 'b1');
  if (activeBanner?.image_url === uploadedUrl) {
    console.log('SUCCESS! Database contains saved image_url:', activeBanner.image_url);
  } else {
    throw new Error('Database banner image_url mismatch: ' + JSON.stringify(activeBanner));
  }
}

testUploadFlow().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
