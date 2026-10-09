import { BOATS, FISHING_RODS, RARITY_LABELS, type BoatConfig, type RodConfig } from '@cozy/game-data';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Anchor, Check, Compass, Navigation, Ship, Sparkles, Trophy, Waves, Zap } from 'lucide-react';
import { useState } from 'react';
import { rodIcon, boatIcon } from '../../art/items';
import { ROD_EFFECT_CLASS } from '../../art/fish';
import { api, newIdempotencyKey, num, type Appearance, type Me, type ShopItem } from '../../lib/api';
import { qk, useRefreshEconomy } from '../../lib/queries';
import { play } from '../../lib/sound';
import { useUi } from '../../lib/store';
import { Button, CoinIcon, ConfirmDialog, LoadingState, Panel, toastError } from '../../ui/primitives';

const RARITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  common: { bg: 'rgba(148, 163, 184, 0.12)', border: '#64748b', text: '#cbd5e1' },
  rare: { bg: 'rgba(56, 189, 248, 0.12)', border: '#0284c7', text: '#38bdf8' },
  epic: { bg: 'rgba(192, 132, 252, 0.12)', border: '#9333ea', text: '#c084fc' },
  legendary: { bg: 'rgba(251, 191, 36, 0.15)', border: '#d97706', text: '#fbbf24' },
};

const SEA_ZONE_LABELS: Record<string, { title: string; desc: string; color: string }> = {
  shallows: { title: 'Đầm Lầy & Ven Bờ', desc: 'Vùng nước nông ven thị trấn', color: '#94a3b8' },
  coastal: { title: 'Rạn San Hô Nông', desc: 'Vùng rạn san hô phát quang', color: '#38bdf8' },
  open_sea: { title: 'Vịnh Biển Lộng', desc: 'Vùng nước sâu đón gió lớn', color: '#c084fc' },
  abyss: { title: 'Rãnh Biển Sâu (Abyss)', desc: 'Vực thẳm đáy biển thần bí', color: '#fbbf24' },
};

type ShopEntry = { kind: 'rod'; item: RodConfig } | { kind: 'boat'; item: BoatConfig };

const BOAT_DISPLAY_OVERRIDES: Partial<Record<string, Pick<BoatConfig, 'name' | 'description'>>> = {
  boat_coracle: {
    name: 'Kayak Thám Hiểm Ven Bờ',
    description: 'Chiếc kayak nhỏ gọn, nhẹ nhàng lướt êm qua đầm lầy và cửa sông ven bờ.',
  },
};

function boatDisplayName(boat: BoatConfig) {
  return BOAT_DISPLAY_OVERRIDES[boat.id]?.name ?? boat.name;
}

function boatDisplayDescription(boat: BoatConfig) {
  return BOAT_DISPLAY_OVERRIDES[boat.id]?.description ?? boat.description;
}

function shopEntryDisplayName(entry: ShopEntry) {
  return entry.kind === 'boat' ? boatDisplayName(entry.item) : entry.item.name;
}

