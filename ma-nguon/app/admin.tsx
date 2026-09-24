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
  UserCheck,
  RotateCcw,
  AlertTriangle,
  Filter,
  X,
  Check
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

export function formatVietnamTime(date: string | Date | number | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(d);
}

export function formatVietnamDateTime(date: string | Date | number | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(d);
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

export interface TournamentSlideItem {
  id?: string;
  tournament_id: string;
  tournament_name?: string;
  title: string;
  slide_type: string;
  image_url: string;
  display_order: number;
  status: 'active' | 'hidden' | string;
  created_at?: string;
  updated_at?: string;
}

export interface SyncLogItem {
  id: string;
  tournament_id?: string;
  tournament_name?: string;
  url: string;
  created_at: string;
  status: 'success' | 'failed' | string;
  players_updated: number;
  message: string;
}

export interface AdminState {
  admin: boolean;
  username?: string;
  csrf?: string;
  tournaments?: Tournament[];
  banners?: BannerItem[];
  prizes?: PrizeRuleItem[];
  slides?: TournamentSlideItem[];
  logs?: AdminLog[];
  syncLogs?: SyncLogItem[];
}

export interface CategoryItem {
  id?: string;
  group: string;
  name?: string;
  source: string;
  playerCount?: number;
  status?: string;
  error?: string;
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
  const [selectedTournamentIds, setSelectedTournamentIds] = useState<string[]>([]);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [selectedPrizeIds, setSelectedPrizeIds] = useState<string[]>([]);
  const [bulkDeletePrizesModalOpen, setBulkDeletePrizesModalOpen] = useState(false);
  const [q, setQ] = useState('');

  async function handleBulkDelete() {
    if (selectedTournamentIds.length === 0) return;
    setBusy('bulk_delete');
    setError('');
    try {
      const r = await apiFetch('/api/tournaments/bulk', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(state?.csrf ? { 'X-CSRF-Token': state.csrf } : {})
        },
        body: JSON.stringify({ ids: selectedTournamentIds })
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || 'Lỗi xóa giải đấu');

      toast.success(d.message || `Đã xóa ${selectedTournamentIds.length} giải đấu thành công!`);
      setSelectedTournamentIds([]);
      setBulkDeleteModalOpen(false);
      await load();
      onChanged();
    } catch (e) {
      setError((e as Error).message);
      toast.error((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function handleBulkDeletePrizes() {
    if (selectedPrizeIds.length === 0) return;
    setBusy('bulk_delete_prizes');
    setError('');
    try {
      const r = await apiFetch('/api/prizes/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(state?.csrf ? { 'X-CSRF-Token': state.csrf } : {})
        },
        body: JSON.stringify({ ids: selectedPrizeIds })
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || 'Lỗi xóa cơ cấu giải thưởng');

      toast.success(d.message || `Đã xóa ${selectedPrizeIds.length} cơ cấu giải thưởng thành công!`);
      setSelectedPrizeIds([]);
      setBulkDeletePrizesModalOpen(false);
      await load();
      onChanged();
    } catch (e: any) {
      setError(e.message || 'Không thể xóa các cơ cấu giải thưởng đã chọn.');
      toast.error(e.message || 'Không thể xóa các cơ cấu giải thưởng đã chọn.');
    } finally {
      setBusy('');
    }
  }

  async function handleBulkSync() {
    if (selectedTournamentIds.length === 0) return;
    setBusy('bulk_sync');
    let successCount = 0;
    for (const id of selectedTournamentIds) {
      try {
        const ok = await action('sync', { id });
        if (ok) successCount++;
      } catch {}
    }
    toast.success(`Đã đồng bộ ${successCount}/${selectedTournamentIds.length} giải đấu.`);
    setBusy('');
  }
  const [bannerModal, setBannerModal] = useState<Partial<BannerItem> | null>(null);
  const [infoModal, setInfoModal] = useState<Tournament | null>(null);
  const [previewBanner, setPreviewBanner] = useState<BannerItem | null>(null);
  const [deleteBanner, setDeleteBanner] = useState<BannerItem | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showManualUrl, setShowManualUrl] = useState(false);
  const [activeTab, setActiveTab] = useState<'tournaments' | 'slides' | 'prizes' | 'banners' | 'sync_logs'>('tournaments');
  const [slideForm, setSlideForm] = useState<{
    id?: string;
    tournament_id: string;
    title: string;
    slide_type: string;
    image_url: string;
    display_order: number | string;
    status: 'active' | 'hidden';
  }>({
    id: '',
    tournament_id: 'global',
    title: '',
    slide_type: 'Điều lệ giải đấu',
    image_url: '',
    display_order: 1,
    status: 'active'
  });
  const [uploadingSlide, setUploadingSlide] = useState(false);

  async function handleSlideFileUpload(file: File) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Dung lượng hình ảnh quá lớn (Tối đa 8MB).');
      return;
    }
    setUploadingSlide(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const r = await apiFetch('/api/admin/slides/upload', {
        method: 'POST',
        headers: {
          ...(state?.csrf ? { 'X-CSRF-Token': state.csrf } : {})
        },
        body: formData
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || 'Lỗi tải ảnh slide');
      setSlideForm(prev => ({ ...prev, image_url: d.url! }));
      toast.success('Tải ảnh slide thành công!');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploadingSlide(false);
    }
  }

  async function saveSlide() {
    if (!slideForm.title.trim()) {
      toast.error('Vui lòng nhập Tiêu đề slide.');
      return;
    }
    if (!slideForm.image_url.trim()) {
      toast.error('Vui lòng tải ảnh lên hoặc chọn đường dẫn ảnh.');
      return;
    }

    setBusy('slide_save');
    try {
      const isEdit = !!slideForm.id;
      const endpoint = isEdit ? `/api/admin/slides/${slideForm.id}` : '/api/admin/slides';
      const r = await apiFetch(endpoint, {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(state?.csrf ? { 'X-CSRF-Token': state.csrf } : {})
        },
        body: JSON.stringify({
          title: slideForm.title.trim(),
          slide_type: slideForm.slide_type,
          image: slideForm.image_url.trim(),
          image_url: slideForm.image_url.trim(),
          sort_order: Number(slideForm.display_order || 0),
          display_order: Number(slideForm.display_order || 0),
          status: slideForm.status
        })
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || 'Lỗi lưu slide');
      toast.success(d.message || (isEdit ? 'Đã cập nhật slide thành công!' : 'Đã tạo slide mới thành công!'));
      setSlideForm({
        id: '',
        tournament_id: '',
        title: '',
        slide_type: 'Điều lệ giải đấu',
        image_url: '',
        display_order: (state?.slides?.length || 0) + 1,
        status: 'active'
      });
      await load();
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function deleteSlide(id: string) {
    if (!confirm('Bạn có chắc chắn muốn xóa slide này?')) return;
    setBusy('slide_delete');
    try {
      const r = await apiFetch(`/api/admin/slides/${id}`, {
        method: 'DELETE',
        headers: {
          ...(state?.csrf ? { 'X-CSRF-Token': state.csrf } : {})
        }
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || 'Lỗi xóa slide');
      toast.success(d.message || 'Đã xóa slide thành công!');
      await load();
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function toggleSlideStatus(item: TournamentSlideItem) {
    setBusy('slide_toggle');
    const newStatus = item.status === 'active' ? 'hidden' : 'active';
    try {
      const r = await apiFetch(`/api/admin/slides/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(state?.csrf ? { 'X-CSRF-Token': state.csrf } : {})
        },
        body: JSON.stringify({
          ...item,
          status: newStatus
        })
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || 'Lỗi thay đổi trạng thái');
      toast.success(newStatus === 'active' ? 'Đã hiển thị slide' : 'Đã ẩn slide');
      await load();
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy('');
    }
  }
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

  // --- BULK PRIZES OVERHAUL STATE ---
  const [prizeViewTab, setPrizeViewTab] = useState<'bulk' | 'list'>('bulk');
  const [selectedTournaments, setSelectedTournaments] = useState<string[]>([]);
  const [tournamentSearch, setTournamentSearch] = useState('');
  const [categoryScopeMode, setCategoryScopeMode] = useState<'all' | 'specific'>('all');
  const [selectedCategoryKeys, setSelectedCategoryKeys] = useState<string[]>([]);

  const [bulkRules, setBulkRules] = useState<Array<{
    id: string;
    rank_from: number | string;
    rank_to: number | string;
    medal: string;
    prize_name: string;
    description: string;
  }>>([
    { id: '1', rank_from: 1, rank_to: 1, medal: 'Gold Medal', prize_name: 'Cúp Vô Địch + Huy Chương Vàng', description: 'Tiền thưởng + Quà tặng' },
    { id: '2', rank_from: 2, rank_to: 2, medal: 'Silver Medal', prize_name: 'Huy Chương Bạc', description: 'Tiền thưởng + Bằng khen' },
    { id: '3', rank_from: 3, rank_to: 3, medal: 'Bronze Medal', prize_name: 'Huy Chương Đồng', description: 'Tiền thưởng + Bằng khen' }
  ]);

  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const [conflictStrategy, setConflictStrategy] = useState<'skip' | 'overwrite' | 'keep_all'>('skip');
  const [singleEditPrizeModal, setSingleEditPrizeModal] = useState<PrizeRuleItem | null>(null);

  // Filter state for saved rules list
  const [filterTournamentId, setFilterTournamentId] = useState('all');
  const [filterGroupName, setFilterGroupName] = useState('');
  const [filterSearchText, setFilterSearchText] = useState('');

  // Active tournaments list
  const activeTournaments = React.useMemo(() => state?.tournaments || [], [state?.tournaments]);

  // Helper: Filter active tournaments
  const filteredTournaments = React.useMemo(() => {
    if (!tournamentSearch.trim()) return activeTournaments;
    const norm = normalize(tournamentSearch);
    return activeTournaments.filter(t => normalize(t.name).includes(norm) || t.id.includes(tournamentSearch.trim()));
  }, [activeTournaments, tournamentSearch]);

  // Helper: Toggle tournament selection
  function toggleTournamentSelect(id: string) {
    if (selectedTournaments.includes(id)) {
      setSelectedTournaments(prev => prev.filter(x => x !== id));
      setSelectedCategoryKeys(prev => prev.filter(k => !k.startsWith(`${id}::`)));
    } else {
      setSelectedTournaments(prev => [...prev, id]);
    }
  }

  // Helper: Get categories list for a tournament
  function getTournamentCategoryList(tour: Tournament): Array<{ group: string; playerCount: number }> {
    if (tour.categories && tour.categories.length > 0) {
      return tour.categories.map(c => ({ group: c.group, playerCount: (c as any).playerCount || (c as any).player_count || (c as any).count || 0 }));
    }
    if (tour.group && tour.group.trim()) {
      return [{ group: tour.group.trim(), playerCount: tour.players?.length || 0 }];
    }
    return [{ group: 'Tất cả', playerCount: tour.players?.length || 0 }];
  }

  // Helper: Toggle category selection
  function toggleCategorySelect(key: string) {
    if (selectedCategoryKeys.includes(key)) {
      setSelectedCategoryKeys(prev => prev.filter(x => x !== key));
    } else {
      setSelectedCategoryKeys(prev => [...prev, key]);
    }
  }

  // Helper: Resolved targets list (tournaments + categories)
  const resolvedTargets = React.useMemo(() => {
    const targets: Array<{ tournament_id: string; tournament_name: string; group_name: string }> = [];
    selectedTournaments.forEach(tId => {
      const tour = activeTournaments.find(t => t.id === tId);
      if (!tour) return;
      if (categoryScopeMode === 'all') {
        targets.push({
          tournament_id: tour.id,
          tournament_name: tour.name,
          group_name: 'Tất cả'
        });
      } else {
        const catKeys = selectedCategoryKeys.filter(k => k.startsWith(`${tId}::`));
        if (catKeys.length === 0) {
          targets.push({
            tournament_id: tour.id,
            tournament_name: tour.name,
            group_name: 'Tất cả'
          });
        } else {
          catKeys.forEach(k => {
            const gName = k.split('::')[1];
            if (gName) {
              targets.push({
                tournament_id: tour.id,
                tournament_name: tour.name,
                group_name: gName
              });
            }
          });
        }
      }
    });
    return targets;
  }, [selectedTournaments, categoryScopeMode, selectedCategoryKeys, activeTournaments]);

  // Helper: Detect existing conflicts
  const conflictsInfo = React.useMemo(() => {
    if (!resolvedTargets.length || !bulkRules.length) return { hasConflict: false, targetCount: 0, ruleCount: 0, conflictingRules: [] };
    const conflictingRules: PrizeRuleItem[] = [];
    resolvedTargets.forEach(tgt => {
      const existing = (state?.prizes || []).filter(p => p.tournament_id === tgt.tournament_id && p.group_name === tgt.group_name);
      bulkRules.forEach(r => {
        const rFrom = Number(r.rank_from);
        const rTo = Number(r.rank_to);
        const conflicts = existing.filter(e => rFrom <= e.rank_to && rTo >= e.rank_from);
        conflictingRules.push(...conflicts);
      });
    });
    const uniqueConflicting = Array.from(new Set(conflictingRules.map(c => c.id))).map(id => conflictingRules.find(c => c.id === id)!);
    return {
      hasConflict: uniqueConflicting.length > 0,
      targetCount: resolvedTargets.length,
      ruleCount: bulkRules.length,
      conflictingRules: uniqueConflicting
    };
  }, [resolvedTargets, bulkRules, state?.prizes]);

  function addRuleRow() {
    const nextId = String(Date.now() + Math.random());
    const lastRule = bulkRules[bulkRules.length - 1];
    const nextRank = lastRule ? Number(lastRule.rank_to) + 1 : 1;
    setBulkRules(prev => [
      ...prev,
      {
        id: nextId,
        rank_from: nextRank,
        rank_to: nextRank,
        medal: 'Certificate',
        prize_name: `Bằng khen Hạng ${nextRank}`,
        description: 'Bằng khen danh dự'
      }
    ]);
  }

  function updateRuleRow(id: string, field: string, value: any) {
    setBulkRules(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }

  function removeRuleRow(id: string) {
    setBulkRules(prev => prev.filter(r => r.id !== id));
  }

  function applyPresetStandard13() {
    setBulkRules([
      { id: '1', rank_from: 1, rank_to: 1, medal: 'Gold Medal', prize_name: 'Cúp Vô Địch + Huy Chương Vàng', description: 'Tiền thưởng + Quà tặng' },
      { id: '2', rank_from: 2, rank_to: 2, medal: 'Silver Medal', prize_name: 'Huy Chương Bạc', description: 'Tiền thưởng + Bằng khen' },
      { id: '3', rank_from: 3, rank_to: 3, medal: 'Bronze Medal', prize_name: 'Huy Chương Đồng', description: 'Tiền thưởng + Bằng khen' }
    ]);
  }

  function applyPresetStandard15() {
    setBulkRules([
      { id: '1', rank_from: 1, rank_to: 1, medal: 'Gold Medal', prize_name: 'Cúp Vô Địch + Huy Chương Vàng', description: 'Tiền thưởng + Quà tặng' },
      { id: '2', rank_from: 2, rank_to: 2, medal: 'Silver Medal', prize_name: 'Huy Chương Bạc', description: 'Tiền thưởng + Bằng khen' },
      { id: '3', rank_from: 3, rank_to: 3, medal: 'Bronze Medal', prize_name: 'Huy Chương Đồng', description: 'Tiền thưởng + Bằng khen' },
      { id: '4', rank_from: 4, rank_to: 5, medal: 'Certificate', prize_name: 'Giải Khuyến Khích (Bằng khen)', description: 'Bằng khen + Quà lưu niệm' }
    ]);
  }

  function openBulkConfirmDialog() {
    if (!resolvedTargets.length) {
      toast.error('Vui lòng chọn ít nhất 1 Giải đấu hoặc Bảng đấu.');
      return;
    }
    if (!bulkRules.length) {
      toast.error('Vui lòng tạo ít nhất 1 dòng quy tắc giải thưởng.');
      return;
    }
    for (let i = 0; i < bulkRules.length; i++) {
      const r = bulkRules[i];
      const rFrom = Number(r.rank_from);
      const rTo = Number(r.rank_to);
      if (isNaN(rFrom) || isNaN(rTo) || rFrom < 1 || rTo < 1 || !Number.isInteger(rFrom) || !Number.isInteger(rTo)) {
        toast.error(`Dòng ${i + 1}: Hạng từ và Hạng đến phải là số nguyên dương (>= 1).`);
        return;
      }
      if (rFrom > rTo) {
        toast.error(`Dòng ${i + 1}: Hạng từ (${rFrom}) không được lớn hơn Hạng đến (${rTo}).`);
        return;
      }
      if (!r.prize_name.trim()) {
        toast.error(`Dòng ${i + 1}: Vui lòng nhập Tên giải thưởng.`);
        return;
      }
    }
    setShowBulkConfirmModal(true);
  }

  async function submitBulkPrizeRules() {
    setBusy('bulk_prize_save');
    try {
      const r = await apiFetch('/api/admin/prizes/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(state?.csrf ? { 'X-CSRF-Token': state.csrf } : {})
        },
        body: JSON.stringify({
          targets: resolvedTargets.map(t => ({ tournament_id: t.tournament_id, group_name: t.group_name })),
          rules: bulkRules.map(r => ({
            rank_from: Number(r.rank_from),
            rank_to: Number(r.rank_to),
            medal: r.medal,
            prize_name: r.prize_name.trim(),
            description: r.description.trim()
          })),
          conflictStrategy
        })
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error || 'Lỗi áp dụng cơ cấu giải thưởng');
      toast.success(d.message || 'Đã áp dụng thành công cơ cấu giải thưởng!');
      setShowBulkConfirmModal(false);
      await load();
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  const filteredSavedPrizes = React.useMemo(() => {
    let list = state?.prizes || [];
    if (filterTournamentId !== 'all') {
      list = list.filter(p => p.tournament_id === filterTournamentId);
    }
    if (filterGroupName.trim()) {
      const normG = normalize(filterGroupName);
      list = list.filter(p => normalize(p.group_name).includes(normG));
    }
    if (filterSearchText.trim()) {
      const normS = normalize(filterSearchText);
      list = list.filter(p => normalize(p.prize_name).includes(normS) || normalize(p.description || '').includes(normS));
    }
    return list;
  }, [state?.prizes, filterTournamentId, filterGroupName, filterSearchText]);

  function openSingleEditModal(pz: PrizeRuleItem) {
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
    setSingleEditPrizeModal(pz);
  }

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
    const interval = setInterval(() => {
      load();
    }, 30000);
    return () => clearInterval(interval);
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

  const tournaments = activeTournaments.filter((t: Tournament) => normalize(t.name + ' ' + t.group).includes(normalize(q)));
  const totalPlayersCount = activeTournaments.reduce((a: number, t: Tournament) => a + (t.players ? t.players.length : 0), 0);
  const publishedCount = activeTournaments.filter((t: Tournament) => t.published).length;
  const lastSyncTime = (activeTournaments[0]?.lastSync || activeTournaments[0]?.last_sync || activeTournaments[0]?.updated) ? formatVietnamTime(activeTournaments[0]?.lastSync || activeTournaments[0]?.last_sync || activeTournaments[0]?.updated) : null;

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
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <span className="soft-badge" style={{
                            background: c.status === 'Đã nhập' ? '#DCFCE7' : c.status === 'Lỗi tải' ? '#FEE2E2' : '#FEF3C7',
                            color: c.status === 'Đã nhập' ? '#15803D' : c.status === 'Lỗi tải' ? '#DC2626' : '#B45309',
                            border: `1px solid ${c.status === 'Đã nhập' ? '#86EFAC' : c.status === 'Lỗi tải' ? '#FCA5A5' : '#FDE68A'}`
                          }}>
                            {c.status || 'Chưa nhập'}
                          </span>
                          {c.status === 'Lỗi tải' && (
                            <button
                              type="button"
                              className="outline"
                              style={{ padding: '2px 8px', fontSize: 12, height: 26, borderRadius: 6 }}
                              onClick={() => action('detect')}
                              title={c.error || 'Thử lại phân tích'}
                            >
                              Thử lại
                            </button>
                          )}
                        </div>
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

        {selectedTournamentIds.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#062B4F',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 12,
            marginBottom: 16,
            boxShadow: '0 4px 12px rgba(6,43,79,0.15)',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14 }}>
              <CheckSquare size={18} style={{ color: '#FACC15' }} />
              <span>Đã chọn <strong style={{ color: '#FACC15', fontSize: 16 }}>{selectedTournamentIds.length}</strong> giải đấu</span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                className="outline"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  color: '#FFFFFF',
                  borderColor: 'rgba(255,255,255,0.3)',
                  padding: '8px 16px',
                  fontSize: 13,
                  borderRadius: 8,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
                disabled={!!busy}
                onClick={handleBulkSync}
              >
                <RefreshCw size={14} className={busy === 'bulk_sync' ? 'spin' : ''} />
                <span>Đồng bộ đã chọn</span>
              </button>
              <button
                className="primary danger-delete"
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  borderRadius: 8,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#DC2626',
                  borderColor: '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: 700
                }}
                disabled={!!busy}
                onClick={() => { setError(''); setBulkDeleteModalOpen(true); }}
              >
                <Trash2 size={14} />
                <span>Xóa đã chọn ({selectedTournamentIds.length})</span>
              </button>
            </div>
          </div>
        )}

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
                  <th style={{ width: 44, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả"
                      checked={tournaments.length > 0 && tournaments.every((t: Tournament) => selectedTournamentIds.includes(t.id))}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        if (e.target.checked) {
                          setSelectedTournamentIds(tournaments.map((t: Tournament) => t.id));
                        } else {
                          setSelectedTournamentIds([]);
                        }
                      }}
                      style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#062B4F' }}
                    />
                  </th>
                  <th>Tên giải đấu</th>
                  <th>Bảng đấu / Nhóm</th>
                  <th style={{ textAlign: 'center' }}>Tự động đồng bộ</th>
                  <th style={{ textAlign: 'center' }}>Kỳ thủ</th>
                  <th style={{ textAlign: 'center' }}>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {tournaments.map((t: Tournament) => (
                  <tr key={t.id} style={{ background: selectedTournamentIds.includes(t.id) ? '#F1F5F9' : undefined }}>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        aria-label={`Chọn ${t.name}`}
                        checked={selectedTournamentIds.includes(t.id)}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          if (e.target.checked) {
                            setSelectedTournamentIds(prev => [...prev, t.id]);
                          } else {
                            setSelectedTournamentIds(prev => prev.filter(id => id !== t.id));
                          }
                        }}
                        style={{ cursor: 'pointer', width: 16, height: 16, accentColor: '#062B4F' }}
                      />
                    </td>
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
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <button
                          className="outline"
                          style={{
                            padding: '4px 10px',
                            fontSize: 12,
                            borderRadius: 20,
                            fontWeight: 600,
                            background: t.autoSync !== false ? '#EFF6FF' : '#F1F5F9',
                            color: t.autoSync !== false ? '#1D4ED8' : '#64748B',
                            borderColor: t.autoSync !== false ? '#BFDBFE' : '#CBD5E1',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6
                          }}
                          disabled={!!busy}
                          onClick={() => action('toggle_auto_sync', { id: t.id, auto_sync: t.autoSync === false })}
                          title={t.autoSync !== false ? 'Bấm để TẮT tự động đồng bộ' : 'Bấm để BẬT tự động đồng bộ (mỗi 5 phút)'}
                        >
                          <span style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: t.autoSync !== false ? '#2563EB' : '#94A3B8'
                          }} />
                          {t.autoSync !== false ? 'Auto Sync (5m)' : 'Tắt Auto Sync'}
                        </button>
                        <div style={{ fontSize: 11, color: '#64748B', display: 'flex', flexDirection: 'column', gap: 1 }}>
                          {t.lastSync || t.last_sync ? (
                            <span>Lần cuối: {formatVietnamTime(t.lastSync || t.last_sync)}</span>
                          ) : (
                            <span>Chưa đồng bộ</span>
                          )}
                          {t.autoSync !== false && (t.nextSync || t.next_sync) && (
                            <span style={{ color: '#2563EB', fontWeight: 500 }}>
                              Kế tiếp: {formatVietnamTime(t.nextSync || t.next_sync)}
                            </span>
                          )}
                        </div>
                      </div>
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
                        <button className="outline" style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8, color: '#DC2626', borderColor: '#FCA5A5' }} disabled={!!busy} onClick={() => action('force_sync', { id: t.id })} title="Ép đồng bộ lại (Xóa cache dữ liệu cũ)">
                          <RotateCcw size={14} className={busy === 'force_sync' ? 'spin' : ''} />
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

      {/* TOURNAMENT SLIDE MANAGEMENT SECTION */}
      {(activeTab === 'slides' || activeTab === 'tournaments') && (
        <section className="admin-card-section" id="admin-slide-management">
          <div className="admin-card-title-group">
            <div>
              <h2><ImageIcon size={22} className="text-amber-500" /> Quản lý Banner & Slide Giải Đấu</h2>
              <p>Đăng tải hình ảnh điều lệ, hướng dẫn, lịch thi đấu và thông tin giải.</p>
            </div>
            <button
              className="saas-btn-gold"
              style={{ height: 40, padding: '0 18px', fontSize: 13 }}
              onClick={() => {
                setSlideForm({
                  id: '',
                  tournament_id: 'global',
                  title: '',
                  slide_type: 'Điều lệ giải đấu',
                  image_url: '',
                  display_order: (state?.slides?.length || 0) + 1,
                  status: 'active'
                });
                document.getElementById('slide-form-block')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Plus size={16} />
              <span>+ Thêm slide mới</span>
            </button>
          </div>

          {/* ADD / EDIT SLIDE FORM */}
          <div id="slide-form-block" style={{ background: '#F8FAFC', padding: 24, borderRadius: 16, border: '1px solid #CBD5E1', marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#062B4F', marginTop: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={18} className="text-amber-500" />
              {slideForm.id ? 'Hiệu chỉnh slide thông tin' : 'Thêm slide thông tin giải đấu mới'}
            </h3>

            <form onSubmit={(e) => { e.preventDefault(); saveSlide(); }}>
              <div className="admin-two-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 16 }}>
                {/* 1. Slide Type */}
                <label className="saas-label">
                  Loại thông tin / Slide Type (*)
                  <select
                    className="saas-input"
                    style={{ paddingLeft: 12 }}
                    required
                    value={slideForm.slide_type}
                    onChange={(e) => setSlideForm({ ...slideForm, slide_type: e.target.value })}
                  >
                    <option value="Điều lệ giải đấu">📄 Điều lệ giải đấu</option>
                    <option value="Hướng dẫn thi đấu">📜 Hướng dẫn thi đấu</option>
                    <option value="Lịch thi đấu">📅 Lịch thi đấu</option>
                    <option value="Sơ đồ giải">🗺️ Sơ đồ giải</option>
                    <option value="Cơ cấu giải thưởng">🎁 Cơ cấu giải thưởng</option>
                    <option value="Thông tin giải đấu">ℹ️ Thông tin giải đấu</option>
                    <option value="Banner chính">🖼️ Banner chính</option>
                    <option value="Địa điểm tổ chức">📍 Địa điểm tổ chức</option>
                    <option value="Thông báo quan trọng">📢 Thông báo quan trọng</option>
                    <option value="Nhà tài trợ">🤝 Nhà tài trợ</option>
                    <option value="Khác">📌 Khác</option>
                  </select>
                </label>

                {/* 2. Display Order */}
                <label className="saas-label">
                  Thứ tự hiển thị (0, 1, 2...)
                  <input
                    type="number"
                    min={0}
                    className="saas-input"
                    style={{ paddingLeft: 12 }}
                    value={slideForm.display_order}
                    onChange={(e) => setSlideForm({ ...slideForm, display_order: Number(e.target.value) })}
                  />
                </label>

                {/* 3. Title */}
                <label className="saas-label" style={{ gridColumn: '1 / -1' }}>
                  Tiêu đề slide (*)
                  <input
                    type="text"
                    className="saas-input"
                    style={{ paddingLeft: 12 }}
                    required
                    placeholder="VD: Điều lệ & Lịch Thi Đấu Giải Cờ Vua Mới Nhất"
                    value={slideForm.title}
                    onChange={(e) => setSlideForm({ ...slideForm, title: e.target.value })}
                  />
                </label>

                {/* 4. Status */}
                <label className="saas-label">
                  Trạng thái
                  <select
                    className="saas-input"
                    style={{ paddingLeft: 12 }}
                    value={slideForm.status}
                    onChange={(e) => setSlideForm({ ...slideForm, status: e.target.value as any })}
                  >
                    <option value="active">🟢 Active (Hiển thị)</option>
                    <option value="hidden">🔴 Hidden (Đang ẩn)</option>
                  </select>
                </label>

                {/* 5. Upload Image */}
                <label className="saas-label" style={{ gridColumn: '1 / -1' }}>
                  Hình ảnh slide (Tối đa 8MB, JPG/PNG/WEBP - Hỗ trợ ảnh ngang & ảnh văn bản dọc) (*)
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: 'none' }}
                      id="slide-image-file-input"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleSlideFileUpload(file);
                      }}
                    />
                    <label
                      htmlFor="slide-image-file-input"
                      className="outline"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}
                    >
                      {uploadingSlide ? <RefreshCw size={16} className="spin" /> : <Upload size={16} />}
                      <span>{uploadingSlide ? 'Đang tải ảnh lên...' : 'Chọn file ảnh từ máy tính'}</span>
                    </label>

                    <span style={{ fontSize: 13, color: '#64748B' }}>hoặc nhập URL trực tiếp:</span>

                    <input
                      type="text"
                      className="saas-input"
                      style={{ flex: 1, minWidth: 200, paddingLeft: 12, height: 42 }}
                      placeholder="https://example.com/slide.jpg"
                      value={slideForm.image_url}
                      onChange={(e) => setSlideForm({ ...slideForm, image_url: e.target.value })}
                    />
                  </div>
                </label>
              </div>

              {/* Image Preview Box */}
              {slideForm.image_url && (
                <div style={{ marginBottom: 16, background: '#FFFFFF', padding: 14, borderRadius: 12, border: '1px solid #CBD5E1', display: 'block' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#062B4F', display: 'block', marginBottom: 8 }}>Xem trước hình ảnh slide (Hiển thị đầy đủ không bị crop):</span>
                  <div className="tournament-info-slider-card" style={{ width: '100%', height: 320, borderRadius: 10, border: '1px solid #CBD5E1', overflow: 'hidden' }}>
                    <img
                      src={slideForm.image_url}
                      alt="Slide preview"
                      className="tournament-info-slider-img"
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <button type="submit" className="saas-btn-gold" disabled={!!busy || uploadingSlide}>
                  {busy === 'slide_save' ? <RefreshCw size={17} className="spin" /> : <Sparkles size={17} />}
                  <span>{slideForm.id ? 'Cập Nhật Slide' : 'Lưu Slide Giải Đấu'}</span>
                </button>

                {slideForm.id && (
                  <button
                    type="button"
                    className="outline"
                    onClick={() => setSlideForm({
                      id: '',
                      tournament_id: '',
                      title: '',
                      slide_type: 'Điều lệ giải đấu',
                      image_url: '',
                      display_order: (state?.slides?.length || 0) + 1,
                      status: 'active'
                    })}
                  >
                    Hủy chỉnh sửa
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* SLIDES DISPLAY GRID / CARDS LIST */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {(state?.slides || []).map((item: TournamentSlideItem) => (
              <div key={item.id} style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #CBD5E1', overflow: 'hidden', boxShadow: '0 4px 12px rgba(6,43,79,0.05)', display: 'flex', flexDirection: 'column' }}>
                <div className="tournament-info-slider-card" style={{ height: 220, borderBottom: '1px solid #E2E8F0', borderRadius: '16px 16px 0 0' }}>
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="tournament-info-slider-img"
                  />
                  <span className="soft-badge" style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(6,43,79,0.85)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.3)', fontWeight: 700, fontSize: 11, zIndex: 2 }}>
                    {item.slide_type}
                  </span>
                  <span className="soft-badge" style={{ position: 'absolute', top: 10, right: 10, background: item.status === 'active' ? '#DCFCE7' : '#FEE2E2', color: item.status === 'active' ? '#15803D' : '#991B1B', fontWeight: 700, fontSize: 11, zIndex: 2 }}>
                    {item.status === 'active' ? '🟢 Active' : '🔴 Hidden'}
                  </span>
                </div>

                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 800, color: '#062B4F', margin: '0 0 4px' }}>{item.title}</h4>
                    <span style={{ fontSize: 12, color: '#64748B', fontWeight: 600, display: 'block' }}>📌 Slide Thông Tin Trang Chủ</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #F1F5F9' }}>
                    <span style={{ fontSize: 12, color: '#64748B' }}>Thứ tự: <b>{item.display_order}</b></span>

                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="outline"
                        style={{ padding: '6px 10px', fontSize: 12, borderRadius: 8 }}
                        onClick={() => toggleSlideStatus(item)}
                        title={item.status === 'active' ? 'Ẩn slide' : 'Hiện slide'}
                      >
                        {item.status === 'active' ? <EyeOff size={14} /> : <CheckCircle2 size={14} />}
                      </button>
                      <button
                        className="outline"
                        style={{ padding: '6px 10px', fontSize: 12, borderRadius: 8 }}
                        onClick={() => {
                          setSlideForm({
                            id: item.id,
                            tournament_id: item.tournament_id || 'global',
                            title: item.title,
                            slide_type: item.slide_type,
                            image_url: item.image_url,
                            display_order: item.display_order,
                            status: item.status as any
                          });
                          setActiveTab('slides');
                          document.getElementById('slide-form-block')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        title="Sửa slide"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="outline danger-btn"
                        style={{ padding: '6px 10px', fontSize: 12, borderRadius: 8 }}
                        disabled={!!busy}
                        onClick={() => item.id && deleteSlide(item.id)}
                        title="Xóa slide"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {!state?.slides?.length && (
              <div style={{ gridColumn: '1 / -1', padding: 32, textAlign: 'center', background: '#F8FAFC', borderRadius: 16, border: '1px dashed #CBD5E1', color: '#64748B' }}>
                Chưa có slide giải đấu nào. Nhấn "+ Thêm slide mới" phía trên để đăng tải hình ảnh thông tin giải.
              </div>
            )}
          </div>
        </section>
      )}

      {/* 5. TOURNAMENT PRIZE MANAGEMENT MODULE (OVERHAULED) */}
      {(activeTab === 'prizes' || activeTab === 'tournaments') && (
        <section className="admin-card-section" id="admin-prize-management">
          <div className="admin-card-title-group" style={{ marginBottom: 20 }}>
            <div>
              <h2><Sparkles size={24} className="text-amber-500" /> 🏆 Quản lý Cơ cấu Giải thưởng Hàng loạt</h2>
              <p>Áp dụng huy chương, danh hiệu, quà tặng và quy tắc trao thưởng cho nhiều giải đấu & bảng đấu cùng lúc.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="soft-badge" style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', padding: '6px 14px', borderRadius: 99, fontSize: 13, fontWeight: 700 }}>
                {state?.prizes?.length || 0} quy tắc giải thưởng đã lưu
              </span>
            </div>
          </div>

          {/* TAB BUILDER MODES */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, borderBottom: '2px solid #E2E8F0', paddingBottom: 12, overflowX: 'auto' }}>
            <button
              type="button"
              className={prizeViewTab === 'bulk' ? 'saas-btn-gold' : 'outline'}
              style={{ padding: '8px 18px', borderRadius: 10, fontSize: 14, fontWeight: 700 }}
              onClick={() => setPrizeViewTab('bulk')}
            >
              <Sparkles size={16} />
              <span>🚀 Thiết lập & Áp dụng Hàng loạt</span>
            </button>
            <button
              type="button"
              className={prizeViewTab === 'list' ? 'saas-btn-gold' : 'outline'}
              style={{ padding: '8px 18px', borderRadius: 10, fontSize: 14, fontWeight: 700 }}
              onClick={() => setPrizeViewTab('list')}
            >
              <BarChart3 size={16} />
              <span>📋 Danh sách Cơ cấu Đã Lưu ({state?.prizes?.length || 0})</span>
            </button>
          </div>

          {prizeViewTab === 'bulk' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* BLOCK 1: SELECTION OF TOURNAMENTS AND CATEGORIES */}
              <div style={{ background: '#FFFFFF', padding: 20, borderRadius: 16, border: '1px solid #CBD5E1', boxShadow: '0 2px 8px rgba(6,43,79,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#062B4F', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Layers3 size={18} className="text-amber-500" />
                    Bước 1: Chọn Giải đấu & Bảng đấu Áp dụng
                  </h3>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#145DA0', background: '#E0F2FE', padding: '4px 12px', borderRadius: 20 }}>
                    Đã chọn {resolvedTargets.length} mục áp dụng
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
                  {/* LEFT: TOURNAMENT MULTI-SELECT */}
                  <div style={{ background: '#F8FAFC', padding: 16, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                      <label className="saas-label" style={{ margin: 0, fontWeight: 800, color: '#062B4F' }}>
                        1.1. Giải đấu ({selectedTournaments.length}/{activeTournaments.length})
                      </label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          className="outline"
                          style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6 }}
                          onClick={() => {
                            const filteredIds = filteredTournaments.map(t => t.id);
                            const merged = Array.from(new Set([...selectedTournaments, ...filteredIds]));
                            setSelectedTournaments(merged);
                          }}
                        >
                          Chọn tất cả ({filteredTournaments.length})
                        </button>
                        <button
                          type="button"
                          className="outline"
                          style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6, color: '#DC2626' }}
                          onClick={() => {
                            setSelectedTournaments([]);
                            setSelectedCategoryKeys([]);
                          }}
                        >
                          Bỏ chọn tất cả
                        </button>
                      </div>
                    </div>

                    <div style={{ position: 'relative', marginBottom: 10 }}>
                      <Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: '#94A3B8' }} />
                      <input
                        type="text"
                        className="saas-input"
                        style={{ paddingLeft: 32, fontSize: 13, height: 36 }}
                        placeholder="Tìm theo tên hoặc mã giải đấu..."
                        value={tournamentSearch}
                        onChange={(e) => setTournamentSearch(e.target.value)}
                      />
                    </div>

                    <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4 }}>
                      {filteredTournaments.map(t => {
                        const isChecked = selectedTournaments.includes(t.id);
                        const catCount = t.categories?.length || (t.group ? 1 : 0);
                        return (
                          <div
                            key={t.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 10px',
                              borderRadius: 8,
                              background: isChecked ? '#EFF6FF' : '#FFFFFF',
                              border: isChecked ? '1px solid #93C5FD' : '1px solid #E2E8F0',
                              cursor: 'pointer',
                              userSelect: 'none'
                            }}
                            onClick={() => toggleTournamentSelect(t.id)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                style={{ width: 16, height: 16, cursor: 'pointer' }}
                              />
                              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#062B4F', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {t.name}
                                </span>
                                <span style={{ fontSize: 11, color: '#64748B' }}>Mã TNR: {t.id}</span>
                              </div>
                            </div>
                            <span style={{ fontSize: 11, color: '#64748B', background: '#F1F5F9', padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap', marginLeft: 6 }}>
                              {catCount} bảng
                            </span>
                          </div>
                        );
                      })}
                      {filteredTournaments.length === 0 && (
                        <p style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', margin: 12 }}>Không tìm thấy giải đấu phù hợp.</p>
                      )}
                    </div>

                    {/* SELECTED TOURNAMENTS TAGS */}
                    {selectedTournaments.length > 0 && (
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #E2E8F0', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {selectedTournaments.map(tId => {
                          const t = activeTournaments.find(x => x.id === tId);
                          if (!t) return null;
                          return (
                            <span
                              key={tId}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#DCEFE6', color: '#065F46', padding: '3px 8px', borderRadius: 14, fontSize: 12, fontWeight: 700 }}
                            >
                              {t.name}
                              <X
                                size={13}
                                style={{ cursor: 'pointer' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleTournamentSelect(tId);
                                }}
                              />
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* RIGHT: CATEGORIES SCOPE */}
                  <div style={{ background: '#F8FAFC', padding: 16, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                    <label className="saas-label" style={{ marginBottom: 10, fontWeight: 800, color: '#062B4F' }}>
                      1.2. Phạm vi Bảng đấu
                    </label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#062B4F' }}>
                        <input
                          type="radio"
                          name="categoryScopeMode"
                          checked={categoryScopeMode === 'all'}
                          onChange={() => setCategoryScopeMode('all')}
                        />
                        <span>🟢 Mặc định: Tất cả bảng đấu thuộc các giải đã chọn</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#062B4F' }}>
                        <input
                          type="radio"
                          name="categoryScopeMode"
                          checked={categoryScopeMode === 'specific'}
                          onChange={() => setCategoryScopeMode('specific')}
                        />
                        <span>🔵 Chọn bảng đấu cụ thể (Nhóm theo từng giải)</span>
                      </label>
                    </div>

                    {categoryScopeMode === 'specific' && (
                      <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 10, border: '1px solid #CBD5E1' }}>
                        {selectedTournaments.length === 0 ? (
                          <p style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', margin: 12 }}>
                            Vui lòng chọn ít nhất 1 Giải đấu bên trái trước khi chọn bảng cụ thể.
                          </p>
                        ) : (
                          <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {selectedTournaments.map(tId => {
                              const tour = activeTournaments.find(x => x.id === tId);
                              if (!tour) return null;
                              const catList = getTournamentCategoryList(tour);
                              return (
                                <div key={tId} style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                                  <b style={{ fontSize: 13, color: '#062B4F', display: 'block', marginBottom: 6 }}>
                                    🏆 {tour.name} <span style={{ fontSize: 11, color: '#64748B', fontWeight: 400 }}>(Mã TNR: {tour.id})</span>
                                  </b>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6 }}>
                                    {catList.map(cat => {
                                      const key = `${tour.id}::${cat.group}`;
                                      const isCatChecked = selectedCategoryKeys.includes(key);
                                      return (
                                        <label
                                          key={key}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            padding: '4px 8px',
                                            borderRadius: 6,
                                            background: isCatChecked ? '#EFF6FF' : '#F8FAFC',
                                            border: isCatChecked ? '1px solid #93C5FD' : '1px solid #E2E8F0',
                                            fontSize: 12,
                                            cursor: 'pointer'
                                          }}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isCatChecked}
                                            onChange={() => toggleCategorySelect(key)}
                                          />
                                          <span style={{ fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {cat.group}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* BLOCK 2: MULTI-TIER PRIZE RULES BUILDER */}
              <div style={{ background: '#FFFFFF', padding: 20, borderRadius: 16, border: '1px solid #CBD5E1', boxShadow: '0 2px 8px rgba(6,43,79,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#062B4F', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Trophy size={18} className="text-amber-500" />
                      Bước 2: Cấu hình Các Mức Giải thưởng (Nhập nhiều dòng)
                    </h3>
                    <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>
                      Thiết lập các mức trao thưởng. Bạn có thể thêm, chỉnh sửa hoặc dùng bộ mẫu nhanh phía dưới.
                    </p>
                  </div>

                  {/* PRESET BUTTONS */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="outline"
                      style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8, fontWeight: 700 }}
                      onClick={applyPresetStandard13}
                    >
                      + Bộ Hạng 1-3 (🥇🥈🥉)
                    </button>
                    <button
                      type="button"
                      className="outline"
                      style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8, fontWeight: 700 }}
                      onClick={applyPresetStandard15}
                    >
                      + Bộ Hạng 1-5 (🥇🥈🥉📜)
                    </button>
                    <button
                      type="button"
                      className="outline"
                      style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8, fontWeight: 700 }}
                      onClick={addRuleRow}
                    >
                      <Plus size={14} /> Thêm 1 dòng
                    </button>
                    <button
                      type="button"
                      className="outline danger-btn"
                      style={{ padding: '6px 10px', fontSize: 12, borderRadius: 8 }}
                      onClick={() => setBulkRules([])}
                    >
                      Xóa tất cả
                    </button>
                  </div>
                </div>

                {/* RULES TABLE BUILDER */}
                <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: 12 }}>
                  <table className="saas-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', textAlign: 'left', borderBottom: '2px solid #E2E8F0' }}>
                        <th style={{ padding: 10, width: 90, fontSize: 12 }}>Hạng từ (*)</th>
                        <th style={{ padding: 10, width: 90, fontSize: 12 }}>Hạng đến (*)</th>
                        <th style={{ padding: 10, width: 170, fontSize: 12 }}>Loại danh hiệu / Huy chương</th>
                        <th style={{ padding: 10, minWidth: 200, fontSize: 12 }}>Tên giải thưởng (*)</th>
                        <th style={{ padding: 10, minWidth: 220, fontSize: 12 }}>Mô tả phần thưởng / Quà tặng</th>
                        <th style={{ padding: 10, width: 50, textAlign: 'center' }}>Xóa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkRules.map((r) => (
                        <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: 8 }}>
                            <input
                              type="number"
                              min={1}
                              className="saas-input"
                              style={{ padding: '4px 8px', fontSize: 13, height: 36, textAlign: 'center' }}
                              value={r.rank_from}
                              onChange={(e) => updateRuleRow(r.id, 'rank_from', e.target.value)}
                            />
                          </td>
                          <td style={{ padding: 8 }}>
                            <input
                              type="number"
                              min={1}
                              className="saas-input"
                              style={{ padding: '4px 8px', fontSize: 13, height: 36, textAlign: 'center' }}
                              value={r.rank_to}
                              onChange={(e) => updateRuleRow(r.id, 'rank_to', e.target.value)}
                            />
                          </td>
                          <td style={{ padding: 8 }}>
                            <select
                              className="saas-input"
                              style={{ padding: '4px 8px', fontSize: 13, height: 36 }}
                              value={r.medal}
                              onChange={(e) => updateRuleRow(r.id, 'medal', e.target.value)}
                            >
                              <option value="Gold Medal">🥇 Gold Medal (Vàng)</option>
                              <option value="Silver Medal">🥈 Silver Medal (Bạc)</option>
                              <option value="Bronze Medal">🥉 Bronze Medal (Đồng)</option>
                              <option value="Certificate">📜 Certificate (Bằng khen)</option>
                              <option value="Other">🏆 Other (Khác)</option>
                            </select>
                          </td>
                          <td style={{ padding: 8 }}>
                            <input
                              type="text"
                              className="saas-input"
                              style={{ padding: '4px 10px', fontSize: 13, height: 36 }}
                              placeholder="VD: Cúp vô địch + Huy chương Vàng"
                              value={r.prize_name}
                              onChange={(e) => updateRuleRow(r.id, 'prize_name', e.target.value)}
                            />
                          </td>
                          <td style={{ padding: 8 }}>
                            <input
                              type="text"
                              className="saas-input"
                              style={{ padding: '4px 10px', fontSize: 13, height: 36 }}
                              placeholder="VD: 500.000 VNĐ + Quà tặng tài trợ..."
                              value={r.description}
                              onChange={(e) => updateRuleRow(r.id, 'description', e.target.value)}
                            />
                          </td>
                          <td style={{ padding: 8, textAlign: 'center' }}>
                            <button
                              type="button"
                              className="outline danger-btn"
                              style={{ padding: 6, borderRadius: 6 }}
                              onClick={() => removeRuleRow(r.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {bulkRules.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ padding: 20, textAlign: 'center', color: '#64748B' }}>
                            Chưa có dòng quy tắc nào. Nhấn "+ Bộ Hạng 1-3" hoặc "+ Thêm 1 dòng" để thiết lập cơ cấu.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* BOTTOM APPLY ACTION BUTTON */}
                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: '#475569' }}>
                    Tổng dự kiến: <b>{resolvedTargets.length} mục</b> × <b>{bulkRules.length} quy tắc</b> = <b>{resolvedTargets.length * bulkRules.length} bản ghi</b>
                  </span>

                  <button
                    type="button"
                    className="saas-btn-gold"
                    style={{ height: 44, padding: '0 24px', fontSize: 15, fontWeight: 800, borderRadius: 10 }}
                    disabled={resolvedTargets.length === 0 || bulkRules.length === 0 || !!busy}
                    onClick={openBulkConfirmDialog}
                  >
                    <Sparkles size={18} />
                    <span>Áp dụng cơ cấu cho {resolvedTargets.length} mục đã chọn</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {prizeViewTab === 'list' && (
            <div>
              {/* FILTER TOOLBAR FOR SAVED PRIZE RULES */}
              <div style={{ background: '#F8FAFC', padding: 16, borderRadius: 14, border: '1px solid #CBD5E1', marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Filter size={16} className="text-amber-500" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#062B4F' }}>Bộ lọc danh sách:</span>
                </div>

                {/* Tournament Filter */}
                <select
                  className="saas-input"
                  style={{ paddingLeft: 10, width: 220, fontSize: 13, height: 36 }}
                  value={filterTournamentId}
                  onChange={(e) => setFilterTournamentId(e.target.value)}
                >
                  <option value="all">-- Tất cả Giải đấu --</option>
                  {activeTournaments.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>

                {/* Group Filter */}
                <input
                  type="text"
                  className="saas-input"
                  style={{ paddingLeft: 10, width: 180, fontSize: 13, height: 36 }}
                  placeholder="Lọc theo Bảng đấu..."
                  value={filterGroupName}
                  onChange={(e) => setFilterGroupName(e.target.value)}
                />

                {/* Search Text Filter */}
                <input
                  type="text"
                  className="saas-input"
                  style={{ paddingLeft: 10, width: 200, fontSize: 13, height: 36 }}
                  placeholder="Tìm theo tên giải thưởng..."
                  value={filterSearchText}
                  onChange={(e) => setFilterSearchText(e.target.value)}
                />

                {(filterTournamentId !== 'all' || filterGroupName || filterSearchText) && (
                  <button
                    type="button"
                    className="outline"
                    style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8 }}
                    onClick={() => {
                      setFilterTournamentId('all');
                      setFilterGroupName('');
                      setFilterSearchText('');
                    }}
                  >
                    Xóa lọc
                  </button>
                )}

                {selectedPrizeIds.length > 0 && (
                  <button
                    type="button"
                    className="outline danger-btn"
                    style={{ padding: '6px 14px', fontSize: 13, fontWeight: 700, borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5' }}
                    onClick={() => setBulkDeletePrizesModalOpen(true)}
                  >
                    <Trash2 size={15} />
                    <span>🗑 Xóa mục đã chọn ({selectedPrizeIds.length})</span>
                  </button>
                )}

                <span style={{ marginLeft: 'auto', fontSize: 13, color: '#64748B', fontWeight: 600 }}>
                  {selectedPrizeIds.length > 0 ? <b>Đã chọn {selectedPrizeIds.length} mục · </b> : null}
                  Hiển thị {filteredSavedPrizes.length} / {state?.prizes?.length || 0} quy tắc
                </span>
              </div>

              {/* TABLE OF SAVED PRIZE RULES */}
              <div className="saas-table-container">
                <table className="saas-table">
                  <thead>
                    <tr>
                      <th style={{ width: 45, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={filteredSavedPrizes.length > 0 && filteredSavedPrizes.every(pz => pz.id && selectedPrizeIds.includes(pz.id))}
                          onChange={() => {
                            const allFilteredIds = filteredSavedPrizes.map(pz => pz.id).filter((id): id is string => !!id);
                            const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedPrizeIds.includes(id));
                            if (isAllSelected) {
                              setSelectedPrizeIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
                            } else {
                              setSelectedPrizeIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
                            }
                          }}
                          style={{ width: 16, height: 16, cursor: 'pointer' }}
                          title="Chọn tất cả"
                        />
                      </th>
                      <th>Giải đấu (Tournament)</th>
                      <th>Bảng đấu (Group)</th>
                      <th style={{ textAlign: 'center' }}>Khung hạng (Rank Range)</th>
                      <th style={{ textAlign: 'center' }}>Loại danh hiệu (Medal)</th>
                      <th>Tên giải thưởng & Mô tả</th>
                      <th style={{ textAlign: 'right' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSavedPrizes.map((pz: PrizeRuleItem) => {
                      const medalLabel = pz.medal === 'Gold Medal' || pz.medal === 'gold' ? '🥇 Gold Medal'
                        : pz.medal === 'Silver Medal' || pz.medal === 'silver' ? '🥈 Silver Medal'
                        : pz.medal === 'Bronze Medal' || pz.medal === 'bronze' ? '🥉 Bronze Medal'
                        : pz.medal === 'Certificate' ? '📜 Certificate' : '🏆 Other';
                      const isSelected = !!pz.id && selectedPrizeIds.includes(pz.id);

                      return (
                        <tr key={pz.id} style={{ background: isSelected ? '#FEF2F2' : undefined }}>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                if (!pz.id) return;
                                setSelectedPrizeIds(prev => prev.includes(pz.id!) ? prev.filter(x => x !== pz.id) : [...prev, pz.id!]);
                              }}
                              style={{ width: 16, height: 16, cursor: 'pointer' }}
                            />
                          </td>
                          <td>
                            <b style={{ color: '#062B4F', fontSize: 14, display: 'block' }}>{pz.tournament_name || pz.tournament_id}</b>
                          </td>
                          <td>
                            <span className="soft-badge" style={{ background: pz.group_name === 'Tất cả' ? '#E0F2FE' : '#F1F5F9', color: pz.group_name === 'Tất cả' ? '#0369A1' : '#334155', fontWeight: 700 }}>
                              {pz.group_name}
                            </span>
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
                                onClick={() => openSingleEditModal(pz)}
                                title="Chỉnh sửa riêng quy tắc này"
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

                    {filteredSavedPrizes.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#64748B', fontStyle: 'italic' }}>
                          {state?.prizes?.length ? 'Không có quy tắc giải thưởng nào khớp với bộ lọc.' : 'Chưa có quy tắc cơ cấu giải thưởng nào. Nhấn tab "Thiết lập & Áp dụng Hàng loạt" để thêm mới.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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

      {/* SYNC LOGS HISTORY SECTION */}
      {(activeTab === 'sync_logs' || activeTab === 'tournaments') && (
        <section className="admin-card-section">
          <div className="admin-card-title-group" style={{ marginBottom: 16 }}>
            <div>
              <h2><Activity size={22} className="text-amber-500" /> Lịch Sử Đồng Bộ Chess-Results (Sync Log)</h2>
              <p>Danh sách các phiên đồng bộ dữ liệu từ nguồn Chess-Results chính thức (Single Source of Truth).</p>
            </div>
            <span className="soft-badge" style={{ background: '#eef5fc', color: '#145DA0', padding: '6px 14px', borderRadius: 99, fontWeight: 700 }}>
              {state.syncLogs?.length || 0} phiên đồng bộ
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="saas-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', textAlign: 'left', borderBottom: '2px solid #E2E8F0' }}>
                  <th style={{ padding: 12, fontSize: 13, fontWeight: 700 }}>Thời Gian</th>
                  <th style={{ padding: 12, fontSize: 13, fontWeight: 700 }}>Giải Đấu</th>
                  <th style={{ padding: 12, fontSize: 13, fontWeight: 700 }}>Trạng Thái</th>
                  <th style={{ padding: 12, fontSize: 13, fontWeight: 700 }}>Số Kỳ Thủ</th>
                  <th style={{ padding: 12, fontSize: 13, fontWeight: 700 }}>Chi Tiết Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {(state.syncLogs || []).map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: 12, fontSize: 13, whiteSpace: 'nowrap' }}>
                      {formatVietnamDateTime(item.created_at)}
                    </td>
                    <td style={{ padding: 12, fontSize: 13, fontWeight: 700, color: '#062B4F' }}>
                      {item.tournament_name || item.tournament_id || 'Giải đấu'}
                    </td>
                    <td style={{ padding: 12 }}>
                      <span className="soft-badge" style={{ background: item.status === 'success' ? '#DCFCE7' : '#FEE2E2', color: item.status === 'success' ? '#15803D' : '#991B1B', fontWeight: 700 }}>
                        {item.status === 'success' ? '✓ Thành công' : '✕ Thất bại'}
                      </span>
                    </td>
                    <td style={{ padding: 12, fontSize: 13, fontWeight: 700 }}>
                      {item.players_updated} kỳ thủ
                    </td>
                    <td style={{ padding: 12, fontSize: 13, color: '#475569' }}>
                      {item.message}
                    </td>
                  </tr>
                ))}
                {(!state.syncLogs || state.syncLogs.length === 0) && (
                  <tr>
                    <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#64748B' }}>
                      Chưa có lịch sử đồng bộ ghi nhận. Nhấn nút "Đồng bộ Chess-Results" ở danh sách giải đấu để thực hiện đồng bộ đầu tiên.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

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
                <span style={{ fontSize: 12, color: '#94A3B8', whiteSpace: 'nowrap' }}>{formatVietnamDateTime(l.created)}</span>
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
                    <span style={{ fontSize: 12, color: '#64748B' }}>Thiết lập huy chương (🥇 Vàng, 🥈 Bạc, 🥉 Đồng, 🏆 Khuyến khích). Với bảng đấu hỗn hợp Nam & Nữ, hệ thống tự động xét giải Nhất Nữ cho kỳ thủ Nữ xuất sắc nhất.</span>
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

      <Dialog open={bulkDeleteModalOpen} onOpenChange={(v: boolean) => { if (!v && !busy) setBulkDeleteModalOpen(false); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Xóa {selectedTournamentIds.length} giải đấu đã chọn?</DialogTitle>
            <DialogDescription>
              Xác nhận xóa các giải đấu đã chọn khỏi hệ thống.
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
            <div style={{ fontSize: 13, color: '#334155', fontWeight: 600 }}>
              Danh sách giải đấu chuẩn bị xóa ({selectedTournamentIds.length} giải):
            </div>
            <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 14px', background: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(state?.tournaments || [])
                .filter(t => selectedTournamentIds.includes(t.id))
                .map(t => (
                  <div key={t.id} style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F1F5F9', paddingBottom: 6 }}>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>• {t.name} ({t.group || 'Toàn giải'})</span>
                    <span style={{ color: '#64748B', fontSize: 12, fontWeight: 600 }}>{t.players ? t.players.length : 0} kỳ thủ</span>
                  </div>
                ))}
            </div>

            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: 14, color: '#991B1B' }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: '#7F1D1D' }}>
                ⚠️ Cảnh báo:
              </div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: '1.5', color: '#991B1B' }}>
                Toàn bộ dữ liệu kỳ thủ, kết quả, bảng xếp hạng, lịch sử thi đấu sẽ bị xóa và không thể khôi phục.
              </p>
            </div>

            {error && <p className="notice warning" role="alert">{error}</p>}
            <div className="dialog-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
              <button type="button" className="outline" disabled={!!busy} onClick={() => setBulkDeleteModalOpen(false)}>
                Hủy
              </button>
              <button
                type="button"
                className="primary danger-delete"
                disabled={!!busy}
                onClick={handleBulkDelete}
              >
                {busy === 'bulk_delete' ? 'Đang xóa…' : `Xóa ${selectedTournamentIds.length} giải`}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!remove} onOpenChange={(v: boolean) => { if (!v && !busy) setRemove(null); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Xóa giải đấu?</DialogTitle>
            <DialogDescription>
              Hành động này sẽ xóa giải đấu và toàn bộ dữ liệu liên quan khỏi hệ thống.
            </DialogDescription>
          </DialogHeader>
          {remove && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: 14, color: '#991B1B' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: '#7F1D1D' }}>
                  ⚠️ Cảnh báo xóa dữ liệu:
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <li><strong>Tên giải đấu:</strong> {remove.name}</li>
                  <li><strong>Số lượng kỳ thủ:</strong> {remove.players ? remove.players.length : 0} kỳ thủ</li>
                  <li>Toàn bộ thông tin ván đấu, kết quả thi đấu và bốc thăm của giải đấu này sẽ bị xóa vĩnh viễn và không thể khôi phục.</li>
                </ul>
              </div>

              <label className="saas-label">
                Nhập tên giải <span style={{ color: '#DC2626', fontWeight: 700 }}>"{remove.name}"</span> để xác nhận xóa:
                <input
                  className="saas-input"
                  style={{ paddingLeft: 16, marginTop: 6 }}
                  value={confirmName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmName(e.target.value)}
                  placeholder="Nhập đúng tên giải đấu"
                  autoComplete="off"
                />
              </label>
              {error && <p className="notice warning" role="alert">{error}</p>}
              <div className="dialog-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button type="button" className="outline" disabled={!!busy} onClick={() => setRemove(null)}>
                  Hủy
                </button>
                <button
                  type="button"
                  className="primary danger-delete"
                  disabled={!!busy || confirmName !== remove.name}
                  onClick={async () => { if (await action('delete', { id: remove.id, confirmName })) setRemove(null); }}
                >
                  {busy ? 'Đang xóa…' : 'Xóa giải'}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteBanner} onOpenChange={(v: boolean) => { if (!v && !busy) setDeleteBanner(null); }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Xóa Banner này?</DialogTitle>
            <DialogDescription>Banner “{deleteBanner?.title}” sẽ bị xóa vĩnh viễn khỏi hệ thống.</DialogDescription>
          </DialogHeader>
          {error && <p className="notice warning" role="alert">{error}</p>}
          <div className="dialog-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
            <button type="button" className="outline" disabled={!!busy} onClick={() => setDeleteBanner(null)}>Hủy</button>
            <button type="button" className="primary danger-delete" disabled={!!busy} onClick={async () => { if (await action('banner_delete', { id: deleteBanner?.id })) setDeleteBanner(null); }}>
              {busy ? 'Đang xóa…' : 'Xóa Banner'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* BULK APPLY CONFIRMATION & CONFLICT MODAL */}
      <Dialog open={showBulkConfirmModal} onOpenChange={(v) => { if (!v && !busy) setShowBulkConfirmModal(false); }}>
        <DialogContent showCloseButton={false} style={{ maxWidth: 680 }}>
          <DialogHeader>
            <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#062B4F' }}>
              <Sparkles size={20} className="text-amber-500" />
              <span>Xác nhận áp dụng cơ cấu giải thưởng</span>
            </DialogTitle>
            <DialogDescription>
              Vui lòng kiểm tra lại danh sách giải/bảng đấu và các mức thưởng trước khi lưu vào cơ sở dữ liệu.
            </DialogDescription>
          </DialogHeader>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '60vh', overflowY: 'auto', paddingRight: 4 }}>
            {/* TARGETS SUMMARY */}
            <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 12, border: '1px solid #E2E8F0' }}>
              <b style={{ fontSize: 13, color: '#062B4F', display: 'block', marginBottom: 6 }}>
                📍 Các mục sẽ áp dụng ({resolvedTargets.length} mục):
              </b>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 110, overflowY: 'auto' }}>
                {resolvedTargets.map((t, i) => (
                  <span key={i} style={{ background: '#E0F2FE', color: '#0369A1', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
                    {t.tournament_name} ➔ [{t.group_name}]
                  </span>
                ))}
              </div>
            </div>

            {/* RULES SUMMARY */}
            <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 12, border: '1px solid #E2E8F0' }}>
              <b style={{ fontSize: 13, color: '#062B4F', display: 'block', marginBottom: 6 }}>
                🏆 Các mức giải thưởng ({bulkRules.length} dòng):
              </b>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {bulkRules.map((r, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#334155', display: 'flex', justifyContent: 'space-between' }}>
                    <span><b>Hạng {r.rank_from === r.rank_to ? r.rank_from : `${r.rank_from}-${r.rank_to}`}:</b> {r.prize_name}</span>
                    <span style={{ color: '#64748B' }}>{r.medal}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CONFLICT DETECTION & STRATEGY */}
            <div style={{ background: conflictsInfo.hasConflict ? '#FEF2F2' : '#F0FDF4', padding: 14, borderRadius: 12, border: conflictsInfo.hasConflict ? '1px solid #FCA5A5' : '1px solid #86EFAC' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {conflictsInfo.hasConflict ? <AlertTriangle size={18} className="text-red-600" /> : <CheckCircle2 size={18} className="text-green-600" />}
                <b style={{ fontSize: 13, color: conflictsInfo.hasConflict ? '#991B1B' : '#166534' }}>
                  {conflictsInfo.hasConflict ? `Phát hiện xung đột với ${conflictsInfo.conflictingRules.length} quy tắc cũ!` : 'Không có xung đột trùng lặp.'}
                </b>
              </div>

              {conflictsInfo.hasConflict && (
                <p style={{ fontSize: 12, color: '#991B1B', margin: '0 0 10px' }}>
                  Một số giải/bảng đã có quy tắc giải thưởng nằm trong cùng khung hạng. Hãy chọn phương án xử lý:
                </p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#062B4F' }}>
                  <input
                    type="radio"
                    name="conflictStrategyModal"
                    checked={conflictStrategy === 'skip'}
                    onChange={() => setConflictStrategy('skip')}
                  />
                  <span><b>🟢 Mặc định (Khuyên dùng):</b> Giữ nguyên quy tắc cũ & bỏ qua trùng lặp</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#062B4F' }}>
                  <input
                    type="radio"
                    name="conflictStrategyModal"
                    checked={conflictStrategy === 'overwrite'}
                    onChange={() => setConflictStrategy('overwrite')}
                  />
                  <span><b>🔴 Thay thế / Ghi đè:</b> Xóa các quy tắc cũ bị trùng khoảng hạng và thay bằng quy tắc mới</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#062B4F' }}>
                  <input
                    type="radio"
                    name="conflictStrategyModal"
                    checked={conflictStrategy === 'keep_all'}
                    onChange={() => setConflictStrategy('keep_all')}
                  />
                  <span><b>🟡 Thêm tất cả:</b> Giữ quy tắc cũ và thêm cả quy tắc mới (một vị trí có thể có nhiều phần thưởng)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="dialog-actions" style={{ marginTop: 20 }}>
            <button
              type="button"
              className="outline"
              disabled={!!busy}
              onClick={() => setShowBulkConfirmModal(false)}
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              className="saas-btn-gold"
              disabled={!!busy}
              onClick={submitBulkPrizeRules}
            >
              {busy === 'bulk_prize_save' ? 'Đang xử lý & lưu...' : '🚀 Xác Nhận Áp Dụng Ngay'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* SINGLE PRIZE RULE EDIT MODAL */}
      <Dialog open={!!singleEditPrizeModal} onOpenChange={(v) => { if (!v && !busy) setSingleEditPrizeModal(null); }}>
        <DialogContent showCloseButton={false} style={{ maxWidth: 540 }}>
          <DialogHeader>
            <DialogTitle style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#062B4F' }}>
              <Pencil size={18} className="text-amber-500" />
              <span>Chỉnh sửa riêng quy tắc giải thưởng</span>
            </DialogTitle>
            <DialogDescription>
              Thay đổi thông tin quy tắc giải thưởng này mà không làm ảnh hưởng các giải/bảng khác.
            </DialogDescription>
          </DialogHeader>

          {singleEditPrizeModal && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              await savePrizeRule();
              setSingleEditPrizeModal(null);
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label className="saas-label" style={{ gridColumn: 'span 2' }}>
                  Giải đấu
                  <select
                    className="saas-input"
                    style={{ paddingLeft: 10 }}
                    value={prizeForm.tournament_id}
                    onChange={(e) => setPrizeForm({ ...prizeForm, tournament_id: e.target.value })}
                  >
                    {activeTournaments.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </label>

                <label className="saas-label">
                  Bảng đấu
                  <input
                    type="text"
                    className="saas-input"
                    style={{ paddingLeft: 10 }}
                    value={prizeForm.group_name}
                    onChange={(e) => setPrizeForm({ ...prizeForm, group_name: e.target.value })}
                  />
                </label>

                <label className="saas-label">
                  Loại huy chương
                  <select
                    className="saas-input"
                    style={{ paddingLeft: 10 }}
                    value={prizeForm.medal}
                    onChange={(e) => setPrizeForm({ ...prizeForm, medal: e.target.value })}
                  >
                    <option value="Gold Medal">🥇 Gold Medal</option>
                    <option value="Silver Medal">🥈 Silver Medal</option>
                    <option value="Bronze Medal">🥉 Bronze Medal</option>
                    <option value="Certificate">📜 Certificate</option>
                    <option value="Other">🏆 Other</option>
                  </select>
                </label>

                <label className="saas-label">
                  Hạng từ
                  <input
                    type="number"
                    min={1}
                    className="saas-input"
                    style={{ paddingLeft: 10 }}
                    value={prizeForm.rank_from}
                    onChange={(e) => setPrizeForm({ ...prizeForm, rank_from: e.target.value })}
                  />
                </label>

                <label className="saas-label">
                  Hạng đến
                  <input
                    type="number"
                    min={1}
                    className="saas-input"
                    style={{ paddingLeft: 10 }}
                    value={prizeForm.rank_to}
                    onChange={(e) => setPrizeForm({ ...prizeForm, rank_to: e.target.value })}
                  />
                </label>

                <label className="saas-label" style={{ gridColumn: 'span 2' }}>
                  Tên giải thưởng
                  <input
                    type="text"
                    className="saas-input"
                    style={{ paddingLeft: 10 }}
                    value={prizeForm.prize_name}
                    onChange={(e) => setPrizeForm({ ...prizeForm, prize_name: e.target.value })}
                  />
                </label>

                <label className="saas-label" style={{ gridColumn: 'span 2' }}>
                  Mô tả phần thưởng / Quà tặng
                  <input
                    type="text"
                    className="saas-input"
                    style={{ paddingLeft: 10 }}
                    value={prizeForm.description}
                    onChange={(e) => setPrizeForm({ ...prizeForm, description: e.target.value })}
                  />
                </label>
              </div>

              <div className="dialog-actions" style={{ marginTop: 16 }}>
                <button
                  type="button"
                  className="outline"
                  disabled={!!busy}
                  onClick={() => setSingleEditPrizeModal(null)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="saas-btn-gold"
                  disabled={!!busy}
                >
                  {busy ? 'Đang lưu...' : 'Lưu chỉnh sửa'}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      {/* BULK DELETE PRIZES CONFIRMATION MODAL */}
      <AlertDialog open={bulkDeletePrizesModalOpen} onOpenChange={setBulkDeletePrizesModalOpen}>
        <AlertDialogContent style={{ maxWidth: 450, borderRadius: 16, padding: 24 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontSize: 18, fontWeight: 800, color: '#991B1B', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={22} className="text-red-600" />
              Xác nhận xóa hàng loạt
            </AlertDialogTitle>
            <AlertDialogDescription style={{ fontSize: 14, color: '#475569', marginTop: 10, lineHeight: 1.5 }}>
              Bạn có chắc muốn xóa <b>{selectedPrizeIds.length}</b> cơ cấu giải thưởng?
              <br />
              Dữ liệu sau khi xóa không thể khôi phục.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <AlertDialogCancel
              onClick={() => setBulkDeletePrizesModalOpen(false)}
              style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}
            >
              Hủy
            </AlertDialogCancel>
            <button
              type="button"
              className="saas-btn-danger"
              style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 800, background: '#DC2626', color: '#FFFFFF', border: 'none', cursor: 'pointer' }}
              disabled={busy === 'bulk_delete_prizes'}
              onClick={handleBulkDeletePrizes}
            >
              {busy === 'bulk_delete_prizes' ? 'Đang xóa...' : 'Xác nhận xóa'}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
