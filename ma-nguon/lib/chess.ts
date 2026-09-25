export type Round = {
  round: number;
  board?: number | null;
  opponentId?: string;
  opponent: string;
  rating: number | null;
  color: 'WHITE' | 'BLACK' | 'white' | 'black' | null;
  score: number | null;
  status: 'played' | 'pending' | 'scheduled' | 'bye' | 'forfeit' | 'unknown';
  raw?: string;
  playerWhite?: string;
  playerBlack?: string;
  result?: string;
  resultOutcome?: 'WIN' | 'DRAW' | 'LOSS' | 'BYE' | 'PENDING' | string;
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
  totalPlayers?: number;
  points: number | null;
  hs1?: number | null;
  hs2?: number | null;
  hs3?: number | null;
  hs4?: number | null;
  hs5?: number | null;
  buchholz?: number | null;
  sonnebornBerger?: number | null;
  performance?: number | null;
  gender?: string | null;
  ageGroup?: string | null;
  ties: Record<string, number | null>;
  tieBreakArray?: (number | null)[];
  rounds: Round[];
  detailsLoaded: boolean;
  warning?: string | null;
  games?: number;
  totalGames?: number;
  whiteGames?: number;
  blackGames?: number;
  whiteWins?: number;
  whiteDraws?: number;
  whiteLosses?: number;
  blackWins?: number;
  blackDraws?: number;
  blackLosses?: number;
  wins?: number;
  draws?: number;
  losses?: number;
  nextMatch?: Round | null;
  medalPrediction?: { medal: string; label: string; status?: 'matched' | 'no_rules' | 'outside_range' | 'no_rank' | 'error' | string; type?: string } | null;
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
  group?: string;
  group_name?: string;
  rank?: number;
  rankFrom?: number;
  rankTo?: number;
  rank_from?: number;
  rank_to?: number;
  prizeName?: string;
  prize_name?: string;
  medal?: 'gold' | 'silver' | 'bronze' | 'consolation' | 'none' | 'top' | 'custom' | string;
  gift?: string;
  description?: string;
  tournamentId?: string;
  tournament_id?: string;
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
  tieBreakDescriptions?: string[];
  rounds: number | null;
  currentRound?: number | null;
  completedRounds?: number | null;
  published?: boolean;
  autoSync?: boolean;
  auto_sync?: boolean;
  syncInterval?: number;
  sync_interval?: number;
  lastSync?: string | null;
  last_sync?: string | null;
  nextSync?: string | null;
  next_sync?: string | null;
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
  const rounds = p.rounds || [];
  const uniqueRoundsMap = new Map<number, Round>();
  for (const r of rounds) {
    if (r.round != null && !uniqueRoundsMap.has(r.round)) {
      uniqueRoundsMap.set(r.round, r);
    }
  }
  const uniqueRounds = Array.from(uniqueRoundsMap.values());
  const playedRounds = uniqueRounds.filter(r => r.status === 'played');

  let white = 0;
  let whiteWins = 0;
  let whiteDraws = 0;
  let whiteLosses = 0;

  let black = 0;
  let blackWins = 0;
  let blackDraws = 0;
  let blackLosses = 0;

  let wins = 0;
  let draws = 0;
  let losses = 0;
  let points = 0;

  for (const rd of uniqueRounds) {
    if (rd.status === 'played' || rd.status === 'bye' || rd.status === 'forfeit') {
      if (rd.score != null) {
        points += rd.score;
      }
    }
  }

  for (const rd of playedRounds) {
    let score = rd.score;
    if (score === null || score === undefined) {
      if (rd.result) {
        if (rd.result.includes('1 - 0') || rd.result.includes('1-0')) score = (rd.color?.toLowerCase() === 'black' ? 0 : 1);
        else if (rd.result.includes('0 - 1') || rd.result.includes('0-1')) score = (rd.color?.toLowerCase() === 'black' ? 1 : 0);
        else if (rd.result.includes('½') || rd.result.includes('1/2')) score = 0.5;
      }
    }

    if (score === 1) wins++;
    else if (score === 0.5) draws++;
    else if (score === 0) losses++;

    const c = rd.color?.toLowerCase();
    let isWhite = c === 'white' || (rd.playerWhite && rd.playerWhite.trim().toLowerCase() === p.name.trim().toLowerCase());
    let isBlack = c === 'black' || (rd.playerBlack && rd.playerBlack.trim().toLowerCase() === p.name.trim().toLowerCase());

    if (!isWhite && !isBlack) {
      if (rd.round % 2 === 1) isWhite = true;
      else isBlack = true;
    }

    if (isWhite) {
      white++;
      if (score === 1) whiteWins++;
      else if (score === 0.5) whiteDraws++;
      else if (score === 0) whiteLosses++;
    } else if (isBlack) {
      black++;
      if (score === 1) blackWins++;
      else if (score === 0.5) blackDraws++;
      else if (score === 0) blackLosses++;
    }
  }

  const totalPlayed = playedRounds.length;
  const whiteCount = white;
  const blackCount = black;

  return {
    played: totalPlayed,
    points,
    wins,
    draws,
    losses,
    white: whiteCount,
    whiteGames: whiteCount,
    whiteWins,
    whiteDraws,
    whiteLosses,
    black: blackCount,
    blackGames: blackCount,
    blackWins,
    blackDraws,
    blackLosses,
    unknown: uniqueRounds.filter(x => x.color === null && x.status === 'played').length,
    special: uniqueRounds.filter(x => ['bye', 'forfeit'].includes(x.status)).length,
    winRate: totalPlayed > 0 ? Math.round((wins / totalPlayed) * 100) : null
  };
}

