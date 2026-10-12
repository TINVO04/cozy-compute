import { SHADOW_TIER_CONFIG, type FishShadowTier, type ShadowTierInfo } from '@cozy/game-data';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Crown, Eye, RotateCcw, Save, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { drawCanvasOrganicFishShadow } from '../../game/fish-shadow';
import { api } from '../../lib/api';
import { play } from '../../lib/sound';
import { useUi } from '../../lib/store';
import { Button, toastError } from '../../ui/primitives';
import { fishIcon } from '../../art/fish';
import type { AdminFishSpecies } from './FishAdmin';

export function FishSpeciesShadowTuner({ fish, onSaved }: { fish: AdminFishSpecies; onSaved: () => void }) {
  const qc = useQueryClient();
  const defaultTier: FishShadowTier = fish.defaultShadowTier ?? 1;
  const baseTierCfg = SHADOW_TIER_CONFIG[defaultTier];

  const [lengthPx, setLengthPx] = useState<number>(fish.shadowLengthPx ?? baseTierCfg.lengthPx);
  const [widthPx, setWidthPx] = useState<number>(fish.shadowWidthPx ?? baseTierCfg.widthPx);
  const [swimSpeed, setSwimSpeed] = useState<number>(fish.shadowSwimSpeed ?? baseTierCfg.swimSpeed);
  const [wiggleSpeed, setWiggleSpeed] = useState<number>(fish.shadowWiggleSpeed ?? baseTierCfg.wiggleSpeed);
  const [hasCrown, setHasCrown] = useState<boolean>(fish.shadowHasCrown ?? baseTierCfg.hasCrown ?? false);
  const [hasGlow, setHasGlow] = useState<boolean>(fish.shadowHasGlow ?? baseTierCfg.hasGlow ?? false);
  const [zoom, setZoom] = useState<number>(0.8);
  const [testAction, setTestAction] = useState<'normal' | 'nibble' | 'bite'>('normal');
  const [megaMode, setMegaMode] = useState<boolean>(true);

  // Sync state whenever fish prop changes
  useEffect(() => {
    setLengthPx(fish.shadowLengthPx ?? baseTierCfg.lengthPx);
    setWidthPx(fish.shadowWidthPx ?? baseTierCfg.widthPx);
    setSwimSpeed(fish.shadowSwimSpeed ?? baseTierCfg.swimSpeed);
    setWiggleSpeed(fish.shadowWiggleSpeed ?? baseTierCfg.wiggleSpeed);
    setHasCrown(fish.shadowHasCrown ?? baseTierCfg.hasCrown ?? false);
    setHasGlow(fish.shadowHasGlow ?? baseTierCfg.hasGlow ?? false);
  }, [
    fish.id,
    fish.shadowLengthPx,
    fish.shadowWidthPx,
    fish.shadowSwimSpeed,
    fish.shadowWiggleSpeed,
    fish.shadowHasCrown,
    fish.shadowHasGlow,
    baseTierCfg,
  ]);

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

      // Deep lake water gradient
      const grad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        40,
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
      ctx.translate(width / 2, height / 2);
      ctx.scale(zoom, zoom);

      const isBite = testAction === 'bite';
      const isRecoil = testAction === 'nibble';

      const curTierInfo: ShadowTierInfo = {
        tier: defaultTier,
        label: `${fish.name} Shadow`,
        name: fish.name,
        lengthPx,
        widthPx,
        swimSpeed,
        wiggleSpeed,
        hasCrown,
        hasGlow,
        color: baseTierCfg.color,
      };

      // Swim orbit
      const swimRadius = Math.max(30, lengthPx * 0.25);
      const swimAngle = time * 0.001 * swimSpeed;
      const fishX = Math.cos(swimAngle) * swimRadius;
      const fishY = Math.sin(swimAngle * 1.5) * (swimRadius * 0.4);
      const heading = swimAngle + Math.PI / 2;

      drawCanvasOrganicFishShadow(ctx, fishX, fishY, heading, time, curTierInfo, 1, isBite, isRecoil);

      // Scale reference crosshair lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(-lengthPx / 2, 0);
      ctx.lineTo(lengthPx / 2, 0);
      ctx.moveTo(0, -widthPx / 2);
      ctx.lineTo(0, widthPx / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    lengthPx,
    widthPx,
    swimSpeed,
    wiggleSpeed,
    hasCrown,
    hasGlow,
    zoom,
    testAction,
    defaultTier,
    fish.name,
    baseTierCfg.color,
  ]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: () =>
      api(`/admin/fish/${fish.id}/shadow`, {
        method: 'PUT',
        body: {
          lengthPx,
          widthPx,
          swimSpeed,
          wiggleSpeed,
          hasCrown,
          hasGlow,
        },
      }),
    onSuccess: () => {
      play('coin');
      qc.invalidateQueries({ queryKey: ['admin-fish'] });
      qc.invalidateQueries({ queryKey: ['fishing-shadow-tiers'] });
      qc.invalidateQueries({ queryKey: ['fishing-species-shadows'] });
      useUi.getState().toast({
        kind: 'reward',
        title: 'Đã lưu bóng cá riêng',
        body: `Đã lưu bóng cá riêng cho ${fish.name} (${lengthPx}px × ${widthPx}px) thành công!`,
      });
      onSaved();
    },
    onError: (err) => toastError(err, 'Lỗi cập nhật bóng cá'),
  });

  const resetMutation = useMutation({
    mutationFn: () =>
      api(`/admin/fish/${fish.id}/shadow`, {
        method: 'DELETE',
      }),
    onSuccess: (data) => {
      play('coin');
      qc.invalidateQueries({ queryKey: ['admin-fish'] });
      qc.invalidateQueries({ queryKey: ['fishing-shadow-tiers'] });
      qc.invalidateQueries({ queryKey: ['fishing-species-shadows'] });
      useUi.getState().toast({
        kind: 'info',
        title: 'Đã khôi phục bóng mặc định',
        body: `Đã đưa loài ${fish.name} về kích thước bóng chuẩn theo Bậc ${defaultTier}.`,
      });
      const d = data as {
        lengthPx: number;
        widthPx: number;
        swimSpeed: number;
        wiggleSpeed: number;
        hasCrown?: boolean;
        hasGlow?: boolean;
      };
      setLengthPx(d.lengthPx);
      setWidthPx(d.widthPx);
      setSwimSpeed(d.swimSpeed);
      setWiggleSpeed(d.wiggleSpeed);
      setHasCrown(d.hasCrown ?? false);
      setHasGlow(d.hasGlow ?? false);
      onSaved();
    },
    onError: (err) => toastError(err, 'Lỗi khôi phục bóng cá'),
  });

  const applyMultiplier = (mult: number) => {
    setLengthPx(Math.round(baseTierCfg.lengthPx * mult));
    setWidthPx(Math.round(baseTierCfg.widthPx * mult));
  };

  const isModifiedFromDefault =
    lengthPx !== baseTierCfg.lengthPx ||
    widthPx !== baseTierCfg.widthPx ||
    swimSpeed !== baseTierCfg.swimSpeed ||
    wiggleSpeed !== baseTierCfg.wiggleSpeed ||
    hasCrown !== (baseTierCfg.hasCrown ?? false) ||
    hasGlow !== (baseTierCfg.hasGlow ?? false);

  const maxSliderLength = megaMode ? 5000 : 800;
  const maxSliderWidth = megaMode ? 2000 : 300;

  return (
    <div className="stack" style={{ gap: 16 }}>
      {/* Header Info & Status */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          padding: '12px 16px',
          background: 'rgba(8, 47, 64, 0.4)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={fishIcon(fish.id, 2)} alt="" style={{ width: 44, height: 36, objectFit: 'contain' }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: '#f0f9ff' }}>{fish.name}</h3>
              <span
                className="pill"
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                Bậc chuẩn: Bậc {defaultTier} ({baseTierCfg.name})
              </span>
              {fish.isShadowOverridden ? (
                <span
                  className="pill"
                  style={{
                    background: '#818cf8',
                    color: '#ffffff',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  🌊 Đang Dùng Bóng Tùy Chỉnh Riêng
                </span>
              ) : (
                <span className="pill pill-muted" style={{ fontSize: 11 }}>
                  Dùng bóng theo bậc
                </span>
              )}
            </div>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8' }}>
              Chuẩn Bậc {defaultTier}: {baseTierCfg.lengthPx}px × {baseTierCfg.widthPx}px | Tốc độ:{' '}
              {baseTierCfg.swimSpeed}x | Vẫy đuôi: {baseTierCfg.wiggleSpeed}x
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          {fish.isShadowOverridden ? (
            <Button
              variant="ghost"
              size="sm"
              loading={resetMutation.isPending}
              onClick={() => resetMutation.mutate()}
              style={{ color: '#f87171' }}
            >
              <RotateCcw size={14} /> Khôi phục gốc
            </Button>
          ) : null}
          <Button
            variant="primary"
            size="sm"
            loading={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            <Save size={14} /> Lưu Bóng Riêng Cho {fish.name}
          </Button>
        </div>
      </div>

      {/* Main Workbench Grid: Left = Canvas Preview, Right = Tuning Controls */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(360px, 1.25fr) minmax(320px, 1fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        {/* Left: Water Canvas Preview Stage */}
        <div
          className="card"
          style={{
            position: 'relative',
            overflow: 'hidden',
            padding: 0,
            background: '#04131d',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: 12,
            minHeight: 460,
          }}
        >
          {/* Canvas Controls Bar */}
          <div
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              right: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 10,
              pointerEvents: 'none',
            }}
          >
            <div
              className="row"
              style={{
                gap: 6,
                background: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(8px)',
                padding: '4px 8px',
                borderRadius: 8,
                pointerEvents: 'auto',
              }}
            >
              <button
                type="button"
                className={`tab ${testAction === 'normal' ? 'tab-active' : ''}`}
                style={{ fontSize: 11, padding: '3px 8px', margin: 0 }}
                onClick={() => setTestAction('normal')}
              >
                🌊 Bơi thường
              </button>
              <button
                type="button"
                className={`tab ${testAction === 'nibble' ? 'tab-active' : ''}`}
                style={{ fontSize: 11, padding: '3px 8px', margin: 0 }}
                onClick={() => setTestAction('nibble')}
              >
                🎣 Rỉa mồi
              </button>
              <button
                type="button"
                className={`tab ${testAction === 'bite' ? 'tab-active' : ''}`}
                style={{ fontSize: 11, padding: '3px 8px', margin: 0 }}
                onClick={() => setTestAction('bite')}
              >
                ⚡ Đớp câu (!)
              </button>
            </div>

            {/* Zoom Slider */}
            <div
              className="row"
              style={{
                gap: 8,
                background: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(8px)',
                padding: '4px 10px',
                borderRadius: 8,
                pointerEvents: 'auto',
                alignItems: 'center',
              }}
            >
              <Eye size={13} style={{ color: '#94a3b8' }} />
              <input
                type="range"
                min="0.15"
                max="1.8"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                style={{ width: 80, accentColor: '#38bdf8' }}
              />
              <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 700, minWidth: 32 }}>
                {(zoom * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Actual Canvas */}
          <canvas
            ref={canvasRef}
            width={620}
            height={460}
            style={{ width: '100%', height: 460, display: 'block' }}
          />

          {/* Floating Canvas Footer Badges */}
          <div
            style={{
              position: 'absolute',
              bottom: 10,
              left: 10,
              right: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 10,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                background: 'rgba(15, 23, 42, 0.85)',
                backdropFilter: 'blur(8px)',
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 12,
                color: '#e2e8f0',
              }}
            >
              Kích thước thực tế:{' '}
              <strong style={{ color: '#38bdf8' }}>
                {lengthPx}px × {widthPx}px
              </strong>{' '}
              ({(lengthPx / baseTierCfg.lengthPx).toFixed(1)}x bậc {defaultTier})
            </div>

            {hasCrown || hasGlow ? (
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  background: 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(8px)',
                  padding: '4px 10px',
                  borderRadius: 6,
                }}
              >
                {hasCrown && (
                  <span style={{ color: '#fbbf24', fontSize: 11, fontWeight: 700, display: 'flex', gap: 4 }}>
                    <Crown size={13} /> Vương miện
                  </span>
                )}
                {hasGlow && (
                  <span style={{ color: '#38bdf8', fontSize: 11, fontWeight: 700, display: 'flex', gap: 4 }}>
                    <Sparkles size={13} /> Hào quang
                  </span>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Right: Tuning Sliders & Unconstrained Oversized Inputs */}
        <div
          className="card"
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Quick Multipliers: "To Bất Thường" Presets */}
          <div className="stack" style={{ gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>
                ⚡ Phóng To Nhanh (Quick Multipliers)
              </label>
              <label
                style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 5 }}
              >
                <input
                  type="checkbox"
                  checked={megaMode}
                  onChange={(e) => setMegaMode(e.target.checked)}
                  style={{ accentColor: '#38bdf8' }}
                />
                Cho phép tới 5000px
              </label>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                { label: '0.5x', mult: 0.5 },
                { label: '1x (Chuẩn)', mult: 1.0 },
                { label: '1.5x', mult: 1.5 },
                { label: '2x (Gấp đôi)', mult: 2.0 },
                { label: '3x', mult: 3.0 },
                { label: '5x (Siêu lớn)', mult: 5.0 },
                { label: '10x (Khổng lồ)', mult: 10.0 },
                { label: '20x (Quái thú)', mult: 20.0 },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="pill"
                  style={{
                    background:
                      lengthPx === Math.round(baseTierCfg.lengthPx * item.mult)
                        ? '#0284c7'
                        : 'rgba(56, 189, 248, 0.1)',
                    color: lengthPx === Math.round(baseTierCfg.lengthPx * item.mult) ? '#ffffff' : '#38bdf8',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    cursor: 'pointer',
                    fontSize: 11,
                    padding: '3px 8px',
                  }}
                  onClick={() => applyMultiplier(item.mult)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dimension: Length Px */}
          <div className="stack" style={{ gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>
                📏 Chiều Dài Bóng (Length Px)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number"
                  min="10"
                  max="50000"
                  value={lengthPx}
                  onChange={(e) => setLengthPx(Math.max(10, Math.min(50000, Number(e.target.value) || 10)))}
                  style={{
                    width: 80,
                    padding: '3px 6px',
                    fontSize: 12,
                    textAlign: 'right',
                    borderRadius: 6,
                    border: '1px solid #0284c7',
                    background: '#0f172a',
                    color: '#38bdf8',
                    fontWeight: 700,
                  }}
                />
                <span style={{ fontSize: 11, color: '#94a3b8' }}>px</span>
              </div>
            </div>
            <input
              type="range"
              min="15"
              max={maxSliderLength}
              step="5"
              value={Math.min(lengthPx, maxSliderLength)}
              onChange={(e) => setLengthPx(Number(e.target.value))}
              style={{ accentColor: '#38bdf8', width: '100%' }}
            />
          </div>

          {/* Dimension: Width Px */}
          <div className="stack" style={{ gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>
                ↔️ Chiều Rộng Bóng (Width Px)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number"
                  min="5"
                  max="25000"
                  value={widthPx}
                  onChange={(e) => setWidthPx(Math.max(5, Math.min(25000, Number(e.target.value) || 5)))}
                  style={{
                    width: 80,
                    padding: '3px 6px',
                    fontSize: 12,
                    textAlign: 'right',
                    borderRadius: 6,
                    border: '1px solid #0284c7',
                    background: '#0f172a',
                    color: '#38bdf8',
                    fontWeight: 700,
                  }}
                />
                <span style={{ fontSize: 11, color: '#94a3b8' }}>px</span>
              </div>
            </div>
            <input
              type="range"
              min="5"
              max={maxSliderWidth}
              step="2"
              value={Math.min(widthPx, maxSliderWidth)}
              onChange={(e) => setWidthPx(Number(e.target.value))}
              style={{ accentColor: '#38bdf8', width: '100%' }}
            />
          </div>

          {/* Swim Speed */}
          <div className="stack" style={{ gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>
                🏊 Tốc Độ Bơi Lượn (Swim Speed)
              </label>
              <span style={{ fontSize: 12, color: '#38bdf8', fontWeight: 700 }}>{swimSpeed.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.05"
              value={swimSpeed}
              onChange={(e) => setSwimSpeed(Number(e.target.value))}
              style={{ accentColor: '#38bdf8', width: '100%' }}
            />
          </div>

          {/* Wiggle Speed */}
          <div className="stack" style={{ gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>
                〰️ Tần Số Vẫy Đuôi (Wiggle Speed)
              </label>
              <span style={{ fontSize: 12, color: '#38bdf8', fontWeight: 700 }}>
                {wiggleSpeed.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="3.5"
              step="0.05"
              value={wiggleSpeed}
              onChange={(e) => setWiggleSpeed(Number(e.target.value))}
              style={{ accentColor: '#38bdf8', width: '100%' }}
            />
          </div>

          {/* Special FX Toggles */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              padding: '10px 12px',
              background: 'rgba(15, 23, 42, 0.4)',
              borderRadius: 8,
              border: '1px solid var(--border)',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                cursor: 'pointer',
                color: hasCrown ? '#fbbf24' : '#94a3b8',
                fontWeight: hasCrown ? 700 : 500,
              }}
            >
              <input
                type="checkbox"
                checked={hasCrown}
                onChange={(e) => setHasCrown(e.target.checked)}
                style={{ accentColor: '#fbbf24', width: 16, height: 16 }}
              />
              <Crown size={15} /> Vương Miện Vàng
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                cursor: 'pointer',
                color: hasGlow ? '#38bdf8' : '#94a3b8',
                fontWeight: hasGlow ? 700 : 500,
              }}
            >
              <input
                type="checkbox"
                checked={hasGlow}
                onChange={(e) => setHasGlow(e.target.checked)}
                style={{ accentColor: '#38bdf8', width: 16, height: 16 }}
              />
              <Sparkles size={15} /> Hào Quang Nước
            </label>
          </div>

          {/* Reset & Save Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: 8,
              borderTop: '1px solid var(--border)',
            }}
          >
            <Button
              variant="ghost"
              size="sm"
              disabled={!isModifiedFromDefault}
              onClick={() => {
                setLengthPx(baseTierCfg.lengthPx);
                setWidthPx(baseTierCfg.widthPx);
                setSwimSpeed(baseTierCfg.swimSpeed);
                setWiggleSpeed(baseTierCfg.wiggleSpeed);
                setHasCrown(baseTierCfg.hasCrown ?? false);
                setHasGlow(baseTierCfg.hasGlow ?? false);
              }}
              style={{ fontSize: 12 }}
            >
              Hoàn tác chỉnh sửa
            </Button>

            <Button
              variant="primary"
              size="sm"
              loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              <Save size={14} /> Lưu Bóng Cho {fish.name}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
