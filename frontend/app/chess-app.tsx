'use client';
import { useEffect, useState } from 'react';
import { Search, Trophy, Home, Bookmark, ChevronRight, ChevronLeft, ArrowLeft, ArrowUpRight, Users, ShieldCheck, RefreshCw, Share2, Printer, Check, Minus, X, LayoutDashboard, Link as LinkIcon, Plus, Info, Clock, Medal, BarChart3, Download, TrendingUp, PieChart as PieIcon } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Toaster, toast } from 'sonner';
import { Tournament, Player, makeDemo, normalize, matchPlayer, fmt, stats, getMedal, getNextMatch, formatClubName } from '@/lib/chess';
import { apiFetch } from '@/lib/api-client';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, PieChart, Pie, Cell } from 'recharts';
import Admin from './admin';

import DynamicBanner, { type BannerItem } from './dynamic-banner';
import HeroSection from './hero-section';

type View = 'home' | 'search' | 'tournaments' | 'saved' | 'player' | 'admin';
const demo = makeDemo();

function Avatar({ p, large = false }: { p: Player; large?: boolean }) {
  return <span className={'avatar ' + (large ? 'large' : '')} style={{ background: ['#e4edff', '#e5f3f0', '#f8e9df'][Number(p.snr) % 3] }}>{p.name.split(' ').slice(-2).map(x => x[0]).join('')}</span>
}

