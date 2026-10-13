import {
  DEFAULT_APPEARANCE,
  SHADOW_TIER_CONFIG,
  type Appearance,
  type FishShadowTier,
  type ShadowTierInfo,
} from '@cozy/game-data';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  Crown,
  Fish as FishIcon,
  Lock,
  RotateCcw,
  Ruler,
  Save,
  Search,
  Sliders,
  Sparkles,
  Unlock,
  Volume2,
  VolumeX,
  Waves,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { drawAvatar } from '../../art/avatar';
import { fishIcon } from '../../art/fish';
import { drawCanvasOrganicFishShadow } from '../../game/fish-shadow';
import { api, type Me } from '../../lib/api';
import { play } from '../../lib/sound';
import { useUi } from '../../lib/store';
import { Button } from '../../ui/primitives';
import type { AdminFishSpecies } from './FishAdmin';
import { FishSceneSimulator } from './FishSceneSimulator';
import { FishSpeciesShadowTuner } from './FishSpeciesShadowTuner';

export interface AdminShadowTier extends ShadowTierInfo {
  defaultLengthPx: number;
  defaultWidthPx: number;
  defaultSwimSpeed: number;
  defaultWiggleSpeed: number;
  isOverridden: boolean;
}

const TIER_METADATA: Record<
  FishShadowTier,
  { label: string; sampleFish: string; badgeColor: string; bgTint: string }
> = {
  1: {
    label: 'Cá Siêu Nhỏ (Tép, Cá Bống)',
    sampleFish: 'Tép riu, cá lòng tong, cá bảy màu',
    badgeColor: '#94a3b8',
    bgTint: 'rgba(148, 163, 184, 0.1)',
  },
  2: {
    label: 'Cá Nhỏ (Cá Rô, Cá Diêu Hồng)',
    sampleFish: 'Cá diêu hồng, cá rô đồng, cá chép nhỏ',
    badgeColor: '#38bdf8',
    bgTint: 'rgba(56, 189, 248, 0.1)',
  },
  3: {
    label: 'Cá Vừa (Cá Chép, Cá Bass)',
    sampleFish: 'Cá bass miệng rộng, cá chẽm, cá lăng',
    badgeColor: '#818cf8',
    bgTint: 'rgba(129, 140, 248, 0.1)',
  },
  4: {
    label: 'Cá Lớn (Cá Hồi, Cá Tra Dầu)',
    sampleFish: 'Cá hồi đại tây dương, cá tra dầu, cá ngừ',
    badgeColor: '#c084fc',
    bgTint: 'rgba(192, 132, 252, 0.1)',
  },
  5: {
    label: 'Khổng Lồ (Cá Mập, Cá Kiếm)',
    sampleFish: 'Cá mập trắng, cá kiếm đại dương, cá mập búa',
    badgeColor: '#fbbf24',
    bgTint: 'rgba(251, 191, 36, 0.1)',
  },
  6: {
    label: 'Leviathan Thần Thoại 👑',
    sampleFish: 'Cá voi xanh, thủy quái krakens, cá rồng thần',
    badgeColor: '#f43f5e',
    bgTint: 'rgba(244, 63, 94, 0.12)',
  },
};

