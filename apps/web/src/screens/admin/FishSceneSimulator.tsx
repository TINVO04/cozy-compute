import {
  DEFAULT_APPEARANCE,
  DEFAULT_FISHING_BEHAVIOR_CONFIG,
  SHADOW_TIER_CONFIG,
  type Appearance,
  type FishingBehaviorConfig,
  type FishShadowTier,
  type ShadowTierInfo,
} from '@cozy/game-data';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, Save, Sliders, Sparkles, Volume2, Waves, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { drawAvatar } from '../../art/avatar';
import { drawCanvasOrganicFishShadow } from '../../game/fish-shadow';
import { fishNibblePose, fishStrikePose } from '../../game/fishing-motion';
import { api, type Me } from '../../lib/api';
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

  // Current logged in user appearance and name
  const meQuery = useQuery<Me>({
    queryKey: ['me'],
    queryFn: () => api<Me>('/me'),
  });

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
        spawnSplashes(width * 0.62, height * 0.54, 16);
        spawnRipple(width * 0.62, height * 0.54, 52);
      }

      // 1. Water Background Gradient (Deep Ocean Night with atmospheric depth)
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#071d2b');
      grad.addColorStop(0.5, '#051622');
      grad.addColorStop(1, '#020b12');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Warm boat lantern glow radiating on dark water
      const lanternGlow = ctx.createRadialGradient(
        width * 0.28,
        height * 0.52,
        20,
        width * 0.28,
        height * 0.52,
        300,
      );
      lanternGlow.addColorStop(0, 'rgba(253, 224, 71, 0.24)');
      lanternGlow.addColorStop(0.35, 'rgba(245, 158, 11, 0.08)');
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

      // Scene Reference Points
      const boatX = width * 0.22;
      const boatY = height * 0.56;
      const charX = boatX + 16;
      const charY = boatY - 14;

      // Bobber anchor
      const bobberX = width * 0.62;
      let bobberY = height * 0.54 + Math.sin(now * 0.004) * 2;
      let isBobberNibble = false;

      // 2. Draw Authentic Wooden Fishing Boat
      drawAuthenticFishingBoat(ctx, boatX, boatY, now);

      // 3. Draw Authentic Player Character with drawAvatar
      const playerAppearance = meQuery.data?.appearance ?? DEFAULT_APPEARANCE;
      const playerName = meQuery.data?.displayName ?? 'TinAdmin';
      drawAuthenticPlayerCharacter(ctx, charX, charY, now, isBite, playerAppearance, playerName);

      // Rod Tip Position
      const rodTipX = charX + 46;
      const rodTipY = charY + (isBite ? 6 : -4) + Math.sin(now * 0.003) * 1.5;

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
            spawnRipple(bobberX, bobberY, 32);
            spawnSplashes(bobberX, bobberY, 6);
          }
        } else {
          break;
        }
      }

      if (isBobberNibble || (activeNibbleIdx >= 0 && now < (tl.nibbleTimes[activeNibbleIdx] ?? 0) + 240)) {
        bobberY += (Math.random() - 0.5) * 6;
      }

      // Periodical idle water ripples under bobber
      if (now - lastRippleTime > 1500 && !isBite) {
        lastRippleTime = now;
        spawnRipple(bobberX, bobberY, 28);
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

      // 9. In-Water Fish Shadow Movement Logic
      const shadowAppearAt = tl.shadowAppearAt;
      const retreatDist = behavior.retreatDistancePx ?? 80;
      const dashSpeed = behavior.dashSpeedFactor ?? 1.4;
      const strikeLeadMs = Math.max(120, Math.round(200 / dashSpeed));
      const approachAngle = 0.25;

      if (now >= shadowAppearAt || isBite) {
        const fadeProgress = Math.min(1, Math.max(0.1, (now - shadowAppearAt) / 600));
        let fishX = bobberX + Math.cos(approachAngle) * retreatDist;
        let fishY = bobberY + Math.sin(approachAngle) * retreatDist;
        let fishAngle = approachAngle + Math.PI;

        if (isBite) {
          const thrash = Math.sin(now * 0.04 * activeTierCfg.wiggleSpeed) * 8;
          fishX = bobberX + Math.cos(now * 0.02) * 6;
          fishY = bobberY + 6 + thrash;
          fishAngle = Math.atan2(bobberY - fishY, bobberX - fishX);
        } else if (tl.nibbleTimes.length === 0) {
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
          if (activeNibbleIdx >= 0) {
            const nibbleAt = tl.nibbleTimes[activeNibbleIdx]!;
            const nextStrikeAt = tl.nibbleTimes[activeNibbleIdx + 1] ?? tl.biteAt;

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
  }, [sessionKey, forceBite, zoom, soundEnabled, behavior, activeTierCfg, meQuery.data]);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(400px, 1.35fr) minmax(320px, 1fr)',
        gap: 16,
        alignItems: 'start',
      }}
    >
      {/* LEFT: Canvas Scene Simulator Window */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
        <div className="fstudio-viewport-wrap">
          {/* Header Bar inside simulator */}
          <div className="fstudio-viewport-topbar">
            <div className="fstudio-glass-group" style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8' }}>
              <Waves size={14} />
              <span>Mô Phỏng Thuyền & Phao (Play Together Scene)</span>
            </div>

            <div className="row" style={{ gap: 6, pointerEvents: 'auto' }}>
              <button
                type="button"
                onClick={() => setSoundEnabled((v) => !v)}
                className="fstudio-glass-group"
                style={{ cursor: 'pointer', padding: '5px 8px', color: soundEnabled ? '#38bdf8' : '#64748b' }}
                title="Bật/Tắt âm thanh"
              >
                <Volume2 size={14} />
              </button>

              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1.4, Math.max(0.6, z === 0.95 ? 1.15 : 0.95)))}
                className="fstudio-glass-btn"
                style={{ background: 'rgba(6, 17, 26, 0.85)', border: '1px solid rgba(255, 255, 255, 0.15)' }}
              >
                Zoom: {Math.round(zoom * 100)}%
              </button>
            </div>
          </div>

          {/* Live Canvas Element */}
          <canvas ref={canvasRef} width={860} height={520} className="fstudio-canvas-element" />

          {/* Quick Simulation Action Overlay */}
          <div className="fstudio-viewport-bottombar">
            <div className="fstudio-glass-group" style={{ fontSize: 12, color: '#e2e8f0', gap: 6 }}>
              <span style={{ color: '#94a3b8' }}>Đang chiếu:</span>
              <strong style={{ color: '#fbbf24' }}>
                {selectedSpecies ? selectedSpecies.name : `Bóng Cấp ${selectedTier}`}
              </strong>
              <span style={{ fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                ({activeTierCfg.lengthPx} × {activeTierCfg.widthPx} px)
              </span>
            </div>

            <div className="row" style={{ gap: 6, pointerEvents: 'auto' }}>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={restartSimulation}
                style={{ fontSize: 11, height: 30 }}
              >
                <RotateCcw size={12} />
                Thả Câu Lại
              </button>

              <button
                type="button"
                className="btn btn-sm btn-danger"
                onClick={() => {
                  setForceBite(true);
                  if (soundEnabled) {
                    play('bite');
                    play('splash');
                  }
                }}
                style={{ fontSize: 11, height: 30, fontWeight: 700 }}
              >
                <Zap size={12} />
                Cắn Câu Ngay (Bite!)
              </button>
            </div>
          </div>
        </div>

        {/* Species Quick Selector Bar */}
        {allSpecies.length > 0 && onSelectSpecies && (
          <div
            className="card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              overflowX: 'auto',
              padding: '8px 12px',
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
              Chọn nhanh cá:
            </span>
            {allSpecies.slice(0, 10).map((sp) => (
              <button
                key={sp.id}
                type="button"
                onClick={() => onSelectSpecies(sp.id)}
                className="pill"
                style={{
                  cursor: 'pointer',
                  fontSize: 11,
                  whiteSpace: 'nowrap',
                  background: selectedSpecies?.id === sp.id ? 'var(--primary)' : 'var(--surface-2)',
                  color: selectedSpecies?.id === sp.id ? '#fff' : 'var(--ink-2)',
                  fontWeight: selectedSpecies?.id === sp.id ? 700 : 500,
                  transition: 'all 0.12s',
                }}
              >
                {sp.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT: Admin Tuning Sliders & Configuration Controls */}
      <div className="fstudio-panel">
        <div className="row between" style={{ borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
          <div className="row" style={{ gap: 8 }}>
            <Sliders size={16} style={{ color: 'var(--primary)' }} />
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
              Bảng Điều Khiển Nhịp Đớp Mồi
            </h3>
          </div>
          {behaviorQuery.data?.isOverridden && (
            <span className="pill pill-warn" style={{ fontSize: 10 }}>
              Đã tùy biến
            </span>
          )}
        </div>

        {/* Behavior Form Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* 1. Nibbles Min & Max */}
          <div className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="row between">
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--ink)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Sparkles size={14} color="#d97706" />
                Số Lần Đớp Nhử (Nibble Count)
              </span>
              <span className="fstudio-field-val" style={{ color: '#d97706' }}>
                {behavior.minNibbles} - {behavior.maxNibbles} lần
              </span>
            </div>
            <p className="muted" style={{ fontSize: 11, margin: 0 }}>
              Nếu đặt <strong>Min = 0</strong>, cá có xác suất đớp mồi luôn mà không cần nhử!
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingTop: 4 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>
                  Tối thiểu (Min): {behavior.minNibbles}
                </label>
                <input
                  type="range"
                  min={0}
                  max={behavior.maxNibbles}
                  step={1}
                  value={behavior.minNibbles}
                  onChange={(e) => setBehavior((prev) => ({ ...prev, minNibbles: Number(e.target.value) }))}
                  className="fstudio-range"
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>
                  Tối đa (Max): {behavior.maxNibbles}
                </label>
                <input
                  type="range"
                  min={behavior.minNibbles}
                  max={10}
                  step={1}
                  value={behavior.maxNibbles}
                  onChange={(e) => setBehavior((prev) => ({ ...prev, maxNibbles: Number(e.target.value) }))}
                  className="fstudio-range"
                />
              </div>
            </div>
          </div>

          {/* 2. Nibble Interval (ms) */}
          <div className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="row between">
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--ink)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Zap size={14} color="#0284c7" />
                Khoảng Cách Thời Gian Giữa Các Lần Nhử
              </span>
              <span className="fstudio-field-val">
                {(behavior.nibbleIntervalMinMs / 1000).toFixed(1)}s -{' '}
                {(behavior.nibbleIntervalMaxMs / 1000).toFixed(1)}s
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingTop: 4 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>
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
                  className="fstudio-range"
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>
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
                  className="fstudio-range"
                />
              </div>
            </div>
          </div>

          {/* 3. Shadow Wait Delay */}
          <div className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="row between">
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--ink)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Waves size={14} color="#3b82f6" />
                Thời Gian Chờ Bóng Cá Xuất Hiện
              </span>
              <span className="fstudio-field-val" style={{ color: '#3b82f6' }}>
                {(behavior.shadowDelayMinMs / 1000).toFixed(1)}s -{' '}
                {(behavior.shadowDelayMaxMs / 1000).toFixed(1)}s
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, paddingTop: 4 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>
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
                  className="fstudio-range"
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 2 }}>
                  Tối đa: {(behavior.shadowDelayMaxMs / 1000).toFixed(1)}s
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
                  className="fstudio-range"
                />
              </div>
            </div>
          </div>

          {/* 4. Distance & Dash Speed */}
          <div className="card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <div className="row between" style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                  Khoảng Cách Bơi Ra Rình Phao:
                </span>
                <span className="fstudio-field-val" style={{ color: '#059669' }}>
                  {behavior.retreatDistancePx}px
                </span>
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
                className="fstudio-range"
              />
              <p className="muted" style={{ fontSize: 10, margin: '2px 0 0' }}>
                Cá sẽ bơi ra xa ở khoảng cách này rồi lao nhanh vào phao đớp, sau đó lùi lại.
              </p>
            </div>

            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 8 }}>
              <div className="row between" style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
                  Tốc Độ Lao Tới Đớp Mồi:
                </span>
                <span className="fstudio-field-val" style={{ color: '#e11d48' }}>
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
                className="fstudio-range"
              />
              <p className="muted" style={{ fontSize: 10, margin: '2px 0 0' }}>
                Càng cao, cá lao vụt tới phao càng nhanh và dứt khoát.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 6 }}>
          <Button
            variant="primary"
            onClick={() => saveBehaviorMutation.mutate(behavior)}
            disabled={saveBehaviorMutation.isPending}
            block
          >
            <Save size={14} />
            Lưu Cấu Hình Vào Server
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => resetBehaviorMutation.mutate()}
            disabled={resetBehaviorMutation.isPending}
            block
          >
            <RotateCcw size={14} />
            Khôi Phục Mặc Định Gốc
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Canvas Artists

/** Draws Authentic Cozy Wooden Skiff Boat */
function drawAuthenticFishingBoat(ctx: CanvasRenderingContext2D, x: number, y: number, time: number) {
  ctx.save();
  ctx.translate(x, y);

  // Gentle boat bobbing in water
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

  // Subtle breathing / bobbing
  const breathe = Math.sin(time * 0.004) * 1;
  ctx.translate(0, breathe);

  // Render real game avatar using drawAvatar!
  const app = appearance ?? DEFAULT_APPEARANCE;
  const grid = drawAvatar(app, 2, 0); // direction 2 (facing right towards water)
  // draw avatar at scale 2 (AV_W=16, AV_H=28 -> 32x56px)
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

  // Rod reel & gold accent
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
