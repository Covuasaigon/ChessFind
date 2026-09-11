export type Round = {
  round: number;
  board?: number | null;
  opponentId?: string;
  opponent: string;
  rating: number | null;
  color: 'white' | 'black' | null;
  score: number | null;
  status: 'played' | 'pending' | 'bye' | 'forfeit' | 'unknown';
  raw?: string;
  playerWhite?: string;
  playerBlack?: string;
  result?: string;
};

export type Player = {
  id: string;
  categoryId?: string;
  tournamentId?: string;
  snr: string;
  name: string;
  fideId?: string | null;
  federation?: string | null;
  club: string;
  country?: string | null;
  rating: number | null;
  rank: number | null;
  points: number | null;
  buchholz?: number | null;
  sonnebornBerger?: number | null;
  performance?: number | null;
  gender?: string | null;
  ageGroup?: string | null;
  ties: Record<string, number | null>;
  rounds: Round[];
  detailsLoaded: boolean;
};

export type Category = {
  id: string;
  tournamentId: string;
  name: string;
  group: string;
  gender?: string | null;
  ageGroup?: string | null;
  sourceUrl: string;
  totalPlayers: number;
  rounds?: number | null;
  players?: Player[];
  status?: string;
};

export type TournamentInfo = {
  intro?: string;
  regulations?: string;
  instructions?: string;
  location?: string;
  time?: string;
  banner_url?: string;
};

export type PrizeRule = {
  id?: string;
  group: string;
  rank: number;
  prizeName: string;
  medal?: 'gold' | 'silver' | 'bronze' | 'top' | 'custom';
};

export type Tournament = {
  id: string;
  name: string;
  location?: string | null;
  date?: string | null;
  chessResultsUrl?: string;
  group: string;
  source: string;
  updated: string | null;
  demo?: boolean;
  categories?: Category[];
  players: Player[];
  tieLabels: string[];
  rounds: number | null;
  published?: boolean;
  warning?: string;
  info?: TournamentInfo;
  prizes?: PrizeRule[];
};
export const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
export const num = (s: string): number | null => { const v = s.trim().replace(/½/g, '.5').replace(',', '.'); return v !== '' && /^\d+(?:\.\d+)?$|^\.5$/.test(v) ? Number(v) : null; };
export const fmt = (n: number | null | undefined) => n == null ? '—' : n.toLocaleString('vi-VN', { maximumFractionDigits: 2 });

export const CLUB_MAP: Record<string, string> = {
  'HDC': 'CLB Cờ Vua HDC',
  'TPC': 'CLB Cờ Vua TPC (Tân Bình)',
  'TBC': 'CLB Cờ Vua TBC',
  'RTC': 'CLB Cờ Vua Rồng Trẻ (RTC)',
  'BTC': 'CLB Cờ Vua Bến Thành (BTC)',
  'ONL': 'CLB Cờ Vua Online (ONL)',
  'DHC': 'CLB Cờ Vua DHC',
  'KDC': 'CLB Cờ Vua KDC',
  'Q1': 'Quận 1 - TP.HCM',
  'Q2': 'Quận 2 - TP.HCM',
  'Q3': 'Quận 3 - TP.HCM',
  'Q4': 'Quận 4 - TP.HCM',
  'Q5': 'Quận 5 - TP.HCM',
  'Q6': 'Quận 6 - TP.HCM',
  'Q7': 'Quận 7 - TP.HCM',
  'Q8': 'Quận 8 - TP.HCM',
  'Q9': 'Quận 9 - TP.HCM',
  'Q10': 'Quận 10 - TP.HCM',
  'Q11': 'Quận 11 - TP.HCM',
  'Q12': 'Quận 12 - TP.HCM',
  'TD': 'TP. Thủ Đức',
  'GV': 'Quận Gò Vấp',
  'TB': 'Quận Tân Bình',
  'BT': 'Quận Bình Thạnh',
  'PN': 'Quận Phú Nhuận',
  'TP': 'Thành phố Hồ Chí Minh'
};

export function formatClubName(club: string | null | undefined): string {
  if (!club || !club.trim()) return 'Tự do / Chưa rõ';
  const trimmed = club.trim();
  const upper = trimmed.toUpperCase();
  if (CLUB_MAP[upper]) return CLUB_MAP[upper];
  if (CLUB_MAP[trimmed]) return CLUB_MAP[trimmed];
  return trimmed;
}

export function stats(p: Player) {
  const allCompleted = p.rounds.filter(x => x.status !== 'pending' && x.status !== 'unknown');
  const r = p.rounds.filter(x => x.status === 'played' && x.score !== null);
  const wins = p.rounds.filter(x => x.score === 1).length;
  const draws = p.rounds.filter(x => x.score === 0.5).length;
  const losses = p.rounds.filter(x => x.score === 0).length;
  const white = p.rounds.filter(x => x.color === 'white').length;
  const black = p.rounds.filter(x => x.color === 'black').length;
  const totalPlayed = allCompleted.length > 0 ? allCompleted.length : r.length;

  return {
    played: totalPlayed,
    wins,
    draws,
    losses,
    white,
    black,
    unknown: r.filter(x => x.color === null).length,
    special: p.rounds.filter(x => ['bye', 'forfeit'].includes(x.status)).length,
    winRate: totalPlayed > 0 ? (wins / totalPlayed) * 100 : null
  };
}

