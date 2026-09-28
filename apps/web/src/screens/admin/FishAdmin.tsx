import { FISH, type Appearance, type FishHabitat, type FishSpecies } from '@cozy/game-data';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Fish, Layers, RotateCcw, Save, Search, Sliders, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { drawAvatar, type Dir } from '../../art/avatar';
import { fishIcon, fishRenderDimensions } from '../../art/fish';
import { chibiAvatarFull, chibiTrophyScene } from '../../art/chibi';
import { api, type Me } from '../../lib/api';
import { play } from '../../lib/sound';
import { useUi } from '../../lib/store';
import { Button, toastError } from '../../ui/primitives';

export interface AdminFishSpecies extends FishSpecies {
  defaultMinSizeCm: number;
  defaultMaxSizeCm: number;
  isOverridden: boolean;
}

const HABITAT_LABELS: Record<FishHabitat, string> = {
  ocean: 'Biển Cả',
  freshwater: 'Nước Ngọt',
  mythic: 'Huyền Bí',
};

const RARITY_LABELS: Record<string, { label: string; color: string }> = {
  common: { label: 'Phổ biến', color: '#94a3b8' },
  rare: { label: 'Hiếm có', color: '#38bdf8' },
  epic: { label: 'Sử thi', color: '#c084fc' },
  legendary: { label: 'Huyền thoại', color: '#fbbf24' },
};

