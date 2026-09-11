'use client';
import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Trophy,
  Users,
  Plus,
  RefreshCw,
  Search,
  Link as LinkIcon,
  LogOut,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  LockKeyhole,
  CheckCircle2,
  Layers3,
  CheckSquare,
  Square,
  Upload,
  Image as ImageIcon,
  Activity,
  Sparkles,
  BarChart3,
  Sliders,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { normalize, fmt, type Tournament, type Player } from '@/lib/chess';
import { apiFetch } from '@/lib/api-client';

export interface AdminLog {
  id: string;
  ok: boolean;
  message: string;
  created: string;
}

export interface BannerItem {
  id: string;
  title: string;
  description: string;
  image_url: string;
  button_text: string;
  button_link: string;
  is_active: number;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface PrizeRuleItem {
  id?: string;
  tournament_id: string;
  tournament_name?: string;
  group_name: string;
  rank_from: number;
  rank_to: number;
  medal: string;
  prize_name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AdminState {
  admin: boolean;
  username?: string;
  csrf?: string;
  tournaments?: Tournament[];
  banners?: BannerItem[];
  prizes?: PrizeRuleItem[];
  logs?: AdminLog[];
}

export interface CategoryItem {
  id?: string;
  group: string;
  name?: string;
  source: string;
  playerCount?: number;
  status?: string;
}

export interface DetectedInfo {
  mainName: string;
  categories: CategoryItem[];
}

export interface PreviewData {
  tournament: Tournament;
  token: string;
}

export interface AdminProps {
  onChanged: () => void;
}

export default function Admin({ onChanged }: AdminProps) {
  const [state, setState] = useState<AdminState | null>(null);
  const [error, setError] = useState('');
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [group, setGroup] = useState('');
  const [busy, setBusy] = useState('');
  const [importProgress, setImportProgress] = useState<{ percent: number; text: string } | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [detectedInfo, setDetectedInfo] = useState<DetectedInfo | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>({});
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [edit, setEdit] = useState<Tournament | null>(null);
  const [remove, setRemove] = useState<Tournament | null>(null);
  const [confirmName, setConfirmName] = useState('');
  const [q, setQ] = useState('');
  const [bannerModal, setBannerModal] = useState<Partial<BannerItem> | null>(null);
  const [infoModal, setInfoModal] = useState<Tournament | null>(null);
  const [previewBanner, setPreviewBanner] = useState<BannerItem | null>(null);
  const [deleteBanner, setDeleteBanner] = useState<BannerItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showManualUrl, setShowManualUrl] = useState(false);
  const [activeTab, setActiveTab] = useState<'tournaments' | 'prizes' | 'banners'>('tournaments');
  const [prizeForm, setPrizeForm] = useState<{
    id?: string;
    tournament_id: string;
    group_name: string;
    rank_from: number | string;
    rank_to: number | string;
    medal: string;
    prize_name: string;
    description: string;
  }>({
    id: '',
    tournament_id: '',
    group_name: 'Tất cả',
    rank_from: 1,
    rank_to: 1,
    medal: 'Gold Medal',
    prize_name: '',
    description: ''
  });

  async function savePrizeRule() {
    if (!prizeForm.tournament_id) {
      toast.error('Vui lòng chọn Giải đấu (tournament required).');
      return;
    }
    if (!prizeForm.group_name.trim()) {
      toast.error('Vui lòng nhập Bảng/Nhóm đấu (group required).');
      return;
    }
    const rFrom = Number(prizeForm.rank_from);
    const rTo = Number(prizeForm.rank_to);
    if (isNaN(rFrom) || isNaN(rTo) || rFrom < 1 || rTo < 1) {
      toast.error('Thứ hạng từ - đến phải là số nguyên >= 1.');
      return;
    }
    if (rFrom > rTo) {
      toast.error('Rank From (hạng từ) phải nhỏ hơn hoặc bằng Rank To (hạng đến).');
      return;
    }
    if (!prizeForm.prize_name.trim()) {
      toast.error('Vui lòng nhập Tên giải thưởng.');
      return;
    }

    setBusy('prize_save');
    try {
      const isEdit = !!prizeForm.id;
      const endpoint = isEdit ? `/api/admin/prizes/${prizeForm.id}` : '/api/admin/prizes';
      const r = await apiFetch(endpoint, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(state?.csrf ? { 'X-CSRF-Token': state.csrf } : {})
        },
        body: JSON.stringify({
          tournament_id: prizeForm.tournament_id,
          group_name: prizeForm.group_name.trim(),
          rank_from: rFrom,
          rank_to: rTo,
          medal: prizeForm.medal,
          prize_name: prizeForm.prize_name.trim(),
          description: prizeForm.description.trim()
        })
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || 'Lỗi lưu cơ cấu giải thưởng');
      toast.success(d.message || (isEdit ? 'Đã cập nhật quy tắc giải thưởng!' : 'Đã tạo quy tắc giải thưởng mới!'));
      setPrizeForm({
        id: '',
        tournament_id: prizeForm.tournament_id,
        group_name: prizeForm.group_name,
        rank_from: 1,
        rank_to: 1,
        medal: 'Gold Medal',
        prize_name: '',
        description: ''
      });
      await load();
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function deletePrizeRule(id: string) {
    if (!confirm('Bạn có chắc chắn muốn xóa quy tắc giải thưởng này?')) return;
    setBusy('prize_delete');
    try {
      const r = await apiFetch(`/api/admin/prizes/${id}`, {
        method: 'DELETE',
        headers: {
          ...(state?.csrf ? { 'X-CSRF-Token': state.csrf } : {})
        }
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || 'Lỗi xóa cơ cấu giải thưởng');
      toast.success(d.message || 'Đã xóa quy tắc giải thưởng thành công!');
      await load();
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function handleFileUpload(file: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dung lượng hình ảnh quá lớn (Tối đa 5MB).');
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      toast.error('Chỉ chấp nhận file ảnh: .jpg, .jpeg, .png, .webp.');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const r = await apiFetch('/api/admin/upload-image', {
        method: 'POST',
        headers: {
          ...(state?.csrf ? { 'X-CSRF-Token': state.csrf } : {})
        },
        body: formData
      });

      const d = (await r.json()) as { url?: string; error?: string; message?: string };
      if (!r.ok || !d.url) throw Error(d.error || 'Lỗi upload ảnh');

      setBannerModal(prev => ({ ...(prev || {}), image_url: d.url }));
      toast.success('Đã tải ảnh lên thành công!');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function load() {
    try {
      const r = await apiFetch('/api/admin');
      const d = (await r.json()) as AdminState & { error?: string };
      if (!r.ok) throw Error(d.error || 'Lỗi tải trang quản trị');
      setState(d);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function action(type: string, extra: Record<string, unknown> = {}): Promise<boolean> {
    setBusy(type);
    setError('');

    if (type === 'batch_import') {
      setImportProgress({ percent: 15, text: 'Đang kết nối trang Chess-Results...' });
      setTimeout(() => setImportProgress({ percent: 45, text: 'Đang tải dữ liệu kỳ thủ các bảng...' }), 800);
      setTimeout(() => setImportProgress({ percent: 75, text: 'Đang phân tích xếp hạng & kết quả ván đấu...' }), 1800);
      setTimeout(() => setImportProgress({ percent: 90, text: 'Đang lưu cơ sở dữ liệu hệ thống...' }), 3000);
    }

    try {
      const r = await apiFetch(type === 'login' ? '/api/auth/login' : type === 'logout' ? '/api/auth/logout' : '/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(state?.csrf ? { 'X-CSRF-Token': state.csrf } : {}) },
        body: JSON.stringify(type === 'login' ? { username, password } : { action: type, url, group, name, ...extra })
      });
      const d = (await r.json()) as {
        error?: string;
        message?: string;
        detected?: DetectedInfo;
        tournament?: Tournament;
        token?: string;
      };

      if (!r.ok) {
        if (r.status === 401 && type !== 'login') setState({ admin: false });
        throw Error(d.error || 'Thao tác thất bại');
      }

      if (d.token) {
        try { localStorage.setItem('sgc_token', d.token); } catch {}
      }

      if (type === 'detect') {
        if (d.detected) {
          setDetectedInfo(d.detected);
          if (d.detected.mainName && !name) setName(d.detected.mainName);
          const sel: Record<string, boolean> = {};
          d.detected.categories?.forEach((c: CategoryItem) => {
            sel[c.source] = true;
          });
          setSelectedCategories(sel);
          const totalP = d.detected.categories?.reduce((a, c) => a + (c.playerCount || 0), 0) || 0;
          toast.success(`Đã phát hiện ${d.detected.categories?.length || 0} bảng đấu (${totalP} kỳ thủ) trong giải.`);
        }
      } else if (type === 'preview') {
        if (d.tournament && d.token) {
          setPreview({ tournament: d.tournament, token: d.token });
        }
      } else {
        if (type === 'batch_import') {
          setImportProgress({ percent: 100, text: 'Hoàn thành!' });
          setTimeout(() => setImportProgress(null), 1200);
        }
        toast.success(d.message || 'Đã cập nhật');
        setPreview(null);
        if (type === 'batch_import' || type === 'save') {
          setDetectedInfo(null);
          setUrl('');
          setName('');
          setGroup('');
        }
        if (type === 'login') setPassword('');
        if (type === 'logout') {
          try { localStorage.removeItem('sgc_token'); } catch {}
          setState({ admin: false });
          setEdit(null);
          setRemove(null);
        } else {
          await load();
        }
        onChanged();
      }
      return true;
    } catch (e) {
      setImportProgress(null);
      setError((e as Error).message);
      return false;
    } finally {
      setBusy('');
    }
  }

  const selectAllToggle = () => {
    if (!detectedInfo) return;
    const allSelected = detectedInfo.categories.every(c => selectedCategories[c.source]);
    const next: Record<string, boolean> = {};
    detectedInfo.categories.forEach(c => {
      next[c.source] = !allSelected;
    });
    setSelectedCategories(next);
  };

  if (!state) return (
    <section className="panel empty" style={{ minHeight: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <RefreshCw size={36} className="spin text-blue-600" />
      <p style={{ fontWeight: 600, color: '#062B4F' }}>{error || 'Đang mở Trung Tâm Quản Trị Cờ Vua Sài Gòn…'}</p>
      {error && <button className="outline" onClick={load}>Thử lại</button>}
    </section>
  );

  if (!state.admin) return (
    <section className="panel login-card" style={{ maxWidth: 420, margin: '60px auto', padding: '36px 32px', borderRadius: 24, boxShadow: '0 20px 50px rgba(6,43,79,0.15)', background: '#FFFFFF', border: '1px solid rgba(212,175,55,0.3)' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <img src="/company-logo.png" alt="Cờ Vua Sài Gòn" className="login-logo" style={{ width: 68, height: 68, objectFit: 'contain', margin: '0 auto 12px' }} />
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#062B4F', margin: 0 }}>CỜ VUA SÀI GÒN</h2>
        <p style={{ fontSize: 13, color: '#D4AF37', fontWeight: 700, marginTop: 4, textTransform: uppercaseLetter('Quản trị hệ thống tra cứu') }}>Đăng Nhập Quản Trị Hệ Thống</p>
      </div>

      <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); action('login'); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label className="saas-label">
          Tên đăng nhập
          <input
            name="username"
            className="saas-input"
            style={{ paddingLeft: 16 }}
            autoComplete="username"
            required
            value={username}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
          />
        </label>
        <label className="saas-label password-wrap">
          Mật khẩu
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              name="password"
              className="saas-input"
              style={{ paddingLeft: 16, paddingRight: 44 }}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            />
            <button
              type="button"
              style={{ position: 'absolute', right: 12, background: 'none', border: 0, color: '#64748B', cursor: 'pointer' }}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>

        {error && <p className="notice warning" role="alert">{error}</p>}

        <button className="saas-btn-gold" disabled={!!busy} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
          {busy ? <RefreshCw size={17} className="spin" /> : <LockKeyhole size={17} />}
          <span>Đăng nhập hệ thống</span>
        </button>
      </form>
    </section>
  );

  function uppercaseLetter(str: string) {
    return str.toUpperCase();
  }

  const activeTournaments = state.tournaments || [];
  const tournaments = activeTournaments.filter((t: Tournament) => normalize(t.name + ' ' + t.group).includes(normalize(q)));
  const totalPlayersCount = activeTournaments.reduce((a: number, t: Tournament) => a + (t.players ? t.players.length : 0), 0);
  const publishedCount = activeTournaments.filter((t: Tournament) => t.published).length;
  const lastSyncTime = activeTournaments[0]?.updated ? new Date(activeTournaments[0].updated).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : null;

  return (
    <>
      {/* 1. SAAS HEADER BAR */}
      <div className="admin-header-bar">
        <div className="admin-brand-info">
          <img src="/company-logo.png" alt="Cờ Vua Sài Gòn" className="admin-brand-logo" />
          <div className="admin-brand-text">
            <h1>CỜ VUA SÀI GÒN — SAAS ADMIN</h1>
            <p>Hệ thống Quản trị & Đồng bộ dữ liệu giải đấu chuyên nghiệp</p>
          </div>
        </div>

        <div className="admin-header-actions">
          <div className="system-status-pill">
            <span className="status-indicator-dot" />
            <span>Hệ thống đang hoạt động</span>
            {lastSyncTime && <span style={{ opacity: 0.75, fontSize: 12 }}>· {lastSyncTime}</span>}
          </div>

          <div className="admin-user-pill">
            <UserCheck size={16} className="text-amber-400" />
            <span>{state.username || 'Admin'}</span>
          </div>

          <button className="admin-logout-btn" disabled={!!busy} onClick={() => action('logout')}>
            <LogOut size={15} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>

      {error && !edit && !remove && <div className="notice warning" role="alert" style={{ marginBottom: 20 }}>{error}</div>}

      {/* 2. STATISTIC METRIC CARDS */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="stat-icon-box stat-icon-gold">
            <Trophy size={26} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Giải Đấu & Bảng Đấu</span>
            <span className="stat-value">{activeTournaments.length}</span>
            <span className="stat-subtext">🟢 {publishedCount} đang công bố · {activeTournaments.length - publishedCount} ẩn</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-icon-box stat-icon-blue">
            <Users size={26} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Tổng Số Kỳ Thủ</span>
            <span className="stat-value">{totalPlayersCount.toLocaleString('vi-VN')}</span>
            <span className="stat-subtext">⚡ Đồng bộ Chess-Results V2</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-icon-box stat-icon-emerald">
            <RefreshCw size={26} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Trạng Thái Đồng Bộ</span>
            <span className="stat-value">Tự Động</span>
            <span className="stat-subtext">✓ Dữ liệu chính xác & BH, SB, RP</span>
          </div>
        </div>
      </div>

      {/* ADMIN TAB NAVIGATION BAR */}
      <div className="admin-tab-nav" style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', background: '#FFFFFF', padding: '12px 16px', borderRadius: 16, border: '1px solid #CBD5E1', boxShadow: '0 4px 12px rgba(6,43,79,0.04)' }}>
        <button
          type="button"
          onClick={() => setActiveTab('tournaments')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            border: activeTab === 'tournaments' ? '1.5px solid #062B4F' : '1px solid #E2E8F0',
            background: activeTab === 'tournaments' ? '#062B4F' : '#F8FAFC',
            color: activeTab === 'tournaments' ? '#FFFFFF' : '#475569',
            transition: 'all 0.2s ease'
          }}
        >
          <Trophy size={18} className={activeTab === 'tournaments' ? 'text-amber-400' : ''} />
          <span>🏆 Quản Lý Giải Đấu & Đồng Bộ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('prizes')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            border: activeTab === 'prizes' ? '1.5px solid #062B4F' : '1px solid #E2E8F0',
            background: activeTab === 'prizes' ? '#062B4F' : '#F8FAFC',
            color: activeTab === 'prizes' ? '#FFFFFF' : '#475569',
            transition: 'all 0.2s ease'
          }}
        >
          <Sparkles size={18} className={activeTab === 'prizes' ? 'text-amber-400' : ''} />
          <span>🏆 Cơ cấu giải thưởng</span>
          {(state?.prizes?.length || 0) > 0 && (
            <span style={{ background: '#D4AF37', color: '#062B4F', padding: '2px 8px', borderRadius: 99, fontSize: 12, fontWeight: 800 }}>
              {state?.prizes?.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('banners')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 20px',
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 14,
            cursor: 'pointer',
            border: activeTab === 'banners' ? '1.5px solid #062B4F' : '1px solid #E2E8F0',
            background: activeTab === 'banners' ? '#062B4F' : '#F8FAFC',
            color: activeTab === 'banners' ? '#FFFFFF' : '#475569',
            transition: 'all 0.2s ease'
          }}
        >
          <ImageIcon size={18} />
          <span>🖼️ Banner Trang Chủ</span>
        </button>
      </div>

      {/* 3. CHESS-RESULTS IMPORT MODULE CARD */}
      <section className="admin-card-section">
        <div className="admin-card-title-group">
          <div>
            <h2><Layers3 size={22} className="text-amber-500" /> Đồng bộ Dữ liệu Chess-Results</h2>
            <p>Nhập đường dẫn giải đấu chính từ Chess-Results.com để hệ thống tự động nhận diện tất cả nhóm tuổi (U06, U07, U08, U09, U11, U12... Nam/Nữ).</p>
          </div>
          <span className="soft-badge" style={{ background: '#eef5fc', color: '#145DA0', border: '1px solid #cbe0f5', padding: '6px 14px', borderRadius: 99, fontSize: 13, fontWeight: 700 }}>
            Engine Version 2.0
          </span>
        </div>

        <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); action('detect'); }}>
          <div className="saas-form-row">
            <label className="saas-label">
              Đường dẫn Chess-Results chính (*)
              <div className="saas-input-group">
                <LinkIcon size={18} className="saas-input-icon" />
                <input
                  type="url"
                  className="saas-input"
                  required
                  placeholder="https://s2.chess-results.com/tnr1461992.aspx?lan=29"
                  value={url}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setUrl(e.target.value); setPreview(null); setDetectedInfo(null); }}
                />
              </div>
            </label>

            <label className="saas-label">
              Tên giải đấu tùy chỉnh
              <input
                type="text"
                className="saas-input"
                style={{ paddingLeft: 16 }}
                maxLength={240}
                placeholder="Tự động trích xuất từ trang nguồn nếu để trống"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              />
            </label>

            <button className="saas-btn-gold" disabled={!!busy}>
              {busy === 'detect' ? <RefreshCw size={18} className="spin" /> : <Search size={18} />}
              <span>Phân tích & Tự động phát hiện</span>
            </button>
          </div>
        </form>

        {/* Real-time progress indicator */}
        {importProgress && (
          <div style={{ marginTop: 24, background: '#062B4F', color: '#FFFFFF', padding: '18px 24px', borderRadius: 16, boxShadow: '0 8px 24px rgba(6,43,79,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontWeight: 700, fontSize: 14 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <RefreshCw size={16} className="spin text-amber-400" />
                {importProgress.text}
              </span>
              <span style={{ color: '#D4AF37' }}>{importProgress.percent}%</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 8, height: 10, overflow: 'hidden' }}>
              <div style={{ width: `${importProgress.percent}%`, background: 'linear-gradient(90deg, #F3D068 0%, #D4AF37 100%)', height: '100%', transition: 'width 0.4s ease' }} />
            </div>
          </div>
        )}

        {/* Detected result panel */}
        {detectedInfo && (
          <div style={{ marginTop: 24, padding: 24, background: '#F8FAFC', borderRadius: 16, border: '1.5px solid #CBD5E1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: '#062B4F', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={22} className="text-emerald-600" />
                Đã phát hiện giải: <span style={{ color: '#145DA0' }}>{detectedInfo.mainName}</span>
              </h3>
              <span className="soft-badge" style={{ background: '#E2E8F0', color: '#062B4F', fontWeight: 700 }}>
                {detectedInfo.categories.length} bảng đấu tìm thấy
              </span>
            </div>

            <div className="saas-table-container" style={{ marginTop: 16 }}>
              <table className="saas-table">
                <thead>
                  <tr>
                    <th style={{ width: 50, textAlign: 'center' }}>Chọn</th>
                    <th>Tên Bảng đấu (Category)</th>
                    <th style={{ textAlign: 'center' }}>Số kỳ thủ (Players)</th>
                    <th style={{ textAlign: 'center' }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {detectedInfo.categories.map((c: CategoryItem) => (
                    <tr key={c.source}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#062B4F' }}
                          checked={!!selectedCategories[c.source]}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedCategories({ ...selectedCategories, [c.source]: e.target.checked })}
                        />
                      </td>
                      <td>
                        <b style={{ color: '#062B4F', display: 'block', fontSize: 15 }}>{c.group}</b>
                        <span style={{ fontSize: 12, color: '#64748B' }}>{c.source}</span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#145DA0' }}>
                        {c.playerCount || 0} kỳ thủ
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="soft-badge" style={{
                          background: c.status === 'Đã nhập' ? '#DCFCE7' : '#FEF3C7',
                          color: c.status === 'Đã nhập' ? '#15803D' : '#B45309',
                          border: `1px solid ${c.status === 'Đã nhập' ? '#86EFAC' : '#FDE68A'}`
                        }}>
                          {c.status || 'Chưa nhập'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginTop: 18 }}>
              <button type="button" className="outline" onClick={selectAllToggle} style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 10, height: 42, padding: '0 16px', fontWeight: 600 }}>
                {detectedInfo.categories.every(c => selectedCategories[c.source]) ? <Square size={16} /> : <CheckSquare size={16} />}
                {detectedInfo.categories.every(c => selectedCategories[c.source]) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>

              <button className="saas-btn-primary" disabled={!!busy || !detectedInfo.categories.some(c => selectedCategories[c.source])} onClick={() => {
                const items = detectedInfo.categories.filter((c: CategoryItem) => selectedCategories[c.source]).map((c: CategoryItem) => ({
                  url: c.source,
                  group: c.group,
                  name: name || detectedInfo.mainName
                }));
                action('batch_import', { items, mainName: name || detectedInfo.mainName });
              }}>
                {busy === 'batch_import' ? <RefreshCw size={17} className="spin" /> : <Plus size={17} />}
                <span>BẮT ĐẦU ĐỒNG BỘ DATA ({detectedInfo.categories.filter((c: CategoryItem) => selectedCategories[c.source]).length} BẢNG CHỌN)</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 4. TOURNAMENT MANAGEMENT SECTION */}
      <section className="admin-card-section">
        <div className="admin-card-title-group">
          <div>
            <h2><Trophy size={22} className="text-amber-500" /> Danh Sách Giải Đấu & Bảng Đấu</h2>
            <p>Quản lý tất cả {activeTournaments.length} giải đấu trong cơ sở dữ liệu hệ thống.</p>
          </div>

          <div style={{ position: 'relative', width: 280 }}>
            <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
            <input
              type="text"
              aria-label="Tìm giải đấu"
              placeholder="Tìm kiếm giải đấu..."
              className="saas-input"
              style={{ paddingLeft: 42, height: 42 }}
              value={q}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
            />
          </div>
        </div>

        {!tournaments.length ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: '#F8FAFC', borderRadius: 16, border: '1px dashed #CBD5E1' }}>
            <Trophy size={40} style={{ color: '#94A3B8', margin: '0 auto 12px' }} />
            <p style={{ fontWeight: 700, color: '#062B4F', margin: 0, fontSize: 16 }}>{q ? 'Không tìm thấy giải đấu phù hợp.' : 'Chưa có giải đấu được lưu trong hệ thống.'}</p>
            <p style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>Dán link Chess-Results phía trên để nhập giải đấu đầu tiên.</p>
          </div>
        ) : (
          <div className="saas-table-container">
            <table className="saas-table">
              <thead>
                <tr>
                  <th>Tên giải đấu</th>
                  <th>Bảng đấu / Nhóm</th>
                  <th style={{ textAlign: 'center' }}>Kỳ thủ</th>
                  <th style={{ textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {tournaments.map((t: Tournament) => (
                  <tr key={t.id}>
                    <td>
                      <b style={{ color: '#062B4F', fontSize: 15, display: 'block' }}>{t.name}</b>
                      <a href={t.source} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#145DA0', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <LinkIcon size={12} />
                        <span>Xem trang nguồn Chess-Results</span>
                      </a>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#334155' }}>{t.group || 'Toàn giải'}</span>
                      {t.updated && <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>Cập nhật: {new Date(t.updated).toLocaleString('vi-VN')}</div>}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: '#062B4F' }}>
                      {t.players ? t.players.length : 0}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="soft-badge" style={{
                        background: t.published ? '#DCFCE7' : '#FEE2E2',
                        color: t.published ? '#15803D' : '#991B1B',
                        border: `1px solid ${t.published ? '#86EFAC' : '#FCA5A5'}`
                      }}>
                        {t.published ? '🟢 Công bố' : '🔴 Đang ẩn'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="outline" style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8 }} disabled={!!busy} onClick={() => action('sync', { id: t.id })} title="Đồng bộ lại">
                          <RefreshCw size={14} className={busy === 'sync' ? 'spin' : ''} />
                        </button>
                        <button className="outline" style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8, color: '#B88E1F', borderColor: '#D4AF37' }} disabled={!!busy} onClick={() => { setError(''); setInfoModal({ ...t }); }} title="Quản lý Thông tin & Giải thưởng">
                          <Sparkles size={14} />
                        </button>
                        <button className="outline" style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8 }} disabled={!!busy} onClick={() => { setError(''); setEdit({ ...t }); }} title="Sửa tên / Link Chess-Results">
                          <Pencil size={14} />
                        </button>
                        <button className="outline" style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8 }} disabled={!!busy} onClick={() => action('publish', { id: t.id, published: !t.published })} title={t.published ? 'Ẩn giải' : 'Công bố'}>
                          {t.published ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button className="outline danger-btn" style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8 }} disabled={!!busy} onClick={() => { setError(''); setConfirmName(''); setRemove(t); }} title="Xóa giải">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 5. TOURNAMENT PRIZE MANAGEMENT MODULE */}
      {(activeTab === 'prizes' || activeTab === 'tournaments') && (
        <section className="admin-card-section" id="admin-prize-management">
          <div className="admin-card-title-group">
            <div>
              <h2><Sparkles size={22} className="text-amber-500" /> 🏆 Cơ cấu giải thưởng</h2>
              <p>Quản lý quy tắc trao thưởng, danh hiệu, huy chương, quà tặng cho từng giải đấu & bảng đấu.</p>
            </div>
            {(state?.prizes?.length || 0) > 0 && (
              <span className="soft-badge" style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', padding: '6px 14px', borderRadius: 99, fontSize: 13, fontWeight: 700 }}>
                {state?.prizes?.length} quy tắc giải thưởng
              </span>
            )}
          </div>

          {/* Form to create / edit prize rules */}
          <div style={{ background: '#F8FAFC', padding: 24, borderRadius: 16, border: '1px solid #CBD5E1', marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#062B4F', marginTop: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={18} className="text-amber-500" />
              {prizeForm.id ? 'Hiệu chỉnh quy tắc giải thưởng' : 'Thêm quy tắc cơ cấu giải thưởng mới'}
            </h3>

            <form onSubmit={(e) => { e.preventDefault(); savePrizeRule(); }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 16 }}>
                {/* 1. Tournament */}
                <label className="saas-label">
                  Giải đấu (*)
                  <select
                    className="saas-input"
                    style={{ paddingLeft: 12 }}
                    required
                    value={prizeForm.tournament_id}
                    onChange={(e) => {
                      const selectedTourId = e.target.value;
                      const tour = activeTournaments.find(t => t.id === selectedTourId);
                      setPrizeForm({
                        ...prizeForm,
                        tournament_id: selectedTourId,
                        group_name: tour?.categories?.[0]?.group || prizeForm.group_name || 'Tất cả'
                      });
                    }}
                  >
                    <option value="">-- Chọn giải đấu --</option>
                    {activeTournaments.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </label>

                {/* 2. Group/Table */}
                <label className="saas-label">
                  Bảng đấu / Nhóm (*)
                  <input
                    type="text"
                    className="saas-input"
                    style={{ paddingLeft: 12 }}
                    required
                    placeholder="VD: U7 Nam, U9 Nữ, U11 Nam..."
                    value={prizeForm.group_name}
                    onChange={(e) => setPrizeForm({ ...prizeForm, group_name: e.target.value })}
                  />
                </label>

                {/* 3. Rank From */}
                <label className="saas-label">
                  Hạng từ (Rank From) (*)
                  <input
                    type="number"
                    min={1}
                    className="saas-input"
                    style={{ paddingLeft: 12 }}
                    required
                    value={prizeForm.rank_from}
                    onChange={(e) => setPrizeForm({ ...prizeForm, rank_from: e.target.value })}
                  />
                </label>

                {/* 4. Rank To */}
                <label className="saas-label">
                  Hạng đến (Rank To) (*)
                  <input
                    type="number"
                    min={1}
                    className="saas-input"
                    style={{ paddingLeft: 12 }}
                    required
                    value={prizeForm.rank_to}
                    onChange={(e) => setPrizeForm({ ...prizeForm, rank_to: e.target.value })}
                  />
                </label>

                {/* 5. Medal Type */}
                <label className="saas-label">
                  Loại huy chương / Danh hiệu
                  <select
                    className="saas-input"
                    style={{ paddingLeft: 12 }}
                    value={prizeForm.medal}
                    onChange={(e) => setPrizeForm({ ...prizeForm, medal: e.target.value })}
                  >
                    <option value="Gold Medal">🥇 Gold Medal (Huy chương Vàng)</option>
                    <option value="Silver Medal">🥈 Silver Medal (Huy chương Bạc)</option>
                    <option value="Bronze Medal">🥉 Bronze Medal (Huy chương Đồng)</option>
                    <option value="Certificate">📜 Certificate (Bằng khen)</option>
                    <option value="Other">🏆 Other (Giải thưởng khác)</option>
                  </select>
                </label>

                {/* 6. Prize Name */}
                <label className="saas-label">
                  Tên giải thưởng (*)
                  <input
                    type="text"
                    className="saas-input"
                    style={{ paddingLeft: 12 }}
                    required
                    placeholder="VD: Cúp vô địch + Huy chương vàng"
                    value={prizeForm.prize_name}
                    onChange={(e) => setPrizeForm({ ...prizeForm, prize_name: e.target.value })}
                  />
                </label>

                {/* 7. Reward Description */}
                <label className="saas-label" style={{ gridColumn: 'span 2' }}>
                  Mô tả phần thưởng / Quà tặng
                  <input
                    type="text"
                    className="saas-input"
                    style={{ paddingLeft: 12 }}
                    placeholder="VD: 500.000 VNĐ + quà tặng tài trợ..."
                    value={prizeForm.description}
                    onChange={(e) => setPrizeForm({ ...prizeForm, description: e.target.value })}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button type="submit" className="saas-btn-gold" disabled={!!busy}>
                  {busy === 'prize_save' ? <RefreshCw size={17} className="spin" /> : <Sparkles size={17} />}
                  <span>{prizeForm.id ? 'Cập Nhật Quy Tắc Giải Thưởng' : 'Lưu Cơ Cấu Giải Thưởng'}</span>
                </button>

                {prizeForm.id && (
                  <button
                    type="button"
                    className="outline"
                    onClick={() => setPrizeForm({
                      id: '',
                      tournament_id: activeTournaments[0]?.id || '',
                      group_name: 'Tất cả',
                      rank_from: 1,
                      rank_to: 1,
                      medal: 'Gold Medal',
                      prize_name: '',
                      description: ''
                    })}
                  >
                    Hủy chỉnh sửa
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Table displaying existing prize rules */}
          <div className="saas-table-container">
            <table className="saas-table">
              <thead>
                <tr>
                  <th>Giải đấu (Tournament)</th>
                  <th>Bảng đấu (Group)</th>
                  <th style={{ textAlign: 'center' }}>Khung hạng (Rank Range)</th>
                  <th style={{ textAlign: 'center' }}>Loại danh hiệu (Medal)</th>
                  <th>Tên giải thưởng (Prize Name) & Mô tả</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {(state?.prizes || []).map((pz: PrizeRuleItem) => {
                  const medalLabel = pz.medal === 'Gold Medal' || pz.medal === 'gold' ? '🥇 Gold Medal'
                    : pz.medal === 'Silver Medal' || pz.medal === 'silver' ? '🥈 Silver Medal'
                    : pz.medal === 'Bronze Medal' || pz.medal === 'bronze' ? '🥉 Bronze Medal'
                    : pz.medal === 'Certificate' ? '📜 Certificate' : '🏆 Other';

                  return (
                    <tr key={pz.id}>
                      <td>
                        <b style={{ color: '#062B4F', fontSize: 14, display: 'block' }}>{pz.tournament_name || pz.tournament_id}</b>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#334155' }}>{pz.group_name}</span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 800, color: '#145DA0' }}>
                        {pz.rank_from === pz.rank_to ? `Hạng ${pz.rank_from}` : `Hạng ${pz.rank_from} - ${pz.rank_to}`}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="soft-badge" style={{ background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', fontWeight: 700 }}>
                          {medalLabel}
                        </span>
                      </td>
                      <td>
                        <b style={{ color: '#062B4F', display: 'block', fontSize: 14 }}>{pz.prize_name}</b>
                        {pz.description && <span style={{ fontSize: 12, color: '#64748B' }}>{pz.description}</span>}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            className="outline"
                            style={{ padding: '6px 10px', fontSize: 12, borderRadius: 8 }}
                            onClick={() => {
                              setPrizeForm({
                                id: pz.id,
                                tournament_id: pz.tournament_id,
                                group_name: pz.group_name,
                                rank_from: pz.rank_from,
                                rank_to: pz.rank_to,
                                medal: pz.medal || 'Gold Medal',
                                prize_name: pz.prize_name,
                                description: pz.description || ''
                              });
                              setActiveTab('prizes');
                              document.getElementById('admin-prize-management')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            title="Chỉnh sửa quy tắc"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="outline danger-btn"
                            style={{ padding: '6px 10px', fontSize: 12, borderRadius: 8 }}
                            disabled={!!busy}
                            onClick={() => pz.id && deletePrizeRule(pz.id)}
                            title="Xóa quy tắc"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!state?.prizes?.length && (
                  <tr>
                    <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#64748B', fontStyle: 'italic' }}>
                      Chưa có quy tắc cơ cấu giải thưởng nào. Hãy sử dụng biểu mẫu phía trên để thêm cơ cấu giải thưởng.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 6. HERO BANNER MANAGEMENT SECTION */}
      <section className="admin-card-section">
        <div className="admin-card-title-group">
          <div>
            <h2><ImageIcon size={22} className="text-amber-500" /> Quản Lý Banner Quảng Bá Trang Chủ</h2>
            <p>Tải ảnh banner lên máy chủ và quản lý hình ảnh hiển thị trên trang chủ.</p>
          </div>
          <button className="saas-btn-gold" style={{ height: 40, padding: '0 18px', fontSize: 13 }} onClick={() => { setError(''); setBannerModal({ title: '', description: '', image_url: '/company-logo.png', button_text: 'Xem kết quả', button_link: '/?view=tournaments', is_active: 1, sort_order: (state.banners?.length || 0) + 1 }); }}>
            <Plus size={16} />
            <span>Thêm Banner Mới</span>
          </button>
        </div>

        <div className="saas-table-container">
          <table className="saas-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Hình ảnh</th>
                <th>Tiêu đề & Nội dung</th>
                <th style={{ textAlign: 'center', width: 120 }}>Trạng thái</th>
                <th style={{ textAlign: 'center', width: 80 }}>Thứ tự</th>
                <th style={{ textAlign: 'right', width: 220 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {(state.banners || []).map((b: BannerItem) => (
                <tr key={b.id}>
                  <td>
                    <img src={b.image_url || '/company-logo.png'} alt={b.title} style={{ width: 56, height: 40, objectFit: 'cover', background: '#062B4F', borderRadius: 8, border: '1px solid #CBD5E1' }} />
                  </td>
                  <td>
                    <b style={{ color: '#062B4F', display: 'block', fontSize: 15 }}>{b.title}</b>
                    <span style={{ fontSize: 13, color: '#64748B' }}>{b.description || '—'}</span>
                    {b.button_text && <div style={{ fontSize: 12, color: '#145DA0', marginTop: 2, fontWeight: 600 }}>CTA: {b.button_text} ({b.button_link})</div>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="soft-badge" style={{ background: b.is_active ? '#DCFCE7' : '#FEE2E2', color: b.is_active ? '#15803D' : '#991B1B' }}>
                      {b.is_active ? '🟢 Hiển thị' : '🔴 Đang ẩn'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 800, color: '#062B4F' }}>
                    {b.sort_order}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button className="outline" style={{ padding: '6px 10px', fontSize: 12, borderRadius: 8 }} onClick={() => setPreviewBanner(b)} title="Xem trước">
                        <Eye size={14} />
                      </button>
                      <button className="outline" style={{ padding: '6px 10px', fontSize: 12, borderRadius: 8 }} disabled={!!busy} onClick={() => action('banner_toggle', { id: b.id, is_active: !b.is_active })} title={b.is_active ? 'Ẩn banner' : 'Hiện banner'}>
                        {b.is_active ? <EyeOff size={14} /> : <CheckCircle2 size={14} />}
                      </button>
                      <button className="outline" style={{ padding: '6px 10px', fontSize: 12, borderRadius: 8 }} disabled={!!busy} onClick={() => { setError(''); setBannerModal({ ...b }); }}>
                        <Pencil size={14} />
                      </button>
                      <button className="outline danger-btn" style={{ padding: '6px 10px', fontSize: 12, borderRadius: 8 }} disabled={!!busy} onClick={() => setDeleteBanner(b)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!state.banners?.length && (
                <tr>
                  <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#64748B' }}>
                    Chưa có banner nào. Nhấn "+ Thêm Banner Mới" để tải ảnh và tạo banner.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. SYSTEM ACTIVITY LOGS */}
      <section className="admin-card-section">
        <div className="admin-card-title-group" style={{ marginBottom: 16 }}>
          <div>
            <h2><Activity size={20} className="text-amber-500" /> Nhật Ký Hoạt Động Hệ Thống</h2>
            <p>Lịch sử các thao tác cập nhật dữ liệu và đồng bộ nguồn.</p>
          </div>
        </div>

        {state.logs?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {state.logs.slice(0, 10).map((l: AdminLog) => (
              <div key={l.id} style={{ padding: '12px 16px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="soft-badge" style={{ background: l.ok ? '#DCFCE7' : '#FEE2E2', color: l.ok ? '#15803D' : '#991B1B', fontWeight: 700 }}>
                    {l.ok ? 'Thành công' : 'Lỗi'}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#062B4F' }}>{l.message}</span>
                </div>
                <span style={{ fontSize: 12, color: '#94A3B8', whiteSpace: 'nowrap' }}>{new Date(l.created).toLocaleString('vi-VN')}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-text">Chưa có nhật ký hoạt động.</p>
        )}
      </section>

      {/* MODALS & DIALOGS */}
      <Dialog open={!!edit} onOpenChange={(v: boolean) => { if (!v && !busy) setEdit(null); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Sửa thông tin giải đấu</DialogTitle>
            <DialogDescription>Chỉnh sửa tên giải đấu hoặc cập nhật liên kết Chess-Results.</DialogDescription>
          </DialogHeader>
          {edit && (
            <form className="edit-form" onSubmit={async (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); if (await action('edit', { id: edit.id, name: edit.name, group: edit.group, url: edit.source })) setEdit(null); }}>
              <label className="saas-label">Tên giải đấu<input className="saas-input" style={{ paddingLeft: 16 }} required maxLength={240} value={edit.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEdit({ ...edit, name: e.target.value })} /></label>
              <label className="saas-label">Bảng đấu / Nhóm<input className="saas-input" style={{ paddingLeft: 16 }} maxLength={100} value={edit.group} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEdit({ ...edit, group: e.target.value })} /></label>
              <label className="saas-label">Link Chess-Results<input className="saas-input" style={{ paddingLeft: 16 }} type="url" required value={edit.source} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEdit({ ...edit, source: e.target.value })} /></label>
              {error && <p className="notice warning" role="alert">{error}</p>}
              <div className="dialog-actions" style={{ marginTop: 16 }}>
                <button type="button" className="outline" disabled={!!busy} onClick={() => setEdit(null)}>Hủy</button>
                <button className="saas-btn-primary" disabled={!!busy}>{busy ? 'Đang lưu…' : 'Lưu chỉnh sửa'}</button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!infoModal} onOpenChange={(v: boolean) => { if (!v && !busy) setInfoModal(null); }}>
        <DialogContent showCloseButton={false} style={{ maxWidth: 720, maxHeight: '88vh', overflowY: 'auto' }}>
          <DialogHeader>
            <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#062B4F' }}>
              <Sparkles size={20} className="text-amber-500" />
              <span>Module Quản Trị Giải Đấu — {infoModal?.name}</span>
            </DialogTitle>
            <DialogDescription>
              Quản lý Giới thiệu giải, Điều lệ thi đấu, Hướng dẫn cho Phụ huynh, Cơ cấu giải thưởng & Huy chương từng bảng đấu.
            </DialogDescription>
          </DialogHeader>
          {infoModal && (
            <form className="edit-form" onSubmit={async (e: React.FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              if (await action('tournament_update_info', {
                id: infoModal.id,
                info: infoModal.info || {},
                prizes: infoModal.prizes || []
              })) {
                setInfoModal(null);
              }
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label className="saas-label">📍 Địa điểm tổ chức
                  <input className="saas-input" style={{ paddingLeft: 16 }} placeholder="Nhà thi đấu, Quận/Huyện, TP.HCM..." value={infoModal.info?.location || ''} onChange={(e) => setInfoModal({ ...infoModal, info: { ...(infoModal.info || {}), location: e.target.value } })} />
                </label>
                <label className="saas-label">⏰ Thời gian tổ chức
                  <input className="saas-input" style={{ paddingLeft: 16 }} placeholder="Ngày DD/MM/YYYY..." value={infoModal.info?.time || ''} onChange={(e) => setInfoModal({ ...infoModal, info: { ...(infoModal.info || {}), time: e.target.value } })} />
                </label>
              </div>

              <label className="saas-label" style={{ marginTop: 8 }}>🖼️ Ảnh Banner Giải Đấu (URL / Data URL)
                <input className="saas-input" style={{ paddingLeft: 16 }} placeholder="https://... hoặc data:image/... (Banner hiển thị cho giải)" value={infoModal.info?.banner_url || ''} onChange={(e) => setInfoModal({ ...infoModal, info: { ...(infoModal.info || {}), banner_url: e.target.value } })} />
              </label>

              <label className="saas-label" style={{ marginTop: 8 }}>📝 Giới thiệu giải đấu
                <textarea className="saas-input" style={{ padding: 12, height: 75 }} placeholder="Mô tả tóm tắt quy mô, ý nghĩa giải đấu..." value={infoModal.info?.intro || ''} onChange={(e) => setInfoModal({ ...infoModal, info: { ...(infoModal.info || {}), intro: e.target.value } })} />
              </label>

              <label className="saas-label" style={{ marginTop: 8 }}>📜 Điều lệ giải đấu
                <textarea className="saas-input" style={{ padding: 12, height: 75 }} placeholder="Quy định thi đấu, thời gian từng ván, luật cờ..." value={infoModal.info?.regulations || ''} onChange={(e) => setInfoModal({ ...infoModal, info: { ...(infoModal.info || {}), regulations: e.target.value } })} />
              </label>

              <label className="saas-label" style={{ marginTop: 8 }}>📢 Hướng dẫn cho Phụ huynh & Kỳ thủ
                <textarea className="saas-input" style={{ padding: 12, height: 75 }} placeholder="Lưu ý đón trả con, trang phục, tác phong thi đấu..." value={infoModal.info?.instructions || ''} onChange={(e) => setInfoModal({ ...infoModal, info: { ...(infoModal.info || {}), instructions: e.target.value } })} />
              </label>

              <div style={{ marginTop: 16, borderTop: '1px solid #E2E8F0', paddingTop: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#062B4F', display: 'block' }}>🏆 Cơ Cấu Giải Thưởng & Huy Chương Từng Bảng Đấu</span>
                    <span style={{ fontSize: 12, color: '#64748B' }}>Thiết lập huy chương (🥇 Vàng, 🥈 Bạc, 🥉 Đồng, 🏆 Khuyến khích) và phần thưởng từ Hạng đến Hạng cho từng bảng đấu.</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button type="button" className="outline" style={{ height: 32, padding: '0 10px', fontSize: 11, fontWeight: 700 }} onClick={() => {
                      const grp = infoModal.group || 'Tất cả';
                      const defaultPrizes = [
                        { group: grp, rankFrom: 1, rankTo: 1, prizeName: 'Huy chương Vàng & Cúp', medal: 'gold' as const, gift: 'Cúp Vô Địch' },
                        { group: grp, rankFrom: 2, rankTo: 2, prizeName: 'Huy chương Bạc', medal: 'silver' as const, gift: 'Cờ lưu niệm' },
                        { group: grp, rankFrom: 3, rankTo: 3, prizeName: 'Huy chương Đồng', medal: 'bronze' as const, gift: 'Cờ lưu niệm' },
                        { group: grp, rankFrom: 4, rankTo: 10, prizeName: 'Giải Khuyến Khích (Top 4-10)', medal: 'top' as const, gift: 'Phần quà từ Ban Tổ Chức' }
                      ];
                      setInfoModal({ ...infoModal, prizes: [...(infoModal.prizes || []), ...defaultPrizes] });
                    }}>
                      ⚡ Khởi tạo nhanh Top 10
                    </button>
                    <button type="button" className="saas-btn-gold" style={{ height: 32, padding: '0 12px', fontSize: 12 }} onClick={() => {
                      const currentPrizes = infoModal.prizes || [];
                      setInfoModal({
                        ...infoModal,
                        prizes: [...currentPrizes, { group: infoModal.group || 'Tất cả', rankFrom: currentPrizes.length + 1, rankTo: currentPrizes.length + 1, prizeName: 'Huy chương Vàng', medal: 'gold' }]
                      });
                    }}>
                      + Thêm Khung Giải
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(infoModal.prizes || []).map((pz, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1.2fr 70px 70px 1.2fr 110px 1fr auto', gap: 6, alignItems: 'center', background: '#F8FAFC', padding: 10, borderRadius: 10, border: '1px solid #E2E8F0' }}>
                      <input className="saas-input" style={{ paddingLeft: 8, height: 36, fontSize: 12 }} placeholder="Bảng (U08/Tất cả)" value={pz.group} onChange={(e) => {
                        const next = [...(infoModal.prizes || [])];
                        next[idx].group = e.target.value;
                        setInfoModal({ ...infoModal, prizes: next });
                      }} />
                      <input className="saas-input" type="number" min={1} style={{ paddingLeft: 6, height: 36, fontSize: 12 }} placeholder="Từ hạng" value={pz.rankFrom ?? pz.rank ?? 1} onChange={(e) => {
                        const next = [...(infoModal.prizes || [])];
                        next[idx].rankFrom = Number(e.target.value);
                        setInfoModal({ ...infoModal, prizes: next });
                      }} />
                      <input className="saas-input" type="number" min={1} style={{ paddingLeft: 6, height: 36, fontSize: 12 }} placeholder="Đến hạng" value={pz.rankTo ?? pz.rankFrom ?? pz.rank ?? 1} onChange={(e) => {
                        const next = [...(infoModal.prizes || [])];
                        next[idx].rankTo = Number(e.target.value);
                        setInfoModal({ ...infoModal, prizes: next });
                      }} />
                      <input className="saas-input" style={{ paddingLeft: 8, height: 36, fontSize: 12 }} placeholder="Tên giải thưởng" value={pz.prizeName} onChange={(e) => {
                        const next = [...(infoModal.prizes || [])];
                        next[idx].prizeName = e.target.value;
                        setInfoModal({ ...infoModal, prizes: next });
                      }} />
                      <select className="saas-input" style={{ paddingLeft: 4, height: 36, fontSize: 12 }} value={pz.medal || 'custom'} onChange={(e) => {
                        const next = [...(infoModal.prizes || [])];
                        next[idx].medal = e.target.value as any;
                        setInfoModal({ ...infoModal, prizes: next });
                      }}>
                        <option value="gold">🥇 HC Vàng</option>
                        <option value="silver">🥈 HC Bạc</option>
                        <option value="bronze">🥉 HC Đồng</option>
                        <option value="top">🏆 Khuyến khích</option>
                      </select>
                      <input className="saas-input" style={{ paddingLeft: 8, height: 36, fontSize: 12 }} placeholder="Quà tặng kèm (nếu có)" value={pz.gift || ''} onChange={(e) => {
                        const next = [...(infoModal.prizes || [])];
                        next[idx].gift = e.target.value;
                        setInfoModal({ ...infoModal, prizes: next });
                      }} />
                      <button type="button" className="outline danger-btn" style={{ padding: '6px 8px', fontSize: 12, borderRadius: 6 }} onClick={() => {
                        const next = (infoModal.prizes || []).filter((_, i) => i !== idx);
                        setInfoModal({ ...infoModal, prizes: next });
                      }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {!infoModal.prizes?.length && (
                    <p style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic', margin: 0 }}>Chưa có cơ cấu giải thưởng thủ công. Hệ thống tự động tính mặc định: Hạng 1 (🥇 Vàng), Hạng 2 (🥈 Bạc), Hạng 3 (🥉 Đồng), Top 4 (🏆 Khuyến khích).</p>
                  )}
                </div>
              </div>

              {error && <p className="notice warning" role="alert" style={{ marginTop: 12 }}>{error}</p>}
              <div className="dialog-actions" style={{ marginTop: 16 }}>
                <button type="button" className="outline" disabled={!!busy} onClick={() => setInfoModal(null)}>Hủy</button>
                <button className="saas-btn-primary" disabled={!!busy}>{busy ? 'Đang lưu…' : 'Lưu Quản Trị Giải Đấu'}</button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!bannerModal} onOpenChange={(v: boolean) => { if (!v && !busy) setBannerModal(null); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{bannerModal?.id ? 'Sửa thông tin Banner' : 'Thêm Banner Quảng Bá Mới'}</DialogTitle>
            <DialogDescription>Tải ảnh banner từ máy tính và thiết lập nội dung quảng bá.</DialogDescription>
          </DialogHeader>
          {bannerModal && (
            <form className="edit-form" onSubmit={async (e: React.FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const act = bannerModal.id ? 'banner_update' : 'banner_create';
              if (await action(act, { ...bannerModal })) setBannerModal(null);
            }}>
              <label className="saas-label">Tiêu đề banner (*)<input className="saas-input" style={{ paddingLeft: 16 }} required maxLength={200} placeholder="Ví dụ: Giải đấu mới đã cập nhật" value={bannerModal.title || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBannerModal({ ...bannerModal, title: e.target.value })} /></label>
              <label className="saas-label">Mô tả ngắn<input className="saas-input" style={{ paddingLeft: 16 }} maxLength={300} placeholder="Mô tả phụ cho banner..." value={bannerModal.description || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBannerModal({ ...bannerModal, description: e.target.value })} /></label>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '8px 0' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#062B4F' }}>Hình ảnh Banner (*)</span>

                {bannerModal.image_url ? (
                  <div style={{ borderRadius: 14, border: '1.5px solid #CBD5E1', background: '#FFFFFF', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ position: 'relative', width: '100%', height: 130, borderRadius: 10, overflow: 'hidden', background: '#062B4F' }}>
                      <img src={bannerModal.image_url} alt="Preview banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', bottom: 8, left: 12, color: '#FFFFFF', fontSize: 11, fontWeight: 700, background: 'rgba(6,43,79,0.85)', padding: '2px 8px', borderRadius: 4 }}>
                        Preview Ảnh Banner (24px Radius)
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <label className="outline" style={{ cursor: 'pointer', padding: '6px 14px', fontSize: 12, fontWeight: 700, margin: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {uploading ? <RefreshCw size={14} className="spin" /> : <Upload size={14} />}
                        <span>{uploading ? 'Đang tải…' : 'Thay ảnh'}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/jpg"
                          style={{ display: 'none' }}
                          disabled={uploading}
                          onChange={e => {
                            if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        className="outline danger-btn"
                        style={{ padding: '6px 14px', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        onClick={() => setBannerModal({ ...bannerModal, image_url: '' })}
                      >
                        <Trash2 size={14} />
                        <span>Xóa ảnh</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ border: '2px dashed #D4AF37', borderRadius: 14, padding: '24px 16px', background: '#F8FAFC', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <ImageIcon size={36} style={{ color: '#145DA0' }} />
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#062B4F' }}>Chưa chọn hình ảnh cho banner</div>
                    <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>File cho phép: .jpg, .jpeg, .png, .webp (Tối đa 5MB)</p>

                    <label className="saas-btn-gold" style={{ cursor: 'pointer', padding: '0 20px', height: 40, fontSize: 13, fontWeight: 700, margin: '8px 0 0', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {uploading ? <RefreshCw size={15} className="spin" /> : <Upload size={15} />}
                      <span>{uploading ? 'Đang tải ảnh lên…' : 'Chọn ảnh từ máy tính'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        style={{ display: 'none' }}
                        disabled={uploading}
                        onChange={e => {
                          if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                        }}
                      />
                    </label>
                  </div>
                )}

                <div style={{ textAlign: 'right', marginTop: 2 }}>
                  <button
                    type="button"
                    style={{ background: 'none', border: 0, padding: 0, color: '#145DA0', fontSize: 12, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}
                    onClick={() => setShowManualUrl(!showManualUrl)}
                  >
                    {showManualUrl ? 'Ẩn nhập URL thủ công' : 'Nhập đường dẫn URL thủ công (nếu cần)'}
                  </button>
                </div>

                {showManualUrl && (
                  <label className="saas-label" style={{ marginTop: 4 }}>
                    Đường dẫn URL ảnh
                    <input
                      className="saas-input"
                      style={{ paddingLeft: 16 }}
                      placeholder="/company-logo.png hoặc URL ảnh online"
                      value={bannerModal.image_url || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBannerModal({ ...bannerModal, image_url: e.target.value })}
                    />
                  </label>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label className="saas-label">Nút bấm (CTA)<input className="saas-input" style={{ paddingLeft: 16 }} placeholder="Xem kết quả" value={bannerModal.button_text || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBannerModal({ ...bannerModal, button_text: e.target.value })} /></label>
                <label className="saas-label">Liên kết nút bấm<input className="saas-input" style={{ paddingLeft: 16 }} placeholder="/?view=tournaments" value={bannerModal.button_link || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBannerModal({ ...bannerModal, button_link: e.target.value })} /></label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'center' }}>
                <label className="saas-label">Thứ tự hiển thị<input className="saas-input" style={{ paddingLeft: 16 }} type="number" min={0} value={bannerModal.sort_order ?? 1} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBannerModal({ ...bannerModal, sort_order: Number(e.target.value) })} /></label>
                <label className="saas-label" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 22 }}>
                  <input type="checkbox" style={{ width: 18, height: 18, accentColor: '#062B4F' }} checked={bannerModal.is_active !== 0} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBannerModal({ ...bannerModal, is_active: e.target.checked ? 1 : 0 })} />
                  <span>Hiển thị trên trang chủ</span>
                </label>
              </div>

              {error && <p className="notice warning" role="alert">{error}</p>}
              <div className="dialog-actions" style={{ marginTop: 16 }}>
                <button type="button" className="outline" disabled={!!busy} onClick={() => setBannerModal(null)}>Hủy</button>
                <button className="saas-btn-gold" disabled={!!busy}>{busy ? 'Đang lưu…' : bannerModal.id ? 'Lưu chỉnh sửa' : 'Tạo Banner'}</button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewBanner} onOpenChange={(v: boolean) => { if (!v) setPreviewBanner(null); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Xem trước Banner</DialogTitle>
            <DialogDescription>Giao diện xem trước của banner khi hiển thị trên trang chủ.</DialogDescription>
          </DialogHeader>
          {previewBanner && (
            <div style={{ margin: '10px 0' }}>
              <div className="promo-banner-container" style={{ minHeight: 180, marginTop: 0 }}>
                <div className="promo-banner-slide active" style={{ opacity: 1 }}>
                  {previewBanner.image_url && <div className="banner-bg-image" style={{ backgroundImage: `url(${previewBanner.image_url})` }} />}
                  <div className="banner-overlay" />
                  <div className="banner-content">
                    <div className="banner-badge"><span>XEM TRƯỚC BANNER</span></div>
                    <h2 className="banner-title" style={{ fontSize: 22 }}>{previewBanner.title}</h2>
                    {previewBanner.description && <p className="banner-description">{previewBanner.description}</p>}
                    {previewBanner.button_text && (
                      <button className="banner-cta-btn" style={{ padding: '8px 16px', fontSize: 13 }}>
                        <span>{previewBanner.button_text}</span>
                      </button>
                    )}
                  </div>
                  <img src={previewBanner.image_url || '/company-logo.png'} alt={previewBanner.title} className="banner-side-logo" style={{ width: 70, height: 70 }} />
                </div>
              </div>
              <div className="dialog-actions" style={{ marginTop: 16 }}>
                <button className="saas-btn-primary" onClick={() => setPreviewBanner(null)}>Đóng xem trước</button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!remove} onOpenChange={(v: boolean) => { if (!v && !busy) setRemove(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <DialogTitle>Xóa giải đấu?</DialogTitle>
            <AlertDialogDescription>Giải “{remove?.name}” và toàn bộ dữ liệu kỳ thủ của giải sẽ bị xóa. Nhập đúng tên giải bên dưới để xác nhận.</AlertDialogDescription>
          </AlertDialogHeader>
          <label className="saas-label">Tên giải cần xóa<input className="saas-input" style={{ paddingLeft: 16 }} value={confirmName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmName(e.target.value)} autoComplete="off" /></label>
          {error && <p className="notice warning" role="alert">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!busy}>Hủy</AlertDialogCancel>
            <button className="primary danger-delete" disabled={!!busy || confirmName !== remove?.name} onClick={async () => { if (await action('delete', { id: remove?.id, confirmName })) setRemove(null); }}>
              {busy ? 'Đang xóa…' : 'Xóa giải'}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteBanner} onOpenChange={(v: boolean) => { if (!v && !busy) setDeleteBanner(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <DialogTitle>Xóa Banner này?</DialogTitle>
            <AlertDialogDescription>Banner “{deleteBanner?.title}” sẽ bị xóa vĩnh viễn khỏi hệ thống.</AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="notice warning" role="alert">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!busy}>Hủy</AlertDialogCancel>
            <button className="primary danger-delete" disabled={!!busy} onClick={async () => { if (await action('banner_delete', { id: deleteBanner?.id })) setDeleteBanner(null); }}>
              {busy ? 'Đang xóa…' : 'Xóa Banner'}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
