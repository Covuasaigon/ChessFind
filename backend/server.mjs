// server.ts
import { createServer } from "node:http";
import { fileURLToPath as fileURLToPath2 } from "node:url";
import { resolve as resolve4, dirname as dirname3, extname, sep } from "node:path";
import { readFile, stat } from "node:fs/promises";

// lib/chess.ts
var normalize = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
var num = (s) => {
  const v = s.trim().replace(/½/g, ".5").replace(",", ".");
  return v !== "" && /^\d+(?:\.\d+)?$|^\.5$/.test(v) ? Number(v) : null;
};
var CLUB_MAP = {
  "HDC": "CLB C\u1EDD Vua HDC",
  "TPC": "CLB C\u1EDD Vua TPC (T\xE2n B\xECnh)",
  "TBC": "CLB C\u1EDD Vua TBC",
  "RTC": "CLB C\u1EDD Vua R\u1ED3ng Tr\u1EBB (RTC)",
  "BTC": "CLB C\u1EDD Vua B\u1EBFn Th\xE0nh (BTC)",
  "ONL": "CLB C\u1EDD Vua Online (ONL)",
  "DHC": "CLB C\u1EDD Vua DHC",
  "KDC": "CLB C\u1EDD Vua KDC",
  "Q1": "Qu\u1EADn 1 - TP.HCM",
  "Q2": "Qu\u1EADn 2 - TP.HCM",
  "Q3": "Qu\u1EADn 3 - TP.HCM",
  "Q4": "Qu\u1EADn 4 - TP.HCM",
  "Q5": "Qu\u1EADn 5 - TP.HCM",
  "Q6": "Qu\u1EADn 6 - TP.HCM",
  "Q7": "Qu\u1EADn 7 - TP.HCM",
  "Q8": "Qu\u1EADn 8 - TP.HCM",
  "Q9": "Qu\u1EADn 9 - TP.HCM",
  "Q10": "Qu\u1EADn 10 - TP.HCM",
  "Q11": "Qu\u1EADn 11 - TP.HCM",
  "Q12": "Qu\u1EADn 12 - TP.HCM",
  "TD": "TP. Th\u1EE7 \u0110\u1EE9c",
  "GV": "Qu\u1EADn G\xF2 V\u1EA5p",
  "TB": "Qu\u1EADn T\xE2n B\xECnh",
  "BT": "Qu\u1EADn B\xECnh Th\u1EA1nh",
  "PN": "Qu\u1EADn Ph\xFA Nhu\u1EADn",
  "TP": "Th\xE0nh ph\u1ED1 H\u1ED3 Ch\xED Minh"
};
function formatClubName(club) {
  if (!club || !club.trim()) return "T\u1EF1 do / Ch\u01B0a r\xF5";
  const trimmed = club.trim();
  const upper = trimmed.toUpperCase();
  if (CLUB_MAP[upper]) return CLUB_MAP[upper];
  if (CLUB_MAP[trimmed]) return CLUB_MAP[trimmed];
  return trimmed;
}
function stats(p) {
  const rounds = p.rounds || [];
  const uniqueRoundsMap = /* @__PURE__ */ new Map();
  for (const r of rounds) {
    if (r.round != null && !uniqueRoundsMap.has(r.round)) {
      uniqueRoundsMap.set(r.round, r);
    }
  }
  const uniqueRounds = Array.from(uniqueRoundsMap.values());
  const playedRounds = uniqueRounds.filter((r) => r.status === "played");
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
    if (rd.status === "played" || rd.status === "bye" || rd.status === "forfeit") {
      let score = rd.score;
      if (score === null || score === void 0 || isNaN(score)) {
        if (rd.status === "bye") {
          const rawStr = String(rd.raw || rd.result || "");
          if (rawStr.includes("0.5") || rawStr.includes("\xBD") || rawStr.includes("1/2") || /u0\.5/i.test(rawStr)) {
            score = 0.5;
          } else if (rawStr.includes("0-1") || rawStr.includes("0.0") || /u0\.0/i.test(rawStr)) {
            score = 0;
          } else {
            score = 1;
          }
        } else if (rd.result) {
          if (rd.result.includes("1 - 0") || rd.result.includes("1-0")) score = rd.color?.toLowerCase() === "black" ? 0 : 1;
          else if (rd.result.includes("0 - 1") || rd.result.includes("0-1")) score = rd.color?.toLowerCase() === "black" ? 1 : 0;
          else if (rd.result.includes("\xBD") || rd.result.includes("1/2")) score = 0.5;
        }
      }
      if (score != null && !isNaN(score)) {
        points += score;
      }
    }
  }
  for (const rd of playedRounds) {
    let score = rd.score;
    if (score === null || score === void 0) {
      if (rd.result) {
        if (rd.result.includes("1 - 0") || rd.result.includes("1-0")) score = rd.color?.toLowerCase() === "black" ? 0 : 1;
        else if (rd.result.includes("0 - 1") || rd.result.includes("0-1")) score = rd.color?.toLowerCase() === "black" ? 1 : 0;
        else if (rd.result.includes("\xBD") || rd.result.includes("1/2")) score = 0.5;
      }
    }
    if (score === 1) wins++;
    else if (score === 0.5) draws++;
    else if (score === 0) losses++;
    const c = rd.color?.toLowerCase();
    let isWhite = c === "white" || rd.playerWhite && rd.playerWhite.trim().toLowerCase() === p.name.trim().toLowerCase();
    let isBlack = c === "black" || rd.playerBlack && rd.playerBlack.trim().toLowerCase() === p.name.trim().toLowerCase();
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
    unknown: uniqueRounds.filter((x) => x.color === null && x.status === "played").length,
    special: uniqueRounds.filter((x) => ["bye", "forfeit"].includes(x.status)).length,
    winRate: totalPlayed > 0 ? Math.round(wins / totalPlayed * 100) : null
  };
}
function normalizeCategoryGroup(s) {
  if (!s) return "";
  return normalize(s).replace(/\bbang\b/g, "").replace(/\bnhom\b/g, "").replace(/\bu0*(\d+)\b/g, "u$1").replace(/\bu\s+0*(\d+)\b/g, "u$1").replace(/\bu-0*(\d+)\b/g, "u$1").replace(/\s+/g, " ").trim();
}
function matchCategoryGroup(ruleGrp, userGrp) {
  if (!userGrp || !ruleGrp) return true;
  const rNorm = normalizeCategoryGroup(ruleGrp);
  const uNorm = normalizeCategoryGroup(userGrp);
  if (rNorm === "tat ca" || rNorm.includes("tat ca") || rNorm === "toan gia" || rNorm.includes("toan gia") || rNorm === "toan bang" || rNorm.includes("toan bang") || rNorm === "all" || rNorm === "") {
    return true;
  }
  if (rNorm === uNorm || uNorm.includes(rNorm) || rNorm.includes(uNorm)) return true;
  const isRuleMale = rNorm.includes("nam");
  const isRuleFemale = rNorm.includes("nu") && !rNorm.includes("nam");
  const isUserMale = uNorm.includes("nam");
  const isUserFemale = uNorm.includes("nu") && !uNorm.includes("nam");
  if (isRuleMale && isUserFemale || isRuleFemale && isUserMale) {
    return false;
  }
  const rAgeMatch = rNorm.match(/\b(u\d+|open|baby|trung|nhi|truong thanh|tre)\b/g);
  const uAgeMatch = uNorm.match(/\b(u\d+|open|baby|trung|nhi|truong thanh|tre)\b/g);
  if (rAgeMatch && uAgeMatch) {
    const hasCommonAge = rAgeMatch.some((tag) => uAgeMatch.includes(tag));
    if (!hasCommonAge) return false;
  }
  const stopWords = /* @__PURE__ */ new Set(["bang", "nhom", "giai", "co", "vua", "cau", "thu", "hang"]);
  const rTokens = rNorm.split(/\s+/).filter((t) => t.length >= 2 && !stopWords.has(t));
  const uTokens = uNorm.split(/\s+/).filter((t) => t.length >= 2 && !stopWords.has(t));
  if (rTokens.length > 0 && uTokens.length > 0) {
    return rTokens.some((t) => uTokens.includes(t));
  }
  return false;
}
function getMedal(rank, group, prizes, options) {
  if (options?.loadError) {
    return {
      medal: "\u26A0\uFE0F",
      label: "Ch\u01B0a t\u1EA3i \u0111\u01B0\u1EE3c th\xF4ng tin gi\u1EA3i th\u01B0\u1EDFng",
      status: "error"
    };
  }
  if (rank == null || rank <= 0 || isNaN(rank)) {
    return {
      medal: "\u265F",
      label: "Ch\u01B0a \u0111\u1EE7 d\u1EEF li\u1EC7u x\xE9t gi\u1EA3i",
      status: "no_rank"
    };
  }
  if (!prizes || prizes.length === 0) {
    return {
      medal: "\u2139\uFE0F",
      label: "Ch\u01B0a c\u1EA5u h\xECnh gi\u1EA3i th\u01B0\u1EDFng",
      status: "no_rules"
    };
  }
  const matching = prizes.filter((p) => {
    const rf = p.rank_from ?? p.rankFrom ?? p.fromRank ?? p.from_rank ?? p.startRank ?? p.start_rank ?? p.rank;
    const rt = p.rank_to ?? p.rankTo ?? p.toRank ?? p.to_rank ?? p.endRank ?? p.end_rank ?? p.rank ?? rf;
    const rNum = p.rank != null && !isNaN(Number(p.rank)) ? Number(p.rank) : null;
    const rfNum = rf != null && !isNaN(Number(rf)) ? Number(rf) : null;
    const rtNum = rt != null && !isNaN(Number(rt)) ? Number(rt) : null;
    const fromVal = rfNum !== null ? rfNum : rNum;
    const toVal = rtNum !== null ? rtNum : rNum !== null ? rNum : fromVal;
    if (fromVal === null || toVal === null) return false;
    const rankMatches = rank >= fromVal && rank <= toVal;
    if (!rankMatches) return false;
    const ruleGrp = p.group_name || p.group || p.groupName || p.category;
    return matchCategoryGroup(ruleGrp, group);
  });
  if (matching.length > 0) {
    const specificMatch = group ? matching.find((p) => {
      const ruleGrp = p.group_name || p.group || p.groupName || p.category;
      if (!ruleGrp) return false;
      const norm = normalizeCategoryGroup(ruleGrp);
      return !norm.includes("tat ca") && norm !== "all" && !norm.includes("toan gia") && !norm.includes("toan bang");
    }) : null;
    const match = specificMatch || matching[0];
    const label = match.prize_name || match.prizeName || match.name || match.title || (match.gift ? `${match.gift}` : `H\u1EA1ng ${rank}`);
    let medalIcon = "\u{1F3C6}";
    const medalRaw = match.medal || match.medalType || match.medal_type || match.type || "";
    const mStr = String(medalRaw).toLowerCase();
    const pNameLower = label.toLowerCase();
    const pNameNorm = normalize(label);
    const isKK = pNameNorm.includes("khuyen khich") || pNameLower.includes("khuy\u1EBFn kh\xEDch") || pNameNorm.includes("bang khen") || pNameLower.includes("b\u1EB1ng khen") || /\bkk\b/i.test(label) || mStr.includes("consolation") || mStr.includes("khuyen khich");
    if (isKK) {
      medalIcon = "\u{1F396}";
    } else if (mStr.includes("gold") || mStr.includes("vang") || pNameLower.includes("gold") || pNameLower.includes("v\xE0ng") || pNameLower.includes("vang")) {
      medalIcon = "\u{1F947}";
    } else if (mStr.includes("silver") || mStr.includes("bac") || pNameLower.includes("silver") || pNameLower.includes("b\u1EA1c") || pNameLower.includes("bac")) {
      medalIcon = "\u{1F948}";
    } else if (mStr.includes("bronze") || mStr.includes("dong") || pNameLower.includes("bronze") || pNameLower.includes("\u0111\u1ED3ng") || pNameLower.includes("dong")) {
      medalIcon = "\u{1F949}";
    } else if (mStr.includes("certificate") || mStr.includes("consolation") || mStr.includes("khuyen khich") || mStr.includes("top") || mStr.includes("khen") || mStr.includes("bang") || rank >= 4) {
      medalIcon = "\u{1F396}";
    }
    return { medal: medalIcon, label, status: "matched", matchedRule: match };
  }
  return {
    medal: "\u{1F396}",
    label: "Ngo\xE0i ph\u1EA1m vi gi\u1EA3i th\u01B0\u1EDFng",
    status: "outside_range"
  };
}
function getNextMatch(p) {
  if (!p.rounds || !p.rounds.length) return null;
  const match = p.rounds.find((r) => r.status === "scheduled" || r.status === "pending");
  if (!match) return null;
  let colorClean = "white";
  const cLower = match.color ? match.color.toLowerCase() : "";
  if (cLower === "white" || cLower === "black") {
    colorClean = cLower;
  } else if (match.playerBlack && match.playerBlack.trim().toLowerCase() === p.name.trim().toLowerCase()) {
    colorClean = "black";
  } else if (match.playerWhite && match.playerWhite.trim().toLowerCase() === p.name.trim().toLowerCase()) {
    colorClean = "white";
  } else {
    colorClean = match.round % 2 === 1 ? "white" : "black";
  }
  const isWhite = colorClean === "white" || match.playerWhite && match.playerWhite.trim().toLowerCase() === p.name.trim().toLowerCase();
  const playerWhite = match.playerWhite || (isWhite ? p.name : match.opponent);
  const playerBlack = match.playerBlack || (!isWhite ? p.name : match.opponent);
  return {
    round: match.round,
    board: match.board ?? null,
    playerWhite,
    playerBlack,
    opponent: match.opponent,
    color: colorClean,
    status: "scheduled",
    opponentId: match.opponentId,
    rating: match.rating ?? null,
    score: null
  };
}

