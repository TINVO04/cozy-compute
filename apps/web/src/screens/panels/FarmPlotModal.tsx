import { CROPS, getPlotUnlockPrice, type CropId } from '@cozy/game-data';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Droplets, Lock, Sparkles, Sprout, Unlock, X } from 'lucide-react';
import { useState } from 'react';
import { api, ApiError, type Me } from '../../lib/api';
import { play } from '../../lib/sound';
import { useUi } from '../../lib/store';
import { Button, CoinIcon } from '../../ui/primitives';

interface FarmPlotInfo {
  plotIndex: number;
  isUnlocked: boolean;
  unlockPrice: number;
  isTilled: boolean;
  wateredAt: string | null;
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
  plots: FarmPlotInfo[];
  warehouse: { capacity: number; items: WarehouseItem[] };
}

export function FarmPlotModal({ me, onClose }: { me: Me; onClose: () => void }) {
  const plotIndex = useUi((s) => s.activePlotIndex);
  const qc = useQueryClient();
  const ownerId = useUi((s) => s.room.ownerId) ?? me.id;
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
      await api('/api/farm/plots/plant', {
        method: 'POST',
        body: {
          plotIndex,
          seedItemId: selectedSeed,
          useFertilizer,
          farmOwnerId: data?.farm.ownerId,
        },
      });
      play('farm_plant');
      useUi.getState().toast({ kind: 'success', title: `Đã gieo hạt giống vào ô đất #${plotIndex + 1}!` });
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
    <div className="backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="panel"
        style={{
          maxWidth: 460,
          background: 'linear-gradient(180deg, #24160c 0%, #150c06 100%)',
          borderColor: '#b45309',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header" style={{ borderBottomColor: '#78350f' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sprout size={20} color="#84cc16" />
            <span style={{ color: '#fef3c7', fontWeight: 700, fontSize: 16 }}>
              Ô Đất Nông Nghiệp #{plotIndex + 1}
            </span>
          </div>
          <button className="panel-close" onClick={onClose} aria-label="Đóng (Esc)">
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
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
            <div style={{ color: '#d4b996', textAlign: 'center', padding: 20 }}>
              Đang tải thông tin mẫu đất...
            </div>
          ) : isLocked ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                alignItems: 'center',
                padding: '10px 0',
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
                  border: '2px solid #b45309',
                }}
              >
                <Lock size={32} color="#f59e0b" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ color: '#fef08a', margin: '0 0 6px 0', fontSize: 16 }}>
                  Ô Đất Chưa Được Khai Hoang
                </h3>
                <p style={{ color: '#d4b996', margin: 0, fontSize: 13 }}>
                  Khai hoang ô đất màu mỡ để mở rộng quy mô gieo trồng và sản lượng nông trại.
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: '#0c0704',
                  padding: '10px 18px',
                  borderRadius: 8,
                  border: '1px solid #78350f',
                }}
              >
                <span style={{ color: '#d4b996', fontSize: 13 }}>Chi phí mở khóa:</span>
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
                    background: '#d97706',
                    borderColor: '#b45309',
                    color: '#1c1917',
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Soil Moisture Indicator */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#1c1008',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid #78350f',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Droplets size={18} color={plot?.wateredAt ? '#38bdf8' : '#a8a29e'} />
                  <span style={{ color: '#fef3c7', fontSize: 13 }}>
                    Độ ẩm đất:{' '}
                    {plot?.wateredAt ? 'Đất ẩm (Đang nuôi dưỡng mầm)' : 'Đất khô cằn (Cần tưới nước)'}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => void handleWater()}
                  disabled={actionLoading || !!plot?.wateredAt || !plot?.cropId}
                  style={{
                    padding: '4px 10px',
                    fontSize: 12,
                    borderColor: '#38bdf8',
                    color: plot?.wateredAt ? '#94a3b8' : '#38bdf8',
                  }}
                >
                  {plot?.wateredAt ? 'Đã đủ ẩm' : isOwner ? 'Tưới nước' : 'Tưới nước hộ (+Fame)'}
                </Button>
              </div>

              {/* Crop State */}
              {plot?.cropId ? (
                <div
                  style={{
                    background: '#1c1008',
                    borderRadius: 8,
                    padding: 16,
                    border: '1px solid #78350f',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#fef08a', fontWeight: 700, fontSize: 15 }}>
                      {cropDef?.name ?? plot.cropId}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 600,
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
                        color: '#84cc16',
                        fontSize: 12,
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
                        background: '#16a34a',
                        borderColor: '#15803d',
                        color: '#ffffff',
                        fontWeight: 700,
                        marginTop: 4,
                      }}
                    >
                      <Sparkles size={16} />{' '}
                      {actionLoading ? 'Đang gặt hái...' : 'Thu Hoạch Nông Sản Vào Silo'}
                    </Button>
                  ) : null}

                  {!isOwner ? (
                    <div style={{ color: '#d4b996', fontSize: 12, fontStyle: 'italic' }}>
                      Khách viếng thăm chỉ có quyền tưới nước giúp đỡ, không thể tự ý thu hoạch của chủ trại.
                    </div>
                  ) : null}
                </div>
              ) : isOwner ? (
                /* Sowing Interface */
                <div
                  style={{
                    background: '#1c1008',
                    borderRadius: 8,
                    padding: 16,
                    border: '1px solid #78350f',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <span style={{ color: '#fef3c7', fontWeight: 600, fontSize: 14 }}>Gieo Trồng Cây Mới</span>

                  {availableSeeds.length === 0 ? (
                    <div style={{ color: '#d4b996', fontSize: 13, textAlign: 'center', padding: '10px 0' }}>
                      Không có hạt giống trong kho Silo. Hãy ghé Tiệm Nông Nghiệp Bác Sáu để mua hạt giống!
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <label style={{ color: '#d4b996', fontSize: 12 }}>Chọn hạt giống từ kho Silo:</label>
                      <select
                        value={selectedSeed}
                        onChange={(e) => setSelectedSeed(e.target.value)}
                        style={{
                          background: '#0c0704',
                          border: '1px solid #78350f',
                          color: '#fef08a',
                          padding: '8px 12px',
                          borderRadius: 6,
                          outline: 'none',
                        }}
                      >
                        <option value="">-- Chọn hạt giống --</option>
                        {availableSeeds.map((s) => (
                          <option key={s.itemId} value={s.itemId}>
                            {s.itemId.replace('seed_', '').toUpperCase()} (Còn {s.quantity} túi)
                          </option>
                        ))}
                      </select>

                      {hasFertilizer ? (
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            color: '#84cc16',
                            fontSize: 13,
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
                          marginTop: 6,
                          background: '#65a30d',
                          borderColor: '#4d7c0f',
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
      </div>
    </div>
  );
}
