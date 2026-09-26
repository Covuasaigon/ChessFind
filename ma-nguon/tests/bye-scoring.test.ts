import { stats, Player, Round } from '../lib/chess';

function assertEqual(actual: any, expected: any, label: string) {
  if (actual !== expected) {
    console.error(`❌ FAIL: ${label} - Expected ${expected}, got ${actual}`);
    process.exit(1);
  }
  console.log(`  ✓ ${label}: ${actual}`);
}

console.log('--- TEST 1: BYE ONLY ---');
const playerByeOnly: Player = {
  id: 't1-1',
  snr: '1',
  name: 'Player BYE Only',
  points: 0,
  detailsLoaded: true,
  rounds: [
    {
      round: 1,
      board: 12,
      opponent: 'bye',
      status: 'bye',
      score: 1,
      result: '1 - 0',
      color: 'white'
    }
  ]
};
const s1 = stats(playerByeOnly);
assertEqual(s1.points, 1, 'CASE 1 points');
assertEqual(s1.played, 0, 'CASE 1 gamesPlayed');
assertEqual(s1.wins, 0, 'CASE 1 wins');
assertEqual(s1.draws, 0, 'CASE 1 draws');
assertEqual(s1.losses, 0, 'CASE 1 losses');

console.log('--- TEST 2: BYE + WIN ---');
const playerByeWin: Player = {
  id: 't1-2',
  snr: '2',
  name: 'Player BYE + Win',
  points: 0,
  detailsLoaded: true,
  rounds: [
    { round: 1, status: 'bye', score: 1, result: '1 - 0', color: 'white' },
    { round: 2, status: 'played', score: 1, result: '1 - 0', color: 'black' }
  ]
};
const s2 = stats(playerByeWin);
assertEqual(s2.points, 2, 'CASE 2 points');
assertEqual(s2.played, 1, 'CASE 2 gamesPlayed');
assertEqual(s2.wins, 1, 'CASE 2 wins');

console.log('--- TEST 3: BYE + DRAW ---');
const playerByeDraw: Player = {
  id: 't1-3',
  snr: '3',
  name: 'Player BYE + Draw',
  points: 0,
  detailsLoaded: true,
  rounds: [
    { round: 1, status: 'bye', score: 1, result: '1 - 0', color: 'white' },
    { round: 2, status: 'played', score: 0.5, result: '½ - ½', color: 'black' }
  ]
};
const s3 = stats(playerByeDraw);
assertEqual(s3.points, 1.5, 'CASE 3 points');
assertEqual(s3.played, 1, 'CASE 3 gamesPlayed');
assertEqual(s3.draws, 1, 'CASE 3 draws');

console.log('--- TEST 4: NORMAL GAMES ONLY ---');
const playerNormal: Player = {
  id: 't1-4',
  snr: '4',
  name: 'Player Normal',
  points: 0,
  detailsLoaded: true,
  rounds: [
    { round: 1, status: 'played', score: 1, result: '1 - 0', color: 'white' },
    { round: 2, status: 'played', score: 0, result: '0 - 1', color: 'black' }
  ]
};
const s4 = stats(playerNormal);
assertEqual(s4.points, 1, 'CASE 4 points');
assertEqual(s4.played, 2, 'CASE 4 gamesPlayed');
assertEqual(s4.wins, 1, 'CASE 4 wins');
assertEqual(s4.losses, 1, 'CASE 4 losses');

console.log('--- TEST 5: NO DETAILED ROUNDS LOADED ---');
const playerNoDetails: Player = {
  id: 't1-5',
  snr: '5',
  name: 'Player No Details',
  points: 3.5,
  detailsLoaded: false,
  rounds: []
};
const hasDetails5 = Boolean(playerNoDetails.detailsLoaded || (Array.isArray(playerNoDetails.rounds) && playerNoDetails.rounds.length > 0));
const points5 = hasDetails5 ? stats(playerNoDetails).points : playerNoDetails.points;
assertEqual(points5, 3.5, 'CASE 5 official points retained');

console.log('--- TEST 6: DETAILED ROUNDS LOADED WITH STALE POINTS=0 & STATS POINTS=1 ---');
const playerStaleDetails: Player = {
  id: '1503101-23',
  snr: '23',
  name: 'Nguyễn Quang Vũ',
  points: 0,
  detailsLoaded: true,
  rounds: [
    { round: 1, board: 12, opponent: 'bye', status: 'bye', score: 1, result: '1 - 0', color: 'white' }
  ]
};
const hasDetails6 = Boolean(playerStaleDetails.detailsLoaded || (Array.isArray(playerStaleDetails.rounds) && playerStaleDetails.rounds.length > 0));
const s6 = stats(playerStaleDetails);
const points6 = hasDetails6 ? s6.points : playerStaleDetails.points;
assertEqual(points6, 1, 'CASE 6 points recalculated to 1');
assertEqual(s6.played, 0, 'CASE 6 gamesPlayed is 0');

console.log('\n✅ ALL BYE SCORING REGRESSION TESTS PASSED!');
