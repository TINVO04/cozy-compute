import {
  CAFE_INGREDIENTS,
  FISHING_RODS,
  RARITY_LABELS,
  SHADOW_TIER_CONFIG,
  type FishShadowTier,
  type Rarity,
  type RodConfig,
} from '@cozy/game-data';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Coffee, Fish, Package, Star, Zap } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError, num, type Me } from '../lib/api';
import { play } from '../lib/sound';
import { useUi } from '../lib/store';
import { qk, useRefreshEconomy } from '../lib/queries';
import { Button, CoinIcon } from '../ui/primitives';
import { coffeeIcon } from '../art/items';
import { fishIcon, fishRenderDimensions, FISH_EFFECT_CLASS } from '../art/fish';
import { chibiTrophyScene } from '../art/chibi';
import { getTownSelfPosition, townFishingController } from '../game/scenes';
import { net } from '../game/net';

function rewardToast(coin: number, fame: number, title: string, tired?: boolean) {
  useUi.getState().toast({
    kind: 'reward',
    title,
    body: `+${num(coin)} Xu${fame ? ` · +${fame} Danh tiếng` : ''}${tired ? ' · Đã đạt giới hạn mềm hàng ngày, phần thưởng giảm' : ''}`,
  });
}

function errorToast(err: unknown) {
  useUi
    .getState()
    .toast({ kind: 'error', title: err instanceof ApiError ? err.message : 'Đã có lỗi xảy ra' });
  play('error');
}

