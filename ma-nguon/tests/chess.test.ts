import assert from 'node:assert/strict';
import {makeDemo,stats,normalize,num} from '../lib/chess';
import {parseRanking,parsePlayer,validateSource} from '../lib/chess-source';
const demo=makeDemo(),main=demo.players.find(p=>p.name==='Nguyễn Minh Anh')!;
assert.equal(main.points,4.5);assert.equal(stats(main).wins,4);assert.equal(stats(main).draws,1);assert.equal(stats(main).losses,2);assert.equal(stats(main).white+stats(main).black,7);assert.equal(stats(main).winRate,57);assert.equal(demo.players.reduce((n,p)=>n+p.points!,0),28);
for(const p of demo.players)for(const r of p.rounds){const other=demo.players.find(x=>x.id===r.opponentId)!;const back=other.rounds.find(x=>x.round===r.round)!;assert.equal(back.opponentId,p.id);assert.equal(back.score!+r.score!,1);assert.notEqual(back.color,r.color)}
assert.equal(normalize('ĐẶNG Bảo Ngọc'),'dang bao ngoc');assert.equal(num('4½'),4.5);assert.equal(num('½'),.5);
for(const url of ['https://evil.test/tnr123.aspx','https://chess-results.com.evil.test/tnr123.aspx','http://127.0.0.1/tnr123.aspx','https://chess-results.com:8080/tnr123.aspx','https://x:y@chess-results.com/tnr123.aspx','file:///tnr123.aspx'])assert.throws(()=>validateSource(url));
const html='<h2>Giải kiểm thử</h2><table><tr><th>Rk.</th><th>SNo</th><th>Name</th><th>Rtg</th><th>Club/City</th><th>Pts.</th><th>TB1</th></tr><tr><td>1</td><td>4</td><td><a href="tnr123.aspx?art=9&amp;snr=4">Đặng An</a></td><td>1200</td><td>CLB A</td><td>1.5</td><td>3</td></tr></table>';
const t=parseRanking(html,'https://chess-results.com/tnr123.aspx?art=1','U8');assert.equal(t.players[0].id,'123-4');assert.equal(t.players[0].points,1.5);assert.deepEqual(t.tieLabels,['TB1']);
const details='<table><tr><th>Rd.</th><th>Name</th><th>Rtg</th><th colspan="2">Res.</th></tr><tr><td>1</td><td><a href="?art=9&amp;snr=7">An B</a></td><td>1300</td><td>b</td><td>1</td></tr><tr><td>2</td><td>An C</td><td>1200</td><td>w</td><td>½</td></tr></table>';
const p=parsePlayer(details,t.players[0],t);assert.equal(p.rounds[0].color?.toUpperCase(),'BLACK');assert.equal(p.rounds[0].score,1);assert.equal(p.rounds[0].opponentId,'123-7');assert.equal(stats(p).wins,1);assert.equal(stats(p).played,2);
const special=details.replace('<td>b</td><td>1</td>','<td>b</td><td>+</td>');assert.equal(stats(parsePlayer(special,t.players[0],t)).played,1);
const pWarn=parsePlayer(details,{...t.players[0],points:9},t);assert.ok(pWarn.warning);assert.throws(()=>parseRanking('<h1>Access denied</h1>','https://chess-results.com/tnr123.aspx','U8'));

// Requirement 7 test case: player with 3 matches (White, White, Black) -> White games = 2, Black games = 1
const testPlayerReq7 = {
  id: 'test-req7',
  snr: '1',
  name: 'Kỳ Thủ Test',
  club: 'CLB Test',
  rating: 1200,
  rank: 1,
  points: 2.5,
  ties: {},
  detailsLoaded: true,
  rounds: [
    { round: 1, opponent: 'Đối thủ 1', color: 'WHITE' as const, score: 1, status: 'played' as const },
    { round: 2, opponent: 'Đối thủ 2', color: 'WHITE' as const, score: 1, status: 'played' as const },
    { round: 3, opponent: 'Đối thủ 3', color: 'BLACK' as const, score: 0.5, status: 'played' as const }
  ]
};
const statsReq7 = stats(testPlayerReq7);
assert.equal(statsReq7.whiteGames, 2);
assert.equal(statsReq7.blackGames, 1);
assert.equal(statsReq7.white, 2);
assert.equal(statsReq7.black, 1);

// Case 1 Test: Tournament in round 5, round 6 is paired (scheduled, no result)
const playerCase1 = {
  id: 'c1-p1',
  snr: '1',
  name: 'Player Case 1',
  club: 'CLB A',
  rating: 1400,
  rank: 1,
  points: 4.5,
  ties: {},
  detailsLoaded: true,
  rounds: [
    { round: 1, opponent: 'Opp 1', color: 'WHITE' as const, score: 1, status: 'played' as const, result: '1 - 0' },
    { round: 2, opponent: 'Opp 2', color: 'BLACK' as const, score: 1, status: 'played' as const, result: '0 - 1' },
    { round: 3, opponent: 'Opp 3', color: 'WHITE' as const, score: 1, status: 'played' as const, result: '1 - 0' },
    { round: 4, opponent: 'Opp 4', color: 'BLACK' as const, score: 1, status: 'played' as const, result: '0 - 1' },
    { round: 5, opponent: 'Opp 5', color: 'WHITE' as const, score: 0.5, status: 'played' as const, result: '½ - ½' },
    { round: 6, opponent: 'Opp 6', color: 'BLACK' as const, score: null, status: 'scheduled' as const, result: '—' }
  ]
};
const statsCase1 = stats(playerCase1);
assert.equal(statsCase1.played, 5, 'Case 1: totalGames should equal 5 (round 6 scheduled is ignored)');
assert.equal(statsCase1.points, 4.5, 'Case 1: points should equal 4.5 from played games');
assert.equal(playerCase1.rounds.filter(r => r.status === 'played').length, 5, 'Case 1: No round 6 in played history');

// Case 2 Test: Newly created tournament not yet played
const playerCase2 = {
  id: 'c2-p1',
  snr: '1',
  name: 'Player Case 2',
  club: 'CLB B',
  rating: 1200,
  rank: 1,
  points: null,
  ties: {},
  detailsLoaded: true,
  rounds: [
    { round: 1, opponent: 'Opp 1', color: 'WHITE' as const, score: null, status: 'scheduled' as const, result: '' }
  ]
};
const statsCase2 = stats(playerCase2);
assert.equal(statsCase2.played, 0, 'Case 2: games should equal 0');
assert.equal(statsCase2.points, 0, 'Case 2: points should equal 0');

console.log('PASS: demo consistency, search normalization, score parsing, blocked URLs, ranking parsing, Black win, forfeit exclusion, mismatched snapshot rejection, 3-match color stats, Case 1 future pairings ignored, Case 2 unplayed stats = 0.');