export function normalizeCategoryGroup(s?: string): string {
  if (!s) return '';
  return normalize(s)
    .replace(/\bbang\b/g, '')
    .replace(/\bnhom\b/g, '')
    .replace(/\bu0*(\d+)\b/g, 'u$1')
    .replace(/\bu\s+0*(\d+)\b/g, 'u$1')
    .replace(/\bu-0*(\d+)\b/g, 'u$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchCategoryGroup(ruleGrp?: string, userGrp?: string): boolean {
  if (!userGrp || !ruleGrp) return true;

  const rNorm = normalizeCategoryGroup(ruleGrp);
  const uNorm = normalizeCategoryGroup(userGrp);

  if (
    rNorm === 'tat ca' || rNorm.includes('tat ca') ||
    rNorm === 'toan gia' || rNorm.includes('toan gia') ||
    rNorm === 'toan bang' || rNorm.includes('toan bang') ||
    rNorm === 'all' || rNorm === ''
  ) {
    return true;
  }
  if (rNorm === uNorm || uNorm.includes(rNorm) || rNorm.includes(uNorm)) return true;

  // Check gender conflict
  const isRuleMale = rNorm.includes('nam');
  const isRuleFemale = rNorm.includes('nu') && !rNorm.includes('nam');
  const isUserMale = uNorm.includes('nam');
  const isUserFemale = uNorm.includes('nu') && !uNorm.includes('nam');

  if ((isRuleMale && isUserFemale) || (isRuleFemale && isUserMale)) {
    return false;
  }

  // Extract age/division tags (e.g. u6, u8, u10, u11, open, baby, tre)
  const rAgeMatch = rNorm.match(/\b(u\d+|open|baby|trung|nhi|truong thanh|tre)\b/g);
  const uAgeMatch = uNorm.match(/\b(u\d+|open|baby|trung|nhi|truong thanh|tre)\b/g);

  if (rAgeMatch && uAgeMatch) {
    const hasCommonAge = rAgeMatch.some(tag => uAgeMatch.includes(tag));
    if (!hasCommonAge) return false;
  }

  const stopWords = new Set(['bang', 'nhom', 'giai', 'co', 'vua', 'cau', 'thu', 'hang']);
  const rTokens = rNorm.split(/\s+/).filter(t => t.length >= 2 && !stopWords.has(t));
  const uTokens = uNorm.split(/\s+/).filter(t => t.length >= 2 && !stopWords.has(t));

  if (rTokens.length > 0 && uTokens.length > 0) {
    return rTokens.some(t => uTokens.includes(t));
  }

  return false;
}

export type MedalPredictionResult = {
  medal: string;
  label: string;
  status: 'matched' | 'no_rules' | 'outside_range' | 'no_rank' | 'error';
  matchedRule?: PrizeRule;
  isOfficial?: boolean;
};

export function getMedal(
  rank: number | null,
  group?: string,
  prizes?: PrizeRule[],
  options?: { loadError?: boolean }
): MedalPredictionResult {
  if (options?.loadError) {
    return {
      medal: '⚠️',
      label: 'Chưa tải được thông tin giải thưởng',
      status: 'error'
    };
  }

  if (rank == null || rank <= 0 || isNaN(rank)) {
    return {
      medal: '♟',
      label: 'Chưa đủ dữ liệu xét giải',
      status: 'no_rank'
    };
  }

  if (!prizes || prizes.length === 0) {
    return {
      medal: 'ℹ️',
      label: 'Chưa cấu hình giải thưởng',
      status: 'no_rules'
    };
  }

  const matching = prizes.filter(p => {
    const rf = p.rank_from ?? p.rankFrom ?? (p as any).fromRank ?? (p as any).from_rank ?? (p as any).startRank ?? (p as any).start_rank ?? p.rank;
    const rt = p.rank_to ?? p.rankTo ?? (p as any).toRank ?? (p as any).to_rank ?? (p as any).endRank ?? (p as any).end_rank ?? p.rank ?? rf;
    const rNum = p.rank != null && !isNaN(Number(p.rank)) ? Number(p.rank) : null;
    const rfNum = rf != null && !isNaN(Number(rf)) ? Number(rf) : null;
    const rtNum = rt != null && !isNaN(Number(rt)) ? Number(rt) : null;

    const fromVal = rfNum !== null ? rfNum : rNum;
    const toVal = rtNum !== null ? rtNum : (rNum !== null ? rNum : fromVal);

    if (fromVal === null || toVal === null) return false;
    const rankMatches = rank >= fromVal && rank <= toVal;
    if (!rankMatches) return false;

    const ruleGrp = p.group_name || p.group || (p as any).groupName || (p as any).category;
    return matchCategoryGroup(ruleGrp, group);
  });

  if (matching.length > 0) {
    // Prioritize specific category match over 'tat ca'
    const specificMatch = group ? matching.find(p => {
      const ruleGrp = p.group_name || p.group || (p as any).groupName || (p as any).category;
      if (!ruleGrp) return false;
      const norm = normalizeCategoryGroup(ruleGrp);
      return !norm.includes('tat ca') && norm !== 'all' && !norm.includes('toan gia') && !norm.includes('toan bang');
    }) : null;

    const match = specificMatch || matching[0];
    const label = match.prize_name || match.prizeName || (match as any).name || (match as any).title || (match.gift ? `${match.gift}` : `Hạng ${rank}`);
    let medalIcon = '🏆';
    const medalRaw = match.medal || (match as any).medalType || (match as any).medal_type || (match as any).type || '';
    const mStr = String(medalRaw).toLowerCase();
    const pNameLower = label.toLowerCase();
    const pNameNorm = normalize(label);

    const isKK =
      pNameNorm.includes('khuyen khich') ||
      pNameLower.includes('khuyến khích') ||
      pNameNorm.includes('bang khen') ||
      pNameLower.includes('bằng khen') ||
      /\bkk\b/i.test(label) ||
      mStr.includes('consolation') ||
      mStr.includes('khuyen khich');

    if (isKK) {
      medalIcon = '🎖';
    } else if (mStr.includes('gold') || mStr.includes('vang') || pNameLower.includes('gold') || pNameLower.includes('vàng') || pNameLower.includes('vang')) {
      medalIcon = '🥇';
    } else if (mStr.includes('silver') || mStr.includes('bac') || pNameLower.includes('silver') || pNameLower.includes('bạc') || pNameLower.includes('bac')) {
      medalIcon = '🥈';
    } else if (mStr.includes('bronze') || mStr.includes('dong') || pNameLower.includes('bronze') || pNameLower.includes('đồng') || pNameLower.includes('dong')) {
      medalIcon = '🥉';
    } else if (mStr.includes('certificate') || mStr.includes('consolation') || mStr.includes('khuyen khich') || mStr.includes('top') || mStr.includes('khen') || mStr.includes('bang') || rank >= 4) {
      medalIcon = '🎖';
    }

    return { medal: medalIcon, label, status: 'matched', matchedRule: match };
  }

  // If prizes array exists but rank doesn't match any configured rule range
  return {
    medal: '🎖',
    label: 'Ngoài phạm vi giải thưởng',
    status: 'outside_range'
  };
}

export type PrizeBadge = {
  icon: string;
  shortLabel: string;
  fullTitle: string;
  type: 'gold' | 'silver' | 'bronze' | 'encouragement' | 'custom';
};

export function getPrizeBadge(
  rank: number | null | undefined,
  group?: string,
  prizes?: PrizeRule[]
): PrizeBadge | null {
  if (rank == null || rank <= 0 || !prizes || prizes.length === 0) {
    return null;
  }

  const medalResult = getMedal(rank, group, prizes);
  if (medalResult.status !== 'matched' || !medalResult.matchedRule) {
    return null;
  }

  const match = medalResult.matchedRule;
  const fullTitle =
    medalResult.label ||
    match.prize_name ||
    match.prizeName ||
    (match as any).name ||
    (match as any).title ||
    `Hạng ${rank}`;

  const icon = medalResult.medal || '🏆';

  if (icon === '🥇') {
    return { icon, shortLabel: 'HCV', fullTitle, type: 'gold' };
  }
  if (icon === '🥈') {
    return { icon, shortLabel: 'HCB', fullTitle, type: 'silver' };
  }
  if (icon === '🥉') {
    return { icon, shortLabel: 'HCĐ', fullTitle, type: 'bronze' };
  }
  if (icon === '🎖') {
    return { icon, shortLabel: 'KK', fullTitle, type: 'encouragement' };
  }

  return {
    icon,
    shortLabel: fullTitle,
    fullTitle,
    type: 'custom'
  };
}

export const getStandingPrizeBadge = getPrizeBadge;

export type StandingPredictedPrize = PrizeBadge;
export const getPredictedPrizeForRank = getPrizeBadge;

export function getNextMatch(p: Player): Round | null {
  if (!p.rounds || !p.rounds.length) return null;
  const match = p.rounds.find(r => r.status === 'scheduled' || r.status === 'pending');
  if (!match) return null;

  let colorClean: 'white' | 'black' = 'white';
  const cLower = match.color ? match.color.toLowerCase() : '';
  if (cLower === 'white' || cLower === 'black') {
    colorClean = cLower;
  } else if (match.playerBlack && match.playerBlack.trim().toLowerCase() === p.name.trim().toLowerCase()) {
    colorClean = 'black';
  } else if (match.playerWhite && match.playerWhite.trim().toLowerCase() === p.name.trim().toLowerCase()) {
    colorClean = 'white';
  } else {
    colorClean = match.round % 2 === 1 ? 'white' : 'black';
  }

  const isWhite = colorClean === 'white' || (match.playerWhite && match.playerWhite.trim().toLowerCase() === p.name.trim().toLowerCase());
  const playerWhite = match.playerWhite || (isWhite ? p.name : match.opponent);
  const playerBlack = match.playerBlack || (!isWhite ? p.name : match.opponent);

  return {
    round: match.round,
    board: match.board ?? null,
    playerWhite,
    playerBlack,
    opponent: match.opponent,
    color: colorClean,
    status: 'scheduled',
    opponentId: match.opponentId,
    rating: match.rating ?? null,
    score: null
  };
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


