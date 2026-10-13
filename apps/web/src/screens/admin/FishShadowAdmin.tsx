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

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Header & Primary Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-sky-900/40 bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950/40 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-400/30 text-sky-400">
            <FishIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Studio Quản Trị Kích Thước Bóng Cá
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
                Chuẩn 6 Bậc (Tier 1 - 6)
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tinh chỉnh chiều dài, chiều rộng, vương miện và hiệu ứng bơi lội với khung xem trước thực tế
              trong hồ nước.
            </p>
          </div>
        </div>

        {/* Global Save / Reset Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            loading={resetAllMutation.isPending}
            onClick={() => resetAllMutation.mutate()}
            className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-rose-900/40 gap-1.5 text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Khôi Phục Gốc
          </Button>

          <Button
            variant="primary"
            size="sm"
            loading={saveAllMutation.isPending}
            onClick={() => saveAllMutation.mutate()}
            className="bg-sky-600 hover:bg-sky-500 text-white font-bold gap-1.5 shadow-lg shadow-sky-950/50 text-xs px-3.5"
          >
            <Save className="w-3.5 h-3.5" /> Lưu Cấu Hình Toàn Server
          </Button>
        </div>
      </div>

      {/* 2. Primary Feature Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('tiers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
            activeTab === 'tiers'
              ? 'bg-sky-500/20 border-sky-400 text-sky-200 shadow-md shadow-sky-950/40'
              : 'bg-slate-900/40 border-transparent text-slate-400 hover:text-white hover:border-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4 text-sky-400" />
          🌟 Cấu Hình 6 Bậc Chuẩn (Tier 1 - Tier 6)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('species')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
            activeTab === 'species'
              ? 'bg-sky-500/20 border-sky-400 text-sky-200 shadow-md shadow-sky-950/40'
              : 'bg-slate-900/40 border-transparent text-slate-400 hover:text-white hover:border-slate-800'
          }`}
        >
          <FishIcon className="w-4 h-4 text-emerald-400" />
          🐟 Tùy Chỉnh Theo Từng Loài Cá Cụ Thể ({allFish.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('behavior')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
            activeTab === 'behavior'
              ? 'bg-sky-500/20 border-sky-400 text-sky-200 shadow-md shadow-sky-950/40'
              : 'bg-slate-900/40 border-transparent text-slate-400 hover:text-white hover:border-slate-800'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-400" />
          ⏱️ Tinh Chỉnh Nhịp Đớp & Thời Gian Chờ (Bite Timing)
        </button>
      </div>

      {/* 3. TAB 1: 6-TIER MASTER STUDIO */}
      {activeTab === 'tiers' && (
        <div className="flex flex-col xl:flex-row gap-5 items-start">
          {/* LEFT: Tier Selector & Precision Slider Controls */}
          <div className="w-full xl:w-[440px] flex flex-col gap-4 shrink-0">
            {/* Tier Navigation Cards (1 to 6) */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-lg backdrop-blur-md">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                Chọn Cấp Bóng Cá Để Tinh Chỉnh:
              </span>

              <div className="grid grid-cols-2 gap-2">
                {([1, 2, 3, 4, 5, 6] as const).map((t) => {
                  const data = localTiers[t] ?? SHADOW_TIER_CONFIG[t];
                  const meta = TIER_METADATA[t];
                  const isSel = selectedTier === t;

                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        play('click');
                        setSelectedTier(t);
                      }}
                      className={`flex flex-col text-left p-2.5 rounded-xl border transition-all relative ${
                        isSel
                          ? 'bg-sky-950/50 border-sky-400 shadow-md shadow-sky-950/50'
                          : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="text-xs font-bold flex items-center gap-1"
                          style={{ color: meta.badgeColor }}
                        >
                          Cấp {t} {data.hasCrown && '👑'}
                        </span>
                        <span className="text-[11px] font-mono text-slate-300 font-semibold">
                          {data.lengthPx}×{data.widthPx}px
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 truncate mt-0.5">{data.name}</span>
                      {data.isOverridden && (
                        <span className="text-[9px] font-semibold text-amber-400 mt-1">● Đã chỉnh</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Precision Controls for Selected Tier */}
            <div className="bg-slate-900/80 border border-sky-900/40 rounded-2xl p-4 flex flex-col gap-4 shadow-xl backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    Cấp {selectedTier}: {currentTierData.name}
                    {currentTierData.hasCrown && <Crown className="w-4 h-4 text-amber-400" />}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Gốc: {currentTierData.defaultLengthPx} × {currentTierData.defaultWidthPx} px
                  </span>
                </div>

                {/* Aspect Ratio Lock Toggle */}
                <button
                  type="button"
                  onClick={() => setLockAspectRatio((l) => !l)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    lockAspectRatio
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400'
                  }`}
                  title={lockAspectRatio ? 'Đang khóa tỷ lệ dài/rộng' : 'Tự do kéo dài/rộng độc lập'}
                >
                  {lockAspectRatio ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span>{lockAspectRatio ? 'Khóa Tỉ Lệ' : 'Tự Do'}</span>
                </button>
              </div>

              {/* Quick Multipliers Bar */}
              <div className="flex items-center justify-between gap-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800/60">
                <span className="text-[10px] font-semibold text-slate-400 px-1">Nhân nhanh:</span>
                {[1.0, 1.25, 1.5, 2.0, 3.0].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => applyMultiplier(selectedTier, m)}
                    className="flex-1 py-1 rounded-lg text-[11px] font-bold text-slate-300 hover:text-sky-300 hover:bg-sky-950/40 transition-all border border-transparent hover:border-sky-800/40"
                  >
                    {m === 1.0 ? '1x' : `${m}x`}
                  </button>
                ))}
              </div>

              {/* Length Control */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-300">Chiều Dài Bóng Cá (Length):</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={5}
                      max={3000}
                      value={currentTierData.lengthPx}
                      onChange={(e) =>
                        updateTier(selectedTier, { lengthPx: Math.max(5, Number(e.target.value) || 5) })
                      }
                      className="w-20 text-right font-mono font-bold text-sky-300 bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-xs focus:outline-none focus:border-sky-400"
                    />
                    <span className="text-slate-400 text-[11px]">px</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={10}
                  max={Math.max(1200, currentTierData.lengthPx * 1.5)}
                  value={currentTierData.lengthPx}
                  onChange={(e) => updateTier(selectedTier, { lengthPx: Number(e.target.value) })}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              {/* Width Control */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-300">Chiều Rộng Bóng Cá (Width):</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={2}
                      max={1200}
                      value={currentTierData.widthPx}
                      onChange={(e) =>
                        updateTier(selectedTier, { widthPx: Math.max(2, Number(e.target.value) || 2) })
                      }
                      className="w-20 text-right font-mono font-bold text-sky-300 bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-xs focus:outline-none focus:border-sky-400"
                    />
                    <span className="text-slate-400 text-[11px]">px</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={5}
                  max={Math.max(500, currentTierData.widthPx * 1.5)}
                  value={currentTierData.widthPx}
                  onChange={(e) => updateTier(selectedTier, { widthPx: Number(e.target.value) })}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              {/* Visual Toggles: Crown & Glow */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                <label
                  className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                    currentTierData.hasCrown
                      ? 'bg-amber-950/30 border-amber-500/50 text-amber-200'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={currentTierData.hasCrown ?? false}
                    onChange={(e) => updateTier(selectedTier, { hasCrown: e.target.checked })}
                    className="accent-amber-400"
                  />
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold">Vương Miện Vàng</span>
                </label>

                <label
                  className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                    currentTierData.hasGlow
                      ? 'bg-sky-950/30 border-sky-500/50 text-sky-200'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={currentTierData.hasGlow ?? false}
                    onChange={(e) => updateTier(selectedTier, { hasGlow: e.target.checked })}
                    className="accent-sky-400"
                  />
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-bold">Quầng Sáng Thần Bí</span>
                </label>
              </div>

              {/* Swimming Physics: Swim Speed & Wiggle */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-xs">
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Tốc độ bơi:</span>
                    <span className="font-bold text-sky-300 font-mono">
                      {currentTierData.swimSpeed.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={2.5}
                    step={0.05}
                    value={currentTierData.swimSpeed}
                    onChange={(e) => updateTier(selectedTier, { swimSpeed: Number(e.target.value) })}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Quẫy đuôi:</span>
                    <span className="font-bold text-sky-300 font-mono">
                      {currentTierData.wiggleSpeed.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.2}
                    max={3.0}
                    step={0.05}
                    value={currentTierData.wiggleSpeed}
                    onChange={(e) => updateTier(selectedTier, { wiggleSpeed: Number(e.target.value) })}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Presets Toolbar */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 font-semibold">Cài đặt mẫu:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyPreset('default')}
                    className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Chuẩn gốc
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('distinct')}
                    className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-sky-900/60 text-sky-200 border border-sky-700/50 hover:bg-sky-900"
                  >
                    Bậc rõ rệt
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('giant2x')}
                    className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-purple-900/60 text-purple-200 border border-purple-700/50 hover:bg-purple-900"
                  >
                    Khổng lồ 2x
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Live Master Viewport & Dual Mode Studio */}
          <div className="flex-1 flex flex-col gap-3 min-w-0 w-full">
            <div className="relative rounded-2xl overflow-hidden border border-sky-900/40 bg-slate-950 shadow-2xl">
              {/* Top Viewport Toolbar */}
              <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
                {/* View Mode Switcher */}
                <div className="flex items-center gap-1 p-1 bg-slate-950/85 backdrop-blur-md rounded-xl border border-sky-800/40 pointer-events-auto shadow-lg">
                  <button
                    type="button"
                    onClick={() => setViewMode('scene')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      viewMode === 'scene'
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Waves className="w-3.5 h-3.5" />
                    Cảnh Hồ Nước Thực Tế
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('matrix')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      viewMode === 'matrix'
                        ? 'bg-sky-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Ruler className="w-3.5 h-3.5" />
                    So Sánh Cả 6 Bậc
                  </button>
                </div>

                {/* Zoom & Audio Controls */}
                <div className="flex items-center gap-2 pointer-events-auto">
                  <button
                    type="button"
                    onClick={() => setSoundEnabled((v) => !v)}
                    className={`p-2 rounded-xl border backdrop-blur-md transition-all ${
                      soundEnabled
                        ? 'bg-sky-900/60 border-sky-600/50 text-sky-200 shadow-md'
                        : 'bg-slate-900/60 border-slate-700/50 text-slate-400'
                    }`}
                    title="Bật/Tắt âm thanh"
                  >
                    {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>

                  {/* Zoom Pills */}
                  <div className="flex items-center gap-1 bg-slate-950/85 backdrop-blur-md p-1 rounded-xl border border-sky-800/40">
                    {[1.0, 0.85, 0.5, 0.25].map((z) => (
                      <button
                        key={z}
                        type="button"
                        onClick={() => setZoom(z)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                          zoom === z ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {Math.round(z * 100)}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Canvas Element */}
              <canvas
                ref={canvasRef}
                width={860}
                height={520}
                className="w-full h-auto block max-h-[560px] object-contain bg-slate-950"
              />

              {/* Bottom Interactive Simulation Toolbar */}
              <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
                {/* Active Tier Stats Badge */}
                <div className="flex items-center gap-2 pointer-events-auto bg-slate-950/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-sky-800/40 text-xs shadow-lg">
                  <span className="text-slate-400">Đang chiếu:</span>
                  <span className="font-bold" style={{ color: currentMeta.badgeColor }}>
                    Cấp {selectedTier} ({currentTierData.name})
                  </span>
                  <span className="text-sky-300 font-mono text-[11px] font-bold">
                    {currentTierData.lengthPx} × {currentTierData.widthPx} px
                  </span>
                  {currentTierData.hasCrown && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                      👑 VƯƠNG MIỆN
                    </span>
                  )}
                </div>

                {/* Scene Interaction Buttons */}
                {viewMode === 'scene' && (
                  <div className="flex items-center gap-2 pointer-events-auto">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={restartCast}
                      className="bg-slate-900/90 border-sky-700/50 text-sky-200 hover:bg-sky-900/60 gap-1.5 shadow-lg text-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Thả Câu Lại
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setTestAction((a) => (a === 'nibble' ? 'normal' : 'nibble'))}
                      className={`text-xs gap-1.5 shadow-lg ${
                        testAction === 'nibble'
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                          : 'bg-slate-900/90 border-sky-700/50 text-sky-200 hover:bg-sky-900/60'
                      }`}
                    >
                      {testAction === 'nibble' ? 'Đang Rỉa Mồi...' : 'Thử Rỉa Mồi'}
                    </Button>

                    <Button
                      size="sm"
                      onClick={triggerInstantBite}
                      className="bg-rose-600 hover:bg-rose-500 text-white font-bold gap-1.5 shadow-lg shadow-rose-900/40 text-xs"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Cắn Câu Ngay (Bite!)
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Hint Box */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400">
              <span className="text-sky-400 font-bold">💡 Mẹo:</span>
              <span>
                Nhấp nút <strong>So Sánh Cả 6 Bậc</strong> ở góc trên bên trái khung nhìn để đối chiếu kích
                thước cả 6 loại bóng cá trên cùng thước đo pixel chuẩn.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 2: PER-FISH SPECIES STUDIO */}
      {activeTab === 'species' && (
        <div className="flex flex-col gap-4">
          {/* Species Search and Filter Bar */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-slate-900/70 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center gap-2 flex-1 min-w-[280px]">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm loài cá (ví dụ: Cá Hề, Cá Voi Xanh, clownfish)..."
                value={fishSearch}
                onChange={(e) => setFishSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-white w-full placeholder:text-slate-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFishStatusFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                  fishStatusFilter === 'all'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Tất cả ({allFish.length})
              </button>
              <button
                type="button"
                onClick={() => setFishStatusFilter('custom')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                  fishStatusFilter === 'custom'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Bóng riêng ({allFish.filter((f) => f.isShadowOverridden).length})
              </button>
              <button
                type="button"
                onClick={() => setFishStatusFilter('default')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                  fishStatusFilter === 'default'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Chuẩn theo bậc ({allFish.filter((f) => !f.isShadowOverridden).length})
              </button>
            </div>
          </div>

          {/* Quick Species Selection Strip */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
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
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border whitespace-nowrap shrink-0 transition-all ${
                    isSelected
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200 shadow-md'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <img
                    src={fishIcon(f.id, 2)}
                    alt=""
                    style={{ width: 28, height: 22, objectFit: 'contain' }}
                  />
                  <span className="text-xs font-semibold">{f.name}</span>
                  {f.isShadowOverridden && (
                    <span className="bg-indigo-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
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
            <div className="text-center p-12 text-slate-500 text-sm">
              Không tìm thấy loài cá nào phù hợp với từ khóa tìm kiếm.
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 3: BITE TIMING & BEHAVIOR */}
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