export default function ChessApp() {
  const [view, setView] = useState<View>('home'), [tourneys, setTourneys] = useState<Tournament[]>([]), [banners, setBanners] = useState<BannerItem[]>([]), [loading, setLoading] = useState(true), [loadError, setLoadError] = useState(''), [limit, setLimit] = useState(100), [q, setQ] = useState(''), [filter, setFilter] = useState('all'), [selected, setSelected] = useState<{ t: string; p: string } | null>(null), [saved, setSaved] = useState<string[]>([]), [tab, setTab] = useState('overview'), [detailLoading, setDetailLoading] = useState(false), [detailError, setDetailError] = useState(''), [install, setInstall] = useState<any>(null);
  const all = filter === 'demo' || selected?.t === 'demo' ? [...tourneys, demo] : tourneys, current = selected ? all.find(t => t.id === selected.t) : null, player = current?.players.find(p => p.id === selected?.p);

  async function reload() {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        apiFetch('/api/tournaments'),
        apiFetch('/api/banners')
      ]);
      const d1 = await r1.json() as any;
      const d2 = await r2.json() as any;
      if (!r1.ok) throw Error(d1.error);
      setTourneys(d1.tournaments || []);
      if (r2.ok && d2.banners) setBanners(d2.banners);
      setLoadError('');
    } catch {
      setLoadError('Chưa tải được danh sách giải. Bạn có thể thử lại hoặc xem bản minh họa.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    try { setSaved(JSON.parse(localStorage.getItem('chess-saved') || '[]')) } catch { }
    const read = () => {
      const p = new URLSearchParams(location.search);
      if (p.get('t') && p.get('p')) {
        setSelected({ t: p.get('t')!, p: p.get('p')! });
        setView('player');
      } else {
        const v = location.pathname === '/admin' ? 'admin' : p.get('view');
        setView(['home', 'search', 'tournaments', 'saved', 'admin'].includes(v || '') ? v as View : 'home');
      }
    };
    read();
    window.addEventListener('popstate', read);
    const ih = (e: any) => { e.preventDefault(); setInstall(e) };
    window.addEventListener('beforeinstallprompt', ih);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => { });
    return () => { window.removeEventListener('popstate', read); window.removeEventListener('beforeinstallprompt', ih) }
  }, []);

  function go(v: View) { setView(v); setSelected(null); history.pushState({}, '', v === 'home' ? '/' : v === 'admin' ? '/admin' : `/?view=${v}`); window.scrollTo(0, 0) }
  function open(t: Tournament, p: Player) { setSelected({ t: t.id, p: p.id }); setTab('overview'); setDetailError(''); setView('player'); history.pushState({}, '', `/?t=${encodeURIComponent(t.id)}&p=${encodeURIComponent(p.id)}`); window.scrollTo(0, 0) }

  useEffect(() => {
    if (!current || !player || player.detailsLoaded || current.demo) return;
    let dead = false;
    setDetailLoading(true);
    setDetailError('');
    apiFetch(`/api/player?t=${encodeURIComponent(current.id)}&p=${encodeURIComponent(player.id)}`).then(async r => {
      const d = await r.json() as any;
      if (!r.ok) throw Error(d.error);
      return d;
    }).then(d => {
      if (!dead) setTourneys(ts => ts.map(t => t.id === current.id ? { ...t, players: t.players.map(p => p.id === player.id ? d.player : p) } : t))
    }).catch(e => {
      if (!dead) setDetailError(e.message);
    }).finally(() => {
      if (!dead) setDetailLoading(false);
    });
    return () => { dead = true }
  }, [selected?.t, selected?.p, tourneys.length]);

  function bookmark(t: Tournament, p: Player) {
    const key = t.id + ':' + p.id, n = saved.includes(key) ? saved.filter(x => x !== key) : [...saved, key];
    setSaved(n);
    try { localStorage.setItem('chess-saved', JSON.stringify(n)) } catch { toast.error('Không thể lưu trên thiết bị này.') }
  }

  // SMART SEARCH ENGINE V2 matching across all tournaments and categories
  const results = all.flatMap(t => (t.players || []).map(p => ({ t, p }))).filter(({ t, p }) => (filter === 'all' || filter === t.id) && matchPlayer(p, t.group, q) && (view !== 'saved' || saved.includes(t.id + ':' + p.id)));

  const nav = [{ id: 'home', label: 'Trang chủ', icon: Home }, { id: 'search', label: 'Tìm kiếm', icon: Search }, { id: 'tournaments', label: 'Giải đấu', icon: Trophy }, { id: 'saved', label: 'Đã lưu', icon: Bookmark }];

  return <><Toaster position="top-center" richColors />
    <header className="app-header">
      <div className="header-inner">
        <button className="brand" onClick={() => go('home')} aria-label="Trang chủ">
          <img className="company-logo" src="/company-logo.png" alt="Logo Cờ Vua Sài Gòn" />
          <span><b>CỜ VUA SÀI GÒN</b><small>Nền tảng tra cứu giải đấu</small></span>
        </button>
        <nav className="desktop-nav">
          {nav.map(n => <button key={n.id} onClick={() => go(n.id as View)} className={view === n.id ? 'active' : ''}>{n.label}</button>)}
        </nav>
        <button className={'admin-link ' + (view === 'admin' ? 'active' : '')} onClick={() => go('admin')}>
          <ShieldCheck size={18} /><span>Quản trị</span>
        </button>
      </div>
    </header>

    <main className="app-main">
      {loadError && <div className="notice warning"><Info size={18} /><span>{loadError}</span><button onClick={reload}>Thử lại</button></div>}

      {view === 'home' && (
        <>
          <HeroSection q={q} setQ={setQ} onSearch={e => { e.preventDefault(); go('search'); }} />

          <section className="section">
            <div className="section-heading">
              <div><span className="eyebrow muted">CÙNG CON THEO DÕI</span><h2>Các giải đấu mới nhất</h2></div>
              <button className="text-btn" onClick={() => go('tournaments')}>Xem tất cả <ArrowUpRight size={17} /></button>
            </div>
            <div className="tournament-grid">
              {all.slice(0, 6).map(t => <TournamentCard key={t.id} t={t} onOpen={() => { setFilter(t.id); setQ(''); go('search') }} />)}
            </div>
            {!tourneys.length && !loading && <p className="subtle below">Chưa có giải đấu được công bố. Quản trị viên có thể dán link Chess-Results trong mục Quản trị.</p>}
          </section>

          <DynamicBanner banners={banners} onNavigate={v => go(v as View)} />

          <TournamentInfoSlider />
        </>
      )}

      {(view === 'search' || view === 'saved') && <>
        <div className="page-heading">
          <div>
            <span className="eyebrow">{view === 'saved' ? 'KỲ THỦ ĐÃ THEO DÕI' : 'HỆ THỐNG TÌM KIẾM'}</span>
            <h1>{view === 'saved' ? 'Kỳ thủ đã lưu' : 'Tìm kiếm kỳ thủ'}</h1>
            <p>{view === 'saved' ? 'Danh sách được lưu riêng trên thiết bị này.' : 'Tìm kiếm nhanh kết quả thi đấu của kỳ thủ'}</p>
          </div>
          <Search className="heading-icon pointer-events-none" size={40} />
        </div>

        <div className="filter-bar">
          <div className="input-wrap">
            <Search size={20} className="pointer-events-none" />
            <input aria-label="Tìm kỳ thủ" value={q} onChange={e => setQ(e.target.value)} placeholder="Nhập tên kỳ thủ" />
            {q && <button onClick={() => setQ('')} aria-label="Xóa tìm kiếm"><X size={18} /></button>}
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="picker" aria-label="Chọn giải"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả giải đấu & bảng đấu</SelectItem>
              {all.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.group || 'Toàn bảng'}){t.demo ? ' (minh họa)' : ''}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <p className="result-count">{loading ? 'Đang tải danh sách kỳ thủ…' : `${results.length} kỳ thủ phù hợp`} {q && <>cho từ khóa “<b>{q}</b>”</>}</p>

        <div className="player-grid">
          {results.slice(0, limit).map(({ t, p }) => (
            <button className="player-card" key={t.id + p.id} onClick={() => open(t, p)}>
              <Avatar p={p} />
              <span className="player-info">
                <strong>{p.name}</strong>
                <span>Bảng: {p.ageGroup || t.group || 'Chưa rõ'} · SBD {p.snr}</span>
                <small>{p.club || 'Chưa có thông tin đơn vị'}</small>
                <span className="tournament-link">{t.name}{t.demo ? ' · Minh họa' : ''}</span>
              </span>
              <span className="card-score">
                <b>{fmt(p.points)}<small style={{ fontSize: 11, fontWeight: 500 }}> điểm</small></b>
                <small>Hạng {fmt(p.rank)}</small>
                <ChevronRight size={19} />
              </span>
            </button>
          ))}
        </div>

        {results.length > limit && <button className="outline below" onClick={() => setLimit(limit + 100)}>Xem thêm {Math.min(100, results.length - limit)} kết quả</button>}
        {!results.length && !loading && <div className="empty">
          <Search size={32} />
          <h3>{view === 'saved' ? 'Chưa có kỳ thủ được lưu' : 'Không tìm thấy kỳ thủ'}</h3>
          <p>{view === 'saved' ? 'Mở hồ sơ kỳ thủ và nhấn biểu tượng lưu để theo dõi.' : 'Thử gõ không dấu, tìm theo tên riêng hoặc chọn giải đấu khác.'}</p>
          <button className="primary" onClick={() => { setFilter('all'); setQ(''); go('search') }}>Xem toàn bộ danh sách</button>
        </div>}
      </>}

      {view === 'tournaments' && <>
        <div className="page-heading">
          <div>
            <span className="eyebrow">DANH SÁCH GIẢI ĐẤU</span>
            <h1>Hệ thống Giải Cờ Vua Sài Gòn</h1>
            <p>Chọn từng giải đấu để xem bảng xếp hạng và danh sách kỳ thủ theo từng hạng mục.</p>
          </div>
          <Trophy size={44} className="heading-icon" />
        </div>
        <div className="tournament-grid">
          {all.map(t => <TournamentCard key={t.id} t={t} onOpen={() => { setFilter(t.id); setQ(''); go('search') }} />)}
        </div>
      </>}

      {view === 'player' && current && player && <>
        <button className="back" onClick={() => go('search')}><ArrowLeft size={17} /> Danh sách tìm kiếm</button>

        {current.demo && <div className="notice demo-notice"><Info size={17} /> Dữ liệu minh họa để trải nghiệm ứng dụng.</div>}

        <div className="profile-heading">
          <Avatar p={player} large />
          <div className="profile-name">
            <span className="eyebrow">Bảng đấu: {player.ageGroup || current.group}</span>
            <h1>{player.name}</h1>
            <p>{player.club || formatClubName(player.federation || '')}{player.federation && player.federation !== player.club ? ` (LĐ: ${player.federation})` : ''} <span className="desktop-only">· SBD {player.snr}</span> {player.fideId ? `· FIDE ID: ${player.fideId}` : ''}</p>
          </div>
          <button className={'save-btn ' + (saved.includes(current.id + ':' + player.id) ? 'saved' : '')} onClick={() => bookmark(current, player)} aria-label="Lưu kỳ thủ">
            <Bookmark size={21} fill={saved.includes(current.id + ':' + player.id) ? 'currentColor' : 'none'} />
            <span>{saved.includes(current.id + ':' + player.id) ? 'Đã lưu' : 'Lưu kỳ thủ'}</span>
          </button>
        </div>

        <div className="event-strip">
          <Trophy size={20} />
          <strong>{current.name}</strong>
          <span>{current.players ? current.players.length : 0} kỳ thủ</span>
          <span className="update"><Clock size={14} />{current.demo ? 'Bản minh họa' : current.updated ? 'Cập nhật ' + new Date(current.updated).toLocaleString('vi-VN') : 'Chưa đồng bộ'}</span>
        </div>

        {/* PLAYER DASHBOARD SECTION */}
        {(() => {
          const s = stats(player);
          const next = getNextMatch(player);
          const currentRank = player.rank ?? (current?.players ? (current.players.findIndex(x => x.id === player.id) + 1) : null);
          const totalCount = player.totalPlayers || (current?.players ? current.players.length : 0);
          const medal = getMedal(currentRank, player.ageGroup || current.group, current.prizes);

          let isNextWhite = false;
          let isNextBlack = false;
          if (next) {
            if (next.color === 'white') isNextWhite = true;
            else if (next.color === 'black') isNextBlack = true;
            else if (next.playerWhite && next.playerWhite.trim().toLowerCase() === player.name.trim().toLowerCase()) isNextWhite = true;
            else if (next.playerBlack && next.playerBlack.trim().toLowerCase() === player.name.trim().toLowerCase()) isNextBlack = true;
          }

          const nextWhiteName = next ? (isNextWhite ? player.name : (next.playerWhite && next.playerWhite !== player.name ? next.playerWhite : next.opponent)) : '';
          let nextBlackName = next ? (isNextBlack ? player.name : (next.playerBlack && next.playerBlack !== player.name ? next.playerBlack : next.opponent)) : '';
          if (nextWhiteName && nextBlackName && nextWhiteName.trim() === nextBlackName.trim()) {
            nextBlackName = isNextWhite ? (next?.opponent || 'Đối thủ') : player.name;
          }

          return (
            <>
              {/* 2. XẾP HẠNG & KPI DASHBOARD CARD */}
              <div className="player-dashboard-card" style={{ marginTop: 16 }}>
                <div className="dashboard-header-row">
                  <div className="dashboard-title-box">
                    <span style={{ fontSize: 28 }} title={medal ? medal.label : 'Dự kiến kết quả'}>{medal ? medal.medal : '♟'}</span>
                    <div>
                      <h2>Hồ sơ kỳ thủ · {player.name}</h2>
                      <span style={{ fontSize: 12, color: '#D4AF37', fontWeight: 600 }}>
                        SBD: <b>{player.snr}</b> · Bảng: <b>{player.ageGroup || current.group}</b> · Dự kiến: <b>{medal ? medal.label : 'Chưa có giải thưởng'}</b>
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {medal && (
                      <span className="soft-badge" style={{ background: 'rgba(212, 175, 55, 0.25)', color: '#D4AF37', border: '1px solid rgba(212, 175, 55, 0.4)', fontWeight: 800 }}>
                        {medal.medal} {medal.label}
                      </span>
                    )}
                    <span className="soft-badge" style={{ background: 'rgba(20, 93, 160, 0.15)', color: '#145DA0', border: '1px solid rgba(20, 93, 160, 0.3)', fontWeight: 700 }}>
                      CLB/Tỉnh: {player.club || formatClubName(player.federation || '')}
                    </span>
                  </div>
                </div>

                <div className="dashboard-grid">
                  <div className="dash-stat">
                    <span className="dash-stat-label">🏆 Hạng hiện tại</span>
                    <span className="dash-stat-val">{currentRank ? `${currentRank} / ${totalCount}` : '—'}</span>
                    <span className="dash-stat-sub">trên tổng số kỳ thủ bảng đấu</span>
                  </div>
                  <div className="dash-stat">
                    <span className="dash-stat-label">🎯 Tổng điểm số</span>
                    <span className="dash-stat-val">{fmt(player.points)} điểm</span>
                    <span className="dash-stat-sub">tích lũy qua các vòng</span>
                  </div>
                  <div className="dash-stat">
                    <span className="dash-stat-label">⚔️ Số ván thực đấu</span>
                    <span className="dash-stat-val">{s.played} ván</span>
                    <span className="dash-stat-sub">Thắng {s.wins} · Hòa {s.draws} · Thua {s.losses}</span>
                  </div>
                  <div className="dash-stat">
                    <span className="dash-stat-label">⚪ Cầm Trắng</span>
                    <span className="dash-stat-val">{s.white} ván</span>
                    <span className="dash-stat-sub">Thắng {s.whiteWins} · Hòa {s.whiteDraws} · Thua {s.whiteLosses}</span>
                  </div>
                  <div className="dash-stat">
                    <span className="dash-stat-label">⚫ Cầm Đen</span>
                    <span className="dash-stat-val">{s.black} ván</span>
                    <span className="dash-stat-sub">Thắng {s.blackWins} · Hòa {s.blackDraws} · Thua {s.blackLosses}</span>
                  </div>
                  <div className="dash-stat">
                    <span className="dash-stat-label">📈 Tỷ lệ thắng (Win rate)</span>
                    <span className="dash-stat-val">{s.winRate !== null ? `${s.winRate}%` : '—'}</span>
                    <span className="dash-stat-sub">hiệu suất tổng thể</span>
                  </div>
                  <div className="dash-stat">
                    <span className="dash-stat-label">🥇 Dự đoán giải thưởng</span>
                    <span className="dash-stat-val">{medal ? `${medal.medal} ${medal.label}` : 'Chưa đạt huy chương'}</span>
                    <span className="dash-stat-sub">theo cơ cấu giải</span>
                  </div>
                  <div className="dash-stat">
                    <span className="dash-stat-label">📊 Hệ số Buchholz / SB</span>
                    <span className="dash-stat-val">{fmt(player.buchholz ?? player.ties['BH'] ?? player.ties['Buchholz'])} / {fmt(player.sonnebornBerger ?? player.ties['SB'])}</span>
                    <span className="dash-stat-sub">Rp: {fmt(player.performance ?? player.ties['Rp']) || '—'}</span>
                  </div>
                </div>
              </div>

              {/* 3. PHẦN 1: VÁN TIẾP THEO HIGHLIGHT CARD */}
              <div className="next-match-card-highlight" style={{ background: 'linear-gradient(135deg, #062B4F 0%, #0F3C6E 100%)', borderRadius: 16, padding: 18, color: '#FFFFFF', marginTop: 16, boxShadow: '0 4px 20px rgba(6,43,79,0.15)', border: '1px solid #1E4D80' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#F4C542', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={16} /> ♟ VÁN TIẾP THEO
                  </span>
                  {next ? (
                    <span style={{ fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: 20 }}>
                      Trạng thái: <b>Đang chờ thi đấu</b>
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 700, background: 'rgba(34,197,94,0.2)', color: '#4ADE80', padding: '4px 12px', borderRadius: 20, border: '1px solid rgba(34,197,94,0.3)' }}>
                      ✓ Đã hoàn thành tất cả các ván đấu
                    </span>
                  )}
                </div>

                {next ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, background: '#D4AF37', color: '#062B4F', padding: '4px 10px', borderRadius: 8 }}>
                        Vòng {next.round}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#E2E8F0', background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 8 }}>
                        Bàn số: {next.board ? `#${next.board}` : 'Chưa xếp'}
                      </span>
                      <span className={isNextWhite ? 'white-piece' : isNextBlack ? 'black-piece' : 'subtle'} style={{ fontSize: 13, fontWeight: 700 }}>
                        {isNextWhite ? '⚪ Bạn cầm quân Trắng' : isNextBlack ? '⚫ Bạn cầm quân Đen' : 'Màu quân: Chưa rõ'}
                      </span>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 12, border: '1px solid rgba(255,255,255,0.1)', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: 8, textAlign: 'center' }}>
                        <div style={{ flex: 1, minWidth: 120 }}>
                          <small style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 2 }}>Cầm quân Trắng</small>
                          <strong style={{ fontSize: 15, fontWeight: 800, color: isNextWhite ? '#F4C542' : '#FFFFFF' }}>
                            ⚪ {nextWhiteName} {isNextWhite ? '(Bạn)' : ''}
                          </strong>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 900, color: '#D4AF37', padding: '0 8px' }}>VS</div>
                        <div style={{ flex: 1, minWidth: 120 }}>
                          <small style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 2 }}>Cầm quân Đen</small>
                          <strong style={{ fontSize: 15, fontWeight: 800, color: isNextBlack ? '#F4C542' : '#FFFFFF' }}>
                            ⚫ {nextBlackName} {isNextBlack ? '(Bạn)' : ''}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {next.opponentId && (
                      <div style={{ textAlign: 'right' }}>
                        <button
                          className="saas-btn-gold"
                          style={{ height: 36, padding: '0 16px', fontSize: 13, fontWeight: 700 }}
                          onClick={() => {
                            const opp = current.players.find(x => x.id === next.opponentId);
                            if (opp) open(current, opp);
                          }}
                        >
                          Xem Hồ Sơ Đối Thủ ➔
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '6px 0', fontSize: 14, color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Trophy size={18} style={{ color: '#F4C542' }} />
                    <span>Đã hoàn thành tất cả các ván đấu</span>
                  </div>
                )}
              </div>

              {/* 4. PHẦN 2: THÀNH TÍCH GIẢI ĐẤU CARD */}
              <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E2E8F0', padding: 18, marginTop: 16, boxShadow: '0 2px 8px rgba(6,43,79,0.04)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#062B4F', marginTop: 0, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Trophy size={18} style={{ color: '#D4AF37' }} />
                  <span>THÀNH TÍCH GIẢI ĐẤU</span>
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 4 }}>
                      🏆 Xếp hạng hiện tại
                    </span>
                    <strong style={{ fontSize: 18, fontWeight: 800, color: '#062B4F' }}>
                      Hạng {currentRank ? currentRank : '—'} / {totalCount} kỳ thủ
                    </strong>
                    <small style={{ fontSize: 11, color: '#64748B', display: 'block', marginTop: 2 }}>
                      bảng {player.ageGroup || current.group}
                    </small>
                  </div>

                  <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 4 }}>
                      🥇 Dự kiến đạt
                    </span>
                    <strong style={{ fontSize: 17, fontWeight: 800, color: medal ? '#B45309' : '#475569', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{medal ? medal.medal : '🎖️'}</span>
                      <span>{medal ? medal.label : 'Chưa đạt huy chương'}</span>
                    </strong>
                    <small style={{ fontSize: 11, color: '#64748B', display: 'block', marginTop: 2 }}>
                      theo cơ cấu giải thưởng ban tổ chức
                    </small>
                  </div>
                </div>
              </div>
            </>
          );
        })()}

        <Tabs value={tab} onValueChange={setTab} className="profile-tabs">
          <TabsList className="main-tabs">
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="results">Chi tiết ván đấu</TabsTrigger>
            <TabsTrigger value="ranking">Bảng xếp hạng</TabsTrigger>
            <TabsTrigger value="charts">Biểu đồ thi đấu</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="profile-grid">
              <div>
                <div className="score-panel">
                  <div className="score-top">
                    <div><span>Điểm số hiện tại</span><strong>{fmt(player.points)}<small> điểm</small></strong></div>
                    <div><span>Xếp hạng trong bảng</span><strong>{fmt(player.rank)}<small> / {current.players ? current.players.length : 0}</small></strong></div>
                  </div>
                  <div className="tie-row">
                    <div><span>Buchholz (BH)</span><b>{fmt(player.buchholz ?? player.ties['BH'] ?? player.ties['Buchholz'])}</b></div>
                    <div><span>Sonneborn Berger (SB)</span><b>{fmt(player.sonnebornBerger ?? player.ties['SB'])}</b></div>
                    <div><span>Performance (RP)</span><b>{fmt(player.performance ?? player.ties['Rp'] ?? player.ties['Performance'])}</b></div>
                    <div><span>Hệ số Elo</span><b>{fmt(player.rating)}</b></div>
                  </div>
                </div>

                <Statistics p={player} />

                <div className="encouragement">
                  <span>♞</span>
                  <p>“Mỗi ván cờ là một bài học,<br />mỗi đối thủ là một người bạn.”<small>CỜ VUA SÀI GÒN ACADEMY</small></p>
                </div>
              </div>

              <section className="panel recent-panel">
                <div className="section-heading">
                  <h2>Hành trình thi đấu qua các vòng</h2>
                  <button className="text-btn" onClick={() => setTab('results')}>Xem chi tiết <ChevronRight size={16} /></button>
                </div>
                <Rounds p={player} loading={detailLoading} error={detailError} compact onOpponent={id => { const p = current.players.find(p => p.id === id); if (p) open(current, p) }} />
              </section>
            </div>
          </TabsContent>

          <TabsContent value="results">
            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>Kết quả chi tiết từng ván</h2>
                  <p className="subtle">Góc nhìn thi đấu của kỳ thủ {player.name}.</p>
                </div>
                <span className="soft-badge">{stats(player).played} ván thực đấu</span>
              </div>
              <Rounds p={player} loading={detailLoading} error={detailError} onOpponent={id => { const p = current.players.find(p => p.id === id); if (p) open(current, p) }} />
            </section>
          </TabsContent>

          <TabsContent value="ranking">
            <Ranking t={current} selected={player.id} onOpen={p => open(current, p)} />
          </TabsContent>

          <TabsContent value="charts">
            <PlayerCharts p={player} />
          </TabsContent>
        </Tabs>

        <div className="profile-actions">
          <button className="outline" onClick={async () => {
            try {
              if (navigator.share) await navigator.share({ title: `${player.name} · ${current.name}`, url: location.href });
              else { await navigator.clipboard.writeText(location.href); toast.success('Đã sao chép liên kết kết quả') }
            } catch (e) { if ((e as Error).name !== 'AbortError') toast.error('Bạn có thể sao chép địa chỉ trên trình duyệt.') }
          }}><Share2 size={17} />Chia sẻ kết quả</button>
          <button className="outline" onClick={() => window.print()}><Printer size={17} />In / Lưu PDF</button>
          {current.source && <a className="text-btn" href={current.source} target="_blank" rel="noreferrer">Xem Chess-Results gốc <ArrowUpRight size={16} /></a>}
        </div>

        <div className="print-rounds">
          <h2>Kết quả từng vòng</h2>
          <Rounds p={player} loading={false} error={detailError} onOpponent={() => { }} />
        </div>
      </>}

      {view === 'player' && !player && <div className="empty">
        <Trophy size={32} />
        <h2>{loading ? 'Đang tải hồ sơ…' : 'Chưa tìm thấy hồ sơ kỳ thủ này'}</h2>
        <p>Giải đấu có thể chưa được công bố hoặc đường dẫn không hợp lệ.</p>
        <button className="primary" onClick={() => go('search')}>Tra cứu kỳ thủ</button>
      </div>}

      {view === 'admin' && <Admin onChanged={reload} />}
    </main>

    <footer className="app-footer">
      <span>CỜ VUA SÀI GÒN</span>
      <p>Nền tảng tra cứu kết quả giải đấu</p>
    </footer>

    <nav className="mobile-nav">
      {nav.map(n => <button key={n.id} className={view === n.id ? 'active' : ''} onClick={() => go(n.id as View)}><n.icon size={24} /><span>{n.label}</span></button>)}
    </nav>
  </>;
}

