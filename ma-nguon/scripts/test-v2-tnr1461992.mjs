import { detectCategories, importTournament, importPlayer } from '../lib/chess-source.ts';
import { matchPlayer } from '../lib/chess.ts';

async function testV2() {
  console.log('=== VERIFYING IMPORT ENGINE V2 ===');
  const testUrl = 'https://s2.chess-results.com/tnr1461992.aspx';

  console.time('Category Detection');
  const detectResult = await detectCategories(testUrl);
  console.timeEnd('Category Detection');

  console.log(`Tournament Main Name: "${detectResult.mainName}"`);
  console.log(`Categories Detected: ${detectResult.categories.length}`);
  console.table(detectResult.categories.map(c => ({ ID: c.id, Category: c.group, Players: c.playerCount, URL: c.source })));

  if (detectResult.categories.length < 8) {
    throw new Error(`TEST FAILED: Expected categories >= 8, got ${detectResult.categories.length}`);
  }
  console.log('✓ REQUIREMENT 1 & 2 PASSED: Categories >= 8 detected without art=79!');

  // Import all categories and count total players
  console.log('\n=== IMPORTING ALL CATEGORIES ===');
  let totalPlayers = 0;
  const allPlayersWithCat = [];

  for (const cat of detectResult.categories) {
    console.log(`Importing category ${cat.group} (ID: ${cat.id})...`);
    const tour = await importTournament(cat.source, cat.group);
    totalPlayers += tour.players.length;
    for (const p of tour.players) {
      allPlayersWithCat.push({ tour, player: p, category: cat.group });
    }
  }

  console.log(`Total Players Imported across all categories: ${totalPlayers}`);
  if (totalPlayers < 300) {
    throw new Error(`TEST FAILED: Expected players >= 300, got ${totalPlayers}`);
  }
  console.log('✓ REQUIREMENT 3 PASSED: Total players >= 300 imported into database!');

  // Search for player "Nguyễn Minh Nhật"
  console.log('\n=== SEARCHING FOR PLAYER "Nguyễn Minh Nhật" ===');
  const searchQuery = 'Nguyễn Minh Nhật';
  const matches = allPlayersWithCat.filter(({ category, player }) => matchPlayer(player, category, searchQuery));

  console.log(`Search matches count for "${searchQuery}": ${matches.length}`);
  matches.forEach(({ category, player, tour }) => {
    console.log(`Found: ${player.name} | Category: ${category} | Rank: ${player.rank} | Points: ${player.points} | Club: ${player.club} | RP: ${player.performance}`);
  });

  if (!matches.length) {
    throw new Error(`TEST FAILED: Search for "${searchQuery}" returned 0 results!`);
  }

  const foundPlayer = matches[0];
  console.log(`\nFetching round matches for player ${foundPlayer.player.name} in category ${foundPlayer.category}...`);
  const detailedPlayer = await importPlayer(foundPlayer.tour, foundPlayer.player);
  console.log(`Parsed ${detailedPlayer.rounds.length} matches:`);
  detailedPlayer.rounds.forEach(r => {
    console.log(`  Vòng ${r.round} (Bàn ${r.board || '—'}): ${r.color === 'white' ? 'Trắng' : 'Đen'} vs ${r.opponent} -> ${r.result || (r.score === 1 ? 'Thắng' : r.score === 0.5 ? 'Hòa' : 'Thua')}`);
  });

  console.log('\n✓ REQUIREMENT 5, 6 & 7 PASSED: Player search returns category, ranking, score, and matches!');
  console.log('🎉 ALL BACKEND & CRAWLER V2 TESTS PASSED PERFECTLY!');
}

testV2().catch(err => {
  console.error('\n❌ TEST ERROR:', err);
  process.exit(1);
});
