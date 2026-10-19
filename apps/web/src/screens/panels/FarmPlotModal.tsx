import { CROPS, getPlotUnlockPrice, isWeatherRainy, type CropId } from '@cozy/game-data';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CloudRain, Droplets, Lock, Sparkles, Sprout, Unlock } from 'lucide-react';
import { useState } from 'react';
import { farmItemIcon } from '../../art/farm-icons';
import { api, ApiError, num, type Me } from '../../lib/api';
import { play } from '../../lib/sound';
import { useUi } from '../../lib/store';
import { Button, CoinIcon, Panel } from '../../ui/primitives';

interface FarmPlotInfo {
  plotIndex: number;
  isUnlocked: boolean;
  unlockPrice: number;
  isTilled: boolean;
  wateredAt: string | null;
  isWatered?: boolean;
  cropId: string | null;
  plantedAt: string | null;
  growthStage: 'seed' | 'sprout' | 'blooming' | 'mature' | null;
  isFertilized: boolean;
}

interface WarehouseItem {
  id: string;
  itemId: string;
  quantity: number;
  tab: string;
}

interface FarmMeResponse {
  farm: { ownerId: string; isPublic: boolean; hasPassword: boolean };
  isRaining?: boolean;
  plots: FarmPlotInfo[];
  warehouse: { capacity: number; items: WarehouseItem[] };
}

