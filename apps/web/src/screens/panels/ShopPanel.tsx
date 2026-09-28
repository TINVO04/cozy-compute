import { useMutation, useQuery } from '@tanstack/react-query';
import { Armchair, Check, Heart, PackageOpen, Shirt } from 'lucide-react';
import { useMemo, useState } from 'react';
import { itemIcon } from '../../art/items';
import { api, newIdempotencyKey, num, type Me, type ShopItem } from '../../lib/api';
import { qk, useRefreshEconomy } from '../../lib/queries';
import { play } from '../../lib/sound';
import { useUi } from '../../lib/store';
import {
  Button,
  CoinIcon,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingState,
  Panel,
  toastError,
} from '../../ui/primitives';

const FILTERS = {
  clothing: [
    ['all', 'Tất cả'],
    ['hat', 'Mũ nón'],
    ['top', 'Trang phục'],
    ['face', 'Phụ kiện mặt'],
  ],
  furniture: [
    ['all', 'Tất cả'],
    ['common', 'Phổ thông'],
    ['rare', 'Hiếm có'],
    ['epic', 'Sử thi+'],
  ],
} as const;

export function ShopPanel({ kind, onClose }: { kind: 'clothing' | 'furniture'; onClose: () => void }) {
  const setPanel = useUi((s) => s.setPanel);
  const shop = useQuery({ queryKey: qk.shop, queryFn: () => api<ShopItem[]>('/shop') });
  const me = useQuery<Me>({ queryKey: qk.me, enabled: false });
  const [filter, setFilter] = useState<string>('all');
  const [onlyWished, setOnlyWished] = useState(false);
  const [confirm, setConfirm] = useState<ShopItem | null>(null);
  const refresh = useRefreshEconomy();
  const coin = me.data?.balances.coin ?? 0;

  const items = useMemo(() => {
    let list = (shop.data ?? []).filter((i) => i.type === kind);
    if (filter !== 'all')
      list = list.filter((i) =>
        kind === 'clothing'
          ? i.slot === filter
          : filter === 'epic'
            ? i.rarity === 'epic' || i.rarity === 'legendary'
            : i.rarity === filter,
      );
    if (onlyWished) list = list.filter((i) => i.wished);
    return list;
  }, [shop.data, kind, filter, onlyWished]);

  const buy = useMutation({
    mutationFn: (item: ShopItem) =>
      api<{ coin: number }>('/shop/buy', {
        body: { itemId: item.id, quantity: 1 },
        idempotencyKey: newIdempotencyKey(),
      }),
    onSuccess: (_r, item) => {
      play('coin');
      useUi.getState().toast({
        kind: 'success',
        title: `Đã mua ${item.name}`,
        body:
          item.type === 'clothing'
            ? 'Đã chuyển vào Balo & Tủ đồ (phím B). Hãy mở Balo để mặc vào nhé!'
            : 'Vật phẩm đã sẵn sàng đặt trong căn hộ.',
      });
      setConfirm(null);
      refresh();
    },
    onError: (err) => {
      toastError(err, 'Giao dịch thất bại');
      setConfirm(null);
    },
  });

  const wish = useMutation({
    mutationFn: (item: ShopItem) =>
      api('/shop/wishlist', { body: { itemId: item.id, wished: !item.wished } }),
    onSuccess: () => refresh(),
    onError: (err) => toastError(err),
  });

  return (
    <Panel
      icon={kind === 'clothing' ? <Shirt size={18} /> : <Armchair size={18} />}
      eyebrow={kind === 'clothing' ? 'Tiệm Thời Trang Threadbare' : 'Nội Thất Sofa So Good'}
      title={kind === 'clothing' ? 'Cửa Hàng Thời Trang' : 'Cửa Hàng Nội Thất'}
      onClose={onClose}
      actions={
        <div className="tabs" role="tablist" aria-label="Cửa hàng">
          <button
            role="tab"
            className="tab"
            aria-selected={kind === 'clothing'}
            onClick={() => setPanel('shop-fashion')}
          >
            Thời trang
          </button>
          <button
            role="tab"
            className="tab"
            aria-selected={kind === 'furniture'}
            onClick={() => setPanel('shop-furniture')}
          >
            Nội thất
          </button>
        </div>
      }
    >
      <div className="row between wrap" style={{ marginBottom: 16 }}>
        <div className="tabs" role="tablist" aria-label="Bộ lọc">
          {FILTERS[kind].map(([id, label]) => (
            <button
              key={id}
              role="tab"
              className="tab"
              aria-selected={filter === id}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="row">
          <label className="checkbox">
            <input type="checkbox" checked={onlyWished} onChange={(e) => setOnlyWished(e.target.checked)} />{' '}
            Danh sách thích
          </label>
          <span className="pill">
            <CoinIcon size={12} /> {num(coin)} khả dụng
          </span>
        </div>
      </div>
      {shop.isPending ? (
        <LoadingState rows={4} />
      ) : shop.isError ? (
        <ErrorState error={shop.error} onRetry={() => void shop.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<PackageOpen size={22} />}
          title={onlyWished ? 'Danh sách thích đang trống' : 'Chưa có vật phẩm nào'}
          body={
            onlyWished ? 'Nhấn vào hình trái tim trên món đồ để lưu lại sau.' : 'Hãy thử chọn bộ lọc khác.'
          }
        />
      ) : (
        <div className="grid-cards">
          {items.map((item) => {
            const owned = item.owned > 0;
            const clothingOwned = item.type === 'clothing' && owned;
            const affordable = coin >= item.price;
            return (
              <article key={item.id} className="card item-card">
                {owned ? (
                  <span className="pill pill-success owned-tag">
                    <Check size={12} />{' '}
                    {item.type === 'furniture'
                      ? `Đã có ×${item.owned}`
                      : item.equipped
                        ? 'Đang mặc'
                        : 'Đã sở hữu'}
                  </span>
                ) : null}
                <button
                  className="wish"
                  aria-pressed={item.wished}
                  aria-label={item.wished ? 'Bỏ khỏi danh sách thích' : 'Thêm vào danh sách thích'}
                  onClick={() => wish.mutate(item)}
                >
                  <Heart size={16} fill={item.wished ? 'currentColor' : 'none'} />
                </button>
                <div className={`item-art r-${item.rarity}`}>
                  <img src={itemIcon(item.sprite, item.type, item.size, 4)} alt="" />
                </div>
                <div className="item-info">
                  <span className={`item-rarity rarity-${item.rarity}`}>{item.rarityLabel}</span>
                  <span className="item-name">{item.name}</span>
                  <span className="item-desc">{item.description}</span>
                </div>
                <div className="item-foot">
                  <span className="price">
                    <CoinIcon /> {num(item.price)}
                  </span>
                  {clothingOwned ? (
                    <Button size="sm" onClick={() => setPanel('wardrobe')}>
                      Mặc
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={!affordable}
                      title={affordable ? undefined : 'Không đủ Xu'}
                      onClick={() => setConfirm(item)}
                    >
                      {affordable ? 'Mua' : 'Thiếu Xu'}
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {confirm ? (
        <ConfirmDialog
          title={`Mua ${confirm.name}?`}
          body={
            <>
              Giao dịch này sẽ tiêu tốn <strong>{num(confirm.price)} Xu</strong>. Bạn sẽ còn lại{' '}
              {num(coin - confirm.price)} Xu. Vật phẩm đã mua không thể hoàn lại.
            </>
          }
          confirmLabel={`Mua với giá ${num(confirm.price)}`}
          loading={buy.isPending}
          onConfirm={() => buy.mutate(confirm)}
          onClose={() => setConfirm(null)}
        />
      ) : null}
    </Panel>
  );
}
