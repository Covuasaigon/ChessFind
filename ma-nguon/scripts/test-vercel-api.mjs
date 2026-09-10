import { handleRequest } from '../lib/server.ts';

async function testApi(path, options = {}) {
  const req = new Request(`http://localhost:3000${path}`, options);
  const res = await handleRequest(req);
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  console.log(`\nTEST ${options.method || 'GET'} ${path}`);
  console.log(`Status: ${res.status}`);
  console.log(`Content-Type: ${contentType}`);
  console.log(`Body snippet: ${text.slice(0, 150)}`);
  
  if (!contentType.includes('application/json')) {
    console.error(`❌ FAIL: Expected JSON response, got ${contentType}`);
    process.exit(1);
  }
  
  try {
    JSON.parse(text);
    console.log(`✅ PASS: Valid JSON response returned.`);
  } catch (e) {
    console.error(`❌ FAIL: Invalid JSON response.`);
    process.exit(1);
  }
}

console.log('=== TESTING VERCEL API HANDLER (NATIVE NEXT.JS RUNTIME) ===');
await testApi('/api/tournaments');
await testApi('/api/banners');
await testApi('/api/admin');
console.log('\nALL API TESTS PASSED SUCCESSFULLY WITH 100% VALID JSON!');