export function FarmPlotModal({ me, onClose }: { me: Me; onClose: () => void }) {
  const plotIndex = useUi((s) => s.activePlotIndex);
  const qc = useQueryClient();
  const ownerId = useUi((s) => s.room.ownerId) ?? me.id;
  const weather = useUi((s) => s.weather);
  const [selectedSeed, setSelectedSeed] = useState<string>('');
  const [useFertilizer, setUseFertilizer] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['farm', ownerId],
    queryFn: () => api<FarmMeResponse>(ownerId === me.id ? '/api/farm/me' : `/api/farm/visit/${ownerId}`),
    refetchInterval: 5000,
  });

  if (plotIndex === null || plotIndex === undefined) return null;

  const plot = data?.plots.find((p) => p.plotIndex === plotIndex);
  const isOwner = !data?.farm || data.farm.ownerId === me.id;
  const unlockCost = getPlotUnlockPrice(plotIndex);
  const isLocked = plot ? !plot.isUnlocked : plotIndex >= 4;
  const isRaining = isWeatherRainy(weather) || Boolean(data?.isRaining);
  const isMoist = Boolean(plot?.wateredAt) || Boolean(plot?.isWatered) || isRaining;

  const availableSeeds =
    data?.warehouse.items.filter((item) => item.itemId.startsWith('seed_') && item.quantity > 0) ?? [];
  const fertilizerItem = data?.warehouse.items.find((item) => item.itemId === 'fertilizer_bio');
  const hasFertilizer = (fertilizerItem?.quantity ?? 0) > 0;

  // Unlock Plot
  const handleUnlock = async () => {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      await api('/api/farm/plots/unlock', {
        method: 'POST',
        idempotencyKey: crypto.randomUUID(),
        body: { plotIndex },
      });
      play('coin');
      useUi.getState().toast({ kind: 'reward', title: `Đã mở khóa ô đất #${plotIndex + 1} thành công!` });
      await refetch();
      window.dispatchEvent(new Event('farm:refresh'));
      await qc.invalidateQueries({ queryKey: ['me'] });
    } catch (err) {
      play('error');
      setErrorMsg(err instanceof ApiError ? err.message : 'Không thể mở khóa ô đất.');
    } finally {
      setActionLoading(false);
    }
  };

  // Water Plot
  const handleWater = async () => {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await api<{ ok: boolean; isGuestHelper?: boolean; fameAwarded?: number }>(
        '/api/farm/plots/water',
        {
          method: 'POST',
          body: { plotIndex, farmOwnerId: data?.farm.ownerId },
        },
      );
      play('farm_water');
      if (res.isGuestHelper) {
        useUi.getState().toast({
          kind: 'reward',
          title: 'Tưới nước hộ thành công!',
          body: `Bạn nhận được +${res.fameAwarded ?? 1} Điểm Danh Tiếng (Fame)!`,
        });
      } else {
        useUi.getState().toast({ kind: 'info', title: `Đã tưới nước cho ô đất #${plotIndex + 1}!` });
      }
      await refetch();
      window.dispatchEvent(new Event('farm:refresh'));
      await qc.invalidateQueries({ queryKey: ['me'] });
    } catch (err) {
      play('error');
      setErrorMsg(err instanceof ApiError ? err.message : 'Không thể tưới nước.');
    } finally {
      setActionLoading(false);
    }
  };

  // Plant Seed
  const handlePlant = async () => {
    if (!selectedSeed) {
      setErrorMsg('Vui lòng chọn một loại hạt giống từ kho Silo.');
      return;
    }
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await api<{ ok: boolean; isRaining?: boolean; isWatered?: boolean }>(
        '/api/farm/plots/plant',
        {
          method: 'POST',
          body: {
            plotIndex,
            seedItemId: selectedSeed,
            useFertilizer,
            farmOwnerId: data?.farm.ownerId,
          },
        },
      );
      play('farm_plant');
      if (res.isRaining || isRaining) {
        useUi.getState().toast({
          kind: 'success',
          title: `Đã gieo hạt giống vào ô đất #${plotIndex + 1}!`,
          body: 'Trời đang mưa tự nhiên, cây vừa gieo đã được ngấm nước không cần tưới.',
        });
      } else {
        useUi.getState().toast({ kind: 'success', title: `Đã gieo hạt giống vào ô đất #${plotIndex + 1}!` });
      }
      await refetch();
      window.dispatchEvent(new Event('farm:refresh'));
    } catch (err) {
      play('error');
      setErrorMsg(err instanceof ApiError ? err.message : 'Không thể gieo hạt.');
    } finally {
      setActionLoading(false);
    }
  };

  // Harvest Plot
  const handleHarvest = async () => {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await api<{ ok: boolean; harvestedItem: string; quantity: number }>(
        '/api/farm/plots/harvest',
        {
          method: 'POST',
          body: { plotIndex, farmOwnerId: data?.farm.ownerId },
        },
      );
      play('farm_harvest');
      useUi.getState().toast({
        kind: 'reward',
        title: 'Thu hoạch bội thu!',
        body: `Thu được ${res.quantity}x ${res.harvestedItem} chuyển thẳng vào kho Silo!`,
      });
      await refetch();
      window.dispatchEvent(new Event('farm:refresh'));
    } catch (err) {
      play('error');
      setErrorMsg(err instanceof ApiError ? err.message : 'Không thể thu hoạch nông sản.');
    } finally {
      setActionLoading(false);
    }
  };

  const cropDef = plot?.cropId ? CROPS[plot.cropId as CropId] : null;

  return (
    <Panel
      title={`Ô Đất Nông Nghiệp #${plotIndex + 1}`}
      icon={<Sprout size={20} color="#84cc16" />}
      actions={
        <span className="row" style={{ gap: 6, fontWeight: 700, color: 'var(--coin)' }}>
          <CoinIcon size={16} /> {num(me.balances.coin)} Xu
        </span>
      }
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {errorMsg ? (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              padding: '8px 12px',
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            {errorMsg}
          </div>
        ) : null}

        {isLoading ? (
          <div style={{ color: '#94a3b8', textAlign: 'center', padding: 24, fontSize: 13 }}>
            Đang tải thông tin mẫu đất...
          </div>
        ) : isLocked ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              alignItems: 'center',
              padding: '16px 8px',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid rgba(245, 158, 11, 0.4)',
              }}
            >
              <Lock size={32} color="#f59e0b" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ color: '#fef08a', margin: '0 0 6px 0', fontSize: 16 }}>
                Ô Đất Chưa Được Khai Hoang
              </h3>
              <p style={{ color: '#94a3b8', margin: 0, fontSize: 13, maxWidth: 360 }}>
                Khai hoang ô đất màu mỡ để mở rộng quy mô gieo trồng và sản lượng nông trại.
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'rgba(30, 41, 59, 0.45)',
                padding: '10px 18px',
                borderRadius: 8,
                border: '1px solid rgba(148, 163, 184, 0.15)',
              }}
            >
              <span style={{ color: '#94a3b8', fontSize: 13 }}>Chi phí mở khóa:</span>
              <span
                style={{
                  color: '#fde047',
                  fontWeight: 700,
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <CoinIcon /> {unlockCost.toLocaleString()} Xu
              </span>
            </div>

            {isOwner ? (
              <Button
                variant="primary"
                onClick={() => void handleUnlock()}
                disabled={actionLoading || me.balances.coin < unlockCost}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #d97706, #f59e0b)',
                  border: 'none',
                  color: '#0f172a',
                  fontWeight: 700,
                }}
              >
                <Unlock size={16} /> {actionLoading ? 'Đang khai hoang...' : 'Khai Hoang Mẫu Đất Ngay'}
              </Button>
            ) : (
              <div style={{ color: '#fca5a5', fontSize: 13 }}>
                Chỉ chủ nông trại mới có thể khai hoang ô đất này.
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Soil Moisture Indicator */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: isRaining ? 'rgba(56, 189, 248, 0.12)' : 'rgba(30, 41, 59, 0.45)',
                padding: '10px 14px',
                borderRadius: 8,
                border: isRaining
                  ? '1px solid rgba(56, 189, 248, 0.35)'
                  : '1px solid rgba(148, 163, 184, 0.15)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {isRaining ? (
                  <CloudRain size={20} color="#38bdf8" />
                ) : (
                  <Droplets size={20} color={isMoist ? '#38bdf8' : '#94a3b8'} />
                )}
                <div>
                  <div style={{ color: '#f8fafc', fontSize: 13, fontWeight: 600 }}>
                    {isRaining
                      ? 'Trời Đang Mưa Tự Nhiên'
                      : isMoist
                        ? 'Đất Đang Ẩm Ướt'
                        : 'Đất Khô Cằn Cần Nước'}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 11 }}>
                    {isRaining
                      ? 'Nước mưa tự ngấm đều, không cần tưới thủ công'
                      : isMoist
                        ? 'Đang nuôi dưỡng mầm non sinh trưởng tốt'
                        : 'Hãy tưới nước để hạt giống phát triển'}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() => void handleWater()}
                disabled={actionLoading || isMoist || !plot?.cropId}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  borderColor: isRaining || isMoist ? 'rgba(148, 163, 184, 0.3)' : '#38bdf8',
                  color: isRaining || isMoist ? '#94a3b8' : '#38bdf8',
                }}
              >
                {isRaining
                  ? 'Trời mưa tự ngấm'
                  : isMoist
                    ? 'Đã đủ ẩm'
                    : isOwner
                      ? 'Tưới nước'
                      : 'Tưới nước hộ (+Fame)'}
              </Button>
            </div>

            {/* Crop State */}
            {plot?.cropId ? (
              <div
                style={{
                  background: 'rgba(30, 41, 59, 0.45)',
                  borderRadius: 8,
                  padding: 14,
                  border: '1px solid rgba(148, 163, 184, 0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <img
                      src={farmItemIcon(plot.cropId, 36)}
                      alt=""
                      style={{ width: 32, height: 32, imageRendering: 'pixelated' }}
                    />
                    <div>
                      <div style={{ color: '#fef08a', fontWeight: 700, fontSize: 14 }}>
                        {cropDef?.name ?? plot.cropId}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: 11 }}>
                        {cropDef?.description?.slice(0, 48)}...
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 700,
                      background:
                        plot.growthStage === 'mature'
                          ? '#16a34a'
                          : plot.growthStage === 'blooming'
                            ? '#eab308'
                            : '#0284c7',
                      color: '#ffffff',
                    }}
                  >
                    {plot.growthStage === 'mature'
                      ? 'Chín Rộ (Thu Hoạch)'
                      : plot.growthStage === 'blooming'
                        ? 'Đơm Hoa / Kết Trái'
                        : plot.growthStage === 'sprout'
                          ? 'Cây Con Phát Triển'
                          : 'Mầm Non'}
                  </span>
                </div>

                {plot.isFertilized ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      color: '#86efac',
                      fontSize: 12,
                      background: 'rgba(34, 197, 94, 0.1)',
                      padding: '4px 8px',
                      borderRadius: 6,
                    }}
                  >
                    <Sparkles size={14} /> Đã bón phân vi sinh sinh học (-50% thời gian lớn)
                  </div>
                ) : null}

                {plot.growthStage === 'mature' && isOwner ? (
                  <Button
                    variant="primary"
                    onClick={() => void handleHarvest()}
                    disabled={actionLoading}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                      border: 'none',
                      color: '#ffffff',
                      fontWeight: 700,
                      marginTop: 4,
                    }}
                  >
                    <Sparkles size={16} /> {actionLoading ? 'Đang gặt hái...' : 'Thu Hoạch Nông Sản Vào Silo'}
                  </Button>
                ) : null}

                {!isOwner ? (
                  <div style={{ color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>
                    Khách viếng thăm chỉ có quyền tưới nước giúp đỡ, không thể tự ý thu hoạch của chủ trại.
                  </div>
                ) : null}
              </div>
            ) : isOwner ? (
              /* Sowing Interface */
              <div
                style={{
                  background: 'rgba(30, 41, 59, 0.45)',
                  borderRadius: 8,
                  padding: 14,
                  border: '1px solid rgba(148, 163, 184, 0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <span style={{ color: '#fef08a', fontWeight: 700, fontSize: 13 }}>Gieo Trồng Vụ Mùa Mới</span>

                {availableSeeds.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
                    Không có hạt giống trong kho Silo. Hãy ghé Tiệm Nông Nghiệp Bác Sáu để mua hạt giống!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <label style={{ color: '#cbd5e1', fontSize: 12 }}>Chọn hạt giống từ kho Silo:</label>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                        gap: 8,
                        maxHeight: 180,
                        overflowY: 'auto',
                      }}
                    >
                      {availableSeeds.map((s) => {
                        const crop = Object.values(CROPS).find((c) => c.seedItemId === s.itemId);
                        const isSelected = selectedSeed === s.itemId;
                        return (
                          <button
                            key={s.itemId}
                            type="button"
                            onClick={() => setSelectedSeed(s.itemId)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              padding: '6px 8px',
                              borderRadius: 8,
                              background: isSelected ? 'rgba(234, 179, 8, 0.25)' : 'rgba(15, 23, 42, 0.6)',
                              border: isSelected
                                ? '1px solid #facc15'
                                : '1px solid rgba(148, 163, 184, 0.15)',
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                          >
                            <img
                              src={farmItemIcon(s.itemId, 28)}
                              alt=""
                              style={{ width: 24, height: 24, imageRendering: 'pixelated' }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: isSelected ? '#fef08a' : '#f8fafc',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {crop?.name ?? s.itemId.replace('seed_', '')}
                              </div>
                              <div style={{ fontSize: 10, color: '#4ade80' }}>Còn {s.quantity} túi</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {hasFertilizer ? (
                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          color: '#86efac',
                          fontSize: 12,
                          cursor: 'pointer',
                          marginTop: 4,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={useFertilizer}
                          onChange={(e) => setUseFertilizer(e.target.checked)}
                        />
                        Bón phân vi sinh sinh học (-50% thời gian lớn, còn {fertilizerItem?.quantity ?? 0}{' '}
                        túi)
                      </label>
                    ) : null}

                    <Button
                      variant="primary"
                      onClick={() => void handlePlant()}
                      disabled={actionLoading || !selectedSeed}
                      style={{
                        marginTop: 4,
                        background: 'linear-gradient(135deg, #15803d, #22c55e)',
                        border: 'none',
                        color: '#ffffff',
                        fontWeight: 700,
                      }}
                    >
                      <Sprout size={16} /> {actionLoading ? 'Đang gieo...' : 'Gieo Hạt Giống Xuống Đất'}
                    </Button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </Panel>
  );
}