function Reward({ coin, fame }: { coin: number; fame: number }) {
  return (
    <div className="row" style={{ justifyContent: 'center', gap: 16, fontSize: 18, fontWeight: 700 }}>
      <span className="row" style={{ gap: 6 }}>
        <CoinIcon size={18} /> +{coin}
      </span>
      {fame ? (
        <span className="row" style={{ gap: 6, color: 'var(--reward)' }}>
          <Star size={18} /> +{fame}
        </span>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- fishing

type FishPhase =
  | { kind: 'idle' }
  | { kind: 'starting' }
  | {
      kind: 'waiting';
      runId: string;
      nonce: string;
      startedAt: number;
      biteAt: number;
      windowMs: number;
      shadowTier: FishShadowTier;
      nibbleCount: number;
      currentNibble: number;
      nibbleTimes: number[];
      equippedRod: RodConfig;
    }
  | {
      kind: 'bite';
      runId: string;
      nonce: string;
      startedAt: number;
      biteAt: number;
      windowMs: number;
      shadowTier: FishShadowTier;
      equippedRod: RodConfig;
    }
  | {
      kind: 'reeling';
      runId: string;
      nonce: string;
      equippedRod: RodConfig;
      shadowTier: FishShadowTier;
      mashProgress: number;
    }
  | {
      kind: 'result';
      title: string;
      body: string;
      coin?: number;
      fame?: number;
      good: boolean;
      fishId?: string;
      shadowTier?: FishShadowTier;
      equippedRod?: RodConfig;
      sizeCm?: number;
      weightKg?: number;
      sizeCategory?: 'small' | 'standard' | 'large' | 'giant';
      isFirstCatch?: boolean;
      isRecord?: boolean;
    };

export function FishingActivity() {
  const close = useUi((s) => s.setActivity);
  const setPanel = useUi((s) => s.setPanel);
  const refresh = useRefreshEconomy();
  const [phase, setPhase] = useState<FishPhase>({ kind: 'idle' });
  const [resultView, setResultView] = useState<'chibi' | 'illustration'>('chibi');
  const qc = useQueryClient();
  const { data: me } = useQuery<Me>({ queryKey: qk.me, queryFn: () => api<Me>('/me') });
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // On entering fishing activity (approaching lake and pressing E):
  // 1. If character is holding anything (e.g. heldFish), put it away immediately
  // 2. Character equips and holds their fishing rod in ready stance facing the water
  useEffect(() => {
    if (me?.appearance.heldFish) {
      void api('/backpack/fish/unhold', { method: 'POST' }).catch(() => undefined);
      qc.setQueryData(qk.me, (old: Me | undefined) =>
        old ? { ...old, appearance: { ...old.appearance, heldFish: null } } : old,
      );
      (
        townFishingController?.getScene() as unknown as {
          setSelfHeldFish?: (h: null) => void;
        }
      )?.setSelfHeldFish?.(null);
    }

    const equippedRod = FISHING_RODS[me?.appearance.rod ?? 'rod_twig'] ?? FISHING_RODS['rod_twig']!;
    const selfPos = getTownSelfPosition();
    townFishingController?.holdRodReady({
      selfX: selfPos.x,
      selfY: selfPos.y,
      equippedRod,
    });

    return () => {
      townFishingController?.cleanup();
      net.send('fishing:stop', {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Return to ready stance holding fishing rod (e.g. after catch, pressing Space)
  const returnToRodReady = useCallback(() => {
    net.send('fishing:stop', {});
    if (me?.appearance.heldFish) {
      void api('/backpack/fish/unhold', { method: 'POST' }).catch(() => undefined);
      qc.setQueryData(qk.me, (old: Me | undefined) =>
        old ? { ...old, appearance: { ...old.appearance, heldFish: null } } : old,
      );
      (
        townFishingController?.getScene() as unknown as {
          setSelfHeldFish?: (h: null) => void;
        }
      )?.setSelfHeldFish?.(null);
    }
    const equippedRod = FISHING_RODS[me?.appearance.rod ?? 'rod_twig'] ?? FISHING_RODS['rod_twig']!;
    const selfPos = getTownSelfPosition();
    townFishingController?.holdRodReady({
      selfX: selfPos.x,
      selfY: selfPos.y,
      equippedRod,
    });
    setPhase({ kind: 'idle' });
  }, [me?.appearance.rod, me?.appearance.heldFish, qc]);

  const cast = useCallback(async () => {
    setPhase({ kind: 'starting' });
    try {
      const r = await api<{
        runId: string;
        nonce: string;
        biteInMs: number;
        reactionWindowMs: number;
        shadowTier?: FishShadowTier;
        nibbleCount?: number;
        shadowDelayMs?: number;
        equippedRod?: RodConfig;
      }>('/activities/fishing/start', { body: {} });

      const now = Date.now();
      const biteAt = now + r.biteInMs;
      const nibbleCount = r.nibbleCount ?? 4 + Math.floor(Math.random() * 5);
      const shadowDelayMs = r.shadowDelayMs ?? 7000 + Math.floor(Math.random() * 5001);
      const nibbleTimes: number[] = [];

      // Shadow appears after 7-12s, swims in (~2.2s), then 4-8 nibbles before bite
      const startNibble = now + shadowDelayMs + 2200;
      const endNibble = biteAt - 400;
      const step = (endNibble - startNibble) / Math.max(1, nibbleCount);
      for (let i = 0; i < nibbleCount; i++) {
        nibbleTimes.push(Math.round(startNibble + i * step));
      }

      const equippedRod = r.equippedRod ?? FISHING_RODS['rod_twig']!;
      const shadowTier = r.shadowTier ?? 1;

      // Start In-World Visuals on Town Lake
      const selfPos = getTownSelfPosition();

      // Broadcast casting to all other players in the town
      net.send('fishing:cast', {
        selfX: selfPos.x,
        selfY: selfPos.y,
        facingDir: townFishingController?.getFacingDir(),
        shadowTier,
        biteInMs: r.biteInMs,
        shadowDelayMs,
        equippedRodId: equippedRod.id,
        nibbleCount,
        nibbleTimes,
      });

      townFishingController?.startCast({
        selfX: selfPos.x,
        selfY: selfPos.y,
        shadowTier,
        nibbleCount,
        nibbleTimes,
        biteInMs: r.biteInMs,
        shadowDelayMs,
        equippedRod,
        onNibble: (idx) => {
          net.send('fishing:nibble', { nibbleIndex: idx });
          setPhase((prev) => (prev.kind === 'waiting' ? { ...prev, currentNibble: idx + 1 } : prev));
        },
        onBite: () => {
          net.send('fishing:bite', {});
          setPhase((prev) => {
            if (prev.kind !== 'waiting') return prev;
            return {
              kind: 'bite',
              runId: prev.runId,
              nonce: prev.nonce,
              startedAt: prev.startedAt,
              biteAt: prev.biteAt,
              windowMs: prev.windowMs,
              shadowTier: prev.shadowTier,
              equippedRod: prev.equippedRod,
            };
          });
        },
      });

      setPhase({
        kind: 'waiting',
        runId: r.runId,
        nonce: r.nonce,
        startedAt: now,
        biteAt,
        windowMs: r.reactionWindowMs,
        shadowTier,
        nibbleCount,
        currentNibble: 0,
        nibbleTimes,
        equippedRod,
      });
    } catch (err) {
      errorToast(err);
      townFishingController?.cleanup();
      close(null);
    }
  }, [close]);

  // Complete catch API
  const finishCatch = useCallback(
    async (p: { runId: string; nonce: string; equippedRod: RodConfig; shadowTier: FishShadowTier }) => {
      try {
        const r = await api<{
          outcome: string;
          message?: string;
          fish?: { id: string; name: string; rarity: string; description?: string };
          coin?: number;
          fame?: number;
          tired?: boolean;
          sizeCm?: number;
          weightKg?: number;
          sizeCategory?: 'small' | 'standard' | 'large' | 'giant';
          shadowTier?: FishShadowTier;
          isFirstCatch?: boolean;
          isRecord?: boolean;
        }>('/activities/fishing/complete', { body: { runId: p.runId, nonce: p.nonce } });

        if (r.outcome === 'caught' && r.fish) {
          townFishingController?.catchSuccess(r.fish.id);

          const caughtFish = {
            speciesId: r.fish.id,
            sizeCm: r.sizeCm ?? 50,
          };

          // Character holds the fish in hands
          qc.setQueryData(qk.me, (old: Me | undefined) =>
            old
              ? {
                  ...old,
                  appearance: {
                    ...old.appearance,
                    heldFish: caughtFish,
                  },
                }
              : old,
          );
          (
            townFishingController?.getScene() as unknown as {
              setSelfHeldFish?: (h: typeof caughtFish) => void;
              saySelf?: (t: string) => void;
            }
          )?.setSelfHeldFish?.(caughtFish);

          // Character announces catch in speech bubble and town chat
          const announce = `Tôi đã câu được ${r.fish.name} với độ dài ${r.sizeCm} cm!`;
          (
            townFishingController?.getScene() as unknown as {
              saySelf?: (t: string) => void;
            }
          )?.saySelf?.(announce);
          net.send('chat', { text: announce });

          setPhase({
            kind: 'result',
            good: true,
            title: `Bạn đã câu được ${r.fish.name}!`,
            body:
              r.fish.description ??
              `Một chiến lợi phẩm cấp ${RARITY_LABELS[r.fish.rarity as Rarity] ?? r.fish.rarity}.`,
            coin: r.coin,
            fame: r.fame,
            fishId: r.fish.id,
            sizeCm: r.sizeCm,
            weightKg: r.weightKg,
            sizeCategory: r.sizeCategory,
            shadowTier: r.shadowTier ?? p.shadowTier,
            equippedRod: p.equippedRod,
            isFirstCatch: r.isFirstCatch,
            isRecord: r.isRecord,
          });
          net.send('fishing:stop', {});
          rewardToast(r.coin ?? 0, r.fame ?? 0, r.fish.name, r.tired);
          refresh();
        } else {
          townFishingController?.cleanupVisuals();
          net.send('fishing:stop', {});
          play('error');
          setPhase({
            kind: 'result',
            good: false,
            title: r.outcome === 'too_early' ? 'Quá sớm rồi!' : 'Câu xịt rồi!',
            body:
              r.message ??
              (r.outcome === 'escaped'
                ? 'Dù đã kéo cần hết sức nhưng cá đã giãy mạnh và sẩy mất!'
                : 'Cá đã thoát mất!'),
          });
        }
      } catch (err) {
        townFishingController?.cleanup();
        net.send('fishing:stop', {});
        errorToast(err);
        setPhase({ kind: 'idle' });
      }
    },
    [refresh, qc],
  );

  // Hook fish on Bite -> enter reeling phase
  const hookFish = useCallback(() => {
    const p = phaseRef.current;
    if (p.kind !== 'bite') return;
    setPhase({
      kind: 'reeling',
      runId: p.runId,
      nonce: p.nonce,
      equippedRod: p.equippedRod,
      shadowTier: p.shadowTier,
      mashProgress: 30,
    });
    townFishingController?.onMashReel(30);
    play('reel');
  }, []);

  // Mash reel key/button
  const mashReel = useCallback(() => {
    const p = phaseRef.current;
    if (p.kind !== 'reeling') return;
    play('reel');
    const rodBonus = Math.min(6, (p.equippedRod.reactionBonusMs ?? 0) / 40);
    const gain = 14 + rodBonus;
    const next = Math.min(100, p.mashProgress + gain);

    townFishingController?.onMashReel(next);

    if (next >= 100) {
      void finishCatch(p);
    } else {
      setPhase((prev) => (prev.kind === 'reeling' ? { ...prev, mashProgress: next } : prev));
    }
  }, [finishCatch]);

  // Early pull when waiting (likely too early)
  const pullEarly = useCallback(async () => {
    const p = phaseRef.current;
    if (p.kind !== 'waiting') return;
    townFishingController?.cleanup();
    net.send('fishing:stop', {});
    try {
      const r = await api<{ outcome: string; message?: string }>('/activities/fishing/complete', {
        body: { runId: p.runId, nonce: p.nonce },
      });
      play('error');
      setPhase({
        kind: 'result',
        good: false,
        title: 'Quá sớm rồi!',
        body: r.message ?? 'Cá chưa cắn câu đã giật cần mất rồi!',
      });
    } catch (err) {
      errorToast(err);
      setPhase({ kind: 'idle' });
    }
  }, []);

  // Bite timeout if player doesn't react in time
  useEffect(() => {
    if (phase.kind !== 'bite') return;
    const t = window.setTimeout(() => {
      const cur = phaseRef.current;
      if (cur.kind === 'bite') {
        townFishingController?.cleanup();
        play('error');
        setPhase({
          kind: 'result',
          good: false,
          title: 'Cá đã thoát mất!',
          body: 'Bạn đã giật cần quá chậm, cá đã cắn trộm mồi rồi bơi đi!',
        });
      }
    }, phase.windowMs || 2500);
    return () => clearTimeout(t);
  }, [phase]);

  // Reeling decay loop (fish pulls back!)
  useEffect(() => {
    if (phase.kind !== 'reeling') return;
    const interval = window.setInterval(() => {
      setPhase((prev) => {
        if (prev.kind !== 'reeling') return prev;
        const next = Math.max(0, prev.mashProgress - 1.4);
        if (next <= 0) {
          townFishingController?.cleanup();
          play('error');
          return {
            kind: 'result',
            good: false,
            title: 'Cá đã thoát mất!',
            body: 'Lực giật không đủ nhanh, cá đã giãy thoát khỏi lưỡi câu!',
          };
        }
        return { ...prev, mashProgress: next };
      });
    }, 60);
    return () => clearInterval(interval);
  }, [phase.kind]);

  // Space / Enter / B / Esc keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return;

      if (e.code === 'KeyB' || e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        townFishingController?.cleanup();
        net.send('fishing:stop', {});
        close(null);
        setPanel('backpack');
        return;
      }

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        const p = phaseRef.current;
        if (p.kind === 'idle') {
          void cast();
        } else if (p.kind === 'result') {
          returnToRodReady();
        } else if (p.kind === 'bite') {
          hookFish();
        } else if (p.kind === 'reeling') {
          mashReel();
        }
      }
      if (e.key === 'Escape') {
        townFishingController?.cleanup();
        net.send('fishing:stop', {});
        close(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cast, hookFish, mashReel, returnToRodReady, close, setPanel]);

  const shadowTier: FishShadowTier | undefined =
    phase.kind === 'waiting' || phase.kind === 'bite' || phase.kind === 'reeling' || phase.kind === 'result'
      ? phase.shadowTier
      : undefined;
  const shadowInfo = shadowTier ? SHADOW_TIER_CONFIG[shadowTier] : undefined;

  return (
    <div className="fishing-inworld-hud" role="region" aria-label="Giao diện câu cá ngoài thế giới">
      {phase.kind === 'idle' && (
        <div className="fishing-status-chip" style={{ gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              close(null);
              setPanel('tackle');
            }}
          >
            🎣 Tủ Cần Câu
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              close(null);
              setPanel('backpack');
            }}
          >
            <Package size={14} /> Balo & Giỏ Cá
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setPanel('fishdex')}>
            <BookOpen size={14} /> Từ Điển Cá
          </Button>
          <Button variant="primary" size="sm" onClick={() => void cast()}>
            🎣 Quăng cần <span className="kbd">Space</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              townFishingController?.cleanup();
              close(null);
            }}
          >
            Rời cầu tàu <span className="kbd">Esc</span>
          </Button>
        </div>
      )}

      {phase.kind === 'starting' && (
        <div className="fishing-status-chip">
          <span>🌊 Đang quăng cần ra giữa hồ nước…</span>
        </div>
      )}

      {phase.kind === 'waiting' && (
        <div
          className="fishing-status-chip"
          style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 22px' }}
        >
          <span style={{ fontSize: 13, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>🎣</span>
            <span>
              Quan sát mặt nước và chờ cá cắn câu <strong>(!)</strong>…
            </span>
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-xs"
            style={{ fontSize: 11, color: '#94a3b8' }}
            onClick={() => void pullEarly()}
          >
            Thu cần sớm
          </button>
        </div>
      )}

      {phase.kind === 'bite' && (
        <div
          className="fishing-status-chip"
          style={{
            border: '2px solid #ef4444',
            boxShadow: '0 0 25px rgba(239, 68, 68, 0.7)',
            animation: 'bump 0.25s infinite ease-in-out',
            padding: '12px 28px',
            background: 'rgba(239, 68, 68, 0.25)',
          }}
        >
          <Zap size={22} color="#ef4444" />
          <span style={{ fontSize: 16, fontWeight: 800, color: '#fca5a5' }}>BITE! CÁ ĐÃ CẮN CÂU!</span>
          <button
            type="button"
            className="fishing-mash-btn"
            onClick={hookFish}
            style={{ animation: 'pulse 0.5s infinite' }}
          >
            ⚡ GIẬT NGAY!{' '}
            <span className="kbd" style={{ background: 'rgba(0,0,0,0.3)', color: '#fff' }}>
              Space
            </span>
          </button>
        </div>
      )}

      {phase.kind === 'reeling' && (
        <div className="fishing-mash-widget">
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Zap size={16} /> GIẰNG CO! ẤN SPACE LIÊN TỤC!
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8' }}>
              {Math.round(phase.mashProgress)}%
            </span>
          </div>
          <div className="fishing-meter-track">
            <div
              className="fishing-meter-fill"
              style={{ width: `${Math.min(100, Math.max(0, phase.mashProgress))}%` }}
            />
          </div>
          <button type="button" className="fishing-mash-btn" onClick={mashReel}>
            ⚡ GIẬT DÂY!{' '}
            <span className="kbd" style={{ background: 'rgba(0,0,0,0.3)', color: '#fff' }}>
              Space
            </span>
          </button>
        </div>
      )}

      {phase.kind === 'result' && (
        <div className="fishing-result-card" role="dialog" aria-label="Kết quả câu cá">
          <div style={{ height: 210, position: 'relative', overflow: 'hidden' }}>
            {phase.fishId ? (
              <>
                {resultView === 'chibi' ? (
                  <img
                    src={chibiTrophyScene(
                      me?.appearance ?? { skin: 1, hairStyle: 'short', hairColor: 1, baseTop: 0 },
                      phase.fishId,
                      phase.sizeCm ?? 50,
                      440,
                      210,
                    )}
                    alt="Chiến lợi phẩm HD Chibi"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  (() => {
                    const { displayScale, baseWidth, baseHeight } = fishRenderDimensions(
                      phase.fishId,
                      phase.sizeCm,
                    );
                    return (
                      <div
                        className={`fish-3d-pedestal ${FISH_EFFECT_CLASS[phase.fishId] ?? ''}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                        }}
                      >
                        <img
                          src={fishIcon(phase.fishId, displayScale)}
                          alt="Chiến lợi phẩm cá"
                          className="fish-3d-float"
                          style={{
                            width: Math.min(baseWidth * displayScale, 240),
                            height: Math.min(baseHeight * displayScale, 140),
                            objectFit: 'contain',
                            imageRendering: 'pixelated',
                          }}
                        />
                      </div>
                    );
                  })()
                )}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    display: 'flex',
                    gap: 4,
                    zIndex: 2,
                  }}
                >
                  <button
                    type="button"
                    className={`btn btn-xs ${resultView === 'chibi' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      background: resultView === 'chibi' ? undefined : 'rgba(0,0,0,0.6)',
                    }}
                    onClick={() => setResultView('chibi')}
                  >
                    ✨ Chibi Vinh Danh
                  </button>
                  <button
                    type="button"
                    className={`btn btn-xs ${resultView === 'illustration' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      background: resultView === 'illustration' ? undefined : 'rgba(0,0,0,0.6)',
                    }}
                    onClick={() => setResultView('illustration')}
                  >
                    🌟 3D Render Studio
                  </button>
                </div>
              </>
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                }}
              >
                <Fish size={56} color="#94a3b8" />
              </div>
            )}
          </div>

          <div
            style={{
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              textAlign: 'center',
            }}
          >
            <div className="row" style={{ justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
              {shadowInfo && (
                <span
                  className="pill"
                  style={{
                    background: shadowInfo.hasCrown ? 'rgba(251, 191, 36, 0.25)' : 'rgba(56, 189, 248, 0.2)',
                    color: shadowInfo.hasCrown ? '#fbbf24' : '#38bdf8',
                    border: `1px solid ${shadowInfo.hasCrown ? '#f59e0b' : '#0284c7'}`,
                    fontWeight: 700,
                  }}
                >
                  {shadowInfo.hasCrown ? '👑 ' : ''}
                  {shadowInfo.label}
                </span>
              )}
              {phase.isFirstCatch ? (
                <span
                  className="pill"
                  style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', fontWeight: 700 }}
                >
                  ✨ Mới khám phá!
                </span>
              ) : null}
              {phase.isRecord && !phase.isFirstCatch ? (
                <span
                  className="pill"
                  style={{ background: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24', fontWeight: 700 }}
                >
                  👑 Kỷ lục mới!
                </span>
              ) : null}
              {phase.sizeCategory === 'giant' ? (
                <span
                  className="pill"
                  style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontWeight: 700 }}
                >
                  🏆 Siêu to khổng lồ
                </span>
              ) : phase.sizeCategory === 'large' ? (
                <span
                  className="pill"
                  style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', fontWeight: 700 }}
                >
                  ⭐ Cỡ lớn
                </span>
              ) : phase.sizeCategory === 'small' ? (
                <span className="pill" style={{ background: 'rgba(148, 163, 184, 0.2)', color: '#cbd5e1' }}>
                  Bé nhỏ xinh xắn
                </span>
              ) : null}
            </div>

            <h3 style={{ margin: 0, fontSize: 18, color: '#f8fafc' }}>{phase.title}</h3>

            {phase.sizeCm ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  background: 'rgba(15, 23, 42, 0.6)',
                  padding: '4px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#38bdf8',
                }}
              >
                <span>📏 Dài: {phase.sizeCm} cm</span>
                <span>⚖️ Nặng: {phase.weightKg} kg</span>
              </div>
            ) : null}

            <p className="muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.4 }}>
              {phase.body}
            </p>

            {phase.good ? <Reward coin={phase.coin ?? 0} fame={phase.fame ?? 0} /> : null}

            <div className="row" style={{ justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  townFishingController?.cleanup();
                  close(null);
                  setPanel('shop-rods');
                }}
              >
                🎣 Tiệm Ngư Cụ
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  townFishingController?.cleanup();
                  close(null);
                  setPanel('backpack');
                }}
              >
                <Package size={14} /> Giỏ Cá
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setPanel('fishdex')}>
                <BookOpen size={14} /> Từ Điển
              </Button>
              <Button variant="primary" size="sm" onClick={() => void returnToRodReady()}>
                🎣 Cầm cần câu <span className="kbd">Space</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  townFishingController?.cleanup();
                  close(null);
                }}
              >
                Đóng <span className="kbd">Esc</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- cafe

interface CafeRun {
  runId: string;
  nonce: string;
  customer: string;
  order: string[];
  timeLimitMs: number;
  started: number;
}

const label = (id: string) => CAFE_INGREDIENTS.find((i) => i.id === id)?.label ?? id;

export function CafeActivity() {
  const close = useUi((s) => s.setActivity);
  const refresh = useRefreshEconomy();
  const [run, setRun] = useState<CafeRun | null>(null);
  const [seq, setSeq] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<null | {
    good: boolean;
    title: string;
    body: string;
    coin?: number;
    fame?: number;
  }>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 250);
    return () => clearInterval(t);
  }, []);

  async function start() {
    setBusy(true);
    setResult(null);
    setSeq([]);
    try {
      const r = await api<Omit<CafeRun, 'started'>>('/activities/cafe/start', { body: {} });
      setRun({ ...r, started: Date.now() });
      play('pop');
    } catch (err) {
      errorToast(err);
      close(null);
    } finally {
      setBusy(false);
    }
  }

  async function serve(final: string[]) {
    if (!run) return;
    setBusy(true);
    try {
      const r = await api<{
        outcome: string;
        coin?: number;
        fame?: number;
        message?: string;
        tired?: boolean;
      }>('/activities/cafe/complete', {
        body: { runId: run.runId, nonce: run.nonce, sequence: final },
      });
      if (r.outcome === 'served') {
        play('coin');
        setResult({
          good: true,
          title: 'Đã phục vụ món!',
          body: `${run.customer} trông có vẻ rất hài lòng.`,
          coin: r.coin,
          fame: r.fame,
        });
        rewardToast(r.coin ?? 0, r.fame ?? 0, 'Đã giao đồ uống', r.tired);
        refresh();
      } else {
        play('error');
        setResult({
          good: false,
          title: r.outcome === 'late' ? 'Quá chậm rồi' : 'Sai công thức món',
          body: r.message ?? '',
        });
      }
      setRun(null);
    } catch (err) {
      errorToast(err);
      setRun(null);
    } finally {
      setBusy(false);
    }
  }

  function add(id: string) {
    if (!run || busy) return;
    play('click');
    const next = [...seq, id];
    setSeq(next);
    if (next.length === run.order.length) void serve(next);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (run) void api('/activities/cancel', { body: { runId: run.runId } }).catch(() => undefined);
        close(null);
      }
      const n = Number(e.key);
      if (run && n >= 1 && n <= CAFE_INGREDIENTS.length) add(CAFE_INGREDIENTS[n - 1]!.id);
      if (!run && !busy && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        void start();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const left = run ? Math.max(0, run.timeLimitMs - (Date.now() - run.started)) : 0;

  return (
    <div className="activity" role="dialog" aria-label="Ca làm quán cà phê">
      <div className="activity-card" style={{ width: 'min(520px, calc(100% - 32px))' }}>
        <div
          className="activity-art"
          style={{
            background: 'linear-gradient(160deg, #f1dcc0, #e7c49b)',
            height: 140,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {run || result ? (
            <img
              src={coffeeIcon(run ? seq : ['espresso', 'milk', 'caramel'], 5)}
              alt="Artisan Coffee"
              className="pixel"
              style={{
                width: 100,
                height: 100,
                objectFit: 'contain',
                filter: 'drop-shadow(0 6px 12px rgba(107, 59, 42, 0.25))',
              }}
            />
          ) : (
            <Coffee size={56} color="#6b3b2a" strokeWidth={1.5} />
          )}
        </div>
        <div className="activity-body">
          {run ? (
            <>
              <div className="row between">
                <span className="muted" style={{ fontSize: 13 }}>
                  Khách hàng: <strong style={{ color: 'var(--ink)' }}>{run.customer}</strong>
                </span>
                <span className="timer-ring" style={{ color: left < 5000 ? 'var(--danger)' : 'var(--ink)' }}>
                  {(left / 1000).toFixed(1)}s
                </span>
              </div>
              <div className="order-strip" aria-label="Món yêu cầu">
                {run.order.map((o, i) => (
                  <div key={i} className={`order-slot ${seq[i] ? (seq[i] === o ? 'filled' : 'wrong') : ''}`}>
                    {label(o)}
                  </div>
                ))}
              </div>
              <p className="muted" style={{ fontSize: 12 }}>
                Thêm nguyên liệu theo thứ tự. Bạn cũng có thể dùng phím <span className="kbd">1</span>–
                <span className="kbd">8</span>.
              </p>
              <div className="ingredients">
                {CAFE_INGREDIENTS.map((ing, i) => (
                  <button key={ing.id} className="ingredient" disabled={busy} onClick={() => add(ing.id)}>
                    <div className="muted" style={{ fontSize: 10 }}>
                      {i + 1}
                    </div>
                    {ing.label}
                  </button>
                ))}
              </div>
              <div className="row" style={{ justifyContent: 'center' }}>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!seq.length || busy}
                  onClick={() => setSeq(seq.slice(0, -1))}
                >
                  Hoàn tác bước trước
                </Button>
              </div>
            </>
          ) : result ? (
            <>
              <h3>{result.title}</h3>
              <p className="muted">{result.body}</p>
              {result.good ? <Reward coin={result.coin ?? 0} fame={result.fame ?? 0} /> : null}
              <div className="row" style={{ justifyContent: 'center' }}>
                <Button variant="ghost" onClick={() => close(null)}>
                  Hết ca làm
                </Button>
                <Button variant="primary" loading={busy} onClick={() => void start()}>
                  Khách tiếp theo <span className="kbd">Space</span>
                </Button>
              </div>
            </>
          ) : (
            <>
              <h3>Tiệm Cà Phê Bean There</h3>
              <p className="muted">
                Khách hàng sẽ gọi đồ uống. Hãy pha chế chuẩn xác theo thứ tự trước khi họ mất kiên nhẫn. Phục
                vụ càng nhanh thì tiền boa càng lớn.
              </p>
              <div className="row" style={{ justifyContent: 'center' }}>
                <Button variant="ghost" onClick={() => close(null)}>
                  Để sau
                </Button>
                <Button variant="primary" size="lg" loading={busy} onClick={() => void start()}>
                  Bắt đầu ca làm <span className="kbd">Space</span>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- delivery

export async function startDelivery() {
  const ui = useUi.getState();
  try {
    const r = await api<{
      runId: string;
      nonce: string;
      destination: never;
      destinationLabel: string;
      package: string;
      timeLimitMs: number;
    }>('/activities/delivery/start', { body: {} });
    play('pop');
    ui.setDelivery({ ...r, startedAt: Date.now() });
    ui.toast({
      kind: 'info',
      title: `Giao kiện "${r.package}"`,
      body: `Mang tới ${r.destinationLabel}. Đi theo dấu chỉ dẫn màu cam.`,
    });
  } catch (err) {
    errorToast(err);
  }
}

export function DeliveryHud() {
  const job = useUi((s) => s.delivery);
  const zone = useUi((s) => s.zone);
  const setDelivery = useUi((s) => s.setDelivery);
  const refresh = useRefreshEconomy();
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 250);
    return () => clearInterval(t);
  }, []);
  if (!job) return null;
  const left = Math.max(0, job.timeLimitMs - (Date.now() - job.startedAt));
  const here = zone === job.destination;

  async function deliver() {
    if (!job) return;
    setBusy(true);
    try {
      const r = await api<{
        outcome: string;
        coin?: number;
        fame?: number;
        message?: string;
        tired?: boolean;
      }>('/activities/delivery/complete', {
        body: { runId: job.runId, nonce: job.nonce },
      });
      if (r.outcome === 'delivered') {
        play('coin');
        rewardToast(r.coin ?? 0, r.fame ?? 0, 'Giao hàng thành công!', r.tired);
        refresh();
      } else {
        play('error');
        useUi.getState().toast({ kind: 'error', title: r.message ?? 'Giao hàng thất bại' });
      }
      setDelivery(null);
    } catch (err) {
      errorToast(err);
      if (err instanceof ApiError && err.code !== 'not_at_location') setDelivery(null);
    } finally {
      setBusy(false);
    }
  }

  async function abandon() {
    if (job) await api('/activities/cancel', { body: { runId: job.runId } }).catch(() => undefined);
    setDelivery(null);
  }

  return (
    <div className="delivery-hud" role="status">
      <Package size={22} color="var(--reward)" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ display: 'block', fontSize: 14 }}>{job.package}</strong>
        <span className="muted" style={{ fontSize: 12 }}>
          {left === 0
            ? 'Hết thời gian — giao hàng trễ sẽ không nhận được thù lao, hoặc bạn có thể hủy đơn.'
            : `Giao tới ${job.destinationLabel}`}
        </span>
      </div>
      <span className="timer-ring" style={{ color: left < 8000 ? 'var(--danger)' : 'var(--ink)' }}>
        {Math.ceil(left / 1000)}s
      </span>
      {here ? (
        <Button variant="reward" loading={busy} onClick={() => void deliver()}>
          Giao hàng
        </Button>
      ) : (
        <Button variant="ghost" size="sm" onClick={() => void abandon()}>
          Hủy đơn
        </Button>
      )}
    </div>
  );
}