// lib/chess-source.ts
var HOSTS = /* @__PURE__ */ new Set(["chess-results.com", "www.chess-results.com", "s1.chess-results.com", "s2.chess-results.com", "s3.chess-results.com"]);
function validateSource(input) {
  let u;
  try {
    u = new URL(input);
  } catch {
    throw Error("\u0110\u01B0\u1EDDng d\u1EABn kh\xF4ng h\u1EE3p l\u1EC7. H\xE3y d\xE1n link m\u1ED9t gi\u1EA3i \u0111\u1EA5u/b\u1EA3ng \u0111\u1EA5u Chess-Results.");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:" || !HOSTS.has(u.hostname.toLowerCase()) || u.username || u.password || u.port)
    throw Error("Ch\u1EC9 ch\u1EA5p nh\u1EADn \u0111\u01B0\u1EDDng d\u1EABn Chess-Results ch\xEDnh th\u1EE9c.");
  const m = u.pathname.match(/^\/tnr(\d+)\.aspx$/i);
  if (!m) throw Error("C\u1EA7n link b\u1EA3ng \u0111\u1EA5u c\xF3 d\u1EA1ng tnr123456.aspx.");
  u.protocol = "https:";
  u.hash = "";
  return { url: u, id: m[1] };
}
async function fetchSource(url) {
  let u = url;
  const hostsToTry = [u.hostname, "chess-results.com", "s2.chess-results.com", "s1.chess-results.com"];
  const uniqueHosts = Array.from(new Set(hostsToTry));
  let lastErr = null;
  for (const host2 of uniqueHosts) {
    const currentUrl = new URL(u.href);
    currentUrl.hostname = host2;
    for (let hop = 0; hop < 4; hop++) {
      validateSource(currentUrl.href);
      let r;
      try {
        r = await fetch(currentUrl.href, { redirect: "manual", signal: AbortSignal.timeout(1e4), headers: { "Accept": "text/html", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } });
      } catch (err) {
        lastErr = err;
        break;
      }
      if (r.status >= 300 && r.status < 400) {
        const target = r.headers.get("location");
        if (!target) break;
        currentUrl.href = new URL(target, currentUrl).href;
        continue;
      }
      if (!r.ok) {
        if (r.status === 429) throw Error("Chess-Results \u0111ang gi\u1EDBi h\u1EA1n truy c\u1EADp. Vui l\xF2ng ch\u1EDD r\u1ED3i th\u1EED l\u1EA1i.");
        break;
      }
      if (Number(r.headers.get("content-length") || 0) > 5e6) throw Error("Trang ngu\u1ED3n qu\xE1 l\u1EDBn. H\xE3y ch\u1ECDn link t\u1EEBng b\u1EA3ng \u0111\u1EA5u.");
      const reader = r.body?.getReader();
      if (!reader) break;
      const chunks = [];
      let n = 0;
      while (true) {
        const x = await reader.read();
        if (x.done) break;
        n += x.value.byteLength;
        if (n > 5e6) {
          await reader.cancel();
          throw Error("Trang ngu\u1ED3n v\u01B0\u1EE3t gi\u1EDBi h\u1EA1n k\xEDch th\u01B0\u1EDBc.");
        }
        chunks.push(x.value);
      }
      const buffer = new Uint8Array(n);
      let pos = 0;
      for (const c of chunks) {
        buffer.set(c, pos);
        pos += c.length;
      }
      const s = new TextDecoder("utf-8").decode(buffer);
      if (/captcha|verify you are human|access denied|just a moment/i.test(s.slice(0, 1e4)))
        throw Error("Chess-Results \u0111ang y\xEAu c\u1EA7u ki\u1EC3m tra truy c\u1EADp. \u1EE8ng d\u1EE5ng kh\xF4ng th\u1EC3 \u0111\u1ECDc ngu\u1ED3n l\xFAc n\xE0y.");
      return s;
    }
  }
  throw Error("Kh\xF4ng k\u1EBFt n\u1ED1i \u0111\u01B0\u1EE3c Chess-Results. H\xE3y th\u1EED l\u1EA1i sau; d\u1EEF li\u1EC7u c\u0169 kh\xF4ng b\u1ECB thay \u0111\u1ED5i.");
}
var entities = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", frac12: "\xBD" };
function textOf(s) {
  return s.replace(/<[^>]*>/g, " ").replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (_, x) => {
    if (x[0] === "#") {
      const n = x[1].toLowerCase() === "x" ? parseInt(x.slice(2), 16) : parseInt(x.slice(1), 10);
      return n >= 0 && n <= 1114111 ? String.fromCodePoint(n) : "";
    }
    return entities[x] ?? " ";
  }).replace(/\s+/g, " ").trim();
}
function cleanCellText(text) {
  if (!text) return text;
  if (/Note:\s*To reduce/i.test(text) || /Search for player/i.test(text) || /Final Ranking/i.test(text)) {
    const match = text.match(/\b(Rk|Rank|St\.?Nr|SNo|No|Name|Tên|Pts|Points|Điểm|BH|SB|Rp|TB\d+)\b\.?$/i) || text.match(/\b(Rk|Rank|St\.?Nr|SNo|No)\b\.?/i);
    if (match) return match[0];
  }
  return text;
}
function rowsOf(html) {
  return [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => [...m[1].matchAll(/<t[dh]\b([^>]*)>([\s\S]*?)<\/t[dh]>/gi)].flatMap((c) => {
    const col = { text: cleanCellText(textOf(c[2])), raw: c[2] };
    const span = Math.min(10, Number(c[1].match(/colspan\s*=\s*["']?(\d+)/i)?.[1] || 1));
    return [col, ...Array.from({ length: span - 1 }, () => ({ text: "", raw: "" }))];
  })).filter((x) => x.length);
}
var key = (s) => normalize(s).replace(/[^a-z0-9]/g, "");
function findCol(headers, names) {
  return headers.findIndex((h) => names.includes(key(h.text)));
}
function parseTieBreakDescriptions(html) {
  const result = [];
  const map = /* @__PURE__ */ new Map();
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
      result.push(map.get(i));
    }
  }
  return result;
}
function parseRanking(html, source, group) {
  const { id } = validateSource(source);
  let rows = rowsOf(html);
  let hi = rows.findIndex((r) => findCol(r, ["name"]) >= 0 && (findCol(r, ["rk", "rank"]) >= 0 || findCol(r, ["sno", "no"]) >= 0));
  if (hi < 0) {
    throw Error("Ch\u01B0a nh\u1EADn di\u1EC7n \u0111\u01B0\u1EE3c b\u1EA3ng k\u1EF3 th\u1EE7. Ngu\u1ED3n c\xF3 th\u1EC3 \u0111\u1ED5i c\u1EA5u tr\xFAc ho\u1EB7c ch\u01B0a c\xF4ng b\u1ED1 k\u1EBFt qu\u1EA3.");
  }
  const h = rows[hi];
  const ni = findCol(h, ["name", "ten", "namekytthu", "hoten"]);
  const ri = findCol(h, ["rk", "rank", "pos", "hang", "thuhang"]);
  const si = findCol(h, ["sno", "stnr", "stno", "sbd", "no"]);
  const pi = findCol(h, ["pts", "points", "diem"]);
  const rating = findCol(h, ["rtg", "rating", "rtgi", "elo"]);
  const fedCol = findCol(h, ["fed", "federation", "ld", "ldo", "land"]);
  const clubCol = findCol(h, ["clubcity", "clbtinh", "clb/tinh", "club/city", "club/country", "team/city", "club", "clb", "team", "city"]);
  const fideIdCol = findCol(h, ["fideid", "fide", "id", "identnumber", "ident"]);
  const sexCol = findCol(h, ["sex", "gender", "gioitinh"]);
  const typCol = findCol(h, ["typ", "gr", "group", "typgr", "kat", "cat", "category"]);
  const knownStandardCols = new Set([ri, si, ni, pi, rating, fedCol, clubCol, fideIdCol, sexCol, typCol].filter((i) => i >= 0));
  const tieBreakCols = [];
  h.forEach((cell, index) => {
    if (knownStandardCols.has(index)) return;
    const textClean = cell.text.trim();
    if (!textClean) return;
    const k = key(textClean);
    if (/^tb\d+$/i.test(k) || !knownStandardCols.has(index) && pi >= 0 && index > pi) {
      tieBreakCols.push({ label: cell.text || `TB${tieBreakCols.length + 1}`, index });
    }
  });
  const tieBreakDescriptions = parseTieBreakDescriptions(html);
  const players = [];
  const seen = /* @__PURE__ */ new Set();
  for (const row of rows.slice(hi + 1)) {
    if (findCol(row, ["name"]) >= 0) continue;
    if (row.length < h.length || !row[ni]?.text) continue;
    const link = row[ni].raw.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    const snr = link ? new URL(textOf(link), source).searchParams.get("snr") : si >= 0 ? row[si]?.text : null;
    if (!snr || !/^\d+$/.test(snr)) continue;
    if (seen.has(snr)) continue;
    seen.add(snr);
    const tieValues = {};
    const tieBreakArray = [];
    tieBreakCols.forEach((col, idx) => {
      const rawCellVal = row[col.index]?.text || "";
      const numVal = num(rawCellVal);
      tieValues[col.label] = numVal;
      tieValues[`TB${idx + 1}`] = numVal;
      tieValues[`HS${idx + 1}`] = numVal;
      tieValues[`H\u1EC7 s\u1ED1 ${idx + 1}`] = numVal;
      tieBreakArray.push(numVal);
    });
    const hs1 = tieBreakArray[0] ?? null;
    const hs2 = tieBreakArray[1] ?? null;
    const hs3 = tieBreakArray[2] ?? null;
    const hs4 = tieBreakArray[3] ?? null;
    const hs5 = tieBreakArray[4] ?? null;
    const parsedRank = ri >= 0 ? num(row[ri]?.text || "") : null;
    const finalRank = parsedRank ?? players.length + 1;
    const rowSex = sexCol >= 0 ? row[sexCol]?.text : "";
    const gender = /f|w|nữ|nu|female/i.test(rowSex) || /nữ/i.test(group) ? "N\u1EEF" : "Nam";
    const rowTyp = typCol >= 0 ? row[typCol]?.text : "";
    const ageGroupMatch = group.match(/(?:U\d+|Trẻ|Nhi|Tiểu học|THCS|THPT)/i)?.[0] || rowTyp || "To\xE0n gi\u1EA3i";
    const rawFed = fedCol >= 0 ? row[fedCol]?.text || null : null;
    const rawClub = clubCol >= 0 ? row[clubCol]?.text || "" : "";
    const finalClub = rawClub ? formatClubName(rawClub) : rawFed ? formatClubName(rawFed) : "";
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
  if (!players.length) throw Error("Ch\u01B0a c\xF3 danh s\xE1ch k\u1EF3 th\u1EE7 \u0111\u1ECDc \u0111\u01B0\u1EE3c t\u1EEB ngu\u1ED3n.");
  const rawName = textOf(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || html.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1] || html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || `Gi\u1EA3i \u0111\u1EA5u ${id}`);
  const name = rawName.replace(/^Chess-Results Server Chess-results\.com\s*-\s*/i, "").trim();
  const total = textOf(html).match(/(?:Number of rounds|Rounds|Số vòng)\s*[:：]?\s*(\d+)/i);
  return {
    id,
    name: name.slice(0, 240),
    group: group.slice(0, 100),
    source,
    updated: (/* @__PURE__ */ new Date()).toISOString(),
    players,
    tieLabels: tieBreakCols.map((t, idx) => `H\u1EC7 s\u1ED1 ${idx + 1}`),
    tieBreakDescriptions,
    rounds: total ? Number(total[1]) : null,
    published: false
  };
}
async function populateRoundsForTournament(tour) {
  try {
    const { url } = validateSource(tour.source);
    const playerMap = /* @__PURE__ */ new Map();
    const snrToPlayerMap = /* @__PURE__ */ new Map();
    for (const p of tour.players) {
      playerMap.set(p.id, { ...p, rounds: p.rounds ? [...p.rounds] : [] });
      snrToPlayerMap.set(p.snr, playerMap.get(p.id));
    }
    let maxRound = tour.rounds || 0;
    const maxRdsToFetch = tour.rounds && tour.rounds > 0 ? tour.rounds : 11;
    const roundFetchPromises = [];
    for (let rd = 1; rd <= maxRdsToFetch; rd++) {
      const rdUrl = new URL(url.href);
      rdUrl.searchParams.set("lan", "1");
      rdUrl.searchParams.set("art", "2");
      rdUrl.searchParams.set("rd", String(rd));
      roundFetchPromises.push(
        fetchSource(rdUrl).then((html) => ({ rd, html })).catch(() => ({ rd, html: null }))
      );
    }
    const roundResults = await Promise.all(roundFetchPromises);
    for (const { rd, html } of roundResults) {
      if (!html) continue;
      const rows = rowsOf(html);
      const hi = rows.findIndex((r) => findCol(r, ["white", "trang", "weiss", "blancs"]) >= 0 && findCol(r, ["black", "den", "schwarz", "noirs"]) >= 0);
      if (hi < 0) continue;
      const h = rows[hi];
      let boCol = findCol(h, ["bo", "board", "ban", "banso", "br", "tbl", "tisch", "b"]);
      const wCol = findCol(h, ["white", "trang", "weiss", "blancs"]);
      const bCol = findCol(h, ["black", "den", "schwarz", "noirs"]);
      const resCol = findCol(h, ["result", "res", "ketqua", "kq", "ergebnis"]);
      if (boCol < 0 && h.length > 0) {
        const col0Key = key(h[0].text || "");
        if ((/^bo|^br|^tbl|^tisch|^ban|^#|^no/i.test(col0Key) || col0Key === "") && 0 !== wCol && 0 !== bCol) {
          boCol = 0;
        }
      }
      const noCols = h.map((c, i) => ({ i, text: key(c.text) })).filter((c) => c.text === "no" || c.text === "stnr" || c.text === "sno" || c.text === "stno" || c.text === "sbd");
      const wNoCol = noCols[0]?.i ?? wCol - 1;
      const bNoCol = noCols[1]?.i ?? bCol + 1;
      let foundPairs = false;
      for (const r of rows.slice(hi + 1)) {
        if (!r[wCol] || !r[bCol]) continue;
        const nameW = r[wCol]?.text;
        const nameB = r[bCol]?.text;
        const snrW = r[wNoCol]?.text || r[wCol]?.raw.match(/snr=(\d+)/i)?.[1];
        const snrB = r[bNoCol]?.text || r[bCol]?.raw.match(/snr=(\d+)/i)?.[1];
        if (!nameW || !nameB || !snrW || !snrB) continue;
        const bo = boCol >= 0 ? num(r[boCol]?.text || "") : null;
        const rawRes = resCol >= 0 ? r[resCol]?.text.trim() : "";
        let scoreW = null;
        let scoreB = null;
        let resFmt = rawRes;
        let roundStatus = "scheduled";
        if (/1\s*[-:]\s*0/i.test(rawRes)) {
          scoreW = 1;
          scoreB = 0;
          resFmt = "1 - 0";
          roundStatus = "played";
        } else if (/0\s*[-:]\s*1/i.test(rawRes)) {
          scoreW = 0;
          scoreB = 1;
          resFmt = "0 - 1";
          roundStatus = "played";
        } else if (/½|0\.5|1\/2/i.test(rawRes)) {
          scoreW = 0.5;
          scoreB = 0.5;
          resFmt = "\xBD - \xBD";
          roundStatus = "played";
        } else {
          scoreW = null;
          scoreB = null;
          resFmt = rawRes || "\u2014";
          roundStatus = "scheduled";
        }
        const pW = snrToPlayerMap.get(snrW);
        const pB = snrToPlayerMap.get(snrB);
        if (pW) {
          const existingR = pW.rounds.find((x) => x.round === rd);
          if (existingR) {
            if (bo != null) existingR.board = bo;
            if (roundStatus === "played") existingR.status = "played";
            if (scoreW != null) existingR.score = scoreW;
            if (resFmt && resFmt !== "\u2014") existingR.result = resFmt;
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
              color: "white",
              status: roundStatus,
              score: scoreW,
              playerWhite: nameW,
              playerBlack: nameB,
              result: resFmt
            });
          }
        }
        if (pB) {
          const existingR = pB.rounds.find((x) => x.round === rd);
          if (existingR) {
            if (bo != null) existingR.board = bo;
            if (roundStatus === "played") existingR.status = "played";
            if (scoreB != null) existingR.score = scoreB;
            if (resFmt && resFmt !== "\u2014") existingR.result = resFmt;
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
              color: "black",
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
    if (maxRound === 0) {
      try {
        const url79 = new URL(url.href);
        url79.searchParams.set("lan", "1");
        url79.searchParams.set("art", "79");
        url79.searchParams.set("zeilen", "99999");
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
          } catch {
          }
        }
      } catch {
      }
    }
    const allPlayedRounds = /* @__PURE__ */ new Set();
    const allKnownRounds = /* @__PURE__ */ new Set();
    for (const p of snrToPlayerMap.values()) {
      if (p.rounds) {
        for (const r of p.rounds) {
          allKnownRounds.add(r.round);
          if (r.status === "played") {
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
    tour.players = tour.players.map((p) => {
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
    console.warn("Auto-populating rounds notice:", err);
  }
  return tour;
}
async function importTournament(source, group) {
  const { url } = validateSource(source);
  url.searchParams.set("lan", "1");
  url.searchParams.set("art", "1");
  url.searchParams.set("zeilen", "99999");
  url.searchParams.delete("snr");
  url.searchParams.delete("rd");
  let html = await fetchSource(url);
  const tempRows = rowsOf(html);
  const hi = tempRows.findIndex((r) => findCol(r, ["name"]) >= 0 && (findCol(r, ["rk", "rank"]) >= 0 || findCol(r, ["sno", "no"]) >= 0));
  if (hi < 0) {
    url.searchParams.set("art", "0");
    html = await fetchSource(url);
  }
  const tour = parseRanking(html, url.href, group);
  return await populateRoundsForTournament(tour);
}
async function fetchSourceWithRetry(url, maxRetries = 3, delayMs = 800) {
  let lastErr;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchSource(url);
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, delayMs * attempt));
      }
    }
  }
  throw lastErr;
}
async function detectCategories(source) {
  const { url, id } = validateSource(source);
  const targetId = parseInt(id, 10);
  url.searchParams.set("lan", "1");
  const html = await fetchSourceWithRetry(url, 3);
  const rawTitle = textOf(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || html.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1] || `Gi\u1EA3i \u0111\u1EA5u ${id}`).replace(/^Chess-Results Server Chess-results\.com\s*-\s*/i, "").trim();
  let baseName = rawTitle;
  if (rawTitle.includes(" - ")) {
    const parts = rawTitle.split(/\s+[-–]\s+|\s*-\s*/);
    const mainPart = parts.find((p) => !/^(?:bảng|u\d+|nam|nữ|trẻ|nhi|baby|open|girls|boys|group|cat|category|junior|senior)/i.test(p.trim()));
    if (mainPart) {
      baseName = mainPart.trim();
    } else {
      baseName = parts[parts.length - 1].trim();
    }
  }
  const categories = [];
  const seenIds = /* @__PURE__ */ new Set();
  const targetHost = url.hostname;
  const targetLan = url.searchParams.get("lan") || "1";
  async function checkTnrId(catId) {
    const catIdStr = String(catId);
    if (seenIds.has(catIdStr)) return { result: null, extraLinks: [] };
    const u = new URL(`https://${targetHost}/tnr${catId}.aspx?lan=${targetLan}&art=1&zeilen=99999`);
    let pageHtml;
    try {
      pageHtml = await fetchSourceWithRetry(u, 2, 600);
    } catch (fetchErr) {
      seenIds.add(catIdStr);
      return {
        result: {
          id: catIdStr,
          group: `B\u1EA3ng ${catIdStr}`,
          name: `Gi\u1EA3i \u0111\u1EA5u ${catIdStr}`,
          source: u.href,
          playerCount: null,
          status: "L\u1ED7i t\u1EA3i",
          error: fetchErr?.message || "Kh\xF4ng th\u1EC3 k\u1EBFt n\u1ED1i ngu\u1ED3n"
        },
        extraLinks: []
      };
    }
    try {
      let pageRows = rowsOf(pageHtml);
      let hi = pageRows.findIndex((r) => findCol(r, ["name"]) >= 0 && (findCol(r, ["rk", "rank"]) >= 0 || findCol(r, ["sno", "no"]) >= 0));
      if (hi < 0) {
        u.searchParams.set("art", "0");
        pageHtml = await fetchSourceWithRetry(u, 2, 600);
        pageRows = rowsOf(pageHtml);
        hi = pageRows.findIndex((r) => findCol(r, ["name"]) >= 0 && (findCol(r, ["rk", "rank"]) >= 0 || findCol(r, ["sno", "no"]) >= 0));
      }
      const tStr = textOf(pageHtml.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/^Chess-Results Server Chess-results\.com\s*-\s*/i, "").trim();
      if (!tStr || tStr.includes("Tournament-Database") || tStr.includes("Error")) {
        return { result: null, extraLinks: [] };
      }
      const foundLinks = [...pageHtml.matchAll(/(?:href=["']|tnr)(\d+)\.aspx/gi)].map((m) => parseInt(m[1], 10)).filter((n) => !isNaN(n));
      const normTitle = normalize(tStr).replace(/\s+/g, " ");
      const normBase = normalize(baseName).replace(/\s+/g, " ");
      const isMatch = normTitle.includes(normBase) || normBase.length > 6 && normTitle.includes(normBase.slice(0, 15)) || catId === targetId;
      if (!isMatch) {
        return { result: null, extraLinks: [] };
      }
      seenIds.add(catIdStr);
      let catGroup = "To\xE0n gi\u1EA3i";
      if (tStr.includes(" - ")) {
        const parts = tStr.split(/\s+[-–]\s+|\s*-\s*/);
        for (const p of parts) {
          const cleanP = p.trim();
          if (cleanP && !normalize(cleanP).includes(normBase) && /(?:bảng|u\d+|nam|nữ|trẻ|nhi|baby|open|girls|boys|junior|senior)/i.test(cleanP)) {
            catGroup = cleanP;
            break;
          }
        }
        if (catGroup === "To\xE0n gi\u1EA3i" && parts.length > 1) {
          const nonBase = parts.find((p) => !normalize(p.trim()).includes(normBase));
          if (nonBase) catGroup = nonBase.trim();
        }
      }
      const pCount = pageRows.slice(hi + 1).filter((r) => r.length >= 3 && /^\d+$/.test(r[0]?.text || r[1]?.text || "")).length;
      return {
        result: {
          id: catIdStr,
          group: catGroup,
          name: tStr,
          source: u.href,
          playerCount: pCount,
          status: "Ch\u01B0a nh\u1EADp"
        },
        extraLinks: foundLinks
      };
    } catch (parseErr) {
      seenIds.add(catIdStr);
      return {
        result: {
          id: catIdStr,
          group: `B\u1EA3ng ${catIdStr}`,
          name: `Gi\u1EA3i \u0111\u1EA5u ${catIdStr}`,
          source: u.href,
          playerCount: null,
          status: "L\u1ED7i t\u1EA3i",
          error: parseErr?.message || "L\u1ED7i ph\xE2n t\xEDch d\u1EEF li\u1EC7u"
        },
        extraLinks: []
      };
    }
  }
  const candidateIds = /* @__PURE__ */ new Set();
  candidateIds.add(targetId);
  const links = html.matchAll(/(?:href=["']|tnr)(\d+)\.aspx/gi);
  for (const m of links) {
    const cId = parseInt(m[1], 10);
    if (!isNaN(cId)) candidateIds.add(cId);
  }
  for (let offset = -60; offset <= 60; offset++) {
    candidateIds.add(targetId + offset);
  }
  const processedCandidates = /* @__PURE__ */ new Set();
  let queue = Array.from(candidateIds);
  const CHUNK_SIZE = 5;
  while (queue.length > 0) {
    const currentChunk = queue.slice(0, CHUNK_SIZE);
    queue = queue.slice(CHUNK_SIZE);
    currentChunk.forEach((idNum) => processedCandidates.add(idNum));
    const chunkResults = await Promise.all(currentChunk.map((cId) => checkTnrId(cId)));
    for (const { result, extraLinks } of chunkResults) {
      if (result && !categories.some((c) => c.id === result.id)) {
        categories.push(result);
      }
      for (const extraId of extraLinks) {
        if (!processedCandidates.has(extraId) && !queue.includes(extraId)) {
          queue.push(extraId);
        }
      }
    }
    if (queue.length > 0) {
      await new Promise((r) => setTimeout(r, 40));
    }
  }
  categories.sort((a, b) => Number(a.id) - Number(b.id));
  return { mainName: baseName, categories };
}
function parsePlayer(html, p, t) {
  const rows = rowsOf(html);
  const hi = rows.findIndex(
    (r) => findCol(r, ["rd", "round", "vong", "v", "r"]) >= 0 && findCol(r, ["name", "ten", "doithu", "doi", "opp", "opponent", "kytthu", "hoten", "spieler"]) >= 0 && findCol(r, ["res", "result", "ketqua", "kq", "ergebnis"]) >= 0
  );
  if (hi < 0) throw Error("Ch\u01B0a \u0111\u1ECDc \u0111\u01B0\u1EE3c chi ti\u1EBFt t\u1EEBng v\xF2ng t\u1EEB ngu\u1ED3n. \u0110i\u1EC3m v\xE0 th\u1EE9 h\u1EA1ng v\u1EABn \u0111\u01B0\u1EE3c gi\u1EEF theo b\u1EA3ng \u0111\xE3 \u0111\u1ED3ng b\u1ED9.");
  const h = rows[hi];
  const ni = findCol(h, ["name", "ten", "doithu", "doi", "opp", "opponent", "kytthu", "hoten", "spieler"]);
  const ri = findCol(h, ["rd", "round", "vong", "v", "r"]);
  const boCol = findCol(h, ["bo", "board", "ban", "banso", "br", "tbl", "tisch", "b"]);
  const rating = findCol(h, ["rtg", "rating", "elo"]);
  const res = findCol(h, ["res", "result", "ketqua", "kq", "ergebnis"]);
  const colorCol = findCol(h, ["wb", "w/b", "color", "mau", "mauquan", "ks", "k/s", "farbe"]);
  const rounds = [];
  const seenRounds = /* @__PURE__ */ new Set();
  for (const r of rows.slice(hi + 1)) {
    const rd = num(r[ri]?.text || "");
    if (rd === null || rd < 1 || rd > 100 || !r[ni]) continue;
    if (seenRounds.has(rd)) continue;
    let bo = boCol >= 0 ? num(r[boCol]?.text || "") : null;
    const existingP = p.rounds?.find((x) => x.round === rd);
    if (bo === null && existingP && existingP.board != null) {
      bo = existingP.board;
    }
    let rawCellText = res >= 0 ? (r[res]?.text || "").trim() : "";
    if (!rawCellText || /^(?:w|b|trắng|đen|\(w\)|\(b\))$/i.test(rawCellText)) {
      if (res >= 0 && r[res + 1] && /^[01½\.]+$|^[+−-]$|^[01][kK]$/i.test(r[res + 1].text.trim())) {
        rawCellText = r[res + 1].text.trim();
      } else {
        const scoreCell = r.find((c) => /^[01½\.]+$|^[+−-]$|^[01][kK]$/i.test(c.text.trim()));
        rawCellText = scoreCell?.text.trim() || rawCellText;
      }
    }
    let colorStr = colorCol >= 0 ? (r[colorCol]?.text || "").trim() : "";
    if (!colorStr) {
      const colorCell = r.find((c) => /^\(?[wb]\.?\)?$/i.test(c.text.trim()));
      colorStr = colorCell?.text || "";
    }
    const colorClean = colorStr.trim().toLowerCase();
    const isWhite = /^w|\(w\)/i.test(colorClean) || colorClean === "white" || colorClean === "tr\u1EAFng";
    const isBlack = /^b|\(b\)/i.test(colorClean) || colorClean === "black" || colorClean === "\u0111en";
    const color = isWhite ? "white" : isBlack ? "black" : null;
    let raw = rawCellText.replace(/\b[wb]\b/ig, "").trim();
    const opponent = r[ni].text;
    const snr = r[ni].raw.match(/[?&](?:amp;)?snr=(\d+)/i)?.[1];
    let status = "unknown", score = null;
    if (/bye|not paired|unpaired|spielfrei/i.test(opponent)) {
      status = "bye";
      score = num(raw);
      if (score === null || isNaN(score)) {
        if (/0\.5|½|1\/2|u0\.5/i.test(raw)) {
          score = 0.5;
        } else if (/0\s*[-:]\s*1|0-1|0\.0|u0\.0/i.test(raw)) {
          score = 0;
        } else {
          score = 1;
        }
      }
    } else if (/^[+−-]$|[kK]$|forfeit/i.test(raw)) {
      status = "forfeit";
      score = raw === "+" ? 1 : /^[−-]$/.test(raw) ? 0 : num(raw.replace(/[kK]/g, ""));
    } else if (raw === "" || raw === "*" || raw === "\u2014") {
      status = "scheduled";
      score = null;
    } else if (/1\s*[-:]\s*0/i.test(raw)) {
      status = "played";
      score = 1;
    } else if (/0\s*[-:]\s*1/i.test(raw)) {
      status = "played";
      score = 0;
    } else if (/½|0\.5|1\/2/i.test(raw)) {
      status = "played";
      score = 0.5;
    } else {
      score = num(raw);
      if (score !== null && [0, 0.5, 1].includes(score)) status = "played";
      else {
        score = null;
        status = "scheduled";
      }
    }
    seenRounds.add(rd);
    if (rounds.some((x) => x.round === rd)) continue;
    const resFmt = score === 1 ? "1 - 0" : score === 0.5 ? "\xBD - \xBD" : score === 0 ? "0 - 1" : raw || "\u2014";
    let playerWhite;
    let playerBlack;
    if (status === "bye" || /bye|not paired|unpaired|spielfrei/i.test(opponent)) {
      playerWhite = p.name;
      playerBlack = "Mi\u1EC5n \u0111\u1EA5u (Bye)";
    } else if (color === "black") {
      playerWhite = opponent;
      playerBlack = p.name;
    } else {
      playerWhite = p.name;
      playerBlack = opponent;
    }
    rounds.push({
      round: rd,
      board: bo,
      opponentId: snr ? `${t.id}-${snr}` : void 0,
      opponent,
      rating: rating >= 0 ? num(r[rating]?.text || "") : null,
      color,
      status,
      score,
      raw,
      playerWhite,
      playerBlack,
      result: resFmt
    });
  }
  if (!rounds.length) throw Error("Ngu\u1ED3n ch\u01B0a c\xF3 chi ti\u1EBFt c\xE1c v\xE1n \u0111\u1EA5u.");
  rounds.sort((a, b) => a.round - b.round);
  let warning = void 0;
  if (p.points !== null && p.points !== void 0) {
    const sumPlayed = rounds.reduce((acc, r) => acc + (r.score ?? 0), 0);
    if (Math.abs(sumPlayed - p.points) > 0.01) {
      warning = `[SYNC WARNING] Player "${p.name}" (SNR ${p.snr}) official ranking score (${p.points}) differs from calculated match score (${sumPlayed})`;
      console.warn(warning);
    }
  }
  return { ...p, rounds, warning, detailsLoaded: true };
}
async function importPlayer(t, p) {
  const existingPlayer = t.players?.find((x) => x.id === p.id || x.snr === p.snr);
  if (existingPlayer && existingPlayer.rounds && existingPlayer.rounds.length > 0 && existingPlayer.rounds.some((r) => r.color === "white" || r.color === "black")) {
    const s2 = stats(existingPlayer);
    return {
      ...existingPlayer,
      detailsLoaded: true,
      games: s2.played,
      totalGames: s2.played,
      whiteGames: s2.whiteGames,
      blackGames: s2.blackGames,
      wins: s2.wins,
      draws: s2.draws,
      losses: s2.losses,
      whiteWins: s2.whiteWins,
      whiteDraws: s2.whiteDraws,
      whiteLosses: s2.whiteLosses,
      blackWins: s2.blackWins,
      blackDraws: s2.blackDraws,
      blackLosses: s2.blackLosses
    };
  }
  const updatedTour = await populateRoundsForTournament({ ...t, players: t.players || [p] });
  let fetchedP = updatedTour.players?.find((x) => x.id === p.id || x.snr === p.snr) || p;
  if (!fetchedP.rounds || fetchedP.rounds.length === 0) {
    try {
      const url9 = new URL(t.source);
      url9.searchParams.set("lan", "1");
      url9.searchParams.set("art", "9");
      url9.searchParams.set("snr", p.snr);
      url9.searchParams.delete("rd");
      fetchedP = parsePlayer(await fetchSource(url9), p, t);
    } catch {
    }
  }
  if (fetchedP.rounds) {
    fetchedP.rounds = fetchedP.rounds.map((r) => {
      let color = r.color;
      if (!color) {
        if (r.playerWhite && r.playerWhite.trim().toLowerCase() === fetchedP.name.trim().toLowerCase()) color = "white";
        else if (r.playerBlack && r.playerBlack.trim().toLowerCase() === fetchedP.name.trim().toLowerCase()) color = "black";
        else color = r.round % 2 === 1 ? "white" : "black";
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

// lib/default-admin.ts
var DEFAULT_ADMIN = { "username": "admin", "salt": "edd812c082e94ee178697eb85216b90335f20eb48a823d55", "hash": "bbdb86f851c40bbe3a9cf297d250250bc1f944083de61f1f405517261e81982b", "iterations": 1e5 };

// lib/api.ts
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
var enc = new TextEncoder();
var hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
var unhex = (s) => Uint8Array.from(s.match(/.{2}/g).map((x) => parseInt(x, 16)));
var random = () => hex(crypto.getRandomValues(new Uint8Array(32)));
var digest = async (s) => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
function getCorsHeaders(req) {
  let reqOrigin = req?.headers.get("origin");
  if (!reqOrigin && req?.headers.get("referer")) {
    try {
      reqOrigin = new URL(req.headers.get("referer")).origin;
    } catch {
    }
  }
  const allowOrigin = reqOrigin || "*";
  const headers = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-CSRF-Token, X-Admin-Token, X-Requested-With",
    "Access-Control-Max-Age": "86400"
  };
  if (allowOrigin !== "*") {
    headers["Access-Control-Allow-Credentials"] = "true";
  }
  return headers;
}
function json(data, status = 200, headers = {}, req) {
  const cors = getCorsHeaders(req);
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...cors,
      ...headers
    }
  });
}
function message(e) {
  const m = e instanceof Error ? e.message : "";
  return /SQL|D1|binding|syntax|database|fetch failed/i.test(m) ? "Kho d\u1EEF li\u1EC7u t\u1EA1m th\u1EDDi kh\xF4ng s\u1EB5n s\xE0ng. Vui l\xF2ng th\u1EED l\u1EA1i." : m || "C\xF3 l\u1ED7i x\u1EA3y ra. Vui l\xF2ng th\u1EED l\u1EA1i.";
}
async function ensureSlidesTableSchema(db2) {
  if (db2.source === "postgresql") return;
  try {
    const row = await db2.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='tournament_slides'").first();
    if (row?.sql && (row.sql.includes("FOREIGN KEY") || row.sql.includes("`tournament_id` text NOT NULL") || row.sql.includes("tournament_id TEXT NOT NULL"))) {
      await db2.prepare("PRAGMA foreign_keys=OFF;").run();
      await db2.prepare(`
        CREATE TABLE IF NOT EXISTS tournament_slides_fix (
          id TEXT PRIMARY KEY NOT NULL,
          tournament_id TEXT,
          title TEXT NOT NULL,
          slide_type TEXT NOT NULL,
          image_url TEXT NOT NULL,
          display_order INTEGER DEFAULT 0 NOT NULL,
          status TEXT DEFAULT 'active' NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `).run();
      await db2.prepare("INSERT OR IGNORE INTO tournament_slides_fix SELECT id, tournament_id, title, slide_type, image_url, display_order, status, created_at, updated_at FROM tournament_slides;").run();
      await db2.prepare("DROP TABLE tournament_slides;").run();
      await db2.prepare("ALTER TABLE tournament_slides_fix RENAME TO tournament_slides;").run();
      await db2.prepare("CREATE INDEX IF NOT EXISTS idx_tournament_slides_tournament ON tournament_slides (tournament_id);").run();
      await db2.prepare("PRAGMA foreign_keys=ON;").run();
    }
    await migrateLocalImagesToPermanent(db2);
  } catch (e) {
    console.error("Error healing tournament_slides schema:", e);
  }
}
async function passwordOK(password, c) {
  const key2 = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const actual = hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: unhex(c.salt), iterations: c.iterations }, key2, 256));
  let diff = actual.length ^ c.hash.length;
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ (c.hash.charCodeAt(i) || 0);
  return diff === 0;
}
async function uploadToSupabaseStorage(fileBuffer, filename, mimeType) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const bucket = process.env.SUPABASE_BUCKET || "banners";
    if (!supabaseUrl || !supabaseKey) {
      return null;
    }
    const baseUrl = supabaseUrl.replace(/\/+$/, "");
    const uploadUrl = `${baseUrl}/storage/v1/object/${bucket}/${filename}`;
    let res = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${supabaseKey}`,
        "apikey": supabaseKey,
        "Content-Type": mimeType,
        "x-upsert": "true"
      },
      body: fileBuffer
    });
    if (!res.ok) {
      const bucketUrl = `${baseUrl}/storage/v1/bucket`;
      await fetch(bucketUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseKey}`,
          "apikey": supabaseKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ id: bucket, name: bucket, public: true })
      }).catch(() => {
      });
      res = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseKey}`,
          "apikey": supabaseKey,
          "Content-Type": mimeType,
          "x-upsert": "true"
        },
        body: fileBuffer
      });
    }
    if (res.ok) {
      return `${baseUrl}/storage/v1/object/public/${bucket}/${filename}`;
    }
  } catch (err) {
    console.error("Supabase upload error:", err);
  }
  return null;
}
async function uploadToCloudinary(fileBuffer, filename, mimeType) {
  try {
    let cloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
    let apiKey = process.env.CLOUDINARY_API_KEY || "";
    let apiSecret = process.env.CLOUDINARY_API_SECRET || "";
    let uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || "";
    const cloudinaryUrl = process.env.CLOUDINARY_URL;
    if (cloudinaryUrl) {
      try {
        const u = new URL(cloudinaryUrl);
        if (u.protocol === "cloudinary:") {
          apiKey = decodeURIComponent(u.username);
          apiSecret = decodeURIComponent(u.password);
          cloudName = u.hostname;
        }
      } catch {
      }
    }
    if (!cloudName) {
      return null;
    }
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const formData = new FormData();
    const blob = new Blob([Buffer.from(fileBuffer)], { type: mimeType });
    formData.append("file", blob, filename);
    formData.append("folder", "covuasaigon");
    if (apiKey && apiSecret) {
      const timestamp = Math.floor(Date.now() / 1e3).toString();
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp);
      const toSign = `folder=covuasaigon&timestamp=${timestamp}${apiSecret}`;
      const signature = createHash("sha1").update(toSign).digest("hex");
      formData.append("signature", signature);
    } else if (uploadPreset) {
      formData.append("upload_preset", uploadPreset);
    } else {
      return null;
    }
    const res = await fetch(uploadUrl, {
      method: "POST",
      body: formData
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("Cloudinary upload error:", res.status, errText);
      return null;
    }
    const data = await res.json();
    if (data && data.secure_url) {
      return data.secure_url;
    }
  } catch (err) {
    console.error("Cloudinary upload exception:", err);
  }
  return null;
}
async function migrateLocalImagesToPermanent(db2) {
  try {
    const slides = await db2.prepare("SELECT id, image_url FROM tournament_slides WHERE image_url LIKE '/uploads/%' OR image_url LIKE 'http%://%/uploads/%'").all();
    if (slides && slides.results && slides.results.length > 0) {
      for (const row of slides.results) {
        const localPath = row.image_url.replace(/^https?:\/\/[^\/]+/, "");
        const relPath = localPath.replace(/^\//, "");
        const possibleFiles = [
          resolve(process.cwd(), relPath),
          resolve(process.cwd(), "public", relPath),
          resolve(process.cwd(), "web", relPath),
          resolve(process.cwd(), "../public", relPath),
          resolve(process.cwd(), "../web", relPath)
        ];
        let fileBuffer = null;
        for (const f of possibleFiles) {
          try {
            if (existsSync(f)) {
              fileBuffer = readFileSync(f);
              break;
            }
          } catch {
          }
        }
        if (fileBuffer && fileBuffer.length > 0) {
          const mimeType = relPath.endsWith(".png") ? "image/png" : relPath.endsWith(".webp") ? "image/webp" : "image/jpeg";
          const filename = `migrated_${row.id}.${relPath.split(".").pop() || "png"}`;
          let newUrl = await uploadToCloudinary(fileBuffer, filename, mimeType);
          if (!newUrl) newUrl = await uploadToSupabaseStorage(fileBuffer, filename, mimeType);
          if (!newUrl) newUrl = `data:${mimeType};base64,${Buffer.from(fileBuffer).toString("base64")}`;
          if (newUrl) {
            await db2.prepare("UPDATE tournament_slides SET image_url = ? WHERE id = ?").bind(newUrl, row.id).run();
          }
        }
      }
    }
    const banners = await db2.prepare("SELECT id, image_url FROM home_banners WHERE image_url LIKE '/uploads/%' OR image_url LIKE 'http%://%/uploads/%'").all();
    if (banners && banners.results && banners.results.length > 0) {
      for (const row of banners.results) {
        const localPath = row.image_url.replace(/^https?:\/\/[^\/]+/, "");
        const relPath = localPath.replace(/^\//, "");
        const possibleFiles = [
          resolve(process.cwd(), relPath),
          resolve(process.cwd(), "public", relPath),
          resolve(process.cwd(), "web", relPath),
          resolve(process.cwd(), "../public", relPath),
          resolve(process.cwd(), "../web", relPath)
        ];
        let fileBuffer = null;
        for (const f of possibleFiles) {
          try {
            if (existsSync(f)) {
              fileBuffer = readFileSync(f);
              break;
            }
          } catch {
          }
        }
        if (fileBuffer && fileBuffer.length > 0) {
          const mimeType = relPath.endsWith(".png") ? "image/png" : relPath.endsWith(".webp") ? "image/webp" : "image/jpeg";
          const filename = `migrated_banner_${row.id}.${relPath.split(".").pop() || "png"}`;
          let newUrl = await uploadToCloudinary(fileBuffer, filename, mimeType);
          if (!newUrl) newUrl = await uploadToSupabaseStorage(fileBuffer, filename, mimeType);
          if (!newUrl) newUrl = `data:${mimeType};base64,${Buffer.from(fileBuffer).toString("base64")}`;
          if (newUrl) {
            await db2.prepare("UPDATE home_banners SET image_url = ? WHERE id = ?").bind(newUrl, row.id).run();
          }
        }
      }
    }
  } catch (e) {
    console.error("Error migrating local images:", e);
  }
}
async function ensureSyncLogsTableSchema(db2) {
  if (db2.source === "postgresql") return;
  try {
    await db2.prepare(`
      CREATE TABLE IF NOT EXISTS sync_logs (
        id TEXT PRIMARY KEY NOT NULL,
        tournament_id TEXT,
        tournament_name TEXT,
        url TEXT NOT NULL,
        created_at TEXT NOT NULL,
        status TEXT NOT NULL,
        players_updated INTEGER DEFAULT 0 NOT NULL,
        message TEXT NOT NULL
      )
    `).run();
    await db2.prepare("CREATE INDEX IF NOT EXISTS idx_sync_logs_created ON sync_logs (created_at);").run();
  } catch (e) {
    console.error("Error ensuring sync_logs table schema:", e);
  }
}
function createApi(db2, sourceParam = {}) {
  const source = {
    tournament: sourceParam.tournament ?? importTournament,
    player: sourceParam.player ?? importPlayer,
    detect: sourceParam.detect ?? detectCategories
  };
  const logSync = async (item) => {
    try {
      await ensureSyncLogsTableSchema(db2);
      const id = crypto.randomUUID();
      const now = (/* @__PURE__ */ new Date()).toISOString();
      await db2.prepare(`
        INSERT INTO sync_logs (id, tournament_id, tournament_name, url, created_at, status, players_updated, message)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(id, item.tournament_id || null, item.tournament_name || null, item.url, now, item.status, item.players_updated, item.message.slice(0, 1e3)).run();
      await db2.prepare(`
        DELETE FROM sync_logs WHERE id NOT IN (
          SELECT id FROM sync_logs ORDER BY created_at DESC LIMIT 200
        )
      `).run();
    } catch (e) {
      console.error("logSync error:", e);
    }
  };
  const log2 = async (ok, m) => {
    await db2.batch([db2.prepare("INSERT INTO logs (id, created, ok, message) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), (/* @__PURE__ */ new Date()).toISOString(), ok ? 1 : 0, m.slice(0, 500)), db2.prepare("DELETE FROM logs WHERE id NOT IN (SELECT id FROM logs ORDER BY created DESC LIMIT 100)")]);
  };
  const lock = async (k, s) => {
    const now = Date.now();
    return (await db2.prepare("INSERT INTO locks (key, until) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET until = excluded.until WHERE locks.until < ?").bind(k, now + s * 1e3, now).run()).meta.changes > 0;
  };
  const formatTourObj = (r) => {
    if (!r) return null;
    let t;
    try {
      t = JSON.parse(r.payload);
    } catch {
      return null;
    }
    const autoSync = r.auto_sync !== void 0 && r.auto_sync !== null ? !!r.auto_sync : t.autoSync ?? t.auto_sync ?? true;
    const syncInterval = r.sync_interval ? Number(r.sync_interval) : t.syncInterval ?? t.sync_interval ?? 5;
    const lastSync = r.last_sync || t.lastSync || t.last_sync || null;
    const nextSync = r.next_sync || t.nextSync || t.next_sync || null;
    return {
      ...t,
      published: !!r.published,
      autoSync,
      auto_sync: autoSync,
      syncInterval,
      sync_interval: syncInterval,
      lastSync,
      last_sync: lastSync,
      nextSync,
      next_sync: nextSync
    };
  };
  const get = async (id, admin = false) => {
    let r = null;
    try {
      r = await db2.prepare(admin ? "SELECT payload,published,auto_sync,sync_interval,last_sync,next_sync FROM tournaments WHERE id = ?" : "SELECT payload,published,auto_sync,sync_interval,last_sync,next_sync FROM tournaments WHERE id = ? AND published = 1").bind(id).first();
    } catch {
      r = await db2.prepare(admin ? "SELECT payload,published FROM tournaments WHERE id = ?" : "SELECT payload,published FROM tournaments WHERE id = ? AND published = 1").bind(id).first();
    }
    const t = formatTourObj(r);
    if (!t) return null;
    try {
      const masterId = id.split("-")[0];
      const candidateIds = /* @__PURE__ */ new Set([id, masterId]);
      if (t.categories && Array.isArray(t.categories)) {
        for (const cat of t.categories) {
          if (cat.id) candidateIds.add(String(cat.id));
        }
      }
      try {
        const catRows = await db2.prepare(
          "SELECT tournament_id, id FROM categories WHERE id = ? OR tournament_id = ? OR id = ? OR tournament_id = ?"
        ).bind(id, id, masterId, masterId).all();
        if (catRows.results) {
          for (const row of catRows.results) {
            if (row.id) candidateIds.add(String(row.id));
            if (row.tournament_id) candidateIds.add(String(row.tournament_id));
          }
        }
      } catch (catErr) {
      }
      const idsArr = Array.from(candidateIds);
      const placeholders = idsArr.map(() => "?").join(",");
      let prizesRes = await db2.prepare(
        `SELECT * FROM prizes WHERE tournament_id IN (${placeholders}) OR tournament_id LIKE ? OR tournament_id LIKE ? ORDER BY rank_from ASC`
      ).bind(...idsArr, masterId + "-%", id + "-%").all();
      const dbPrizes = (prizesRes.results || []).map((row) => ({
        id: row.id,
        tournamentId: row.tournament_id,
        tournament_id: row.tournament_id,
        group: row.group_name,
        group_name: row.group_name,
        rankFrom: Number(row.rank_from),
        rank_from: Number(row.rank_from),
        rankTo: Number(row.rank_to),
        rank_to: Number(row.rank_to),
        medal: row.medal,
        prizeName: row.prize_name,
        prize_name: row.prize_name,
        description: row.description || ""
      }));
      if (dbPrizes.length > 0) {
        t.prizes = dbPrizes;
      }
    } catch (err) {
      console.error("[PRIZE LOAD DB ERROR]", err);
    }
    return t;
  };
  const list = async (admin = false) => {
    let res = { results: [] };
    try {
      res = await db2.prepare(admin ? "SELECT payload,published,auto_sync,sync_interval,last_sync,next_sync FROM tournaments ORDER BY updated DESC" : "SELECT payload,published,auto_sync,sync_interval,last_sync,next_sync FROM tournaments WHERE published = 1 ORDER BY updated DESC").all();
    } catch {
      res = await db2.prepare(admin ? "SELECT payload,published FROM tournaments ORDER BY updated DESC" : "SELECT payload,published FROM tournaments WHERE published = 1 ORDER BY updated DESC").all();
    }
    const tours = res.results.map(formatTourObj).filter((x) => x !== null);
    try {
      const prizesRes = await db2.prepare("SELECT * FROM prizes ORDER BY rank_from ASC").all();
      if (prizesRes && prizesRes.results && prizesRes.results.length > 0) {
        const prizesMap = /* @__PURE__ */ new Map();
        const globalPrizes = [];
        for (const row of prizesRes.results) {
          const tId = String(row.tournament_id || "").trim();
          const item = {
            id: row.id,
            tournamentId: row.tournament_id,
            tournament_id: row.tournament_id,
            group: row.group_name,
            group_name: row.group_name,
            rankFrom: Number(row.rank_from),
            rank_from: Number(row.rank_from),
            rankTo: Number(row.rank_to),
            rank_to: Number(row.rank_to),
            medal: row.medal,
            prizeName: row.prize_name,
            prize_name: row.prize_name,
            description: row.description || ""
          };
          if (tId === "all" || tId === "global" || tId === "") {
            globalPrizes.push(item);
          }
          if (tId) {
            if (!prizesMap.has(tId)) prizesMap.set(tId, []);
            prizesMap.get(tId).push(item);
            const cleanTId = tId.replace(/^tnr/i, "").split("-")[0];
            if (cleanTId && cleanTId !== tId) {
              if (!prizesMap.has(cleanTId)) prizesMap.set(cleanTId, []);
              prizesMap.get(cleanTId).push(item);
            }
          }
        }
        for (const tour of tours) {
          const masterId = tour.id.split("-")[0];
          const cleanTourId = tour.id.replace(/^tnr/i, "").split("-")[0];
          const directPrizes = prizesMap.get(tour.id) || prizesMap.get(masterId) || prizesMap.get(cleanTourId) || (tour.prizes && tour.prizes.length > 0 ? tour.prizes : null);
          const finalPrizes = directPrizes ? [...directPrizes] : [];
          if (globalPrizes.length > 0) {
            for (const gP of globalPrizes) {
              if (!finalPrizes.some((p) => p.id === gP.id)) {
                finalPrizes.push(gP);
              }
            }
          }
          tour.prizes = finalPrizes;
        }
      } else {
        for (const tour of tours) {
          tour.prizes = tour.prizes || [];
        }
      }
    } catch (err) {
      console.error("[API list prizes mapping error]", err);
    }
    return tours;
  };
  async function session(req) {
    const token = req.headers.get("cookie")?.match(/(?:^|;\s*)sgc_session=([a-f0-9]{64})(?:;|$)/)?.[1] || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || req.headers.get("x-admin-token")?.trim();
    if (!token) return null;
    const hash = await digest(token);
    const row = await db2.prepare("SELECT hash, csrf, expires FROM admin_sessions WHERE hash = ? AND expires > ?").bind(hash, Date.now()).first();
    return row;
  }
  const cookie = (req, value, max = 28800) => `sgc_session=${value}; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=${max}`;
  return async function handle(req, ip = "unknown") {
    let action = "";
    let authorized = false;
    let b = {};
    try {
      const u = new URL(req.url);
      const path2 = u.pathname.replace(/\/+$/, "") || "/";
      const dbSourceLog = db2.source || (process.env.DATABASE_URL ? "postgresql" : "sqlite");
      console.log(`[API REQUEST] ${req.method} ${path2} db_source=${dbSourceLog}`);
      if (req.method === "GET") {
        if (path2 === "/api/tournaments") return json({ tournaments: await list() }, 200, {}, req);
        if (path2 === "/api/banners") {
          try {
            const r = await db2.prepare("SELECT * FROM home_banners WHERE is_active = 1 ORDER BY sort_order ASC, created_at DESC").all();
            const banners = r.results || [];
            console.log(`[API /api/banners] db_source=${dbSourceLog} count=${banners.length}`);
            return json({ banners }, 200, {}, req);
          } catch (e) {
            console.error("[API /api/banners ERROR]", e);
            return json({ banners: [] }, 200, {}, req);
          }
        }
        if (path2 === "/api/admin") {
          const s2 = await session(req);
          if (!s2) return json({ admin: false }, 200, {}, req);
          let bannersList = [];
          let prizesList = [];
          let slidesList = [];
          let syncLogsList = [];
          try {
            bannersList = (await db2.prepare("SELECT * FROM home_banners ORDER BY sort_order ASC, created_at DESC").all()).results || [];
          } catch (e) {
            console.error("[API /api/admin ERROR fetching banners]", e);
          }
          try {
            const tList = await list(true);
            const tourMap = new Map(tList.map((t) => [t.id, t.name]));
            const r = await db2.prepare("SELECT * FROM prizes ORDER BY created_at DESC").all();
            prizesList = (r.results || []).map((p) => ({
              ...p,
              tournament_name: tourMap.get(p.tournament_id) || p.tournament_id
            }));
          } catch (e) {
            console.error("[API /api/admin ERROR fetching prizes]", e);
          }
          try {
            const tList = await list(true);
            const tourMap = new Map(tList.map((t) => [t.id, t.name]));
            const r = await db2.prepare("SELECT * FROM tournament_slides ORDER BY display_order ASC, created_at DESC").all();
            slidesList = (r.results || []).map((item) => ({
              ...item,
              tournament_name: tourMap.get(item.tournament_id) || item.tournament_id
            }));
          } catch (e) {
            console.error("[API /api/admin ERROR fetching slides]", e);
          }
          try {
            await ensureSyncLogsTableSchema(db2);
            const r = await db2.prepare("SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 50").all();
            syncLogsList = r.results || [];
          } catch (e) {
            console.error("[API /api/admin ERROR fetching sync_logs]", e);
          }
          const tourList = await list(true);
          console.log(`[ADMIN DATA INIT] db_source=${dbSourceLog} tournaments=${tourList.length} banners=${bannersList.length} prizes=${prizesList.length} slides=${slidesList.length} syncLogs=${syncLogsList.length}`);
          return json({ admin: true, username: "admin", csrf: s2.csrf, tournaments: tourList, banners: bannersList, prizes: prizesList, slides: slidesList, syncLogs: syncLogsList, logs: (await db2.prepare("SELECT * FROM logs ORDER BY created DESC LIMIT 30").all()).results || [] }, 200, {}, req);
        }
        if (path2 === "/api/slides" || path2 === "/api/slides/home" || path2 === "/api/home/slides") {
          await ensureSlidesTableSchema(db2);
          const tid = u.searchParams.get("tournament_id") || u.searchParams.get("t") || "";
          try {
            const tList = await list(true);
            const tourMap = new Map(tList.map((t) => [t.id, t.name]));
            let sqlStr = "SELECT * FROM tournament_slides WHERE status = 'active'";
            const params = [];
            if (tid) {
              sqlStr += " AND tournament_id = ?";
              params.push(tid);
            }
            sqlStr += " ORDER BY display_order ASC, created_at DESC";
            const r = params.length > 0 ? await db2.prepare(sqlStr).bind(...params).all() : await db2.prepare(sqlStr).all();
            const slidesList = (r.results || []).map((item) => ({
              ...item,
              tournament_name: tourMap.get(item.tournament_id) || item.tournament_id
            }));
            if (path2 === "/api/slides/home" || path2 === "/api/home/slides") {
              return json(slidesList, 200, {}, req);
            }
            return json({ slides: slidesList }, 200, {}, req);
          } catch (err) {
            console.error("Error fetching tournament_slides:", err);
            if (path2 === "/api/slides/home" || path2 === "/api/home/slides") {
              return json([], 200, {}, req);
            }
            return json({ slides: [] }, 200, {}, req);
          }
        }
        if (path2 === "/api/admin/slides") {
          await ensureSlidesTableSchema(db2);
          const s2 = await session(req);
          if (!s2) return json({ error: "Phi\xEAn \u0111\u0103ng nh\u1EADp \u0111\xE3 h\u1EBFt h\u1EA1n." }, 401, {}, req);
          try {
            const tList = await list(true);
            const tourMap = new Map(tList.map((t) => [t.id, t.name]));
            const tid = u.searchParams.get("tournament_id") || u.searchParams.get("t") || "";
            let sqlStr = "SELECT * FROM tournament_slides";
            const params = [];
            if (tid) {
              sqlStr += " WHERE tournament_id = ?";
              params.push(tid);
            }
            sqlStr += " ORDER BY display_order ASC, created_at DESC";
            const r = params.length > 0 ? await db2.prepare(sqlStr).bind(...params).all() : await db2.prepare(sqlStr).all();
            const slides = (r.results || []).map((item) => ({
              ...item,
              tournament_name: tourMap.get(item.tournament_id) || item.tournament_id
            }));
            return json({ slides }, 200, {}, req);
          } catch {
            return json({ slides: [] }, 200, {}, req);
          }
        }
        if (path2 === "/api/admin/prizes") {
          const s2 = await session(req);
          if (!s2) return json({ error: "Phi\xEAn \u0111\u0103ng nh\u1EADp \u0111\xE3 h\u1EBFt h\u1EA1n." }, 401, {}, req);
          try {
            const tList = await list(true);
            const tourMap = new Map(tList.map((t) => [t.id, t.name]));
            const r = await db2.prepare("SELECT * FROM prizes ORDER BY created_at DESC").all();
            const prizes = (r.results || []).map((p) => ({
              ...p,
              tournament_name: tourMap.get(p.tournament_id) || p.tournament_id
            }));
            return json({ prizes }, 200, {}, req);
          } catch {
            return json({ prizes: [] }, 200, {}, req);
          }
        }
        if (path2 === "/api/player") {
          const id = u.searchParams.get("t") || "", pid = u.searchParams.get("p") || "";
          if (!/^\d+$/.test(id) || !/^\d+-\d+$/.test(pid)) return json({ error: "M\xE3 h\u1ED3 s\u01A1 kh\xF4ng h\u1EE3p l\u1EC7." }, 400, {}, req);
          let t = await get(id);
          let p = t?.players.find((p2) => p2.id === pid);
          if (!p) {
            const catId = pid.split("-")[0];
            const catTour = await get(catId);
            if (catTour) {
              t = catTour;
              p = catTour.players.find((x) => x.id === pid);
            }
          }
          if (!t || !p) return json({ error: "H\u1ED3 s\u01A1 kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c gi\u1EA3i \u0111ang \u1EA9n." }, 404, {}, req);
          const rank = p.rank ?? t.players.findIndex((x) => x.id === pid) + 1;
          const totalPlayers = t.players ? t.players.length : 0;
          const club = p.club || formatClubName(p.federation || "");
          let playerObj;
          let detailsFound = false;
          let revisionSelected = null;
          const detailsRes = await db2.prepare("SELECT tid, revision, payload FROM details WHERE pid = ? ORDER BY revision DESC").bind(pid).all();
          let selectedDetail = null;
          if (detailsRes && detailsRes.results && detailsRes.results.length > 0) {
            const catId = p.categoryId || (t ? t.id : pid.split("-")[0]);
            selectedDetail = detailsRes.results.find((row) => row.tid === id || row.tid === catId || t && row.tid === t.id) || null;
            if (!selectedDetail) {
              selectedDetail = detailsRes.results.find((row) => row.tid.startsWith(id + "-") || row.tid.startsWith(pid.split("-")[0])) || detailsRes.results[0];
            }
          }
          if (selectedDetail) {
            try {
              playerObj = JSON.parse(selectedDetail.payload);
              detailsFound = true;
              revisionSelected = selectedDetail.revision;
            } catch {
              selectedDetail = null;
            }
          }
          if (selectedDetail && playerObj) {
            if (p.rounds && p.rounds.length > 0) {
              playerObj.rounds = playerObj.rounds || [];
              for (const sch of p.rounds) {
                const existingIdx = playerObj.rounds.findIndex((x) => x.round === sch.round);
                if (existingIdx >= 0) {
                  const existingRd = playerObj.rounds[existingIdx];
                  const isPlayed = existingRd.status === "played" || existingRd.result != null || existingRd.score != null || existingRd.opponent != null || existingRd.color != null;
                  if (sch.board != null && (existingRd.board == null || !isPlayed)) {
                    existingRd.board = sch.board;
                  }
                  if (!isPlayed) {
                    if (sch.playerWhite && !existingRd.playerWhite) existingRd.playerWhite = sch.playerWhite;
                    if (sch.playerBlack && !existingRd.playerBlack) existingRd.playerBlack = sch.playerBlack;
                  }
                } else {
                  playerObj.rounds.push(sch);
                }
              }
              playerObj.rounds.sort((a, b2) => a.round - b2.round);
            }
          } else {
            if (!await lock("detail:" + id, 3)) return json({ error: "Ngu\u1ED3n \u0111ang \u0111\u01B0\u1EE3c t\u1EA3i. H\xE3y th\u1EED l\u1EA1i sau v\xE0i gi\xE2y." }, 429, {}, req);
            playerObj = await source.player(t, p);
            detailsFound = false;
            revisionSelected = t.updated;
            try {
              for (const rd of playerObj.rounds) {
                const matchId = `${playerObj.id}-rd${rd.round}`;
                await db2.prepare(`
                  INSERT INTO matches (id, category_id, player_id, player_white, player_black, round, board, result, score, color, opponent_id, opponent_name)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  ON CONFLICT(id) DO UPDATE SET
                    player_white = excluded.player_white,
                    player_black = excluded.player_black,
                    board = excluded.board,
                    result = excluded.result,
                    score = excluded.score,
                    color = excluded.color
                `).bind(matchId, p.categoryId || t.id, playerObj.id, rd.playerWhite || null, rd.playerBlack || null, rd.round, rd.board || null, rd.result || null, rd.score, rd.color || null, rd.opponentId || null, rd.opponent || null).run();
              }
            } catch {
            }
            await db2.prepare("INSERT INTO details (tid,pid,revision,payload) VALUES (?,?,?,?) ON CONFLICT(tid,pid,revision) DO UPDATE SET payload=excluded.payload").bind(id, pid, t.updated, JSON.stringify(playerObj)).run();
          }
          if (playerObj.rounds) {
            playerObj.rounds = playerObj.rounds.map((r) => {
              let color = r.color;
              if (!color) {
                if (r.playerWhite && r.playerWhite.trim().toLowerCase() === playerObj.name.trim().toLowerCase()) color = "white";
                else if (r.playerBlack && r.playerBlack.trim().toLowerCase() === playerObj.name.trim().toLowerCase()) color = "black";
                else color = r.round % 2 === 1 ? "white" : "black";
              }
              return { ...r, color };
            });
          }
          const s2 = stats(playerObj);
          const dbSource = db2.source || (process.env.DATABASE_URL ? "postgresql" : "sqlite");
          const roundsCount = playerObj.rounds ? playerObj.rounds.length : 0;
          const playedRoundsCount = playerObj.rounds ? playerObj.rounds.filter((r) => r.status === "played" || r.result != null || r.score != null || r.opponent != null).length : 0;
          console.log(`[API /api/player] db_source=${dbSource} tid=${id} pid=${pid} details_found=${detailsFound} revision_selected=${revisionSelected || "none"} rounds_count=${roundsCount} played_rounds_count=${playedRoundsCount}`);
          const nextMatch = getNextMatch(playerObj);
          const userCategory = playerObj.categoryName || (t.categories && p.categoryId ? t.categories.find((c) => c.id === p.categoryId)?.name : null) || t.group || (p.ageGroup ? p.ageGroup.toLowerCase().includes("b\u1EA3ng") ? p.ageGroup : "B\u1EA3ng " + p.ageGroup : null) || (p.categoryId && p.categoryId !== id && !/^\d{4,}$/.test(p.categoryId) ? p.categoryId : null) || void 0;
          const medalPrediction = getMedal(rank, userCategory, t.prizes, { tournamentId: id });
          let matchedRuleRange = "none";
          if (medalPrediction && medalPrediction.matchedRule) {
            const mR = medalPrediction.matchedRule;
            const rF = mR.rank_from ?? mR.rankFrom ?? mR.rank ?? "?";
            const rT = mR.rank_to ?? mR.rankTo ?? mR.rank ?? rF;
            matchedRuleRange = `${rF}-${rT}`;
          }
          const tourIdsList = [...new Set((t.prizes || []).map((p2) => p2.tournament_id || p2.tournamentId || ""))].filter(Boolean);
          const masterId = id.split("-")[0];
          const filteredByTour = (t.prizes || []).filter((p2) => {
            const tId = String(p2.tournament_id || p2.tournamentId || "").trim();
            return tId === id || tId === masterId || tId.startsWith(masterId + "-");
          });
          console.log(`[PRIZE MATCH DEBUG]
Player tournament_id: ${id}
Player rank: ${rank}
Player category: ${userCategory || t.group || "None"}
ALL PRIZES BEFORE FILTER: ${t.prizes ? t.prizes.length : 0} rows
Danh s\xE1ch tournament_id \u0111ang l\u1EA5y: ${tourIdsList.join(", ")}
FILTER BY TOURNAMENT RESULT: ${filteredByTour.length} rows
Matched rule: ${medalPrediction && medalPrediction.matchedRule ? JSON.stringify(medalPrediction.matchedRule) : "None"}
Final result: ${JSON.stringify(medalPrediction)}`);
          const fullPlayer = {
            ...playerObj,
            medalPrediction,
            categoryName: userCategory || t.group || playerObj.categoryName || null,
            hs1: p.hs1 ?? playerObj.hs1 ?? null,
            hs2: p.hs2 ?? playerObj.hs2 ?? null,
            hs3: p.hs3 ?? playerObj.hs3 ?? null,
            hs4: p.hs4 ?? playerObj.hs4 ?? null,
            hs5: p.hs5 ?? playerObj.hs5 ?? null,
            tieBreakArray: p.tieBreakArray || playerObj.tieBreakArray || [],
            ties: p.ties || playerObj.ties || {},
            rank,
            totalPlayers,
            club,
            games: s2.played,
            whiteGames: s2.whiteGames,
            blackGames: s2.blackGames,
            whiteWins: s2.whiteWins,
            whiteDraws: s2.whiteDraws,
            whiteLosses: s2.whiteLosses,
            blackWins: s2.blackWins,
            blackDraws: s2.blackDraws,
            blackLosses: s2.blackLosses,
            wins: s2.wins,
            draws: s2.draws,
            losses: s2.losses,
            nextMatch
          };
          return json({
            player: fullPlayer,
            rank,
            totalPlayers,
            club,
            games: s2.played,
            whiteGames: s2.whiteGames,
            blackGames: s2.blackGames,
            whiteWins: s2.whiteWins,
            whiteDraws: s2.whiteDraws,
            whiteLosses: s2.whiteLosses,
            blackWins: s2.blackWins,
            blackDraws: s2.blackDraws,
            blackLosses: s2.blackLosses,
            wins: s2.wins,
            draws: s2.draws,
            losses: s2.losses,
            nextMatch,
            medalPrediction
          }, 200, {}, req);
        }
        return json({ error: "Kh\xF4ng t\xECm th\u1EA5y ch\u1EE9c n\u0103ng." }, 404, {}, req);
      }
      if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: getCorsHeaders(req) });
      }
      if (!["POST", "PUT", "DELETE"].includes(req.method)) return json({ error: "Ph\u01B0\u01A1ng th\u1EE9c kh\xF4ng h\u1EE3p l\u1EC7." }, 405, {}, req);
      const reqOrigin = req.headers.get("origin");
      if (reqOrigin && process.env.NODE_ENV === "production" && path2 !== "/api/auth/login") {
        const allowedSet = /* @__PURE__ */ new Set([
          u.origin,
          ...[
            process.env.FRONTEND_URL,
            process.env.PUBLIC_ORIGIN,
            process.env.API_URL,
            process.env.ALLOWED_ORIGINS
          ].filter(Boolean).flatMap((x) => x.split(",").map((s2) => s2.trim()))
        ]);
        const isVercelApp = reqOrigin.endsWith(".vercel.app");
        const isValidWebOrigin = reqOrigin.startsWith("https://") || reqOrigin.startsWith("http://");
        const isAllowed = allowedSet.has("*") || allowedSet.has(reqOrigin) || isVercelApp || reqOrigin === u.origin || isValidWebOrigin;
        if (!isAllowed) {
          return json({ error: "Y\xEAu c\u1EA7u kh\xF4ng h\u1EE3p l\u1EC7. H\xE3y thao t\xE1c trong \u1EE9ng d\u1EE5ng." }, 403, {}, req);
        }
      }
      if (path2 === "/api/admin/upload-image" || path2 === "/api/admin/slides/upload") {
        const s2 = await session(req);
        if (!s2) return json({ error: "Phi\xEAn \u0111\u0103ng nh\u1EADp \u0111\xE3 h\u1EBFt h\u1EA1n. Vui l\xF2ng \u0111\u0103ng nh\u1EADp l\u1EA1i." }, 401, {}, req);
        if (req.headers.get("x-csrf-token") !== s2.csrf) return json({ error: "Phi\xEAn x\xE1c th\u1EF1c kh\xF4ng h\u1EE3p l\u1EC7. H\xE3y t\u1EA3i l\u1EA1i trang." }, 403, {}, req);
        let fileBuffer = null;
        let fileExt = "";
        let originalName = "";
        const contentType = req.headers.get("content-type") || "";
        if (contentType.includes("multipart/form-data")) {
          try {
            const formData = await req.formData();
            const file = formData.get("image") || formData.get("file");
            if (!file) return json({ error: "Kh\xF4ng t\xECm th\u1EA5y file \u1EA3nh trong y\xEAu c\u1EA7u." }, 400, {}, req);
            originalName = file.name || "slide.png";
            fileBuffer = new Uint8Array(await file.arrayBuffer());
          } catch (e) {
            return json({ error: "L\u1ED7i \u0111\u1ECDc file upload: " + e.message }, 400, {}, req);
          }
        } else {
          try {
            const rawText = await req.text();
            const b2 = JSON.parse(rawText);
            if (b2.image && typeof b2.image === "string") {
              const match = b2.image.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
              if (match) {
                fileExt = match[1].toLowerCase();
                fileBuffer = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
                originalName = `upload.${fileExt}`;
              }
            }
          } catch {
          }
        }
        if (!fileBuffer || fileBuffer.length === 0) {
          return json({ error: "D\u1EEF li\u1EC7u h\xECnh \u1EA3nh kh\xF4ng h\u1EE3p l\u1EC7." }, 400, {}, req);
        }
        if (fileBuffer.length > 8 * 1024 * 1024) {
          return json({ error: "Dung l\u01B0\u1EE3ng h\xECnh \u1EA3nh qu\xE1 l\u1EDBn (T\u1ED1i \u0111a 8MB)." }, 400, {}, req);
        }
        if (!fileExt) {
          fileExt = originalName.split(".").pop()?.toLowerCase() || "";
        }
        if (fileExt === "jpeg") fileExt = "jpg";
        const ALLOWED_EXTS = ["jpg", "png", "webp"];
        if (!ALLOWED_EXTS.includes(fileExt)) {
          return json({ error: "Ch\u1EC9 ch\u1EA5p nh\u1EADn c\xE1c \u0111\u1ECBnh d\u1EA1ng \u1EA3nh: .jpg, .jpeg, .png, .webp (Kh\xF4ng cho ph\xE9p .exe, .js, .php, .svg)." }, 400, {}, req);
        }
        const head = fileBuffer.slice(0, 12);
        const isPng = head[0] === 137 && head[1] === 80 && head[2] === 78 && head[3] === 71;
        const isJpg = head[0] === 255 && head[1] === 216 && head[2] === 255;
        const isWebp = head[0] === 82 && head[1] === 73 && head[2] === 70 && head[3] === 70 && head[8] === 87 && head[9] === 69 && head[10] === 66 && head[11] === 80;
        if (!isPng && !isJpg && !isWebp) {
          return json({ error: "N\u1ED9i dung file kh\xF4ng \u0111\xFAng \u0111\u1ECBnh d\u1EA1ng \u1EA3nh h\u1EE3p l\u1EC7 (.jpg, .png, .webp)." }, 400, {}, req);
        }
        const safeExt = isPng ? "png" : isJpg ? "jpg" : "webp";
        const mimeType = isPng ? "image/png" : isJpg ? "image/jpeg" : "image/webp";
        const filename = `${path2.includes("slides") ? "slide_" : ""}${crypto.randomUUID()}.${safeExt}`;
        let publicUrl = await uploadToCloudinary(fileBuffer, filename, mimeType);
        if (!publicUrl) {
          publicUrl = await uploadToSupabaseStorage(fileBuffer, filename, mimeType);
        }
        if (!publicUrl) {
          const base64Str = Buffer.from(fileBuffer).toString("base64");
          publicUrl = `data:${mimeType};base64,${base64Str}`;
        }
        await log2(true, `Upload image th\xE0nh c\xF4ng: ${publicUrl.startsWith("data:") ? "Embedded Data URL" : publicUrl}`);
        return json({ url: publicUrl, message: "Upload \u1EA3nh th\xE0nh c\xF4ng!" }, 200, {}, req);
      }
      if (Number(req.headers.get("content-length") || 0) > 6e6) return json({ error: "D\u1EEF li\u1EC7u g\u1EEDi l\xEAn qu\xE1 l\u1EDBn." }, 413, {}, req);
      const raw = await req.text();
      if (raw.length > 6e6) return json({ error: "D\u1EEF li\u1EC7u g\u1EEDi l\xEAn qu\xE1 l\u1EDBn." }, 413, {}, req);
      b = {};
      if (raw && raw.trim()) {
        try {
          b = JSON.parse(raw);
        } catch {
          return json({ error: "D\u1EEF li\u1EC7u kh\xF4ng h\u1EE3p l\u1EC7." }, 400, {}, req);
        }
      }
      if (path2 === "/api/auth/login") {
        const k = "login:" + await digest(ip), now = Date.now();
        await db2.prepare("INSERT INTO auth_attempts (key,count,reset) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count = CASE WHEN auth_attempts.reset < ? THEN 1 ELSE auth_attempts.count + 1 END, reset = CASE WHEN auth_attempts.reset < ? THEN excluded.reset ELSE auth_attempts.reset END").bind(k, now + 9e5, now, now).run();
        const at = await db2.prepare("SELECT count FROM auth_attempts WHERE key = ?").bind(k).first();
        if ((at?.count || 0) > 8) return json({ error: "\u0110\u0103ng nh\u1EADp sai qu\xE1 nhi\u1EC1u l\u1EA7n. Vui l\xF2ng th\u1EED l\u1EA1i sau 15 ph\xFAt." }, 429, {}, req);
        if (typeof b.username !== "string" || typeof b.password !== "string" || b.password.length > 256) return json({ error: "T\xEAn \u0111\u0103ng nh\u1EADp ho\u1EB7c m\u1EADt kh\u1EA9u kh\xF4ng \u0111\xFAng." }, 401, {}, req);
        await db2.prepare("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO NOTHING").bind("admin_credentials", JSON.stringify(DEFAULT_ADMIN)).run();
        const row = await db2.prepare("SELECT value FROM settings WHERE key = ?").bind("admin_credentials").first();
        const c = row ? JSON.parse(row.value) : DEFAULT_ADMIN;
        const envAdminPass = process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
        const validPass = envAdminPass || "Tuan@123";
        const ok = b.password === validPass || await passwordOK(b.password, c) || await passwordOK(b.password, DEFAULT_ADMIN);
        if (b.username !== c.username && b.username !== "admin" || !ok) return json({ error: "T\xEAn \u0111\u0103ng nh\u1EADp ho\u1EB7c m\u1EADt kh\u1EA9u kh\xF4ng \u0111\xFAng." }, 401, {}, req);
        const token = random(), csrf = random();
        await db2.batch([db2.prepare("DELETE FROM admin_sessions WHERE expires < ?").bind(now), db2.prepare("DELETE FROM auth_attempts WHERE key = ?").bind(k), db2.prepare("INSERT INTO admin_sessions (hash,csrf,expires) VALUES (?,?,?)").bind(await digest(token), csrf, now + 288e5)]);
        return json({ admin: true, token, csrf, message: "\u0110\u0103ng nh\u1EADp th\xE0nh c\xF4ng." }, 200, { "Set-Cookie": cookie(req, token) }, req);
      }
      const s = await session(req);
      if (!s) return json({ error: "Phi\xEAn \u0111\u0103ng nh\u1EADp \u0111\xE3 h\u1EBFt h\u1EA1n. Vui l\xF2ng \u0111\u0103ng nh\u1EADp l\u1EA1i." }, 401, {}, req);
      if (req.headers.get("x-csrf-token") !== s.csrf) return json({ error: "Phi\xEAn x\xE1c th\u1EF1c kh\xF4ng h\u1EE3p l\u1EC7. H\xE3y t\u1EA3i l\u1EA1i trang." }, 403, {}, req);
      authorized = true;
      if (path2 === "/api/tournaments/bulk") {
        const ids = Array.isArray(b.ids) ? b.ids.map((x) => String(x).trim()).filter(Boolean) : [];
        if (ids.length === 0) return json({ error: "Vui l\xF2ng ch\u1ECDn \xEDt nh\u1EA5t 1 gi\u1EA3i \u0111\u1EA5u \u0111\u1EC3 x\xF3a." }, 400, {}, req);
        const statements = [];
        for (const id of ids) {
          statements.push(
            db2.prepare("DELETE FROM matches WHERE category_id = ? OR player_id LIKE ?").bind(id, `${id}-%`),
            db2.prepare("DELETE FROM rankings WHERE category_id = ? OR player_id LIKE ?").bind(id, `${id}-%`),
            db2.prepare("DELETE FROM players WHERE tournament_id = ? OR category_id = ?").bind(id, id),
            db2.prepare("DELETE FROM categories WHERE tournament_id = ? OR id = ?").bind(id, id),
            db2.prepare("DELETE FROM details WHERE tid = ? OR tid LIKE ?").bind(id, `${id}-%`),
            db2.prepare("DELETE FROM sync_logs WHERE tournament_id = ?").bind(id),
            db2.prepare("DELETE FROM previews WHERE payload LIKE ?").bind(`%"id":"${id}"%`),
            db2.prepare("DELETE FROM tournaments WHERE id = ?").bind(id)
          );
        }
        await db2.batch(statements);
        await log2(true, `\u0110\xE3 x\xF3a h\xE0ng lo\u1EA1t ${ids.length} gi\u1EA3i \u0111\u1EA5u.`);
        return json({ message: `\u0110\xE3 x\xF3a th\xE0nh c\xF4ng ${ids.length} gi\u1EA3i \u0111\u1EA5u.` }, 200, {}, req);
      }
      if (path2 === "/api/admin/slides" || path2.startsWith("/api/admin/slides/")) {
        await ensureSlidesTableSchema(db2);
        const slideId = path2.replace(/^\/api\/admin\/slides\/?/, "");
        if (req.method === "DELETE" || b.action === "slide_delete") {
          const targetId = slideId || String(b.id || "");
          if (!targetId) return json({ error: "M\xE3 slide kh\xF4ng h\u1EE3p l\u1EC7." }, 400, {}, req);
          await db2.prepare("DELETE FROM tournament_slides WHERE id = ?").bind(targetId).run();
          await log2(true, `\u0110\xE3 x\xF3a slide id: ${targetId}`);
          return json({ message: "\u0110\xE3 x\xF3a slide gi\u1EA3i \u0111\u1EA5u th\xE0nh c\xF4ng." }, 200, {}, req);
        }
        const rawTid = b.tournament_id || b.tournamentId;
        const tournament_id = rawTid && String(rawTid).trim() !== "global" ? String(rawTid).trim() : null;
        const title = String(b.title || "").trim();
        const slide_type = String(b.slide_type || b.slideType || b.type || "\u0110i\u1EC1u l\u1EC7 gi\u1EA3i \u0111\u1EA5u").trim();
        const image_url = String(b.image || b.image_url || b.imageUrl || "").trim();
        const display_order = Number(b.sort_order ?? b.sortOrder ?? b.display_order ?? b.displayOrder ?? 0);
        const status = b.status === "hidden" || b.status === 0 || b.status === false ? "hidden" : "active";
        const now = (/* @__PURE__ */ new Date()).toISOString();
        if (!title) return json({ error: "Vui l\xF2ng nh\u1EADp Ti\xEAu \u0111\u1EC1 slide." }, 400, {}, req);
        if (!image_url) return json({ error: "Vui l\xF2ng t\u1EA3i l\xEAn h\xECnh \u1EA3nh slide." }, 400, {}, req);
        if (req.method === "PUT" || slideId && slideId !== "" || b.action === "slide_update") {
          const targetId = slideId || String(b.id || "");
          if (!targetId) return json({ error: "M\xE3 slide kh\xF4ng h\u1EE3p l\u1EC7." }, 400, {}, req);
          await db2.prepare(`
            UPDATE tournament_slides
            SET tournament_id = ?, title = ?, slide_type = ?, image_url = ?, display_order = ?, status = ?, updated_at = ?
            WHERE id = ?
          `).bind(tournament_id, title, slide_type, image_url, display_order, status, now, targetId).run();
          await log2(true, `C\u1EADp nh\u1EADt slide: ${title}`);
          return json({ message: "\u0110\xE3 c\u1EADp nh\u1EADt slide th\xE0nh c\xF4ng." }, 200, {}, req);
        }
        const id = crypto.randomUUID();
        await db2.prepare(`
          INSERT INTO tournament_slides (id, tournament_id, title, slide_type, image_url, display_order, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(id, tournament_id, title, slide_type, image_url, display_order, status, now, now).run();
        await log2(true, `T\u1EA1o slide m\u1EDBi: ${title}`);
        return json({ message: "\u0110\xE3 t\u1EA1o slide gi\u1EA3i \u0111\u1EA5u th\xE0nh c\xF4ng.", id }, 200, {}, req);
      }
      if (path2 === "/api/admin/prizes" || path2.startsWith("/api/admin/prizes/") || path2 === "/api/prizes" || path2.startsWith("/api/prizes/")) {
        const prizeId = path2.replace(/^\/api\/(?:admin\/)?prizes\/?/, "");
        if (path2 === "/api/prizes/bulk-delete" || path2 === "/api/admin/prizes/bulk-delete" || prizeId === "bulk-delete" || b.action === "prize_bulk_delete") {
          const ids = Array.isArray(b.ids) ? b.ids.map((x) => String(x).trim()).filter(Boolean) : [];
          if (ids.length === 0) {
            return json({ error: "Vui l\xF2ng ch\u1ECDn \xEDt nh\u1EA5t 1 quy t\u1EAFc gi\u1EA3i th\u01B0\u1EDFng \u0111\u1EC3 x\xF3a." }, 400, {}, req);
          }
          let deletedCount = 0;
          for (const id2 of ids) {
            const res = await db2.prepare("DELETE FROM prizes WHERE id = ?").bind(id2).run();
            if (res && res.meta && res.meta.changes) {
              deletedCount += res.meta.changes;
            } else {
              deletedCount++;
            }
          }
          await log2(true, `\u0110\xE3 x\xF3a h\xE0ng lo\u1EA1t ${ids.length} c\u01A1 c\u1EA5u gi\u1EA3i th\u01B0\u1EDFng.`);
          return json({
            message: `\u0110\xE3 x\xF3a th\xE0nh c\xF4ng ${ids.length} c\u01A1 c\u1EA5u gi\u1EA3i th\u01B0\u1EDFng!`,
            deletedCount: ids.length,
            ids
          }, 200, {}, req);
        }
        if (path2 === "/api/admin/prizes/bulk" || prizeId === "bulk" || b.action === "prize_bulk_apply") {
          const targets = Array.isArray(b.targets) ? b.targets : [];
          const rules = Array.isArray(b.rules) ? b.rules : [];
          const conflictStrategy = String(b.conflictStrategy || "skip");
          console.log(`[PRIZE SAVE DEBUG]
payload g\u1EEDi:
${JSON.stringify({
            action: "prize_bulk_apply",
            targetsCount: targets.length,
            targets: targets.map((t) => `${t.tournament_id || t.tournamentId} (${t.group_name || t.groupName})`),
            rules: rules.map((r) => ({
              rank_from: r.rank_from ?? r.rankFrom,
              rank_to: r.rank_to ?? r.rankTo,
              medal: r.medal,
              prize: r.prize_name ?? r.prizeName,
              description: r.description
            }))
          }, null, 2)}
`);
          if (targets.length === 0) {
            return json({ error: "Vui l\xF2ng ch\u1ECDn \xEDt nh\u1EA5t m\u1ED9t gi\u1EA3i \u0111\u1EA5u ho\u1EB7c b\u1EA3ng \u0111\u1EA5u." }, 400, {}, req);
          }
          if (rules.length === 0) {
            return json({ error: "Vui l\xF2ng nh\u1EADp \xEDt nh\u1EA5t m\u1ED9t d\xF2ng quy t\u1EAFc gi\u1EA3i th\u01B0\u1EDFng." }, 400, {}, req);
          }
          for (let i = 0; i < rules.length; i++) {
            const r = rules[i];
            const rFrom = Number(r.rank_from ?? r.rankFrom);
            const rTo = Number(r.rank_to ?? r.rankTo);
            const pName = String(r.prize_name || r.prizeName || "").trim();
            if (isNaN(rFrom) || isNaN(rTo) || rFrom < 1 || rTo < 1 || !Number.isInteger(rFrom) || !Number.isInteger(rTo)) {
              return json({ error: `D\xF2ng ${i + 1}: H\u1EA1ng t\u1EEB v\xE0 H\u1EA1ng \u0111\u1EBFn ph\u1EA3i l\xE0 s\u1ED1 nguy\xEAn d\u01B0\u01A1ng (>= 1).` }, 400, {}, req);
            }
            if (rFrom > rTo) {
              return json({ error: `D\xF2ng ${i + 1}: H\u1EA1ng t\u1EEB (${rFrom}) kh\xF4ng \u0111\u01B0\u1EE3c l\u1EDBn h\u01A1n H\u1EA1ng \u0111\u1EBFn (${rTo}).` }, 400, {}, req);
            }
            if (!pName) {
              return json({ error: `D\xF2ng ${i + 1}: Vui l\xF2ng nh\u1EADp T\xEAn gi\u1EA3i th\u01B0\u1EDFng.` }, 400, {}, req);
            }
          }
          const tList = await list(true);
          const tourMap = new Map(tList.map((t) => [t.id, t.name]));
          for (const tgt of targets) {
            const tId = String(tgt.tournament_id || tgt.tournamentId || "").trim();
            if (!tId || !tourMap.has(tId)) {
              return json({ error: `Gi\u1EA3i \u0111\u1EA5u v\u1EDBi m\xE3 '${tId}' kh\xF4ng t\u1ED3n t\u1EA1i.` }, 400, {}, req);
            }
            if (!tgt.group_name || !String(tgt.group_name).trim()) {
              return json({ error: "T\u1EA5t c\u1EA3 m\u1EE5c ch\u1ECDn ph\u1EA3i c\xF3 T\xEAn b\u1EA3ng \u0111\u1EA5u (group_name)." }, 400, {}, req);
            }
          }
          const now2 = (/* @__PURE__ */ new Date()).toISOString();
          let createdCount = 0;
          let skippedCount = 0;
          let overwrittenCount = 0;
          for (const tgt of targets) {
            const tId = String(tgt.tournament_id || tgt.tournamentId).trim();
            const gName = String(tgt.group_name || tgt.groupName).trim();
            const existingRes = await db2.prepare("SELECT * FROM prizes WHERE tournament_id = ? AND (group_name = ? OR group_name = ? OR ? = ?)").bind(tId, gName, "T\u1EA5t c\u1EA3", gName, "T\u1EA5t c\u1EA3").all();
            const existingList = existingRes.results || [];
            if (conflictStrategy === "overwrite" && existingList.length > 0) {
              await db2.prepare("DELETE FROM prizes WHERE tournament_id = ? AND (group_name = ? OR group_name = ? OR ? = ?)").bind(tId, gName, "T\u1EA5t c\u1EA3", gName, "T\u1EA5t c\u1EA3").run();
              overwrittenCount += existingList.length;
            }
            for (const r of rules) {
              const rFrom = Number(r.rank_from ?? r.rankFrom);
              const rTo = Number(r.rank_to ?? r.rankTo);
              const medal2 = String(r.medal || "Gold Medal").trim();
              const prize_name2 = String(r.prize_name || r.prizeName).trim();
              const description2 = String(r.description || "").trim();
              if (conflictStrategy !== "overwrite") {
                const exactMatch = existingList.find(
                  (e) => e.rank_from === rFrom && e.rank_to === rTo && (e.medal || "") === medal2 && e.prize_name === prize_name2
                );
                const rangeConflicts = existingList.filter(
                  (e) => rFrom <= e.rank_to && rTo >= e.rank_from
                );
                if (exactMatch && conflictStrategy !== "keep_all") {
                  skippedCount++;
                  continue;
                }
                if (rangeConflicts.length > 0 && conflictStrategy === "skip" && !exactMatch) {
                  skippedCount++;
                  continue;
                }
              }
              const id2 = crypto.randomUUID();
              await db2.prepare(`
                INSERT INTO prizes (id, tournament_id, group_name, rank_from, rank_to, medal, prize_name, description, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).bind(id2, tId, gName, rFrom, rTo, medal2, prize_name2, description2, now2, now2).run();
              createdCount++;
            }
          }
          await log2(true, `\xC1p d\u1EE5ng h\xE0ng lo\u1EA1t c\u01A1 c\u1EA5u gi\u1EA3i th\u01B0\u1EDFng: T\u1EA1o m\u1EDBi ${createdCount}, ghi \u0111\xE8 ${overwrittenCount}, b\u1ECF qua ${skippedCount}`);
          return json({
            message: `\u0110\xE3 \xE1p d\u1EE5ng th\xE0nh c\xF4ng ${createdCount} quy t\u1EAFc gi\u1EA3i th\u01B0\u1EDFng cho ${targets.length} m\u1EE5c!`,
            createdCount,
            overwrittenCount,
            skippedCount,
            appliedTargetsCount: targets.length
          }, 200, {}, req);
        }
        if (req.method === "DELETE" || b.action === "prize_delete") {
          const targetId = prizeId || String(b.id || "");
          if (!targetId) return json({ error: "M\xE3 gi\u1EA3i th\u01B0\u1EDFng kh\xF4ng h\u1EE3p l\u1EC7." }, 400, {}, req);
          await db2.prepare("DELETE FROM prizes WHERE id = ?").bind(targetId).run();
          await log2(true, `\u0110\xE3 x\xF3a c\u01A1 c\u1EA5u gi\u1EA3i th\u01B0\u1EDFng id: ${targetId}`);
          return json({ message: "\u0110\xE3 x\xF3a quy t\u1EAFc gi\u1EA3i th\u01B0\u1EDFng th\xE0nh c\xF4ng." }, 200, {}, req);
        }
        const tournament_id = String(b.tournament_id || b.tournamentId || "").trim();
        const group_name = String(b.group_name || b.groupName || b.group || "").trim();
        const rank_from = Number(b.rank_from ?? b.rankFrom ?? 1);
        const rank_to = Number(b.rank_to ?? b.rankTo ?? 1);
        const medal = String(b.medal || "").trim();
        const prize_name = String(b.prize_name || b.prizeName || "").trim();
        const description = String(b.description || "").trim();
        const now = (/* @__PURE__ */ new Date()).toISOString();
        console.log(`[PRIZE SAVE DEBUG]
payload g\u1EEDi:
${JSON.stringify({
          action: req.method === "PUT" || prizeId && prizeId !== "" || b.action === "prize_update" ? "prize_update" : "prize_create",
          tournament_id,
          group: group_name,
          rank_from,
          rank_to,
          prize: prize_name,
          medal,
          description
        }, null, 2)}
`);
        if (!tournament_id) return json({ error: "Vui l\xF2ng ch\u1ECDn Gi\u1EA3i \u0111\u1EA5u (tournament required)." }, 400, {}, req);
        if (!group_name) return json({ error: "Vui l\xF2ng nh\u1EADp B\u1EA3ng/Nh\xF3m \u0111\u1EA5u (group required)." }, 400, {}, req);
        if (!prize_name) return json({ error: "Vui l\xF2ng nh\u1EADp T\xEAn gi\u1EA3i th\u01B0\u1EDFng." }, 400, {}, req);
        if (isNaN(rank_from) || isNaN(rank_to) || rank_from < 1 || rank_to < 1) {
          return json({ error: "Th\u1EE9 h\u1EA1ng t\u1EEB - \u0111\u1EBFn ph\u1EA3i l\xE0 s\u1ED1 nguy\xEAn d\u01B0\u01A1ng >= 1." }, 400, {}, req);
        }
        if (rank_from > rank_to) {
          return json({ error: "Rank From (h\u1EA1ng t\u1EEB) ph\u1EA3i nh\u1ECF h\u01A1n ho\u1EB7c b\u1EB1ng Rank To (h\u1EA1ng \u0111\u1EBFn)." }, 400, {}, req);
        }
        if (req.method === "PUT" || prizeId && prizeId !== "" || b.action === "prize_update") {
          const targetId = prizeId || String(b.id || "");
          if (!targetId) return json({ error: "M\xE3 gi\u1EA3i th\u01B0\u1EDFng kh\xF4ng h\u1EE3p l\u1EC7." }, 400, {}, req);
          await db2.prepare(`
            UPDATE prizes
            SET tournament_id = ?, group_name = ?, rank_from = ?, rank_to = ?, medal = ?, prize_name = ?, description = ?, updated_at = ?
            WHERE id = ?
          `).bind(tournament_id, group_name, rank_from, rank_to, medal, prize_name, description, now, targetId).run();
          await log2(true, `C\u1EADp nh\u1EADt c\u01A1 c\u1EA5u gi\u1EA3i th\u01B0\u1EDFng: ${prize_name}`);
          return json({ message: "\u0110\xE3 c\u1EADp nh\u1EADt quy t\u1EAFc gi\u1EA3i th\u01B0\u1EDFng th\xE0nh c\xF4ng." }, 200, {}, req);
        }
        const id = crypto.randomUUID();
        await db2.prepare(`
          INSERT INTO prizes (id, tournament_id, group_name, rank_from, rank_to, medal, prize_name, description, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(id, tournament_id, group_name, rank_from, rank_to, medal, prize_name, description, now, now).run();
        await log2(true, `T\u1EA1o c\u01A1 c\u1EA5u gi\u1EA3i th\u01B0\u1EDFng m\u1EDBi: ${prize_name}`);
        return json({ message: "\u0110\xE3 t\u1EA1o quy t\u1EAFc gi\u1EA3i th\u01B0\u1EDFng th\xE0nh c\xF4ng.", id }, 200, {}, req);
      }
      if (path2 === "/api/auth/logout") {
        await db2.prepare("DELETE FROM admin_sessions WHERE hash = ?").bind(s.hash).run();
        return json({ message: "\u0110\xE3 \u0111\u0103ng xu\u1EA5t." }, 200, { "Set-Cookie": cookie(req, "", 0) }, req);
      }
      if (path2 !== "/api/admin") return json({ error: "Kh\xF4ng t\xECm th\u1EA5y ch\u1EE9c n\u0103ng." }, 404, {}, req);
      action = String(b.action || "");
      if (action === "detect") {
        if (!await lock("source-detect", 2)) return json({ error: "Vui l\xF2ng ch\u1EDD v\xE0i gi\xE2y gi\u1EEFa c\xE1c l\u1EA7n ki\u1EC3m tra." }, 429, {}, req);
        const info = await source.detect(String(b.url || ""));
        for (const cat of info.categories) {
          if (cat.status === "L\u1ED7i t\u1EA3i") continue;
          try {
            const existingCat = await db2.prepare("SELECT id FROM categories WHERE id = ?").bind(cat.id).first();
            cat.status = existingCat ? "\u0110\xE3 nh\u1EADp" : "Ch\u01B0a nh\u1EADp";
          } catch {
            cat.status = "Ch\u01B0a nh\u1EADp";
          }
        }
        return json({ detected: info }, 200, {}, req);
      }
      if (action === "preview") {
        if (!await lock("source-preview", 3)) return json({ error: "Vui l\xF2ng ch\u1EDD v\xE0i gi\xE2y gi\u1EEFa c\xE1c l\u1EA7n ki\u1EC3m tra ngu\u1ED3n." }, 429, {}, req);
        const t = await source.tournament(String(b.url || ""), String(b.group || ""));
        if (b.name?.trim()) t.name = String(b.name).trim().slice(0, 240);
        const token = random();
        await db2.batch([db2.prepare("DELETE FROM previews WHERE expires < ?").bind(Date.now()), db2.prepare("INSERT INTO previews (token,owner,payload,expires) VALUES (?,?,?,?)").bind(token, s.hash, JSON.stringify(t), Date.now() + 6e5)]);
        return json({ tournament: t, token }, 200, {}, req);
      }
      if (action === "save") {
        const row = await db2.prepare("SELECT payload FROM previews WHERE token = ? AND owner = ? AND expires > ?").bind(String(b.token || ""), s.hash, Date.now()).first();
        if (!row) return json({ error: "B\u1EA3n ki\u1EC3m tra \u0111\xE3 h\u1EBFt h\u1EA1n. H\xE3y ki\u1EC3m tra ngu\u1ED3n l\u1EA1i." }, 400, {}, req);
        const t = JSON.parse(row.payload);
        if (await get(t.id, true)) return json({ error: "Gi\u1EA3i n\xE0y \u0111\xE3 t\u1ED3n t\u1EA1i. H\xE3y ch\u1ECDn S\u1EEDa ho\u1EB7c \u0110\u1ED3ng b\u1ED9." }, 409, {}, req);
        await db2.batch([db2.prepare("INSERT INTO tournaments (id,payload,published,updated) VALUES (?,?,0,?)").bind(t.id, JSON.stringify(t), t.updated), db2.prepare("DELETE FROM previews WHERE token = ?").bind(b.token)]);
        await log2(true, `Th\xEAm gi\u1EA3i: ${t.name} \xB7 ${t.players.length} k\u1EF3 th\u1EE7`);
        return json({ message: "\u0110\xE3 th\xEAm gi\u1EA3i \u1EDF tr\u1EA1ng th\xE1i \u1EA9n. Nh\u1EA5n Hi\u1EC7n gi\u1EA3i khi \u0111\xE3 s\u1EB5n s\xE0ng." }, 200, {}, req);
      }
      if (action === "batch_import") {
        const items = b.items || [];
        if (!items.length) return json({ error: "Kh\xF4ng c\xF3 b\u1EA3ng \u0111\u1EA5u n\xE0o \u0111\u01B0\u1EE3c ch\u1ECDn \u0111\u1EC3 nh\u1EADp." }, 400, {}, req);
        let totalPlayers = 0;
        let successCount = 0;
        const mainTournamentTitle = b.name?.trim() || b.mainName?.trim() || "Gi\u1EA3i \u0111\u1EA5u";
        const masterId = items[0]?.url.match(/\/tnr(\d+)\.aspx/i)?.[1] || "master";
        const allParsedCategories = [];
        const failedItems = [];
        for (const item of items) {
          let t = null;
          let lastErr = null;
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              t = await source.tournament(item.url, item.group);
              break;
            } catch (err) {
              lastErr = err;
              if (attempt < 3) {
                await new Promise((r) => setTimeout(r, 1e3 * attempt));
              }
            }
          }
          if (!t) {
            console.error("Batch import error after retries for", item.url, lastErr);
            failedItems.push(item.group || item.url);
            continue;
          }
          t.name = mainTournamentTitle;
          allParsedCategories.push({ cat: item, tour: t });
          totalPlayers += t.players.length;
          successCount++;
          try {
            await db2.prepare(`
              INSERT INTO categories (id, tournament_id, name, gender, age_group, source_url, total_players, rounds, updated, payload)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                gender = excluded.gender,
                age_group = excluded.age_group,
                total_players = excluded.total_players,
                rounds = excluded.rounds,
                updated = excluded.updated,
                payload = excluded.payload
            `).bind(t.id, masterId, t.group, t.players[0]?.gender || null, t.players[0]?.ageGroup || null, t.source, t.players.length, t.rounds || null, t.updated, JSON.stringify(t)).run();
            for (const p of t.players) {
              await db2.prepare(`
                INSERT INTO players (id, category_id, tournament_id, snr, name, fide_id, rating, club, country, gender, age_group, updated)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  name = excluded.name,
                  fide_id = excluded.fide_id,
                  rating = excluded.rating,
                  club = excluded.club,
                  gender = excluded.gender,
                  age_group = excluded.age_group,
                  updated = excluded.updated
              `).bind(p.id, t.id, masterId, p.snr, p.name, p.fideId || null, p.rating || null, p.club || "", p.country || null, p.gender || null, p.ageGroup || null, t.updated).run();
              await db2.prepare(`
                INSERT INTO rankings (player_id, category_id, rank, points, buchholz, sonneborn_berger, performance, ties_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(player_id) DO UPDATE SET
                  rank = excluded.rank,
                  points = excluded.points,
                  buchholz = excluded.buchholz,
                  sonneborn_berger = excluded.sonneborn_berger,
                  performance = excluded.performance,
                  ties_json = excluded.ties_json
              `).bind(p.id, t.id, p.rank || null, p.points || null, p.buchholz || null, p.sonnebornBerger || null, p.performance || null, JSON.stringify(p.ties)).run();
            }
          } catch (dbErr) {
            console.error("Relational DB save error:", dbErr);
          }
        }
        if (!allParsedCategories.length) {
          return json({ error: "Kh\xF4ng th\u1EC3 \u0111\u1ED3ng b\u1ED9 b\u1EA3ng \u0111\u1EA5u n\xE0o. Vui l\xF2ng th\u1EED l\u1EA1i sau." }, 502, {}, req);
        }
        const combinedPlayers = [];
        const categoriesMeta = [];
        for (const { tour } of allParsedCategories) {
          categoriesMeta.push({
            id: tour.id,
            tournamentId: masterId,
            name: tour.group,
            group: tour.group,
            sourceUrl: tour.source,
            totalPlayers: tour.players.length,
            rounds: tour.rounds
          });
          for (const p of tour.players) {
            combinedPlayers.push({
              ...p,
              categoryId: tour.id,
              tournamentId: masterId
            });
          }
        }
        const masterTournament = {
          id: masterId,
          name: mainTournamentTitle,
          group: `${categoriesMeta.length} b\u1EA3ng \u0111\u1EA5u`,
          source: items[0]?.url || `https://chess-results.com/tnr${masterId}.aspx?lan=1`,
          updated: (/* @__PURE__ */ new Date()).toISOString(),
          categories: categoriesMeta,
          players: combinedPlayers,
          tieLabels: ["BH", "SB", "Rp"],
          rounds: allParsedCategories[0]?.tour.rounds || null,
          published: true
        };
        const existingMaster = await get(masterId, true);
        if (existingMaster) {
          await db2.prepare("UPDATE tournaments SET payload = ?, updated = ? WHERE id = ?").bind(JSON.stringify(masterTournament), masterTournament.updated, masterId).run();
        } else {
          await db2.prepare("INSERT INTO tournaments (id,payload,published,updated) VALUES (?,?,1,?)").bind(masterId, JSON.stringify(masterTournament), masterTournament.updated).run();
        }
        for (const { tour } of allParsedCategories) {
          const catEntry = {
            ...tour,
            name: `${mainTournamentTitle} \u2014 ${tour.group}`,
            published: true
          };
          const existingCat = await get(tour.id, true);
          if (existingCat) {
            await db2.prepare("UPDATE tournaments SET payload = ?, updated = ? WHERE id = ?").bind(JSON.stringify(catEntry), catEntry.updated, tour.id).run();
          } else {
            await db2.prepare("INSERT INTO tournaments (id,payload,published,updated) VALUES (?,?,1,?)").bind(tour.id, JSON.stringify(catEntry), tour.updated).run();
          }
        }
        const isFullySuccess = successCount === items.length;
        await log2(isFullySuccess, `\u0110\u1ED3ng b\u1ED9 V2 gi\u1EA3i \u0111\u1EA5u: ${mainTournamentTitle} \xB7 ${successCount}/${items.length} b\u1EA3ng \u0111\u1EA5u, t\u1ED5ng ${totalPlayers} k\u1EF3 th\u1EE7`);
        await logSync({
          tournament_id: masterId,
          tournament_name: mainTournamentTitle,
          url: items[0]?.url || `https://chess-results.com/tnr${masterId}.aspx?lan=1`,
          status: isFullySuccess ? "success" : "failed",
          players_updated: totalPlayers,
          message: isFullySuccess ? `\u0110\u1ED3ng b\u1ED9 V2 th\xE0nh c\xF4ng: ${mainTournamentTitle} (${successCount} b\u1EA3ng, ${totalPlayers} k\u1EF3 th\u1EE7)` : `\u0110\u1ED3ng b\u1ED9 V2 ch\u01B0a ho\xE0n t\u1EA5t: ${successCount}/${items.length} b\u1EA3ng th\xE0nh c\xF4ng, ${failedItems.length} b\u1EA3ng th\u1EA5t b\u1EA1i (${failedItems.join(", ")})`
        });
        if (isFullySuccess) {
          return json({ message: `\u0110\xE3 \u0111\u1ED3ng b\u1ED9 th\xE0nh c\xF4ng ${successCount} b\u1EA3ng \u0111\u1EA5u v\u1EDBi t\u1ED5ng c\u1ED9ng ${totalPlayers} k\u1EF3 th\u1EE7!` }, 200, {}, req);
        } else {
          return json({ message: `\u0110\xE3 \u0111\u1ED3ng b\u1ED9 ${successCount}/${items.length} b\u1EA3ng \u0111\u1EA5u (${totalPlayers} k\u1EF3 th\u1EE7). C\u1EA3nh b\xE1o: c\xF3 ${failedItems.length} b\u1EA3ng ch\u01B0a t\u1EA3i \u0111\u01B0\u1EE3c (${failedItems.join(", ")}).` }, 200, {}, req);
        }
      }
      if (action === "banner_create") {
        const id = crypto.randomUUID();
        const title = String(b.title || "").trim();
        const description = String(b.description || "").trim();
        const image_url = String(b.image_url || "").trim() || "/company-logo.png";
        const button_text = String(b.button_text || "").trim() || "Xem ngay";
        const button_link = String(b.button_link || "").trim() || "/";
        const is_active = b.is_active === false || b.is_active === 0 ? 0 : 1;
        const sort_order = Number(b.sort_order || 0);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        if (!title) return json({ error: "Ti\xEAu \u0111\u1EC1 banner kh\xF4ng \u0111\u01B0\u1EE3c \u0111\u1EC3 tr\u1ED1ng." }, 400, {}, req);
        await db2.prepare(`
          INSERT INTO home_banners (id, title, description, image_url, button_text, button_link, is_active, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(id, title, description, image_url, button_text, button_link, is_active, sort_order, now, now).run();
        await log2(true, `T\u1EA1o banner m\u1EDBi: ${title}`);
        return json({ message: "\u0110\xE3 t\u1EA1o banner m\u1EDBi th\xE0nh c\xF4ng." }, 200, {}, req);
      }
      if (action === "banner_update") {
        const id = String(b.id || "");
        const title = String(b.title || "").trim();
        const description = String(b.description || "").trim();
        const image_url = String(b.image_url || "").trim() || "/company-logo.png";
        const button_text = String(b.button_text || "").trim() || "Xem ngay";
        const button_link = String(b.button_link || "").trim() || "/";
        const is_active = b.is_active === false || b.is_active === 0 ? 0 : 1;
        const sort_order = Number(b.sort_order || 0);
        const now = (/* @__PURE__ */ new Date()).toISOString();
        if (!id || !title) return json({ error: "Th\xF4ng tin banner kh\xF4ng h\u1EE3p l\u1EC7." }, 400, {}, req);
        await db2.prepare(`
          UPDATE home_banners
          SET title = ?, description = ?, image_url = ?, button_text = ?, button_link = ?, is_active = ?, sort_order = ?, updated_at = ?
          WHERE id = ?
        `).bind(title, description, image_url, button_text, button_link, is_active, sort_order, now, id).run();
        await log2(true, `C\u1EADp nh\u1EADt banner: ${title}`);
        return json({ message: "\u0110\xE3 c\u1EADp nh\u1EADt banner th\xE0nh c\xF4ng." }, 200, {}, req);
      }
      if (action === "banner_delete") {
        const id = String(b.id || "");
        if (!id) return json({ error: "M\xE3 banner kh\xF4ng h\u1EE3p l\u1EC7." }, 400, {}, req);
        await db2.prepare("DELETE FROM home_banners WHERE id = ?").bind(id).run();
        await log2(true, `\u0110\xE3 x\xF3a banner id: ${id}`);
        return json({ message: "\u0110\xE3 x\xF3a banner th\xE0nh c\xF4ng." }, 200, {}, req);
      }
      if (action === "banner_toggle") {
        const id = String(b.id || "");
        const is_active = b.is_active ? 1 : 0;
        if (!id) return json({ error: "M\xE3 banner kh\xF4ng h\u1EE3p l\u1EC7." }, 400, {}, req);
        await db2.prepare("UPDATE home_banners SET is_active = ?, updated_at = ? WHERE id = ?").bind(is_active, (/* @__PURE__ */ new Date()).toISOString(), id).run();
        await log2(true, `${is_active ? "Hi\u1EC7n" : "\u1EA8n"} banner id: ${id}`);
        return json({ message: is_active ? "\u0110\xE3 hi\u1EC3n th\u1ECB banner." : "\u0110\xE3 \u1EA9n banner." }, 200, {}, req);
      }
      if (action === "bulk_delete") {
        const ids = Array.isArray(b.ids) ? b.ids.map((x) => String(x).trim()).filter(Boolean) : [];
        if (ids.length === 0) return json({ error: "Vui l\xF2ng ch\u1ECDn \xEDt nh\u1EA5t 1 gi\u1EA3i \u0111\u1EA5u \u0111\u1EC3 x\xF3a." }, 400, {}, req);
        const statements = [];
        for (const id of ids) {
          statements.push(
            db2.prepare("DELETE FROM matches WHERE category_id = ? OR player_id LIKE ?").bind(id, `${id}-%`),
            db2.prepare("DELETE FROM rankings WHERE category_id = ? OR player_id LIKE ?").bind(id, `${id}-%`),
            db2.prepare("DELETE FROM players WHERE tournament_id = ? OR category_id = ?").bind(id, id),
            db2.prepare("DELETE FROM categories WHERE tournament_id = ? OR id = ?").bind(id, id),
            db2.prepare("DELETE FROM details WHERE tid = ? OR tid LIKE ?").bind(id, `${id}-%`),
            db2.prepare("DELETE FROM sync_logs WHERE tournament_id = ?").bind(id),
            db2.prepare("DELETE FROM previews WHERE payload LIKE ?").bind(`%"id":"${id}"%`),
            db2.prepare("DELETE FROM tournaments WHERE id = ?").bind(id)
          );
        }
        await db2.batch(statements);
        await log2(true, `\u0110\xE3 x\xF3a h\xE0ng lo\u1EA1t ${ids.length} gi\u1EA3i \u0111\u1EA5u.`);
        return json({ message: `\u0110\xE3 x\xF3a th\xE0nh c\xF4ng ${ids.length} gi\u1EA3i \u0111\u1EA5u.` }, 200, {}, req);
      }
      const old = await get(String(b.id || ""), true);
      if (!old) return json({ error: "Gi\u1EA3i kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c \u0111\xE3 b\u1ECB x\xF3a." }, 404, {}, req);
      if (action === "publish") {
        const shown = b.published === true;
        await db2.prepare("UPDATE tournaments SET published = ? WHERE id = ?").bind(shown ? 1 : 0, old.id).run();
        await log2(true, `${shown ? "Hi\u1EC7n" : "\u1EA8n"} gi\u1EA3i: ${old.name}`);
        return json({ message: shown ? "\u0110\xE3 c\xF4ng b\u1ED1 gi\u1EA3i \u0111\u1EA5u." : "\u0110\xE3 \u1EA9n gi\u1EA3i \u0111\u1EA5u." }, 200, {}, req);
      }
      if (action === "toggle_auto_sync") {
        const autoSync = b.auto_sync === true || b.auto_sync === 1;
        const nowIso = (/* @__PURE__ */ new Date()).toISOString();
        const interval = old.syncInterval || old.sync_interval || 5;
        const nextSyncIso = autoSync ? new Date(Date.now() + interval * 60 * 1e3).toISOString() : null;
        const updatedTour = {
          ...old,
          autoSync,
          auto_sync: autoSync,
          syncInterval: interval,
          sync_interval: interval,
          ...autoSync ? {
            lastSync: old.lastSync || old.last_sync || nowIso,
            last_sync: old.lastSync || old.last_sync || nowIso,
            nextSync: nextSyncIso,
            next_sync: nextSyncIso
          } : {}
        };
        const payloadStr = JSON.stringify(updatedTour);
        try {
          await db2.prepare("UPDATE tournaments SET payload = ?, auto_sync = ?, sync_interval = ?, last_sync = ?, next_sync = ? WHERE id = ?").bind(payloadStr, autoSync ? 1 : 0, interval, updatedTour.lastSync || null, nextSyncIso, old.id).run();
        } catch {
          await db2.prepare("UPDATE tournaments SET payload = ? WHERE id = ?").bind(payloadStr, old.id).run();
        }
        await log2(true, `${autoSync ? "B\u1EADt" : "T\u1EAFt"} t\u1EF1 \u0111\u1ED9ng \u0111\u1ED3ng b\u1ED9 gi\u1EA3i: ${old.name}`);
        return json({ message: autoSync ? "\u0110\xE3 b\u1EADt t\u1EF1 \u0111\u1ED9ng \u0111\u1ED3ng b\u1ED9 (m\u1ED7i 5 ph\xFAt)." : "\u0110\xE3 t\u1EAFt t\u1EF1 \u0111\u1ED9ng \u0111\u1ED3ng b\u1ED9." }, 200, {}, req);
      }
      if (action === "delete") {
        if (b.confirmName !== old.name) return json({ error: "T\xEAn x\xE1c nh\u1EADn x\xF3a kh\xF4ng kh\u1EDBp." }, 400, {}, req);
        await db2.batch([
          db2.prepare("DELETE FROM matches WHERE category_id = ? OR player_id LIKE ?").bind(old.id, `${old.id}-%`),
          db2.prepare("DELETE FROM rankings WHERE category_id = ? OR player_id LIKE ?").bind(old.id, `${old.id}-%`),
          db2.prepare("DELETE FROM players WHERE tournament_id = ? OR category_id = ?").bind(old.id, old.id),
          db2.prepare("DELETE FROM categories WHERE tournament_id = ? OR id = ?").bind(old.id, old.id),
          db2.prepare("DELETE FROM details WHERE tid = ?").bind(old.id),
          db2.prepare("DELETE FROM tournaments WHERE id = ?").bind(old.id)
        ]);
        await log2(true, `\u0110\xE3 x\xF3a gi\u1EA3i: ${old.name}`);
        return json({ message: "\u0110\xE3 x\xF3a gi\u1EA3i v\xE0 to\xE0n b\u1ED9 d\u1EEF li\u1EC7u k\u1EF3 th\u1EE7 c\u1EE7a gi\u1EA3i." }, 200, {}, req);
      }
      if (action === "edit" || action === "sync" || action === "force_sync") {
        let t;
        if (action === "force_sync") {
          try {
            await db2.batch([
              db2.prepare("DELETE FROM details WHERE tid = ? OR tid LIKE ?").bind(old.id, `${old.id}-%`),
              db2.prepare("DELETE FROM matches WHERE category_id = ? OR player_id LIKE ?").bind(old.id, `${old.id}-%`),
              db2.prepare("DELETE FROM rankings WHERE category_id = ? OR player_id LIKE ?").bind(old.id, `${old.id}-%`),
              db2.prepare("DELETE FROM players WHERE tournament_id = ? OR category_id = ?").bind(old.id, old.id)
            ]);
          } catch (e) {
            console.error("Error purging old cache for force_sync:", e);
          }
          t = await source.tournament(old.source, old.group);
          t.name = old.name;
        } else if (action === "edit") {
          const name = String(b.name || "").trim(), group = String(b.group || "").trim(), url = String(b.url || "").trim();
          if (!name || name.length > 240 || group.length > 100) return json({ error: "T\xEAn gi\u1EA3i kh\xF4ng \u0111\u01B0\u1EE3c tr\u1ED1ng v\xE0 ph\u1EA3i d\u01B0\u1EDBi 240 k\xFD t\u1EF1." }, 400, {}, req);
          validateSource(url);
          if (url === old.source) {
            t = { ...old, name, group };
          } else {
            if (!await lock("sync:" + old.id, 20)) return json({ error: "Gi\u1EA3i \u0111ang \u0111\u01B0\u1EE3c \u0111\u1ED3ng b\u1ED9. Vui l\xF2ng th\u1EED l\u1EA1i sau." }, 429, {}, req);
            t = await source.tournament(url, group);
            if (t.id !== old.id && await get(t.id, true)) return json({ error: "Link m\u1EDBi thu\u1ED9c m\u1ED9t gi\u1EA3i \u0111\xE3 c\xF3 trong \u1EE9ng d\u1EE5ng." }, 409, {}, req);
            t.name = name;
          }
        } else {
          if (!await lock("sync:" + old.id, 20)) return json({ error: "Gi\u1EA3i v\u1EEBa \u0111\u01B0\u1EE3c \u0111\u1ED3ng b\u1ED9. Vui l\xF2ng ch\u1EDD 20 gi\xE2y." }, 429, {}, req);
          t = await source.tournament(old.source, old.group);
          if (t.players.length < old.players.length) throw Error(`Ngu\u1ED3n ch\u1EC9 tr\u1EA3 ${t.players.length}/${old.players.length} k\u1EF3 th\u1EE7. D\u1EEF li\u1EC7u c\u0169 \u0111\u01B0\u1EE3c gi\u1EEF \u0111\u1EC3 tr\xE1nh m\u1EA5t k\u1EBFt qu\u1EA3.`);
          t.name = old.name;
        }
        t.published = old.published;
        const nowIso = (/* @__PURE__ */ new Date()).toISOString();
        const interval = t.syncInterval || t.sync_interval || old.syncInterval || old.sync_interval || 5;
        const nextSyncIso = new Date(Date.now() + interval * 60 * 1e3).toISOString();
        if (action === "sync" || action === "force_sync") {
          t.autoSync = old.autoSync !== false && old.auto_sync !== false;
          t.auto_sync = t.autoSync;
          t.syncInterval = interval;
          t.sync_interval = interval;
          t.lastSync = nowIso;
          t.last_sync = nowIso;
          t.nextSync = nextSyncIso;
          t.next_sync = nextSyncIso;
        }
        const statements = [];
        if (t.id !== old.id) {
          try {
            statements.push(db2.prepare("INSERT INTO tournaments (id,payload,published,updated,auto_sync,sync_interval,last_sync,next_sync) VALUES (?,?,?,?,?,?,?,?)").bind(t.id, JSON.stringify(t), old.published ? 1 : 0, t.updated, t.autoSync ? 1 : 0, interval, t.lastSync || nowIso, t.nextSync || nextSyncIso));
          } catch {
            statements.push(db2.prepare("INSERT INTO tournaments (id,payload,published,updated) VALUES (?,?,?,?)").bind(t.id, JSON.stringify(t), old.published ? 1 : 0, t.updated));
          }
          statements.push(db2.prepare("DELETE FROM tournaments WHERE id = ?").bind(old.id));
        } else {
          try {
            statements.push(db2.prepare("UPDATE tournaments SET payload = ?, updated = ?, auto_sync = ?, sync_interval = ?, last_sync = ?, next_sync = ? WHERE id = ?").bind(JSON.stringify(t), t.updated, t.autoSync ? 1 : 0, interval, t.lastSync || nowIso, t.nextSync || nextSyncIso, t.id));
          } catch {
            statements.push(db2.prepare("UPDATE tournaments SET payload = ?, updated = ? WHERE id = ?").bind(JSON.stringify(t), t.updated, t.id));
          }
        }
        if (t.updated !== old.updated || t.id !== old.id || action === "force_sync") statements.push(db2.prepare("DELETE FROM details WHERE tid = ?").bind(old.id));
        await db2.batch(statements);
        await log2(true, `${action === "edit" ? "S\u1EEDa" : action === "force_sync" ? "\xC9p \u0111\u1ED3ng b\u1ED9" : "\u0110\u1ED3ng b\u1ED9"} gi\u1EA3i: ${t.name}`);
        await logSync({
          tournament_id: t.id,
          tournament_name: t.name,
          url: t.source,
          status: "success",
          players_updated: t.players.length,
          message: `\u0110\u1ED3ng b\u1ED9 th\xE0nh c\xF4ng t\u1EEB Chess-Results (${action}): ${t.name} (${t.players.length} k\u1EF3 th\u1EE7)`
        });
        return json({ message: action === "edit" ? "\u0110\xE3 l\u01B0u ch\u1EC9nh s\u1EEDa." : action === "force_sync" ? "\u0110\xE3 \xE9p \u0111\u1ED3ng b\u1ED9 l\u1EA1i v\xE0 l\xE0m s\u1EA1ch cache d\u1EEF li\u1EC7u th\xE0nh c\xF4ng." : "\u0110\xE3 c\u1EADp nh\u1EADt k\u1EBFt qu\u1EA3 m\u1EDBi nh\u1EA5t." }, 200, {}, req);
      }
      if (action === "tournament_update_info") {
        const id = String(b.id || "");
        if (!id) return json({ error: "M\xE3 gi\u1EA3i \u0111\u1EA5u kh\xF4ng h\u1EE3p l\u1EC7." }, 400, {}, req);
        const oldTour = await get(id, true);
        if (!oldTour) return json({ error: "Gi\u1EA3i \u0111\u1EA5u kh\xF4ng t\u1ED3n t\u1EA1i." }, 404, {}, req);
        const info = typeof b.info === "object" && b.info ? b.info : {};
        const prizes = Array.isArray(b.prizes) ? b.prizes : [];
        console.log(`[PRIZE SAVE] tournament_update_info tournamentId: ${id} prizes:`, JSON.stringify(prizes));
        const updatedTour = {
          ...oldTour,
          info,
          prizes,
          updated: (/* @__PURE__ */ new Date()).toISOString()
        };
        await db2.prepare("UPDATE tournaments SET payload = ?, updated = ? WHERE id = ?").bind(JSON.stringify(updatedTour), updatedTour.updated, id).run();
        try {
          await db2.prepare("DELETE FROM prizes WHERE tournament_id = ?").bind(id).run();
          const now = (/* @__PURE__ */ new Date()).toISOString();
          for (const p of prizes) {
            const prizeId = p.id || crypto.randomUUID();
            const gName = p.group_name || p.group || "T\u1EA5t c\u1EA3";
            const rFrom = Number(p.rank_from ?? p.rankFrom ?? 1);
            const rTo = Number(p.rank_to ?? p.rankTo ?? 1);
            const medalStr = p.medal || "Gold Medal";
            const pName = p.prize_name || p.prizeName || "";
            const desc = p.description || "";
            if (pName) {
              await db2.prepare(`
                INSERT INTO prizes (id, tournament_id, group_name, rank_from, rank_to, medal, prize_name, description, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).bind(prizeId, id, gName, rFrom, rTo, medalStr, pName, desc, now, now).run();
            }
          }
        } catch (pErr) {
          console.error("[PRIZE SAVE DB SYNC ERROR]", pErr);
        }
        await log2(true, `C\u1EADp nh\u1EADt th\xF4ng tin & c\u01A1 c\u1EA5u gi\u1EA3i th\u01B0\u1EDFng gi\u1EA3i: ${oldTour.name}`);
        return json({ message: "\u0110\xE3 c\u1EADp nh\u1EADt th\xF4ng tin & c\u01A1 c\u1EA5u gi\u1EA3i th\u01B0\u1EDFng th\xE0nh c\xF4ng!" }, 200, {}, req);
      }
      return json({ error: "Thao t\xE1c kh\xF4ng \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3." }, 400, {}, req);
    } catch (e) {
      const m = message(e);
      if (authorized && ["preview", "sync", "edit", "batch_import", "detect", "banner_create", "banner_update", "banner_delete", "banner_toggle", "tournament_update_info", "toggle_auto_sync"].includes(action)) {
        try {
          await log2(false, m);
          await logSync({
            tournament_id: b.id || void 0,
            tournament_name: b.name || void 0,
            url: b.url || b.source || "",
            status: "failed",
            players_updated: 0,
            message: `L\u1ED7i \u0111\u1ED3ng b\u1ED9 Chess-Results: ${m}`
          });
        } catch {
        }
      }
      return json({ error: m }, 502, {}, req);
    }
  };
}

