import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';

async function testUpload() {
  try {
    const dbPath = resolve(process.cwd(), 'data/chess.sqlite');
    const sql = new DatabaseSync(dbPath);

    const testToken = '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff';
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(testToken));
    const testHash = [...new Uint8Array(hashBuffer)].map(x => x.toString(16).padStart(2, '0')).join('');
    const testCsrf = 'test-csrf-token-12345';
    const expires = Date.now() + 3600000;

    sql.prepare('INSERT INTO admin_sessions (hash, csrf, expires) VALUES (?, ?, ?)').run(testHash, testCsrf, expires);
    sql.close();

    // PNG Sample bytes (1x1 transparent PNG)
    const pngSampleBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const binaryData = Buffer.from(pngSampleBase64, 'base64');

    const form = new FormData();
    const blob = new Blob([binaryData], { type: 'image/png' });
    form.append('image', blob, 'sample_test_banner.png');

    const uploadRes = await fetch('http://localhost:3000/api/admin/upload-image', {
      method: 'POST',
      headers: {
        'Origin': 'http://localhost:3000',
        'X-CSRF-Token': testCsrf,
        'Cookie': `sgc_session=${testToken}`
      },
      body: form
    });

    const uploadData = await uploadRes.json();
    console.log('Upload API status:', uploadRes.status);
    console.log('Upload result:', uploadData);

    if (uploadData.url) {
      const staticRes = await fetch('http://localhost:3000' + uploadData.url);
      console.log('Static image URL fetch status:', staticRes.status, 'Content-Type:', staticRes.headers.get('content-type'));
    }
  } catch (err) {
    console.error('Test error:', err);
  }
}

testUpload();
