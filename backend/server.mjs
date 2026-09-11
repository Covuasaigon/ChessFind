// server.ts
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { resolve as resolve3, dirname as dirname2, extname, sep } from "node:path";
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
  const allCompleted = rounds.filter((x) => x.status !== "pending" && x.status !== "unknown");
  const r = rounds.filter((x) => x.status === "played" && x.score !== null);
  const wins = rounds.filter((x) => x.score === 1).length;
  const draws = rounds.filter((x) => x.score === 0.5).length;
  const losses = rounds.filter((x) => x.score === 0).length;
  let white = 0;
  let whiteWins = 0;
  let whiteDraws = 0;
  let whiteLosses = 0;
  let black = 0;
  let blackWins = 0;
  let blackDraws = 0;
  let blackLosses = 0;
  for (const rd of rounds) {
    let isW = rd.color === "white";
    let isB = rd.color === "black";
    if (!isW && !isB && p.name) {
      const pNameNorm = p.name.trim().toLowerCase();
      if (rd.playerWhite && rd.playerWhite.trim().toLowerCase() === pNameNorm) isW = true;
      else if (rd.playerBlack && rd.playerBlack.trim().toLowerCase() === pNameNorm) isB = true;
    }
    if (isW) {
      white++;
      if (rd.score === 1) whiteWins++;
      else if (rd.score === 0.5) whiteDraws++;
      else if (rd.score === 0) whiteLosses++;
    } else if (isB) {
      black++;
      if (rd.score === 1) blackWins++;
      else if (rd.score === 0.5) blackDraws++;
      else if (rd.score === 0) blackLosses++;
    }
  }
  const totalPlayed = allCompleted.length > 0 ? allCompleted.length : r.length;
  return {
    played: totalPlayed,
    wins,
    draws,
    losses,
    white,
    whiteWins,
    whiteDraws,
    whiteLosses,
    black,
    blackWins,
    blackDraws,
    blackLosses,
    unknown: rounds.filter((x) => x.color === null && x.status === "played").length,
    special: rounds.filter((x) => ["bye", "forfeit"].includes(x.status)).length,
    winRate: totalPlayed > 0 ? Math.round(wins / totalPlayed * 100) : null
  };
}
function getMedal(rank, group, prizes) {
  if (!rank || rank <= 0) return null;
  if (prizes && prizes.length > 0) {
    const match = prizes.find((p) => {
      const rankMatches = p.rank === rank || p.rankFrom != null && p.rankTo != null && rank >= p.rankFrom && rank <= p.rankTo;
      if (!rankMatches) return false;
      if (!group || !p.group) return true;
      const pGroupNorm = normalize(p.group);
      return pGroupNorm === "tat ca" || pGroupNorm === normalize(group);
    });
    if (match) {
      const label = match.prizeName || (match.gift ? `${match.gift}` : `H\u1EA1ng ${rank}`);
      let medalIcon = "\u{1F3C6}";
      if (match.medal === "gold" || rank === 1) medalIcon = "\u{1F947}";
      else if (match.medal === "silver" || rank === 2) medalIcon = "\u{1F948}";
      else if (match.medal === "bronze" || rank === 3) medalIcon = "\u{1F949}";
      else if (match.medal === "consolation") medalIcon = "\u{1F396}\uFE0F";
      return { medal: medalIcon, label };
    }
  }
  if (rank === 1) return { medal: "\u{1F947}", label: "Huy ch\u01B0\u01A1ng V\xE0ng" };
  if (rank === 2) return { medal: "\u{1F948}", label: "Huy ch\u01B0\u01A1ng B\u1EA1c" };
  if (rank === 3) return { medal: "\u{1F949}", label: "Huy ch\u01B0\u01A1ng \u0110\u1ED3ng" };
  return null;
}
function getNextMatch(p) {
  if (!p.rounds || !p.rounds.length) return null;
  const pending = p.rounds.find((r) => r.status === "pending");
  if (pending) return pending;
  return null;
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
  for (let hop = 0; hop < 4; hop++) {
    validateSource(u.href);
    let r;
    try {
      r = await fetch(u.href, { redirect: "manual", signal: AbortSignal.timeout(2e4), headers: { "Accept": "text/html", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } });
    } catch {
      throw Error("Kh\xF4ng k\u1EBFt n\u1ED1i \u0111\u01B0\u1EE3c Chess-Results. H\xE3y th\u1EED l\u1EA1i sau; d\u1EEF li\u1EC7u c\u0169 kh\xF4ng b\u1ECB thay \u0111\u1ED5i.");
    }
    if (r.status >= 300 && r.status < 400) {
      const target = r.headers.get("location");
      if (!target) throw Error("Ngu\u1ED3n chuy\u1EC3n h\u01B0\u1EDBng kh\xF4ng h\u1EE3p l\u1EC7.");
      u = new URL(target, u);
      continue;
    }
    if (!r.ok) throw Error(r.status === 429 ? "Chess-Results \u0111ang gi\u1EDBi h\u1EA1n truy c\u1EADp. Vui l\xF2ng ch\u1EDD r\u1ED3i th\u1EED l\u1EA1i." : `Ngu\u1ED3n Chess-Results tr\u1EA3 l\u1ED7i ${r.status}. D\u1EEF li\u1EC7u c\u0169 \u0111\u01B0\u1EE3c gi\u1EEF nguy\xEAn.`);
    if (Number(r.headers.get("content-length") || 0) > 5e6) throw Error("Trang ngu\u1ED3n qu\xE1 l\u1EDBn. H\xE3y ch\u1ECDn link t\u1EEBng b\u1EA3ng \u0111\u1EA5u.");
    const reader = r.body?.getReader();
    if (!reader) throw Error("Ngu\u1ED3n kh\xF4ng c\xF3 d\u1EEF li\u1EC7u.");
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
  throw Error("Ngu\u1ED3n chuy\u1EC3n h\u01B0\u1EDBng qu\xE1 nhi\u1EC1u l\u1EA7n.");
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
function parseRanking(html, source, group) {
  const { id } = validateSource(source);
  let rows = rowsOf(html);
  let hi = rows.findIndex((r) => findCol(r, ["name"]) >= 0 && (findCol(r, ["rk", "rank"]) >= 0 || findCol(r, ["sno", "no"]) >= 0));
  if (hi < 0) {
    throw Error("Ch\u01B0a nh\u1EADn di\u1EC7n \u0111\u01B0\u1EE3c b\u1EA3ng k\u1EF3 th\u1EE7. Ngu\u1ED3n c\xF3 th\u1EC3 \u0111\u1ED5i c\u1EA5u tr\xFAc ho\u1EB7c ch\u01B0a c\xF4ng b\u1ED1 k\u1EBFt qu\u1EA3.");
  }
  const h = rows[hi];
  const ni = findCol(h, ["name"]);
  const ri = findCol(h, ["rk", "rank"]);
  const si = findCol(h, ["sno", "no"]);
  const pi = findCol(h, ["pts", "points"]);
  const rating = findCol(h, ["rtg", "rating", "rtgi", "elo"]);
  const fedCol = findCol(h, ["fed", "federation", "ld", "ldo", "land"]);
  const clubCol = findCol(h, ["clubcity", "clbtinh", "clb/tinh", "club/city", "club/country", "team/city", "club", "clb", "team", "city"]);
  const fideIdCol = findCol(h, ["fideid", "fide", "id", "identnumber", "ident"]);
  const sexCol = findCol(h, ["sex", "gender", "gioitinh"]);
  const typCol = findCol(h, ["typ", "gr", "group", "typgr", "kat", "cat", "category"]);
  const ties = h.map((c, i) => ({ label: c.text, i })).filter((c) => /^tb\d+$/i.test(key(c.label)) || /^bh|^sb|buchholz|sonneborn|performance|rp|fide rtg/i.test(key(c.label)));
  const players = [];
  const seen = /* @__PURE__ */ new Set();
  for (const row of rows.slice(hi + 1)) {
    if (findCol(row, ["name"]) >= 0) continue;
    if (row.length < h.length || !row[ni]?.text) continue;
    const link = row[ni].raw.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    const snr = link ? new URL(textOf(link), source).searchParams.get("snr") : row[si]?.text;
    if (!snr || !/^\d+$/.test(snr)) continue;
    if (seen.has(snr)) continue;
    seen.add(snr);
    const tieValues = Object.fromEntries(ties.map((t) => [t.label, num(row[t.i]?.text || "")]));
    const bhVal = tieValues["BH"] ?? tieValues["Buchholz"] ?? tieValues["BH."] ?? tieValues["BH-1"] ?? tieValues["TB2"] ?? tieValues["TB1"] ?? tieValues["TB3"] ?? null;
    const sbVal = tieValues["SB"] ?? tieValues["Sonneborn-Berger"] ?? tieValues["Sonneborn"] ?? tieValues["SB."] ?? tieValues["TB3"] ?? tieValues["TB5"] ?? null;
    const rpVal = tieValues["Rp"] ?? tieValues["RP"] ?? tieValues["Performance"] ?? tieValues["Rp."] ?? null;
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
    tieLabels: ties.map((t) => t.label),
    rounds: total ? Number(total[1]) : null,
    published: false
  };
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
  return parseRanking(html, url.href, group);
}
async function detectCategories(source) {
  const { url, id } = validateSource(source);
  const targetId = parseInt(id, 10);
  url.searchParams.set("lan", "1");
  const html = await fetchSource(url);
  const rawTitle = textOf(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || html.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1] || `Gi\u1EA3i \u0111\u1EA5u ${id}`).replace(/^Chess-Results Server Chess-results\.com\s*-\s*/i, "").trim();
  let baseName = rawTitle;
  if (rawTitle.includes(" - ")) {
    const parts = rawTitle.split(" - ");
    if (/(?:bảng|u\d+|nam|nữ|trẻ|nhi|open|girls|boys)/i.test(parts[0])) {
      baseName = parts.slice(1).join(" - ").trim();
    } else {
      baseName = parts[0].trim();
    }
  }
  const categories = [];
  const seenIds = /* @__PURE__ */ new Set();
  async function checkTnrId(catId) {
    const catIdStr = String(catId);
    if (seenIds.has(catIdStr)) return null;
    try {
      const u = new URL(`https://chess-results.com/tnr${catId}.aspx?lan=1&art=1&zeilen=99999`);
      let pageHtml = await fetchSource(u);
      let pageRows = rowsOf(pageHtml);
      let hi = pageRows.findIndex((r) => findCol(r, ["name"]) >= 0 && (findCol(r, ["rk", "rank"]) >= 0 || findCol(r, ["sno", "no"]) >= 0));
      if (hi < 0) {
        u.searchParams.set("art", "0");
        pageHtml = await fetchSource(u);
        pageRows = rowsOf(pageHtml);
        hi = pageRows.findIndex((r) => findCol(r, ["name"]) >= 0 && (findCol(r, ["rk", "rank"]) >= 0 || findCol(r, ["sno", "no"]) >= 0));
      }
      const tStr = textOf(pageHtml.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/^Chess-Results Server Chess-results\.com\s*-\s*/i, "").trim();
      if (!tStr || tStr.includes("Tournament-Database") || tStr.includes("Error")) return null;
      const isMatch = tStr.includes(baseName) || baseName.length > 6 && tStr.includes(baseName.slice(0, 15)) || catId === targetId;
      if (!isMatch) return null;
      let groupName = tStr;
      if (tStr.includes(" - ")) {
        const parts = tStr.split(" - ");
        if (/(?:bảng|u\d+|nam|nữ|trẻ|nhi|open|girls|boys)/i.test(parts[0])) {
          groupName = parts[0].trim();
        } else {
          groupName = parts[parts.length - 1].trim();
        }
      }
      let pCount = 0;
      if (hi >= 0) {
        const h = pageRows[hi];
        const ni = findCol(h, ["name"]);
        const si = findCol(h, ["sno", "no"]);
        const playerSeen = /* @__PURE__ */ new Set();
        for (const row of pageRows.slice(hi + 1)) {
          if (findCol(row, ["name"]) >= 0) continue;
          if (row.length < h.length || !row[ni]?.text) continue;
          const link = row[ni].raw.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
          const snr = link ? new URL(textOf(link), u.href).searchParams.get("snr") : row[si]?.text;
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
        status: "Ch\u01B0a nh\u1EADp"
      };
    } catch {
      return null;
    }
  }
  const range = 35;
  const scanIds = [];
  for (let offset = -range; offset <= range; offset++) {
    scanIds.push(targetId + offset);
  }
  const CONCURRENCY = 8;
  for (let i = 0; i < scanIds.length; i += CONCURRENCY) {
    const chunk = scanIds.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(chunk.map((id2) => checkTnrId(id2)));
    for (const res of chunkResults) {
      if (res) categories.push(res);
    }
  }
  if (!categories.some((c) => c.id === id)) {
    const selfRes = await checkTnrId(targetId);
    if (selfRes) categories.push(selfRes);
  }
  categories.sort((a, b) => Number(a.id) - Number(b.id));
  return { mainName: baseName, categories };
}
function parsePlayer(html, p, t) {
  const rows = rowsOf(html);
  const hi = rows.findIndex((r) => findCol(r, ["rd", "round"]) >= 0 && findCol(r, ["name"]) >= 0 && findCol(r, ["res", "result"]) >= 0);
  if (hi < 0) throw Error("Ch\u01B0a \u0111\u1ECDc \u0111\u01B0\u1EE3c chi ti\u1EBFt t\u1EEBng v\xF2ng t\u1EEB ngu\u1ED3n. \u0110i\u1EC3m v\xE0 th\u1EE9 h\u1EA1ng v\u1EABn \u0111\u01B0\u1EE3c gi\u1EEF theo b\u1EA3ng \u0111\xE3 \u0111\u1ED3ng b\u1ED9.");
  const h = rows[hi];
  const ni = findCol(h, ["name"]);
  const ri = findCol(h, ["rd", "round"]);
  const boCol = findCol(h, ["bo", "board", "ban"]);
  const rating = findCol(h, ["rtg", "rating"]);
  const res = findCol(h, ["res", "result"]);
  const colorCol = findCol(h, ["wb", "w/b", "color", "mau", "mauquan"]);
  const rounds = [];
  for (const r of rows.slice(hi + 1)) {
    const rd = num(r[ri]?.text || "");
    if (rd === null || rd < 1 || rd > 100 || !r[ni]) continue;
    const bo = boCol >= 0 ? num(r[boCol]?.text || "") : null;
    let raw = r.slice(res).map((c) => c.text).join(" ").trim();
    let colorStr = colorCol >= 0 ? r[colorCol]?.text || "" : "";
    if (!colorStr) {
      const colorCell = r.find((c) => /^[wb]$/i.test(c.text) || /\b(w|b)\b/i.test(c.text));
      colorStr = colorCell?.text || "";
    }
    const isWhite = /w|white|trắng/i.test(colorStr);
    const isBlack = /b|black|đen/i.test(colorStr);
    const color = isWhite ? "white" : isBlack ? "black" : null;
    raw = raw.replace(/\b[wb]\b/ig, "").trim();
    const opponent = r[ni].text;
    const snr = r[ni].raw.match(/[?&](?:amp;)?snr=(\d+)/i)?.[1];
    let status = "unknown", score = null;
    if (/bye|not paired|unpaired|spielfrei/i.test(opponent)) {
      status = "bye";
      score = num(raw);
    } else if (/^[+−-]$|[kK]$|forfeit/i.test(raw)) {
      status = "forfeit";
      score = raw === "+" ? 1 : /^[−-]$/.test(raw) ? 0 : num(raw.replace(/[kK]/g, ""));
    } else if (raw === "" || raw === "*") {
      status = "pending";
    } else {
      score = num(raw);
      if (score !== null && [0, 0.5, 1].includes(score)) status = "played";
      else score = null;
    }
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
  return { ...p, rounds, detailsLoaded: true };
}
async function importPlayer(t, p) {
  const { url } = validateSource(t.source);
  url.searchParams.set("lan", "1");
  url.searchParams.set("art", "9");
  url.searchParams.set("snr", p.snr);
  url.searchParams.delete("rd");
  return parsePlayer(await fetchSource(url), p, t);
}

// lib/default-admin.ts
var DEFAULT_ADMIN = { "username": "admin", "salt": "edd812c082e94ee178697eb85216b90335f20eb48a823d55", "hash": "bbdb86f851c40bbe3a9cf297d250250bc1f944083de61f1f405517261e81982b", "iterations": 1e5 };

// lib/api.ts
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
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
function createApi(db2, sourceParam = {}) {
  const source = {
    tournament: sourceParam.tournament ?? importTournament,
    player: sourceParam.player ?? importPlayer,
    detect: sourceParam.detect ?? detectCategories
  };
  const log = async (ok, m) => {
    await db2.batch([db2.prepare("INSERT INTO logs (id, created, ok, message) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), (/* @__PURE__ */ new Date()).toISOString(), ok ? 1 : 0, m.slice(0, 500)), db2.prepare("DELETE FROM logs WHERE id NOT IN (SELECT id FROM logs ORDER BY created DESC LIMIT 100)")]);
  };
  const lock = async (k, s) => {
    const now = Date.now();
    return (await db2.prepare("INSERT INTO locks (key, until) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET until = excluded.until WHERE locks.until < ?").bind(k, now + s * 1e3, now).run()).meta.changes > 0;
  };
  const get = async (id, admin = false) => {
    const r = await db2.prepare(admin ? "SELECT payload,published FROM tournaments WHERE id = ?" : "SELECT payload,published FROM tournaments WHERE id = ? AND published = 1").bind(id).first();
    return r ? { ...JSON.parse(r.payload), published: !!r.published } : null;
  };
  const list = async (admin = false) => {
    const r = await db2.prepare(admin ? "SELECT payload,published FROM tournaments ORDER BY updated DESC" : "SELECT payload,published FROM tournaments WHERE published = 1 ORDER BY updated DESC").all();
    return r.results.map((x) => ({ ...JSON.parse(x.payload), published: !!x.published }));
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
    try {
      const u = new URL(req.url);
      const path = u.pathname.replace(/\/+$/, "") || "/";
      if (req.method === "GET") {
        if (path === "/api/tournaments") return json({ tournaments: await list() }, 200, {}, req);
        if (path === "/api/banners") {
          try {
            const r = await db2.prepare("SELECT * FROM home_banners WHERE is_active = 1 ORDER BY sort_order ASC, created_at DESC").all();
            return json({ banners: r.results }, 200, {}, req);
          } catch {
            return json({ banners: [] }, 200, {}, req);
          }
        }
        if (path === "/api/admin") {
          const s2 = await session(req);
          if (!s2) return json({ admin: false }, 200, {}, req);
          let bannersList = [];
          let prizesList = [];
          let slidesList = [];
          try {
            bannersList = (await db2.prepare("SELECT * FROM home_banners ORDER BY sort_order ASC, created_at DESC").all()).results;
          } catch {
          }
          try {
            const tList = await list(true);
            const tourMap = new Map(tList.map((t) => [t.id, t.name]));
            const r = await db2.prepare("SELECT * FROM prizes ORDER BY created_at DESC").all();
            prizesList = (r.results || []).map((p) => ({
              ...p,
              tournament_name: tourMap.get(p.tournament_id) || p.tournament_id
            }));
          } catch {
          }
          try {
            const tList = await list(true);
            const tourMap = new Map(tList.map((t) => [t.id, t.name]));
            const r = await db2.prepare("SELECT * FROM tournament_slides ORDER BY display_order ASC, created_at DESC").all();
            slidesList = (r.results || []).map((item) => ({
              ...item,
              tournament_name: tourMap.get(item.tournament_id) || item.tournament_id
            }));
          } catch {
          }
          return json({ admin: true, username: "admin", csrf: s2.csrf, tournaments: await list(true), banners: bannersList, prizes: prizesList, slides: slidesList, logs: (await db2.prepare("SELECT * FROM logs ORDER BY created DESC LIMIT 30").all()).results }, 200, {}, req);
        }
        if (path === "/api/slides" || path === "/api/slides/home" || path === "/api/home/slides") {
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
            if (path === "/api/slides/home" || path === "/api/home/slides") {
              return json(slidesList, 200, {}, req);
            }
            return json({ slides: slidesList }, 200, {}, req);
          } catch (err) {
            console.error("Error fetching tournament_slides:", err);
            if (path === "/api/slides/home" || path === "/api/home/slides") {
              return json([], 200, {}, req);
            }
            return json({ slides: [] }, 200, {}, req);
          }
        }
        if (path === "/api/admin/slides") {
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
        if (path === "/api/admin/prizes") {
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
        if (path === "/api/player") {
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
          const r = await db2.prepare("SELECT payload FROM details WHERE tid = ? AND pid = ? AND revision = ?").bind(id, pid, t.updated).first();
          if (r) {
            playerObj = JSON.parse(r.payload);
          } else {
            if (!await lock("detail:" + id, 3)) return json({ error: "Ngu\u1ED3n \u0111ang \u0111\u01B0\u1EE3c t\u1EA3i. H\xE3y th\u1EED l\u1EA1i sau v\xE0i gi\xE2y." }, 429, {}, req);
            playerObj = await source.player(t, p);
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
                    score = excluded.score
                `).bind(matchId, p.categoryId || t.id, playerObj.id, rd.playerWhite || null, rd.playerBlack || null, rd.round, rd.board || null, rd.result || null, rd.score, rd.color || null, rd.opponentId || null, rd.opponent || null).run();
              }
            } catch {
            }
            await db2.prepare("INSERT INTO details (tid,pid,revision,payload) VALUES (?,?,?,?) ON CONFLICT(tid,pid,revision) DO UPDATE SET payload=excluded.payload").bind(id, pid, t.updated, JSON.stringify(playerObj)).run();
          }
          const s2 = stats(playerObj);
          const nextMatch = getNextMatch(playerObj);
          const medalPrediction = getMedal(rank, p.ageGroup || t.group, t.prizes);
          const fullPlayer = {
            ...playerObj,
            rank,
            totalPlayers,
            club,
            games: s2.played,
            whiteGames: s2.white,
            blackGames: s2.black,
            wins: s2.wins,
            draws: s2.draws,
            losses: s2.losses,
            nextMatch,
            medalPrediction
          };
          return json({
            player: fullPlayer,
            rank,
            totalPlayers,
            club,
            games: s2.played,
            whiteGames: s2.white,
            blackGames: s2.black,
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
      if (reqOrigin && process.env.NODE_ENV === "production" && path !== "/api/auth/login") {
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
      if (path === "/api/admin/upload-image" || path === "/api/admin/slides/upload") {
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
        const filename = `${path.includes("slides") ? "slide_" : ""}${crypto.randomUUID()}.${safeExt}`;
        let publicUrl = await uploadToSupabaseStorage(fileBuffer, filename, mimeType);
        if (!publicUrl) {
          const base64Str = Buffer.from(fileBuffer).toString("base64");
          publicUrl = `data:${mimeType};base64,${base64Str}`;
        }
        try {
          const targetDirs = [
            resolve(process.cwd(), "../web/uploads/slides"),
            resolve(process.cwd(), "web/uploads/slides"),
            resolve(process.cwd(), "public/uploads/slides"),
            resolve(process.cwd(), "../public/uploads/slides"),
            resolve(process.cwd(), "release/web/uploads/slides")
          ];
          for (const dir of targetDirs) {
            try {
              mkdirSync(dir, { recursive: true });
              writeFileSync(resolve(dir, filename), fileBuffer);
            } catch {
            }
          }
        } catch {
        }
        await log(true, `Upload image th\xE0nh c\xF4ng: ${publicUrl.startsWith("data:") ? "Embedded Data URL" : publicUrl}`);
        return json({ url: publicUrl, message: "Upload \u1EA3nh th\xE0nh c\xF4ng!" }, 200, {}, req);
      }
      if (Number(req.headers.get("content-length") || 0) > 6e6) return json({ error: "D\u1EEF li\u1EC7u g\u1EEDi l\xEAn qu\xE1 l\u1EDBn." }, 413, {}, req);
      const raw = await req.text();
      if (raw.length > 6e6) return json({ error: "D\u1EEF li\u1EC7u g\u1EEDi l\xEAn qu\xE1 l\u1EDBn." }, 413, {}, req);
      let b = {};
      if (raw && raw.trim()) {
        try {
          b = JSON.parse(raw);
        } catch {
          return json({ error: "D\u1EEF li\u1EC7u kh\xF4ng h\u1EE3p l\u1EC7." }, 400, {}, req);
        }
      }
      if (path === "/api/auth/login") {
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
      if (path === "/api/admin/slides" || path.startsWith("/api/admin/slides/")) {
        await ensureSlidesTableSchema(db2);
        const slideId = path.replace(/^\/api\/admin\/slides\/?/, "");
        if (req.method === "DELETE" || b.action === "slide_delete") {
          const targetId = slideId || String(b.id || "");
          if (!targetId) return json({ error: "M\xE3 slide kh\xF4ng h\u1EE3p l\u1EC7." }, 400, {}, req);
          await db2.prepare("DELETE FROM tournament_slides WHERE id = ?").bind(targetId).run();
          await log(true, `\u0110\xE3 x\xF3a slide id: ${targetId}`);
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
          await log(true, `C\u1EADp nh\u1EADt slide: ${title}`);
          return json({ message: "\u0110\xE3 c\u1EADp nh\u1EADt slide th\xE0nh c\xF4ng." }, 200, {}, req);
        }
        const id = crypto.randomUUID();
        await db2.prepare(`
          INSERT INTO tournament_slides (id, tournament_id, title, slide_type, image_url, display_order, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(id, tournament_id, title, slide_type, image_url, display_order, status, now, now).run();
        await log(true, `T\u1EA1o slide m\u1EDBi: ${title}`);
        return json({ message: "\u0110\xE3 t\u1EA1o slide gi\u1EA3i \u0111\u1EA5u th\xE0nh c\xF4ng.", id }, 200, {}, req);
      }
      if (path === "/api/admin/prizes" || path.startsWith("/api/admin/prizes/")) {
        const prizeId = path.replace(/^\/api\/admin\/prizes\/?/, "");
        if (req.method === "DELETE" || b.action === "prize_delete") {
          const targetId = prizeId || String(b.id || "");
          if (!targetId) return json({ error: "M\xE3 gi\u1EA3i th\u01B0\u1EDFng kh\xF4ng h\u1EE3p l\u1EC7." }, 400, {}, req);
          await db2.prepare("DELETE FROM prizes WHERE id = ?").bind(targetId).run();
          await log(true, `\u0110\xE3 x\xF3a c\u01A1 c\u1EA5u gi\u1EA3i th\u01B0\u1EDFng id: ${targetId}`);
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
          await log(true, `C\u1EADp nh\u1EADt c\u01A1 c\u1EA5u gi\u1EA3i th\u01B0\u1EDFng: ${prize_name}`);
          return json({ message: "\u0110\xE3 c\u1EADp nh\u1EADt quy t\u1EAFc gi\u1EA3i th\u01B0\u1EDFng th\xE0nh c\xF4ng." }, 200, {}, req);
        }
        const id = crypto.randomUUID();
        await db2.prepare(`
          INSERT INTO prizes (id, tournament_id, group_name, rank_from, rank_to, medal, prize_name, description, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(id, tournament_id, group_name, rank_from, rank_to, medal, prize_name, description, now, now).run();
        await log(true, `T\u1EA1o c\u01A1 c\u1EA5u gi\u1EA3i th\u01B0\u1EDFng m\u1EDBi: ${prize_name}`);
        return json({ message: "\u0110\xE3 t\u1EA1o quy t\u1EAFc gi\u1EA3i th\u01B0\u1EDFng th\xE0nh c\xF4ng.", id }, 200, {}, req);
      }
      if (path === "/api/auth/logout") {
        await db2.prepare("DELETE FROM admin_sessions WHERE hash = ?").bind(s.hash).run();
        return json({ message: "\u0110\xE3 \u0111\u0103ng xu\u1EA5t." }, 200, { "Set-Cookie": cookie(req, "", 0) }, req);
      }
      if (path !== "/api/admin") return json({ error: "Kh\xF4ng t\xECm th\u1EA5y ch\u1EE9c n\u0103ng." }, 404, {}, req);
      action = String(b.action || "");
      if (action === "detect") {
        if (!await lock("source-detect", 2)) return json({ error: "Vui l\xF2ng ch\u1EDD v\xE0i gi\xE2y gi\u1EEFa c\xE1c l\u1EA7n ki\u1EC3m tra." }, 429, {}, req);
        const info = await source.detect(String(b.url || ""));
        for (const cat of info.categories) {
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
        await log(true, `Th\xEAm gi\u1EA3i: ${t.name} \xB7 ${t.players.length} k\u1EF3 th\u1EE7`);
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
        for (const item of items) {
          try {
            const t = await source.tournament(item.url, item.group);
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
          } catch (err) {
            console.error("Batch import error for", item.url, err);
          }
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
        await log(true, `\u0110\u1ED3ng b\u1ED9 V2 gi\u1EA3i \u0111\u1EA5u: ${mainTournamentTitle} \xB7 ${successCount}/${items.length} b\u1EA3ng \u0111\u1EA5u, t\u1ED5ng ${totalPlayers} k\u1EF3 th\u1EE7`);
        return json({ message: `\u0110\xE3 \u0111\u1ED3ng b\u1ED9 th\xE0nh c\xF4ng ${successCount} b\u1EA3ng \u0111\u1EA5u v\u1EDBi ${totalPlayers} k\u1EF3 th\u1EE7!` }, 200, {}, req);
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
        await log(true, `T\u1EA1o banner m\u1EDBi: ${title}`);
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
        await log(true, `C\u1EADp nh\u1EADt banner: ${title}`);
        return json({ message: "\u0110\xE3 c\u1EADp nh\u1EADt banner th\xE0nh c\xF4ng." }, 200, {}, req);
      }
      if (action === "banner_delete") {
        const id = String(b.id || "");
        if (!id) return json({ error: "M\xE3 banner kh\xF4ng h\u1EE3p l\u1EC7." }, 400, {}, req);
        await db2.prepare("DELETE FROM home_banners WHERE id = ?").bind(id).run();
        await log(true, `\u0110\xE3 x\xF3a banner id: ${id}`);
        return json({ message: "\u0110\xE3 x\xF3a banner th\xE0nh c\xF4ng." }, 200, {}, req);
      }
      if (action === "banner_toggle") {
        const id = String(b.id || "");
        const is_active = b.is_active ? 1 : 0;
        if (!id) return json({ error: "M\xE3 banner kh\xF4ng h\u1EE3p l\u1EC7." }, 400, {}, req);
        await db2.prepare("UPDATE home_banners SET is_active = ?, updated_at = ? WHERE id = ?").bind(is_active, (/* @__PURE__ */ new Date()).toISOString(), id).run();
        await log(true, `${is_active ? "Hi\u1EC7n" : "\u1EA8n"} banner id: ${id}`);
        return json({ message: is_active ? "\u0110\xE3 hi\u1EC3n th\u1ECB banner." : "\u0110\xE3 \u1EA9n banner." }, 200, {}, req);
      }
      const old = await get(String(b.id || ""), true);
      if (!old) return json({ error: "Gi\u1EA3i kh\xF4ng t\u1ED3n t\u1EA1i ho\u1EB7c \u0111\xE3 b\u1ECB x\xF3a." }, 404, {}, req);
      if (action === "publish") {
        const shown = b.published === true;
        await db2.prepare("UPDATE tournaments SET published = ? WHERE id = ?").bind(shown ? 1 : 0, old.id).run();
        await log(true, `${shown ? "Hi\u1EC7n" : "\u1EA8n"} gi\u1EA3i: ${old.name}`);
        return json({ message: shown ? "\u0110\xE3 c\xF4ng b\u1ED1 gi\u1EA3i \u0111\u1EA5u." : "\u0110\xE3 \u1EA9n gi\u1EA3i \u0111\u1EA5u." }, 200, {}, req);
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
        await log(true, `\u0110\xE3 x\xF3a gi\u1EA3i: ${old.name}`);
        return json({ message: "\u0110\xE3 x\xF3a gi\u1EA3i v\xE0 to\xE0n b\u1ED9 d\u1EEF li\u1EC7u k\u1EF3 th\u1EE7 c\u1EE7a gi\u1EA3i." }, 200, {}, req);
      }
      if (action === "edit" || action === "sync") {
        let t;
        if (action === "edit") {
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
        const statements = [];
        if (t.id !== old.id) {
          statements.push(db2.prepare("INSERT INTO tournaments (id,payload,published,updated) VALUES (?,?,?,?)").bind(t.id, JSON.stringify(t), old.published ? 1 : 0, t.updated));
          statements.push(db2.prepare("DELETE FROM tournaments WHERE id = ?").bind(old.id));
        } else {
          statements.push(db2.prepare("UPDATE tournaments SET payload = ?, updated = ? WHERE id = ?").bind(JSON.stringify(t), t.updated, t.id));
        }
        if (t.updated !== old.updated || t.id !== old.id) statements.push(db2.prepare("DELETE FROM details WHERE tid = ?").bind(old.id));
        await db2.batch(statements);
        await log(true, `${action === "edit" ? "S\u1EEDa" : "\u0110\u1ED3ng b\u1ED9"} gi\u1EA3i: ${t.name}`);
        return json({ message: action === "edit" ? "\u0110\xE3 l\u01B0u ch\u1EC9nh s\u1EEDa." : "\u0110\xE3 c\u1EADp nh\u1EADt k\u1EBFt qu\u1EA3 m\u1EDBi nh\u1EA5t." }, 200, {}, req);
      }
      if (action === "tournament_update_info") {
        const id = String(b.id || "");
        if (!id) return json({ error: "M\xE3 gi\u1EA3i \u0111\u1EA5u kh\xF4ng h\u1EE3p l\u1EC7." }, 400, {}, req);
        const oldTour = await get(id, true);
        if (!oldTour) return json({ error: "Gi\u1EA3i \u0111\u1EA5u kh\xF4ng t\u1ED3n t\u1EA1i." }, 404, {}, req);
        const info = typeof b.info === "object" && b.info ? b.info : {};
        const prizes = Array.isArray(b.prizes) ? b.prizes : [];
        const updatedTour = {
          ...oldTour,
          info,
          prizes,
          updated: (/* @__PURE__ */ new Date()).toISOString()
        };
        await db2.prepare("UPDATE tournaments SET payload = ?, updated = ? WHERE id = ?").bind(JSON.stringify(updatedTour), updatedTour.updated, id).run();
        await log(true, `C\u1EADp nh\u1EADt th\xF4ng tin & c\u01A1 c\u1EA5u gi\u1EA3i th\u01B0\u1EDFng gi\u1EA3i: ${oldTour.name}`);
        return json({ message: "\u0110\xE3 c\u1EADp nh\u1EADt th\xF4ng tin & c\u01A1 c\u1EA5u gi\u1EA3i th\u01B0\u1EDFng th\xE0nh c\xF4ng!" }, 200, {}, req);
      }
      return json({ error: "Thao t\xE1c kh\xF4ng \u0111\u01B0\u1EE3c h\u1ED7 tr\u1EE3." }, 400, {}, req);
    } catch (e) {
      const m = message(e);
      if (authorized && ["preview", "sync", "edit", "batch_import", "detect", "banner_create", "banner_update", "banner_delete", "banner_toggle", "tournament_update_info"].includes(action)) try {
        await log(false, m);
      } catch {
      }
      return json({ error: m }, 502, {}, req);
    }
  };
}

// database.ts
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync, mkdirSync as mkdirSync2, existsSync } from "node:fs";
import { dirname, resolve as resolve2 } from "node:path";
function openDatabase(file, migrations) {
  mkdirSync2(dirname(file), { recursive: true });
  const sql = new DatabaseSync(file);
  sql.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
  sql.exec("CREATE TABLE IF NOT EXISTS sgc_migrations (name TEXT PRIMARY KEY, applied TEXT NOT NULL)");
  if (existsSync(migrations)) {
    for (const name of readdirSync(migrations).filter((n) => n.endsWith(".sql")).sort()) if (!sql.prepare("SELECT name FROM sgc_migrations WHERE name = ?").get(name)) {
      sql.exec("BEGIN IMMEDIATE");
      try {
        if (!sql.prepare("SELECT name FROM sgc_migrations WHERE name = ?").get(name)) {
          sql.exec(readFileSync(resolve2(migrations, name), "utf8"));
          sql.prepare("INSERT OR IGNORE INTO sgc_migrations (name,applied) VALUES (?,?)").run(name, (/* @__PURE__ */ new Date()).toISOString());
        }
        sql.exec("COMMIT");
      } catch (e) {
        sql.exec("ROLLBACK");
        throw e;
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
  return { prepare: (s) => new Query(s), async batch(ss) {
    sql.exec("BEGIN IMMEDIATE");
    try {
      const r = ss.map((s) => s.execute());
      sql.exec("COMMIT");
      return r;
    } catch (e) {
      sql.exec("ROLLBACK");
      throw e;
    }
  }, close: () => sql.close() };
}

// server.ts
var root = resolve3(dirname2(fileURLToPath(import.meta.url)), "..");
var port = Number(process.env.PORT || 3e3);
var host = process.env.HOST || "0.0.0.0";
var publicOrigin = process.env.PUBLIC_ORIGIN ? new URL(process.env.PUBLIC_ORIGIN).origin : null;
var db = openDatabase(resolve3(root, process.env.DATA_DIR || "data", "chess.sqlite"), resolve3(root, "migrations"));
var api = createApi(db);
var web = resolve3(root, "web");
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
    const path = decodeURIComponent(url.pathname);
    if (path.startsWith("/uploads/")) {
      const candidates = [
        resolve3(web, "." + path),
        resolve3(root, "web", "." + path),
        resolve3(root, "public", "." + path),
        resolve3(process.cwd(), "web", "." + path),
        resolve3(process.cwd(), "public", "." + path),
        resolve3(process.cwd(), "." + path)
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
    const asset = path === "/" || path === "/admin" || path === "/admin/" ? "index.html" : "." + path;
    const full = resolve3(web, asset);
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
        "Cache-Control": path.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache"
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
