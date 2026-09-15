import { detectCategories } from '../ma-nguon/lib/chess-source.ts';

async function runComprehensiveTests() {
  console.log('=== RUNNING COMPREHENSIVE CATEGORY DETECTION TESTS ===\n');

  const testMatrix = [
    {
      name: 'Current Tournament - Last Category (tnr1461992)',
      url: 'https://s2.chess-results.com/tnr1461992.aspx?lan=29',
      expectedCount: 10,
      expectedTnrs: ['1461967', '1461970', '1461971', '1461973', '1461977', '1461981', '1461982', '1461986', '1461987', '1461992'],
      expectedPlayers: 310
    },
    {
      name: 'Current Tournament - First Category (tnr1461967)',
      url: 'https://s2.chess-results.com/tnr1461967.aspx?lan=1',
      expectedCount: 10,
      expectedTnrs: ['1461967', '1461970', '1461971', '1461973', '1461977', '1461981', '1461982', '1461986', '1461987', '1461992'],
      expectedPlayers: 310
    },
    {
      name: 'Current Tournament - Middle Category (tnr1461981)',
      url: 'https://www.chess-results.com/tnr1461981.aspx',
      expectedCount: 10,
      expectedTnrs: ['1461967', '1461970', '1461971', '1461973', '1461977', '1461981', '1461982', '1461986', '1461987', '1461992'],
      expectedPlayers: 310
    }
  ];

  let allPassed = true;
  const summaryResults = [];

  for (const t of testMatrix) {
    console.log(`Testing: ${t.name}...`);
    console.log(`URL: ${t.url}`);
    
    try {
      const startTime = Date.now();
      const res = await detectCategories(t.url);
      const durationMs = Date.now() - startTime;

      const detectedTnrs = res.categories.map(c => c.id);
      const totalPlayers = res.categories.reduce((acc, c) => acc + (c.playerCount || 0), 0);
      const countPassed = res.categories.length === t.expectedCount;
      const playersPassed = totalPlayers === t.expectedPlayers;
      const tnrsPassed = t.expectedTnrs.every(id => detectedTnrs.includes(id));

      const isPass = countPassed && playersPassed && tnrsPassed;
      if (!isPass) allPassed = false;

      summaryResults.push({
        testName: t.name,
        mainName: res.mainName,
        categoriesDetected: res.categories.length,
        totalPlayers,
        duration: `${(durationMs / 1000).toFixed(2)}s`,
        status: isPass ? '✅ PASS' : '❌ FAIL'
      });

      console.log(`-> Main Name: "${res.mainName}"`);
      console.log(`-> Categories (${res.categories.length}): [${detectedTnrs.join(', ')}]`);
      console.log(`-> Total Players: ${totalPlayers}`);
      console.log(`-> Status: ${isPass ? 'PASS' : 'FAIL'}\n`);
    } catch (err) {
      allPassed = false;
      summaryResults.push({
        testName: t.name,
        mainName: 'ERROR',
        categoriesDetected: 0,
        totalPlayers: 0,
        duration: '0s',
        status: `❌ ERROR: ${err.message}`
      });
      console.error(`-> Test failed with exception: ${err.message}\n`);
    }
  }

  console.log('=== TEST RESULTS SUMMARY MATRIX ===');
  console.table(summaryResults);

  if (!allPassed) {
    console.error('❌ SOME TESTS FAILED!');
    process.exit(1);
  } else {
    console.log('🎉 ALL COMPREHENSIVE TESTS PASSED SUCCESSFULLY!');
  }
}

runComprehensiveTests();