export function getMedal(rank: number | null, group?: string, prizes?: PrizeRule[]): { medal: string; label: string } | null {
  if (!rank || rank <= 0) return null;
  if (prizes && prizes.length > 0) {
    const match = prizes.find(p => p.rank === rank && (!group || normalize(p.group) === 'tat ca' || normalize(p.group) === normalize(group)));
    if (match) {
      const medalIcon = match.medal === 'gold' || rank === 1 ? '🥇' : match.medal === 'silver' || rank === 2 ? '🥈' : match.medal === 'bronze' || rank === 3 ? '🥉' : '🏆';
      return { medal: medalIcon, label: match.prizeName };
    }
  }
  if (rank === 1) return { medal: '🥇', label: 'Huy chương Vàng' };
  if (rank === 2) return { medal: '🥈', label: 'Huy chương Bạc' };
  if (rank === 3) return { medal: '🥉', label: 'Huy chương Đồng' };
  return null;
}

export function getNextMatch(p: Player): Round | null {
  if (!p.rounds || !p.rounds.length) return null;
  const pending = p.rounds.find(r => r.status === 'pending');
  if (pending) return pending;
  return null;
}

export function matchPlayer(p: Player, group: string, query: string): boolean {
  if (!query || !query.trim()) return true;
  const qClean = normalize(query);
  const qTokens = qClean.split(/\s+/).filter(Boolean);

  const pName = normalize(p.name);
  const pClub = normalize(p.club || '');
  const pGroup = normalize(group || p.ageGroup || '');
  const pSnr = (p.snr || '').trim().toLowerCase();
  const pFideId = (p.fideId || '').trim().toLowerCase();
  const pId = (p.id || '').trim().toLowerCase();

  // Direct SNR, FIDE ID, or ID exact match
  if (pSnr === qClean || (pFideId && pFideId === qClean) || pId.includes(qClean)) return true;

  // Search string combining name, club, group, SNR, FIDE ID
  const fullText = `${pName} ${pClub} ${pGroup} ${pSnr} ${pFideId}`;

  // Token matching: Every search token must exist in fullText
  return qTokens.every(token => fullText.includes(token));
}

const names = ['Nguyễn Minh Anh', 'Lê Bảo Châu', 'Trần Khánh Linh', 'Phạm Ngọc Anh', 'Đặng Bảo Ngọc', 'Vũ Tuấn Minh', 'Hoàng Yến Nhi', 'Nguyễn Gia Huy'];
export function makeDemo(): Tournament {
  const players: Player[] = names.map((name, i) => ({ id: `demo-${i + 1}`, snr: String(i + 1), name, club: ['Cờ Vua Sài Gòn · Quận 1', 'CLB Kiện Tướng Nhí', 'Cờ Vua Sài Gòn · Tân Phú'][i % 3], rating: 1250 + i * 15, rank: null, points: 0, ties: {}, rounds: [], detailsLoaded: true, ageGroup: 'U08', gender: i % 2 === 0 ? 'Nam' : 'Nữ' }));
  let circle = [0, 1, 2, 3, 4, 5, 6, 7]; const main = [1, 0, 1, .5, 1, 0, 1];
  for (let r = 1; r <= 7; r++) { for (let j = 0; j < 4; j++) { const a = circle[j], b = circle[7 - j]; const score = a === 0 ? main[r - 1] : b === 0 ? 1 - main[r - 1] : (a + b + r) % 4 === 0 ? .5 : a < b ? 1 : 0; const c = (r + j) % 2 === 0 ? 'white' : 'black'; players[a].rounds.push({ round: r, board: j + 1, opponentId: players[b].id, opponent: players[b].name, rating: players[b].rating, color: c, score, status: 'played', playerWhite: c === 'white' ? players[a].name : players[b].name, playerBlack: c === 'black' ? players[a].name : players[b].name, result: score === 1 ? '1 - 0' : score === 0.5 ? '½ - ½' : '0 - 1' }); players[b].rounds.push({ round: r, board: j + 1, opponentId: players[a].id, opponent: players[a].name, rating: players[a].rating, color: c === 'white' ? 'black' : 'white', score: 1 - score, status: 'played', playerWhite: c === 'white' ? players[a].name : players[b].name, playerBlack: c === 'black' ? players[a].name : players[b].name, result: score === 1 ? '1 - 0' : score === 0.5 ? '½ - ½' : '0 - 1' }); } circle = [circle[0], circle[7], ...circle.slice(1, 7)]; }
  players.forEach(p => p.points = p.rounds.reduce((a, r) => a + (r.score ?? 0), 0)); players.forEach(p => { p.ties.SB = p.rounds.reduce((a, r) => a + (r.score ?? 0) * (players.find(x => x.id === r.opponentId)?.points ?? 0), 0); p.ties['Số thắng'] = stats(p).wins; });
  players.sort((a, b) => (b.points ?? 0) - (a.points ?? 0) || (b.ties.SB ?? 0) - (a.ties.SB ?? 0) || (b.ties['Số thắng'] ?? 0) - (a.ties['Số thắng'] ?? 0)).forEach((p, i) => p.rank = i + 1);
  return { id: 'demo', name: 'Giải Siêu Tài Năng Nhí', group: 'U08 · Bảng minh họa', source: '', updated: null, demo: true, players, tieLabels: ['SB', 'Số thắng'], rounds: 7, published: true }
}


