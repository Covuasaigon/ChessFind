import assert from 'node:assert/strict';
import { stats, Player } from '../lib/chess';

console.log('=== RUNNING BYE SCORE TEST SUITE ===\n');

// CASE 1: Only 1 round: Round 1 = BYE score 1
const player1: Player = {
  id: 'test-1',
  snr: '17',
  name: 'Vũ Nguyễn Tuấn Anh',
  club: 'CLB Cờ Vua',
  rating: null,
  rank: 17,
  points: 0,
  ties: {},
  rounds: [
    {
      round: 1,
      opponent: 'bye',
      rating: null,
      color: null,
      score: 1,
      status: 'bye',
      result: 'BYE 1-0'
    }
  ],
  detailsLoaded: true
};

const s1 = stats(player1);
assert.equal(s1.points, 1, 'Case 1: totalPoints should be 1');
assert.equal(s1.played, 0, 'Case 1: gamesPlayed (played) should be 0');
assert.equal(s1.wins, 0, 'Case 1: wins should be 0');
assert.equal(s1.draws, 0, 'Case 1: draws should be 0');
assert.equal(s1.losses, 0, 'Case 1: losses should be 0');
console.log('  ✓ Case 1 Passed: Single BYE round gives totalPoints = 1, played = 0, wins/draws/losses = 0');

// CASE 1b: BYE round with null score but result 'BYE 1-0'
const player1b: Player = {
  id: 'test-1b',
  snr: '17',
  name: 'Vũ Nguyễn Tuấn Anh (null score)',
  club: 'CLB Cờ Vua',
  rating: null,
  rank: 17,
  points: 0,
  ties: {},
  rounds: [
    {
      round: 1,
      opponent: 'bye',
      rating: null,
      color: null,
      score: null,
      status: 'bye',
      result: 'BYE 1-0',
      raw: '1-0'
    }
  ],
  detailsLoaded: true
};

const s1b = stats(player1b);
assert.equal(s1b.points, 1, 'Case 1b: totalPoints should fallback to 1 for BYE 1-0');
assert.equal(s1b.played, 0, 'Case 1b: gamesPlayed should be 0');
console.log('  ✓ Case 1b Passed: Null score BYE falls back correctly to 1');

// CASE 2: Round 1 = BYE 1, Round 2 = Win 1
const player2: Player = {
  id: 'test-2',
  snr: '5',
  name: 'Kỳ thủ 2',
  club: 'CLB Cờ Vua',
  rating: 1200,
  rank: 3,
  points: 0,
  ties: {},
  rounds: [
    {
      round: 1,
      opponent: 'bye',
      rating: null,
      color: null,
      score: 1,
      status: 'bye',
      result: 'BYE 1-0'
    },
    {
      round: 2,
      opponent: 'Nguyễn Văn A',
      rating: 1150,
      color: 'white',
      score: 1,
      status: 'played',
      result: '1 - 0'
    }
  ],
  detailsLoaded: true
};

const s2 = stats(player2);
assert.equal(s2.points, 2, 'Case 2: totalPoints should be 2');
assert.equal(s2.played, 1, 'Case 2: gamesPlayed should be 1');
assert.equal(s2.wins, 1, 'Case 2: wins should be 1');
assert.equal(s2.draws, 0, 'Case 2: draws should be 0');
assert.equal(s2.losses, 0, 'Case 2: losses should be 0');
console.log('  ✓ Case 2 Passed: BYE 1 + Win 1 gives totalPoints = 2, played = 1, wins = 1');

// CASE 3: Round 1 = BYE 1, Round 2 = Draw 0.5, Round 3 = Loss 0
const player3: Player = {
  id: 'test-3',
  snr: '8',
  name: 'Kỳ thủ 3',
  club: 'CLB Cờ Vua',
  rating: 1100,
  rank: 10,
  points: 0,
  ties: {},
  rounds: [
    {
      round: 1,
      opponent: 'bye',
      rating: null,
      color: null,
      score: 1,
      status: 'bye',
      result: 'BYE 1-0'
    },
    {
      round: 2,
      opponent: 'Trần Văn B',
      rating: 1200,
      color: 'black',
      score: 0.5,
      status: 'played',
      result: '½ - ½'
    },
    {
      round: 3,
      opponent: 'Lê Văn C',
      rating: 1300,
      color: 'white',
      score: 0,
      status: 'played',
      result: '0 - 1'
    }
  ],
  detailsLoaded: true
};

const s3 = stats(player3);
assert.equal(s3.points, 1.5, 'Case 3: totalPoints should be 1.5');
assert.equal(s3.played, 2, 'Case 3: gamesPlayed should be 2');
assert.equal(s3.wins, 0, 'Case 3: wins should be 0');
assert.equal(s3.draws, 1, 'Case 3: draws should be 1');
assert.equal(s3.losses, 1, 'Case 3: losses should be 1');
console.log('  ✓ Case 3 Passed: BYE 1 + Draw 0.5 + Loss 0 gives totalPoints = 1.5, played = 2, draws = 1, losses = 1');

// CASE 4: Half-point bye (BYE = 0.5)
const player4: Player = {
  id: 'test-4',
  snr: '12',
  name: 'Kỳ thủ 4',
  club: 'CLB Cờ Vua',
  rating: 1000,
  rank: 15,
  points: 0,
  ties: {},
  rounds: [
    {
      round: 1,
      opponent: 'bye',
      rating: null,
      color: null,
      score: 0.5,
      status: 'bye',
      result: 'BYE ½'
    }
  ],
  detailsLoaded: true
};

const s4 = stats(player4);
assert.equal(s4.points, 0.5, 'Case 4: totalPoints should be 0.5 for half-point bye');
assert.equal(s4.played, 0, 'Case 4: gamesPlayed should be 0');
console.log('  ✓ Case 4 Passed: Half-point bye gives totalPoints = 0.5, played = 0');

// CASE 5: No BYE
const player5: Player = {
  id: 'test-5',
  snr: '1',
  name: 'Kỳ thủ 5',
  club: 'CLB Cờ Vua',
  rating: 1500,
  rank: 1,
  points: 2,
  ties: {},
  rounds: [
    {
      round: 1,
      opponent: 'Đối thủ 1',
      rating: 1400,
      color: 'white',
      score: 1,
      status: 'played',
      result: '1 - 0'
    },
    {
      round: 2,
      opponent: 'Đối thủ 2',
      rating: 1450,
      color: 'black',
      score: 1,
      status: 'played',
      result: '1 - 0'
    }
  ],
  detailsLoaded: true
};

const s5 = stats(player5);
assert.equal(s5.points, 2, 'Case 5: totalPoints should be 2');
assert.equal(s5.played, 2, 'Case 5: gamesPlayed should be 2');
assert.equal(s5.wins, 2, 'Case 5: wins should be 2');
console.log('  ✓ Case 5 Passed: Standard games without BYE remain unchanged');

console.log('\n✅ ALL BYE SCORE TEST CASES PASSED SUCCESSFULLY!');
