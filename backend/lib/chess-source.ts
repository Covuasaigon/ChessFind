import { num, normalize, type Tournament, type Player, type Round } from './chess';

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

const key = (s: string) => normalize(s).replace(/[.\s:]/g, '');
function findCol(headers: Cell[], names: string[]) { return headers.findIndex(h => names.includes(key(h.text))); }

export function parseRanking(html: string, source: string, group: string): Tournament {
  const { id } = validateSource(source);
  let rows = rowsOf(html);
  let hi = rows.findIndex(r => findCol(r, ['name']) >= 0 && (findCol(r, ['rk', 'rank']) >= 0 || findCol(r, ['sno', 'no']) >= 0));

  if (hi < 0) {
    throw Error('Chưa nhận diện được bảng kỳ thủ. Nguồn có thể đổi cấu trúc hoặc chưa công bố kết quả.');
  }

  const h = rows[hi];
  const ni = findCol(h, ['name']);
  const ri = findCol(h, ['rk', 'rank']);
  const si = findCol(h, ['sno', 'no']);
  const pi = findCol(h, ['pts', 'points']);
  const rating = findCol(h, ['rtg', 'rating', 'rtgi', 'elo']);
  const club = findCol(h, ['club/city', 'club', 'club/country', 'team', 'city', 'club/city/fed', 'federation', 'fed', 'land']);
  const fideIdCol = findCol(h, ['fideid', 'fide', 'id', 'identnumber', 'ident']);
  const sexCol = findCol(h, ['sex', 'gender', 'gioitinh']);
  const typCol = findCol(h, ['typ', 'gr', 'group', 'typgr', 'kat', 'cat', 'category']);

  const ties = h.map((c, i) => ({ label: c.text, i })).filter(c => /^tb\d+$/i.test(key(c.label)) || /^bh|^sb|buchholz|sonneborn|performance|rp|fide rtg/i.test(key(c.label)));
  const players: Player[] = [];
  const seen = new Set<string>();

  for (const row of rows.slice(hi + 1)) {
    if (findCol(row, ['name']) >= 0) continue;
    if (row.length < h.length || !row[ni]?.text) continue;
    const link = row[ni].raw.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    const snr = link ? new URL(textOf(link), source).searchParams.get('snr') : row[si]?.text;
    if (!snr || !/^\d+$/.test(snr)) continue;
    if (seen.has(snr)) continue;
    seen.add(snr);

    const tieValues = Object.fromEntries(ties.map(t => [t.label, num(row[t.i]?.text || '')]));
    const bhVal = tieValues['BH'] ?? tieValues['Buchholz'] ?? tieValues['BH.'] ?? tieValues['BH-1'] ?? tieValues['TB2'] ?? tieValues['TB1'] ?? tieValues['TB3'] ?? null;
    const sbVal = tieValues['SB'] ?? tieValues['Sonneborn-Berger'] ?? tieValues['Sonneborn'] ?? tieValues['SB.'] ?? tieValues['TB3'] ?? tieValues['TB5'] ?? null;
    const rpVal = tieValues['Rp'] ?? tieValues['RP'] ?? tieValues['Performance'] ?? tieValues['Rp.'] ?? null;

    const parsedRank = ri >= 0 ? num(row[ri]?.text || '') : null;
    const finalRank = parsedRank ?? (players.length + 1);

    const rowSex = sexCol >= 0 ? row[sexCol]?.text : '';
    const gender = /f|w|nữ|nu|female/i.test(rowSex) || /nữ/i.test(group) ? 'Nữ' : 'Nam';

    const rowTyp = typCol >= 0 ? row[typCol]?.text : '';
    const ageGroupMatch = group.match(/(?:U\d+|Trẻ|Nhi|Tiểu học|THCS|THPT)/i)?.[0] || rowTyp || 'Toàn giải';

    players.push({
      id: `${id}-${snr}`,
      snr,
      name: row[ni].text,
      fideId: fideIdCol >= 0 ? row[fideIdCol]?.text || null : null,
      club: club >= 0 ? row[club].text : '',
      rating: rating >= 0 ? num(row[rating].text) : null,
      rank: finalRank,
      points: pi >= 0 ? num(row[pi].text) : null,
      buchholz: bhVal,
      sonnebornBerger: sbVal,
      performance: rpVal,
      gender,
      ageGroup: ageGroupMatch,
      ties: tieValues,
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
    tieLabels: ties.map(t => t.label),
    rounds: total ? Number(total[1]) : null,
    published: false
  };
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

  return parseRanking(html, url.href, group);
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

      // Extract group name
      let groupName = tStr;
      if (tStr.includes(' - ')) {
        const parts = tStr.split(' - ');
        if (/(?:bảng|u\d+|nam|nữ|trẻ|nhi|open|girls|boys)/i.test(parts[0])) {
          groupName = parts[0].trim();
        } else {
          groupName = parts[parts.length - 1].trim();
        }
      }

      // Count players
      let pCount = 0;
      if (hi >= 0) {
        const h = pageRows[hi];
        const ni = findCol(h, ['name']);
        const si = findCol(h, ['sno', 'no']);
        const playerSeen = new Set<string>();
        for (const row of pageRows.slice(hi + 1)) {
          if (findCol(row, ['name']) >= 0) continue;
          if (row.length < h.length || !row[ni]?.text) continue;
          const link = row[ni].raw.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
          const snr = link ? new URL(textOf(link), u.href).searchParams.get('snr') : row[si]?.text;
          if (snr && /^\d+$/.test(snr) && !playerSeen.has(snr)) {
            playerSeen.add(snr);
            pCount++;
          }
        }
      }

      seenIds.add(catIdStr);
      return {
        id: catIdStr,
        group: groupName,
        name: tStr,
        source: `https://chess-results.com/tnr${catId}.aspx?lan=1`,
        playerCount: pCount,
        status: 'Chưa nhập'
      };
    } catch {
      return null;
    }
  }

  // Scan range surrounding targetId
  const range = 35;
  const scanIds: number[] = [];
  for (let offset = -range; offset <= range; offset++) {
    scanIds.push(targetId + offset);
  }

  const CONCURRENCY = 8;
  for (let i = 0; i < scanIds.length; i += CONCURRENCY) {
    const chunk = scanIds.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(chunk.map(id => checkTnrId(id)));
    for (const res of chunkResults) {
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
  const hi = rows.findIndex(r => findCol(r, ['rd', 'round']) >= 0 && findCol(r, ['name']) >= 0 && findCol(r, ['res', 'result']) >= 0);
  if (hi < 0) throw Error('Chưa đọc được chi tiết từng vòng từ nguồn. Điểm và thứ hạng vẫn được giữ theo bảng đã đồng bộ.');

  const h = rows[hi];
  const ni = findCol(h, ['name']);
  const ri = findCol(h, ['rd', 'round']);
  const boCol = findCol(h, ['bo', 'board', 'ban']);
  const rating = findCol(h, ['rtg', 'rating']);
  const res = findCol(h, ['res', 'result']);

  const rounds: Round[] = [];
  for (const r of rows.slice(hi + 1)) {
    const rd = num(r[ri]?.text || '');
    if (rd === null || rd < 1 || rd > 100 || !r[ni]) continue;
    const bo = boCol >= 0 ? num(r[boCol]?.text || '') : null;

    let raw = r.slice(res).map(c => c.text).join(' ').trim();
    const colorCell = r.find(c => /^[wb]$/i.test(c.text));
    const color = colorCell?.text.toLowerCase() === 'w' ? 'white' : colorCell?.text.toLowerCase() === 'b' ? 'black' : null;
    raw = raw.replace(/\b[wb]\b/ig, '').trim();

    const opponent = r[ni].text;
    const snr = r[ni].raw.match(/[?&](?:amp;)?snr=(\d+)/i)?.[1];
    let status: Round['status'] = 'unknown', score: number | null = null;

    if (/bye|not paired|unpaired|spielfrei/i.test(opponent)) {
      status = 'bye'; score = num(raw);
    } else if (/^[+−-]$|[kK]$|forfeit/i.test(raw)) {
      status = 'forfeit'; score = raw === '+' ? 1 : /^[−-]$/.test(raw) ? 0 : num(raw.replace(/[kK]/g, ''));
    } else if (raw === '' || raw === '*') {
      status = 'pending';
    } else {
      score = num(raw);
      if (score !== null && [0, .5, 1].includes(score)) status = 'played';
      else score = null;
    }

    if (rounds.some(x => x.round === rd)) continue;

    const resFmt = score === 1 ? '1 - 0' : score === 0.5 ? '½ - ½' : score === 0 ? '0 - 1' : raw || '—';
    const playerWhite = color === 'white' ? p.name : opponent;
    const playerBlack = color === 'black' ? p.name : opponent;

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

  return { ...p, rounds, detailsLoaded: true };
}

export async function importPlayer(t: Tournament, p: Player) {
  const { url } = validateSource(t.source);
  url.searchParams.set('lan', '1');
  url.searchParams.set('art', '9');
  url.searchParams.set('snr', p.snr);
  url.searchParams.delete('rd');
  return parsePlayer(await fetchSource(url), p, t);
}
