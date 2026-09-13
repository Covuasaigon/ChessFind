import { importTournament } from '../lib/chess-source.ts';

async function main() {
  const data = await importTournament('https://s1.chess-results.com/tnr1461992.aspx?SNode=S0', 'Bảng Trẻ Nam');
  console.log('List of all 54 players in 1461992:');
  data.players?.forEach(p => {
    console.log(`${p.rank}. ${p.name} - Total: ${p.totalGames} (W: ${p.whiteGames}, B: ${p.blackGames})`);
  });
}

main().catch(err => console.error('Error:', err));
