import type { Tournament, Player } from './chess';
import { importTournament, importPlayer, validateSource, detectCategories, type CategoryDetectResult } from './chess-source';
import { DEFAULT_ADMIN } from './default-admin';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

export interface Database { prepare(sql: string): Statement; batch(statements: Statement[]): Promise<any[]> }
export interface Statement { bind(...args: any[]): Statement; first<T = any>(): Promise<T | null>; all<T = any>(): Promise<{ results: T[] }>; run(): Promise<{ meta: { changes: number } }> }

export interface ApiSource {
  tournament: (source: string, group: string) => Promise<Tournament>;
  player: (t: Tournament, p: Player) => Promise<Player>;
  detect?: (source: string) => Promise<{ mainName: string; categories: CategoryDetectResult[] }>;
}

const enc = new TextEncoder(); const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const unhex = (s: string) => Uint8Array.from(s.match(/.{2}/g)!.map(x => parseInt(x, 16)));
const random = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const digest = async (s: string) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
export function json(data: unknown, status = 200, headers: Record<string, string> = {}) { return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } }) }
function message(e: unknown) { const m = e instanceof Error ? e.message : ''; return /SQL|D1|binding|syntax|database|fetch failed/i.test(m) ? 'Kho dữ liệu tạm thời không sẵn sàng. Vui lòng thử lại.' : m || 'Có lỗi xảy ra. Vui lòng thử lại.' }
async function passwordOK(password: string, c: typeof DEFAULT_ADMIN) { const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']); const actual = hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(c.salt), iterations: c.iterations }, key, 256)); let diff = actual.length ^ c.hash.length; for (let i = 0; i < actual.length; i++)diff |= actual.charCodeAt(i) ^ (c.hash.charCodeAt(i) || 0); return diff === 0 }

export function createApi(db: Database, sourceParam: Partial<ApiSource> = {}) {
  const source = {
    tournament: sourceParam.tournament ?? importTournament,
    player: sourceParam.player ?? importPlayer,
    detect: sourceParam.detect ?? detectCategories,
  };

  const log = async (ok: boolean, m: string) => { await db.batch([db.prepare('INSERT INTO logs (id, created, ok, message) VALUES (?, ?, ?, ?)').bind(crypto.randomUUID(), new Date().toISOString(), ok ? 1 : 0, m.slice(0, 500)), db.prepare('DELETE FROM logs WHERE id NOT IN (SELECT id FROM logs ORDER BY created DESC LIMIT 100)')]) };
  const lock = async (k: string, s: number) => { const now = Date.now(); return (await db.prepare('INSERT INTO locks (key, until) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET until = excluded.until WHERE locks.until < ?').bind(k, now + s * 1000, now).run()).meta.changes > 0 };

  const get = async (id: string, admin = false): Promise<Tournament | null> => {
    const r = await db.prepare(admin ? 'SELECT payload,published FROM tournaments WHERE id = ?' : 'SELECT payload,published FROM tournaments WHERE id = ? AND published = 1').bind(id).first<{ payload: string; published: number }>();
    return r ? { ...JSON.parse(r.payload), published: !!r.published } : null;
  };

  const list = async (admin = false) => {
    const r = await db.prepare(admin ? 'SELECT payload,published FROM tournaments ORDER BY updated DESC' : 'SELECT payload,published FROM tournaments WHERE published = 1 ORDER BY updated DESC').all<{ payload: string; published: number }>();
    return r.results.map(x => ({ ...JSON.parse(x.payload), published: !!x.published }));
  };

  async function session(req: Request) {
    const token = req.headers.get('cookie')?.match(/(?:^|;\s*)sgc_session=([a-f0-9]{64})(?:;|$)/)?.[1];
    if (!token) return null;
    const hash = await digest(token);
    const row = await db.prepare('SELECT hash, csrf, expires FROM admin_sessions WHERE hash = ? AND expires > ?').bind(hash, Date.now()).first<{ hash: string; csrf: string; expires: number }>();
    return row;
  }

  const cookie = (req: Request, value: string, max = 28800) => `sgc_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${max}${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}`;

  return async function handle(req: Request, ip = 'unknown'): Promise<Response> {
    let action = ''; let authorized = false; try {
      const u = new URL(req.url); const path = u.pathname;
      if (req.method === 'GET') {
        if (path === '/api/tournaments') return json({ tournaments: await list() });
        if (path === '/api/banners') {
          try {
            const r = await db.prepare('SELECT * FROM home_banners WHERE is_active = 1 ORDER BY sort_order ASC, created_at DESC').all();
            return json({ banners: r.results });
          } catch {
            return json({ banners: [] });
          }
        }
        if (path === '/api/admin') {
          const s = await session(req);
          if (!s) return json({ admin: false });
          let bannersList: any[] = [];
          try {
            bannersList = (await db.prepare('SELECT * FROM home_banners ORDER BY sort_order ASC, created_at DESC').all()).results;
          } catch {}
          return json({ admin: true, username: 'admin', csrf: s.csrf, tournaments: await list(true), banners: bannersList, logs: (await db.prepare('SELECT * FROM logs ORDER BY created DESC LIMIT 30').all()).results });
        }
        if (path === '/api/player') {
          const id = u.searchParams.get('t') || '', pid = u.searchParams.get('p') || '';
          if (!/^\d+$/.test(id) || !/^\d+-\d+$/.test(pid)) return json({ error: 'Mã hồ sơ không hợp lệ.' }, 400);

          let t = await get(id);
          let p = t?.players.find(p => p.id === pid);

          // If not found directly in master tournament, check if pid's category ID matches
          if (!p) {
            const catId = pid.split('-')[0];
            const catTour = await get(catId);
            if (catTour) {
              t = catTour;
              p = catTour.players.find(x => x.id === pid);
            }
          }

          if (!t || !p) return json({ error: 'Hồ sơ không tồn tại hoặc giải đang ẩn.' }, 404);

          const r = await db.prepare('SELECT payload FROM details WHERE tid = ? AND pid = ? AND revision = ?').bind(id, pid, t.updated).first<{ payload: string }>();
          if (r) return json({ player: JSON.parse(r.payload) });

          if (!await lock('detail:' + id, 3)) return json({ error: 'Nguồn đang được tải. Hãy thử lại sau vài giây.' }, 429);
          const player = await source.player(t, p);

          // Save matches to matches table
          try {
            for (const rd of player.rounds) {
              const matchId = `${player.id}-rd${rd.round}`;
              await db.prepare(`
                INSERT INTO matches (id, category_id, player_id, player_white, player_black, round, board, result, score, color, opponent_id, opponent_name)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  player_white = excluded.player_white,
                  player_black = excluded.player_black,
                  board = excluded.board,
                  result = excluded.result,
                  score = excluded.score
              `).bind(matchId, p.categoryId || t.id, player.id, rd.playerWhite || null, rd.playerBlack || null, rd.round, rd.board || null, rd.result || null, rd.score, rd.color || null, rd.opponentId || null, rd.opponent || null).run();
            }
          } catch { }

          await db.prepare('INSERT INTO details (tid,pid,revision,payload) VALUES (?,?,?,?) ON CONFLICT(tid,pid,revision) DO UPDATE SET payload=excluded.payload').bind(id, pid, t.updated, JSON.stringify(player)).run();
          return json({ player });
        }
        return json({ error: 'Không tìm thấy chức năng.' }, 404);
      }
      if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204 });
      }
      if (req.method !== 'POST') return json({ error: 'Phương thức không hợp lệ.' }, 405);

      const reqOrigin = req.headers.get('origin');
      const allowedOrigins = new Set([
        u.origin,
        process.env.FRONTEND_URL,
        process.env.PUBLIC_ORIGIN,
        process.env.API_URL
      ].filter(Boolean));

      if (reqOrigin && !allowedOrigins.has(reqOrigin) && process.env.NODE_ENV === 'production') {
        return json({ error: 'Yêu cầu không hợp lệ. Hãy thao tác trong ứng dụng.' }, 403);
      }


      if (path === '/api/admin/upload-image') {
        const s = await session(req);
        if (!s) return json({ error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' }, 401);
        if (req.headers.get('x-csrf-token') !== s.csrf) return json({ error: 'Phiên xác thực không hợp lệ. Hãy tải lại trang.' }, 403);

        let fileBuffer: Uint8Array | null = null;
        let fileExt = '';
        let originalName = '';

        const contentType = req.headers.get('content-type') || '';

        if (contentType.includes('multipart/form-data')) {
          try {
            const formData = await req.formData();
            const file = formData.get('image') as File | null;
            if (!file) return json({ error: 'Không tìm thấy file ảnh trong yêu cầu.' }, 400);

            originalName = file.name || 'image.png';
            fileBuffer = new Uint8Array(await file.arrayBuffer());
          } catch (e) {
            return json({ error: 'Lỗi đọc file upload: ' + (e as Error).message }, 400);
          }
        } else {
          try {
            const rawText = await req.text();
            const b = JSON.parse(rawText);
            if (b.image && typeof b.image === 'string') {
              const match = b.image.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
              if (match) {
                fileExt = match[1].toLowerCase();
                fileBuffer = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
                originalName = `upload.${fileExt}`;
              }
            }
          } catch {}
        }

        if (!fileBuffer || fileBuffer.length === 0) {
          return json({ error: 'Dữ liệu hình ảnh không hợp lệ.' }, 400);
        }

        // 1. Validate size (Max 5MB = 5,242,880 bytes)
        if (fileBuffer.length > 5 * 1024 * 1024) {
          return json({ error: 'Dung lượng hình ảnh quá lớn (Tối đa 5MB).' }, 400);
        }

        // 2. Extension validation
        if (!fileExt) {
          fileExt = originalName.split('.').pop()?.toLowerCase() || '';
        }
        if (fileExt === 'jpeg') fileExt = 'jpg';

        const ALLOWED_EXTS = ['jpg', 'png', 'webp'];
        if (!ALLOWED_EXTS.includes(fileExt)) {
          return json({ error: 'Chỉ chấp nhận các định dạng ảnh: .jpg, .jpeg, .png, .webp (Không cho phép .exe, .js, .php, .svg).' }, 400);
        }

        // 3. Security: Magic bytes verification
        const head = fileBuffer.slice(0, 12);
        const isPng = head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4E && head[3] === 0x47;
        const isJpg = head[0] === 0xFF && head[1] === 0xD8 && head[2] === 0xFF;
        const isWebp = head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 && head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50;

        if (!isPng && !isJpg && !isWebp) {
          return json({ error: 'Nội dung file không đúng định dạng ảnh hợp lệ (.jpg, .png, .webp).' }, 400);
        }

        const safeExt = isPng ? 'png' : isJpg ? 'jpg' : 'webp';
        const filename = `${crypto.randomUUID()}.${safeExt}`;
        const relativeUrl = `/uploads/banner/${filename}`;

        try {
          const targetDirs = [
            resolve(process.cwd(), '../web/uploads/banner'),
            resolve(process.cwd(), 'web/uploads/banner'),
            resolve(process.cwd(), 'public/uploads/banner'),
            resolve(process.cwd(), '../public/uploads/banner'),
            resolve(process.cwd(), 'release/web/uploads/banner')
          ];

          for (const dir of targetDirs) {
            try {
              mkdirSync(dir, { recursive: true });
              writeFileSync(resolve(dir, filename), fileBuffer);
            } catch {}
          }
        } catch {
          return json({ error: 'Không thể lưu file ảnh vào hệ thống.' }, 500);
        }

        await log(true, `Upload banner image thành công: ${relativeUrl}`);
        return json({ url: relativeUrl, message: 'Upload ảnh thành công!' });
      }

      if (Number(req.headers.get('content-length') || 0) > 6000000) return json({ error: 'Dữ liệu gửi lên quá lớn.' }, 413);
      const raw = await req.text();
      if (raw.length > 6000000) return json({ error: 'Dữ liệu gửi lên quá lớn.' }, 413);
      let b: any; try { b = JSON.parse(raw) } catch { return json({ error: 'Dữ liệu không hợp lệ.' }, 400) }

      if (path === '/api/auth/login') {
        const k = 'login:' + await digest(ip), now = Date.now();
        await db.prepare('INSERT INTO auth_attempts (key,count,reset) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count = CASE WHEN auth_attempts.reset < ? THEN 1 ELSE auth_attempts.count + 1 END, reset = CASE WHEN auth_attempts.reset < ? THEN excluded.reset ELSE auth_attempts.reset END').bind(k, now + 900000, now, now).run();
        const at = await db.prepare('SELECT count FROM auth_attempts WHERE key = ?').bind(k).first<{ count: number }>();
        if ((at?.count || 0) > 8) return json({ error: 'Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau 15 phút.' }, 429);
        if (typeof b.username !== 'string' || typeof b.password !== 'string' || b.password.length > 256) return json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng.' }, 401);
        await db.prepare('INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO NOTHING').bind('admin_credentials', JSON.stringify(DEFAULT_ADMIN)).run();
        const row = await db.prepare('SELECT value FROM settings WHERE key = ?').bind('admin_credentials').first<{ value: string }>();
        const c = JSON.parse(row!.value);
        const ok = await passwordOK(b.password, c);
        if (b.username !== c.username || !ok) return json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng.' }, 401);
        const token = random(), csrf = random();
        await db.batch([db.prepare('DELETE FROM admin_sessions WHERE expires < ?').bind(now), db.prepare('DELETE FROM auth_attempts WHERE key = ?').bind(k), db.prepare('INSERT INTO admin_sessions (hash,csrf,expires) VALUES (?,?,?)').bind(await digest(token), csrf, now + 28800000)]);
        return json({ admin: true, csrf, message: 'Đăng nhập thành công.' }, 200, { 'Set-Cookie': cookie(req, token) });
      }

      const s = await session(req);
      if (!s) return json({ error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' }, 401);
      if (req.headers.get('x-csrf-token') !== s.csrf) return json({ error: 'Phiên xác thực không hợp lệ. Hãy tải lại trang.' }, 403);
      authorized = true;

      if (path === '/api/auth/logout') { await db.prepare('DELETE FROM admin_sessions WHERE hash = ?').bind(s.hash).run(); return json({ message: 'Đã đăng xuất.' }, 200, { 'Set-Cookie': cookie(req, '', 0) }) }
      if (path !== '/api/admin') return json({ error: 'Không tìm thấy chức năng.' }, 404);
      action = String(b.action || '');

      if (action === 'detect') {
        if (!await lock('source-detect', 2)) return json({ error: 'Vui lòng chờ vài giây giữa các lần kiểm tra.' }, 429);
        const info = await source.detect(String(b.url || ''));

        // Mark categories status based on database existence
        for (const cat of info.categories) {
          try {
            const existingCat = await db.prepare('SELECT id FROM categories WHERE id = ?').bind(cat.id).first();
            cat.status = existingCat ? 'Đã nhập' : 'Chưa nhập';
          } catch {
            cat.status = 'Chưa nhập';
          }
        }

        return json({ detected: info });
      }

      if (action === 'preview') {
        if (!await lock('source-preview', 3)) return json({ error: 'Vui lòng chờ vài giây giữa các lần kiểm tra nguồn.' }, 429);
        const t = await source.tournament(String(b.url || ''), String(b.group || ''));
        if (b.name?.trim()) t.name = String(b.name).trim().slice(0, 240);
        const token = random();
        await db.batch([db.prepare('DELETE FROM previews WHERE expires < ?').bind(Date.now()), db.prepare('INSERT INTO previews (token,owner,payload,expires) VALUES (?,?,?,?)').bind(token, s.hash, JSON.stringify(t), Date.now() + 600000)]);
        return json({ tournament: t, token });
      }

      if (action === 'save') {
        const row = await db.prepare('SELECT payload FROM previews WHERE token = ? AND owner = ? AND expires > ?').bind(String(b.token || ''), s.hash, Date.now()).first<{ payload: string }>();
        if (!row) return json({ error: 'Bản kiểm tra đã hết hạn. Hãy kiểm tra nguồn lại.' }, 400);
        const t = JSON.parse(row.payload) as Tournament;
        if (await get(t.id, true)) return json({ error: 'Giải này đã tồn tại. Hãy chọn Sửa hoặc Đồng bộ.' }, 409);
        await db.batch([db.prepare('INSERT INTO tournaments (id,payload,published,updated) VALUES (?,?,0,?)').bind(t.id, JSON.stringify(t), t.updated), db.prepare('DELETE FROM previews WHERE token = ?').bind(b.token)]);
        await log(true, `Thêm giải: ${t.name} · ${t.players.length} kỳ thủ`);
        return json({ message: 'Đã thêm giải ở trạng thái ẩn. Nhấn Hiện giải khi đã sẵn sàng.' });
      }

      if (action === 'batch_import') {
        const items: { id?: string; url: string; group: string; name?: string }[] = b.items || [];
        if (!items.length) return json({ error: 'Không có bảng đấu nào được chọn để nhập.' }, 400);

        let totalPlayers = 0;
        let successCount = 0;
        const mainTournamentTitle = b.name?.trim() || b.mainName?.trim() || 'Giải đấu';
        const masterId = items[0]?.url.match(/\/tnr(\d+)\.aspx/i)?.[1] || 'master';

        const allParsedCategories: { cat: any; tour: Tournament }[] = [];

        for (const item of items) {
          try {
            const t = await source.tournament(item.url, item.group);
            t.name = mainTournamentTitle;
            allParsedCategories.push({ cat: item, tour: t });
            totalPlayers += t.players.length;
            successCount++;

            // Insert into relational tables categories, players, rankings
            try {
              await db.prepare(`
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
                await db.prepare(`
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
                `).bind(p.id, t.id, masterId, p.snr, p.name, p.fideId || null, p.rating || null, p.club || '', p.country || null, p.gender || null, p.ageGroup || null, t.updated).run();

                await db.prepare(`
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
              console.error('Relational DB save error:', dbErr);
            }

          } catch (err) {
            console.error('Batch import error for', item.url, err);
          }
        }

        // Build composite master tournament payload combining all parsed categories
        const combinedPlayers: Player[] = [];
        const categoriesMeta: any[] = [];

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

        const masterTournament: Tournament = {
          id: masterId,
          name: mainTournamentTitle,
          group: `${categoriesMeta.length} bảng đấu`,
          source: items[0]?.url || `https://chess-results.com/tnr${masterId}.aspx?lan=1`,
          updated: new Date().toISOString(),
          categories: categoriesMeta,
          players: combinedPlayers,
          tieLabels: ['BH', 'SB', 'Rp'],
          rounds: allParsedCategories[0]?.tour.rounds || null,
          published: true
        };

        // Save master tournament entry & individual category tournament entries
        const existingMaster = await get(masterId, true);
        if (existingMaster) {
          await db.prepare('UPDATE tournaments SET payload = ?, updated = ? WHERE id = ?').bind(JSON.stringify(masterTournament), masterTournament.updated, masterId).run();
        } else {
          await db.prepare('INSERT INTO tournaments (id,payload,published,updated) VALUES (?,?,1,?)').bind(masterId, JSON.stringify(masterTournament), masterTournament.updated).run();
        }

        // Also save individual category entries in tournaments table for direct navigation
        for (const { tour } of allParsedCategories) {
          const catEntry: Tournament = {
            ...tour,
            name: `${mainTournamentTitle} — ${tour.group}`,
            published: true
          };
          const existingCat = await get(tour.id, true);
          if (existingCat) {
            await db.prepare('UPDATE tournaments SET payload = ?, updated = ? WHERE id = ?').bind(JSON.stringify(catEntry), catEntry.updated, tour.id).run();
          } else {
            await db.prepare('INSERT INTO tournaments (id,payload,published,updated) VALUES (?,?,1,?)').bind(tour.id, JSON.stringify(catEntry), tour.updated).run();
          }
        }

        await log(true, `Đồng bộ V2 giải đấu: ${mainTournamentTitle} · ${successCount}/${items.length} bảng đấu, tổng ${totalPlayers} kỳ thủ`);
        return json({ message: `Đã đồng bộ thành công ${successCount} bảng đấu với ${totalPlayers} kỳ thủ!` });
      }

      if (action === 'banner_create') {
        const id = crypto.randomUUID();
        const title = String(b.title || '').trim();
        const description = String(b.description || '').trim();
        const image_url = String(b.image_url || '').trim() || '/company-logo.png';
        const button_text = String(b.button_text || '').trim() || 'Xem ngay';
        const button_link = String(b.button_link || '').trim() || '/';
        const is_active = b.is_active === false || b.is_active === 0 ? 0 : 1;
        const sort_order = Number(b.sort_order || 0);
        const now = new Date().toISOString();

        if (!title) return json({ error: 'Tiêu đề banner không được để trống.' }, 400);

        await db.prepare(`
          INSERT INTO home_banners (id, title, description, image_url, button_text, button_link, is_active, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(id, title, description, image_url, button_text, button_link, is_active, sort_order, now, now).run();

        await log(true, `Tạo banner mới: ${title}`);
        return json({ message: 'Đã tạo banner mới thành công.' });
      }

      if (action === 'banner_update') {
        const id = String(b.id || '');
        const title = String(b.title || '').trim();
        const description = String(b.description || '').trim();
        const image_url = String(b.image_url || '').trim() || '/company-logo.png';
        const button_text = String(b.button_text || '').trim() || 'Xem ngay';
        const button_link = String(b.button_link || '').trim() || '/';
        const is_active = b.is_active === false || b.is_active === 0 ? 0 : 1;
        const sort_order = Number(b.sort_order || 0);
        const now = new Date().toISOString();

        if (!id || !title) return json({ error: 'Thông tin banner không hợp lệ.' }, 400);

        await db.prepare(`
          UPDATE home_banners
          SET title = ?, description = ?, image_url = ?, button_text = ?, button_link = ?, is_active = ?, sort_order = ?, updated_at = ?
          WHERE id = ?
        `).bind(title, description, image_url, button_text, button_link, is_active, sort_order, now, id).run();

        await log(true, `Cập nhật banner: ${title}`);
        return json({ message: 'Đã cập nhật banner thành công.' });
      }

      if (action === 'banner_delete') {
        const id = String(b.id || '');
        if (!id) return json({ error: 'Mã banner không hợp lệ.' }, 400);

        await db.prepare('DELETE FROM home_banners WHERE id = ?').bind(id).run();
        await log(true, `Đã xóa banner id: ${id}`);
        return json({ message: 'Đã xóa banner thành công.' });
      }

      if (action === 'banner_toggle') {
        const id = String(b.id || '');
        const is_active = b.is_active ? 1 : 0;
        if (!id) return json({ error: 'Mã banner không hợp lệ.' }, 400);

        await db.prepare('UPDATE home_banners SET is_active = ?, updated_at = ? WHERE id = ?').bind(is_active, new Date().toISOString(), id).run();
        await log(true, `${is_active ? 'Hiện' : 'Ẩn'} banner id: ${id}`);
        return json({ message: is_active ? 'Đã hiển thị banner.' : 'Đã ẩn banner.' });
      }

      const old = await get(String(b.id || ''), true);
      if (!old) return json({ error: 'Giải không tồn tại hoặc đã bị xóa.' }, 404);

      if (action === 'publish') {
        const shown = b.published === true;
        await db.prepare('UPDATE tournaments SET published = ? WHERE id = ?').bind(shown ? 1 : 0, old.id).run();
        await log(true, `${shown ? 'Hiện' : 'Ẩn'} giải: ${old.name}`);
        return json({ message: shown ? 'Đã công bố giải đấu.' : 'Đã ẩn giải đấu.' });
      }

      if (action === 'delete') {
        if (b.confirmName !== old.name) return json({ error: 'Tên xác nhận xóa không khớp.' }, 400);
        await db.batch([
          db.prepare('DELETE FROM matches WHERE category_id = ? OR player_id LIKE ?').bind(old.id, `${old.id}-%`),
          db.prepare('DELETE FROM rankings WHERE category_id = ? OR player_id LIKE ?').bind(old.id, `${old.id}-%`),
          db.prepare('DELETE FROM players WHERE tournament_id = ? OR category_id = ?').bind(old.id, old.id),
          db.prepare('DELETE FROM categories WHERE tournament_id = ? OR id = ?').bind(old.id, old.id),
          db.prepare('DELETE FROM details WHERE tid = ?').bind(old.id),
          db.prepare('DELETE FROM tournaments WHERE id = ?').bind(old.id)
        ]);
        await log(true, `Đã xóa giải: ${old.name}`);
        return json({ message: 'Đã xóa giải và toàn bộ dữ liệu kỳ thủ của giải.' });
      }

      if (action === 'edit' || action === 'sync') {
        let t: Tournament;
        if (action === 'edit') {
          const name = String(b.name || '').trim(), group = String(b.group || '').trim(), url = String(b.url || '').trim();
          if (!name || name.length > 240 || group.length > 100) return json({ error: 'Tên giải không được trống và phải dưới 240 ký tự.' }, 400);
          validateSource(url);
          if (url === old.source) { t = { ...old, name, group } }
          else {
            if (!await lock('sync:' + old.id, 20)) return json({ error: 'Giải đang được đồng bộ. Vui lòng thử lại sau.' }, 429);
            t = await source.tournament(url, group);
            if (t.id !== old.id && await get(t.id, true)) return json({ error: 'Link mới thuộc một giải đã có trong ứng dụng.' }, 409);
            t.name = name;
          }
        } else {
          if (!await lock('sync:' + old.id, 20)) return json({ error: 'Giải vừa được đồng bộ. Vui lòng chờ 20 giây.' }, 429);
          t = await source.tournament(old.source, old.group);
          if (t.players.length < old.players.length) throw Error(`Nguồn chỉ trả ${t.players.length}/${old.players.length} kỳ thủ. Dữ liệu cũ được giữ để tránh mất kết quả.`);
          t.name = old.name;
        }
        t.published = old.published; const statements = [];
        if (t.id !== old.id) {
          statements.push(db.prepare('INSERT INTO tournaments (id,payload,published,updated) VALUES (?,?,?,?)').bind(t.id, JSON.stringify(t), old.published ? 1 : 0, t.updated));
          statements.push(db.prepare('DELETE FROM tournaments WHERE id = ?').bind(old.id));
        } else {
          statements.push(db.prepare('UPDATE tournaments SET payload = ?, updated = ? WHERE id = ?').bind(JSON.stringify(t), t.updated, t.id));
        }
        if (t.updated !== old.updated || t.id !== old.id) statements.push(db.prepare('DELETE FROM details WHERE tid = ?').bind(old.id));
        await db.batch(statements);
        await log(true, `${action === 'edit' ? 'Sửa' : 'Đồng bộ'} giải: ${t.name}`);
        return json({ message: action === 'edit' ? 'Đã lưu chỉnh sửa.' : 'Đã cập nhật kết quả mới nhất.' });
      }

      return json({ error: 'Thao tác không được hỗ trợ.' }, 400);
    } catch (e) {
      const m = message(e);
      if (authorized && ['preview', 'sync', 'edit', 'batch_import', 'detect', 'banner_create', 'banner_update', 'banner_delete', 'banner_toggle'].includes(action)) try { await log(false, m) } catch { }
      return json({ error: m }, 502);
    }
  };
}