export function FishingShopPanel({ me, onClose }: { me: Me; onClose: () => void }) {
  const qc = useQueryClient();
  const refresh = useRefreshEconomy();
  const [tab, setTab] = useState<'rods' | 'boats'>('rods');
  const [confirmBuy, setConfirmBuy] = useState<ShopEntry | null>(null);

  // Shop catalog query to know what player owns/equipped
  const shopQuery = useQuery({
    queryKey: qk.shop,
    queryFn: () => api<ShopItem[]>('/shop'),
  });

  const coin = me.balances.coin;
  const items = shopQuery.data ?? [];
  const ownedRods = new Map<string, { owned: boolean; equipped: boolean }>();
  const ownedBoats = new Map<string, { owned: boolean; equipped: boolean }>();

  // Determine ownership from catalog
  for (const it of items) {
    if (it.type === 'rod') {
      ownedRods.set(it.id, {
        owned: (it.owned ?? 0) > 0,
        equipped: Boolean(it.equipped),
      });
    } else if (it.type === 'boat') {
      ownedBoats.set(it.id, {
        owned: (it.owned ?? 0) > 0,
        equipped: Boolean(it.equipped),
      });
    }
  }

  // Fallback: If starter twig rod not explicitly owned in database yet, treat as owned
  if (!ownedRods.has('rod_twig')) {
    ownedRods.set('rod_twig', { owned: true, equipped: false });
  }

  // Currently equipped rod ID from user appearance or catalog
  const equippedRodId =
    items.find((i) => i.type === 'rod' && i.equipped)?.id ??
    (me.appearance.rod ? me.appearance.rod.replace(/^rod:/, 'rod_') : 'rod_twig');

  // Currently equipped boat ID from user appearance or catalog
  const equippedBoatId =
    items.find((i) => i.type === 'boat' && i.equipped)?.id ??
    (me.appearance.boat ? me.appearance.boat.replace(/^boat:/, 'boat_') : null);
  const equippedBoat = equippedBoatId ? BOATS[equippedBoatId] : undefined;

  // Mutation: Buy Item (Rod or Boat)
  const buyMutation = useMutation({
    mutationFn: (entry: ShopEntry) =>
      api<{ coin: number }>('/shop/buy', {
        body: { itemId: entry.item.id, quantity: 1 },
        idempotencyKey: newIdempotencyKey(),
      }),
    onSuccess: (_r, entry) => {
      play('coin');
      useUi.getState().toast({
        kind: 'success',
        title: `Đã mua ${shopEntryDisplayName(entry)}!`,
        body:
          entry.kind === 'rod'
            ? 'Cần câu đã được thêm vào túi đồ. Hãy bấm "Trang bị" để bắt đầu câu cá.'
            : 'Thuyền đã cập bến! Hãy bấm "Trang bị thuyền" để ra khơi từ cầu tàu bến cá.',
      });
      setConfirmBuy(null);
      refresh();
      qc.invalidateQueries({ queryKey: qk.shop });
    },
    onError: (err) => {
      toastError(err, 'Không thể hoàn tất giao dịch');
      setConfirmBuy(null);
    },
  });

  // Mutation: Equip Rod or Boat
  const equipMutation = useMutation({
    mutationFn: ({ itemId, slot }: { itemId: string; slot: 'rod' | 'boat' }) =>
      api<{ appearance: Appearance }>('/inventory/equip', {
        body: { itemId, slot },
      }),
    onSuccess: (data, { itemId, slot }) => {
      play('click');
      qc.setQueryData(qk.me, (old: Me | undefined) => (old ? { ...old, appearance: data.appearance } : old));
      refresh();
      qc.invalidateQueries({ queryKey: qk.shop });
      if (slot === 'rod') {
        const rod = FISHING_RODS[itemId];
        useUi.getState().toast({
          kind: 'success',
          title: `Đã trang bị ${rod?.name ?? 'Cần câu'}`,
          body: 'Bạn đã sẵn sàng ra bến tàu săn những chú cá to nhất thị trấn!',
        });
      } else {
        const boat = BOATS[itemId];
        useUi.getState().toast({
          kind: 'success',
          title: `Đã trang bị ${boat ? boatDisplayName(boat) : 'Thuyền'}`,
          body: 'Chiếc thuyền đã sẵn sàng tại cầu tàu! Hãy tiến lại mạn cầu để lên thuyền ra khơi.',
        });
      }
    },
    onError: (err) => toastError(err, 'Không thể trang bị'),
  });

  const rodsList = Object.values(FISHING_RODS);
  const boatsList = Object.values(BOATS);

  return (
    <Panel
      title="Tiệm Ngư Cụ Bác Ba"
      icon={<Anchor size={20} color="#38bdf8" />}
      actions={
        <span className="row" style={{ gap: 6, fontWeight: 700, color: 'var(--coin)' }}>
          <CoinIcon size={16} /> {num(coin)} Xu
        </span>
      }
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Navigation Tabs Switcher */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: 8,
          }}
        >
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setTab('rods')}
            style={{
              background: tab === 'rods' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              border: `1px solid ${tab === 'rods' ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
              color: tab === 'rods' ? '#38bdf8' : '#94a3b8',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 8,
              padding: '6px 14px',
              cursor: 'pointer',
            }}
          >
            <Anchor size={15} /> 🎣 Cần Câu Cá ({rodsList.length})
          </button>

          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setTab('boats')}
            style={{
              background: tab === 'boats' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
              border: `1px solid ${tab === 'boats' ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)'}`,
              color: tab === 'boats' ? '#38bdf8' : '#94a3b8',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 8,
              padding: '6px 14px',
              cursor: 'pointer',
            }}
          >
            <Ship size={15} /> ⛵ Bến Thuyền Ra Khơi ({boatsList.length})
          </button>
        </div>

        {/* Tab 1: Cần Câu (Rods) */}
        {tab === 'rods' && (
          <>
            {/* Banner introduction */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(22, 52, 69, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: 12,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
              }}
            >
              <div>
                <h4
                  style={{
                    margin: '0 0 4px',
                    fontSize: 15,
                    color: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  🎣 Ngư Cụ & Cần Câu Chuẩn Play Together
                </h4>
                <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.4 }}>
                  Cần câu xịn giúp thu hút bóng cá to hơn (Bóng 4, 5, 6 Vương miện), cá cắn mồi nhanh hơn và
                  kéo dài thời gian phản xạ!
                </p>
              </div>
              <div style={{ textAlign: 'right', minWidth: 120 }}>
                <span
                  style={{
                    fontSize: 11,
                    color: '#64748b',
                    display: 'block',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Cần đang dùng
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8' }}>
                  {FISHING_RODS[equippedRodId]?.name ?? 'Cần Cành Cây'}
                </span>
              </div>
            </div>

            {/* Rods Grid */}
            {shopQuery.isLoading ? (
              <LoadingState rows={3} />
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                  gap: 14,
                }}
              >
                {rodsList.map((rod) => {
                  const status = ownedRods.get(rod.id);
                  const isOwned = status?.owned || (rod.id === 'rod_twig' && !status);
                  const isEquipped = equippedRodId === rod.id;
                  const canAfford = coin >= rod.coinPrice;
                  const rStyle = RARITY_COLORS[rod.rarity] ?? RARITY_COLORS.common!;

                  const maxTier =
                    rod.id === 'rod_twig'
                      ? 'Bóng 1 - 2'
                      : rod.id === 'rod_wooden'
                        ? 'Bóng 2 - 3'
                        : rod.id === 'rod_fiberglass'
                          ? 'Bóng 3 - 4'
                          : rod.id === 'rod_pro_carbon'
                            ? 'Bóng 4 - 5'
                            : rod.id === 'rod_golden_legend'
                              ? 'Bóng 5 - 6 (Vương miện)'
                              : 'Bóng 6 Tối đa (Leviathan)';

                  return (
                    <div
                      key={rod.id}
                      className={`card ${ROD_EFFECT_CLASS[rod.id] ?? ''}`}
                      style={{
                        background: isEquipped
                          ? 'linear-gradient(180deg, rgba(6, 78, 59, 0.4) 0%, rgba(15, 23, 42, 0.85) 100%)'
                          : 'rgba(24, 21, 35, 0.75)',
                        border: `1.5px solid ${isEquipped ? '#10b981' : rStyle.border}`,
                        borderRadius: 12,
                        padding: 14,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        boxShadow: isEquipped ? '0 0 16px rgba(16, 185, 129, 0.25)' : undefined,
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div
                          style={{
                            width: 58,
                            height: 58,
                            borderRadius: 10,
                            background: 'rgba(15, 23, 42, 0.7)',
                            border: `1px solid ${rStyle.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <img
                            src={rodIcon(rod.id, 2)}
                            alt={rod.name}
                            className="pixel"
                            style={{ width: 48, height: 48, objectFit: 'contain' }}
                          />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: 4,
                                background: rStyle.bg,
                                border: `1px solid ${rStyle.border}`,
                                color: rStyle.text,
                                textTransform: 'uppercase',
                              }}
                            >
                              {RARITY_LABELS[rod.rarity]}
                            </span>
                            {isEquipped && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  background: 'rgba(16, 185, 129, 0.2)',
                                  color: '#34d399',
                                  border: '1px solid #10b981',
                                }}
                              >
                                ✓ Đang dùng
                              </span>
                            )}
                          </div>
                          <h4
                            style={{ margin: '4px 0 2px', fontSize: 15, color: '#f8fafc', fontWeight: 700 }}
                          >
                            {rod.name}
                          </h4>
                          <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.3 }}>
                            {rod.description}
                          </p>
                        </div>
                      </div>

                      <div
                        style={{
                          background: 'rgba(15, 23, 42, 0.45)',
                          borderRadius: 8,
                          padding: '8px 10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          fontSize: 12,
                        }}
                      >
                        <div
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Trophy size={13} color="#f59e0b" /> Hút bóng cá:
                          </span>
                          <strong style={{ color: rStyle.text }}>{maxTier}</strong>
                        </div>
                        <div
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Zap size={13} color="#38bdf8" /> Thời gian cắn mồi:
                          </span>
                          <strong style={{ color: rod.biteSpeedBonus > 0 ? '#38bdf8' : '#94a3b8' }}>
                            {rod.biteSpeedBonus > 0
                              ? `Nhanh hơn +${Math.round(rod.biteSpeedBonus * 100)}%`
                              : 'Cơ bản'}
                          </strong>
                        </div>
                        <div
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Sparkles size={13} color="#a855f7" /> Cửa sổ phản xạ:
                          </span>
                          <strong style={{ color: rod.reactionBonusMs > 0 ? '#a855f7' : '#94a3b8' }}>
                            {rod.reactionBonusMs > 0 ? `+${rod.reactionBonusMs}ms (Thoải mái)` : 'Tiêu chuẩn'}
                          </strong>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: 'auto',
                          paddingTop: 4,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CoinIcon size={16} />
                          <strong style={{ fontSize: 15, color: 'var(--coin)' }}>{num(rod.coinPrice)}</strong>
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>Xu</span>
                        </div>

                        <div>
                          {isEquipped ? (
                            <Button variant="ghost" size="sm" disabled>
                              <Check size={14} /> Đang dùng
                            </Button>
                          ) : isOwned ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => equipMutation.mutate({ itemId: rod.id, slot: 'rod' })}
                              disabled={equipMutation.isPending}
                            >
                              Trang bị cần
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={!canAfford || buyMutation.isPending}
                              onClick={() => setConfirmBuy({ kind: 'rod', item: rod })}
                            >
                              Mua ngay
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Tab 2: Bến Thuyền (Boats) */}
        {tab === 'boats' && (
          <>
            {/* Boat Banner */}
            <div
              style={{
                background:
                  'linear-gradient(135deg, rgba(12, 74, 110, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: 12,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
              }}
            >
              <div>
                <h4
                  style={{
                    margin: '0 0 4px',
                    fontSize: 15,
                    color: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  ⛵ Bến Thuyền Ra Khơi & Hải Trình Biển Sâu
                </h4>
                <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.4 }}>
                  Trang bị thuyền để xuất bến từ cầu tàu thị trấn! Lái thuyền vượt sóng ra biển khơi, khám phá
                  Rạn san hô, Đảo Thần Ngư và Rãnh Biển Sâu để câu những loài thủy quái cực hiếm.
                </p>
              </div>
              <div style={{ textAlign: 'right', minWidth: 130 }}>
                <span
                  style={{
                    fontSize: 11,
                    color: '#64748b',
                    display: 'block',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  Thuyền đang trang bị
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: equippedBoatId ? '#38bdf8' : '#94a3b8',
                  }}
                >
                  {equippedBoatId
                    ? equippedBoat
                      ? boatDisplayName(equippedBoat)
                      : 'Đã trang bị thuyền'
                    : 'Chưa có thuyền'}
                </span>
              </div>
            </div>

            {/* Boats Grid */}
            {shopQuery.isLoading ? (
              <LoadingState rows={3} />
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                  gap: 14,
                }}
              >
                {boatsList.map((boat) => {
                  const boatName = boatDisplayName(boat);
                  const boatDescription = boatDisplayDescription(boat);
                  const status = ownedBoats.get(boat.id);
                  const isOwned = Boolean(status?.owned);
                  const isEquipped = equippedBoatId === boat.id;
                  const canAfford = coin >= boat.coinPrice;
                  const rStyle = RARITY_COLORS[boat.rarity] ?? RARITY_COLORS.common!;
                  const zoneInfo = SEA_ZONE_LABELS[boat.seaZoneAccess] ?? SEA_ZONE_LABELS.shallows!;

                  return (
                    <div
                      key={boat.id}
                      className="card"
                      style={{
                        background: isEquipped
                          ? 'linear-gradient(180deg, rgba(6, 78, 59, 0.4) 0%, rgba(15, 23, 42, 0.85) 100%)'
                          : 'rgba(24, 21, 35, 0.75)',
                        border: `1.5px solid ${isEquipped ? '#10b981' : rStyle.border}`,
                        borderRadius: 12,
                        padding: 14,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        boxShadow: isEquipped ? '0 0 16px rgba(16, 185, 129, 0.25)' : undefined,
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div
                          style={{
                            width: 64,
                            height: 64,
                            borderRadius: 10,
                            background: 'rgba(15, 23, 42, 0.7)',
                            border: `1px solid ${rStyle.border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <img
                            src={boatIcon(boat.id)}
                            alt={boatName}
                            className="pixel"
                            style={{ width: 56, height: 56, objectFit: 'contain' }}
                          />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: 4,
                                background: rStyle.bg,
                                border: `1px solid ${rStyle.border}`,
                                color: rStyle.text,
                                textTransform: 'uppercase',
                              }}
                            >
                              {RARITY_LABELS[boat.rarity]}
                            </span>
                            {isEquipped && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  background: 'rgba(16, 185, 129, 0.2)',
                                  color: '#34d399',
                                  border: '1px solid #10b981',
                                }}
                              >
                                ✓ Đang trang bị
                              </span>
                            )}
                          </div>
                          <h4
                            style={{ margin: '4px 0 2px', fontSize: 15, color: '#f8fafc', fontWeight: 700 }}
                          >
                            {boatName}
                          </h4>
                          <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.3 }}>
                            {boatDescription}
                          </p>
                        </div>
                      </div>

                      {/* Boat Stats */}
                      <div
                        style={{
                          background: 'rgba(15, 23, 42, 0.45)',
                          borderRadius: 8,
                          padding: '8px 10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                          fontSize: 12,
                        }}
                      >
                        <div
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Navigation size={13} color="#38bdf8" /> Tốc độ lướt sóng:
                          </span>
                          <strong style={{ color: '#38bdf8' }}>{boat.speed} px/giây</strong>
                        </div>
                        <div
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Waves size={13} color={zoneInfo.color} /> Vùng biển cho phép:
                          </span>
                          <strong style={{ color: zoneInfo.color }}>{zoneInfo.title}</strong>
                        </div>
                        <div
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                        >
                          <span style={{ color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Compass size={13} color="#f59e0b" /> Đặc quyền ra khơi:
                          </span>
                          <span style={{ color: '#cbd5e1', fontSize: 11 }}>{zoneInfo.desc}</span>
                        </div>
                      </div>

                      {/* Price & Action */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: 'auto',
                          paddingTop: 4,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CoinIcon size={16} />
                          <strong style={{ fontSize: 15, color: 'var(--coin)' }}>
                            {num(boat.coinPrice)}
                          </strong>
                          <span style={{ fontSize: 12, color: '#94a3b8' }}>Xu</span>
                        </div>

                        <div>
                          {isEquipped ? (
                            <Button variant="ghost" size="sm" disabled>
                              <Check size={14} /> Đang dùng
                            </Button>
                          ) : isOwned ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => equipMutation.mutate({ itemId: boat.id, slot: 'boat' })}
                              disabled={equipMutation.isPending}
                            >
                              Trang bị thuyền
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={!canAfford || buyMutation.isPending}
                              onClick={() => setConfirmBuy({ kind: 'boat', item: boat })}
                            >
                              Mua thuyền
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirmation Dialog */}
      {confirmBuy && (
        <ConfirmDialog
          title={`Mua ${shopEntryDisplayName(confirmBuy)}?`}
          body={`Bạn có chắc muốn chi ${num(confirmBuy.item.coinPrice)} Xu để sở hữu ${
            confirmBuy.kind === 'rod' ? 'chiếc cần câu' : 'chiếc thuyền'
          } này không? Sau khi mua, bạn có thể trang bị ngay để chuẩn bị ra khơi.`}
          confirmLabel={`Mua với ${num(confirmBuy.item.coinPrice)} Xu`}
          onConfirm={() => buyMutation.mutate(confirmBuy)}
          onClose={() => setConfirmBuy(null)}
          loading={buyMutation.isPending}
        />
      )}
    </Panel>
  );
}
