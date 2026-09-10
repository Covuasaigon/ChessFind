import assert from 'node:assert/strict';
import {makeDemo,stats,normalize,num} from '../lib/chess';
import {parseRanking,parsePlayer,validateSource} from '../lib/chess-source';
const demo=makeDemo(),main=demo.players.find(p=>p.name==='Nguyễn Minh Anh')!;
assert.equal(main.points,4.5);assert.equal(stats(main).wins,4);assert.equal(stats(main).draws,1);assert.equal(stats(main).losses,2);assert.equal(stats(main).white+stats(main).black,7);assert.equal(Math.round(stats(main).winRate!*10)/10,57.1);assert.equal(demo.players.reduce((n,p)=>n+p.points!,0),28);
for(const p of demo.players)for(const r of p.rounds){const other=demo.players.find(x=>x.id===r.opponentId)!;const back=other.rounds.find(x=>x.round===r.round)!;assert.equal(back.opponentId,p.id);assert.equal(back.score!+r.score!,1);assert.notEqual(back.color,r.color)}
assert.equal(normalize('ĐẶNG Bảo Ngọc'),'dang bao ngoc');assert.equal(num('4½'),4.5);assert.equal(num('½'),.5);
for(const url of ['https://evil.test/tnr123.aspx','https://chess-results.com.evil.test/tnr123.aspx','http://127.0.0.1/tnr123.aspx','https://chess-results.com:8080/tnr123.aspx','https://x:y@chess-results.com/tnr123.aspx','file:///tnr123.aspx'])assert.throws(()=>validateSource(url));
const html='<h2>Giải kiểm thử</h2><table><tr><th>Rk.</th><th>SNo</th><th>Name</th><th>Rtg</th><th>Club/City</th><th>Pts.</th><th>TB1</th></tr><tr><td>1</td><td>4</td><td><a href="tnr123.aspx?art=9&amp;snr=4">Đặng An</a></td><td>1200</td><td>CLB A</td><td>1.5</td><td>3</td></tr></table>';
const t=parseRanking(html,'https://chess-results.com/tnr123.aspx?art=1','U8');assert.equal(t.players[0].id,'123-4');assert.equal(t.players[0].points,1.5);assert.deepEqual(t.tieLabels,['TB1']);
const details='<table><tr><th>Rd.</th><th>Name</th><th>Rtg</th><th colspan="2">Res.</th></tr><tr><td>1</td><td><a href="?art=9&amp;snr=7">An B</a></td><td>1300</td><td>b</td><td>1</td></tr><tr><td>2</td><td>An C</td><td>1200</td><td>w</td><td>½</td></tr></table>';
const p=parsePlayer(details,t.players[0],t);assert.equal(p.rounds[0].color,'black');assert.equal(p.rounds[0].score,1);assert.equal(p.rounds[0].opponentId,'123-7');assert.equal(stats(p).wins,1);assert.equal(stats(p).played,2);
const special=details.replace('<td>b</td><td>1</td>','<td>b</td><td>+</td>');assert.equal(stats(parsePlayer(special,t.players[0],t)).played,1);
assert.throws(()=>parsePlayer(details,{...t.players[0],points:9},t));assert.throws(()=>parseRanking('<h1>Access denied</h1>','https://chess-results.com/tnr123.aspx','U8'));
console.log('PASS: demo consistency, search normalization, score parsing, blocked URLs, ranking parsing, Black win, forfeit exclusion, mismatched snapshot rejection.');
