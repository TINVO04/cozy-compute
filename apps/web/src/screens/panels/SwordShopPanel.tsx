import {
  RARITY_LABELS,
  SWORDS,
  normalizeSwordId,
  type Appearance,
  type Rarity,
  type SwordConfig,
} from '@cozy/game-data';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Swords } from 'lucide-react';
import { useMemo, useState } from 'react';
import { avatarPortrait } from '../../art/avatar';
import { itemIcon } from '../../art/items';
import { api, newIdempotencyKey, num, type Me, type ShopItem } from '../../lib/api';
import { qk, useRefreshEconomy } from '../../lib/queries';
import { play } from '../../lib/sound';
import { useUi } from '../../lib/store';
import { Button, Panel, toastError } from '../../ui/primitives';

export function SwordShopPanel({ me, onClose }: { me: Me; onClose: () => void }) {
  const qc = useQueryClient();
  const refresh = useRefreshEconomy();
  const shop = useQuery({ queryKey: qk.shop, queryFn: () => api<ShopItem[]>('/shop') });

  const [previewDir, setPreviewDir] = useState<0 | 1 | 3>(3); // 3: Back (nhìn sau lưng vác chéo kiếm rõ nhất)
  const [selectedSwordId, setSelectedSwordId] = useState<string>(
    me.appearance.sword ? normalizeSwordId(me.appearance.sword) : 'sword_training',
  );

  const ownedItems = useMemo(() => {
    const map = new Map<string, ShopItem>();
    for (const it of shop.data ?? []) {
      if (it.type === 'sword') map.set(it.id, it);
    }
    return map;
  }, [shop.data]);

  const currentlyEquippedId = me.appearance.sword ? normalizeSwordId(me.appearance.sword) : null;
  const selectedSword = SWORDS[selectedSwordId] ?? SWORDS.sword_training!;

  // Preview appearance with selected sword slung across back
  const previewAppearance: Appearance = useMemo(
    () => ({
      ...me.appearance,
      sword: selectedSword.id,
      heldFish: null,
      isFishing: false,
    }),
    [me.appearance, selectedSword.id],
  );

  const isSelectedOwned =
    selectedSword.id === 'sword_training' || (ownedItems.get(selectedSword.id)?.owned ?? 0) > 0;
  const isSelectedEquipped = currentlyEquippedId === selectedSword.id;

  const buy = useMutation({
    mutationFn: (sword: SwordConfig) =>
      api<{ coin: number }>('/shop/buy', {
        body: { itemId: sword.id, quantity: 1 },
        idempotencyKey: newIdempotencyKey(),
      }),
    onSuccess: (_data, sword) => {
      play('coin');
      refresh();
      qc.invalidateQueries({ queryKey: qk.shop });
      useUi.getState().toast({
        kind: 'success',
        title: `Đã sở hữu ${sword.name}!`,
        body: 'Thanh kiếm đã vào túi đồ. Hãy bấm "Vác Kiếm" để đeo chéo sau lưng.',
      });
    },
    onError: (e) => {
      refresh();
      toastError(e, 'Không thể mua kiếm');
    },
  });

  const equip = useMutation({
    mutationFn: (itemId: string | null) =>
      api<{ appearance: Appearance }>('/inventory/equip', {
        body: { itemId, slot: 'sword' },
      }),
    onSuccess: (_data, itemId) => {
      play('pop');
      refresh();
      qc.invalidateQueries({ queryKey: qk.shop });
      useUi.getState().toast({
        kind: 'success',
        title: itemId ? 'Đã vác kiếm chéo lưng!' : 'Đã hạ kiếm xuống',
        body: itemId
          ? 'Kiếm đã được đeo chéo sau lưng theo phong cách hiệp khách.'
          : 'Đã cất kiếm vào túi đồ.',
      });
    },
    onError: (e) => toastError(e, 'Không thể thay đổi trang bị'),
  });

  return (
    <Panel
      icon={<Swords size={20} />}
      eyebrow="Binh Khí Phổ · Tiệm Rèn Hiệp Khách"
      title="Kho Binh Khí & Kiếm Thuật"
      onClose={onClose}
    >
      <div className="split" style={{ gap: 20 }}>
        {/* Left Column: Live Character Hero Preview with Slung Sword */}
        <div className="sticky stack" style={{ minWidth: 260, gap: 14 }}>
          <div className="preview-stage" style={{ position: 'relative', overflow: 'hidden' }}>
            <img
              src={avatarPortrait(previewAppearance, 7)}
              alt="Xem trước kiếm vác chéo lưng"
              style={{ imageRendering: 'pixelated' }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                right: 8,
                display: 'flex',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Button
                size="sm"
                variant={previewDir === 3 ? 'primary' : 'secondary'}
                onClick={() => setPreviewDir(3)}
                title="Nhìn từ sau lưng (thấy rõ kiếm vác chéo lưng nhất)"
              >
                Sau lưng
              </Button>
              <Button
                size="sm"
                variant={previewDir === 0 ? 'primary' : 'secondary'}
                onClick={() => setPreviewDir(0)}
                title="Nhìn chính diện (thấy đai đeo chéo ngực & chuôi kiếm qua vai)"
              >
                Chính diện
              </Button>
              <Button
                size="sm"
                variant={previewDir === 1 ? 'primary' : 'secondary'}
                onClick={() => setPreviewDir(1)}
                title="Nhìn nghiêng"
              >
                Nghiêng
              </Button>
            </div>
          </div>

          <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="row between" style={{ alignItems: 'center' }}>
              <strong style={{ fontSize: 15 }}>{selectedSword.name}</strong>
              <span className={`pill r-${selectedSword.rarity}`} style={{ fontSize: 11, fontWeight: 700 }}>
                {RARITY_LABELS[selectedSword.rarity as Rarity]}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
              {selectedSword.description}
            </p>
            <div className="row between" style={{ marginTop: 6, fontSize: 12 }}>
              <span className="muted">Sát thương uy lực:</span>
              <strong style={{ color: '#ef4444' }}>+{selectedSword.damage} Sát thương</strong>
            </div>
            <div className="row between" style={{ fontSize: 12 }}>
              <span className="muted">Phong cách đeo:</span>
              <span style={{ color: '#38bdf8', fontWeight: 600 }}>Vác chéo lưng hiệp khách</span>
            </div>
          </div>

          {/* Action button for selected sword */}
          {isSelectedOwned ? (
            <Button
              variant={isSelectedEquipped ? 'secondary' : 'reward'}
              block
              loading={equip.isPending}
              onClick={() => equip.mutate(isSelectedEquipped ? null : selectedSword.id)}
            >
              {isSelectedEquipped ? 'Hạ kiếm xuống' : '⚔ Vác kiếm chéo lưng'}
            </Button>
          ) : (
            <Button
              variant="primary"
              block
              disabled={me.balances.coin < selectedSword.coinPrice}
              loading={buy.isPending}
              onClick={() => buy.mutate(selectedSword)}
            >
              Mua với {num(selectedSword.coinPrice)} Coin
            </Button>
          )}

          <div className="row between" style={{ fontSize: 12, padding: '0 4px' }}>
            <span className="muted">Túi tiền của bạn:</span>
            <strong>{num(me.balances.coin)} Coin</strong>
          </div>
        </div>

        {/* Right Column: Swords Grid Showcase */}
        <div className="stack" style={{ gap: 14, flex: 1 }}>
          <div className="row between wrap" style={{ alignItems: 'center', gap: 8 }}>
            <h3 style={{ margin: 0 }}>Danh Sách Binh Khí Hiệp Khách</h3>
            <span className="muted" style={{ fontSize: 12 }}>
              Click để xem trước & trang bị vác chéo người
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
              gap: 12,
            }}
          >
            {Object.values(SWORDS).map((sword) => {
              const isSelected = sword.id === selectedSwordId;
              const isOwned = sword.id === 'sword_training' || (ownedItems.get(sword.id)?.owned ?? 0) > 0;
              const isEquipped = currentlyEquippedId === sword.id;

              return (
                <div
                  key={sword.id}
                  className="card"
                  onClick={() => {
                    setSelectedSwordId(sword.id);
                    play('click');
                  }}
                  style={{
                    padding: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    position: 'relative',
                    border: isSelected
                      ? '2px solid #38bdf8'
                      : isEquipped
                        ? '1.5px solid #22c55e'
                        : '1px solid var(--border)',
                    background: isSelected
                      ? 'linear-gradient(180deg, rgba(56, 189, 248, 0.12) 0%, var(--surface-1) 100%)'
                      : isEquipped
                        ? 'linear-gradient(180deg, rgba(34, 197, 94, 0.1) 0%, var(--surface-1) 100%)'
                        : 'var(--surface-1)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isEquipped ? (
                    <span
                      className="pill pill-primary"
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 6px',
                        background: '#16a34a',
                        zIndex: 2,
                      }}
                    >
                      ✓ Đang vác
                    </span>
                  ) : isOwned ? (
                    <span
                      className="pill"
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '2px 6px',
                        background: 'rgba(255,255,255,0.1)',
                        zIndex: 2,
                      }}
                    >
                      Đã sở hữu
                    </span>
                  ) : null}

                  <div
                    style={{
                      height: 100,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(0, 0, 0, 0.3)',
                      borderRadius: 8,
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={itemIcon(sword.sprite, 'sword', { w: 1, h: 1 }, 4)}
                      alt={sword.name}
                      style={{
                        maxHeight: '84%',
                        maxWidth: '84%',
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
                      }}
                    />
                  </div>

                  <div className="stack" style={{ gap: 2 }}>
                    <div className="row between" style={{ alignItems: 'center' }}>
                      <strong style={{ fontSize: 13 }}>{sword.name}</strong>
                    </div>
                    <div className="row between" style={{ fontSize: 11 }}>
                      <span className="muted">+{sword.damage} Sát thương</span>
                      <span style={{ fontWeight: 600, color: '#f59e0b' }}>
                        {sword.coinPrice === 0 ? 'Miễn phí' : `${num(sword.coinPrice)} C`}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: 'auto', paddingTop: 4 }}>
                    <Button
                      size="sm"
                      block
                      variant={isEquipped ? 'secondary' : isOwned ? 'reward' : 'primary'}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSwordId(sword.id);
                        if (isOwned) {
                          equip.mutate(isEquipped ? null : sword.id);
                        } else {
                          buy.mutate(sword);
                        }
                      }}
                      disabled={!isOwned && me.balances.coin < sword.coinPrice}
                      loading={
                        (equip.isPending && equip.variables === sword.id) ||
                        (buy.isPending && buy.variables?.id === sword.id)
                      }
                    >
                      {isEquipped ? 'Hạ kiếm' : isOwned ? 'Vác kiếm' : `${num(sword.coinPrice)} Coin`}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Panel>
  );
}
