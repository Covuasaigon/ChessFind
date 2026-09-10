'use client';
import { useEffect, useState } from 'react';
import { Search, Trophy, Home, Bookmark, ChevronRight, ArrowLeft, ArrowUpRight, Users, ShieldCheck, RefreshCw, Share2, Printer, Check, Minus, X, LayoutDashboard, Link as LinkIcon, Plus, Info, Clock, Medal, BarChart3, Download, TrendingUp, PieChart as PieIcon } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Toaster, toast } from 'sonner';
import { Tournament, Player, makeDemo, normalize, matchPlayer, fmt, stats } from '@/lib/chess';
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
        fetch('/api/tournaments'),
        fetch('/api/banners')
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
    fetch(`/api/player?t=${encodeURIComponent(current.id)}&p=${encodeURIComponent(player.id)}`).then(async r => {
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

      {view === 'home' && (() => {
        const activeBanner = banners.find(b => b.is_active === 1 && b.image_url && b.image_url !== '/company-logo.png') || banners.find(b => b.is_active === 1);
        const heroConfig = activeBanner?.image_url ? { heroImage: activeBanner.image_url } : undefined;
        return (
          <>
            <HeroSection q={q} setQ={setQ} onSearch={e => { e.preventDefault(); go('search'); }} config={heroConfig} />

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
          </>
        );
      })()}

      {(view === 'search' || view === 'saved') && <>
        <div className="page-heading">
          <div>
            <span className="eyebrow">{view === 'saved' ? 'KỲ THỦ ĐÃ THEO DÕI' : 'HỆ THỐNG TÌM KIẾM'}</span>
            <h1>{view === 'saved' ? 'Kỳ thủ đã lưu' : 'Tìm kiếm kỳ thủ'}</h1>
            <p>{view === 'saved' ? 'Danh sách được lưu riêng trên thiết bị này.' : 'Tìm kiếm nhanh kết quả thi đấu của kỳ thủ'}</p>
          </div>
          <Search className="heading-icon" size={40} />
        </div>

        <div className="filter-bar">
          <div className="input-wrap">
            <Search size={20} />
            <input aria-label="Tìm kỳ thủ" value={q} onChange={e => setQ(e.target.value)} placeholder="Nhập tên kỳ thủ, SBD hoặc mã FIDE" />
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
            <p>{player.club || 'Chưa có thông tin đơn vị'} <span className="desktop-only">· SBD {player.snr}</span> {player.fideId ? `· FIDE ID: ${player.fideId}` : ''}</p>
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
  return <section className="statistics">
    <h2>Thống kê thi đấu</h2>
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
    <div className="mini-stats">
      <span>♙ Cầm Trắng <b>{p.detailsLoaded ? s.white : '—'}</b></span>
      <span>♟ Cầm Đen <b>{p.detailsLoaded ? s.black : '—'}</b></span>
      <span><BarChart3 size={17} /> Tỷ lệ thắng <b>{p.detailsLoaded && s.winRate !== null ? fmt(Math.round(s.winRate * 10) / 10) + '%' : '—'}</b></span>
    </div>
  </section>
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

  return <div className={'round-list ' + (compact ? 'compact' : '')}>
    <div className="round-head"><span>Vòng & Bàn</span><span>Màu quân</span><span>Đối thủ / Trắng vs Đen</span><span>Kết quả ván</span></div>
    {p.rounds.map(r =>
      <div className="round-row" key={r.round}>
        <span className="round-num">Vòng {String(r.round).padStart(2, '0')}{r.board ? ` · Bàn ${r.board}` : ''}</span>
        <span className={'piece ' + r.color} title={r.color === 'white' ? 'Cầm quân Trắng' : r.color === 'black' ? 'Cầm quân Đen' : 'Chưa có màu quân'}>
          {r.color === 'white' ? '♙ Trắng' : r.color === 'black' ? '♟ Đen' : '—'}
        </span>
        <div className="opponent">
          {r.opponentId ? <button onClick={() => onOpponent(r.opponentId!)}>{r.opponent}</button> : <strong>{r.opponent || 'Chưa có đối thủ'}</strong>}
          <small style={{ color: '#657b96' }}>
            {r.playerWhite && r.playerBlack ? `${r.playerWhite} (Trắng) vs ${r.playerBlack} (Đen)` : ''}
            {r.rating ? ` · Elo ${r.rating}` : r.status === 'bye' ? 'Miễn đấu' : ''}
          </small>
        </div>
        <span className={'round-result ' + (r.status === 'played' ? (r.score === 1 ? 'win' : r.score === 0 ? 'loss' : 'draw') : 'pending')}>
          <b>{r.score === null ? '—' : (r.score === 1 ? 'Thắng (1 - 0)' : r.score === 0.5 ? 'Hòa (½ - ½)' : 'Thua (0 - 1)')}</b>
          <small>{r.status === 'played' ? (r.score === 1 ? 'Thắng' : r.score === 0 ? 'Thua' : 'Hòa') : r.status === 'bye' ? 'Bye (Miễn đấu)' : r.status === 'forfeit' ? 'Xử thắng/thua' : r.status === 'pending' ? 'Chờ kết quả' : 'Chưa rõ'}</small>
        </span>
      </div>
    )}
  </div>
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
          <TableHead>SBD</TableHead>
          <TableHead>Đơn vị / CLB</TableHead>
          <TableHead>Điểm</TableHead>
          <TableHead>Buchholz (BH)</TableHead>
          <TableHead>Sonneborn Berger (SB)</TableHead>
          <TableHead>Performance (RP)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ps.map(p =>
          <TableRow key={p.id} id={p.id === selected ? 'selected-player' : undefined} className={p.id === selected ? 'selected-row' : ''}>
            <TableCell><span className={p.rank && p.rank <= 3 ? 'rank-medal' : 'rank-number'}>{fmt(p.rank)}</span></TableCell>
            <TableCell>
              <button className="rank-player" onClick={() => onOpen(p)}>
                <b>{p.name}</b>
              </button>
            </TableCell>
            <TableCell>{p.snr}</TableCell>
            <TableCell>{p.club || '—'}</TableCell>
            <TableCell className="points">{fmt(p.points)}</TableCell>
            <TableCell>{fmt(p.buchholz ?? p.ties['BH'] ?? p.ties['Buchholz'])}</TableCell>
            <TableCell>{fmt(p.sonnebornBerger ?? p.ties['SB'])}</TableCell>
            <TableCell>{fmt(p.performance ?? p.ties['Rp'] ?? p.ties['Performance'])}</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
    {!ps.length && <p className="empty-text">Không có kết quả phù hợp.</p>}
    <p className="subtle below">{t.demo ? 'Bảng xếp hạng minh họa.' : 'Thứ hạng và các hệ số theo phiên đồng bộ Chess-Results mới nhất.'}</p>
  </section>
}
