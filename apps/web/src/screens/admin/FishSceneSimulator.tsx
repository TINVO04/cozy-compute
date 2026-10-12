import {
  DEFAULT_FISHING_BEHAVIOR_CONFIG,
  SHADOW_TIER_CONFIG,
  type FishingBehaviorConfig,
  type FishShadowTier,
  type ShadowTierInfo,
} from '@cozy/game-data';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, Save, Sliders, Sparkles, Volume2, Waves, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { drawCanvasOrganicFishShadow } from '../../game/fish-shadow';
import { fishNibblePose, fishStrikePose } from '../../game/fishing-motion';
import { api } from '../../lib/api';
import { play } from '../../lib/sound';
import { useUi } from '../../lib/store';
import { Button } from '../../ui/primitives';
import type { AdminFishSpecies } from './FishAdmin';

export interface FishSceneSimulatorProps {
  selectedSpecies?: AdminFishSpecies | null;
  selectedTier?: FishShadowTier;
  allSpecies?: AdminFishSpecies[];
  onSelectSpecies?: (id: string) => void;
}

export function FishSceneSimulator({
  selectedSpecies,
  selectedTier = 6,
  allSpecies = [],
  onSelectSpecies,
}: FishSceneSimulatorProps) {
  const qc = useQueryClient();

  // Behavior configuration from server
  const behaviorQuery = useQuery({
    queryKey: ['admin-fishing-behavior'],
    queryFn: () =>
      api<{
        config: FishingBehaviorConfig;
        isOverridden: boolean;
        defaults: FishingBehaviorConfig;
      }>('/admin/fishing/behavior'),
  });

  const [behavior, setBehavior] = useState<FishingBehaviorConfig>(DEFAULT_FISHING_BEHAVIOR_CONFIG);

  useEffect(() => {
    if (behaviorQuery.data?.config) {
      setBehavior(behaviorQuery.data.config);
    }
  }, [behaviorQuery.data]);

  // Active Fish Tier Configuration for shadow sizing
  const baseTierCfg = SHADOW_TIER_CONFIG[selectedTier];
  const activeTierCfg: ShadowTierInfo = useMemo(() => {
    if (selectedSpecies) {
      return {
        tier: selectedSpecies.defaultShadowTier ?? selectedTier,
        name: baseTierCfg.name,
        label: baseTierCfg.label,
        color: baseTierCfg.color,
        lengthPx: selectedSpecies.shadowLengthPx ?? baseTierCfg.lengthPx,
        widthPx: selectedSpecies.shadowWidthPx ?? baseTierCfg.widthPx,
        swimSpeed: selectedSpecies.shadowSwimSpeed ?? baseTierCfg.swimSpeed,
        wiggleSpeed: selectedSpecies.shadowWiggleSpeed ?? baseTierCfg.wiggleSpeed,
        hasCrown: selectedSpecies.shadowHasCrown ?? baseTierCfg.hasCrown ?? false,
        hasGlow: selectedSpecies.shadowHasGlow ?? baseTierCfg.hasGlow ?? false,
      };
    }
    return baseTierCfg;
  }, [selectedSpecies, selectedTier, baseTierCfg]);

  // Simulation Timeline State
  const [sessionKey, setSessionKey] = useState<number>(1);
  const [forceBite, setForceBite] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(0.95);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Timeline generated for each demo session
  const simTimelineRef = useRef<{
    startTime: number;
    shadowAppearAt: number;
    biteAt: number;
    nibbleTimes: number[];
    playedNibbles: Set<number>;
    hasPlayedBite: boolean;
  }>({
    startTime: 0,
    shadowAppearAt: 0,
    biteAt: 0,
    nibbleTimes: [],
    playedNibbles: new Set(),
    hasPlayedBite: false,
  });

  const restartSimulation = () => {
    const now = performance.now();
    const minNib = Math.max(0, behavior.minNibbles);
    const maxNib = Math.max(minNib, behavior.maxNibbles);
    const count = minNib === maxNib ? minNib : minNib + Math.floor(Math.random() * (maxNib - minNib + 1));

    const minDelay = Math.max(500, behavior.shadowDelayMinMs);
    const maxDelay = Math.max(minDelay, behavior.shadowDelayMaxMs);
    const shadowDelay = minDelay + Math.floor(Math.random() * (maxDelay - minDelay + 1));

    const shadowAppearAt = now + shadowDelay;
    const nibbleTimes: number[] = [];
    let nextNibble = shadowAppearAt + 1200;

    const minPause = Math.max(300, behavior.nibbleIntervalMinMs);
    const maxPause = Math.max(minPause, behavior.nibbleIntervalMaxMs);

    for (let i = 0; i < count; i++) {
      nibbleTimes.push(nextNibble);
      const pause = minPause + Math.floor(Math.random() * (maxPause - minPause + 1));
      nextNibble += 420 + pause;
    }

    const biteAt = count === 0 ? shadowAppearAt + 1400 : nextNibble + 400;

    simTimelineRef.current = {
      startTime: now,
      shadowAppearAt,
      biteAt,
      nibbleTimes,
      playedNibbles: new Set(),
      hasPlayedBite: false,
    };
    setForceBite(false);
    setSessionKey((k) => k + 1);
    if (soundEnabled) play('splash');
  };

  // Restart when behavior, tier, or species changes
  useEffect(() => {
    restartSimulation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    behavior.minNibbles,
    behavior.maxNibbles,
    behavior.nibbleIntervalMinMs,
    behavior.nibbleIntervalMaxMs,
    behavior.shadowDelayMinMs,
    behavior.shadowDelayMaxMs,
    selectedSpecies?.id,
    selectedTier,
  ]);

  // Mutations
  const saveBehaviorMutation = useMutation({
    mutationFn: async (payload: FishingBehaviorConfig) => {
      return api<{ config: FishingBehaviorConfig; isOverridden: boolean }>('/admin/fishing/behavior', {
        method: 'PUT',
        body: payload,
      });
    },
    onSuccess: (data) => {
      setBehavior(data.config);
      qc.invalidateQueries({ queryKey: ['admin-fishing-behavior'] });
      qc.invalidateQueries({ queryKey: ['activities-fishing-behavior'] });
      useUi.getState().toast({
        title: 'Đã lưu cấu hình hành vi câu cá!',
        body: 'Tất cả người chơi trên server đã được cập nhật nhịp đớp mồi mới.',
        kind: 'success',
      });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Lỗi khi lưu cấu hình';
      useUi.getState().toast({
        title: 'Lưu thất bại',
        body: msg,
        kind: 'error',
      });
    },
  });

  const resetBehaviorMutation = useMutation({
    mutationFn: async () => {
      return api<{ config: FishingBehaviorConfig; isOverridden: boolean }>('/admin/fishing/behavior', {
        method: 'DELETE',
      });
    },
    onSuccess: (data) => {
      setBehavior(data.config);
      qc.invalidateQueries({ queryKey: ['admin-fishing-behavior'] });
      useUi.getState().toast({
        title: 'Đã khôi phục hành vi câu cá mặc định',
        body: 'Đã trả về cấu hình nguyên bản.',
        kind: 'info',
      });
    },
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live Canvas Rendering Loop
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Local simulation particles
    const ripples: Array<{ x: number; y: number; r: number; maxR: number; alpha: number }> = [];
    const splashes: Array<{ x: number; y: number; vx: number; vy: number; alpha: number }> = [];

    const spawnRipple = (x: number, y: number, maxRadius = 36) => {
      ripples.push({ x, y, r: 4, maxR: maxRadius, alpha: 0.85 });
    };

    const spawnSplashes = (x: number, y: number, count = 8) => {
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

    let lastRippleTime = 0;

    const render = () => {
      const cvs = canvasRef.current;
      if (!cvs) return;
      const ctx = cvs.getContext('2d');
      if (!ctx) return;

      const width = cvs.width;
      const height = cvs.height;
      const now = performance.now();
      const tl = simTimelineRef.current;

      const isBite = forceBite || (tl.biteAt > 0 && now >= tl.biteAt);
      if (isBite && !tl.hasPlayedBite) {
        tl.hasPlayedBite = true;
        if (soundEnabled) {
          play('bite');
          play('splash');
        }
        spawnSplashes(width * 0.62, height * 0.54, 14);
        spawnRipple(width * 0.62, height * 0.54, 48);
      }

      // 1. Water Background Gradient (Deep Ocean Night)
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#0a1d33');
      grad.addColorStop(0.5, '#071526');
      grad.addColorStop(1, '#030a13');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Warm boat lantern glow radiating on dark water
      const lanternGlow = ctx.createRadialGradient(
        width * 0.28,
        height * 0.52,
        20,
        width * 0.28,
        height * 0.52,
        280,
      );
      lanternGlow.addColorStop(0, 'rgba(251, 191, 36, 0.22)');
      lanternGlow.addColorStop(0.4, 'rgba(245, 158, 11, 0.08)');
      lanternGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = lanternGlow;
      ctx.fillRect(0, 0, width, height);

      // Subtle water ripple scanlines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      for (let y = 0; y < height; y += 18) {
        const drift = Math.sin((y + now * 0.03) * 0.05) * 4;
        ctx.beginPath();
        ctx.moveTo(0, y + drift);
        ctx.lineTo(width, y + drift);
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-width / 2, -height / 2);

      // Scene Reference Points:
      // Boat & Character anchor: Left side of screen
      const boatX = width * 0.22;
      const boatY = height * 0.56;
      const charX = boatX + 38;
      const charY = boatY - 26;

      // Bobber anchor: In open water towards center-right
      const bobberX = width * 0.62;
      let bobberY = height * 0.54 + Math.sin(now * 0.004) * 2;
      let isBobberNibble = false;

      // 2. Draw 2D Pixel Boat
      drawPixelSteamboat(ctx, boatX, boatY, now);

      // 3. Draw Character "TinAdmin" with purple nameplate & crown
      drawTinAdminCharacter(ctx, charX, charY, now, isBite);

      // Rod Tip Position
      const rodTipX = charX + 54;
      const rodTipY = charY - (isBite ? 6 : 14) + Math.sin(now * 0.003) * 1.5;

      // Check Nibble Strikes
      let activeNibbleIdx = -1;
      let isRecoil = false;
      for (let i = 0; i < tl.nibbleTimes.length; i++) {
        const nt = tl.nibbleTimes[i]!;
        if (now >= nt) {
          activeNibbleIdx = i;
          if (now < nt + 420 && !tl.playedNibbles.has(i)) {
            tl.playedNibbles.add(i);
            isBobberNibble = true;
            if (soundEnabled) play('nibble');
            spawnRipple(bobberX, bobberY, 28);
            spawnSplashes(bobberX, bobberY, 5);
          }
        } else {
          break;
        }
      }

      if (isBobberNibble || (activeNibbleIdx >= 0 && now < (tl.nibbleTimes[activeNibbleIdx] ?? 0) + 240)) {
        bobberY += (Math.random() - 0.5) * 6;
      }

      // Periodical idle water ripples under bobber
      if (now - lastRippleTime > 1600 && !isBite) {
        lastRippleTime = now;
        spawnRipple(bobberX, bobberY, 26);
      }

      // 4. Update and Draw Water Ripples
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

      // 5. Update and Draw Water Splashes
      for (let i = splashes.length - 1; i >= 0; i--) {
        const sp = splashes[i]!;
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vy += 0.15; // gravity
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

      // 6. Draw Fishing Line (parabolic curve from rod tip to bobber)
      ctx.strokeStyle = isBite ? 'rgba(255, 255, 255, 0.95)' : 'rgba(241, 245, 249, 0.7)';
      ctx.lineWidth = 1;
      const sag = isBite ? -2 : 6 + Math.sin(now * 0.003) * 2;
      const midX = (rodTipX + bobberX) / 2;
      const midY = (rodTipY + bobberY) / 2 + sag;
      ctx.beginPath();
      ctx.moveTo(rodTipX, rodTipY);
      ctx.quadraticCurveTo(midX, midY, bobberX, bobberY - 6);
      ctx.stroke();

      // 7. Draw Bobber (Red top, white bottom, yellow antenna)
      ctx.save();
      ctx.translate(bobberX, bobberY);
      // Bobber Shadow in water
      ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 9, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Red top hemisphere
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, 6, Math.PI, 0, false);
      ctx.closePath();
      ctx.fill();

      // White bottom hemisphere
      ctx.fillStyle = '#f8fafc';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI, false);
      ctx.closePath();
      ctx.fill();

      // Thin outline
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.stroke();

      // Antenna
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-1, -11, 2, 6);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, -11, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 8. Draw BITE Exclamation Mark (!) when bitten
      if (isBite) {
        const bounce = Math.sin(now * 0.02) * 5;
        const exY = bobberY - 32 + bounce;

        ctx.save();
        ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.beginPath();
        ctx.arc(bobberX, exY, 15, 0, Math.PI * 2);
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

      // 9. In-Water Fish Shadow Movement Logic
      const shadowAppearAt = tl.shadowAppearAt;
      const retreatDist = behavior.retreatDistancePx ?? 80;
      const dashSpeed = behavior.dashSpeedFactor ?? 1.4;
      const strikeLeadMs = Math.max(120, Math.round(200 / dashSpeed));
      const approachAngle = 0.25; // Fish emerges from bottom-right water facing float

      if (now >= shadowAppearAt || isBite) {
        const fadeProgress = Math.min(1, Math.max(0.1, (now - shadowAppearAt) / 600));
        let fishX = bobberX + Math.cos(approachAngle) * retreatDist;
        let fishY = bobberY + Math.sin(approachAngle) * retreatDist;
        let fishAngle = approachAngle + Math.PI;

        if (isBite) {
          // Thrashing on bobber
          const thrash = Math.sin(now * 0.04 * activeTierCfg.wiggleSpeed) * 8;
          fishX = bobberX + Math.cos(now * 0.02) * 6;
          fishY = bobberY + 6 + thrash;
          fishAngle = Math.atan2(bobberY - fishY, bobberX - fishX);
        } else if (tl.nibbleTimes.length === 0) {
          // 0 nibbles: instant bite strike
          const timeUntilBite = tl.biteAt - now;
          if (timeUntilBite <= strikeLeadMs && timeUntilBite > 0) {
            const elapsedStrike = strikeLeadMs - timeUntilBite;
            const pose = fishStrikePose(elapsedStrike, strikeLeadMs, approachAngle, retreatDist);
            fishX = bobberX + pose.x;
            fishY = bobberY + pose.y;
            fishAngle = pose.angle;
          } else {
            const sway = Math.sin(now * 0.004 * activeTierCfg.swimSpeed) * 3;
            fishX = bobberX + Math.cos(approachAngle) * (retreatDist + sway);
            fishY = bobberY + Math.sin(approachAngle) * (retreatDist + sway);
            fishAngle = approachAngle + Math.PI;
          }
        } else {
          // Nibbling cycle
          if (activeNibbleIdx >= 0) {
            const nibbleAt = tl.nibbleTimes[activeNibbleIdx]!;
            const nextStrikeAt = tl.nibbleTimes[activeNibbleIdx + 1] ?? tl.biteAt;

            // Right before biteAt: direct strike
            if (activeNibbleIdx === tl.nibbleTimes.length - 1 && tl.biteAt - now <= strikeLeadMs) {
              const elapsedStrike = strikeLeadMs - (tl.biteAt - now);
              const pose = fishStrikePose(elapsedStrike, strikeLeadMs, approachAngle, retreatDist);
              fishX = bobberX + pose.x;
              fishY = bobberY + pose.y;
              fishAngle = pose.angle;
            } else {
              const pose = fishNibblePose(now - nibbleAt, nextStrikeAt - nibbleAt - 420, approachAngle, {
                retreatDistancePx: retreatDist,
                dashSpeedFactor: dashSpeed,
              });
              fishX = bobberX + pose.x;
              fishY = bobberY + pose.y;
              fishAngle = pose.angle;
              isRecoil = pose.isRecoil;
            }
          } else {
            // Approaching and hovering at retreat position
            const approachDuration = Math.max(
              1,
              (tl.nibbleTimes[0] ?? shadowAppearAt + 1200) - shadowAppearAt,
            );
            const t = Math.min(1, Math.max(0, (now - shadowAppearAt) / approachDuration));
            const ease = 1 - Math.pow(1 - t, 3);
            const startX = bobberX + Math.cos(approachAngle) * (retreatDist + 70);
            const startY = bobberY + Math.sin(approachAngle) * (retreatDist + 70);
            const targetX = bobberX + Math.cos(approachAngle) * retreatDist;
            const targetY = bobberY + Math.sin(approachAngle) * retreatDist;

            fishX = startX + (targetX - startX) * ease;
            fishY = startY + (targetY - startY) * ease;
            fishAngle = Math.atan2(bobberY - fishY, bobberX - fishX);
          }
        }

        // Draw Organic Fish Shadow
        drawCanvasOrganicFishShadow(
          ctx,
          fishX,
          fishY,
          fishAngle,
          now,
          activeTierCfg,
          fadeProgress,
          isBite,
          isRecoil,
        );
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [sessionKey, forceBite, zoom, soundEnabled, behavior, activeTierCfg]);

  return (
    <div className="flex flex-col xl:flex-row gap-6 p-1">
      {/* LEFT: Canvas Scene Simulator Window */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        <div className="relative rounded-2xl overflow-hidden border border-sky-900/40 bg-slate-950 shadow-2xl">
          {/* Header Bar inside simulator */}
          <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2 pointer-events-auto bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-sky-800/40 shadow-lg text-xs font-semibold text-sky-200">
              <Waves className="w-4 h-4 text-sky-400 animate-pulse" />
              <span>Mô Phỏng Thuyền & Phao (Play Together Scene)</span>
            </div>

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
                <Volume2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.4, Math.max(0.6, z === 0.95 ? 1.15 : 0.95)))}
                className="px-2.5 py-1.5 rounded-xl border border-sky-800/40 bg-slate-950/80 backdrop-blur-md text-xs font-medium text-sky-300 hover:text-white"
              >
                Zoom: {Math.round(zoom * 100)}%
              </button>
            </div>
          </div>

          {/* Live Canvas Element */}
          <canvas
            ref={canvasRef}
            width={860}
            height={520}
            className="w-full h-auto block max-h-[560px] object-contain bg-slate-950"
          />

          {/* Quick Simulation Action Overlay */}
          <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            <div className="flex items-center gap-2 pointer-events-auto bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-sky-800/40 text-xs">
              <span className="text-slate-400">Đang chiếu:</span>
              <span className="font-bold text-amber-300">
                {selectedSpecies ? selectedSpecies.name : `Bóng Cấp ${selectedTier}`}
              </span>
              <span className="text-sky-300 font-mono text-[11px]">
                ({activeTierCfg.lengthPx}x{activeTierCfg.widthPx}px)
              </span>
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
              <Button
                variant="secondary"
                size="sm"
                onClick={restartSimulation}
                className="bg-slate-900/90 border-sky-700/50 text-sky-200 hover:bg-sky-900/60 gap-1.5 shadow-lg"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Thả Câu Lại (Replay)
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setForceBite(true);
                  if (soundEnabled) {
                    play('bite');
                    play('splash');
                  }
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold gap-1.5 shadow-lg shadow-rose-900/40"
              >
                <Zap className="w-3.5 h-3.5" />
                Cắn Câu Ngay (Bite!)
              </Button>
            </div>
          </div>
        </div>

        {/* Species Quick Selector Bar */}
        {allSpecies.length > 0 && onSelectSpecies && (
          <div className="flex items-center gap-2 overflow-x-auto py-2 px-1 scrollbar-thin">
            <span className="text-xs font-semibold text-slate-400 shrink-0">Chọn nhanh cá:</span>
            {allSpecies.slice(0, 10).map((sp) => (
              <button
                key={sp.id}
                type="button"
                onClick={() => onSelectSpecies(sp.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all border ${
                  selectedSpecies?.id === sp.id
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                {sp.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT: Admin Tuning Sliders & Configuration Controls */}
      <div className="w-full xl:w-96 flex flex-col gap-4 bg-slate-900/80 border border-sky-900/40 p-4 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-sky-900/30 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-400" />
            <h3 className="font-bold text-sm text-sky-100">Bảng Điều Khiển Nhịp Đớp Mồi</h3>
          </div>
          {behaviorQuery.data?.isOverridden && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Đã tùy biến
            </span>
          )}
        </div>

        {/* Behavior Form Controls */}
        <div className="space-y-4 text-xs">
          {/* 1. Nibbles Min & Max */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sky-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Số Lần Đớp Nhử (Nibble Count)
              </span>
              <span className="text-amber-300 font-mono font-bold">
                {behavior.minNibbles} - {behavior.maxNibbles} lần
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Nếu đặt <strong>Min = 0</strong>, cá có xác suất{' '}
              <span className="text-rose-400 font-medium">đớp mồi luôn một phát</span> mà không cần nhử!
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  Tối thiểu (Min): {behavior.minNibbles}
                </label>
                <input
                  type="range"
                  min={0}
                  max={behavior.maxNibbles}
                  step={1}
                  value={behavior.minNibbles}
                  onChange={(e) => setBehavior((prev) => ({ ...prev, minNibbles: Number(e.target.value) }))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  Tối đa (Max): {behavior.maxNibbles}
                </label>
                <input
                  type="range"
                  min={behavior.minNibbles}
                  max={10}
                  step={1}
                  value={behavior.maxNibbles}
                  onChange={(e) => setBehavior((prev) => ({ ...prev, maxNibbles: Number(e.target.value) }))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 2. Nibble Interval (ms) */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sky-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                Khoảng Cách Thời Gian Giữa Các Lần Nhử
              </span>
              <span className="text-cyan-300 font-mono font-bold">
                {(behavior.nibbleIntervalMinMs / 1000).toFixed(1)}s -{' '}
                {(behavior.nibbleIntervalMaxMs / 1000).toFixed(1)}s
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  Nhanh nhất: {behavior.nibbleIntervalMinMs}ms
                </label>
                <input
                  type="range"
                  min={300}
                  max={behavior.nibbleIntervalMaxMs}
                  step={100}
                  value={behavior.nibbleIntervalMinMs}
                  onChange={(e) =>
                    setBehavior((prev) => ({ ...prev, nibbleIntervalMinMs: Number(e.target.value) }))
                  }
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  Chậm nhất: {behavior.nibbleIntervalMaxMs}ms
                </label>
                <input
                  type="range"
                  min={behavior.nibbleIntervalMinMs}
                  max={6000}
                  step={100}
                  value={behavior.nibbleIntervalMaxMs}
                  onChange={(e) =>
                    setBehavior((prev) => ({ ...prev, nibbleIntervalMaxMs: Number(e.target.value) }))
                  }
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 3. Shadow Wait Delay */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sky-200 flex items-center gap-1.5">
                <Waves className="w-3.5 h-3.5 text-blue-400" />
                Thời Gian Chờ Bóng Cá Xuất Hiện
              </span>
              <span className="text-blue-300 font-mono font-bold">
                {(behavior.shadowDelayMinMs / 1000).toFixed(1)}s -{' '}
                {(behavior.shadowDelayMaxMs / 1000).toFixed(1)}s
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  Tối thiểu: {(behavior.shadowDelayMinMs / 1000).toFixed(1)}s
                </label>
                <input
                  type="range"
                  min={500}
                  max={behavior.shadowDelayMaxMs}
                  step={500}
                  value={behavior.shadowDelayMinMs}
                  onChange={(e) =>
                    setBehavior((prev) => ({ ...prev, shadowDelayMinMs: Number(e.target.value) }))
                  }
                  className="w-full accent-blue-400 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">
                  Tối đa: {(behavior.shadowDelayMinMs / 1000).toFixed(1)}s
                </label>
                <input
                  type="range"
                  min={behavior.shadowDelayMinMs}
                  max={20000}
                  step={500}
                  value={behavior.shadowDelayMaxMs}
                  onChange={(e) =>
                    setBehavior((prev) => ({ ...prev, shadowDelayMaxMs: Number(e.target.value) }))
                  }
                  className="w-full accent-blue-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 4. Distance & Dash Speed */}
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sky-200">Khoảng Cách Bơi Ra Xa Rình Phao:</span>
                <span className="text-emerald-300 font-mono font-bold">{behavior.retreatDistancePx}px</span>
              </div>
              <input
                type="range"
                min={40}
                max={180}
                step={5}
                value={behavior.retreatDistancePx}
                onChange={(e) =>
                  setBehavior((prev) => ({ ...prev, retreatDistancePx: Number(e.target.value) }))
                }
                className="w-full accent-emerald-400 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">
                Cá sẽ bơi ra xa ở khoảng cách này rồi lao nhanh vào phao đớp, sau đó lùi lại.
              </p>
            </div>

            <div className="pt-1 border-t border-slate-800/60">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-sky-200">Tốc Độ Lao Tới Đớp Mồi:</span>
                <span className="text-rose-300 font-mono font-bold">
                  {behavior.dashSpeedFactor.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={3.5}
                step={0.1}
                value={behavior.dashSpeedFactor}
                onChange={(e) =>
                  setBehavior((prev) => ({ ...prev, dashSpeedFactor: Number(e.target.value) }))
                }
                className="w-full accent-rose-400 cursor-pointer"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">
                Càng cao, cá lao vụt tới phao càng nhanh và dứt khoát.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col gap-2">
          <Button
            onClick={() => saveBehaviorMutation.mutate(behavior)}
            disabled={saveBehaviorMutation.isPending}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-emerald-950/50 gap-2"
          >
            <Save className="w-4 h-4" />
            Lưu Cấu Hình Vào Server
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => resetBehaviorMutation.mutate()}
            disabled={resetBehaviorMutation.isPending}
            className="w-full border-slate-700 bg-slate-900/60 text-slate-300 hover:bg-slate-800 gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Khôi Phục Mặc Định Gốc
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Canvas Artists

/** Draws 2D Pixel Boat like in the reference screenshot */
function drawPixelSteamboat(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  ctx.save();
  ctx.translate(x, y);

  // Boat bobbing on water
  const bob = Math.sin(time * 0.003) * 1.5;
  ctx.translate(0, bob);

  // Hull Shadow in Water
  ctx.fillStyle = 'rgba(2, 6, 23, 0.55)';
  ctx.beginPath();
  ctx.ellipse(2, 14, 52, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Boat Hull - White / Cream Steamboat Body
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-45, -2);
  ctx.lineTo(40, -2);
  ctx.lineTo(48, 4);
  ctx.lineTo(36, 14);
  ctx.lineTo(-40, 14);
  ctx.lineTo(-48, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Red accent line on hull
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-44, 2, 88, 3);

  // Wooden deck planking
  ctx.fillStyle = '#d97706';
  ctx.fillRect(-38, -6, 74, 4);
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 1;
  ctx.strokeRect(-38, -6, 74, 4);

  // Cabin / Wheelhouse
  ctx.fillStyle = '#f1f5f9';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.5;
  ctx.fillRect(-22, -26, 32, 20);
  ctx.strokeRect(-22, -26, 32, 20);

  // Cabin window (cyan tint glass)
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(-16, -22, 10, 8);
  ctx.strokeRect(-16, -22, 10, 8);

  // Smokestack / Chimney
  ctx.fillStyle = '#475569';
  ctx.fillRect(-4, -36, 8, 12);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(-4, -38, 8, 3);

  // Little smoke puff
  const smokePuff = Math.sin(time * 0.006) * 3;
  ctx.fillStyle = 'rgba(241, 245, 249, 0.4)';
  ctx.beginPath();
  ctx.arc(-2 + smokePuff, -44 - ((time * 0.02) % 16), 4, 0, Math.PI * 2);
  ctx.fill();

  // Golden Lantern at prow
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(44, -3, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}

/** Draws "TinAdmin" Character with Rod and Purple Nameplate */
function drawTinAdminCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  isBite: boolean,
) {
  ctx.save();
  ctx.translate(x, y);

  // Character breathing
  const breathe = Math.sin(time * 0.004) * 1;
  ctx.translate(0, breathe);

  // Character Body (cute cozy pixel avatar)
  // Legs
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-5, 8, 4, 10);
  ctx.fillRect(1, 8, 4, 10);

  // Torso / Jacket
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(-8, -4, 16, 13);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1;
  ctx.strokeRect(-8, -4, 16, 13);

  // Head / Face
  ctx.fillStyle = '#fed7aa';
  ctx.fillRect(-7, -19, 14, 15);
  ctx.strokeRect(-7, -19, 14, 15);

  // Dark hair / Cap
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-8, -23, 16, 6);
  ctx.fillRect(4, -20, 4, 4);

  // Eyes facing right (towards water)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(2, -14, 2, 3);

  // Hands holding Fishing Rod forward
  ctx.fillStyle = '#fed7aa';
  ctx.fillRect(6, 2, 4, 4);

  // Fishing Rod
  ctx.save();
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(4, 4);
  const rodCurve = isBite ? 16 : 8;
  ctx.quadraticCurveTo(34, -4 + rodCurve * 0.35, 54, isBite ? 12 : 2);
  ctx.stroke();

  // Rod reel
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(8, 2, 4, 4);
  ctx.restore();

  // Purple Tag Nameplate: [👑 TinAdmin]
  ctx.save();
  const nameY = -34;
  const tagW = 74;
  const tagH = 17;
  const tagX = -tagW / 2;

  // Background rounded rect with purple gradient
  const tagGrad = ctx.createLinearGradient(tagX, nameY, tagX + tagW, nameY);
  tagGrad.addColorStop(0, '#7e22ce');
  tagGrad.addColorStop(1, '#a855f7');
  ctx.fillStyle = tagGrad;
  ctx.beginPath();
  ctx.roundRect(tagX, nameY, tagW, tagH, 5);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Crown Icon
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.moveTo(tagX + 7, nameY + 12);
  ctx.lineTo(tagX + 5, nameY + 6);
  ctx.lineTo(tagX + 9, nameY + 8);
  ctx.lineTo(tagX + 11, nameY + 4);
  ctx.lineTo(tagX + 13, nameY + 8);
  ctx.lineTo(tagX + 17, nameY + 6);
  ctx.lineTo(tagX + 15, nameY + 12);
  ctx.closePath();
  ctx.fill();

  // Text "TinAdmin"
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 9.5px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('TinAdmin', tagX + 21, nameY + 12);
  ctx.restore();

  ctx.restore();
}