// database.ts
import { DatabaseSync } from "node:sqlite";
import { readFileSync as readFileSync2, readdirSync, mkdirSync as mkdirSync2, existsSync as existsSync2 } from "node:fs";
import { dirname, resolve as resolve2 } from "node:path";
import pg from "pg";
import dns from "node:dns";
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
}
function convertSql(sql) {
  let paramCount = 0;
  let inString = false;
  let stringChar = "";
  let result = "";
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (inString) {
      result += char;
      if (char === stringChar) {
        if (i + 1 < sql.length && sql[i + 1] === stringChar) {
          result += stringChar;
          i++;
        } else {
          inString = false;
        }
      }
    } else {
      if (char === "'" || char === '"') {
        inString = true;
        stringChar = char;
        result += char;
      } else if (char === "?") {
        paramCount++;
        result += `$${paramCount}`;
      } else {
        result += char;
      }
    }
  }
  return result;
}
function openDatabase(connectionStringOrFile, migrations) {
  const isPg = connectionStringOrFile.startsWith("postgres://") || connectionStringOrFile.startsWith("postgresql://");
  if (isPg) {
    const pool = new pg.Pool({
      connectionString: connectionStringOrFile,
      ssl: process.env.NODE_ENV === "production" || connectionStringOrFile.includes("render.com") || connectionStringOrFile.includes("supabase") || connectionStringOrFile.includes("neon") || connectionStringOrFile.includes("railway") || process.env.PGSSLMODE === "require" || process.env.PGSSLMODE === "no-verify" ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 15e3,
      max: 20
    });
    class PgQuery {
      text;
      args = [];
      constructor(text) {
        this.text = text;
      }
      bind(...args) {
        const q = new PgQuery(this.text);
        q.args = args;
        return q;
      }
      async first() {
        if (this.text.includes("PRAGMA")) return null;
        if (this.text.includes("sqlite_master")) return null;
        const pgSql = convertSql(this.text);
        const res = await pool.query(pgSql, this.args);
        return res.rows[0] || null;
      }
      async all() {
        if (this.text.includes("PRAGMA")) return { results: [] };
        if (this.text.includes("sqlite_master")) return { results: [] };
        const pgSql = convertSql(this.text);
        const res = await pool.query(pgSql, this.args);
        return { results: res.rows };
      }
      async run() {
        if (this.text.includes("PRAGMA")) return { meta: { changes: 0 } };
        if (this.text.includes("sqlite_master")) return { meta: { changes: 0 } };
        const pgSql = convertSql(this.text);
        const res = await pool.query(pgSql, this.args);
        return { meta: { changes: res.rowCount || 0 } };
      }
    }
    return {
      source: "postgresql",
      prepare: (s) => new PgQuery(s),
      async batch(ss) {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const results = [];
          for (const s of ss) {
            const query = s;
            if (query.text.includes("PRAGMA") || query.text.includes("sqlite_master")) continue;
            const pgSql = convertSql(query.text);
            const r = await client.query(pgSql, query.args);
            results.push({ meta: { changes: r.rowCount || 0 } });
          }
          await client.query("COMMIT");
          return results;
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release();
        }
      },
      close: () => pool.end()
    };
  }
  mkdirSync2(dirname(connectionStringOrFile), { recursive: true });
  const sql = new DatabaseSync(connectionStringOrFile);
  sql.exec("PRAGMA busy_timeout=30000; PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;");
  sql.exec("CREATE TABLE IF NOT EXISTS sgc_migrations (name TEXT PRIMARY KEY, applied TEXT NOT NULL)");
  if (existsSync2(migrations)) {
    for (const name of readdirSync(migrations).filter((n) => n.endsWith(".sql")).sort()) {
      let isApplied = false;
      try {
        isApplied = !!sql.prepare("SELECT name FROM sgc_migrations WHERE name = ?").get(name);
      } catch {
      }
      if (!isApplied) {
        for (let attempt = 0; attempt < 5; attempt++) {
          try {
            sql.exec("BEGIN IMMEDIATE");
            try {
              if (!sql.prepare("SELECT name FROM sgc_migrations WHERE name = ?").get(name)) {
                const content = readFileSync2(resolve2(migrations, name), "utf8");
                const stmts = content.split(";").map((s) => s.trim()).filter(Boolean);
                for (const st of stmts) {
                  try {
                    sql.exec(st + ";");
                  } catch (stErr) {
                    if (!/already exists|duplicate/i.test(stErr?.message || "")) {
                      console.warn(`[MIGRATION WARN] ${name}: ${stErr?.message}`);
                    }
                  }
                }
                sql.prepare("INSERT OR IGNORE INTO sgc_migrations (name,applied) VALUES (?,?)").run(name, (/* @__PURE__ */ new Date()).toISOString());
              }
              sql.exec("COMMIT");
            } catch (e) {
              sql.exec("ROLLBACK");
              throw e;
            }
            break;
          } catch (err) {
            if (attempt === 4 || !/locked|busy/i.test(err?.message || "")) throw err;
            const delay = Math.floor(Math.random() * 200) + 100;
            const start = Date.now();
            while (Date.now() - start < delay) {
            }
          }
        }
      }
    }
  }
  class Query {
    text;
    args = [];
    constructor(text) {
      this.text = text;
    }
    bind(...args) {
      const q = new Query(this.text);
      q.args = args;
      return q;
    }
    async first() {
      return sql.prepare(this.text).get(...this.args) || null;
    }
    async all() {
      return { results: sql.prepare(this.text).all(...this.args) };
    }
    execute() {
      const r = sql.prepare(this.text).run(...this.args);
      return { meta: { changes: Number(r.changes) } };
    }
    async run() {
      return this.execute();
    }
  }
  return {
    source: "sqlite",
    prepare: (s) => new Query(s),
    async batch(ss) {
      sql.exec("BEGIN IMMEDIATE");
      try {
        const r = ss.map((s) => s.execute());
        sql.exec("COMMIT");
        return r;
      } catch (e) {
        sql.exec("ROLLBACK");
        throw e;
      }
    },
    close: () => sql.close()
  };
}

