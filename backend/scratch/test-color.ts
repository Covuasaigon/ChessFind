import { importTournament, importPlayer } from '../lib/chess-source.ts';

async function main() {
  const tour = await importTournament('https://s1.chess-results.com/tnr1461992.aspx?SNode=S0', 'Bảng Trẻ Nam');
  const player = tour.players.find(p => p.name.includes('Trần Trí Thắng') || p.rank === 1);
  if (!player) {
    console.log('Player not found');
    return;
  }

  console.log(`\n========================================`);
  console.log(`--- TEST PLAYER: ${player.name} ---`);
  console.log(`totalGames: ${player.totalGames}`);
  console.log(`whiteGames: ${player.whiteGames}`);
  console.log(`blackGames: ${player.blackGames}`);
  console.log(`========================================`);
  console.log('\nRounds match details from importPlayer:');
  
  const fetchedP = await importPlayer(tour, player);
  console.log(`totalGames: ${fetchedP.totalGames}`);
  console.log(`whiteGames: ${fetchedP.whiteGames}`);
  console.log(`blackGames: ${fetchedP.blackGames}`);
  console.log(`wins: ${fetchedP.wins}, draws: ${fetchedP.draws}, losses: ${fetchedP.losses}`);
  console.log(`whiteWins: ${fetchedP.whiteWins}, whiteDraws: ${fetchedP.whiteDraws}, whiteLosses: ${fetchedP.whiteLosses}`);
  console.log(`blackWins: ${fetchedP.blackWins}, blackDraws: ${fetchedP.blackDraws}, blackLosses: ${fetchedP.blackLosses}`);
  
  console.log('\nMatches list:');
  fetchedP.rounds.forEach(r => {
    console.log(`Round ${r.round}: opponent="${r.opponent}", color="${r.color}", result="${r.result}"`);
  });
}

main().catch(err => console.error(err));