function TournamentCard({ t, onOpen }: { t: Tournament; onOpen: () => void }) {
  return <article className="tournament-card">
    <div className="tournament-banner">
      <div>
        <span className="banner-label">{t.demo ? 'BẢN MINH HỌA' : '♟ CHESS-RESULTS'}</span>
        <strong>{t.name}</strong>
        <span>Bảng: {t.group || 'Toàn giải'}</span>
      </div>
      <Trophy size={48} strokeWidth={1.4} />
    </div>
    <div className="tournament-body">
      <div className="tournament-meta">
        <span><Users size={16} />{t.players ? t.players.length : 0} kỳ thủ</span>
        <span><Medal size={16} />{t.rounds ? `${t.rounds} vòng` : 'Trực tiếp'}</span>
      </div>
      <div className="card-bottom">
        <span className={'soft-badge ' + (t.demo ? 'demo' : '')}>{t.demo ? 'Trải nghiệm thử' : 'Đã đồng bộ'}</span>
        <button className="primary" onClick={onOpen}>Xem kết quả <ChevronRight size={16} /></button>
      </div>
    </div>
  </article>
}

function Statistics({ p }: { p: Player }) {
  const s = stats(p);
  return (
    <section className="statistics" style={{ background: '#FFFFFF', padding: 20, borderRadius: 16, border: '1px solid #E2E8F0', marginTop: 16 }}>
      <h2 style={{ fontSize: 16, fontWeight: 800, color: '#062B4F', marginTop: 0, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <BarChart3 size={18} style={{ color: '#145DA0' }} /> Thống kê thi đấu chi tiết
      </h2>
      <div className="stat-grid">
        {[{ icon: <LayoutDashboard />, label: 'Số ván', n: s.played, c: 'blue' },
        { icon: <Check />, label: 'Thắng', n: s.wins, c: 'green' },
        { icon: <Minus />, label: 'Hòa', n: s.draws, c: 'amber' },
        { icon: <X />, label: 'Thua', n: s.losses, c: 'red' }].map(x =>
          <div className="stat-card" key={x.label}>
            <span className={'stat-icon ' + x.c}>{x.icon}</span>
            <span>{x.label}</span>
            <b>{p.detailsLoaded ? x.n : '—'}</b>
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, background: '#F8FAFC', padding: 14, borderRadius: 12, border: '1px solid #CBD5E1' }}>
        <h3 style={{ fontSize: 13, fontWeight: 800, color: '#062B4F', marginTop: 0, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          THỐNG KÊ MÀU QUÂN
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 10, border: '1px solid #CBD5E1', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="white-piece" style={{ fontSize: 14, fontWeight: 700 }}>⚪ Trắng</span>
              <strong style={{ fontSize: 16, fontWeight: 800, color: '#145DA0' }}>{p.detailsLoaded ? `${s.white} ván` : '—'}</strong>
            </div>
            <div style={{ display: 'flex', gap: 10, fontSize: 12, fontWeight: 600, color: '#475569', paddingTop: 6, borderTop: '1px dashed #E2E8F0' }}>
              <span style={{ color: '#166534' }}>Thắng: <b>{s.whiteWins}</b></span>
              <span style={{ color: '#854D0E' }}>Hòa: <b>{s.whiteDraws}</b></span>
              <span style={{ color: '#991B1B' }}>Thua: <b>{s.whiteLosses}</b></span>
            </div>
          </div>

          <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 10, border: '1px solid #CBD5E1', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="black-piece" style={{ fontSize: 14, fontWeight: 700 }}>⚫ Đen</span>
              <strong style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>{p.detailsLoaded ? `${s.black} ván` : '—'}</strong>
            </div>
            <div style={{ display: 'flex', gap: 10, fontSize: 12, fontWeight: 600, color: '#475569', paddingTop: 6, borderTop: '1px dashed #E2E8F0' }}>
              <span style={{ color: '#166534' }}>Thắng: <b>{s.blackWins}</b></span>
              <span style={{ color: '#854D0E' }}>Hòa: <b>{s.blackDraws}</b></span>
              <span style={{ color: '#991B1B' }}>Thua: <b>{s.blackLosses}</b></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlayerCharts({ p }: { p: Player }) {
  const s = stats(p);
  if (!p.rounds || !p.rounds.length) {
    return <section className="panel"><p className="empty-text">Chưa có đủ dữ liệu ván đấu để vẽ biểu đồ.</p></section>;
  }

  let cumulative = 0;
  const progressData = p.rounds.map(r => {
    cumulative += r.score ?? 0;
    return {
      round: `Vòng ${r.round}`,
      points: cumulative,
      score: r.score
    };
  });

  const pieData = [
    { name: 'Thắng', value: s.wins, color: '#169b62' },
    { name: 'Hòa', value: s.draws, color: '#d69418' },
    { name: 'Thua', value: s.losses, color: '#d93848' }
  ].filter(d => d.value > 0);

  return <div className="profile-grid">
    <section className="panel">
      <div className="section-heading">
        <h2><TrendingUp size={18} style={{ marginRight: 6 }} /> Tiến trình tích lũy điểm qua các vòng</h2>
      </div>
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={progressData}>
            <defs>
              <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0077B6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#0077B6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="round" stroke="#657b96" fontSize={12} />
            <YAxis stroke="#657b96" fontSize={12} />
            <RechartsTooltip contentStyle={{ background: '#003B6F', color: '#fff', borderRadius: 8 }} />
            <Area type="monotone" dataKey="points" name="Tổng điểm" stroke="#F4C542" strokeWidth={3} fillOpacity={1} fill="url(#colorPoints)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>

    <section className="panel">
      <div className="section-heading">
        <h2><PieIcon size={18} style={{ marginRight: 6 }} /> Tỷ lệ Thắng - Hòa - Thua</h2>
      </div>
      <div style={{ width: '100%', height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <RechartsTooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </section>
  </div>
}

function Rounds({ p, loading, error, compact = false, onOpponent }: { p: Player; loading: boolean; error: string; compact?: boolean; onOpponent: (id: string) => void }) {
  if (loading) return <p className="notice">Đang tải chi tiết các ván đấu…</p>;
  if (error) return <p className="notice warning">{error}</p>;
  if (!p.rounds.length) return <p className="empty-text">Chưa có chi tiết từng ván. Điểm và thứ hạng được giữ theo nguồn.</p>;

  return (
    <>
      <div className={'round-list ' + (compact ? 'compact' : '')}>
        <div className="round-head"><span>Vòng & Bàn</span><span style={{ textAlign: 'center' }}>Màu</span><span>Đối thủ</span><span>Kết quả ván</span></div>
        {p.rounds.map(r => {
          const isWhite = r.color === 'white' || (r.playerWhite && r.playerWhite.trim().toLowerCase() === p.name.trim().toLowerCase());
          const isBlack = r.color === 'black' || (r.playerBlack && r.playerBlack.trim().toLowerCase() === p.name.trim().toLowerCase());

          let resClass = 'pending';
          let resText = '—';
          if (r.status === 'played') {
            if (r.score === 1) { resClass = 'win'; resText = 'THẮNG 1 - 0'; }
            else if (r.score === 0.5) { resClass = 'draw'; resText = 'HÒA 0.5 - 0.5'; }
            else if (r.score === 0) { resClass = 'loss'; resText = 'THUA 0 - 1'; }
          } else if (r.status === 'bye') {
            resClass = 'win'; resText = 'BYE 1 - 0';
          } else if (r.status === 'forfeit') {
            resClass = r.score === 1 ? 'win' : 'loss'; resText = r.score === 1 ? 'THẮNG 1 - 0' : 'THUA 0 - 1';
          }

          return (
            <div className="round-row" key={r.round}>
              <span className="round-num" style={{ whiteSpace: 'nowrap' }}>Vòng {String(r.round).padStart(2, '0')}{r.board ? ` · Bàn ${r.board}` : ''}</span>
              <span className="color-icon" style={{ textAlign: 'center', fontSize: 16 }}>
                {isWhite ? '⚪' : isBlack ? '⚫' : '—'}
              </span>
              <div className="opponent" style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {r.opponentId ? (
                  <button style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', display: 'inline-block' }} onClick={() => onOpponent(r.opponentId!)}>{r.opponent}</button>
                ) : (
                  <strong style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', display: 'inline-block' }}>{r.opponent || 'Chưa có đối thủ'}</strong>
                )}
                {r.rating && <small style={{ color: '#657b96', marginLeft: 6 }}>Elo {r.rating}</small>}
              </div>
              <div className="round-result">
                <span className={`result-badge ${resClass}`}>{resText}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mobile-match-cards">
        {p.rounds.map(r => {
          const isWhite = r.color === 'white' || (r.playerWhite && r.playerWhite.trim().toLowerCase() === p.name.trim().toLowerCase());
          const isBlack = r.color === 'black' || (r.playerBlack && r.playerBlack.trim().toLowerCase() === p.name.trim().toLowerCase());

          let resClass = 'pending';
          let resText = '—';
          if (r.status === 'played') {
            if (r.score === 1) { resClass = 'win'; resText = 'THẮNG 1 - 0'; }
            else if (r.score === 0.5) { resClass = 'draw'; resText = 'HÒA 0.5 - 0.5'; }
            else if (r.score === 0) { resClass = 'loss'; resText = 'THUA 0 - 1'; }
          } else if (r.status === 'bye') {
            resClass = 'win'; resText = 'BYE 1 - 0';
          } else if (r.status === 'forfeit') {
            resClass = r.score === 1 ? 'win' : 'loss'; resText = r.score === 1 ? 'THẮNG 1 - 0' : 'THUA 0 - 1';
          }

          return (
            <div className="mobile-match-card" key={r.round} style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E2E8F0', padding: 14, marginBottom: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <div className="match-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #F1F5F9' }}>
                <span className="match-card-round" style={{ fontSize: 13, fontWeight: 800, color: '#062B4F' }}>
                  Vòng {r.round} {r.board ? `· Bàn ${r.board}` : ''}
                </span>
                <span className="color-icon" style={{ fontSize: 16 }}>
                  {isWhite ? '⚪' : isBlack ? '⚫' : '—'}
                </span>
              </div>

              <div style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600, display: 'block', marginBottom: 2 }}>Đối thủ:</span>
                <div className="opponent" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.opponentId ? (
                    <button style={{ fontSize: 15, fontWeight: 800, color: '#145DA0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }} onClick={() => onOpponent(r.opponentId!)}>
                      {r.opponent} ➔
                    </button>
                  ) : (
                    <strong style={{ fontSize: 15, fontWeight: 800, color: '#062B4F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>{r.opponent || 'Chưa có đối thủ'}</strong>
                  )}
                  {r.rating && <small style={{ color: '#64748B', display: 'block', marginTop: 2 }}>Elo: {r.rating}</small>}
                </div>
              </div>

              <div className="match-card-footer" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingTop: 8, borderTop: '1px dashed #F1F5F9' }}>
                <span className={`result-badge ${resClass}`}>{resText}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Ranking({ t, selected, onOpen }: { t: Tournament; selected: string; onOpen: (p: Player) => void }) {
  const [q, setQ] = useState('');
  const ps = (t.players || []).filter(p => matchPlayer(p, t.group, q));

  return <section className="panel ranking">
    <div className="section-heading">
      <h2>Bảng xếp hạng toàn giải</h2>
      <span className="soft-badge">{t.group || 'Toàn bảng'}</span>
    </div>
    <div className="filter-bar">
      <div className="input-wrap">
        <Search size={18} />
        <input aria-label="Tìm trong bảng xếp hạng" value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm tên có dấu/không dấu, SBD, CLB..." />
      </div>
      <button className="outline" onClick={() => { setQ(''); setTimeout(() => document.getElementById('selected-player')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50) }}>Vị trí của con</button>
    </div>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Hạng</TableHead>
          <TableHead>Họ và tên kỳ thủ</TableHead>
          <TableHead>CLB / Tỉnh</TableHead>
          <TableHead>SBD</TableHead>
          <TableHead>Điểm</TableHead>
          <TableHead>Buchholz (BH)</TableHead>
          <TableHead>Sonneborn Berger (SB)</TableHead>
          <TableHead>Performance (RP)</TableHead>
          <TableHead>Số ván đấu</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ps.map((p, idx) => {
          const rankVal = p.rank ?? (idx + 1);
          const bhVal = p.buchholz ?? p.ties['BH'] ?? p.ties['Buchholz'] ?? p.ties['BH.'] ?? p.ties['BH-1'] ?? p.ties['TB2'] ?? p.ties['TB1'] ?? null;
          const sbVal = p.sonnebornBerger ?? p.ties['SB'] ?? p.ties['Sonneborn'] ?? p.ties['SB.'] ?? p.ties['TB3'] ?? p.ties['TB5'] ?? null;
          const rpVal = p.performance ?? p.ties['Rp'] ?? p.ties['Performance'] ?? p.ties['RP'] ?? null;
          const gamesCount = p.detailsLoaded ? `${stats(p).played} ván` : (t.rounds ? `${t.rounds} ván` : '—');
          const clubName = p.club || formatClubName(p.federation || '');

          return (
            <TableRow key={p.id} id={p.id === selected ? 'selected-player' : undefined} className={p.id === selected ? 'selected-row' : ''}>
              <TableCell><span className={rankVal <= 3 ? 'rank-medal' : 'rank-number'}>{rankVal}</span></TableCell>
              <TableCell>
                <button className="rank-player" onClick={() => onOpen(p)}>
                  <b>{p.name}</b>
                </button>
              </TableCell>
              <TableCell>{clubName}</TableCell>
              <TableCell>{p.snr}</TableCell>
              <TableCell className="points">{fmt(p.points)}</TableCell>
              <TableCell>{fmt(bhVal)}</TableCell>
              <TableCell>{fmt(sbVal)}</TableCell>
              <TableCell>{fmt(rpVal)}</TableCell>
              <TableCell>{gamesCount}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    {!ps.length && <p className="empty-text">Không có kết quả phù hợp.</p>}
    <p className="subtle below">{t.demo ? 'Bảng xếp hạng minh họa.' : 'Thứ hạng và các hệ số theo phiên đồng bộ Chess-Results mới nhất.'}</p>
  </section>
}

function TournamentInfoSlides({ tournamentId }: { tournamentId: string }) {
  const [slides, setSlides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    let dead = false;
    setLoading(true);
    apiFetch(`/api/slides?tournament_id=${encodeURIComponent(tournamentId)}`)
      .then(r => r.json())
      .then(data => {
        if (!dead && data.slides) setSlides(data.slides);
      })
      .catch(() => {})
      .finally(() => {
        if (!dead) setLoading(false);
      });
    return () => { dead = true; };
  }, [tournamentId]);

  if (loading) return null;
  if (!slides || slides.length === 0) return null;

  const slideTypesOrder = [
    'Banner chính',
    'Điều lệ giải đấu',
    'Hướng dẫn thi đấu',
    'Cơ cấu giải thưởng',
    'Lịch thi đấu',
    'Địa điểm tổ chức',
    'Thông báo quan trọng',
    'Nhà tài trợ',
    'Khác'
  ];

  const typeIcons: Record<string, string> = {
    'Banner chính': '🖼️',
    'Điều lệ giải đấu': '🏆',
    'Hướng dẫn thi đấu': '📜',
    'Cơ cấu giải thưởng': '🎁',
    'Lịch thi đấu': '📅',
    'Địa điểm tổ chức': '📍',
    'Thông báo quan trọng': '📢',
    'Nhà tài trợ': '🤝',
    'Khác': '📌'
  };

  const grouped: Record<string, any[]> = {};
  for (const s of slides) {
    const st = s.slide_type || 'Khác';
    if (!grouped[st]) grouped[st] = [];
    grouped[st].push(s);
  }

  return (
    <section className="panel" style={{ marginTop: 20 }}>
      <div className="section-heading">
        <h2><Info size={20} style={{ marginRight: 6 }} /> Thông tin giải đấu</h2>
        <span className="soft-badge">{slides.length} hình ảnh / slide thông tin</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {slideTypesOrder.map(type => {
          const list = grouped[type];
          if (!list || list.length === 0) return null;

          return (
            <div key={type} style={{ background: '#F8FAFC', padding: 18, borderRadius: 16, border: '1px solid #CBD5E1' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#062B4F', marginTop: 0, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{typeIcons[type] || '📌'}</span>
                <span>{type}</span>
                <small style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>({list.length} hình ảnh)</small>
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {list.map((item: any) => (
                  <div
                    key={item.id}
                    onClick={() => setActiveImage({ url: item.image_url, title: item.title })}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 12,
                      border: '1px solid #E2E8F0',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(6,43,79,0.06)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                  >
                    <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#062B4F' }}>
                      <img
                        src={item.image_url}
                        alt={item.title}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                        loading="lazy"
                      />
                    </div>
                    <div style={{ padding: 12 }}>
                      <strong style={{ fontSize: 13, color: '#062B4F', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </strong>
                      <span style={{ fontSize: 11, color: '#145DA0', fontWeight: 700, marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span>Xem kích thước đầy đủ 🔍</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {activeImage && (
        <div
          onClick={() => setActiveImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
            background: 'rgba(6, 43, 79, 0.92)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            backdropFilter: 'blur(4px)'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 10, color: '#FFFFFF' }}>
              <span style={{ fontSize: 16, fontWeight: 800, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '80vw' }}>
                {activeImage.title}
              </span>
              <button
                type="button"
                onClick={() => setActiveImage(null)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#FFFFFF', borderRadius: 99, padding: '6px 14px', cursor: 'pointer', fontWeight: 800, fontSize: 14 }}
              >
                ✕ Đóng
              </button>
            </div>

            <img
              src={activeImage.url}
              alt={activeImage.title}
              style={{ maxWidth: '92vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 20px 50px rgba(0,0,0,0.5)', border: '2px solid rgba(255,255,255,0.2)' }}
            />
          </div>
        </div>
      )}
    </section>
  );
}

function TournamentInfoSlider() {
  const [slides, setSlides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeImage, setActiveImage] = useState<{ url: string; title: string } | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useEffect(() => {
    let dead = false;
    apiFetch('/api/home/slides')
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.slides || []);
        if (!dead && list.length > 0) {
          setSlides(list);
        } else if (!dead) {
          apiFetch('/api/slides/home')
            .then(r2 => r2.json())
            .then(data2 => {
              const list2 = Array.isArray(data2) ? data2 : (data2.slides || []);
              if (!dead && list2.length > 0) setSlides(list2);
            })
            .catch(() => {});
        }
      })
      .catch(() => {
        if (!dead) {
          apiFetch('/api/slides/home')
            .then(r2 => r2.json())
            .then(data2 => {
              const list2 = Array.isArray(data2) ? data2 : (data2.slides || []);
              if (!dead && list2.length > 0) setSlides(list2);
            })
            .catch(() => {});
        }
      })
      .finally(() => {
        if (!dead) setLoading(false);
      });
    return () => { dead = true; };
  }, []);

  // Auto-slide every 5 seconds
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (loading || slides.length === 0) return null;

  const currentSlide = slides[currentIndex] || slides[0];

  const handlePrev = () => {
    setCurrentIndex(prev => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % slides.length);
  };

  const minSwipeDistance = 40;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }
  };

  const slideTypeIcons: Record<string, string> = {
    'Điều lệ giải đấu': '📄',
    'Hướng dẫn thi đấu': '📜',
    'Lịch thi đấu': '📅',
    'Sơ đồ giải': '🗺️',
    'Cơ cấu giải thưởng': '🎁',
    'Thông tin giải đấu': 'ℹ️',
    'Banner chính': '🖼️',
    'Địa điểm tổ chức': '📍',
    'Thông báo quan trọng': '📢',
    'Nhà tài trợ': '🤝',
    'Khác': '📌'
  };

  return (
    <section className="section" style={{ maxWidth: 1200, margin: '24px auto 32px auto', width: '100%', padding: '0 16px' }}>
      <div className="section-heading" style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <span className="eyebrow muted" style={{ letterSpacing: '0.05em', fontSize: 11, fontWeight: 800, color: '#145DA0', display: 'block', marginBottom: 4 }}>
            SLIDE THÔNG TIN GIẢI ĐẤU ⭐⭐⭐
          </span>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#062B4F', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info size={22} style={{ color: '#145DA0' }} />
            <span>Thông tin & Điều lệ giải đấu</span>
          </h2>
          <p style={{ fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 0 }}>
            Điều lệ, lịch thi đấu, sơ đồ thi đấu, cơ cấu giải thưởng & hướng dẫn phụ huynh
          </p>
        </div>
        {slides.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handlePrev}
              aria-label="Slide trước"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#062B4F',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                transition: 'all 0.2s ease'
              }}
            >
              <ChevronLeft size={18} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#64748B', minWidth: 42, textAlign: 'center' }}>
              {currentIndex + 1} / {slides.length}
            </span>
            <button
              onClick={handleNext}
              aria-label="Slide tiếp theo"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                color: '#062B4F',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                transition: 'all 0.2s ease'
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      <div
        className="tournament-info-slider-container"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 16px rgba(6,43,79,0.06)',
          overflow: 'hidden',
          position: 'relative',
          width: '100%'
        }}
      >
        {/* Slide Image Box */}
        <div
          className="tournament-info-slider-card"
          onClick={() => setActiveImage({ url: currentSlide.image_url, title: currentSlide.title })}
          style={{
            position: 'relative',
            width: '100%',
            background: '#F8FAFC',
            cursor: 'pointer',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <img
            src={currentSlide.image_url}
            alt={currentSlide.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block'
            }}
            loading="lazy"
          />

          {/* Overlay badge */}
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              background: 'rgba(6, 43, 79, 0.85)',
              backdropFilter: 'blur(4px)',
              color: '#FFFFFF',
              padding: '4px 12px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span>{slideTypeIcons[currentSlide.slide_type] || '📌'}</span>
            <span>{currentSlide.slide_type || 'Thông tin giải đấu'}</span>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              background: 'rgba(6, 43, 79, 0.85)',
              backdropFilter: 'blur(4px)',
              color: '#FFFFFF',
              padding: '6px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Search size={14} /> Phóng to xem chi tiết
          </div>

          {/* Navigation Arrows Overlay */}
          {slides.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                aria-label="Slide trước"
                style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.85)',
                  color: '#062B4F',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  zIndex: 2
                }}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                aria-label="Slide kế tiếp"
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.85)',
                  color: '#062B4F',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  zIndex: 2
                }}
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>

        {/* Slide Footer Info & Dots */}
        <div style={{ padding: '12px 18px', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, borderTop: '1px solid #F1F5F9' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#062B4F', margin: 0, lineHeight: 1.3 }}>
              {currentSlide.title}
            </h3>
            {currentSlide.tournament_name && (
              <span style={{ fontSize: 12, color: '#64748B', marginTop: 2, display: 'block' }}>
                Giải đấu: <strong>{currentSlide.tournament_name}</strong>
              </span>
            )}
          </div>

          {/* Pagination Dots */}
          {slides.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Chuyển slide ${idx + 1}`}
                  style={{
                    width: idx === currentIndex ? 24 : 8,
                    height: 8,
                    borderRadius: 4,
                    background: idx === currentIndex ? '#145DA0' : '#CBD5E1',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {activeImage && (
        <div
          onClick={() => setActiveImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
            background: 'rgba(6, 43, 79, 0.94)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <button
            onClick={() => setActiveImage(null)}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              background: 'rgba(255,255,255,0.2)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '50%',
              width: 44,
              height: 44,
              fontSize: 22,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}
          >
            ✕
          </button>
          <img
            src={activeImage.url}
            alt={activeImage.title}
            style={{
              maxWidth: '95vw',
              maxHeight: '85vh',
              objectFit: 'contain',
              borderRadius: 8,
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}
          />
          <span style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 700, marginTop: 14, textAlign: 'center' }}>
            {activeImage.title}
          </span>
        </div>
      )}
    </section>
  );
}