// node_modules/node-cron/dist/_shared.js
import { EventEmitter } from "events";
import { randomUUID } from "node:crypto";
function createID() {
  return randomUUID();
}
var levelColors = {
  INFO: "\x1B[36m",
  WARN: "\x1B[33m",
  ERROR: "\x1B[31m",
  DEBUG: "\x1B[35m"
};
var GREEN = "\x1B[32m";
var RESET = "\x1B[0m";
function log(level, message2, extra) {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const color = levelColors[level];
  const prefix = `[${timestamp}] [PID: ${process.pid}] ${GREEN}[NODE-CRON]${GREEN} ${color}[${level}]${RESET}`;
  const output = `${prefix} ${message2}`;
  switch (level) {
    case "ERROR":
      console.error(output, extra ?? "");
      break;
    case "DEBUG":
      console.debug(output, extra ?? "");
      break;
    case "WARN":
      console.warn(output);
      break;
    case "INFO":
    default:
      console.info(output);
      break;
  }
}
var defaultLogger = {
  info(message2) {
    log("INFO", message2);
  },
  warn(message2) {
    log("WARN", message2);
  },
  error(message2, err) {
    if (message2 instanceof Error) {
      log("ERROR", message2.message, message2);
    } else {
      log("ERROR", message2, err);
    }
  },
  debug(message2, err) {
    if (message2 instanceof Error) {
      log("DEBUG", message2.message, message2);
    } else {
      log("DEBUG", message2, err);
    }
  }
};
var activeLogger = defaultLogger;
function setLogger(logger2) {
  activeLogger = logger2 ?? defaultLogger;
}
var logger = {
  info: (message2) => activeLogger.info(message2),
  warn: (message2) => activeLogger.warn(message2),
  error: (message2, err) => activeLogger.error(message2, err),
  debug: (message2, err) => activeLogger.debug(message2, err)
};
var TrackedPromise = class {
  promise;
  error;
  state;
  value;
  constructor(executor) {
    this.state = "pending";
    this.promise = new Promise((resolve5, reject) => {
      executor((value) => {
        this.state = "fulfilled";
        this.value = value;
        resolve5(value);
      }, (error) => {
        this.state = "rejected";
        this.error = error;
        reject(error);
      });
    });
  }
  getPromise() {
    return this.promise;
  }
  getState() {
    return this.state;
  }
  isPending() {
    return this.state === "pending";
  }
  isFulfilled() {
    return this.state === "fulfilled";
  }
  isRejected() {
    return this.state === "rejected";
  }
  getValue() {
    return this.value;
  }
  getError() {
    return this.error;
  }
  then(onfulfilled, onrejected) {
    return this.promise.then(onfulfilled, onrejected);
  }
  catch(onrejected) {
    return this.promise.catch(onrejected);
  }
  finally(onfinally) {
    return this.promise.finally(onfinally);
  }
};
function planBeat(expected, now, toleranceMs, getNextMatch2) {
  const missed = [];
  let slot = expected;
  while (true) {
    const nowMs = now.getTime();
    const slotMs = slot.getTime();
    if (nowMs < slotMs) {
      return { missed, next: slot };
    }
    const next = getNextMatch2(slot);
    if (next.getTime() <= slotMs) {
      return { missed, next: getNextMatch2(now) };
    }
    const gap = next.getTime() - slotMs;
    const lateBy = nowMs - slotMs;
    if (lateBy <= toleranceMs && lateBy < gap) {
      return { missed, run: slot, next };
    }
    missed.push(slot);
    slot = next;
  }
}
var DEFAULT_MISSED_EXECUTION_TOLERANCE = 1e3;
function emptyOnFn() {
}
function emptySkipFn() {
}
function emptyHookFn() {
  return true;
}
var DEFAULT_COORDINATOR_TTL = 3e4;
var Runner = class {
  timeMatcher;
  onMatch;
  noOverlap;
  maxExecutions;
  maxRandomDelay;
  missedExecutionTolerance;
  runCount;
  running;
  heartBeatTimeout;
  jitterTimeout;
  logger;
  onMissedExecution;
  onOverlap;
  onError;
  beforeRun;
  onFinished;
  onMaxExecutions;
  runCoordinator;
  coordinatorKeyPrefix;
  coordinatorTtl;
  onSkipped;
  unref;
  constructor(timeMatcher, onMatch, options) {
    this.timeMatcher = timeMatcher;
    this.onMatch = onMatch;
    this.noOverlap = options == void 0 || options.noOverlap === void 0 ? false : options.noOverlap;
    this.maxExecutions = options?.maxExecutions;
    this.maxRandomDelay = options?.maxRandomDelay || 0;
    this.missedExecutionTolerance = options?.missedExecutionTolerance ?? DEFAULT_MISSED_EXECUTION_TOLERANCE;
    this.logger = options?.logger || logger;
    this.onMissedExecution = options?.onMissedExecution || emptyOnFn;
    this.onOverlap = options?.onOverlap || emptyOnFn;
    this.onError = options?.onError || ((date, error) => this.logger.error("Task failed with error!", error));
    this.onFinished = options?.onFinished || emptyHookFn;
    this.beforeRun = options?.beforeRun || emptyHookFn;
    this.onMaxExecutions = options?.onMaxExecutions || emptyOnFn;
    this.runCoordinator = options?.runCoordinator;
    this.coordinatorKeyPrefix = options?.coordinatorKeyPrefix || "";
    this.coordinatorTtl = options?.coordinatorTtl ?? DEFAULT_COORDINATOR_TTL;
    this.onSkipped = options?.onSkipped || emptySkipFn;
    this.unref = options?.unref ?? false;
    this.runCount = 0;
    this.running = false;
  }
  onErrorFallback = (date, error) => {
    this.logger.error("Task failed with error!", error);
  };
  async runCoordinated(slot, run) {
    if (!this.runCoordinator) {
      await run();
      return;
    }
    const key2 = `${this.coordinatorKeyPrefix}:${slot.toISOString()}`;
    let allowed;
    try {
      allowed = await this.runCoordinator.shouldRun(key2, this.coordinatorTtl);
    } catch (err) {
      this.logger.error("Run coordinator failed; skipping execution (fail-closed)", err);
      this.emitSkipped(slot, "coordinator-error");
      return;
    }
    if (!allowed) {
      this.emitSkipped(slot, "not-elected");
      return;
    }
    try {
      await run();
    } finally {
      try {
        await this.runCoordinator.onComplete?.(key2);
      } catch (err) {
        this.logger.error("Run coordinator onComplete failed", err);
      }
    }
  }
  emitSkipped(slot, reason) {
    Promise.resolve(this.onSkipped(slot, reason)).catch((err) => this.onErrorFallback(slot, err));
  }
  start() {
    this.running = true;
    let lastExecution;
    let expectedNextExecution = this.timeMatcher.getNextMatch(nowWithoutMs());
    const armHeartBeat = () => {
      if (this.running) {
        clearTimeout(this.heartBeatTimeout);
        this.heartBeatTimeout = setTimeout(heartBeat, getDelay(expectedNextExecution));
        if (this.unref)
          this.heartBeatTimeout.unref();
      }
    };
    const runTask = async (date) => {
      const execution = {
        id: createID(),
        reason: "scheduled"
      };
      let shouldExecute;
      try {
        shouldExecute = await this.beforeRun(date, execution);
      } catch (error) {
        this.onError(date, error, execution);
        return;
      }
      if (!shouldExecute)
        return;
      const execute = async () => {
        try {
          this.runCount++;
          execution.startedAt = /* @__PURE__ */ new Date();
          const result = await this.onMatch(date, execution);
          execution.finishedAt = /* @__PURE__ */ new Date();
          execution.result = result;
        } catch (error) {
          execution.finishedAt = /* @__PURE__ */ new Date();
          execution.error = error;
          try {
            this.onError(date, error, execution);
          } catch (hookError) {
            this.onErrorFallback(date, hookError);
          }
          return;
        }
        try {
          await this.onFinished(date, execution);
        } catch (hookError) {
          this.onErrorFallback(date, hookError);
        }
        if (this.maxExecutions && this.runCount >= this.maxExecutions) {
          this.onMaxExecutions(date);
          this.stop();
        }
      };
      const randomDelay = Math.floor(Math.random() * this.maxRandomDelay);
      if (randomDelay > 0) {
        await new Promise((resolve5) => {
          this.jitterTimeout = setTimeout(() => {
            execute().then(() => resolve5(), () => resolve5());
          }, randomDelay);
          if (this.unref)
            this.jitterTimeout.unref();
        });
      } else {
        await execute();
      }
    };
    const heartBeat = async () => {
      const currentDate = nowWithoutMs();
      const plan = planBeat(expectedNextExecution, currentDate, this.missedExecutionTolerance, (date) => this.timeMatcher.getNextMatch(date));
      expectedNextExecution = plan.next;
      for (const missedSlot of plan.missed) {
        runAsync(this.onMissedExecution, missedSlot, this.onErrorFallback);
      }
      if (plan.run) {
        if (lastExecution && lastExecution.getState() === "pending") {
          runAsync(this.onOverlap, plan.run, this.onErrorFallback);
          if (this.noOverlap) {
            this.logger.warn("task still running, new execution blocked by overlap prevention!");
            armHeartBeat();
            return;
          }
        }
        const slot = plan.run;
        lastExecution = new TrackedPromise(async (resolve5, reject) => {
          try {
            await this.runCoordinated(slot, () => runTask(slot));
            resolve5(true);
          } catch (err) {
            reject(err);
          }
        });
        lastExecution.catch(() => {
        });
      }
      armHeartBeat();
    };
    armHeartBeat();
  }
  nextRun() {
    return this.timeMatcher.getNextMatch(/* @__PURE__ */ new Date());
  }
  stop() {
    this.running = false;
    if (this.heartBeatTimeout) {
      clearTimeout(this.heartBeatTimeout);
      this.heartBeatTimeout = void 0;
    }
    if (this.jitterTimeout) {
      clearTimeout(this.jitterTimeout);
      this.jitterTimeout = void 0;
    }
  }
  isStarted() {
    return !!this.heartBeatTimeout && this.running;
  }
  isStopped() {
    return !this.isStarted();
  }
  setUnref(value) {
    this.unref = value;
    if (this.heartBeatTimeout) {
      if (value)
        this.heartBeatTimeout.unref();
      else
        this.heartBeatTimeout.ref();
    }
    if (this.jitterTimeout) {
      if (value)
        this.jitterTimeout.unref();
      else
        this.jitterTimeout.ref();
    }
  }
  async execute(executionId) {
    const date = /* @__PURE__ */ new Date();
    const execution = {
      id: executionId ?? createID(),
      reason: "invoked"
    };
    try {
      const shouldExecute = await this.beforeRun(date, execution);
      if (!shouldExecute)
        return;
      execution.startedAt = /* @__PURE__ */ new Date();
      const result = await this.onMatch(date, execution);
      execution.finishedAt = /* @__PURE__ */ new Date();
      execution.result = result;
    } catch (error) {
      execution.finishedAt = /* @__PURE__ */ new Date();
      execution.error = error;
      this.onError(date, error, execution);
      return;
    }
    try {
      await this.onFinished(date, execution);
    } catch (hookError) {
      this.onErrorFallback(date, hookError);
    }
  }
};
async function runAsync(fn, date, onError) {
  try {
    await fn(date);
  } catch (error) {
    onError(date, error);
  }
}
function getDelay(nextRun) {
  const maxDelay = 864e5;
  const now = /* @__PURE__ */ new Date();
  const delay = nextRun.getTime() - now.getTime();
  if (delay > maxDelay) {
    return maxDelay;
  }
  return Math.max(0, delay);
}
function nowWithoutMs() {
  const date = /* @__PURE__ */ new Date();
  date.setMilliseconds(0);
  return date;
}
var monthNamesConversion = /* @__PURE__ */ (() => {
  const months = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december"
  ];
  const shortMonths = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec"
  ];
  function convertMonthName(expression, items) {
    for (let i = 0; i < items.length; i++) {
      expression = expression.replace(new RegExp(items[i], "gi"), i + 1);
    }
    return expression;
  }
  function interpret(monthExpression) {
    monthExpression = convertMonthName(monthExpression, months);
    monthExpression = convertMonthName(monthExpression, shortMonths);
    return monthExpression;
  }
  return interpret;
})();
var weekDayNamesConversion = /* @__PURE__ */ (() => {
  const weekDays = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday"
  ];
  const shortWeekDays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  function convertWeekDayName(expression, items) {
    for (let i = 0; i < items.length; i++) {
      expression = expression.replace(new RegExp(items[i], "gi"), i);
    }
    return expression;
  }
  function convertWeekDays(expression) {
    expression = convertWeekDayName(expression, weekDays);
    return convertWeekDayName(expression, shortWeekDays);
  }
  return convertWeekDays;
})();
var convertAsterisksToRanges = /* @__PURE__ */ (() => {
  function convertAsterisk(expression, replecement) {
    return expression.split(",").map((token) => token.indexOf("*") !== -1 ? token.replace("*", replecement) : token).join(",");
  }
  function convertAsterisksToRanges2(expressions) {
    expressions[0] = convertAsterisk(expressions[0], "0-59");
    expressions[1] = convertAsterisk(expressions[1], "0-59");
    expressions[2] = convertAsterisk(expressions[2], "0-23");
    expressions[3] = convertAsterisk(expressions[3], "1-31");
    expressions[4] = convertAsterisk(expressions[4], "1-12");
    expressions[5] = convertAsterisk(expressions[5], "0-6");
    return expressions;
  }
  return convertAsterisksToRanges2;
})();
var convertRanges = /* @__PURE__ */ (() => {
  const rangeRegEx = /^(\d+)-(\d+)(?:\/(\d+))?$/;
  const FIELD_BOUNDS = [
    { min: 0, max: 59 },
    { min: 0, max: 59 },
    { min: 0, max: 23 },
    { min: 1, max: 31 },
    { min: 1, max: 12 },
    { min: 0, max: 6 }
  ];
  function expandRange(initTxt, endTxt, stepTxt, bounds) {
    const step = parseInt(stepTxt, 10);
    if (!(step >= 1))
      return `${initTxt}-${endTxt}/${stepTxt}`;
    const first = parseInt(initTxt, 10);
    const last = parseInt(endTxt, 10);
    const numbers = [];
    if (first <= last) {
      for (let i = first; i <= last; i += step) {
        numbers.push(i);
      }
      return numbers.join();
    }
    const { min, max } = bounds;
    const size = max - min + 1;
    const span = ((last - first) % size + size) % size;
    for (let offset = 0; offset <= span; offset += step) {
      let value = first + offset;
      if (value > max)
        value -= size;
      numbers.push(value);
    }
    return numbers.join();
  }
  function convertRange(expression, bounds) {
    return expression.split(",").map((token) => {
      const match = rangeRegEx.exec(token.trim());
      return match ? expandRange(match[1], match[2], match[3] || "1", bounds) : token;
    }).join();
  }
  function convertAllRanges(expressions) {
    for (let i = 0; i < expressions.length; i++) {
      expressions[i] = convertRange(expressions[i], FIELD_BOUNDS[i]);
    }
    return expressions;
  }
  return convertAllRanges;
})();
var NICKNAMES = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *"
};
function resolveNickname(expression) {
  const key2 = expression.trim().toLowerCase();
  return NICKNAMES[key2] ?? expression;
}
var convertExpression = /* @__PURE__ */ (() => {
  function appendSecondExpression(expressions) {
    if (expressions.length === 5) {
      return ["0"].concat(expressions);
    }
    return expressions;
  }
  function removeSpaces(str) {
    return str.replace(/\s{2,}/g, " ").trim();
  }
  function normalizeIntegers(expressions) {
    for (let i = 0; i < expressions.length; i++) {
      const numbers = expressions[i].split(",");
      for (let j = 0; j < numbers.length; j++) {
        const token = String(numbers[j]).trim();
        if (/^l$/i.test(token)) {
          numbers[j] = "L";
        } else if (/^l-\d{1,2}$/i.test(token)) {
          numbers[j] = token.toUpperCase();
        } else if (/^[0-7]l$/i.test(token)) {
          numbers[j] = token.toUpperCase();
        } else if (/w/i.test(token)) {
          numbers[j] = token.toUpperCase();
        } else if (token.indexOf("#") !== -1) {
          numbers[j] = token;
        } else if (/^\d+$/.test(token)) {
          numbers[j] = parseInt(token, 10);
        } else {
          numbers[j] = token;
        }
      }
      expressions[i] = numbers;
    }
    return expressions;
  }
  function convertQuestionMarks(expressions) {
    if (expressions[3] === "?")
      expressions[3] = "*";
    if (expressions[5] === "?")
      expressions[5] = "*";
    return expressions;
  }
  function interpret(expression) {
    let expressions = removeSpaces(resolveNickname(`${expression}`)).split(" ");
    expressions = appendSecondExpression(expressions);
    expressions = convertQuestionMarks(expressions);
    expressions[4] = monthNamesConversion(expressions[4]);
    expressions[5] = weekDayNamesConversion(expressions[5]);
    expressions = convertAsterisksToRanges(expressions);
    expressions = convertRanges(expressions);
    expressions = normalizeIntegers(expressions);
    const weekdays = expressions[5];
    for (let i = 0; i < weekdays.length; i++) {
      if (weekdays[i] === 7)
        weekdays[i] = 0;
      else if (typeof weekdays[i] === "string" && weekdays[i].startsWith("7")) {
        weekdays[i] = "0" + weekdays[i].slice(1);
      }
    }
    expressions[5] = [...new Set(weekdays)];
    return expressions;
  }
  return interpret;
})();
var LocalizedTime = class {
  timestamp;
  parts;
  timezone;
  constructor(date, timezone) {
    this.timestamp = date.getTime();
    this.timezone = timezone;
    this.parts = buildDateParts(date, timezone);
  }
  toDate() {
    return new Date(this.timestamp);
  }
  toISO() {
    const gmt = this.parts.gmt.replace(/^GMT/, "");
    const offset = gmt ? gmt : "Z";
    const pad = (n) => String(n).padStart(2, "0");
    return `${this.parts.year}-${pad(this.parts.month)}-${pad(this.parts.day)}T${pad(this.parts.hour)}:${pad(this.parts.minute)}:${pad(this.parts.second)}.${String(this.parts.millisecond).padStart(3, "0")}` + offset;
  }
  getParts() {
    return this.parts;
  }
};
function getOffsetMinutes(date, timezone) {
  const offset = parseOffsetMinutes(getTimezoneGMT(date, timezone).replace(/^GMT/, "") || "Z");
  return offset ?? 0;
}
function readsBackTo(timestamp, parts, timezone) {
  const p = buildDateParts(new Date(timestamp), timezone);
  return p.year === parts.year && p.month === parts.month && p.day === parts.day && p.hour === parts.hour && p.minute === parts.minute && p.second === parts.second;
}
function localTimeToTimestamp(parts, timezone) {
  const guess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, parts.millisecond);
  const firstOffset = getOffsetMinutes(new Date(guess), timezone);
  const candidate1 = guess - firstOffset * 6e4;
  const secondOffset = getOffsetMinutes(new Date(candidate1), timezone);
  if (secondOffset === firstOffset) {
    return candidate1;
  }
  const candidate2 = guess - secondOffset * 6e4;
  if (readsBackTo(candidate1, parts, timezone))
    return candidate1;
  if (readsBackTo(candidate2, parts, timezone))
    return candidate2;
  return Math.max(candidate1, candidate2);
}
var partsFormatterCache = /* @__PURE__ */ new Map();
var offsetFormatterCache = /* @__PURE__ */ new Map();
function getPartsFormatter(timezone) {
  const key2 = timezone ?? "";
  let formatter = partsFormatterCache.get(key2);
  if (!formatter) {
    const dftOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
      hour12: false
    };
    if (timezone) {
      dftOptions.timeZone = timezone;
    }
    formatter = new Intl.DateTimeFormat("en-US", dftOptions);
    partsFormatterCache.set(key2, formatter);
  }
  return formatter;
}
function getOffsetFormatter(timezone) {
  const key2 = timezone ?? "";
  let formatter = offsetFormatterCache.get(key2);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset"
    });
    offsetFormatterCache.set(key2, formatter);
  }
  return formatter;
}
function buildDateParts(date, timezone) {
  const dateFormat = getPartsFormatter(timezone);
  const parts = dateFormat.formatToParts(date).filter((part) => {
    return part.type !== "literal";
  }).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  const result = {
    day: parseInt(parts.day),
    month: parseInt(parts.month),
    year: parseInt(parts.year),
    hour: parts.hour === "24" ? 0 : parseInt(parts.hour),
    minute: parseInt(parts.minute),
    second: parseInt(parts.second),
    millisecond: date.getMilliseconds(),
    weekday: parts.weekday
  };
  let gmt;
  Object.defineProperty(result, "gmt", {
    enumerable: true,
    configurable: true,
    get() {
      return gmt ??= getTimezoneGMT(date, timezone);
    }
  });
  return result;
}
function parseOffsetMinutes(isoString) {
  if (isoString.endsWith("Z"))
    return 0;
  const match = isoString.match(/([+-])(\d{2}):(\d{2})$/);
  if (!match)
    return null;
  const sign = match[1] === "+" ? 1 : -1;
  return sign * (parseInt(match[2]) * 60 + parseInt(match[3]));
}
function getTimezoneGMT(date, timezone) {
  const fmt = getOffsetFormatter(timezone);
  const parts = fmt.formatToParts(date);
  const tzPart = parts.find((p) => p.type === "timeZoneName");
  if (!tzPart)
    return "Z";
  const tzValue = tzPart.value;
  if (tzValue === "GMT")
    return "Z";
  const match = tzValue.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
  if (!match)
    return "Z";
  const sign = match[1];
  const hoursNum = parseInt(match[2]);
  const minutesNum = parseInt(match[3] || "0");
  if (hoursNum === 0 && minutesNum === 0)
    return "Z";
  const hours = match[2].padStart(2, "0");
  const minutes = (match[3] || "00").padStart(2, "0");
  return `GMT${sign}${hours}:${minutes}`;
}
var LAST_DAY_TOKEN = "L";
var WEEKDAY_TOKEN = /^(\d{1,2}|L)W$/;
var LAST_DAY_OFFSET_TOKEN = /^L-(\d{1,2})$/;
function lastDayOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
function nearestWeekday(year, month, target) {
  const last = lastDayOfMonth(year, month);
  if (target < 1 || target > last)
    return -1;
  const weekday = new Date(Date.UTC(year, month - 1, target)).getUTCDay();
  if (weekday === 6)
    return target === 1 ? target + 2 : target - 1;
  if (weekday === 0)
    return target === last ? target - 2 : target + 1;
  return target;
}
function matchesDayOfMonth(field, year, month, day) {
  for (const value of field) {
    if (value === day)
      return true;
    if (value === LAST_DAY_TOKEN && day === lastDayOfMonth(year, month))
      return true;
    if (typeof value === "string") {
      const weekdayMatch = WEEKDAY_TOKEN.exec(value);
      if (weekdayMatch) {
        const target = weekdayMatch[1] === LAST_DAY_TOKEN ? lastDayOfMonth(year, month) : parseInt(weekdayMatch[1], 10);
        if (nearestWeekday(year, month, target) === day)
          return true;
      }
      const offsetMatch = LAST_DAY_OFFSET_TOKEN.exec(value);
      if (offsetMatch) {
        const target = lastDayOfMonth(year, month) - parseInt(offsetMatch[1], 10);
        if (target >= 1 && target === day)
          return true;
      }
    }
  }
  return false;
}
var LAST_WEEKDAY_REGEX = /^([0-7])L$/i;
var NTH_WEEKDAY_REGEX = /^([0-7])#([1-5])$/;
function parseLastWeekdayToken(value) {
  if (typeof value !== "string")
    return null;
  const match = LAST_WEEKDAY_REGEX.exec(value);
  if (!match)
    return null;
  const weekday = parseInt(match[1], 10);
  return weekday === 7 ? 0 : weekday;
}
function isLastWeekdayOfMonth(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  const inSevenDays = new Date(date.getTime());
  inSevenDays.setUTCDate(inSevenDays.getUTCDate() + 7);
  return inSevenDays.getUTCMonth() + 1 !== month;
}
function isNthWeekdayToken(value) {
  return typeof value === "string" && NTH_WEEKDAY_REGEX.test(value);
}
function parseNthWeekday(value) {
  if (typeof value !== "string")
    return null;
  const match = NTH_WEEKDAY_REGEX.exec(value);
  if (!match)
    return null;
  const weekday = parseInt(match[1], 10) % 7;
  const nth = parseInt(match[2], 10);
  return { weekday, nth };
}
function occurrenceInMonth(day) {
  return Math.floor((day - 1) / 7) + 1;
}
function matchesNthWeekday(token, year, month, day) {
  const parsed = parseNthWeekday(token);
  if (!parsed)
    return false;
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  if (weekday !== parsed.weekday)
    return false;
  return occurrenceInMonth(day) === parsed.nth;
}
function matchesDayOfWeek(field, year, month, day, weekday) {
  for (const value of field) {
    if (value === weekday)
      return true;
    if (isNthWeekdayToken(value)) {
      if (matchesNthWeekday(value, year, month, day))
        return true;
      continue;
    }
    const lastWeekday = parseLastWeekdayToken(value);
    if (lastWeekday !== null && lastWeekday === weekday && isLastWeekdayOfMonth(year, month, day)) {
      return true;
    }
  }
  return false;
}
var MAX_DAYS = 366 * 100;
var MatcherWalker = class {
  baseDate;
  timeMatcher;
  timezone;
  seconds;
  minutes;
  hours;
  days;
  months;
  weekdays;
  constructor(timeMatcher, baseDate, timezone) {
    this.baseDate = baseDate;
    this.timeMatcher = timeMatcher;
    this.timezone = timezone;
    const expressions = timeMatcher.expressions;
    this.seconds = sortedAsc(expressions[0]);
    this.minutes = sortedAsc(expressions[1]);
    this.hours = sortedAsc(expressions[2]);
    this.days = expressions[3];
    this.months = expressions[4];
    this.weekdays = expressions[5];
  }
  isMatching() {
    return this.timeMatcher.match(this.baseDate);
  }
  matchNext() {
    const months = this.months;
    const days = this.days;
    const baseMs = Math.floor(this.baseDate.getTime() / 1e3) * 1e3;
    const baseParts = new LocalizedTime(new Date(baseMs), this.timezone).getParts();
    let { year, month, day } = baseParts;
    for (let i = 0; i < MAX_DAYS; i++) {
      if (months.includes(month) && matchesDayOfMonth(days, year, month, day) && this.matchesWeekday(year, month, day)) {
        const lowerBound = i === 0 ? baseParts : null;
        const found = this.firstTimeOnDay(year, month, day, lowerBound, baseMs);
        if (found !== null) {
          return new LocalizedTime(new Date(found), this.timezone);
        }
      }
      ({ year, month, day } = nextDay(year, month, day));
    }
    throw new Error("Could not find next matching date within reasonable time range");
  }
  firstTimeOnDay(year, month, day, lowerBound, baseMs) {
    const { seconds, minutes, hours } = this;
    for (const hour of hours) {
      if (lowerBound && hour < lowerBound.hour)
        continue;
      for (const minute of minutes) {
        for (const second of seconds) {
          if (lowerBound && !isLaterInDay(hour, minute, second, lowerBound))
            continue;
          const ts = localTimeToTimestamp({ year, month, day, hour, minute, second, millisecond: 0 }, this.timezone);
          if (ts > baseMs && this.timeMatcher.match(new Date(ts))) {
            return ts;
          }
        }
      }
    }
    return null;
  }
  matchesWeekday(year, month, day) {
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    return matchesDayOfWeek(this.weekdays, year, month, day, weekday);
  }
};
function nextDay(year, month, day) {
  const d = new Date(Date.UTC(year, month - 1, day + 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}
function sortedAsc(values) {
  return [...values].sort((a, b) => a - b);
}
function isLaterInDay(hour, minute, second, bound) {
  return hour * 3600 + minute * 60 + second > bound.hour * 3600 + bound.minute * 60 + bound.second;
}
function matchValue(allowedValues, value) {
  return allowedValues.indexOf(value) !== -1;
}
var TimeMatcher = class {
  timezone;
  pattern;
  expressions;
  constructor(pattern, timezone) {
    this.timezone = timezone;
    this.pattern = pattern;
    this.expressions = convertExpression(pattern);
  }
  match(date) {
    const localizedTime = new LocalizedTime(date, this.timezone);
    const parts = localizedTime.getParts();
    const runOnSecond = matchValue(this.expressions[0], parts.second);
    const runOnMinute = matchValue(this.expressions[1], parts.minute);
    const runOnHour = matchValue(this.expressions[2], parts.hour);
    const runOnDay = matchesDayOfMonth(this.expressions[3], parts.year, parts.month, parts.day);
    const runOnMonth = matchValue(this.expressions[4], parts.month);
    const weekday = parseInt(weekDayNamesConversion(parts.weekday));
    const runOnWeekDay = matchesDayOfWeek(this.expressions[5], parts.year, parts.month, parts.day, weekday);
    return runOnSecond && runOnMinute && runOnHour && runOnDay && runOnMonth && runOnWeekDay;
  }
  getNextMatch(date) {
    const walker = new MatcherWalker(this, date, this.timezone);
    const next = walker.matchNext();
    return next.toDate();
  }
};
var allowedTransitions = {
  "stopped": ["stopped", "idle", "destroyed"],
  "idle": ["idle", "running", "stopped", "destroyed"],
  "running": ["running", "idle", "stopped", "destroyed"],
  "destroyed": ["destroyed"]
};
var StateMachine = class {
  state;
  constructor(initial = "stopped") {
    this.state = initial;
  }
  changeState(state) {
    if (allowedTransitions[this.state].includes(state)) {
      this.state = state;
    } else {
      throw new Error(`invalid transition from ${this.state} to ${state}`);
    }
  }
};
var EnvVarRunCoordinator = class {
  envName;
  constructor(envName = "NODE_CRON_RUN") {
    this.envName = envName;
    this.read();
  }
  shouldRun() {
    return this.read();
  }
  read() {
    const value = process.env[this.envName];
    if (value !== "true" && value !== "false") {
      throw new Error(`node-cron: a \`distributed\` task needs ${this.envName} set to 'true' or 'false'. Set it to 'true' on exactly one instance and 'false' on the others, or provide a coordinator via cron.setRunCoordinator(...).`);
    }
    return value === "true";
  }
};
var globalRunCoordinator;
function setRunCoordinator(coordinator) {
  globalRunCoordinator = coordinator;
}
function resolveRunCoordinator(perTask) {
  return perTask ?? globalRunCoordinator ?? new EnvVarRunCoordinator();
}
var TaskEmitter = class extends EventEmitter {
};
function safeEmit(emitter, event, context, onError) {
  for (const listener of emitter.listeners(event)) {
    try {
      Promise.resolve(listener(context)).catch(onError);
    } catch (error) {
      onError(error);
    }
  }
}
var InlineScheduledTask = class {
  emitter;
  cronExpression;
  timeMatcher;
  runner;
  id;
  name;
  stateMachine;
  timezone;
  logger;
  suppressMissedWarning;
  _lastRun = null;
  constructor(cronExpression, taskFn, options) {
    this.emitter = new TaskEmitter();
    this.cronExpression = cronExpression;
    this.id = createID();
    this.name = options?.name || this.id;
    this.timezone = options?.timezone;
    this.logger = options?.logger || logger;
    this.suppressMissedWarning = options?.suppressMissedWarning || false;
    this.timeMatcher = new TimeMatcher(cronExpression, options?.timezone);
    this.stateMachine = new StateMachine();
    const runnerOptions = {
      timezone: options?.timezone,
      noOverlap: options?.noOverlap,
      maxExecutions: options?.maxExecutions,
      maxRandomDelay: options?.maxRandomDelay,
      missedExecutionTolerance: options?.missedExecutionTolerance,
      logger: this.logger,
      beforeRun: (date, execution) => {
        if (execution.reason === "scheduled") {
          this.changeState("running");
        }
        this.emit("execution:started", this.createContext(date, execution));
        return true;
      },
      onFinished: (date, execution) => {
        if (execution.reason === "scheduled") {
          this.changeState("idle");
        }
        this.recordLastRun(execution);
        this.emit("execution:finished", this.createContext(date, execution));
        return true;
      },
      onError: (date, error, execution) => {
        this.logger.error(error);
        this.recordLastRun(execution);
        this.emit("execution:failed", this.createContext(date, execution));
        this.changeState("idle");
      },
      onOverlap: (date) => {
        this.emit("execution:overlap", this.createContext(date));
      },
      onMissedExecution: (date) => {
        const handled = this.emitter.listenerCount("execution:missed") > 0;
        if (!this.suppressMissedWarning && !handled) {
          this.logger.warn(`missed execution at ${date}! Possible blocking IO or high CPU user at the same process used by node-cron.`);
        }
        this.emit("execution:missed", this.createContext(date));
      },
      onMaxExecutions: (date) => {
        this.emit("execution:maxReached", this.createContext(date));
        this.destroy();
      },
      runCoordinator: options?.distributed ? resolveRunCoordinator(options?.runCoordinator) : void 0,
      coordinatorKeyPrefix: this.name,
      coordinatorTtl: options?.distributedLease,
      onSkipped: (date, reason) => {
        this.emit("execution:skipped", this.createContext(date, void 0, reason));
      },
      unref: options?.unref
    };
    this.runner = new Runner(this.timeMatcher, (date, execution) => {
      return taskFn(this.createContext(date, execution));
    }, runnerOptions);
  }
  getNextRun() {
    if (this.stateMachine.state !== "stopped") {
      return this.runner.nextRun();
    }
    return null;
  }
  getNextRuns(count) {
    const runs = [];
    let from = /* @__PURE__ */ new Date();
    for (let i = 0; i < count; i++) {
      from = this.timeMatcher.getNextMatch(from);
      runs.push(from);
    }
    return runs;
  }
  match(date) {
    return this.timeMatcher.match(date);
  }
  msToNext() {
    const next = this.getNextRun();
    return next ? next.getTime() - Date.now() : null;
  }
  isBusy() {
    return this.getStatus() === "running";
  }
  runsLeft() {
    if (this.runner.maxExecutions == null)
      return void 0;
    return Math.max(0, this.runner.maxExecutions - this.runner.runCount);
  }
  getPattern() {
    return this.cronExpression;
  }
  lastRun() {
    return this._lastRun;
  }
  recordLastRun(execution) {
    const date = execution.finishedAt;
    const lastRun = { date };
    if (execution.error) {
      lastRun.error = execution.error;
    } else {
      lastRun.result = execution.result;
    }
    this._lastRun = lastRun;
  }
  emit(event, context) {
    safeEmit(this.emitter, event, context, (error) => this.logger.error(error));
  }
  changeState(state) {
    if (this.runner.isStarted()) {
      this.stateMachine.changeState(state);
    }
  }
  start() {
    if (this.stateMachine.state === "destroyed")
      return;
    if (this.runner.isStopped()) {
      this.runner.start();
      this.stateMachine.changeState("idle");
      this.emit("task:started", this.createContext(/* @__PURE__ */ new Date()));
    }
  }
  stop() {
    if (this.runner.isStarted()) {
      this.runner.stop();
      this.stateMachine.changeState("stopped");
      this.emit("task:stopped", this.createContext(/* @__PURE__ */ new Date()));
    }
  }
  getStatus() {
    return this.stateMachine.state;
  }
  unref() {
    this.runner.setUnref(true);
  }
  ref() {
    this.runner.setUnref(false);
  }
  destroy() {
    if (this.stateMachine.state === "destroyed")
      return;
    this.stop();
    this.stateMachine.changeState("destroyed");
    this.emit("task:destroyed", this.createContext(/* @__PURE__ */ new Date()));
  }
  execute(executionId) {
    const id = executionId ?? createID();
    return new Promise((resolve5, reject) => {
      const onFail = (context) => {
        if (context.execution?.id !== id)
          return;
        this.off("execution:finished", onFinished);
        this.off("execution:failed", onFail);
        reject(context.execution?.error);
      };
      const onFinished = (context) => {
        if (context.execution?.id !== id)
          return;
        this.off("execution:finished", onFinished);
        this.off("execution:failed", onFail);
        resolve5(context.execution?.result);
      };
      this.on("execution:finished", onFinished);
      this.on("execution:failed", onFail);
      this.runner.execute(id);
    });
  }
  on(event, fun) {
    this.emitter.on(event, fun);
  }
  off(event, fun) {
    this.emitter.off(event, fun);
  }
  once(event, fun) {
    this.emitter.once(event, fun);
  }
  createContext(executionDate, execution, reason) {
    const localTime = new LocalizedTime(executionDate, this.timezone);
    const ctx = {
      date: localTime.toDate(),
      dateLocalIso: localTime.toISO(),
      triggeredAt: /* @__PURE__ */ new Date(),
      task: this,
      execution
    };
    if (reason)
      ctx.reason = reason;
    return ctx;
  }
};

// node_modules/node-cron/dist/node-cron.js
import path, { resolve as resolve3, dirname as dirname2 } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { fork } from "child_process";
import { EventEmitter as EventEmitter2 } from "events";
var tasks = /* @__PURE__ */ new Map();
var TaskRegistry = class {
  add(task) {
    if (this.has(task.id)) {
      throw Error(`task ${task.id} already registered!`);
    }
    tasks.set(task.id, task);
    task.on("task:destroyed", () => {
      this.remove(task);
    });
  }
  get(taskId) {
    return tasks.get(taskId);
  }
  remove(task) {
    if (this.has(task.id)) {
      tasks.delete(task.id);
      task.destroy();
    }
  }
  all() {
    return tasks;
  }
  has(taskId) {
    return tasks.has(taskId);
  }
  killAll() {
    tasks.forEach((id) => this.remove(id));
  }
};
var validationRegex = /^(?:\d+|\*|\*\/\d+)$/;
var ALLOWED_CHARS_REGEX = /^[a-zA-Z0-9-*/,#? ]+$/;
function splitFields(resolved) {
  return resolved.replace(/\s{2,}/g, " ").trim().split(" ");
}
function isValidExpression(expression, min, max) {
  const options = expression;
  for (const option of options) {
    const optionAsInt = parseInt(option, 10);
    if (!Number.isNaN(optionAsInt) && (optionAsInt < min || optionAsInt > max) || !validationRegex.test(option))
      return false;
  }
  return true;
}
function isInvalidSecond(expression) {
  return !isValidExpression(expression, 0, 59);
}
function isInvalidMinute(expression) {
  return !isValidExpression(expression, 0, 59);
}
function isInvalidHour(expression) {
  return !isValidExpression(expression, 0, 23);
}
var DAY_OF_MONTH_W_TOKEN = /^(\d{1,2}|L)W$/i;
var DAY_OF_MONTH_OFFSET_TOKEN = /^L-(\d{1,2})$/i;
function isInvalidDayOfMonth(expression) {
  const days = expression.filter((value) => {
    if (value === "L")
      return false;
    const weekday = DAY_OF_MONTH_W_TOKEN.exec(String(value));
    if (weekday) {
      if (weekday[1] === "L")
        return false;
      const target = parseInt(weekday[1], 10);
      return target < 1 || target > 31;
    }
    const offset = DAY_OF_MONTH_OFFSET_TOKEN.exec(String(value));
    if (offset) {
      const n = parseInt(offset[1], 10);
      return n < 1 || n > 30;
    }
    return true;
  });
  return !isValidExpression(days, 1, 31);
}
function hasInvalidWModifier(rawDayOfMonth) {
  if (!/w/i.test(rawDayOfMonth))
    return false;
  return rawDayOfMonth.split(",").some((token) => {
    const value = token.trim();
    if (!/w/i.test(value))
      return false;
    return !DAY_OF_MONTH_W_TOKEN.test(value);
  });
}
function isInvalidMonth(expression) {
  return !isValidExpression(expression, 1, 12);
}
function isInvalidWeekDay(expression) {
  const days = expression.filter((value) => !isNthWeekdayToken(value) && !/^[0-7]L$/.test(value));
  return !isValidExpression(days, 0, 7);
}
var MAX_DAYS_IN_MONTH = {
  1: 31,
  2: 29,
  3: 31,
  4: 30,
  5: 31,
  6: 30,
  7: 31,
  8: 31,
  9: 30,
  10: 31,
  11: 30,
  12: 31
};
function isImpossibleDayOfMonth(days, months) {
  if (days.some((day) => typeof day !== "number"))
    return false;
  return !months.some((month) => days.some((day) => day <= MAX_DAYS_IN_MONTH[month]));
}
function validateFields(patterns, executablePatterns) {
  if (isInvalidSecond(executablePatterns[0]))
    throw new Error(`${patterns[0]} is a invalid expression for second`);
  if (isInvalidMinute(executablePatterns[1]))
    throw new Error(`${patterns[1]} is a invalid expression for minute`);
  if (isInvalidHour(executablePatterns[2]))
    throw new Error(`${patterns[2]} is a invalid expression for hour`);
  if (isInvalidDayOfMonth(executablePatterns[3]) || hasInvalidWModifier(patterns[3]))
    throw new Error(`${patterns[3]} is a invalid expression for day of month`);
  if (isInvalidMonth(executablePatterns[4]))
    throw new Error(`${patterns[4]} is a invalid expression for month`);
  if (isInvalidWeekDay(executablePatterns[5]))
    throw new Error(`${patterns[5]} is a invalid expression for week day`);
  if (isImpossibleDayOfMonth(executablePatterns[3], executablePatterns[4]))
    throw new Error(`${patterns[3]} ${patterns[4]} is an impossible day of month for the given month`);
}
var FIELDS = [
  { key: "second", label: "second", invalid: isInvalidSecond },
  { key: "minute", label: "minute", invalid: isInvalidMinute },
  { key: "hour", label: "hour", invalid: isInvalidHour },
  { key: "dayOfMonth", label: "day of month", invalid: isInvalidDayOfMonth },
  { key: "month", label: "month", invalid: isInvalidMonth },
  { key: "dayOfWeek", label: "week day", invalid: isInvalidWeekDay }
];
function validateDetailed$1(pattern) {
  if (typeof pattern !== "string")
    return { valid: false, errors: [{ field: "expression", message: "pattern must be a string" }] };
  const resolved = resolveNickname(pattern);
  if (!ALLOWED_CHARS_REGEX.test(resolved))
    return { valid: false, errors: [{ field: "expression", value: pattern, message: "pattern includes illegal characters" }] };
  const raw = splitFields(resolved);
  if (raw.length !== 5 && raw.length !== 6)
    return { valid: false, errors: [{ field: "expression", value: pattern, message: `expected 5 or 6 fields but got ${raw.length}` }] };
  const patterns = raw.length === 5 ? ["0", ...raw] : raw;
  const executable = convertExpression(pattern);
  const errors = [];
  FIELDS.forEach((f, i) => {
    const rawWMisuse = f.key === "dayOfMonth" && hasInvalidWModifier(patterns[i]);
    if (f.invalid(executable[i]) || rawWMisuse)
      errors.push({ field: f.key, value: patterns[i], message: `${patterns[i]} is a invalid expression for ${f.label}` });
  });
  if (!errors.length && isImpossibleDayOfMonth(executable[3], executable[4])) {
    errors.push({
      field: "dayOfMonth",
      value: patterns[3],
      message: `${patterns[3]} ${patterns[4]} is an impossible day of month for the given month`
    });
  }
  if (errors.length)
    return { valid: false, errors };
  return {
    valid: true,
    errors: [],
    fields: {
      second: executable[0],
      minute: executable[1],
      hour: executable[2],
      dayOfMonth: executable[3],
      month: executable[4],
      dayOfWeek: executable[5]
    }
  };
}
function parse$1(pattern) {
  const result = validateDetailed$1(pattern);
  if (!result.valid)
    throw new Error(result.errors[0].message);
  return result.fields;
}
function validate$1(pattern) {
  if (typeof pattern !== "string")
    throw new TypeError("pattern must be a string!");
  const resolved = resolveNickname(pattern);
  if (!ALLOWED_CHARS_REGEX.test(resolved))
    throw new TypeError("pattern includes illegal characters!");
  const raw = splitFields(resolved);
  if (raw.length !== 5 && raw.length !== 6)
    throw new Error(`expected 5 or 6 fields but got ${raw.length}`);
  const patterns = raw.length === 5 ? ["0", ...raw] : raw;
  const executablePatterns = convertExpression(resolved);
  validateFields(patterns, executablePatterns);
}
var daemonPath = resolve3(dirname2(fileURLToPath(import.meta.url)), "daemon.js");
var TaskEmitter2 = class extends EventEmitter2 {
};
var BackgroundScheduledTask = class {
  emitter;
  id;
  name;
  cronExpression;
  taskPath;
  options;
  forkProcess;
  stateMachine;
  logger;
  suppressMissedWarning;
  timeMatcher;
  runCount;
  runCoordinator;
  _lastRun = null;
  executing = false;
  killPending = false;
  pendingKillCleanup;
  currentExecution;
  killRequested = false;
  startPromise;
  constructor(cronExpression, taskPath, options) {
    this.cronExpression = cronExpression;
    this.taskPath = taskPath;
    this.options = options;
    this.id = createID();
    this.name = options?.name || this.id;
    this.emitter = new TaskEmitter2();
    this.stateMachine = new StateMachine("stopped");
    this.timeMatcher = new TimeMatcher(cronExpression, options?.timezone);
    this.runCount = 0;
    this.on("execution:started", (context) => {
      if (context?.execution?.reason === "scheduled")
        this.runCount++;
      this.executing = true;
      this.currentExecution = context?.execution;
    });
    this.on("execution:finished", (context) => {
      this.executing = false;
      this.currentExecution = void 0;
      this.recordLastRun(context.execution);
    });
    this.on("execution:failed", (context) => {
      this.executing = false;
      this.currentExecution = void 0;
      this.recordLastRun(context.execution);
    });
    this.logger = options?.logger || logger;
    this.suppressMissedWarning = options?.suppressMissedWarning || false;
    this.runCoordinator = options?.distributed ? resolveRunCoordinator(options?.runCoordinator) : void 0;
    this.on("task:stopped", () => {
      this.killForkWhenSettled();
      if (this.stateMachine.state !== "destroyed") {
        this.stateMachine.changeState("stopped");
      }
    });
    this.on("task:destroyed", () => {
      this.killForkWhenSettled();
      this.stateMachine.changeState("destroyed");
    });
  }
  getNextRun() {
    if (this.stateMachine.state !== "stopped") {
      return this.timeMatcher.getNextMatch(/* @__PURE__ */ new Date());
    }
    return null;
  }
  getNextRuns(count) {
    const runs = [];
    let from = /* @__PURE__ */ new Date();
    for (let i = 0; i < count; i++) {
      from = this.timeMatcher.getNextMatch(from);
      runs.push(from);
    }
    return runs;
  }
  match(date) {
    return this.timeMatcher.match(date);
  }
  msToNext() {
    const next = this.getNextRun();
    return next ? next.getTime() - Date.now() : null;
  }
  isBusy() {
    return this.getStatus() === "running";
  }
  runsLeft() {
    if (this.options?.maxExecutions == null)
      return void 0;
    return Math.max(0, this.options.maxExecutions - this.runCount);
  }
  getPattern() {
    return this.cronExpression;
  }
  lastRun() {
    return this._lastRun;
  }
  recordLastRun(execution) {
    if (!execution)
      return;
    const raw = execution.finishedAt ?? execution.startedAt;
    const date = raw ? new Date(raw) : /* @__PURE__ */ new Date();
    const lastRun = { date };
    if (execution.error) {
      lastRun.error = execution.error;
    } else {
      lastRun.result = execution.result;
    }
    this._lastRun = lastRun;
  }
  killForkWhenSettled() {
    if (!this.forkProcess)
      return;
    if (!this.executing) {
      this.killFork();
      return;
    }
    if (this.killPending)
      return;
    this.killPending = true;
    const onSettled = () => this.killFork();
    this.once("execution:finished", onSettled);
    this.once("execution:failed", onSettled);
    this.pendingKillCleanup = () => {
      this.off("execution:finished", onSettled);
      this.off("execution:failed", onSettled);
    };
  }
  clearPendingKillWait() {
    this.pendingKillCleanup?.();
    this.pendingKillCleanup = void 0;
    this.killPending = false;
  }
  killFork() {
    this.clearPendingKillWait();
    this.killRequested = true;
    this.forkProcess?.kill();
    this.forkProcess = void 0;
  }
  handleUnexpectedExit(code, signal) {
    this.clearPendingKillWait();
    const erro = new Error(`daemon exited unexpectedly (code ${code}, signal ${signal})`);
    this.logger.error(erro);
    if (this.executing) {
      const execution = { id: createID(), reason: "scheduled", ...this.currentExecution, error: erro, finishedAt: /* @__PURE__ */ new Date() };
      this.emitter.emit("execution:failed", this.createContext(/* @__PURE__ */ new Date(), execution));
    }
    try {
      this.stateMachine.changeState("stopped");
    } catch (err) {
      this.logger.error(err);
    }
    const context = this.createContext(/* @__PURE__ */ new Date());
    context.error = erro;
    this.emitter.emit("task:failed", context);
    this.forkProcess = void 0;
  }
  start() {
    if (this.stateMachine.state === "destroyed") {
      return Promise.resolve();
    }
    if (this.startPromise) {
      return this.startPromise;
    }
    if (this.forkProcess) {
      return Promise.resolve();
    }
    this.startPromise = this.forkAndStart().finally(() => {
      this.startPromise = void 0;
    });
    return this.startPromise;
  }
  forkAndStart() {
    return new Promise((resolve5, reject) => {
      const startTimeout = this.options?.startTimeout ?? 5e3;
      const failStart = (error) => {
        clearTimeout(timeout);
        this.killFork();
        reject(error);
      };
      const timeout = setTimeout(() => {
        failStart(new Error(`Start operation timed out after ${startTimeout}ms. The background task file may have failed to load or taken too long to import; verify it runs on its own and consider increasing the \`startTimeout\` option.`));
      }, startTimeout);
      this.killRequested = false;
      let startSucceeded = false;
      try {
        this.forkProcess = fork(daemonPath);
        this.forkProcess.on("error", (err) => {
          failStart(new Error(`Error on daemon: ${err.message}`));
        });
        this.forkProcess.on("exit", (code, signal) => {
          if (this.killRequested) {
            this.killRequested = false;
            return;
          }
          if (code !== 0 && signal !== "SIGTERM") {
            if (startSucceeded) {
              this.handleUnexpectedExit(code, signal);
              return;
            }
            const erro = new Error(`node-cron daemon exited with code ${code || signal}`);
            this.logger.error(erro);
            failStart(erro);
          }
        });
        this.forkProcess.on("message", (message2) => {
          if (message2.type === "coordinator:shouldRun") {
            void this.handleShouldRun(message2);
            return;
          }
          if (message2.type === "coordinator:complete") {
            this.runCoordinator?.onComplete?.(message2.key)?.catch?.((err) => this.logger.error("Run coordinator onComplete failed", err));
            return;
          }
          if (message2.event === "daemon:error") {
            failStart(message2.jsonError ? deserializeError(message2.jsonError) : new Error("Background task failed to start"));
            return;
          }
          if (message2.jsonError) {
            if (message2.context?.execution) {
              message2.context.execution.error = deserializeError(message2.jsonError);
              delete message2.jsonError;
            }
          }
          if (message2.context?.task?.state) {
            this.stateMachine.changeState(message2.context?.task?.state);
          }
          if (message2.context) {
            const execution = message2.context?.execution;
            delete execution?.hasError;
            const context = this.createContext(new Date(message2.context.date), execution, message2.context.reason);
            this.logEvent(message2.event, context);
            this.emitter.emit(message2.event, context);
          }
        });
        this.once("task:started", () => {
          startSucceeded = true;
          this.stateMachine.changeState("idle");
          clearTimeout(timeout);
          resolve5(void 0);
        });
        this.forkProcess.send({
          command: "task:start",
          path: this.taskPath,
          cron: this.cronExpression,
          options: serializableOptions(this.options)
        });
      } catch (error) {
        failStart(error);
      }
    });
  }
  stop() {
    return new Promise((resolve5, reject) => {
      if (this.stateMachine.state === "destroyed") {
        return resolve5(void 0);
      }
      if (!this.forkProcess) {
        this.emitter.emit("task:stopped");
        return resolve5(void 0);
      }
      const timeoutId = setTimeout(() => {
        clearTimeout(timeoutId);
        this.killFork();
        reject(new Error("Stop operation timed out"));
      }, 5e3);
      const cleanupAndResolve = () => {
        clearTimeout(timeoutId);
        this.off("task:stopped", onStopped);
        resolve5(void 0);
      };
      const onStopped = () => {
        cleanupAndResolve();
      };
      this.once("task:stopped", onStopped);
      this.forkProcess.send({
        command: "task:stop"
      });
    });
  }
  getStatus() {
    return this.stateMachine.state;
  }
  unref() {
    if (!this.forkProcess)
      return;
    this.forkProcess.unref();
    this.forkProcess.channel?.unref();
  }
  ref() {
    if (!this.forkProcess)
      return;
    this.forkProcess.ref();
    this.forkProcess.channel?.ref();
  }
  destroy() {
    return new Promise((resolve5, reject) => {
      if (this.stateMachine.state === "destroyed") {
        return resolve5(void 0);
      }
      if (!this.forkProcess) {
        this.emitter.emit("task:destroyed");
        return resolve5(void 0);
      }
      const timeoutId = setTimeout(() => {
        clearTimeout(timeoutId);
        this.killFork();
        reject(new Error("Destroy operation timed out"));
      }, 5e3);
      const onDestroy = () => {
        clearTimeout(timeoutId);
        this.off("task:destroyed", onDestroy);
        resolve5(void 0);
      };
      this.once("task:destroyed", onDestroy);
      this.forkProcess.send({
        command: "task:destroy"
      });
    });
  }
  execute() {
    return new Promise((resolve5, reject) => {
      if (!this.forkProcess) {
        return reject(new Error("Cannot execute background task because it hasn't been started yet. Please initialize the task using the start() method before attempting to execute it."));
      }
      const executionId = createID();
      let timeoutId;
      if (typeof this.options?.executeTimeout === "number") {
        timeoutId = setTimeout(() => {
          cleanupListeners();
          reject(new Error("Execution timeout exceeded"));
        }, this.options.executeTimeout);
      }
      const cleanupListeners = () => {
        if (timeoutId)
          clearTimeout(timeoutId);
        this.off("execution:finished", onFinished);
        this.off("execution:failed", onFail);
      };
      const onFinished = (context) => {
        if (context.execution?.id !== executionId)
          return;
        cleanupListeners();
        resolve5(context.execution?.result);
      };
      const onFail = (context) => {
        if (context.execution?.id !== executionId)
          return;
        cleanupListeners();
        reject(context.execution?.error || new Error("Execution failed without specific error"));
      };
      this.on("execution:finished", onFinished);
      this.on("execution:failed", onFail);
      this.forkProcess.send({
        command: "task:execute",
        executionId
      });
    });
  }
  async handleShouldRun(message2) {
    let allowed = false;
    let error;
    try {
      allowed = this.runCoordinator ? await this.runCoordinator.shouldRun(message2.key, message2.ttlMs) : false;
    } catch (err) {
      error = err?.message ?? String(err);
    }
    this.forkProcess?.send({ type: "coordinator:result", reqId: message2.reqId, allowed, error });
  }
  on(event, fun) {
    this.emitter.on(event, fun);
  }
  off(event, fun) {
    this.emitter.off(event, fun);
  }
  once(event, fun) {
    this.emitter.once(event, fun);
  }
  logEvent(event, context) {
    switch (event) {
      case "execution:missed": {
        const handled = this.emitter.listenerCount("execution:missed") > 0;
        if (!this.suppressMissedWarning && !handled) {
          this.logger.warn(`missed execution at ${context.date}! Possible blocking IO or high CPU user at the same process used by node-cron.`);
        }
        break;
      }
      case "execution:overlap":
        if (this.options?.noOverlap) {
          this.logger.warn("task still running, new execution blocked by overlap prevention!");
        }
        break;
      case "execution:failed":
        if (context.execution?.error) {
          this.logger.error(context.execution.error);
        }
        break;
    }
  }
  createContext(executionDate, execution, reason) {
    const localTime = new LocalizedTime(executionDate, this.options?.timezone);
    const ctx = {
      date: localTime.toDate(),
      dateLocalIso: localTime.toISO(),
      triggeredAt: /* @__PURE__ */ new Date(),
      task: this,
      execution
    };
    if (reason)
      ctx.reason = reason;
    return ctx;
  }
};
function serializableOptions(options) {
  if (!options)
    return options;
  const { logger: _logger, runCoordinator: _runCoordinator, ...rest } = options;
  return rest;
}
function deserializeError(str) {
  const data = JSON.parse(str);
  const Err = globalThis[data.name] || Error;
  const err = new Err(data.message);
  if (data.stack) {
    err.stack = data.stack;
  }
  Object.keys(data).forEach((key2) => {
    if (!["name", "message", "stack"].includes(key2)) {
      err[key2] = data[key2];
    }
  });
  return err;
}
var moduleFilename = fileURLToPath(import.meta.url);
var registry = new TaskRegistry();
function schedule(expression, func, options) {
  const task = createTask(expression, func, options);
  let started;
  try {
    started = task.start();
  } catch (error) {
    registry.remove(task);
    throw error;
  }
  if (started && typeof started.catch === "function") {
    started.catch((error) => {
      (options?.logger || logger).error(`Failed to start scheduled task: ${error?.message ?? error}`);
    });
  }
  return task;
}
function createTask(expression, func, options) {
  parse$1(expression);
  if (options?.distributed && !options.name) {
    throw new Error("`distributed` requires a `name` (it forms the coordination key shared across instances).");
  }
  let task;
  if (func instanceof Function) {
    task = new InlineScheduledTask(expression, func, options);
  } else {
    const taskPath = solvePath(func);
    task = new BackgroundScheduledTask(expression, taskPath, options);
  }
  registry.add(task);
  return task;
}
function solvePath(filePath) {
  if (path.isAbsolute(filePath))
    return pathToFileURL(filePath).href;
  if (filePath.startsWith("file://"))
    return filePath;
  const stackLines = new Error().stack?.split("\n");
  if (stackLines) {
    stackLines?.shift();
    const callerLine = stackLines?.find((line) => {
      return line.indexOf(moduleFilename) === -1;
    });
    const match = callerLine?.match(/(file:\/\/)?(((\/?)(\w:))?([/\\].+)):\d+:\d+/);
    if (match) {
      const dir = `${match[5] ?? ""}${path.dirname(match[6])}`;
      return pathToFileURL(path.resolve(dir, filePath)).href;
    }
  }
  throw new Error(`Could not locate task file ${filePath}`);
}
function validate(expression) {
  try {
    validate$1(expression);
    return true;
  } catch (e) {
    return false;
  }
}
var validateDetailed = validateDetailed$1;
var parse = parse$1;
async function shutdown(timeout = 5e3) {
  const tasks2 = registry.all();
  const pending = [];
  for (const task of tasks2.values()) {
    const wait = new Promise((resolve5) => {
      const onSettled = () => {
        task.off("execution:finished", onSettled);
        task.off("execution:failed", onSettled);
        resolve5();
      };
      task.once("execution:finished", onSettled);
      task.once("execution:failed", onSettled);
    });
    const busy = task.isBusy();
    Promise.resolve(task.stop()).catch((error) => {
      logger.error(`Error stopping task "${task.name}" during shutdown: ${error?.message ?? error}`);
    });
    if (busy) {
      pending.push(wait);
    }
  }
  if (pending.length) {
    await Promise.race([
      Promise.allSettled(pending),
      new Promise((r) => setTimeout(r, timeout))
    ]);
  }
  for (const task of tasks2.values()) {
    Promise.resolve(task.destroy()).catch((error) => {
      logger.error(`Error destroying task "${task.name}" during shutdown: ${error?.message ?? error}`);
    });
  }
}
var getTasks = registry.all;
var getTask = registry.get;
var nodeCron = {
  schedule,
  createTask,
  validate,
  validateDetailed,
  parse,
  getTasks,
  getTask,
  setLogger,
  setRunCoordinator,
  shutdown
};

// jobs/sync-scheduler.ts
var isSyncRunning = false;
function startSyncScheduler(db2, sourceOverride) {
  console.log("[Sync Scheduler] Initializing automatic 5-minute Chess-Results sync scheduler...");
  nodeCron.schedule("*/5 * * * *", async () => {
    if (isSyncRunning) {
      console.log("[Sync Scheduler] Previous sync cycle still running, skipping...");
      return;
    }
    isSyncRunning = true;
    try {
      await runAutoSyncCycle(db2, sourceOverride);
    } catch (err) {
      console.error("[Sync Scheduler] Error in auto sync cycle:", err);
    } finally {
      isSyncRunning = false;
    }
  });
  setTimeout(() => {
    runAutoSyncCycle(db2, sourceOverride).catch((e) => console.error("[Sync Scheduler] Initial check error:", e));
  }, 1e4);
}
async function runAutoSyncCycle(db2, sourceOverride) {
  try {
    let rows = [];
    try {
      const res = await db2.prepare("SELECT payload, published, auto_sync, sync_interval, last_sync, next_sync FROM tournaments").all();
      rows = res.results || [];
    } catch {
      const res = await db2.prepare("SELECT payload, published FROM tournaments").all();
      rows = res.results || [];
    }
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    for (const r of rows) {
      let t;
      try {
        t = JSON.parse(r.payload);
      } catch {
        continue;
      }
      const published = r.published !== void 0 && r.published !== null ? !!r.published : !!t.published;
      if (!published) continue;
      const autoSync = r.auto_sync !== void 0 && r.auto_sync !== null ? !!r.auto_sync : t.autoSync ?? t.auto_sync ?? true;
      if (!autoSync) continue;
      const interval = r.sync_interval ? Number(r.sync_interval) : t.syncInterval ?? t.sync_interval ?? 5;
      const lastSyncStr = r.last_sync || t.lastSync || t.last_sync || null;
      const lastSyncTime = lastSyncStr ? new Date(lastSyncStr).getTime() : 0;
      const intervalMs = interval * 60 * 1e3;
      if (lastSyncTime > 0 && now - lastSyncTime < intervalMs - 3e4) {
        continue;
      }
      console.log(`[AUTO SYNC DEBUG] AUTO SYNC START:
time: ${nowIso}
tournament: ${t.name} (${t.id})`);
      try {
        const fetcher = sourceOverride?.tournament ? sourceOverride.tournament : importTournament;
        const updatedTour = await fetcher(t.source, t.group);
        updatedTour.name = t.name;
        updatedTour.published = true;
        updatedTour.info = t.info;
        updatedTour.prizes = t.prizes;
        const nextSyncIso = new Date(now + intervalMs).toISOString();
        updatedTour.autoSync = true;
        updatedTour.auto_sync = true;
        updatedTour.syncInterval = interval;
        updatedTour.sync_interval = interval;
        updatedTour.lastSync = nowIso;
        updatedTour.last_sync = nowIso;
        updatedTour.nextSync = nextSyncIso;
        updatedTour.next_sync = nextSyncIso;
        const payloadStr = JSON.stringify(updatedTour);
        try {
          await db2.prepare("UPDATE tournaments SET payload = ?, updated = ?, auto_sync = 1, sync_interval = ?, last_sync = ?, next_sync = ? WHERE id = ?").bind(payloadStr, updatedTour.updated, interval, nowIso, nextSyncIso, t.id).run();
        } catch {
          await db2.prepare("UPDATE tournaments SET payload = ?, updated = ? WHERE id = ?").bind(payloadStr, updatedTour.updated, t.id).run();
        }
        try {
          const logId = crypto.randomUUID();
          await db2.prepare(`
            INSERT INTO sync_logs (id, tournament_id, tournament_name, url, created_at, status, players_updated, message)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            logId,
            t.id,
            t.name,
            t.source,
            nowIso,
            "success",
            updatedTour.players ? updatedTour.players.length : 0,
            `T\u1EF1 \u0111\u1ED9ng \u0111\u1ED3ng b\u1ED9 th\xE0nh c\xF4ng t\u1EEB Chess-Results: ${t.name} (${updatedTour.players ? updatedTour.players.length : 0} k\u1EF3 th\u1EE7)`
          ).run();
        } catch (logErr) {
          console.error("[Sync Scheduler] Failed to write sync log:", logErr);
        }
        console.log(`[AUTO SYNC DEBUG] AUTO SYNC FINISH:
time: ${(/* @__PURE__ */ new Date()).toISOString()}
updated: ${updatedTour.players?.length || 0}`);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[Sync Scheduler] Error auto syncing "${t.name}":`, errMsg);
        try {
          const logId = crypto.randomUUID();
          await db2.prepare(`
            INSERT INTO sync_logs (id, tournament_id, tournament_name, url, created_at, status, players_updated, message)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            logId,
            t.id,
            t.name,
            t.source,
            nowIso,
            "failed",
            0,
            `L\u1ED7i t\u1EF1 \u0111\u1ED9ng \u0111\u1ED3ng b\u1ED9: ${errMsg}`
          ).run();
        } catch {
        }
      }
    }
  } catch (err) {
    console.error("[Sync Scheduler] Error in runAutoSyncCycle:", err);
  }
}

// server.ts
var root = resolve4(dirname3(fileURLToPath2(import.meta.url)), "..");
var port = Number(process.env.PORT || 3e3);
var host = process.env.HOST || "0.0.0.0";
var publicOrigin = process.env.PUBLIC_ORIGIN ? new URL(process.env.PUBLIC_ORIGIN).origin : null;
var dbUrl = process.env.DATABASE_URL;
var dbPath = dbUrl || resolve4(root, process.env.DATA_DIR || "data", "chess.sqlite");
var db = openDatabase(dbPath, resolve4(root, "migrations"));
console.log(`[DB INIT] db_source=${db.source || (dbUrl ? "postgresql" : "sqlite")} (${dbUrl ? "Supabase PostgreSQL" : "SQLite Local"})`);
startSyncScheduler(db);
var api = createApi(db);
var web = resolve4(root, "web");
var types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
  ".ico": "image/x-icon",
  ".json": "application/json"
};
var security = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
  "X-Frame-Options": "SAMEORIGIN",
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; connect-src 'self'; font-src 'self' https://fonts.gstatic.com; object-src 'none'; base-uri 'self'; frame-ancestors 'self'"
};
var server = createServer(async (req, res) => {
  try {
    const requestedHost = req.headers.host || `localhost:${port}`;
    const allowedHosts = /* @__PURE__ */ new Set([`localhost:${port}`, `127.0.0.1:${port}`, `[::1]:${port}`]);
    if (publicOrigin) {
      try {
        allowedHosts.add(new URL(publicOrigin).host);
      } catch {
      }
    }
    const isCloudHost = requestedHost.endsWith(".onrender.com") || requestedHost.endsWith(".railway.app") || requestedHost.endsWith(".vercel.app");
    if (publicOrigin && !allowedHosts.has(requestedHost) && !isCloudHost && process.env.STRICT_HOST_CHECK === "true") {
      if (req.url?.startsWith("/api")) {
        res.writeHead(400, { ...security, "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Host kh\xF4ng h\u1EE3p l\u1EC7. C\u1EA5u h\xECnh PUBLIC_ORIGIN khi d\xF9ng t\xEAn mi\u1EC1n." }));
        return;
      }
      res.writeHead(400, security);
      res.end("Host kh\xF4ng h\u1EE3p l\u1EC7. C\u1EA5u h\xECnh PUBLIC_ORIGIN khi d\xF9ng t\xEAn mi\u1EC1n.");
      return;
    }
    const origin = publicOrigin || `http://${requestedHost}`;
    const url = new URL(req.url || "/", origin);
    if (url.pathname.startsWith("/api/") || url.pathname === "/api") {
      let body;
      if (req.method !== "GET" && req.method !== "HEAD") {
        const chunks = [];
        let n = 0;
        for await (const chunk of req) {
          n += chunk.length;
          if (n > 12e6) {
            res.writeHead(413, { ...security, "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Y\xEAu c\u1EA7u qu\xE1 l\u1EDBn." }));
            return;
          }
          chunks.push(chunk);
        }
        body = Buffer.concat(chunks);
      }
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) if (v) headers.set(k, Array.isArray(v) ? v.join(",") : v);
      const r = await api(new Request(url, { method: req.method, headers, body }), req.socket.remoteAddress || "unknown");
      const outgoing = { ...security, "Content-Type": "application/json" };
      r.headers.forEach((v, k) => {
        outgoing[k] = v;
      });
      const setCookies = r.headers.get("set-cookie");
      if (setCookies) outgoing["set-cookie"] = setCookies;
      res.writeHead(r.status, outgoing);
      res.end(Buffer.from(await r.arrayBuffer()));
      return;
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, security);
      res.end();
      return;
    }
    const path2 = decodeURIComponent(url.pathname);
    if (path2.startsWith("/uploads/")) {
      const candidates = [
        resolve4(web, "." + path2),
        resolve4(root, "web", "." + path2),
        resolve4(root, "public", "." + path2),
        resolve4(process.cwd(), "web", "." + path2),
        resolve4(process.cwd(), "public", "." + path2),
        resolve4(process.cwd(), "." + path2)
      ];
      let fileFound = null;
      for (const cand of candidates) {
        try {
          if ((await stat(cand)).isFile()) {
            fileFound = cand;
            break;
          }
        } catch {
        }
      }
      if (fileFound) {
        const bytes = await readFile(fileFound);
        const ext = extname(fileFound).toLowerCase();
        res.writeHead(200, {
          ...security,
          "Content-Type": types[ext] || "image/webp",
          "Cache-Control": "public, max-age=31536000, immutable"
        });
        res.end(req.method === "HEAD" ? void 0 : bytes);
        return;
      }
    }
    const asset = path2 === "/" || path2 === "/admin" || path2 === "/admin/" ? "index.html" : "." + path2;
    const full = resolve4(web, asset);
    if (!full.startsWith(web + sep)) {
      res.writeHead(403, security);
      res.end();
      return;
    }
    try {
      if (!(await stat(full)).isFile()) throw Error();
      const bytes = await readFile(full);
      res.writeHead(200, {
        ...security,
        "Content-Type": types[extname(full)] || "application/octet-stream",
        "Cache-Control": path2.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache"
      });
      res.end(req.method === "HEAD" ? void 0 : bytes);
    } catch {
      res.writeHead(404, security);
      res.end("Kh\xF4ng t\xECm th\u1EA5y trang.");
    }
  } catch {
    res.writeHead(500, { ...security, "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Kh\xF4ng th\u1EC3 x\u1EED l\xFD y\xEAu c\u1EA7u. Vui l\xF2ng th\u1EED l\u1EA1i." }));
  }
});
server.listen(port, host, () => console.log(`C\u1EDD Vua S\xE0i G\xF2n \u0111ang ch\u1EA1y: ${publicOrigin || `http://localhost:${port}`}
Qu\u1EA3n tr\u1ECB: ${publicOrigin || `http://localhost:${port}`}/admin
Nh\u1EA5n Ctrl+C \u0111\u1EC3 d\u1EEBng.`));
server.on("error", (e) => {
  console.error(e.code === "EADDRINUSE" ? `C\u1ED5ng ${port} \u0111ang \u0111\u01B0\u1EE3c s\u1EED d\u1EE5ng. \u0110\u1ED5i PORT trong CAU-HINH.env r\u1ED3i ch\u1EA1y l\u1EA1i.` : e.message);
  process.exitCode = 1;
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.close(() => {
  db.close();
  process.exit(0);
}));
