import { CROPS } from '@cozy/game-data';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronDown, Droplet, Gauge, Scissors, Sprout, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { farmItemIcon } from '../../art/farm-icons';
import { api, type Me } from '../../lib/api';
import { net } from '../../game/net';
import { play } from '../../lib/sound';
import { useUi } from '../../lib/store';

interface WarehouseItem {
  id: string;
  itemId: string;
  quantity: number;
}

interface FarmMeResponse {
  warehouse: { items: WarehouseItem[] };
}

export function TractorControlHud({ me: _me }: { me: Me }) {
  const room = useUi((s) => s.room);
  const tractorMode = useUi((s) => s.tractorMode);
  const tractorSeedId = useUi((s) => s.tractorSeedId);
  const setTractorMode = useUi((s) => s.setTractorMode);
  const setTractorSeedId = useUi((s) => s.setTractorSeedId);

  const [driving, setDriving] = useState(false);
  const [seedPickerOpen, setSeedPickerOpen] = useState(false);

  const { data: farmMe } = useQuery({
    queryKey: ['farm', 'me'],
    queryFn: () => api<FarmMeResponse>('/api/farm/me'),
    enabled: room.kind === 'farm',
    refetchInterval: 4000,
  });

  // Track if current player is driving tractor
  useEffect(() => {
    const timer = window.setInterval(() => {
      const state = net.room?.state as { players?: Map<string, { vehicle?: string }> } | undefined;
      const player = state?.players?.get(net.room?.sessionId ?? '');
      const v = player?.vehicle ?? '';
      setDriving(Boolean(v) && (v.includes('tractor') || v === 'tractor_farm' || v === 'cars/tractor-farm'));
    }, 150);
    return () => clearInterval(timer);
  }, []);

  // Keyboard hotkeys: 1, 2, 3, 4 to switch modes
  useEffect(() => {
    if (!driving || room.kind !== 'farm') return;

    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select, [contenteditable=true]')) return;
      if (useUi.getState().panel || useUi.getState().activity) return;

      if (e.key === '1') {
        play('click');
        setTractorMode('harvest');
        setSeedPickerOpen(false);
      } else if (e.key === '2') {
        play('click');
        setTractorMode('plant');
      } else if (e.key === '3') {
        play('click');
        setTractorMode('water');
        setSeedPickerOpen(false);
      } else if (e.key === '4') {
        play('click');
        setTractorMode('cruise');
        setSeedPickerOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [driving, room.kind, setTractorMode]);

  if (room.kind !== 'farm' || !driving) return null;

  const selectedCrop = Object.values(CROPS).find((c) => c.seedItemId === tractorSeedId);
  const selectedSeedQty = farmMe?.warehouse?.items?.find((it) => it.itemId === tractorSeedId)?.quantity ?? 0;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 76,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 900,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        pointerEvents: 'auto',
      }}
    >
      {/* Seed Picker Popover */}
      {seedPickerOpen && (
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: 14,
            padding: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            width: 320,
            maxWidth: '92vw',
            marginBottom: 4,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              paddingBottom: 6,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fef08a' }}>
              🌱 Chọn Hạt Giống Gieo Bằng Máy Cày
            </span>
            <button
              onClick={() => setSeedPickerOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: 2,
              }}
            >
              <X size={16} />
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 6,
              maxHeight: 200,
              overflowY: 'auto',
            }}
          >
            {Object.values(CROPS).map((crop) => {
              const inStock =
                farmMe?.warehouse?.items?.find((it) => it.itemId === crop.seedItemId)?.quantity ?? 0;
              const isSelected = tractorSeedId === crop.seedItemId;

              return (
                <button
                  key={crop.id}
                  onClick={() => {
                    play('click');
                    setTractorSeedId(crop.seedItemId);
                    setSeedPickerOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 8px',
                    borderRadius: 8,
                    background: isSelected ? 'rgba(234, 179, 8, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                    border: isSelected ? '1px solid #facc15' : '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: inStock > 0 ? '#f8fafc' : '#64748b',
                  }}
                >
                  <img
                    src={farmItemIcon(crop.seedItemId, 24)}
                    alt=""
                    style={{ width: 22, height: 22, imageRendering: 'pixelated' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {crop.name.split(' ')[0]} {crop.name.split(' ')[1] ?? ''}
                    </div>
                    <div style={{ fontSize: 9, color: inStock > 0 ? '#4ade80' : '#ef4444' }}>
                      {inStock > 0 ? `Còn ${inStock}` : 'Hết kho'}
                    </div>
                  </div>
                  {isSelected && <Check size={14} color="#facc15" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Floating Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(10px)',
          padding: '6px 12px',
          borderRadius: 24,
          border: '1px solid rgba(245, 158, 11, 0.4)',
          boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: '#facc15',
            letterSpacing: '0.04em',
            marginRight: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          🚜 MÁY CÀY:
        </span>

        {/* Mode 1: Harvest */}
        <button
          onClick={() => {
            play('click');
            setTractorMode('harvest');
            setSeedPickerOpen(false);
          }}
          title="Phím [1]: Chỉ thu hoạch cây đã chín"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '5px 10px',
            borderRadius: 16,
            background:
              tractorMode === 'harvest'
                ? 'linear-gradient(135deg, #ca8a04, #eab308)'
                : 'rgba(255, 255, 255, 0.08)',
            border: tractorMode === 'harvest' ? '1px solid #fef08a' : '1px solid rgba(255, 255, 255, 0.1)',
            color: tractorMode === 'harvest' ? '#0f172a' : '#e2e8f0',
            fontWeight: 700,
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          <Scissors size={13} />
          <span>[1] Thu Hoạch</span>
        </button>

        {/* Mode 2: Plant with selected seed */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={() => {
              play('click');
              setTractorMode('plant');
            }}
            title="Phím [2]: Tự động gieo hạt giống đã chọn vào ô đất trống"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '5px 10px',
              borderRadius: tractorMode === 'plant' ? '16px 0 0 16px' : 16,
              background:
                tractorMode === 'plant'
                  ? 'linear-gradient(135deg, #15803d, #22c55e)'
                  : 'rgba(255, 255, 255, 0.08)',
              border: tractorMode === 'plant' ? '1px solid #86efac' : '1px solid rgba(255, 255, 255, 0.1)',
              color: tractorMode === 'plant' ? '#ffffff' : '#e2e8f0',
              fontWeight: 700,
              fontSize: 11,
              cursor: 'pointer',
            }}
          >
            <Sprout size={13} />
            <span>[2] Gieo Hạt</span>
          </button>

          {/* Seed Selector Trigger */}
          {tractorMode === 'plant' && (
            <button
              onClick={() => {
                play('click');
                setSeedPickerOpen((v) => !v);
              }}
              title="Nhấn để đổi hạt giống muốn gieo"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '5px 8px',
                borderRadius: '0 16px 16px 0',
                background: 'rgba(21, 128, 61, 0.85)',
                border: '1px solid #86efac',
                borderLeft: 'none',
                color: '#fef08a',
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <img
                src={farmItemIcon(tractorSeedId, 20)}
                alt=""
                style={{ width: 16, height: 16, imageRendering: 'pixelated' }}
              />
              <span>
                {selectedCrop ? selectedCrop.name.split(' ')[0] : 'Chọn hạt'} ({selectedSeedQty})
              </span>
              <ChevronDown size={12} />
            </button>
          )}
        </div>

        {/* Mode 3: Water & Till */}
        <button
          onClick={() => {
            play('click');
            setTractorMode('water');
            setSeedPickerOpen(false);
          }}
          title="Phím [3]: Cày xới và tưới nước cho các ô đất khô"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '5px 10px',
            borderRadius: 16,
            background:
              tractorMode === 'water'
                ? 'linear-gradient(135deg, #0284c7, #38bdf8)'
                : 'rgba(255, 255, 255, 0.08)',
            border: tractorMode === 'water' ? '1px solid #bae6fd' : '1px solid rgba(255, 255, 255, 0.1)',
            color: tractorMode === 'water' ? '#0f172a' : '#e2e8f0',
            fontWeight: 700,
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          <Droplet size={13} />
          <span>[3] Tưới Nước</span>
        </button>

        {/* Mode 4: Cruise (Lái Dạo) */}
        <button
          onClick={() => {
            play('click');
            setTractorMode('cruise');
            setSeedPickerOpen(false);
          }}
          title="Phím [4]: Lái dạo tự do, không tác động ruộng"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '5px 10px',
            borderRadius: 16,
            background:
              tractorMode === 'cruise'
                ? 'linear-gradient(135deg, #475569, #64748b)'
                : 'rgba(255, 255, 255, 0.08)',
            border: tractorMode === 'cruise' ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.1)',
            color: '#f8fafc',
            fontWeight: 700,
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          <Gauge size={13} />
          <span>[4] Lái Dạo</span>
        </button>
      </div>
    </div>
  );
}
