import { SHADOW_TIER_CONFIG, type FishShadowTier, type ShadowTierInfo } from '@cozy/game-data';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Crown,
  Eye,
  Fish as FishIcon,
  Maximize2,
  RotateCcw,
  Save,
  Search,
  Sliders,
  Sparkles,
  Waves,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { drawCanvasOrganicFishShadow } from '../../game/fish-shadow';
import { api } from '../../lib/api';
import { play } from '../../lib/sound';
import { useUi } from '../../lib/store';
import { Button } from '../../ui/primitives';
import { fishIcon } from '../../art/fish';
import { FishSpeciesShadowTuner } from './FishSpeciesShadowTuner';
import { FishSceneSimulator } from './FishSceneSimulator';
import type { AdminFishSpecies } from './FishAdmin';

export interface AdminShadowTier extends ShadowTierInfo {
  defaultLengthPx: number;
  defaultWidthPx: number;
  defaultSwimSpeed: number;
  defaultWiggleSpeed: number;
  isOverridden: boolean;
}

export function FishShadowAdmin() {
  const qc = useQueryClient();
  const [subTab, setSubTab] = useState<'scene' | 'tiers' | 'species'>('scene');
  const [selectedTier, setSelectedTier] = useState<FishShadowTier>(6);
  const [previewMode, setPreviewMode] = useState<'single' | 'all'>('single');
  const [zoom, setZoom] = useState<number>(0.8);
  const [testAction, setTestAction] = useState<'normal' | 'nibble' | 'bite'>('normal');
  const [megaMode, setMegaMode] = useState<boolean>(true); // Cho phép slider mở rộng tới 3000px

  const shadowQuery = useQuery({
    queryKey: ['admin-fish-shadow-tiers'],
    queryFn: () => api<AdminShadowTier[]>('/admin/fish/shadow-tiers'),
  });

  const fishQuery = useQuery({
    queryKey: ['admin-fish'],
    queryFn: () => api<AdminFishSpecies[]>('/admin/fish'),
  });

  const allFish = useMemo(() => fishQuery.data ?? [], [fishQuery.data]);
  const [selectedFishId, setSelectedFishId] = useState<string>('blue_whale');
  const [fishSearch, setFishSearch] = useState<string>('');
  const [fishStatusFilter, setFishStatusFilter] = useState<'all' | 'custom' | 'default'>('all');

  const filteredSpecies = useMemo(() => {
    return allFish.filter((f) => {
      if (fishStatusFilter === 'custom' && !f.isShadowOverridden) return false;
      if (fishStatusFilter === 'default' && f.isShadowOverridden) return false;
      if (fishSearch.trim()) {
        const q = fishSearch.trim().toLowerCase();
        return f.name.toLowerCase().includes(q) || f.id.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allFish, fishStatusFilter, fishSearch]);

  const activeSelectedFish = useMemo(() => {
    return allFish.find((f) => f.id === selectedFishId) ?? filteredSpecies[0] ?? allFish[0];
  }, [allFish, selectedFishId, filteredSpecies]);

  const [localTiers, setLocalTiers] = useState<Record<FishShadowTier, AdminShadowTier>>(() => {
    const init: Record<number, AdminShadowTier> = {};
    for (const t of [1, 2, 3, 4, 5, 6] as const) {
      const base = SHADOW_TIER_CONFIG[t];
      init[t] = {
        ...base,
        defaultLengthPx: base.lengthPx,
        defaultWidthPx: base.widthPx,
        defaultSwimSpeed: base.swimSpeed,
        defaultWiggleSpeed: base.wiggleSpeed,
        isOverridden: false,
      };
    }
    return init as Record<FishShadowTier, AdminShadowTier>;
  });

  // Sync from query when loaded
  useEffect(() => {
    if (shadowQuery.data) {
      const map: Record<number, AdminShadowTier> = {};
      for (const item of shadowQuery.data) {
        map[item.tier] = item;
      }
      setLocalTiers(map as Record<FishShadowTier, AdminShadowTier>);
    }
  }, [shadowQuery.data]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Animation Loop for live water canvas preview
  useEffect(() => {
    let animId: number;
    const startTime = performance.now();

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const time = performance.now() - startTime;

      // Deep lake water background gradient
      const grad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        50,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.7,
      );
      grad.addColorStop(0, '#0a2e3f');
      grad.addColorStop(0.6, '#061d29');
      grad.addColorStop(1, '#020d14');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Subtle water ripple grid & caustics
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.07)';
      ctx.lineWidth = 1;
      const gridSize = 48;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Gentle animated water surface waves
      ctx.strokeStyle = 'rgba(103, 232, 249, 0.12)';
      for (let i = 0; i < 5; i++) {
        const wy = ((time * 0.02 + i * 90) % (height + 60)) - 30;
        ctx.beginPath();
        for (let wx = 0; wx < width; wx += 20) {
          const dy = Math.sin((wx + time * 0.05) * 0.02) * 5;
          if (wx === 0) ctx.moveTo(wx, wy + dy);
          else ctx.lineTo(wx, wy + dy);
        }
        ctx.stroke();
      }

      ctx.save();
      // Center canvas origin and apply zoom scale
      ctx.translate(width / 2, height / 2);
      ctx.scale(zoom, zoom);

      const isBite = testAction === 'bite';
      const isRecoil = testAction === 'nibble';

      if (previewMode === 'single') {
        const cur = localTiers[selectedTier] ?? SHADOW_TIER_CONFIG[selectedTier];
        // Center swim circle
        const swimRadius = Math.max(30, cur.lengthPx * 0.25);
        const swimAngle = time * 0.001 * cur.swimSpeed;
        const fishX = Math.cos(swimAngle) * swimRadius;
        const fishY = Math.sin(swimAngle * 1.5) * (swimRadius * 0.4);
        const heading = swimAngle + Math.PI / 2;

        drawCanvasOrganicFishShadow(ctx, fishX, fishY, heading, time, cur, 1, isBite, isRecoil);

        // Center crosshair / ruler reference
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(-cur.lengthPx / 2, 0);
        ctx.lineTo(cur.lengthPx / 2, 0);
        ctx.moveTo(0, -cur.widthPx / 2);
        ctx.lineTo(0, cur.widthPx / 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        // Parade mode: display all 6 tiers aligned
        const allTiersList = ([1, 2, 3, 4, 5, 6] as const).map((t) => localTiers[t] ?? SHADOW_TIER_CONFIG[t]);
        const spacingY = 110;
        const startY = -((allTiersList.length - 1) * spacingY) / 2;

        allTiersList.forEach((tierCfg, idx) => {
          const cy = startY + idx * spacingY;
          const swimAngle = time * 0.001 * tierCfg.swimSpeed + idx;
          const cx = Math.sin(swimAngle) * 40;
          const heading = Math.PI + Math.cos(swimAngle) * 0.25;

          drawCanvasOrganicFishShadow(ctx, cx, cy, heading, time, tierCfg, 1, isBite, isRecoil);

          // Tier label
          ctx.fillStyle = tierCfg.hasCrown ? '#fbbf24' : '#94a3b8';
          ctx.font = 'bold 13px system-ui, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(`Cấp ${tierCfg.tier}: ${tierCfg.lengthPx}x${tierCfg.widthPx}px`, -220, cy + 4);
        });
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [localTiers, selectedTier, previewMode, zoom, testAction]);

  // Mutations
  const saveAllMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<number, Partial<AdminShadowTier>> = {};
      for (const [t, data] of Object.entries(localTiers)) {
        payload[Number(t)] = {
          lengthPx: data.lengthPx,
          widthPx: data.widthPx,
          swimSpeed: data.swimSpeed,
          wiggleSpeed: data.wiggleSpeed,
          hasCrown: data.hasCrown,
          hasGlow: data.hasGlow,
        };
      }
      return api<AdminShadowTier[]>('/admin/fish/shadow-tiers', {
        method: 'PUT',
        body: { tiers: payload },
      });
    },
    onSuccess: (data) => {
      const map: Record<number, ShadowTierInfo> = {};
      for (const item of data) {
        map[item.tier] = item;
      }
      useUi.getState().setShadowTierConfig(map as Record<FishShadowTier, ShadowTierInfo>);
      qc.invalidateQueries({ queryKey: ['admin-fish-shadow-tiers'] });
      qc.invalidateQueries({ queryKey: ['fishing-shadow-tiers'] });
      useUi.getState().toast({
        kind: 'success',
        title: 'Đã lưu kích thước bóng cá',
        body: 'Toàn server đã cập nhật cấu hình bóng cá mới nhất!',
      });
    },
  });

  const resetAllMutation = useMutation({
    mutationFn: () =>
      api<AdminShadowTier[]>('/admin/fish/shadow-tiers', {
        method: 'DELETE',
      }),
    onSuccess: () => {
      const init: Record<number, AdminShadowTier> = {};
      for (const t of [1, 2, 3, 4, 5, 6] as const) {
        const base = SHADOW_TIER_CONFIG[t];
        init[t] = {
          ...base,
          defaultLengthPx: base.lengthPx,
          defaultWidthPx: base.widthPx,
          defaultSwimSpeed: base.swimSpeed,
          defaultWiggleSpeed: base.wiggleSpeed,
          isOverridden: false,
        };
      }
      setLocalTiers(init as Record<FishShadowTier, AdminShadowTier>);
      useUi.getState().setShadowTierConfig(null);
      qc.invalidateQueries({ queryKey: ['admin-fish-shadow-tiers'] });
      qc.invalidateQueries({ queryKey: ['fishing-shadow-tiers'] });
      useUi.getState().toast({
        kind: 'info',
        title: 'Đã khôi phục gốc',
        body: 'Toàn bộ 6 cấp bóng cá đã được đưa về kích thước tiêu chuẩn.',
      });
    },
  });

  // Local updates helper
  const updateTier = (tier: FishShadowTier, patch: Partial<AdminShadowTier>) => {
    setLocalTiers((prev) => ({
      ...prev,
      [tier]: {
        ...prev[tier],
        ...patch,
      },
    }));
  };

  // Quick Multiplier for single tier
  const applyMultiplier = (tier: FishShadowTier, mult: number) => {
    const base = SHADOW_TIER_CONFIG[tier];
    updateTier(tier, {
      lengthPx: Math.round(base.lengthPx * mult),
      widthPx: Math.round(base.widthPx * mult),
    });
  };

  // Preset Presets
  const applyPreset = (preset: 'default' | 'distinct' | 'giant2x' | 'kaiju') => {
    const next: Record<number, AdminShadowTier> = { ...localTiers };
    for (const t of [1, 2, 3, 4, 5, 6] as const) {
      const base = SHADOW_TIER_CONFIG[t];
      let lengthPx = base.lengthPx;
      let widthPx = base.widthPx;
      let swimSpeed = base.swimSpeed;
      let wiggleSpeed = base.wiggleSpeed;
      let hasCrown = base.hasCrown ?? false;
      let hasGlow = base.hasGlow ?? false;

      if (preset === 'default') {
        lengthPx = base.lengthPx;
        widthPx = base.widthPx;
      } else if (preset === 'distinct') {
        // Tăng bậc rõ rệt
        const scaleMap = { 1: 1.0, 2: 1.25, 3: 1.5, 4: 1.8, 5: 2.2, 6: 2.8 };
        lengthPx = Math.round(base.lengthPx * scaleMap[t]);
        widthPx = Math.round(base.widthPx * scaleMap[t]);
      } else if (preset === 'giant2x') {
        // Thế giới khổng lồ
        lengthPx = Math.round(base.lengthPx * 2.0);
        widthPx = Math.round(base.widthPx * 2.0);
      } else if (preset === 'kaiju') {
        // To bất thường / Siêu quái vật
        const scaleMap = { 1: 1.2, 2: 1.6, 3: 2.4, 4: 3.5, 5: 5.5, 6: 9.0 };
        lengthPx = Math.round(base.lengthPx * scaleMap[t]);
        widthPx = Math.round(base.widthPx * scaleMap[t]);
        if (t >= 5) {
          hasGlow = true;
          swimSpeed = 0.45;
          wiggleSpeed = 0.5;
        }
        if (t === 6) {
          hasCrown = true;
        }
      }

      next[t] = {
        tier: t,
        name: base.name,
        label: base.label,
        color: base.color,
        defaultLengthPx: base.lengthPx,
        defaultWidthPx: base.widthPx,
        defaultSwimSpeed: base.swimSpeed,
        defaultWiggleSpeed: base.wiggleSpeed,
        isOverridden: true,
        lengthPx,
        widthPx,
        swimSpeed,
        wiggleSpeed,
        hasCrown,
        hasGlow,
      };
    }
    setLocalTiers(next as Record<FishShadowTier, AdminShadowTier>);
  };

  const currentTierData = localTiers[selectedTier] ?? SHADOW_TIER_CONFIG[selectedTier];
  const maxSliderLength = megaMode ? 3000 : 500;
  const maxSliderWidth = megaMode ? 1200 : 250;

  return (
    <div className="stack" style={{ gap: 20 }}>
      {/* Primary Subtab Switcher */}
      <div className="tabs" role="tablist" style={{ margin: 0 }}>
        <button
          type="button"
          role="tab"
          className="tab"
          aria-selected={subTab === 'scene'}
          onClick={() => setSubTab('scene')}
        >
          🎬 Mô Phỏng Thuyền & Nhịp Đớp (Scene Demo)
        </button>
        <button
          type="button"
          role="tab"
          className="tab"
          aria-selected={subTab === 'tiers'}
          onClick={() => setSubTab('tiers')}
        >
          🌟 Theo 6 Bậc Chuẩn (Tier 1 - Tier 6)
        </button>
        <button
          type="button"
          role="tab"
          className="tab"
          aria-selected={subTab === 'species'}
          onClick={() => setSubTab('species')}
        >
          🐟 Tùy Chỉnh Theo Từng Con Cá Cụ Thể (Per-Fish Species)
        </button>
      </div>

      {subTab === 'scene' ? (
        <FishSceneSimulator
          selectedSpecies={activeSelectedFish}
          selectedTier={selectedTier}
          allSpecies={allFish}
          onSelectSpecies={(id) => setSelectedFishId(id)}
        />
      ) : subTab === 'species' ? (
        <div className="stack" style={{ gap: 16 }}>
          {/* Species Banner */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(8, 47, 64, 0.6) 0%, rgba(15, 23, 42, 0.7) 100%)',
              border: '1px solid #0284c7',
              borderRadius: 12,
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FishIcon size={24} style={{ color: '#38bdf8' }} />
                <h2 style={{ margin: 0, fontSize: 18, color: '#f0f9ff' }}>
                  Tùy Chỉnh Bóng Theo Từng Loài Cá Cụ Thể (Per-Fish Species Studio)
                </h2>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#94a3b8', maxWidth: 760 }}>
                Chọn trực tiếp bất kỳ loài cá nào để thiết lập bóng nước riêng biệt, vượt qua quy chuẩn bậc
                chung. Hỗ trợ{' '}
                <strong style={{ color: '#38bdf8' }}>kích thước to bất thường (lên đến 50,000px)</strong> cho
                những sự kiện đặc biệt hoặc sinh vật huyền thoại cá biệt.
              </p>
            </div>
          </div>

          {/* Species Search and Filter Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              background: 'var(--surface-1)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '10px 14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 280px' }}>
              <Search size={16} style={{ color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Tìm tên hoặc mã loài cá (ví dụ: Cá Hề, Cá Voi Xanh, clownfish)..."
                value={fishSearch}
                onChange={(e) => setFishSearch(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#f0f9ff',
                  fontSize: 13,
                  width: '100%',
                }}
              />
            </div>

            <div className="tabs" role="tablist" style={{ margin: 0 }}>
              <button
                type="button"
                className={`tab ${fishStatusFilter === 'all' ? 'tab-active' : ''}`}
                style={{ fontSize: 12, padding: '4px 10px' }}
                onClick={() => setFishStatusFilter('all')}
              >
                Tất cả ({allFish.length})
              </button>
              <button
                type="button"
                className={`tab ${fishStatusFilter === 'custom' ? 'tab-active' : ''}`}
                style={{ fontSize: 12, padding: '4px 10px' }}
                onClick={() => setFishStatusFilter('custom')}
              >
                🌊 Có bóng riêng ({allFish.filter((f) => f.isShadowOverridden).length})
              </button>
              <button
                type="button"
                className={`tab ${fishStatusFilter === 'default' ? 'tab-active' : ''}`}
                style={{ fontSize: 12, padding: '4px 10px' }}
                onClick={() => setFishStatusFilter('default')}
              >
                Chuẩn theo bậc ({allFish.filter((f) => !f.isShadowOverridden).length})
              </button>
            </div>
          </div>

          {/* Quick Species Selection Strip */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 6,
            }}
          >
            {filteredSpecies.map((f) => {
              const isSelected = activeSelectedFish?.id === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    play('click');
                    setSelectedFishId(f.id);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 12px',
                    borderRadius: 8,
                    background: isSelected ? 'rgba(56, 189, 248, 0.2)' : 'var(--surface-2)',
                    border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <img
                    src={fishIcon(f.id, 2)}
                    alt=""
                    style={{ width: 28, height: 22, objectFit: 'contain' }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? '#38bdf8' : '#e2e8f0',
                    }}
                  >
                    {f.name}
                  </span>
                  {f.isShadowOverridden && (
                    <span
                      style={{
                        background: '#818cf8',
                        color: '#fff',
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: 4,
                      }}
                    >
                      Bóng riêng
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tuner for the active fish */}
          {activeSelectedFish ? (
            <FishSpeciesShadowTuner
              key={activeSelectedFish.id}
              fish={activeSelectedFish}
              onSaved={() => {
                qc.invalidateQueries({ queryKey: ['admin-fish'] });
              }}
              onOpenScene={() => setSubTab('scene')}
            />
          ) : (
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#94a3b8',
              }}
            >
              Không tìm thấy loài cá nào phù hợp với bộ lọc tìm kiếm.
            </div>
          )}
        </div>
      ) : (
        <div className="stack" style={{ gap: 20 }}>
          {/* Top Banner / Description */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(8, 47, 64, 0.6) 0%, rgba(15, 23, 42, 0.7) 100%)',
              border: '1px solid #0284c7',
              borderRadius: 12,
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Waves size={24} style={{ color: '#38bdf8' }} />
                <h2 style={{ margin: 0, fontSize: 18, color: '#f0f9ff' }}>
                  Studio Tinh Chỉnh Bóng Cá Dưới Nước (Fish Shadow Tiers)
                </h2>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#94a3b8', maxWidth: 760 }}>
                Điều chỉnh kích thước chiều dài & chiều rộng bóng cá cho 6 cấp độ. Hỗ trợ{' '}
                <strong style={{ color: '#38bdf8' }}>kích thước to bất thường (không giới hạn trần)</strong>{' '}
                để tạo bóng cá quái thú khổng lồ hoặc Leviathan thần thoại trong thế giới game.
              </p>
            </div>

            {/* Global Action Buttons */}
            <div className="row" style={{ gap: 10, alignItems: 'center' }}>
              <Button
                variant="ghost"
                size="sm"
                loading={resetAllMutation.isPending}
                onClick={() => resetAllMutation.mutate()}
                style={{ color: '#f87171' }}
              >
                <RotateCcw size={14} /> Khôi phục gốc
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={saveAllMutation.isPending}
                onClick={() => saveAllMutation.mutate()}
                style={{ background: '#0284c7', borderColor: '#38bdf8' }}
              >
                <Save size={15} /> Lưu Cấu Hình Toàn Server
              </Button>
            </div>
          </div>

          {/* Quick Presets Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'var(--surface-1)',
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
              Cài đặt mẫu nhanh (Presets):
            </span>
            <button type="button" className="btn btn-xs btn-ghost" onClick={() => applyPreset('default')}>
              <RotateCcw size={12} /> Chuẩn mặc định
            </button>
            <button
              type="button"
              className="btn btn-xs btn-secondary"
              onClick={() => applyPreset('distinct')}
            >
              <Sliders size={12} /> Tăng bậc rõ rệt (+25% - +180%)
            </button>
            <button type="button" className="btn btn-xs btn-secondary" onClick={() => applyPreset('giant2x')}>
              <Maximize2 size={12} /> Thế giới khổng lồ (2.0x)
            </button>
            <button
              type="button"
              className="btn btn-xs btn-secondary"
              onClick={() => applyPreset('kaiju')}
              style={{
                background: 'linear-gradient(90deg, #ca8a04 0%, #dc2626 100%)',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
              }}
            >
              <Sparkles size={12} /> To Bất Thường / Siêu Quái Vật (Kaiju Extreme)
            </button>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <label
                style={{
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  color: megaMode ? '#38bdf8' : 'var(--text-muted)',
                  fontWeight: megaMode ? 700 : 400,
                }}
              >
                <input type="checkbox" checked={megaMode} onChange={(e) => setMegaMode(e.target.checked)} />
                Mở rộng slider tới 3000px (Chế độ To Bất Thường)
              </label>
            </div>
          </div>

          {/* Main Studio Workbench Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(380px, 480px) 1fr',
              gap: 20,
              alignItems: 'start',
            }}
          >
            {/* LEFT: Tier Selection & Controls Panel */}
            <div
              style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              {/* Tier Selector Chips (1 to 6) */}
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    marginBottom: 8,
                    display: 'block',
                  }}
                >
                  Chọn Cấp Bóng Cá (Tier 1 - 6):
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 8,
                  }}
                >
                  {([1, 2, 3, 4, 5, 6] as const).map((tier) => {
                    const info = localTiers[tier];
                    const isSel = selectedTier === tier;
                    return (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setSelectedTier(tier)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: isSel ? '2px solid #38bdf8' : '1px solid var(--border)',
                          background: isSel ? 'rgba(56, 189, 248, 0.15)' : 'var(--surface-2)',
                          color: isSel ? '#38bdf8' : 'var(--text)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                        }}
                      >
                        <div
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                        >
                          <span style={{ fontWeight: 700, fontSize: 13 }}>
                            Cấp {tier} {info?.hasCrown ? '👑' : ''}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{info?.lengthPx}px</span>
                        </div>
                        <span
                          style={{
                            fontSize: 11,
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {info?.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Current Tier Control Box */}
              <div
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 16,
                        color: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      Cấp {selectedTier}: {currentTierData.name}
                      {currentTierData.hasCrown && <Crown size={16} style={{ color: '#fbbf24' }} />}
                    </h3>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Gốc: {currentTierData.defaultLengthPx} × {currentTierData.defaultWidthPx} px
                    </span>
                  </div>

                  {/* Quick Multiplier Pill Buttons */}
                  <div className="row" style={{ gap: 4 }}>
                    {[1.0, 1.5, 2.0, 3.0, 5.0, 10.0].map((m) => (
                      <button
                        key={m}
                        type="button"
                        className="btn btn-xs btn-ghost"
                        style={{ fontSize: 10, padding: '2px 5px', color: m >= 5.0 ? '#f59e0b' : 'inherit' }}
                        onClick={() => applyMultiplier(selectedTier, m)}
                        title={`Nhân ${m}x kích thước gốc`}
                      >
                        {m === 1.0 ? '1x' : `${m}x`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Length Control */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Chiều dài bóng (lengthPx):</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="number"
                        min={5}
                        max={50000}
                        value={currentTierData.lengthPx}
                        onChange={(e) =>
                          updateTier(selectedTier, { lengthPx: Math.max(5, Number(e.target.value) || 5) })
                        }
                        style={{
                          width: 80,
                          textAlign: 'right',
                          padding: '4px 8px',
                          borderRadius: 6,
                          background: 'var(--surface-1)',
                          border: '1px solid var(--border)',
                          color: '#38bdf8',
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      />
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>px</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={maxSliderLength}
                    value={Math.min(maxSliderLength, currentTierData.lengthPx)}
                    onChange={(e) => updateTier(selectedTier, { lengthPx: Number(e.target.value) })}
                    style={{ width: '100%', accentColor: '#38bdf8' }}
                  />
                </div>

                {/* Width Control */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Chiều rộng bóng (widthPx):</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="number"
                        min={2}
                        max={25000}
                        value={currentTierData.widthPx}
                        onChange={(e) =>
                          updateTier(selectedTier, { widthPx: Math.max(2, Number(e.target.value) || 2) })
                        }
                        style={{
                          width: 80,
                          textAlign: 'right',
                          padding: '4px 8px',
                          borderRadius: 6,
                          background: 'var(--surface-1)',
                          border: '1px solid var(--border)',
                          color: '#38bdf8',
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      />
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>px</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={maxSliderWidth}
                    value={Math.min(maxSliderWidth, currentTierData.widthPx)}
                    onChange={(e) => updateTier(selectedTier, { widthPx: Number(e.target.value) })}
                    style={{ width: '100%', accentColor: '#38bdf8' }}
                  />
                </div>

                {/* Swim & Wiggle Speed */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        marginBottom: 2,
                      }}
                    >
                      <span>Tốc độ bơi:</span>
                      <strong>{currentTierData.swimSpeed.toFixed(2)}x</strong>
                    </div>
                    <input
                      type="range"
                      min={0.2}
                      max={2.5}
                      step={0.05}
                      value={currentTierData.swimSpeed}
                      onChange={(e) => updateTier(selectedTier, { swimSpeed: Number(e.target.value) })}
                      style={{ width: '100%', accentColor: '#38bdf8' }}
                    />
                  </div>

                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        marginBottom: 2,
                      }}
                    >
                      <span>Quẫy đuôi:</span>
                      <strong>{currentTierData.wiggleSpeed.toFixed(2)}x</strong>
                    </div>
                    <input
                      type="range"
                      min={0.2}
                      max={3.0}
                      step={0.05}
                      value={currentTierData.wiggleSpeed}
                      onChange={(e) => updateTier(selectedTier, { wiggleSpeed: Number(e.target.value) })}
                      style={{ width: '100%', accentColor: '#38bdf8' }}
                    />
                  </div>
                </div>

                {/* Special Visual Toggles */}
                <div
                  style={{
                    display: 'flex',
                    gap: 16,
                    paddingTop: 8,
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      fontSize: 13,
                      userSelect: 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={currentTierData.hasCrown ?? false}
                      onChange={(e) => updateTier(selectedTier, { hasCrown: e.target.checked })}
                    />
                    👑 Có Vương Miện Vàng
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      cursor: 'pointer',
                      fontSize: 13,
                      userSelect: 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={currentTierData.hasGlow ?? false}
                      onChange={(e) => updateTier(selectedTier, { hasGlow: e.target.checked })}
                    />
                    ✨ Quầng Sáng Thần Thoại
                  </label>
                </div>
              </div>
            </div>

            {/* RIGHT: Live Interactive Canvas Preview */}
            <div
              style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {/* Preview Toolbar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <Eye size={16} style={{ color: '#38bdf8' }} />
                  <strong style={{ fontSize: 14 }}>Xem trước làn nước thời gian thực:</strong>

                  {/* Mode Toggle */}
                  <div className="tabs" role="tablist" style={{ fontSize: 11 }}>
                    <button
                      role="tab"
                      className="tab"
                      aria-selected={previewMode === 'single'}
                      onClick={() => setPreviewMode('single')}
                    >
                      Cấp đang chọn ({selectedTier})
                    </button>
                    <button
                      role="tab"
                      className="tab"
                      aria-selected={previewMode === 'all'}
                      onClick={() => setPreviewMode('all')}
                    >
                      So sánh cả 6 cấp
                    </button>
                  </div>
                </div>

                {/* Zoom & Action Controls */}
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Thu phóng:</span>
                  {[1.0, 0.75, 0.5, 0.25, 0.15].map((z) => (
                    <button
                      key={z}
                      type="button"
                      className={`btn btn-xs ${zoom === z ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ fontSize: 10, padding: '2px 6px' }}
                      onClick={() => setZoom(z)}
                    >
                      {Math.round(z * 100)}%
                    </button>
                  ))}

                  <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />

                  <button
                    type="button"
                    className={`btn btn-xs ${testAction === 'normal' ? 'btn-secondary' : 'btn-ghost'}`}
                    onClick={() => setTestAction('normal')}
                    title="Bơi lội thảnh thơi bình thường"
                  >
                    Bơi êm
                  </button>
                  <button
                    type="button"
                    className={`btn btn-xs ${testAction === 'nibble' ? 'btn-secondary' : 'btn-ghost'}`}
                    onClick={() => setTestAction('nibble')}
                    title="Mô phỏng cá nhấp rỉa mồi giật lùi"
                  >
                    Rỉa mồi
                  </button>
                  <button
                    type="button"
                    className={`btn btn-xs ${testAction === 'bite' ? 'btn-secondary' : 'btn-ghost'}`}
                    onClick={() => setTestAction('bite')}
                    style={{ color: testAction === 'bite' ? '#ef4444' : undefined }}
                    title="Mô phỏng cá cắn câu quẫy mạnh"
                  >
                    <Zap size={12} /> Cắn câu!
                  </button>
                </div>
              </div>

              {/* Canvas Viewport */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: 480,
                  borderRadius: 10,
                  overflow: 'hidden',
                  boxShadow: 'inset 0 0 30px rgba(0, 0, 0, 0.6)',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={900}
                  height={500}
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                  }}
                />

                {/* Overlay Water Info Badge */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 12,
                    left: 12,
                    background: 'rgba(2, 13, 20, 0.75)',
                    backdropFilter: 'blur(6px)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: 12,
                    color: '#e0f2fe',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span>
                    Cấp {selectedTier} ({currentTierData.name}):{' '}
                    <strong style={{ color: '#38bdf8' }}>{currentTierData.lengthPx}px</strong> dài ×{' '}
                    <strong style={{ color: '#38bdf8' }}>{currentTierData.widthPx}px</strong> rộng
                  </span>
                  {currentTierData.lengthPx > 500 && (
                    <span
                      style={{
                        background: '#ef4444',
                        color: '#fff',
                        padding: '1px 6px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      TO BẤT THƯỜNG
                    </span>
                  )}
                </div>
              </div>

              <div className="muted" style={{ fontSize: 12 }}>
                💡 Mẹo: Khi kéo thanh trượt hoặc nhập số chiều dài lớn (ví dụ 1000px, 2000px), hãy chọn nút
                thu nhỏ <strong>50%</strong> hoặc <strong>25%</strong> để quan sát trọn vẹn bóng cá khổng lồ.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