export function FishShadowAdmin() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'tiers' | 'species' | 'behavior'>('tiers');
  const [selectedTier, setSelectedTier] = useState<FishShadowTier>(6);
  const [viewMode, setViewMode] = useState<'scene' | 'matrix'>('scene');
  const [zoom, setZoom] = useState<number>(0.85);
  const [lockAspectRatio, setLockAspectRatio] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [testAction, setTestAction] = useState<'normal' | 'nibble' | 'bite'>('normal');

  // Logged-in player appearance & username
  const meQuery = useQuery<Me>({
    queryKey: ['me'],
    queryFn: () => api<Me>('/me'),
  });

  const playerAppearance: Appearance = meQuery.data?.appearance ?? DEFAULT_APPEARANCE;
  const playerName: string = meQuery.data?.displayName ?? 'TinAdmin';

  // Server shadow tier data
  const shadowQuery = useQuery({
    queryKey: ['admin-fish-shadow-tiers'],
    queryFn: () => api<AdminShadowTier[]>('/admin/fish/shadow-tiers'),
  });

  // All fish definitions
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

  // Local editable tiers map
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

  // Canvas Reference
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Simulation Timeline State for In-Scene Demo
  const [simNonce, setSimNonce] = useState<number>(1);
  const [biteTriggered, setBiteTriggered] = useState<boolean>(false);

  const restartCast = () => {
    setBiteTriggered(false);
    setSimNonce((n) => n + 1);
    if (soundEnabled) play('splash');
  };

  const triggerInstantBite = () => {
    setBiteTriggered(true);
    if (soundEnabled) {
      play('bite');
      play('splash');
    }
  };

  // Live Canvas Rendering Loop (Dual Mode: Real Scene or 6-Tier Comparison Matrix)
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const startTime = performance.now();
    const ripples: Array<{ x: number; y: number; r: number; maxR: number; alpha: number }> = [];
    const splashes: Array<{ x: number; y: number; vx: number; vy: number; alpha: number }> = [];

    const spawnRipple = (x: number, y: number, maxRadius = 38) => {
      ripples.push({ x, y, r: 4, maxR: maxRadius, alpha: 0.85 });
    };

    const spawnSplashes = (x: number, y: number, count = 10) => {
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 1.2 + Math.random() * 2.5;
        splashes.push({
          x,
          y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 1.5,
          alpha: 1,
        });
      }
    };

    let lastAutoRipple = 0;

    const render = () => {
      const cvs = canvasRef.current;
      if (!cvs) return;
      const ctx = cvs.getContext('2d');
      if (!ctx) return;

      const width = cvs.width;
      const height = cvs.height;
      const now = performance.now();
      const elapsed = now - startTime;

      // 1. Water Background Gradient (Deep Ocean Night)
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#071e2c');
      grad.addColorStop(0.55, '#051622');
      grad.addColorStop(1, '#020b12');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Subtle water ripple scanlines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      for (let y = 0; y < height; y += 18) {
        const drift = Math.sin((y + elapsed * 0.03) * 0.05) * 4;
        ctx.beginPath();
        ctx.moveTo(0, y + drift);
        ctx.lineTo(width, y + drift);
        ctx.stroke();
      }

      ctx.save();

      if (viewMode === 'scene') {
        // ------------------ IN-GAME FISHING SCENE MODE ------------------
        // Warm boat lantern glow radiating on dark water
        const lanternGlow = ctx.createRadialGradient(
          width * 0.28,
          height * 0.52,
          20,
          width * 0.28,
          height * 0.52,
          320,
        );
        lanternGlow.addColorStop(0, 'rgba(253, 224, 71, 0.24)');
        lanternGlow.addColorStop(0.35, 'rgba(245, 158, 11, 0.08)');
        lanternGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = lanternGlow;
        ctx.fillRect(0, 0, width, height);

        ctx.translate(width / 2, height / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(-width / 2, -height / 2);

        // Boat & Character anchor
        const boatX = width * 0.22;
        const boatY = height * 0.56;
        const charX = boatX + 16;
        const charY = boatY - 14;

        // Bobber anchor in open water
        const bobberX = width * 0.62;
        let bobberY = height * 0.54 + Math.sin(elapsed * 0.004) * 2;

        const isBite = biteTriggered || testAction === 'bite';
        const isNibble = testAction === 'nibble' || (elapsed % 3200 > 1800 && elapsed % 3200 < 2200);

        if (isBite && splashes.length === 0) {
          spawnSplashes(bobberX, bobberY, 14);
        }

        if (isNibble && !isBite) {
          bobberY += Math.sin(elapsed * 0.02) * 2;
        }

        // Draw Authentic Wooden Boat
        drawAuthenticFishingBoat(ctx, boatX, boatY, elapsed);

        // Draw Authentic Player Character
        drawAuthenticPlayerCharacter(ctx, charX, charY, elapsed, isBite, playerAppearance, playerName);

        // Rod Tip Position
        const rodTipX = charX + 46;
        const rodTipY = charY + (isBite ? 6 : -4) + Math.sin(elapsed * 0.003) * 1.5;

        // Spawn periodic ripples
        if (elapsed - lastAutoRipple > 1600 && !isBite) {
          lastAutoRipple = elapsed;
          spawnRipple(bobberX, bobberY, 26);
        }

        // Update and draw ripples
        for (let i = ripples.length - 1; i >= 0; i--) {
          const rp = ripples[i]!;
          rp.r += 0.35;
          rp.alpha -= 0.007;
          if (rp.alpha <= 0 || rp.r > rp.maxR) {
            ripples.splice(i, 1);
            continue;
          }
          ctx.strokeStyle = `rgba(147, 197, 253, ${rp.alpha * 0.7})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.45, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Update and draw splashes
        for (let i = splashes.length - 1; i >= 0; i--) {
          const sp = splashes[i]!;
          sp.x += sp.vx;
          sp.y += sp.vy;
          sp.vy += 0.15;
          sp.alpha -= 0.025;
          if (sp.alpha <= 0) {
            splashes.splice(i, 1);
            continue;
          }
          ctx.fillStyle = `rgba(255, 255, 255, ${sp.alpha})`;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }

        // Fishing Line
        ctx.strokeStyle = isBite ? 'rgba(255, 255, 255, 0.95)' : 'rgba(241, 245, 249, 0.7)';
        ctx.lineWidth = 1;
        const sag = isBite ? -2 : 6 + Math.sin(elapsed * 0.003) * 2;
        const midX = (rodTipX + bobberX) / 2;
        const midY = (rodTipY + bobberY) / 2 + sag;
        ctx.beginPath();
        ctx.moveTo(rodTipX, rodTipY);
        ctx.quadraticCurveTo(midX, midY, bobberX, bobberY - 6);
        ctx.stroke();

        // Bobber (Red & White Hemisphere)
        ctx.save();
        ctx.translate(bobberX, bobberY);
        ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
        ctx.beginPath();
        ctx.ellipse(0, 4, 9, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, 0, 6, Math.PI, 0, false);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI, false);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-1, -11, 2, 6);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, -11, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // BITE Exclamation Mark (!)
        if (isBite) {
          const bounce = Math.sin(elapsed * 0.02) * 5;
          const exY = bobberY - 32 + bounce;

          ctx.save();
          ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
          ctx.beginPath();
          ctx.arc(bobberX, exY, 16, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#dc2626';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(bobberX - 3.5, exY - 14, 7, 14, 2);
          ctx.fill();
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(bobberX, exY + 5, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }

        // Active Fish Shadow swimming around bobber
        const curTierCfg = localTiers[selectedTier] ?? SHADOW_TIER_CONFIG[selectedTier];
        const swimRadius = Math.max(35, curTierCfg.lengthPx * 0.32);
        const swimSpeedVal = curTierCfg.swimSpeed ?? 1.0;

        let fishX: number;
        let fishY: number;
        let fishAngle: number;

        if (isBite) {
          // Thrashing on bobber
          const thrash = Math.sin(elapsed * 0.04 * curTierCfg.wiggleSpeed) * 8;
          fishX = bobberX + Math.cos(elapsed * 0.02) * 6;
          fishY = bobberY + 6 + thrash;
          fishAngle = Math.atan2(bobberY - fishY, bobberX - fishX);
        } else if (isNibble) {
          // Darting forward to nibble then recoiling
          const nibbleCycle = (elapsed % 1200) / 1200;
          const dist = swimRadius * (0.4 + Math.sin(nibbleCycle * Math.PI) * 0.5);
          fishX = bobberX + Math.cos(1.2) * dist;
          fishY = bobberY + Math.sin(1.2) * dist;
          fishAngle = Math.atan2(bobberY - fishY, bobberX - fishX);
        } else {
          // Calmly circling the float
          const swimAngle = elapsed * 0.0009 * swimSpeedVal;
          fishX = bobberX + Math.cos(swimAngle) * swimRadius;
          fishY = bobberY + Math.sin(swimAngle * 1.4) * (swimRadius * 0.5);
          fishAngle = swimAngle + Math.PI / 2;
        }

        drawCanvasOrganicFishShadow(ctx, fishX, fishY, fishAngle, elapsed, curTierCfg, 1, isBite, isNibble);
      } else {
        // ------------------ 6-TIER COMPARISON MATRIX MODE ------------------
        ctx.translate(width / 2, height / 2);
        ctx.scale(zoom, zoom);

        const allTiersList = ([1, 2, 3, 4, 5, 6] as const).map((t) => localTiers[t] ?? SHADOW_TIER_CONFIG[t]);
        const rowHeight = 78;
        const totalHeight = allTiersList.length * rowHeight;
        const startY = -totalHeight / 2 + 36;

        // Pixel Ruler Background Grid
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        for (let rx = -200; rx <= 350; rx += 50) {
          ctx.beginPath();
          ctx.moveTo(rx, -totalHeight / 2 - 10);
          ctx.lineTo(rx, totalHeight / 2 + 20);
          ctx.stroke();

          // Ruler tick labels
          ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`${rx + 200}px`, rx, -totalHeight / 2 - 14);
        }
        ctx.setLineDash([]);

        // Render each tier aligned horizontally for side-by-side comparison
        allTiersList.forEach((tierCfg, idx) => {
          const cy = startY + idx * rowHeight;
          const isCurrentSelected = tierCfg.tier === selectedTier;

          // Row background highlight for selected tier
          if (isCurrentSelected) {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
            ctx.fillRect(-380, cy - rowHeight / 2 + 4, 760, rowHeight - 8);
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
            ctx.lineWidth = 1;
            ctx.strokeRect(-380, cy - rowHeight / 2 + 4, 760, rowHeight - 8);
          }

          // Gentle swim motion
          const swimAngle = elapsed * 0.001 * tierCfg.swimSpeed + idx * 0.5;
          const cx = 40 + Math.sin(swimAngle) * 20;
          const heading = Math.PI + Math.cos(swimAngle) * 0.12;

          drawCanvasOrganicFishShadow(ctx, cx, cy, heading, elapsed, tierCfg, 1, false, false);

          // Tier Label & Info on the left
          ctx.fillStyle = isCurrentSelected ? '#38bdf8' : tierCfg.hasCrown ? '#fbbf24' : '#e2e8f0';
          ctx.font = isCurrentSelected ? 'bold 13px system-ui, sans-serif' : '12px system-ui, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(`Cấp ${tierCfg.tier}${tierCfg.hasCrown ? ' 👑' : ''}: ${tierCfg.name}`, -180, cy - 2);

          // Dimension badge
          ctx.fillStyle = '#94a3b8';
          ctx.font = '11px monospace';
          ctx.fillText(`${tierCfg.lengthPx} × ${tierCfg.widthPx} px`, -180, cy + 14);
        });
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    localTiers,
    selectedTier,
    viewMode,
    zoom,
    testAction,
    biteTriggered,
    simNonce,
    soundEnabled,
    playerAppearance,
    playerName,
  ]);

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
        body: 'Cấu hình 6 bậc bóng cá đã được đồng bộ toàn server!',
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
        body: 'Toàn bộ 6 cấp bóng cá đã được đưa về kích thước tiêu chuẩn ban đầu.',
      });
    },
  });

  // Local tier updates helper
  const updateTier = (tier: FishShadowTier, patch: Partial<AdminShadowTier>) => {
    setLocalTiers((prev) => {
      const cur = prev[tier];
      const nextPatch = { ...patch };

      // Maintain Aspect Ratio automatically if enabled
      if (lockAspectRatio && patch.lengthPx !== undefined && patch.widthPx === undefined) {
        const baseRatio = cur.defaultLengthPx / Math.max(1, cur.defaultWidthPx);
        nextPatch.widthPx = Math.max(2, Math.round(patch.lengthPx / baseRatio));
      } else if (lockAspectRatio && patch.widthPx !== undefined && patch.lengthPx === undefined) {
        const baseRatio = cur.defaultLengthPx / Math.max(1, cur.defaultWidthPx);
        nextPatch.lengthPx = Math.max(5, Math.round(patch.widthPx * baseRatio));
      }

      return {
        ...prev,
        [tier]: {
          ...cur,
          ...nextPatch,
          isOverridden: true,
        },
      };
    });
  };

  // Quick Multiplier for single tier
  const applyMultiplier = (tier: FishShadowTier, mult: number) => {
    const base = SHADOW_TIER_CONFIG[tier];
    updateTier(tier, {
      lengthPx: Math.round(base.lengthPx * mult),
      widthPx: Math.round(base.widthPx * mult),
    });
  };

  // Preset Configurations
  const applyPreset = (preset: 'default' | 'distinct' | 'giant2x') => {
    const next: Record<number, AdminShadowTier> = { ...localTiers };
    for (const t of [1, 2, 3, 4, 5, 6] as const) {
      const base = SHADOW_TIER_CONFIG[t];
      let lengthPx = base.lengthPx;
      let widthPx = base.widthPx;
      const swimSpeed = base.swimSpeed;
      const wiggleSpeed = base.wiggleSpeed;
      const hasCrown = base.hasCrown ?? false;
      const hasGlow = base.hasGlow ?? false;

      if (preset === 'default') {
        lengthPx = base.lengthPx;
        widthPx = base.widthPx;
      } else if (preset === 'distinct') {
        const scaleMap = { 1: 1.0, 2: 1.25, 3: 1.5, 4: 1.8, 5: 2.2, 6: 2.8 };
        lengthPx = Math.round(base.lengthPx * scaleMap[t]);
        widthPx = Math.round(base.widthPx * scaleMap[t]);
      } else if (preset === 'giant2x') {
        lengthPx = Math.round(base.lengthPx * 2.0);
        widthPx = Math.round(base.widthPx * 2.0);
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
  const currentMeta = TIER_METADATA[selectedTier];

  // Tier badge color mapping to Tailwind classes
  return (
    <div className="fstudio-root">
      {/* ── Header ── */}
      <div className="fstudio-header">
        <div className="fstudio-header-title">
          <FishIcon size={22} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <div>
            <div className="row" style={{ gap: 8 }}>
              <h2>Studio Quản Trị Kích Thước Bóng Cá</h2>
              <span className="pill pill-primary">Chuẩn 6 Bậc (Tier 1 - 6)</span>
            </div>
            <p className="muted" style={{ fontSize: 12, marginTop: 2 }}>
              Tinh chỉnh chiều dài, chiều rộng, vương miện và hiệu ứng bơi lội với khung xem trước thực tế
              trong hồ nước.
            </p>
          </div>
        </div>

        <div className="row" style={{ gap: 8 }}>
          <Button
            variant="ghost"
            size="sm"
            loading={resetAllMutation.isPending}
            onClick={() => resetAllMutation.mutate()}
            style={{ color: 'var(--danger)', fontSize: 12 }}
          >
            <RotateCcw size={14} /> Khôi Phục Gốc
          </Button>

          <Button
            variant="primary"
            size="sm"
            loading={saveAllMutation.isPending}
            onClick={() => saveAllMutation.mutate()}
            style={{ fontSize: 12, fontWeight: 700 }}
          >
            <Save size={14} /> Lưu Cấu Hình Toàn Server
          </Button>
        </div>
      </div>

      {/* ── Subtab Navigation ── */}
      <div className="fstudio-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className="fstudio-tab"
          aria-selected={activeTab === 'tiers'}
          onClick={() => setActiveTab('tiers')}
        >
          <Sliders size={15} /> Cấu Hình 6 Bậc Chuẩn (Tier 1 - Tier 6)
        </button>
        <button
          type="button"
          role="tab"
          className="fstudio-tab"
          aria-selected={activeTab === 'species'}
          onClick={() => setActiveTab('species')}
        >
          <FishIcon size={15} /> Tùy Chỉnh Theo Từng Loài Cá Cụ Thể ({allFish.length})
        </button>
        <button
          type="button"
          role="tab"
          className="fstudio-tab"
          aria-selected={activeTab === 'behavior'}
          onClick={() => setActiveTab('behavior')}
        >
          <Clock size={15} /> Tinh Chỉnh Nhịp Đớp & Thời Gian Chờ (Bite Timing)
        </button>
      </div>

      {/* ── TAB 1: Cấu Hình 6 Bậc ── */}
      {activeTab === 'tiers' && (
        <div className="fstudio-workbench">
          {/* Left Sidebar Controls */}
          <div className="fstudio-sidebar">
            {/* 6-Tier Grid Selector */}
            <div className="fstudio-tier-grid">
              {([1, 2, 3, 4, 5, 6] as const).map((t) => {
                const data = localTiers[t] ?? SHADOW_TIER_CONFIG[t];
                const isSel = selectedTier === t;

                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      play('click');
                      setSelectedTier(t);
                    }}
                    className={`fstudio-tier-card ${isSel ? 'active' : ''}`}
                  >
                    <div className="fstudio-tier-card-top">
                      <span className="fstudio-tier-badge" style={{ color: TIER_METADATA[t].badgeColor }}>
                        Cấp {t}
                      </span>
                      <span className="fstudio-tier-dim">
                        {data.lengthPx}×{data.widthPx}px
                      </span>
                    </div>
                    <div className="fstudio-tier-name">{data.name}</div>
                  </button>
                );
              })}
            </div>

            {/* Selected Tier Parameter Panel */}
            <div className="fstudio-panel">
              {/* Header with name and aspect ratio lock */}
              <div className="row between">
                <div>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13.5 }}
                  >
                    <span style={{ color: currentMeta.badgeColor }}>Cấp {selectedTier}:</span>{' '}
                    {currentTierData.name}
                    {currentTierData.hasCrown && <Crown size={15} color="#d97706" />}
                  </div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                    Gốc: {currentTierData.defaultLengthPx} × {currentTierData.defaultWidthPx} px
                  </div>
                </div>

                <button
                  type="button"
                  className={`pill ${lockAspectRatio ? 'pill-primary' : ''}`}
                  onClick={() => setLockAspectRatio((l) => !l)}
                  style={{ cursor: 'pointer', height: 26 }}
                  title={lockAspectRatio ? 'Đang khóa tỷ lệ dài/rộng' : 'Tự do kéo dài/rộng độc lập'}
                >
                  {lockAspectRatio ? <Lock size={12} /> : <Unlock size={12} />}
                  {lockAspectRatio ? 'Khóa Tỉ Lệ' : 'Tự Do'}
                </button>
              </div>

              {/* Quick Multipliers */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span className="fstudio-field-label">Nhân nhanh:</span>
                <div className="fstudio-mult-bar">
                  {[1.0, 1.25, 1.5, 2.0, 3.0].map((m) => (
                    <button
                      key={m}
                      type="button"
                      className="fstudio-mult-btn"
                      onClick={() => applyMultiplier(selectedTier, m)}
                    >
                      {m === 1.0 ? '1x' : `${m}x`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Length Slider */}
              <div className="fstudio-field">
                <div className="fstudio-field-row">
                  <span className="fstudio-field-label">Chiều Dài Bóng Cá (Length)</span>
                  <div className="row" style={{ gap: 4 }}>
                    <input
                      type="number"
                      min={5}
                      max={3000}
                      value={currentTierData.lengthPx}
                      onChange={(e) =>
                        updateTier(selectedTier, { lengthPx: Math.max(5, Number(e.target.value) || 5) })
                      }
                      className="fstudio-input-num"
                    />
                    <span className="muted" style={{ fontSize: 11 }}>
                      px
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min={10}
                  max={Math.max(1200, currentTierData.lengthPx * 1.5)}
                  value={currentTierData.lengthPx}
                  onChange={(e) => updateTier(selectedTier, { lengthPx: Number(e.target.value) })}
                  className="fstudio-range"
                />
              </div>

              {/* Width Slider */}
              <div className="fstudio-field">
                <div className="fstudio-field-row">
                  <span className="fstudio-field-label">Chiều Rộng Bóng Cá (Width)</span>
                  <div className="row" style={{ gap: 4 }}>
                    <input
                      type="number"
                      min={2}
                      max={1200}
                      value={currentTierData.widthPx}
                      onChange={(e) =>
                        updateTier(selectedTier, { widthPx: Math.max(2, Number(e.target.value) || 2) })
                      }
                      className="fstudio-input-num"
                    />
                    <span className="muted" style={{ fontSize: 11 }}>
                      px
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min={5}
                  max={Math.max(500, currentTierData.widthPx * 1.5)}
                  value={currentTierData.widthPx}
                  onChange={(e) => updateTier(selectedTier, { widthPx: Number(e.target.value) })}
                  className="fstudio-range"
                />
              </div>

              {/* Swim speed slider */}
              <div className="fstudio-field">
                <div className="fstudio-field-row">
                  <span className="fstudio-field-label">Tốc độ bơi lội</span>
                  <span className="fstudio-field-val">{currentTierData.swimSpeed.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={2.5}
                  step={0.05}
                  value={currentTierData.swimSpeed}
                  onChange={(e) => updateTier(selectedTier, { swimSpeed: Number(e.target.value) })}
                  className="fstudio-range"
                />
              </div>

              {/* Wiggle speed slider */}
              <div className="fstudio-field">
                <div className="fstudio-field-row">
                  <span className="fstudio-field-label">Quẫy đuôi nước</span>
                  <span className="fstudio-field-val">{currentTierData.wiggleSpeed.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={3.0}
                  step={0.05}
                  value={currentTierData.wiggleSpeed}
                  onChange={(e) => updateTier(selectedTier, { wiggleSpeed: Number(e.target.value) })}
                  className="fstudio-range"
                />
              </div>

              {/* Crown & Glow Toggles */}
              <div className="fstudio-check-group">
                <label className={`fstudio-check-card ${currentTierData.hasCrown ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={currentTierData.hasCrown ?? false}
                    onChange={(e) => updateTier(selectedTier, { hasCrown: e.target.checked })}
                  />
                  <Crown size={14} color="#d97706" />
                  <span>Vương Miện Vàng</span>
                </label>

                <label className={`fstudio-check-card ${currentTierData.hasGlow ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={currentTierData.hasGlow ?? false}
                    onChange={(e) => updateTier(selectedTier, { hasGlow: e.target.checked })}
                  />
                  <Sparkles size={14} color="#0284c7" />
                  <span>Quầng Sáng Thần Bí</span>
                </label>
              </div>

              {/* Presets Row */}
              <div className="fstudio-preset-bar">
                <span className="muted" style={{ fontSize: 11 }}>
                  Cài đặt mẫu:
                </span>
                <div className="row" style={{ gap: 4 }}>
                  <button type="button" className="fstudio-preset-btn" onClick={() => applyPreset('default')}>
                    Chuẩn gốc
                  </button>
                  <button
                    type="button"
                    className="fstudio-preset-btn"
                    onClick={() => applyPreset('distinct')}
                  >
                    Bậc rõ rệt
                  </button>
                  <button type="button" className="fstudio-preset-btn" onClick={() => applyPreset('giant2x')}>
                    Khổng lồ 2x
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Area — Live Interactive Pond Viewport */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
            <div className="fstudio-viewport-wrap">
              {/* Top Overlay Toolbar */}
              <div className="fstudio-viewport-topbar">
                <div className="fstudio-glass-group">
                  <button
                    type="button"
                    onClick={() => setViewMode('scene')}
                    className={`fstudio-glass-btn ${viewMode === 'scene' ? 'active' : ''}`}
                  >
                    <Waves size={13} />
                    Cảnh Hồ Nước Thực Tế
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('matrix')}
                    className={`fstudio-glass-btn ${viewMode === 'matrix' ? 'active' : ''}`}
                  >
                    <Ruler size={13} />
                    So Sánh Cả 6 Bậc
                  </button>
                </div>

                <div className="row" style={{ gap: 6, pointerEvents: 'auto' }}>
                  <button
                    type="button"
                    onClick={() => setSoundEnabled((v) => !v)}
                    className="fstudio-glass-group"
                    style={{
                      cursor: 'pointer',
                      padding: '5px 8px',
                      color: soundEnabled ? '#38bdf8' : '#64748b',
                    }}
                    title="Bật/Tắt âm thanh giật cần"
                  >
                    {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  </button>

                  <div className="fstudio-glass-group">
                    {[1.0, 0.85, 0.5, 0.25].map((z) => (
                      <button
                        key={z}
                        type="button"
                        onClick={() => setZoom(z)}
                        className={`fstudio-glass-btn ${zoom === z ? 'active' : ''}`}
                      >
                        {Math.round(z * 100)}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Canvas Element */}
              <canvas ref={canvasRef} width={860} height={520} className="fstudio-canvas-element" />

              {/* Bottom Overlay Toolbar */}
              <div className="fstudio-viewport-bottombar">
                <div
                  className="fstudio-glass-group"
                  style={{ fontSize: 12, color: '#e2e8f0', gap: 6, padding: '5px 12px' }}
                >
                  <span style={{ color: '#94a3b8' }}>Đang chiếu:</span>
                  <strong style={{ color: currentMeta.badgeColor }}>
                    Cấp {selectedTier} ({currentTierData.name})
                  </strong>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                    {currentTierData.lengthPx} × {currentTierData.widthPx} px
                  </span>
                  {currentTierData.hasCrown && <Crown size={13} color="#f59e0b" />}
                </div>

                {viewMode === 'scene' && (
                  <div className="row" style={{ gap: 6, pointerEvents: 'auto' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={restartCast}
                      style={{ fontSize: 11, height: 30 }}
                    >
                      <RotateCcw size={12} />
                      Thả lại câu
                    </button>

                    <button
                      type="button"
                      className={`btn btn-sm ${testAction === 'nibble' ? 'btn-reward' : 'btn-secondary'}`}
                      onClick={() => setTestAction((a) => (a === 'nibble' ? 'normal' : 'nibble'))}
                      style={{ fontSize: 11, height: 30 }}
                    >
                      {testAction === 'nibble' ? 'Đang rỉa...' : 'Rỉa mồi'}
                    </button>

                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={triggerInstantBite}
                      style={{ fontSize: 11, height: 30, fontWeight: 700 }}
                    >
                      <Zap size={12} />
                      Bite!
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Tip box below canvas */}
            <div
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                fontSize: 12,
                color: 'var(--ink-2)',
              }}
            >
              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>💡 Mẹo:</span>
              <span>
                Chuyển sang chế độ <strong>So Sánh Cả 6 Bậc</strong> để xem tương quan kích thước trực quan
                của toàn bộ 6 cấp bóng cá cùng lúc.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: Theo Loài Cá ── */}
      {activeTab === 'species' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Species Search and Filter Bar */}
          <div
            className="card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              padding: '12px 16px',
            }}
          >
            <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: 11, color: 'var(--muted)' }} />
              <input
                type="text"
                placeholder="Tìm loài cá (ví dụ: Cá Hề, Cá Voi Xanh, clownfish)..."
                value={fishSearch}
                onChange={(e) => setFishSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px 7px 32px',
                  borderRadius: 8,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--line-2)',
                  fontSize: 13,
                  color: 'var(--ink)',
                }}
              />
            </div>

            <div className="row" style={{ gap: 6 }}>
              <button
                type="button"
                onClick={() => setFishStatusFilter('all')}
                className={`pill ${fishStatusFilter === 'all' ? 'pill-primary' : ''}`}
                style={{ cursor: 'pointer', height: 30, padding: '0 12px' }}
              >
                Tất cả ({allFish.length})
              </button>
              <button
                type="button"
                onClick={() => setFishStatusFilter('custom')}
                className={`pill ${fishStatusFilter === 'custom' ? 'pill-primary' : ''}`}
                style={{ cursor: 'pointer', height: 30, padding: '0 12px' }}
              >
                Bóng riêng ({allFish.filter((f) => f.isShadowOverridden).length})
              </button>
              <button
                type="button"
                onClick={() => setFishStatusFilter('default')}
                className={`pill ${fishStatusFilter === 'default' ? 'pill-primary' : ''}`}
                style={{ cursor: 'pointer', height: 30, padding: '0 12px' }}
              >
                Chuẩn theo bậc ({allFish.filter((f) => !f.isShadowOverridden).length})
              </button>
            </div>
          </div>

          {/* Quick Species Selection Strip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              overflowX: 'auto',
              paddingBottom: 4,
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
                  className="card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 12px',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    borderColor: isSelected ? 'var(--primary)' : 'var(--line-2)',
                    background: isSelected ? 'var(--primary-soft)' : 'var(--surface)',
                    boxShadow: isSelected ? '0 0 0 2px var(--primary-glow)' : 'var(--shadow-1)',
                    transition: 'all 0.12s',
                  }}
                >
                  <img
                    src={fishIcon(f.id, 2)}
                    alt=""
                    style={{ width: 28, height: 20, objectFit: 'contain' }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{f.name}</span>
                  {f.isShadowOverridden && (
                    <span className="pill pill-primary" style={{ height: 18, fontSize: 9, padding: '0 5px' }}>
                      Riêng
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Species Tuner */}
          {activeSelectedFish ? (
            <FishSpeciesShadowTuner
              key={activeSelectedFish.id}
              fish={activeSelectedFish}
              onSaved={() => {
                qc.invalidateQueries({ queryKey: ['admin-fish'] });
              }}
              onOpenScene={() => setActiveTab('tiers')}
            />
          ) : (
            <div
              className="card"
              style={{ textAlign: 'center', padding: 48, color: 'var(--muted)', fontSize: 13 }}
            >
              Không tìm thấy loài cá nào phù hợp với từ khóa tìm kiếm.
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: Nhịp Đớp Mồi ── */}
      {activeTab === 'behavior' && (
        <FishSceneSimulator
          selectedSpecies={activeSelectedFish}
          selectedTier={selectedTier}
          allSpecies={allFish}
          onSelectSpecies={(id) => setSelectedFishId(id)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Canvas Artists

/** Draws Authentic Cozy Wooden Skiff Boat */
function drawAuthenticFishingBoat(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  ctx.save();
  ctx.translate(x, y);

  const bob = Math.sin(time * 0.003) * 2;
  const roll = Math.sin(time * 0.0025) * 0.02;
  ctx.translate(0, bob);
  ctx.rotate(roll);

  // Soft hull shadow in deep water
  ctx.fillStyle = 'rgba(2, 8, 16, 0.65)';
  ctx.beginPath();
  ctx.ellipse(0, 16, 56, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Water wake rings around boat hull
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.2)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, 16, 62 + Math.sin(time * 0.003) * 2, 16 + Math.sin(time * 0.003) * 1, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Outer Timber Hull (Warm Cedar / Mahogany)
  ctx.fillStyle = '#78350f';
  ctx.strokeStyle = '#451a03';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-52, -4);
  ctx.quadraticCurveTo(-20, 2, 48, -4);
  ctx.lineTo(54, 4);
  ctx.quadraticCurveTo(40, 18, 0, 18);
  ctx.quadraticCurveTo(-46, 18, -54, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner Teak Deck Planking
  ctx.fillStyle = '#b45309';
  ctx.beginPath();
  ctx.moveTo(-46, -2);
  ctx.quadraticCurveTo(-15, 4, 44, -2);
  ctx.lineTo(40, 8);
  ctx.quadraticCurveTo(-15, 12, -42, 8);
  ctx.closePath();
  ctx.fill();

  // Deck plank seams
  ctx.strokeStyle = 'rgba(69, 26, 3, 0.4)';
  ctx.lineWidth = 1;
  for (let px = -35; px <= 35; px += 14) {
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px - 4, 9);
    ctx.stroke();
  }

  // Polished Oak Gunwale (Top Rim)
  ctx.fillStyle = '#d97706';
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-54, -6, 106, 4, 2);
  ctx.fill();
  ctx.stroke();

  // Wooden Bench / Seat for the Fisher
  ctx.fillStyle = '#92400e';
  ctx.fillRect(-12, -2, 28, 6);
  ctx.strokeStyle = '#451a03';
  ctx.lineWidth = 1;
  ctx.strokeRect(-12, -2, 28, 6);

  // Brass Lantern on Bow with Warm Golden Light
  const lanternX = 48;
  const lanternY = -10;

  // Lantern Warm Glow Radiating in Water
  const lanternGlow = ctx.createRadialGradient(lanternX, lanternY, 2, lanternX, lanternY, 40);
  lanternGlow.addColorStop(0, 'rgba(253, 224, 71, 0.65)');
  lanternGlow.addColorStop(0.4, 'rgba(245, 158, 11, 0.22)');
  lanternGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
  ctx.fillStyle = lanternGlow;
  ctx.beginPath();
  ctx.arc(lanternX, lanternY, 40, 0, Math.PI * 2);
  ctx.fill();

  // Brass Post & Lantern Frame
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(lanternX, -4);
  ctx.lineTo(lanternX, lanternY);
  ctx.stroke();

  ctx.fillStyle = '#fef08a';
  ctx.strokeStyle = '#92400e';
  ctx.beginPath();
  ctx.roundRect(lanternX - 3.5, lanternY - 7, 7, 8, 1.5);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

/** Draws Authentic Player Character with drawAvatar, Rod and Crowned Nameplate */
function drawAuthenticPlayerCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  isBite: boolean,
  appearance?: Appearance,
  name: string = 'TinAdmin',
) {
  ctx.save();
  ctx.translate(x, y);

  const breathe = Math.sin(time * 0.004) * 1;
  ctx.translate(0, breathe);

  // Render real game avatar using drawAvatar!
  const app = appearance ?? DEFAULT_APPEARANCE;
  const grid = drawAvatar(app, 2, 0); // direction 2 (facing right towards water)
  grid.drawTo(ctx, -16, -34, 2);

  // Authentic wooden fishing rod held in hands
  ctx.save();
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const rodStartX = 4;
  const rodStartY = -10;
  const rodTipX = 46;
  const rodTipY = isBite ? 6 : -4;
  ctx.moveTo(rodStartX, rodStartY);
  ctx.quadraticCurveTo(24, isBite ? 8 : -14, rodTipX, rodTipY);
  ctx.stroke();

  // Rod reel
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(8, -12, 4, 4);
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 1;
  ctx.strokeRect(8, -12, 4, 4);
  ctx.restore();

  // Purple Tag Nameplate: [👑 TinAdmin]
  ctx.save();
  const tagH = 18;
  ctx.font = 'bold 11px system-ui, sans-serif';
  const textWidth = ctx.measureText(name).width;
  const tagW = Math.max(76, textWidth + 30);
  const tagX = -tagW / 2;
  const tagY = -56;

  // Modern Purple Gradient pill badge
  const tagGrad = ctx.createLinearGradient(tagX, tagY, tagX + tagW, tagY + tagH);
  tagGrad.addColorStop(0, '#6366f1');
  tagGrad.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = tagGrad;
  ctx.beginPath();
  ctx.roundRect(tagX, tagY, tagW, tagH, 9);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Crown Icon
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.moveTo(tagX + 8, tagY + 13);
  ctx.lineTo(tagX + 6, tagY + 7);
  ctx.lineTo(tagX + 10, tagY + 9);
  ctx.lineTo(tagX + 12, tagY + 5);
  ctx.lineTo(tagX + 14, tagY + 9);
  ctx.lineTo(tagX + 18, tagY + 7);
  ctx.lineTo(tagX + 16, tagY + 13);
  ctx.closePath();
  ctx.fill();

  // Player Name Text
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(name, tagX + 22, tagY + 9.5);
  ctx.restore();

  ctx.restore();
}
