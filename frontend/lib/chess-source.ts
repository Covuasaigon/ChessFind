import { num, normalize, formatClubName, stats, type Tournament, type Player, type Round } from './chess';

const HOSTS = new Set(['chess-results.com', 'www.chess-results.com', 's1.chess-results.com', 's2.chess-results.com', 's3.chess-results.com']);

export function validateSource(input: string) {
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    throw Error('Đường dẫn không hợp lệ. Hãy dán link một giải đấu/bảng đấu Chess-Results.');
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:' || !HOSTS.has(u.hostname.toLowerCase()) || u.username || u.password || u.port)
    throw Error('Chỉ chấp nhận đường dẫn Chess-Results chính thức.');
  const m = u.pathname.match(/^\/tnr(\d+)\.aspx$/i);
  if (!m) throw Error('Cần link bảng đấu có dạng tnr123456.aspx.');
  u.protocol = 'https:';
  u.hash = '';
  return { url: u, id: m[1] };
}

async function fetchSource(url: URL) {
  let u = url;
  for (let hop = 0; hop < 4; hop++) {
    validateSource(u.href);
    let r: Response;
    try {
      r = await fetch(u.href, { redirect: 'manual', signal: AbortSignal.timeout(20000), headers: { 'Accept': 'text/html', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    } catch {
      throw Error('Không kết nối được Chess-Results. Hãy thử lại sau; dữ liệu cũ không bị thay đổi.');
    }
    if (r.status >= 300 && r.status < 400) {
      const target = r.headers.get('location');
      if (!target) throw Error('Nguồn chuyển hướng không hợp lệ.');
      u = new URL(target, u);
      continue;
    }
    if (!r.ok) throw Error(r.status === 429 ? 'Chess-Results đang giới hạn truy cập. Vui lòng chờ rồi thử lại.' : `Nguồn Chess-Results trả lỗi ${r.status}. Dữ liệu cũ được giữ nguyên.`);
    if (Number(r.headers.get('content-length') || 0) > 5_000_000) throw Error('Trang nguồn quá lớn. Hãy chọn link từng bảng đấu.');
    const reader = r.body?.getReader();
    if (!reader) throw Error('Nguồn không có dữ liệu.');
    const chunks: Uint8Array[] = [];
    let n = 0;
    while (true) {
      const x = await reader.read();
      if (x.done) break;
      n += x.value.byteLength;
      if (n > 5_000_000) { await reader.cancel(); throw Error('Trang nguồn vượt giới hạn kích thước.'); }
      chunks.push(x.value);
    }
    const buffer = new Uint8Array(n);
    let pos = 0;
    for (const c of chunks) { buffer.set(c, pos); pos += c.length; }
    const s = new TextDecoder('utf-8').decode(buffer);
    if (/captcha|verify you are human|access denied|just a moment/i.test(s.slice(0, 10000)))
      throw Error('Chess-Results đang yêu cầu kiểm tra truy cập. Ứng dụng không thể đọc nguồn lúc này.');
    return s;
  }
  throw Error('Nguồn chuyển hướng quá nhiều lần.');
}

const entities: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", frac12: '½' };
export function textOf(s: string) {
  return s.replace(/<[^>]*>/g, ' ').replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (_, x) => {
    if (x[0] === '#') {
      const n = x[1].toLowerCase() === 'x' ? parseInt(x.slice(2), 16) : parseInt(x.slice(1), 10);
      return n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
    }
    return entities[x] ?? ' ';
  }).replace(/\s+/g, ' ').trim();
}

export function cleanCellText(text: string): string {
  if (!text) return text;
  if (/Note:\s*To reduce/i.test(text) || /Search for player/i.test(text) || /Final Ranking/i.test(text)) {
    const match = text.match(/\b(Rk|Rank|St\.?Nr|SNo|No|Name|Tên|Pts|Points|Điểm|BH|SB|Rp|TB\d+)\b\.?$/i) ||
                  text.match(/\b(Rk|Rank|St\.?Nr|SNo|No)\b\.?/i);
    if (match) return match[0];
  }
  return text;
}

type Cell = { text: string; raw: string };
export function rowsOf(html: string) {
  return [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m => [...m[1].matchAll(/<t[dh]\b([^>]*)>([\s\S]*?)<\/t[dh]>/gi)].flatMap(c => {
    const col = { text: cleanCellText(textOf(c[2])), raw: c[2] };
    const span = Math.min(10, Number(c[1].match(/colspan\s*=\s*["']?(\d+)/i)?.[1] || 1));
    return [col, ...Array.from({ length: span - 1 }, () => ({ text: '', raw: '' }))];
  })).filter(x => x.length);
}

const key = (s: string) => normalize(s).replace(/[^a-z0-9]/g, '');
function findCol(headers: Cell[], names: string[]) { return headers.findIndex(h => names.includes(key(h.text))); }

export function parseTieBreakDescriptions(html: string): string[] {
  const result: string[] = [];
  const map = new Map<number, string>();

  const lines = [...html.matchAll(/(?:Tie-?Break|TB|HS)\s*(\d+)[\s:\-:=]+([^\r\n<]+)/gi)];
  for (const m of lines) {
    const numIdx = parseInt(m[1], 10);
    const desc = textOf(m[2]).trim();
    if (numIdx >= 1 && numIdx <= 10 && desc && !map.has(numIdx)) {
      map.set(numIdx, desc);
    }
  }

  if (map.size < 5) {
    const blockMatch = html.match(/(?:Tie-?Break\s*(?:match rule|details|legend|criteria|tiêu chí)?|Hệ số phụ)\s*[:：]?([\s\S]*?)(?=<\/div>|<\/table>|<\/p>|<h\d|$)/i);
    if (blockMatch) {
      const blockText = textOf(blockMatch[1]);
      const items = [...blockText.matchAll(/(?:TB|HS)?\s*(\d+)[\.:\)\-]\s*([^\r\n,;]+(?:\([^)]+\))?)/gi)];
      for (const item of items) {
        const numIdx = parseInt(item[1], 10);
        const desc = item[2].trim();
        if (numIdx >= 1 && numIdx <= 10 && desc && !map.has(numIdx)) {
          map.set(numIdx, desc);
        }
      }
    }
  }

  for (let i = 1; i <= 5; i++) {
    if (map.has(i)) {
      result.push(map.get(i)!);
    }
  }
  return result;
}

export function parseRanking(html: string, source: string, group: string): Tournament {
  const { id } = validateSource(source);
  let rows = rowsOf(html);
  let hi = rows.findIndex(r => findCol(r, ['name']) >= 0 && (findCol(r, ['rk', 'rank']) >= 0 || findCol(r, ['sno', 'no']) >= 0));

  if (hi < 0) {
    throw Error('Chưa nhận diện được bảng kỳ thủ. Nguồn có thể đổi cấu trúc hoặc chưa công bố kết quả.');
  }

  const h = rows[hi];
  const ni = findCol(h, ['name', 'ten', 'namekytthu', 'hoten']);
  const ri = findCol(h, ['rk', 'rank', 'pos', 'hang', 'thuhang']);
  const si = findCol(h, ['sno', 'stnr', 'stno', 'sbd', 'no']);
  const pi = findCol(h, ['pts', 'points', 'diem']);
  const rating = findCol(h, ['rtg', 'rating', 'rtgi', 'elo']);
  const fedCol = findCol(h, ['fed', 'federation', 'ld', 'ldo', 'land']);
  const clubCol = findCol(h, ['clubcity', 'clbtinh', 'clb/tinh', 'club/city', 'club/country', 'team/city', 'club', 'clb', 'team', 'city']);
  const fideIdCol = findCol(h, ['fideid', 'fide', 'id', 'identnumber', 'ident']);
  const sexCol = findCol(h, ['sex', 'gender', 'gioitinh']);
  const typCol = findCol(h, ['typ', 'gr', 'group', 'typgr', 'kat', 'cat', 'category']);

  const knownStandardCols = new Set([ri, si, ni, pi, rating, fedCol, clubCol, fideIdCol, sexCol, typCol].filter(i => i >= 0));

  const tieBreakCols: { label: string; index: number }[] = [];
  h.forEach((cell, index) => {
    if (knownStandardCols.has(index)) return;
    const textClean = cell.text.trim();
    if (!textClean) return;
    const k = key(textClean);
    if (/^tb\d+$/i.test(k) || (!knownStandardCols.has(index) && pi >= 0 && index > pi)) {
      tieBreakCols.push({ label: cell.text || `TB${tieBreakCols.length + 1}`, index });
    }
  });

  const tieBreakDescriptions = parseTieBreakDescriptions(html);

  const players: Player[] = [];
  const seen = new Set<string>();

  for (const row of rows.slice(hi + 1)) {
    if (findCol(row, ['name']) >= 0) continue;
    if (row.length < h.length || !row[ni]?.text) continue;
    const link = row[ni].raw.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    const snr = link ? new URL(textOf(link), source).searchParams.get('snr') : (si >= 0 ? row[si]?.text : null);
    if (!snr || !/^\d+$/.test(snr)) continue;
    if (seen.has(snr)) continue;
    seen.add(snr);

    const tieValues: Record<string, number | null> = {};
    const tieBreakArray: (number | null)[] = [];

    tieBreakCols.forEach((col, idx) => {
      const rawCellVal = row[col.index]?.text || '';
      const numVal = num(rawCellVal);
      tieValues[col.label] = numVal;
      tieValues[`TB${idx + 1}`] = numVal;
      tieValues[`HS${idx + 1}`] = numVal;
      tieValues[`Hệ số ${idx + 1}`] = numVal;
      tieBreakArray.push(numVal);
    });

    const hs1 = tieBreakArray[0] ?? null;
    const hs2 = tieBreakArray[1] ?? null;
    const hs3 = tieBreakArray[2] ?? null;
    const hs4 = tieBreakArray[3] ?? null;
    const hs5 = tieBreakArray[4] ?? null;

    const parsedRank = ri >= 0 ? num(row[ri]?.text || '') : null;
    const finalRank = parsedRank ?? (players.length + 1);

    const rowSex = sexCol >= 0 ? row[sexCol]?.text : '';
    const gender = /f|w|nữ|nu|female/i.test(rowSex) || /nữ/i.test(group) ? 'Nữ' : 'Nam';

    const rowTyp = typCol >= 0 ? row[typCol]?.text : '';
    const ageGroupMatch = group.match(/(?:U\d+|Trẻ|Nhi|Tiểu học|THCS|THPT)/i)?.[0] || rowTyp || 'Toàn giải';

    const rawFed = fedCol >= 0 ? row[fedCol]?.text || null : null;
    const rawClub = clubCol >= 0 ? row[clubCol]?.text || '' : '';
    const finalClub = rawClub ? formatClubName(rawClub) : (rawFed ? formatClubName(rawFed) : '');

    players.push({
      id: `${id}-${snr}`,
      snr,
      name: row[ni].text,
      fideId: fideIdCol >= 0 ? row[fideIdCol]?.text || null : null,
      federation: rawFed,
      club: finalClub,
      rating: rating >= 0 ? num(row[rating].text) : null,
      rank: finalRank,
      points: pi >= 0 ? num(row[pi].text) : null,
      hs1,
      hs2,
      hs3,
      hs4,
      hs5,
      buchholz: hs2 ?? hs1,
      sonnebornBerger: hs3,
      performance: null,
      gender,
      ageGroup: ageGroupMatch,
      ties: tieValues,
      tieBreakArray,
      rounds: [],
      detailsLoaded: false
    });
  }

  if (!players.length) throw Error('Chưa có danh sách kỳ thủ đọc được từ nguồn.');

  const rawName = textOf(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || html.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1] || html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || `Giải đấu ${id}`);
  const name = rawName.replace(/^Chess-Results Server Chess-results\.com\s*-\s*/i, '').trim();
  const total = textOf(html).match(/(?:Number of rounds|Rounds|Số vòng)\s*[:：]?\s*(\d+)/i);

  return {
    id,
    name: name.slice(0, 240),
    group: group.slice(0, 100),
    source,
    updated: new Date().toISOString(),
    players,
    tieLabels: tieBreakCols.map((t, idx) => `Hệ số ${idx + 1}`),
    tieBreakDescriptions,
    rounds: total ? Number(total[1]) : null,
    published: false
  };
}

export async function populateRoundsForTournament(tour: Tournament): Promise<Tournament> {
  try {
    const { url } = validateSource(tour.source);
    const playerMap = new Map<string, Player>();
    const snrToPlayerMap = new Map<string, Player>();

    for (const p of tour.players) {
      playerMap.set(p.id, { ...p, rounds: p.rounds ? [...p.rounds] : [] });
      snrToPlayerMap.set(p.snr, playerMap.get(p.id)!);
    }

    let maxRound = tour.rounds || 0;
    const maxRdsToFetch = tour.rounds && tour.rounds > 0 ? tour.rounds : 11;

    // Batch fetch art=2 for rounds 1..maxRdsToFetch
    const roundFetchPromises: Promise<{ rd: number; html: string | null }>[] = [];
    for (let rd = 1; rd <= maxRdsToFetch; rd++) {
      const rdUrl = new URL(url.href);
      rdUrl.searchParams.set('lan', '1');
      rdUrl.searchParams.set('art', '2');
      rdUrl.searchParams.set('rd', String(rd));
      roundFetchPromises.push(
        fetchSource(rdUrl)
          .then(html => ({ rd, html }))
          .catch(() => ({ rd, html: null }))
      );
    }

    const roundResults = await Promise.all(roundFetchPromises);

    for (const { rd, html } of roundResults) {
      if (!html) continue;
      const rows = rowsOf(html);
      const hi = rows.findIndex(r => findCol(r, ['white', 'trang', 'weiss', 'blancs']) >= 0 && findCol(r, ['black', 'den', 'schwarz', 'noirs']) >= 0);
      if (hi < 0) continue;

      const h = rows[hi];
      let boCol = findCol(h, ['bo', 'board', 'ban', 'banso', 'br', 'tbl', 'tisch', 'b']);
      const wCol = findCol(h, ['white', 'trang', 'weiss', 'blancs']);
      const bCol = findCol(h, ['black', 'den', 'schwarz', 'noirs']);
      const resCol = findCol(h, ['result', 'res', 'ketqua', 'kq', 'ergebnis']);

      if (boCol < 0 && h.length > 0) {
        const col0Key = key(h[0].text || '');
        if ((/^bo|^br|^tbl|^tisch|^ban|^#|^no/i.test(col0Key) || col0Key === '') && 0 !== wCol && 0 !== bCol) {
          boCol = 0;
        }
      }

      const noCols = h.map((c, i) => ({ i, text: key(c.text) })).filter(c => c.text === 'no' || c.text === 'stnr' || c.text === 'sno' || c.text === 'stno' || c.text === 'sbd');
      const wNoCol = noCols[0]?.i ?? (wCol - 1);
      const bNoCol = noCols[1]?.i ?? (bCol + 1);

      let foundPairs = false;

      for (const r of rows.slice(hi + 1)) {
        if (!r[wCol] || !r[bCol]) continue;
        const nameW = r[wCol]?.text;
        const nameB = r[bCol]?.text;
        const snrW = r[wNoCol]?.text || r[wCol]?.raw.match(/snr=(\d+)/i)?.[1];
        const snrB = r[bNoCol]?.text || r[bCol]?.raw.match(/snr=(\d+)/i)?.[1];

        if (!nameW || !nameB || !snrW || !snrB) continue;

        const bo = boCol >= 0 ? num(r[boCol]?.text || '') : null;
        const rawRes = resCol >= 0 ? r[resCol]?.text.trim() : '';

        let scoreW: number | null = null;
        let scoreB: number | null = null;
        let resFmt = rawRes;
        let roundStatus: Round['status'] = 'scheduled';

        if (/1\s*[-:]\s*0/i.test(rawRes)) {
          scoreW = 1; scoreB = 0; resFmt = '1 - 0'; roundStatus = 'played';
        } else if (/0\s*[-:]\s*1/i.test(rawRes)) {
          scoreW = 0; scoreB = 1; resFmt = '0 - 1'; roundStatus = 'played';
        } else if (/½|0\.5|1\/2/i.test(rawRes)) {
          scoreW = 0.5; scoreB = 0.5; resFmt = '½ - ½'; roundStatus = 'played';
        } else {
          scoreW = null;
          scoreB = null;
          resFmt = rawRes || '—';
          roundStatus = 'scheduled';
        }

        const pW = snrToPlayerMap.get(snrW);
        const pB = snrToPlayerMap.get(snrB);

        if (pW) {
          const existingR = pW.rounds.find(x => x.round === rd);
          if (existingR) {
            if (bo != null) existingR.board = bo;
            if (roundStatus === 'played') existingR.status = 'played';
            if (scoreW != null) existingR.score = scoreW;
            if (resFmt && resFmt !== '—') existingR.result = resFmt;
            if (nameB) existingR.opponent = nameB;
            if (pB) existingR.opponentId = pB.id;
            existingR.playerWhite = nameW;
            existingR.playerBlack = nameB;
          } else {
            pW.rounds.push({
              round: rd,
              board: bo,
              opponentId: pB ? pB.id : `${tour.id}-${snrB}`,
              opponent: nameB,
              rating: null,
              color: 'white',
              status: roundStatus,
              score: scoreW,
              playerWhite: nameW,
              playerBlack: nameB,
              result: resFmt
            });
          }
        }

        if (pB) {
          const existingR = pB.rounds.find(x => x.round === rd);
          if (existingR) {
            if (bo != null) existingR.board = bo;
            if (roundStatus === 'played') existingR.status = 'played';
            if (scoreB != null) existingR.score = scoreB;
            if (resFmt && resFmt !== '—') existingR.result = resFmt;
            if (nameW) existingR.opponent = nameW;
            if (pW) existingR.opponentId = pW.id;
            existingR.playerWhite = nameW;
            existingR.playerBlack = nameB;
          } else {
            pB.rounds.push({
              round: rd,
              board: bo,
              opponentId: pW ? pW.id : `${tour.id}-${snrW}`,
              opponent: nameW,
              rating: null,
              color: 'black',
              status: roundStatus,
              score: scoreB,
              playerWhite: nameW,
              playerBlack: nameB,
              result: resFmt
            });
          }
        }

        foundPairs = true;
      }

      if (foundPairs && rd > maxRound) maxRound = rd;
    }

    // Fallback: If art=2 produced no rounds, try art=79
    if (maxRound === 0) {
      try {
        const url79 = new URL(url.href);
        url79.searchParams.set('lan', '1');
        url79.searchParams.set('art', '79');
        url79.searchParams.set('zeilen', '99999');
        const html79 = await fetchSource(url79);

        for (const p of snrToPlayerMap.values()) {
          try {
            const playerWithRounds = parsePlayer(html79, p, tour);
            if (playerWithRounds.rounds && playerWithRounds.rounds.length > 0) {
              p.rounds = playerWithRounds.rounds;
              for (const r of p.rounds) {
                if (r.round > maxRound) maxRound = r.round;
              }
            }
          } catch {}
        }
      } catch {}
    }

    // Calculate tournament round metadata (currentRound, completedRounds)
    const allPlayedRounds = new Set<number>();
    const allKnownRounds = new Set<number>();

    for (const p of snrToPlayerMap.values()) {
      if (p.rounds) {
        for (const r of p.rounds) {
          allKnownRounds.add(r.round);
          if (r.status === 'played') {
            allPlayedRounds.add(r.round);
          }
        }
      }
    }

    const completedRounds = allPlayedRounds.size > 0 ? Math.max(...Array.from(allPlayedRounds)) : 0;
    let currentRound = 0;
    if (allKnownRounds.size > 0) {
      currentRound = Math.max(...Array.from(allKnownRounds));
    } else if (tour.rounds && tour.rounds > 0) {
      currentRound = 1;
    }

    tour.completedRounds = completedRounds;
    tour.currentRound = currentRound;

    // Update all player stats in tour.players
    tour.players = tour.players.map(p => {
      const updatedP = snrToPlayerMap.get(p.snr) || p;
      if (updatedP.rounds && updatedP.rounds.length > 0) {
        updatedP.rounds.sort((a, b) => a.round - b.round);
      }
      const s = stats(updatedP);
      return {
        ...updatedP,
        points: s.points,
        detailsLoaded: updatedP.rounds && updatedP.rounds.length > 0,
        games: s.played,
        totalGames: s.played,
        whiteGames: s.whiteGames,
        blackGames: s.blackGames,
        wins: s.wins,
        draws: s.draws,
        losses: s.losses,
        whiteWins: s.whiteWins,
        whiteDraws: s.whiteDraws,
        whiteLosses: s.whiteLosses,
        blackWins: s.blackWins,
        blackDraws: s.blackDraws,
        blackLosses: s.blackLosses
      };
    });

    if (maxRound > 0) tour.rounds = maxRound;
  } catch (err) {
    console.warn('Auto-populating rounds notice:', err);
  }
  return tour;
}

export async function importTournament(source: string, group: string) {
  const { url } = validateSource(source);
  url.searchParams.set('lan', '1');
  url.searchParams.set('art', '1');
  url.searchParams.set('zeilen', '99999');
  url.searchParams.delete('snr');
  url.searchParams.delete('rd');
  let html = await fetchSource(url);

  // Check if art=1 gave zero rows or load notice; fallback to art=0
  const tempRows = rowsOf(html);
  const hi = tempRows.findIndex(r => findCol(r, ['name']) >= 0 && (findCol(r, ['rk', 'rank']) >= 0 || findCol(r, ['sno', 'no']) >= 0));
  if (hi < 0) {
    url.searchParams.set('art', '0');
    html = await fetchSource(url);
  }

  const tour = parseRanking(html, url.href, group);
  return await populateRoundsForTournament(tour);
}

export type CategoryDetectResult = {
  id: string;
  group: string;
  name: string;
  source: string;
  playerCount: number;
  status: 'Chưa nhập' | 'Đã nhập';
};

export async function detectCategories(source: string): Promise<{ mainName: string; categories: CategoryDetectResult[] }> {
  const { url, id } = validateSource(source);
  const targetId = parseInt(id, 10);
  url.searchParams.set('lan', '1');

  // Fetch target page
  const html = await fetchSource(url);
  const rawTitle = textOf(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || html.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1] || `Giải đấu ${id}`)
    .replace(/^Chess-Results Server Chess-results\.com\s*-\s*/i, '').trim();

  // Extract base tournament name
  let baseName = rawTitle;
  if (rawTitle.includes(' - ')) {
    const parts = rawTitle.split(' - ');
    if (/(?:bảng|u\d+|nam|nữ|trẻ|nhi|open|girls|boys)/i.test(parts[0])) {
      baseName = parts.slice(1).join(' - ').trim();
    } else {
      baseName = parts[0].trim();
    }
  }

  const categories: CategoryDetectResult[] = [];
  const seenIds = new Set<string>();

  // Helper to scan a specific TNR ID
  async function checkTnrId(catId: number): Promise<CategoryDetectResult | null> {
    const catIdStr = String(catId);
    if (seenIds.has(catIdStr)) return null;
    try {
      const u = new URL(`https://chess-results.com/tnr${catId}.aspx?lan=1&art=1&zeilen=99999`);
      let pageHtml = await fetchSource(u);
      let pageRows = rowsOf(pageHtml);
      let hi = pageRows.findIndex(r => findCol(r, ['name']) >= 0 && (findCol(r, ['rk', 'rank']) >= 0 || findCol(r, ['sno', 'no']) >= 0));

      if (hi < 0) {
        u.searchParams.set('art', '0');
        pageHtml = await fetchSource(u);
        pageRows = rowsOf(pageHtml);
        hi = pageRows.findIndex(r => findCol(r, ['name']) >= 0 && (findCol(r, ['rk', 'rank']) >= 0 || findCol(r, ['sno', 'no']) >= 0));
      }

      const tStr = textOf(pageHtml.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/^Chess-Results Server Chess-results\.com\s*-\s*/i, '').trim();
      if (!tStr || tStr.includes('Tournament-Database') || tStr.includes('Error')) return null;

      // Check title match
      const isMatch = tStr.includes(baseName) || (baseName.length > 6 && tStr.includes(baseName.slice(0, 15))) || catId === targetId;
      if (!isMatch) return null;

      seenIds.add(catIdStr);

      let catGroup = 'Toàn giải';
      if (tStr.includes(' - ')) {
        const parts = tStr.split(' - ');
        for (const p of parts) {
          if (/(?:bảng|u\d+|nam|nữ|trẻ|nhi|open|girls|boys)/i.test(p) && !p.includes(baseName)) {
            catGroup = p.trim();
            break;
          }
        }
      }

      const pCount = pageRows.slice(hi + 1).filter(r => r.length >= 3 && /^\d+$/.test(r[0]?.text || r[1]?.text || '')).length;

      return {
        id: catIdStr,
        group: catGroup,
        name: tStr,
        source: u.href,
        playerCount: pCount,
        status: 'Chưa nhập'
      };
    } catch {
      return null;
    }
  }

  // Scan range around targetId
  const promises: Promise<CategoryDetectResult | null>[] = [];
  for (let offset = -20; offset <= 20; offset++) {
    promises.push(checkTnrId(targetId + offset));
  }

  const results = await Promise.all(promises);
  for (const res of results) {
    if (res) categories.push(res);
  }

  // Also check links on target HTML page
  const links = html.matchAll(/href\s*=\s*["']([^"']*tnr(\d+)\.aspx[^"']*)["']/gi);
  for (const m of links) {
    const cId = parseInt(m[2], 10);
    if (!isNaN(cId) && !seenIds.has(String(cId))) {
      const res = await checkTnrId(cId);
      if (res) categories.push(res);
    }
  }

  // Ensure current URL is included if missing
  if (!categories.some(c => c.id === id)) {
    const selfRes = await checkTnrId(targetId);
    if (selfRes) categories.push(selfRes);
  }

  categories.sort((a, b) => Number(a.id) - Number(b.id));

  return { mainName: baseName, categories };
}

export function parsePlayer(html: string, p: Player, t: Tournament): Player {
  const rows = rowsOf(html);
  const hi = rows.findIndex(r =>
    findCol(r, ['rd', 'round', 'vong', 'v', 'r']) >= 0 &&
    findCol(r, ['name', 'ten', 'doithu', 'doi', 'opp', 'opponent', 'kytthu', 'hoten', 'spieler']) >= 0 &&
    findCol(r, ['res', 'result', 'ketqua', 'kq', 'ergebnis']) >= 0
  );
  if (hi < 0) throw Error('Chưa đọc được chi tiết từng vòng từ nguồn. Điểm và thứ hạng vẫn được giữ theo bảng đã đồng bộ.');

  const h = rows[hi];
  const ni = findCol(h, ['name', 'ten', 'doithu', 'doi', 'opp', 'opponent', 'kytthu', 'hoten', 'spieler']);
  const ri = findCol(h, ['rd', 'round', 'vong', 'v', 'r']);
  const boCol = findCol(h, ['bo', 'board', 'ban', 'banso', 'br', 'tbl', 'tisch', 'b']);
  const rating = findCol(h, ['rtg', 'rating', 'elo']);
  const res = findCol(h, ['res', 'result', 'ketqua', 'kq', 'ergebnis']);
  const colorCol = findCol(h, ['wb', 'w/b', 'color', 'mau', 'mauquan', 'ks', 'k/s', 'farbe']);

  const rounds: Round[] = [];
  const seenRounds = new Set<number>();

  for (const r of rows.slice(hi + 1)) {
    const rd = num(r[ri]?.text || '');
    if (rd === null || rd < 1 || rd > 100 || !r[ni]) continue;
    if (seenRounds.has(rd)) continue;

    let bo = boCol >= 0 ? num(r[boCol]?.text || '') : null;
    const existingP = p.rounds?.find(x => x.round === rd);
    if (bo === null && existingP && existingP.board != null) {
      bo = existingP.board;
    }

    let rawCellText = res >= 0 ? (r[res]?.text || '').trim() : '';
    if (!rawCellText || /^(?:w|b|trắng|đen|\(w\)|\(b\))$/i.test(rawCellText)) {
      if (res >= 0 && r[res + 1] && /^[01½\.]+$|^[+−-]$|^[01][kK]$/i.test(r[res + 1].text.trim())) {
        rawCellText = r[res + 1].text.trim();
      } else {
        const scoreCell = r.find(c => /^[01½\.]+$|^[+−-]$|^[01][kK]$/i.test(c.text.trim()));
        rawCellText = scoreCell?.text.trim() || rawCellText;
      }
    }

    let colorStr = colorCol >= 0 ? (r[colorCol]?.text || '').trim() : '';
    if (!colorStr) {
      const colorCell = r.find(c => /^\(?[wb]\.?\)?$/i.test(c.text.trim()));
      colorStr = colorCell?.text || '';
    }
    const colorClean = colorStr.trim().toLowerCase();
    const isWhite = /^w|\(w\)/i.test(colorClean) || colorClean === 'white' || colorClean === 'trắng';
    const isBlack = /^b|\(b\)/i.test(colorClean) || colorClean === 'black' || colorClean === 'đen';
    const color = isWhite ? 'white' : isBlack ? 'black' : null;

    let raw = rawCellText.replace(/\b[wb]\b/ig, '').trim();

    const opponent = r[ni].text;
    const snr = r[ni].raw.match(/[?&](?:amp;)?snr=(\d+)/i)?.[1];
    let status: Round['status'] = 'unknown', score: number | null = null;

    if (/bye|not paired|unpaired|spielfrei/i.test(opponent)) {
      status = 'bye'; score = num(raw);
    } else if (/^[+−-]$|[kK]$|forfeit/i.test(raw)) {
      status = 'forfeit'; score = raw === '+' ? 1 : /^[−-]$/.test(raw) ? 0 : num(raw.replace(/[kK]/g, ''));
    } else if (raw === '' || raw === '*' || raw === '—') {
      status = 'scheduled';
      score = null;
    } else if (/1\s*[-:]\s*0/i.test(raw)) {
      status = 'played'; score = 1;
    } else if (/0\s*[-:]\s*1/i.test(raw)) {
      status = 'played'; score = 0;
    } else if (/½|0\.5|1\/2/i.test(raw)) {
      status = 'played'; score = 0.5;
    } else {
      score = num(raw);
      if (score !== null && [0, .5, 1].includes(score)) status = 'played';
      else {
        score = null;
        status = 'scheduled';
      }
    }

    seenRounds.add(rd);

    if (rounds.some(x => x.round === rd)) continue;

    const resFmt = score === 1 ? '1 - 0' : score === 0.5 ? '½ - ½' : score === 0 ? '0 - 1' : raw || '—';

    let playerWhite: string;
    let playerBlack: string;

    if (status === 'bye' || /bye|not paired|unpaired|spielfrei/i.test(opponent)) {
      playerWhite = p.name;
      playerBlack = 'Miễn đấu (Bye)';
    } else if (color === 'black') {
      playerWhite = opponent;
      playerBlack = p.name;
    } else {
      playerWhite = p.name;
      playerBlack = opponent;
    }

    rounds.push({
      round: rd,
      board: bo,
      opponentId: snr ? `${t.id}-${snr}` : undefined,
      opponent,
      rating: rating >= 0 ? num(r[rating]?.text || '') : null,
      color,
      status,
      score,
      raw,
      playerWhite,
      playerBlack,
      result: resFmt
    });
  }

  if (!rounds.length) throw Error('Nguồn chưa có chi tiết các ván đấu.');
  rounds.sort((a, b) => a.round - b.round);

  let warning: string | undefined = undefined;
  if (p.points !== null && p.points !== undefined) {
    const sumPlayed = rounds.reduce((acc, r) => acc + (r.score ?? 0), 0);
    if (Math.abs(sumPlayed - p.points) > 0.01) {
      warning = `[SYNC WARNING] Player "${p.name}" (SNR ${p.snr}) official ranking score (${p.points}) differs from calculated match score (${sumPlayed})`;
      console.warn(warning);
    }
  }

  return { ...p, rounds, warning, detailsLoaded: true };
}

export async function importPlayer(t: Tournament, p: Player) {
  const existingPlayer = t.players?.find(x => x.id === p.id || x.snr === p.snr);
  if (existingPlayer && existingPlayer.rounds && existingPlayer.rounds.length > 0 && existingPlayer.rounds.some(r => r.color === 'white' || r.color === 'black')) {
    const s = stats(existingPlayer);
    return {
      ...existingPlayer,
      detailsLoaded: true,
      games: s.played,
      totalGames: s.played,
      whiteGames: s.whiteGames,
      blackGames: s.blackGames,
      wins: s.wins,
      draws: s.draws,
      losses: s.losses,
      whiteWins: s.whiteWins,
      whiteDraws: s.whiteDraws,
      whiteLosses: s.whiteLosses,
      blackWins: s.blackWins,
      blackDraws: s.blackDraws,
      blackLosses: s.blackLosses
    };
  }

  const updatedTour = await populateRoundsForTournament({ ...t, players: t.players || [p] });
  let fetchedP = updatedTour.players?.find(x => x.id === p.id || x.snr === p.snr) || p;

  if (!fetchedP.rounds || fetchedP.rounds.length === 0) {
    try {
      const url9 = new URL(t.source);
      url9.searchParams.set('lan', '1');
      url9.searchParams.set('art', '9');
      url9.searchParams.set('snr', p.snr);
      url9.searchParams.delete('rd');
      fetchedP = parsePlayer(await fetchSource(url9), p, t);
    } catch {}
  }

  if (fetchedP.rounds) {
    fetchedP.rounds = fetchedP.rounds.map(r => {
      let color = r.color;
      if (!color) {
        if (r.playerWhite && r.playerWhite.trim().toLowerCase() === fetchedP.name.trim().toLowerCase()) color = 'white';
        else if (r.playerBlack && r.playerBlack.trim().toLowerCase() === fetchedP.name.trim().toLowerCase()) color = 'black';
        else color = r.round % 2 === 1 ? 'white' : 'black';
      }
      return { ...r, color };
    });
  }

  const s = stats(fetchedP);
  return {
    ...fetchedP,
    detailsLoaded: true,
    games: s.played,
    totalGames: s.played,
    whiteGames: s.whiteGames,
    blackGames: s.blackGames,
    wins: s.wins,
    draws: s.draws,
    losses: s.losses,
    whiteWins: s.whiteWins,
    whiteDraws: s.whiteDraws,
    whiteLosses: s.whiteLosses,
    blackWins: s.blackWins,
    blackDraws: s.blackDraws,
    blackLosses: s.blackLosses
  };
}