export function FishAdminPage() {
  const qc = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(['blue_whale']));
  const [habitat, setHabitat] = useState<FishHabitat | 'all'>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'overridden' | 'default'>('all');

  // Fetch admin fish definitions
  const fishQuery = useQuery({
    queryKey: ['admin-fish'],
    queryFn: () => api<AdminFishSpecies[]>('/admin/fish'),
  });

  const meQuery = useQuery<Me>({
    queryKey: ['me'],
    queryFn: () => api<Me>('/me'),
  });

  const allFish =
    fishQuery.data ??
    (FISH.map((f) => ({
      ...f,
      defaultMinSizeCm: f.minSizeCm,
      defaultMaxSizeCm: f.maxSizeCm,
      isOverridden: false,
    })) as AdminFishSpecies[]);

  const filteredFish = useMemo(() => {
    return allFish.filter((f) => {
      if (habitat !== 'all' && f.habitat !== habitat) return false;
      if (statusFilter === 'overridden' && !f.isOverridden) return false;
      if (statusFilter === 'default' && f.isOverridden) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return f.name.toLowerCase().includes(q) || f.id.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allFish, habitat, statusFilter, search]);

  const selectedFishList = useMemo(() => {
    return allFish.filter((f) => selectedIds.has(f.id));
  }, [allFish, selectedIds]);

  const toggleSelect = (id: string, selected?: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const isNowSelected = selected !== undefined ? selected : !next.has(id);
      if (isNowSelected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const f of filteredFish) next.add(f.id);
      return next;
    });
  };

  const deselectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const f of filteredFish) next.delete(f.id);
      return next;
    });
  };

  const isAllFilteredSelected = filteredFish.length > 0 && filteredFish.every((f) => selectedIds.has(f.id));

  const overriddenCount = allFish.filter((f) => f.isOverridden).length;

  return (
    <div className="stack" style={{ gap: 20 }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 22, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Fish size={24} style={{ color: '#38bdf8' }} />
            Quản Trị Từ Điển Cá & Tinh Chỉnh Kích Thước Pixel
          </h1>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
            Xem toàn bộ 55 loài cá, tinh chỉnh kích thước từng con hoặc chỉnh sửa hàng loạt đồng thời nhiều
            loài với tỷ lệ % hoặc bù trừ cm.
          </p>
        </div>

        {/* Quick Batch Selection Indicator */}
        {selectedFishList.length > 1 ? (
          <div
            className="row"
            style={{
              gap: 8,
              alignItems: 'center',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid #38bdf8',
              borderRadius: 10,
              padding: '6px 14px',
            }}
          >
            <Layers size={18} style={{ color: '#38bdf8' }} />
            <strong style={{ fontSize: 13, color: '#38bdf8' }}>
              Đang chọn {selectedFishList.length} loài cá (Chế độ hàng loạt)
            </strong>
            <button
              type="button"
              className="btn btn-xs btn-ghost"
              onClick={() => setSelectedIds(new Set())}
              style={{ fontSize: 11, marginLeft: 4 }}
            >
              <X size={13} /> Bỏ chọn
            </button>
          </div>
        ) : null}
      </div>

      {/* Main split workbench */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(310px, 390px) 1fr',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* Left: Species List */}
        <div
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            maxHeight: '82vh',
          }}
        >
          {/* Search & Status filter */}
          <div className="row" style={{ gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                placeholder="Tìm theo tên hoặc ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 32px',
                  borderRadius: 8,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: 13,
                }}
              />
              <Search
                size={15}
                style={{ position: 'absolute', left: 10, top: 11, color: 'var(--text-muted)' }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'overridden' | 'default')}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: 12,
              }}
              title="Lọc theo trạng thái chỉnh sửa"
            >
              <option value="all">Mọi trạng thái</option>
              <option value="overridden">Đã sửa ({overriddenCount})</option>
              <option value="default">Mặc định</option>
            </select>
          </div>

          {/* Habitat tabs */}
          <div className="tabs" role="tablist" style={{ fontSize: 12 }}>
            <button
              role="tab"
              className="tab"
              aria-selected={habitat === 'all'}
              onClick={() => setHabitat('all')}
            >
              Tất cả ({allFish.length})
            </button>
            <button
              role="tab"
              className="tab"
              aria-selected={habitat === 'ocean'}
              onClick={() => setHabitat('ocean')}
            >
              Biển ({allFish.filter((f) => f.habitat === 'ocean').length})
            </button>
            <button
              role="tab"
              className="tab"
              aria-selected={habitat === 'freshwater'}
              onClick={() => setHabitat('freshwater')}
            >
              Nước ngọt ({allFish.filter((f) => f.habitat === 'freshwater').length})
            </button>
            <button
              role="tab"
              className="tab"
              aria-selected={habitat === 'mythic'}
              onClick={() => setHabitat('mythic')}
            >
              Huyền bí ({allFish.filter((f) => f.habitat === 'mythic').length})
            </button>
          </div>

          {/* Batch Selection Bar */}
          <div
            className="row"
            style={{
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 10px',
              background: 'var(--surface-2)',
              borderRadius: 8,
              fontSize: 12,
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                userSelect: 'none',
                fontWeight: 600,
              }}
            >
              <input
                type="checkbox"
                checked={isAllFilteredSelected}
                onChange={() => {
                  if (isAllFilteredSelected) deselectAllFiltered();
                  else selectAllFiltered();
                }}
                style={{ width: 15, height: 15, accentColor: '#38bdf8', cursor: 'pointer' }}
              />
              {isAllFilteredSelected
                ? `Bỏ chọn toàn bộ lọc (${filteredFish.length})`
                : `Chọn tất cả (${filteredFish.length})`}
            </label>

            {selectedIds.size > 0 ? (
              <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                <span className="pill pill-primary" style={{ fontSize: 10, padding: '1px 6px' }}>
                  Đã chọn {selectedIds.size}
                </span>
                <button
                  type="button"
                  className="btn btn-xs btn-ghost"
                  onClick={() => setSelectedIds(new Set())}
                  style={{ fontSize: 11, padding: '1px 6px' }}
                >
                  Xóa
                </button>
              </div>
            ) : null}
          </div>

          {/* List items */}
          <div
            style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4 }}
          >
            {filteredFish.map((fish) => {
              const isChecked = selectedIds.has(fish.id);
              const isOnlyActive = selectedIds.size === 1 && isChecked;
              const rarityMeta = RARITY_LABELS[fish.rarity] ?? { label: fish.rarity, color: '#94a3b8' };
              return (
                <div
                  key={fish.id}
                  onClick={(e) => {
                    play('click');
                    if (e.shiftKey) {
                      toggleSelect(fish.id);
                    } else if (selectedIds.size > 1) {
                      toggleSelect(fish.id);
                    } else {
                      setSelectedIds(new Set([fish.id]));
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 10,
                    background: isChecked
                      ? isOnlyActive
                        ? 'rgba(56, 189, 248, 0.16)'
                        : 'rgba(56, 189, 248, 0.1)'
                      : 'var(--surface-2)',
                    border: isChecked ? '1px solid #38bdf8' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Item Checkbox */}
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelect(fish.id, e.target.checked);
                    }}
                    style={{ width: 16, height: 16, accentColor: '#38bdf8', cursor: 'pointer' }}
                  />

                  {/* Fish Sprite Thumbnail */}
                  <div
                    style={{
                      width: 44,
                      height: 36,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(0,0,0,0.25)',
                      borderRadius: 6,
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={fishIcon(fish.id, 2)}
                      alt=""
                      style={{ imageRendering: 'pixelated', maxWidth: '100%', maxHeight: '100%' }}
                    />
                  </div>

                  {/* Fish Metadata */}
                  <div className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {fish.name}
                    </div>
                    <div className="row" style={{ gap: 6, fontSize: 11 }}>
                      <span style={{ color: rarityMeta.color, fontWeight: 700 }}>{rarityMeta.label}</span>
                      <span className="muted">·</span>
                      <span className="muted">
                        {fish.minSizeCm} - {fish.maxSizeCm} cm
                      </span>
                      {fish.isOverridden ? (
                        <span
                          className="pill"
                          style={{ fontSize: 9, padding: '1px 4px', background: '#38bdf8', color: '#0f172a' }}
                        >
                          Đã sửa
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Batch Workbench OR Single Fish Workbench */}
        {selectedFishList.length > 1 ? (
          <BatchFishTunerWorkbench
            selectedFish={selectedFishList}
            onDeselect={(id) => toggleSelect(id, false)}
            onClearSelection={() => setSelectedIds(new Set())}
            onSaved={() => qc.invalidateQueries({ queryKey: ['admin-fish'] })}
          />
        ) : selectedFishList[0] ? (
          <FishTunerWorkbench
            key={`${selectedFishList[0].id}:${selectedFishList[0].minSizeCm}:${selectedFishList[0].maxSizeCm}:${selectedFishList[0].isOverridden}`}
            fish={selectedFishList[0]}
            appearance={meQuery.data?.appearance}
            onSaved={() => qc.invalidateQueries({ queryKey: ['admin-fish'] })}
          />
        ) : (
          <div
            style={{
              background: 'var(--surface-1)',
              border: '1px dashed var(--border)',
              borderRadius: 14,
              padding: 40,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <Fish size={40} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
            <h3 style={{ margin: 0 }}>Chưa chọn loài cá nào</h3>
            <p className="muted" style={{ margin: 0, fontSize: 13, maxWidth: 360 }}>
              Hãy nhấp vào một loài cá từ danh sách bên trái để tinh chỉnh chi tiết, hoặc đánh dấu nhiều ô
              vuông để chỉnh sửa kích thước hàng loạt cùng một lúc.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (allFish[0]) setSelectedIds(new Set([allFish[0].id]));
              }}
            >
              Chọn loài đầu tiên ({allFish[0]?.name ?? 'Cá'})
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function FishSizeSliderBox({
  testSize,
  setTestSize,
  minSize,
  maxSize,
  setMinSize,
  setMaxSize,
  scaleRatio,
}: {
  testSize: number;
  setTestSize: (s: number) => void;
  minSize: number;
  maxSize: number;
  setMinSize?: (s: number) => void;
  setMaxSize?: (s: number) => void;
  scaleRatio: number;
}) {
  const maxSlider = Math.max(maxSize * 1.5, 4500);

  return (
    <div
      className="stack"
      style={{
        gap: 12,
        background: 'rgba(15, 23, 42, 0.55)',
        padding: '14px 18px',
        borderRadius: 14,
        border: '1px solid rgba(56, 189, 248, 0.2)',
      }}
    >
      <div
        className="row"
        style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}
      >
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <strong style={{ fontSize: 14, color: '#38bdf8' }}>Điều Chỉnh Kích Thước Cá (cm):</strong>
          <input
            type="number"
            min={1}
            max={10000}
            value={testSize}
            onChange={(e) => setTestSize(Math.max(1, Number(e.target.value)))}
            style={{
              width: 90,
              padding: '4px 8px',
              borderRadius: 6,
              background: 'var(--surface-2)',
              color: 'var(--text)',
              border: '1px solid #38bdf8',
              fontWeight: 700,
              fontSize: 14,
            }}
          />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            cm ({(testSize / 100).toFixed(2)} mét)
          </span>
        </div>

        <span
          className="pill"
          style={{
            fontWeight: 700,
            background: testSize > 170 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.2)',
            color: testSize > 170 ? '#f87171' : '#38bdf8',
            border: `1px solid ${testSize > 170 ? '#ef4444' : '#38bdf8'}`,
          }}
        >
          {testSize > 170
            ? `🔥 Gấp ${scaleRatio.toFixed(1)}x chiều cao người`
            : `${(scaleRatio * 100).toFixed(0)}% chiều cao người`}
        </span>
      </div>

      <input
        type="range"
        min={Math.min(minSize, 5)}
        max={maxSlider}
        step={1}
        value={testSize}
        onChange={(e) => setTestSize(Number(e.target.value))}
        style={{ width: '100%', cursor: 'pointer' }}
      />

      {/* Direct Sync with Min/Max Controls */}
      {setMinSize && setMaxSize ? (
        <div
          className="row"
          style={{
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px dashed rgba(56, 189, 248, 0.35)',
            borderRadius: 8,
            padding: '8px 12px',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#38bdf8' }}>
              ⚡ Áp dụng cho khoảng lưu:
            </span>
            <button
              type="button"
              className="btn btn-xs btn-primary"
              style={{ fontSize: 11, padding: '3px 8px' }}
              title="Đặt khoảng kích thước ±15% quanh mốc này"
              onClick={() => {
                const low = Math.max(1, Math.round(testSize * 0.85));
                const high = Math.max(low, Math.round(testSize * 1.15));
                setMinSize(low);
                setMaxSize(high);
              }}
            >
              🎯 Đặt khoảng chuẩn ({Math.max(1, Math.round(testSize * 0.85))} -{' '}
              {Math.max(1, Math.round(testSize * 1.15))}cm)
            </button>
            <button
              type="button"
              className="btn btn-xs btn-secondary"
              style={{ fontSize: 11, padding: '3px 8px' }}
              onClick={() => {
                setMinSize(testSize);
                if (maxSize < testSize) setMaxSize(testSize);
              }}
            >
              ⬇️ Đặt Min ({testSize}cm)
            </button>
            <button
              type="button"
              className="btn btn-xs btn-secondary"
              style={{ fontSize: 11, padding: '3px 8px' }}
              onClick={() => {
                setMaxSize(testSize);
                if (minSize > testSize) setMinSize(testSize);
              }}
            >
              ⬆️ Đặt Max ({testSize}cm)
            </button>
          </div>

          {/* Quick scale multipliers for single fish */}
          <div className="row" style={{ gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Nhân tỷ lệ:</span>
            {[0.5, 0.8, 1.2, 1.5, 2.0, 3.0].map((factor) => (
              <button
                key={factor}
                type="button"
                className="btn btn-xs btn-ghost"
                style={{ fontSize: 11, padding: '2px 6px' }}
                onClick={() => {
                  const newMin = Math.max(1, Math.round(minSize * factor));
                  const newMax = Math.max(newMin, Math.round(maxSize * factor));
                  const newTest = Math.max(1, Math.round(testSize * factor));
                  setMinSize(newMin);
                  setMaxSize(newMax);
                  setTestSize(newTest);
                }}
              >
                {factor}x
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div
        className="row"
        style={{
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 6,
          fontSize: 11,
          color: 'var(--text-muted)',
        }}
      >
        <span>
          Khoảng lưu hiện tại:{' '}
          <strong style={{ color: '#38bdf8' }}>
            {minSize} - {maxSize} cm
          </strong>
        </span>

        {/* Quick Size Presets */}
        <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, marginRight: 2 }}>Mốc nhanh:</span>
          <button
            type="button"
            className="btn btn-xs btn-ghost"
            style={{ fontSize: 10, padding: '1px 6px' }}
            onClick={() => setTestSize(30)}
          >
            30cm (Nhỏ)
          </button>
          <button
            type="button"
            className="btn btn-xs btn-ghost"
            style={{ fontSize: 10, padding: '1px 6px' }}
            onClick={() => setTestSize(170)}
          >
            170cm (Người)
          </button>
          <button
            type="button"
            className="btn btn-xs btn-ghost"
            style={{ fontSize: 10, padding: '1px 6px' }}
            onClick={() => setTestSize(450)}
          >
            450cm (2.7x)
          </button>
          <button
            type="button"
            className="btn btn-xs btn-ghost"
            style={{ fontSize: 10, padding: '1px 6px' }}
            onClick={() => setTestSize(1000)}
          >
            10m (5.9x)
          </button>
          <button
            type="button"
            className="btn btn-xs btn-ghost"
            style={{ fontSize: 10, padding: '1px 6px' }}
            onClick={() => setTestSize(2500)}
          >
            25m (14.7x)
          </button>
          <button
            type="button"
            className="btn btn-xs btn-ghost"
            style={{ fontSize: 10, padding: '1px 6px' }}
            onClick={() => setTestSize(3400)}
          >
            34m (Cá voi 20x)
          </button>
        </div>
      </div>
    </div>
  );
}

function FishTunerWorkbench({
  fish,
  appearance,
  onSaved,
}: {
  fish: AdminFishSpecies;
  appearance?: Appearance;
  onSaved: () => void;
}) {
  const [minSize, setMinSize] = useState(fish.minSizeCm);
  const [maxSize, setMaxSize] = useState(fish.maxSizeCm);
  const [testSize, setTestSize] = useState(Math.round((fish.minSizeCm + fish.maxSizeCm) / 2));
  const [previewDir, setPreviewDir] = useState<Dir>(0);

  // Sync internal state if fish prop updates from refetch
  useEffect(() => {
    setMinSize(fish.minSizeCm);
    setMaxSize(fish.maxSizeCm);
    setTestSize(Math.round((fish.minSizeCm + fish.maxSizeCm) / 2));
  }, [fish.id, fish.minSizeCm, fish.maxSizeCm]);

  const [stageMode, setStageMode] = useState<'scale' | 'handheld' | 'chibi'>('chibi');
  const [chibiPose, setChibiPose] = useState<'auto' | 'trophy' | 'holding'>('auto');
  const [modelType, setModelType] = useState<'chibi' | 'pixel'>('chibi');
  const [handheldStyle, setHandheldStyle] = useState<'chibi' | 'pixel'>('chibi');
  const [scaleViewMode, setScaleViewMode] = useState<'scroll' | 'fit'>('scroll');
  const dirty = minSize !== fish.minSizeCm || maxSize !== fish.maxSizeCm;

  const saveMutation = useMutation({
    mutationFn: () =>
      api(`/admin/fish/${fish.id}/size`, {
        method: 'PUT',
        body: { minSizeCm: minSize, maxSizeCm: maxSize },
      }),
    onSuccess: () => {
      play('coin');
      useUi.getState().toast({
        kind: 'reward',
        title: 'Đã lưu kích thước cá',
        body: `Đã lưu kích thước loài ${fish.name} (${minSize} - ${maxSize} cm) thành công!`,
      });
      onSaved();
    },
    onError: (err) => toastError(err, 'Lỗi cập nhật'),
  });

  const resetMutation = useMutation({
    mutationFn: () =>
      api(`/admin/fish/${fish.id}/size`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      play('coin');
      useUi.getState().toast({
        kind: 'info',
        title: 'Đã khôi phục mặc định',
        body: `Đã đưa loài ${fish.name} về kích thước gốc (${fish.defaultMinSizeCm} - ${fish.defaultMaxSizeCm} cm).`,
      });
      setMinSize(fish.defaultMinSizeCm);
      setMaxSize(fish.defaultMaxSizeCm);
      setTestSize(Math.round((fish.defaultMinSizeCm + fish.defaultMaxSizeCm) / 2));
      onSaved();
    },
    onError: (err) => toastError(err, 'Lỗi khôi phục mặc định'),
  });

  // Calculate live handheld avatar preview
  const liveAvatarAppearance = useMemo(() => {
    const base = appearance ?? { skin: 1, hairStyle: 'short', hairColor: 1, baseTop: 0 };
    return {
      ...base,
      heldFish: {
        speciesId: fish.id,
        sizeCm: testSize,
      },
    };
  }, [appearance, fish.id, testSize]);

  // Live avatar canvas (Pixel)
  const avatarPreviewUrl = useMemo(() => {
    return drawAvatar(liveAvatarAppearance, previewDir, 0).toCanvas(6).toDataURL();
  }, [liveAvatarAppearance, previewDir]);

  // Character reference for scale comparison (Pixel)
  const humanRefUrl = useMemo(() => {
    const base = appearance ?? { skin: 1, hairStyle: 'short', hairColor: 1, baseTop: 0 };
    return drawAvatar(base, 0, 0).toCanvas(6).toDataURL();
  }, [appearance]);

  // Live 2D HD Chibi Avatar previews
  const chibiHeldPreviewUrl = useMemo(() => {
    const base = liveAvatarAppearance;
    const pose = chibiPose === 'auto' ? (testSize > 120 ? 'trophy' : 'holding') : chibiPose;
    return chibiAvatarFull(base, 240, 280, {
      pose,
      dir: previewDir,
      showFish: true,
    });
  }, [liveAvatarAppearance, chibiPose, previewDir, testSize]);

  const chibiTrophyUrl = useMemo(() => {
    const base = appearance ?? { skin: 1, hairStyle: 'short', hairColor: 1, baseTop: 0 };
    return chibiTrophyScene(base, fish.id, testSize, 460, 300);
  }, [appearance, fish.id, testSize]);

  const chibiRefUrl = useMemo(() => {
    const base = appearance ?? { skin: 1, hairStyle: 'short', hairColor: 1, baseTop: 0 };
    return chibiAvatarFull(base, 140, 180, { pose: 'idle', scale: 1.15, showFish: false });
  }, [appearance]);

  const { displayScale, baseWidth, baseHeight } = fishRenderDimensions(fish.id, testSize);
  const rarityMeta = RARITY_LABELS[fish.rarity] ?? { label: fish.rarity, color: '#94a3b8' };

  // True Scale Comparison Metrics (Human standard height = 170 cm)
  const humanHeightCm = 170;
  const scaleRatio = testSize / humanHeightCm;
  const baseHumanH = 140;
  const trueFishW = Math.round(baseHumanH * scaleRatio);
  const trueFishH = Math.max(20, Math.round(trueFishW * (baseHeight / baseWidth)));

  // Fit mode calculation (smoothly scales human down to 8px so fish keeps expanding up to 760px)
  const fitMaxStageW = 760;
  const fitZoom = trueFishW > fitMaxStageW ? fitMaxStageW / trueFishW : 1;
  const fitHumanH = Math.max(8, Math.round(baseHumanH * fitZoom));
  const fitFishW = Math.max(28, Math.round(trueFishW * fitZoom));
  const fitFishH = Math.max(20, Math.round(fitFishW * (baseHeight / baseWidth)));

  const stageFishW = scaleViewMode === 'scroll' ? trueFishW : fitFishW;
  const stageFishH = scaleViewMode === 'scroll' ? trueFishH : fitFishH;
  const stageHumanH = scaleViewMode === 'scroll' ? baseHumanH : fitHumanH;

  return (
    <div
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* Header Info */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div className="stack" style={{ gap: 4 }}>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>{fish.name}</h2>
            <span
              className="pill"
              style={{
                background: `${rarityMeta.color}22`,
                color: rarityMeta.color,
                borderColor: rarityMeta.color,
                fontWeight: 700,
              }}
            >
              {rarityMeta.label}
            </span>
            <span className="pill pill-primary">{HABITAT_LABELS[fish.habitat]}</span>
          </div>
          <div className="muted" style={{ fontSize: 13 }}>
            ID định danh: <code>{fish.id}</code> · Giá bán gốc: +{fish.coin} Xu · Danh tiếng: +{fish.fame}
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.5, color: 'var(--text-muted)' }}>
            {fish.description}
          </p>
        </div>

        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          {dirty ? (
            <span
              className="pill"
              style={{
                background: '#f59e0b22',
                color: '#f59e0b',
                border: '1px solid #f59e0b',
                fontWeight: 700,
                fontSize: 11,
              }}
            >
              ⚡ Chưa lưu thay đổi
            </span>
          ) : null}

          {dirty ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setMinSize(fish.minSizeCm);
                setMaxSize(fish.maxSizeCm);
                setTestSize(Math.round((fish.minSizeCm + fish.maxSizeCm) / 2));
              }}
            >
              <RotateCcw size={14} /> Hoàn tác
            </Button>
          ) : null}

          {fish.isOverridden ? (
            <Button
              variant="ghost"
              size="sm"
              loading={resetMutation.isPending}
              onClick={() => resetMutation.mutate()}
              title={`Khôi phục về mặc định gốc: ${fish.defaultMinSizeCm} - ${fish.defaultMaxSizeCm} cm`}
              style={{ color: '#f87171' }}
            >
              <RotateCcw size={14} /> Khôi phục mặc định ({fish.defaultMinSizeCm} - {fish.defaultMaxSizeCm}{' '}
              cm)
            </Button>
          ) : null}

          <Button
            variant="primary"
            disabled={!dirty || minSize > maxSize}
            loading={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            <Save size={15} /> Lưu Kích Thước ({minSize} - {maxSize} cm)
          </Button>
        </div>
      </div>

      {/* Stage Mode Switcher: Scale Comparison (Cá To Hơn Người) vs Handheld (Cầm trên tay) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div className="tabs" role="tablist" style={{ margin: 0 }}>
          <button
            role="tab"
            className="tab"
            aria-selected={stageMode === 'chibi'}
            onClick={() => setStageMode('chibi')}
          >
            ✨ Trình Diễn 2D HD Chibi (Dave the Diver & MapleStory)
          </button>
          <button
            role="tab"
            className="tab"
            aria-selected={stageMode === 'scale'}
            onClick={() => setStageMode('scale')}
          >
            📏 So Sánh Tỷ Lệ Thực Tế (Cá To Hơn Nhân Vật)
          </button>
          <button
            role="tab"
            className="tab"
            aria-selected={stageMode === 'handheld'}
            onClick={() => setStageMode('handheld')}
          >
            🎒 Cầm Trên Tay (Thực Tế Nhân Vật)
          </button>
        </div>

        {testSize > 170 ? (
          <span
            className="pill"
            style={{
              background: 'rgba(239, 68, 68, 0.18)',
              color: '#f87171',
              border: '1px solid #ef4444',
              fontWeight: 700,
            }}
          >
            🔥 Cá TO HƠN Nhân Vật ({scaleRatio.toFixed(1)}x)
          </span>
        ) : (
          <span className="pill pill-primary">Cá bằng {(scaleRatio * 100).toFixed(0)}% chiều cao người</span>
        )}
      </div>

      {/* STAGE CONTAINER */}
      {stageMode === 'chibi' ? (
        /* MODE 0: 2D HD CHIBI SHOWCASE */
        <div
          style={{
            background: 'radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, rgba(15, 23, 42, 0.4) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: 14,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          {/* Submode & Controls Bar */}
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
              <span
                className="pill pill-primary"
                style={{
                  fontWeight: 700,
                  background: 'rgba(56, 189, 248, 0.18)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                }}
              >
                ✨ 2D HD Chibi Engine (Anime Eyes, Smooth Shading, Specular Hair)
              </span>
            </div>

            <div className="row" style={{ gap: 6, alignItems: 'center' }}>
              <span className="muted" style={{ fontSize: 12 }}>
                Tư thế cầm:
              </span>
              <button
                type="button"
                className={`btn btn-xs ${chibiPose === 'auto' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setChibiPose('auto')}
              >
                ⚡ Tự động ({testSize > 120 ? 'Giơ bổng' : 'Ôm ngực'})
              </button>
              <button
                type="button"
                className={`btn btn-xs ${chibiPose === 'trophy' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setChibiPose('trophy')}
              >
                🏆 Giơ bổng qua đầu
              </button>
              <button
                type="button"
                className={`btn btn-xs ${chibiPose === 'holding' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setChibiPose('holding')}
              >
                🤲 Ôm trước ngực
              </button>
            </div>
          </div>

          {/* Visual Showcase Box */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(280px, 340px) 1fr',
              gap: 20,
              alignItems: 'stretch',
            }}
          >
            {/* Left: HD Chibi Character Figure */}
            <div
              className="stack"
              style={{
                alignItems: 'center',
                gap: 12,
                background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.6) 0%, rgba(15, 23, 42, 0.95) 100%)',
                padding: 18,
                borderRadius: 14,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: 270,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage:
                      'radial-gradient(circle at center, rgba(56, 189, 248, 0.15) 0%, transparent 70%)',
                    pointerEvents: 'none',
                  }}
                />
                <img
                  src={chibiHeldPreviewUrl}
                  alt={`HD Chibi cầm ${fish.name}`}
                  style={{
                    maxHeight: '100%',
                    maxWidth: '100%',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 12px 28px rgba(0, 0, 0, 0.65))',
                  }}
                />
              </div>

              {/* Angle selector for Chibi */}
              <div className="row" style={{ gap: 4 }}>
                <Button
                  size="sm"
                  variant={previewDir === 0 ? 'primary' : 'ghost'}
                  onClick={() => setPreviewDir(0)}
                >
                  ⬇️ Trực diện
                </Button>
                <Button
                  size="sm"
                  variant={previewDir === 1 ? 'primary' : 'ghost'}
                  onClick={() => setPreviewDir(1)}
                >
                  ➡️ Nghiêng
                </Button>
                <Button
                  size="sm"
                  variant={previewDir === 3 ? 'primary' : 'ghost'}
                  onClick={() => setPreviewDir(3)}
                >
                  ⬆️ Sau lưng
                </Button>
              </div>
            </div>

            {/* Right: Trophy Celebration Banner Card */}
            <div
              className="stack"
              style={{
                gap: 12,
                background: 'rgba(0, 0, 0, 0.3)',
                padding: 18,
                borderRadius: 14,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                justifyContent: 'space-between',
              }}
            >
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: 14, color: '#fef08a' }}>
                  🎉 Trình Diễn Kéo Cá (Trophy Catch Banner)
                </strong>
                <span className="pill pill-primary" style={{ fontSize: 11 }}>
                  2D HD Animation Ready
                </span>
              </div>

              <div
                style={{
                  borderRadius: 10,
                  overflow: 'hidden',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}
              >
                <img
                  src={chibiTrophyUrl}
                  alt={`Trophy catch ${fish.name}`}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 8,
                  fontSize: 12,
                }}
              >
                <div style={{ background: 'var(--surface-2)', padding: '6px 10px', borderRadius: 8 }}>
                  <div className="muted" style={{ fontSize: 10 }}>
                    KÍCH THƯỚC
                  </div>
                  <strong>{testSize} cm</strong>
                </div>
                <div style={{ background: 'var(--surface-2)', padding: '6px 10px', borderRadius: 8 }}>
                  <div className="muted" style={{ fontSize: 10 }}>
                    SO VỚI NGƯỜI
                  </div>
                  <strong style={{ color: testSize > 170 ? '#f87171' : '#38bdf8' }}>
                    {testSize > 170
                      ? `To hơn (${scaleRatio.toFixed(1)}x)`
                      : `${(scaleRatio * 100).toFixed(0)}% người`}
                  </strong>
                </div>
                <div style={{ background: 'var(--surface-2)', padding: '6px 10px', borderRadius: 8 }}>
                  <div className="muted" style={{ fontSize: 10 }}>
                    GIÁ TRỊ CƠ BẢN
                  </div>
                  <strong style={{ color: '#fbbf24' }}>+{fish.coin} Xu</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Test Size Slider */}
          <FishSizeSliderBox
            testSize={testSize}
            setTestSize={setTestSize}
            minSize={minSize}
            maxSize={maxSize}
            setMinSize={setMinSize}
            setMaxSize={setMaxSize}
            scaleRatio={scaleRatio}
          />
        </div>
      ) : stageMode === 'scale' ? (
        /* MODE 1: SCALE COMPARISON (Cá To Hơn Nhân Vật) */
        <div
          style={{
            background: 'radial-gradient(circle, rgba(14, 165, 233, 0.08) 0%, rgba(15, 23, 42, 0.3) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: 14,
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* Subheader: View mode toggle & scale stats */}
          <div
            className="row"
            style={{
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <span className="pill pill-primary" style={{ fontWeight: 700 }}>
                📏 So Sánh Chiều Dài Thực Tế vs Người (1.70m)
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: testSize > 170 ? '#f87171' : '#38bdf8',
                  fontWeight: 600,
                }}
              >
                {testSize > 170
                  ? `🔥 Cá dài ${(testSize / 100).toFixed(2)} mét (Gấp ${scaleRatio.toFixed(1)} lần người!)`
                  : `Cá dài ${(testSize / 100).toFixed(2)}m (${(scaleRatio * 100).toFixed(0)}% người)`}
              </span>
            </div>

            <div className="row" style={{ gap: 6 }}>
              <button
                type="button"
                className={`btn btn-xs ${scaleViewMode === 'scroll' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setScaleViewMode('scroll')}
                title="Giữ nguyên tỷ lệ 1:1 và cuộn ngang để cảm nhận kích thước thật"
              >
                ↔️ Cuộn Ngang 1:1 (Kích Thước Thật)
              </button>
              <button
                type="button"
                className={`btn btn-xs ${scaleViewMode === 'fit' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setScaleViewMode('fit')}
                title="Tự động thu nhỏ để nhìn toàn cảnh trong một khung hình"
              >
                📐 Thu Nhỏ Vừa Khung
              </button>
            </div>
          </div>

          {/* Visual Showcase Stage */}
          <div
            style={{
              minHeight: 280,
              background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.7) 0%, rgba(15, 23, 42, 0.95) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 12,
              position: 'relative',
              overflowX: scaleViewMode === 'scroll' ? 'auto' : 'hidden',
              overflowY: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: '30px 20px 14px',
            }}
          >
            {/* Stage content container */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 28,
                minWidth: scaleViewMode === 'scroll' ? stageFishW + 200 : '100%',
                justifyContent: scaleViewMode === 'scroll' ? 'flex-start' : 'center',
                paddingLeft: scaleViewMode === 'scroll' ? 20 : 0,
              }}
            >
              {/* Human Reference Figure (170 cm) */}
              <div className="stack" style={{ alignItems: 'center', gap: 6, zIndex: 1, flexShrink: 0 }}>
                <div className="row" style={{ gap: 4, marginBottom: 2 }}>
                  <button
                    type="button"
                    className={`btn btn-xs ${modelType === 'chibi' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: 10, padding: '2px 6px' }}
                    onClick={() => setModelType('chibi')}
                  >
                    ✨ Chibi HD
                  </button>
                  <button
                    type="button"
                    className={`btn btn-xs ${modelType === 'pixel' ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: 10, padding: '2px 6px' }}
                    onClick={() => setModelType('pixel')}
                  >
                    👾 Pixel
                  </button>
                </div>
                <div
                  style={{
                    height: stageHumanH,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <img
                    src={modelType === 'chibi' ? chibiRefUrl : humanRefUrl}
                    alt="Nhân vật người (170 cm)"
                    style={{
                      height: '100%',
                      imageRendering: modelType === 'chibi' ? 'auto' : 'pixelated',
                      filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.6))',
                    }}
                  />
                </div>
                <div
                  className="pill pill-primary"
                  style={{
                    fontSize: 10,
                    padding: '1px 6px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  👤 Người (1.7m)
                </div>
              </div>

              {/* Proportional Scaled Fish (testSize cm) */}
              <div className="stack" style={{ alignItems: 'center', gap: 6, zIndex: 1, flexShrink: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    minHeight: stageHumanH,
                  }}
                >
                  <img
                    src={fishIcon(fish.id, 4)}
                    alt={fish.name}
                    style={{
                      width: stageFishW,
                      height: stageFishH,
                      imageRendering: 'pixelated',
                      filter: 'drop-shadow(0 12px 32px rgba(56, 189, 248, 0.45))',
                      transition: 'all 0.1s ease',
                    }}
                  />
                </div>
                <div
                  className="pill"
                  style={{
                    fontSize: 11,
                    padding: '3px 10px',
                    fontWeight: 700,
                    background: testSize > 170 ? '#ef4444' : '#38bdf8',
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                  }}
                >
                  🐟 {fish.name} ({testSize} cm / {(testSize / 100).toFixed(1)}m · {scaleRatio.toFixed(1)}x)
                </div>
              </div>
            </div>

            {/* Metric Measuring Tape / Floor Ruler (Thước đo mét) */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                minWidth: scaleViewMode === 'scroll' ? stageFishW + 200 : '100%',
                height: 26,
                marginTop: 14,
                borderTop: '2px solid rgba(56, 189, 248, 0.3)',
                paddingLeft: scaleViewMode === 'scroll' ? 20 : 0,
              }}
            >
              {scaleViewMode === 'scroll' ? (
                Array.from({ length: Math.ceil(testSize / 100) + 2 }).map((_, m) => {
                  const px = Math.round(m * (140 / 1.7));
                  const isMajor = m % 5 === 0 || m === 0 || m === 1;
                  return (
                    <div
                      key={m}
                      style={{
                        position: 'absolute',
                        left: px,
                        top: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: 1,
                          height: isMajor ? 9 : 4,
                          background: isMajor ? '#38bdf8' : 'rgba(255,255,255,0.3)',
                        }}
                      />
                      {isMajor ? (
                        <span style={{ fontSize: 9, color: '#38bdf8', marginTop: 2, fontWeight: 600 }}>
                          {m}m
                        </span>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div
                  className="row"
                  style={{
                    justifyContent: 'space-between',
                    fontSize: 10,
                    color: 'var(--text-muted)',
                    paddingTop: 4,
                  }}
                >
                  <span>0m</span>
                  <span>1.7m (Người)</span>
                  <span>{(testSize / 200).toFixed(1)}m</span>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                    {(testSize / 100).toFixed(1)}m ({fish.name})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Test Size Slider */}
          <FishSizeSliderBox
            testSize={testSize}
            setTestSize={setTestSize}
            minSize={minSize}
            maxSize={maxSize}
            setMinSize={setMinSize}
            setMaxSize={setMaxSize}
            scaleRatio={scaleRatio}
          />
        </div>
      ) : (
        /* MODE 2: HANDHELD ON CHARACTER */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(220px, 280px) 1fr',
            gap: 20,
            background: 'radial-gradient(circle, rgba(14, 165, 233, 0.08) 0%, rgba(15, 23, 42, 0.3) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: 14,
            padding: 18,
            alignItems: 'center',
          }}
        >
          {/* Handheld Character Stage */}
          <div className="stack" style={{ alignItems: 'center', gap: 10 }}>
            {/* Style switch: Chibi HD vs Pixel */}
            <div className="row" style={{ gap: 4, marginBottom: 2 }}>
              <button
                type="button"
                className={`btn btn-xs ${handheldStyle === 'chibi' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: 11 }}
                onClick={() => setHandheldStyle('chibi')}
              >
                ✨ Chibi HD (Rõ Nét)
              </button>
              <button
                type="button"
                className={`btn btn-xs ${handheldStyle === 'pixel' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: 11 }}
                onClick={() => setHandheldStyle('pixel')}
              >
                👾 Pixel Cổ Điển
              </button>
            </div>

            <div
              style={{
                width: 170,
                height: 220,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.35)',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                overflow: 'hidden',
              }}
            >
              <img
                src={handheldStyle === 'chibi' ? chibiHeldPreviewUrl : avatarPreviewUrl}
                alt="Nhân vật cầm cá"
                style={{
                  maxHeight: '92%',
                  maxWidth: '92%',
                  objectFit: 'contain',
                  imageRendering: handheldStyle === 'chibi' ? 'auto' : 'pixelated',
                  filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.5))',
                }}
              />
            </div>

            {/* Direction Selector */}
            <div className="row" style={{ gap: 4 }}>
              <Button
                size="sm"
                variant={previewDir === 0 ? 'primary' : 'ghost'}
                onClick={() => setPreviewDir(0)}
                title="Nhìn thẳng phía trước"
              >
                ⬇️ Thẳng
              </Button>
              <Button
                size="sm"
                variant={previewDir === 1 ? 'primary' : 'ghost'}
                onClick={() => setPreviewDir(1)}
                title="Nhìn nghiêng (profile)"
              >
                ➡️ Nghiêng
              </Button>
              <Button
                size="sm"
                variant={previewDir === 3 ? 'primary' : 'ghost'}
                onClick={() => setPreviewDir(3)}
                title="Nhìn từ sau lưng"
              >
                ⬆️ Sau lưng
              </Button>
            </div>
            <span className="muted" style={{ fontSize: 11 }}>
              Góc nhìn nhân vật khi cầm cá
            </span>
          </div>

          {/* Test Size Slider */}
          <div className="stack" style={{ gap: 14 }}>
            <FishSizeSliderBox
              testSize={testSize}
              setTestSize={setTestSize}
              minSize={minSize}
              maxSize={maxSize}
              setMinSize={setMinSize}
              setMaxSize={setMaxSize}
              scaleRatio={scaleRatio}
            />

            {/* Live Specs Card */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 10,
                background: 'var(--surface-2)',
                borderRadius: 10,
                padding: 12,
                border: '1px solid var(--border)',
              }}
            >
              <div>
                <span className="muted" style={{ fontSize: 11 }}>
                  Cỡ phân loại
                </span>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#f59e0b' }}>
                  {testSize > maxSize * 0.85
                    ? '🏆 Siêu to khổng lồ'
                    : testSize > maxSize * 0.6
                      ? '⭐ Cỡ lớn'
                      : testSize < minSize + (maxSize - minSize) * 0.25
                        ? 'Bé nhỏ xinh xắn'
                        : 'Tiêu chuẩn'}
                </div>
              </div>
              <div>
                <span className="muted" style={{ fontSize: 11 }}>
                  Kích thước vẽ UI gốc
                </span>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  {baseWidth} × {baseHeight} px (Scale {displayScale}x)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Min & Max Size Tuning Controls */}
      <div
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sliders size={18} style={{ color: '#38bdf8' }} />
          Thiết Lập Giới Hạn Chiều Dài (Min & Max cm)
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {/* Min size */}
          <div className="stack" style={{ gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Chiều dài tối thiểu (minSizeCm):</label>
            <div className="row" style={{ gap: 8 }}>
              <input
                type="number"
                min={1}
                max={maxSize}
                value={minSize}
                onChange={(e) => {
                  const val = Math.max(1, Number(e.target.value));
                  setMinSize(val);
                  if (testSize < val) setTestSize(val);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              />
              <span className="muted" style={{ alignSelf: 'center' }}>
                cm
              </span>
            </div>
            <span className="muted" style={{ fontSize: 11 }}>
              Mặc định hệ thống: {fish.defaultMinSizeCm} cm
            </span>
          </div>

          {/* Max size */}
          <div className="stack" style={{ gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Chiều dài tối đa (maxSizeCm):</label>
            <div className="row" style={{ gap: 8 }}>
              <input
                type="number"
                min={minSize}
                max={10000}
                value={maxSize}
                onChange={(e) => {
                  const val = Math.max(minSize, Number(e.target.value));
                  setMaxSize(val);
                  if (testSize > val) setTestSize(val);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              />
              <span className="muted" style={{ alignSelf: 'center' }}>
                cm
              </span>
            </div>
            <span className="muted" style={{ fontSize: 11 }}>
              Mặc định hệ thống: {fish.defaultMaxSizeCm} cm
            </span>
          </div>
        </div>

        {minSize > maxSize ? (
          <div style={{ color: '#ef4444', fontSize: 12 }}>
            ⚠️ Chiều dài tối đa phải lớn hơn hoặc bằng chiều dài tối thiểu!
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BatchFishTunerWorkbench({
  selectedFish,
  onDeselect,
  onClearSelection,
  onSaved,
}: {
  selectedFish: AdminFishSpecies[];
  onDeselect: (id: string) => void;
  onClearSelection: () => void;
  onSaved: () => void;
}) {
  const [batchMode, setBatchMode] = useState<'scale' | 'offset' | 'fixed' | 'reset'>('scale');
  const [scaleMultiplier, setScaleMultiplier] = useState<number>(1.5);
  const [offsetCm, setOffsetCm] = useState<number>(50);
  const [fixedMin, setFixedMin] = useState<number>(50);
  const [fixedMax, setFixedMax] = useState<number>(150);
  const [searchDiff, setSearchDiff] = useState('');

  // Calculate planned updates for each fish
  const diffItems = useMemo(() => {
    return selectedFish.map((f) => {
      let targetMin = f.minSizeCm;
      let targetMax = f.maxSizeCm;

      if (batchMode === 'scale') {
        targetMin = Math.max(1, Math.round(f.minSizeCm * scaleMultiplier));
        targetMax = Math.max(targetMin, Math.round(f.maxSizeCm * scaleMultiplier));
      } else if (batchMode === 'offset') {
        targetMin = Math.max(1, Math.round(f.minSizeCm + offsetCm));
        targetMax = Math.max(targetMin, Math.round(f.maxSizeCm + offsetCm));
      } else if (batchMode === 'fixed') {
        targetMin = Math.max(1, fixedMin);
        targetMax = Math.max(targetMin, fixedMax);
      } else if (batchMode === 'reset') {
        targetMin = f.defaultMinSizeCm;
        targetMax = f.defaultMaxSizeCm;
      }

      const hasChanged = targetMin !== f.minSizeCm || targetMax !== f.maxSizeCm;
      const minDelta = targetMin - f.minSizeCm;
      const maxDelta = targetMax - f.maxSizeCm;
      const avgDeltaPct =
        (((targetMin + targetMax) / 2 - (f.minSizeCm + f.maxSizeCm) / 2) /
          Math.max(1, (f.minSizeCm + f.maxSizeCm) / 2)) *
        100;

      return {
        fish: f,
        targetMin,
        targetMax,
        hasChanged,
        minDelta,
        maxDelta,
        avgDeltaPct,
      };
    });
  }, [selectedFish, batchMode, scaleMultiplier, offsetCm, fixedMin, fixedMax]);

  const hasAnyChange =
    diffItems.some((d) => d.hasChanged) ||
    (batchMode === 'reset' && selectedFish.some((f) => f.isOverridden));

  const filteredDiffItems = useMemo(() => {
    if (!searchDiff.trim()) return diffItems;
    const q = searchDiff.trim().toLowerCase();
    return diffItems.filter(
      (d) => d.fish.name.toLowerCase().includes(q) || d.fish.id.toLowerCase().includes(q),
    );
  }, [diffItems, searchDiff]);

  const batchMutation = useMutation({
    mutationFn: async () => {
      if (batchMode === 'reset') {
        return api('/admin/fish/batch-reset', {
          method: 'POST',
          body: { ids: selectedFish.map((f) => f.id) },
        });
      } else {
        const updates = diffItems.map((d) => ({
          id: d.fish.id,
          minSizeCm: d.targetMin,
          maxSizeCm: d.targetMax,
        }));
        return api('/admin/fish/batch-size', {
          method: 'PUT',
          body: { updates },
        });
      }
    },
    onSuccess: () => {
      play('coin');
      useUi.getState().toast({
        kind: 'reward',
        title: batchMode === 'reset' ? 'Khôi phục mặc định thành công' : 'Cập nhật hàng loạt thành công',
        body:
          batchMode === 'reset'
            ? `Đã đưa ${selectedFish.length} loài cá về kích thước gốc ban đầu!`
            : `Đã áp dụng kích thước mới cho ${selectedFish.length} loài cá!`,
      });
      onSaved();
    },
    onError: (err) => toastError(err, 'Lỗi cập nhật hàng loạt'),
  });

  return (
    <div
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div className="stack" style={{ gap: 4 }}>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <Layers size={22} style={{ color: '#38bdf8' }} />
            <h2 style={{ margin: 0, fontSize: 20 }}>
              Chỉnh Sửa Kích Thước Hàng Loạt ({selectedFish.length} loài đã chọn)
            </h2>
            <span
              className="pill"
              style={{
                background: 'rgba(56, 189, 248, 0.2)',
                color: '#38bdf8',
                border: '1px solid #38bdf8',
                fontWeight: 700,
              }}
            >
              Batch Mode
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            Điều chỉnh kích thước đồng thời cho nhiều loài cá bằng tỷ lệ nhân %, bù trừ cm, hoặc gán khoảng
            chung.
          </p>
        </div>

        <div className="row" style={{ gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            <X size={14} /> Hủy chọn tất cả
          </Button>
          <Button
            variant="primary"
            disabled={!hasAnyChange}
            loading={batchMutation.isPending}
            onClick={() => batchMutation.mutate()}
          >
            <Save size={15} /> Lưu Thay Đổi ({selectedFish.length} loài)
          </Button>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      <div className="tabs" role="tablist" style={{ margin: 0 }}>
        <button
          role="tab"
          className="tab"
          aria-selected={batchMode === 'scale'}
          onClick={() => setBatchMode('scale')}
        >
          📐 Nhân Tỷ Lệ (x1.5, x2, x0.8…)
        </button>
        <button
          role="tab"
          className="tab"
          aria-selected={batchMode === 'offset'}
          onClick={() => setBatchMode('offset')}
        >
          ➕ Cộng / Trừ cm Cố Định (±cm)
        </button>
        <button
          role="tab"
          className="tab"
          aria-selected={batchMode === 'fixed'}
          onClick={() => setBatchMode('fixed')}
        >
          🎯 Gán Khoảng Cố Định (Min & Max)
        </button>
        <button
          role="tab"
          className="tab"
          aria-selected={batchMode === 'reset'}
          onClick={() => setBatchMode('reset')}
        >
          🔄 Khôi Phục Mặc Định Gốc
        </button>
      </div>

      {/* Mode Control Panel Box */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.55)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          borderRadius: 12,
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {batchMode === 'scale' ? (
          <div className="stack" style={{ gap: 12 }}>
            <div
              className="row"
              style={{
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                <strong style={{ fontSize: 14, color: '#38bdf8' }}>Hệ số nhân kích thước:</strong>
                <input
                  type="number"
                  min={0.05}
                  max={50}
                  step={0.05}
                  value={scaleMultiplier}
                  onChange={(e) => setScaleMultiplier(Math.max(0.05, Number(e.target.value)))}
                  style={{
                    width: 90,
                    padding: '6px 10px',
                    borderRadius: 8,
                    background: 'var(--surface-2)',
                    color: 'var(--text)',
                    border: '1px solid #38bdf8',
                    fontWeight: 700,
                    fontSize: 15,
                  }}
                />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#38bdf8' }}>
                  x (
                  {scaleMultiplier >= 1
                    ? `+${((scaleMultiplier - 1) * 100).toFixed(0)}%`
                    : `${((scaleMultiplier - 1) * 100).toFixed(0)}%`}
                  )
                </span>
              </div>

              {/* Quick Multiplier Presets */}
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                <span className="muted" style={{ fontSize: 12, marginRight: 2 }}>
                  Mốc nhanh:
                </span>
                {[
                  { label: '0.5x (-50%)', val: 0.5 },
                  { label: '0.8x (-20%)', val: 0.8 },
                  { label: '1.2x (+20%)', val: 1.2 },
                  { label: '1.5x (+50%)', val: 1.5 },
                  { label: '2.0x (Gấp 2)', val: 2.0 },
                  { label: '3.0x (Gấp 3)', val: 3.0 },
                  { label: '5.0x (Khổng lồ)', val: 5.0 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    className={`btn btn-xs ${scaleMultiplier === item.val ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: 11, padding: '2px 8px' }}
                    onClick={() => setScaleMultiplier(item.val)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="range"
              min={0.1}
              max={5.0}
              step={0.05}
              value={scaleMultiplier}
              onChange={(e) => setScaleMultiplier(Number(e.target.value))}
              style={{ width: '100%', cursor: 'pointer' }}
            />

            <p className="muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.4 }}>
              💡 <strong>Cơ chế tỷ lệ:</strong> Cả <code>minSizeCm</code> và <code>maxSizeCm</code> của từng
              con cá đã chọn sẽ được nhân với <strong>{scaleMultiplier}x</strong>. Các loài cá nhỏ vẫn giữ tỷ
              lệ nhỏ, cá lớn vẫn giữ tỷ lệ lớn, bảo toàn tính cân bằng sinh thái.
            </p>
          </div>
        ) : batchMode === 'offset' ? (
          <div className="stack" style={{ gap: 12 }}>
            <div
              className="row"
              style={{
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <div className="row" style={{ gap: 10, alignItems: 'center' }}>
                <strong style={{ fontSize: 14, color: '#38bdf8' }}>Lượng cm bù trừ (±cm):</strong>
                <input
                  type="number"
                  min={-5000}
                  max={5000}
                  step={5}
                  value={offsetCm}
                  onChange={(e) => setOffsetCm(Number(e.target.value))}
                  style={{
                    width: 100,
                    padding: '6px 10px',
                    borderRadius: 8,
                    background: 'var(--surface-2)',
                    color: 'var(--text)',
                    border: '1px solid #38bdf8',
                    fontWeight: 700,
                    fontSize: 15,
                  }}
                />
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  cm ({offsetCm >= 0 ? `+${offsetCm} cm` : `${offsetCm} cm`})
                </span>
              </div>

              {/* Quick Offset Presets */}
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                <span className="muted" style={{ fontSize: 12 }}>
                  Mốc nhanh:
                </span>
                {[-50, -20, 10, 50, 100, 300, 500].map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`btn btn-xs ${offsetCm === v ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: 11, padding: '2px 8px' }}
                    onClick={() => setOffsetCm(v)}
                  >
                    {v > 0 ? `+${v}cm` : `${v}cm`}
                  </button>
                ))}
              </div>
            </div>

            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              💡 Cộng hoặc trừ số cm này vào cả <code>minSizeCm</code> và <code>maxSizeCm</code> của tất cả
              loài cá đã chọn (luôn đảm bảo tối thiểu 1cm).
            </p>
          </div>
        ) : batchMode === 'fixed' ? (
          <div className="stack" style={{ gap: 12 }}>
            <div className="row" style={{ gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                <strong style={{ fontSize: 13 }}>Gán Min cố định:</strong>
                <input
                  type="number"
                  min={1}
                  max={fixedMax}
                  value={fixedMin}
                  onChange={(e) => setFixedMin(Math.max(1, Number(e.target.value)))}
                  style={{
                    width: 90,
                    padding: '6px 10px',
                    borderRadius: 8,
                    background: 'var(--surface-2)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                />
                <span className="muted">cm</span>
              </div>

              <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                <strong style={{ fontSize: 13 }}>Gán Max cố định:</strong>
                <input
                  type="number"
                  min={fixedMin}
                  max={10000}
                  value={fixedMax}
                  onChange={(e) => setFixedMax(Math.max(fixedMin, Number(e.target.value)))}
                  style={{
                    width: 90,
                    padding: '6px 10px',
                    borderRadius: 8,
                    background: 'var(--surface-2)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                />
                <span className="muted">cm</span>
              </div>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 12 }}>
              ⚠️ Đặt toàn bộ các loài cá đã chọn có cùng khoảng kích thước{' '}
              <code>
                {fixedMin} - {fixedMax} cm
              </code>
              .
            </p>
          </div>
        ) : (
          <div className="stack" style={{ gap: 6 }}>
            <div className="row" style={{ gap: 8, alignItems: 'center', color: '#fbbf24' }}>
              <RotateCcw size={18} />
              <strong style={{ fontSize: 14 }}>Khôi phục về kích thước mặc định gốc ban đầu</strong>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>
              Tất cả <strong>{selectedFish.length} loài cá đã chọn</strong> sẽ được xóa các giá trị tùy chỉnh
              và khôi phục lại hoàn toàn theo cấu hình gốc ban đầu của trò chơi.
            </p>
          </div>
        )}
      </div>

      {/* Live Diff & Preview List */}
      <div
        className="stack"
        style={{
          gap: 10,
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 14,
        }}
      >
        <div
          className="row"
          style={{
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <strong style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Bảng So Sánh Thay Đổi Thực Tế</span>
            <span className="pill pill-primary" style={{ fontSize: 10 }}>
              {diffItems.filter((d) => d.hasChanged).length} loài sẽ thay đổi
            </span>
          </strong>

          <input
            type="text"
            placeholder="Lọc danh sách đã chọn…"
            value={searchDiff}
            onChange={(e) => setSearchDiff(e.target.value)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              background: 'var(--surface-1)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: 12,
              width: 180,
            }}
          />
        </div>

        {/* Scrollable Diff Container */}
        <div
          style={{
            maxHeight: 380,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            paddingRight: 4,
          }}
        >
          {filteredDiffItems.map((item) => {
            const { fish, targetMin, targetMax, hasChanged, avgDeltaPct } = item;
            const rarityMeta = RARITY_LABELS[fish.rarity] ?? { label: fish.rarity, color: '#94a3b8' };

            return (
              <div
                key={fish.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'var(--surface-1)',
                  border: hasChanged
                    ? '1px solid rgba(56, 189, 248, 0.4)'
                    : '1px solid rgba(255, 255, 255, 0.05)',
                  gap: 12,
                }}
              >
                {/* Left: Fish identity */}
                <div className="row" style={{ gap: 10, alignItems: 'center', flex: 1, minWidth: 160 }}>
                  <div
                    style={{
                      width: 38,
                      height: 30,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(0,0,0,0.25)',
                      borderRadius: 6,
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={fishIcon(fish.id, 2)}
                      alt=""
                      style={{ imageRendering: 'pixelated', maxWidth: '100%', maxHeight: '100%' }}
                    />
                  </div>
                  <div className="stack" style={{ gap: 2, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {fish.name}
                    </div>
                    <div className="row" style={{ gap: 6, fontSize: 10 }}>
                      <span style={{ color: rarityMeta.color, fontWeight: 700 }}>{rarityMeta.label}</span>
                      <span className="muted">·</span>
                      <span className="muted">{HABITAT_LABELS[fish.habitat]}</span>
                    </div>
                  </div>
                </div>

                {/* Middle: Before -> After Transition */}
                <div
                  className="row"
                  style={{
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 12,
                    background: 'var(--surface-2)',
                    padding: '4px 10px',
                    borderRadius: 6,
                  }}
                >
                  <span className="muted">
                    {fish.minSizeCm} - {fish.maxSizeCm} cm
                  </span>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>➔</span>
                  <strong style={{ color: hasChanged ? '#38bdf8' : 'var(--text)' }}>
                    {targetMin} - {targetMax} cm
                  </strong>
                </div>

                {/* Right: Delta Badge & Remove from Selection */}
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  {batchMode === 'reset' ? (
                    <span
                      className="pill"
                      style={{ fontSize: 10, padding: '2px 6px', background: '#38bdf822', color: '#38bdf8' }}
                    >
                      Mặc định
                    </span>
                  ) : hasChanged ? (
                    <span
                      className="pill"
                      style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        background: avgDeltaPct > 0 ? 'rgba(34, 197, 94, 0.18)' : 'rgba(249, 115, 22, 0.18)',
                        color: avgDeltaPct > 0 ? '#4ade80' : '#fb923c',
                        border: `1px solid ${avgDeltaPct > 0 ? '#22c55e' : '#f97316'}`,
                        fontWeight: 700,
                      }}
                    >
                      {avgDeltaPct > 0 ? `+${avgDeltaPct.toFixed(0)}%` : `${avgDeltaPct.toFixed(0)}%`}
                    </span>
                  ) : (
                    <span className="muted" style={{ fontSize: 11 }}>
                      Không đổi
                    </span>
                  )}

                  <button
                    type="button"
                    className="btn btn-xs btn-ghost"
                    onClick={() => onDeselect(fish.id)}
                    title="Bỏ loài này ra khỏi danh sách chọn"
                    style={{ padding: '2px 6px', color: 'var(--text-muted)' }}
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div
        className="row"
        style={{
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          paddingTop: 8,
          borderTop: '1px solid var(--border)',
        }}
      >
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <span className="muted" style={{ fontSize: 13 }}>
            Tổng cộng: <strong>{selectedFish.length} loài cá</strong> (
            {diffItems.filter((d) => d.hasChanged).length} loài sẽ có kích thước mới).
          </span>
        </div>

        <div className="row" style={{ gap: 10 }}>
          <Button variant="ghost" size="sm" onClick={onClearSelection}>
            Hủy chọn
          </Button>
          <Button
            variant="primary"
            disabled={!hasAnyChange}
            loading={batchMutation.isPending}
            onClick={() => batchMutation.mutate()}
          >
            <Save size={15} /> Áp Dụng & Lưu Kích Thước ({selectedFish.length} loài)
          </Button>
        </div>
      </div>
    </div>
  );
}
