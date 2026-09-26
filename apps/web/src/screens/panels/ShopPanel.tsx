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
    ['all', 'All'],
    ['hat', 'Hats'],
    ['top', 'Tops'],
    ['face', 'Face'],
  ],
  furniture: [
    ['all', 'All'],
    ['common', 'Questionable'],
    ['rare', 'Rare'],
    ['epic', 'Epic+'],
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
        title: `Bought ${item.name}`,
        body: item.type === 'clothing' ? 'Find it in your wardrobe.' : 'Place it in your apartment.',
      });
      setConfirm(null);
      refresh();
    },
    onError: (err) => {
      toastError(err, 'Purchase failed');
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
      eyebrow={kind === 'clothing' ? 'Threadbare Boutique' : 'Sofa So Good'}
      title={kind === 'clothing' ? 'Clothing' : 'Furniture'}
      onClose={onClose}
      actions={
        <div className="tabs" role="tablist" aria-label="Shop">
          <button
            role="tab"
            className="tab"
            aria-selected={kind === 'clothing'}
            onClick={() => setPanel('shop-fashion')}
          >
            Clothing
          </button>
          <button
            role="tab"
            className="tab"
            aria-selected={kind === 'furniture'}
            onClick={() => setPanel('shop-furniture')}
          >
            Furniture
          </button>
        </div>
      }
    >
      <div className="row between wrap" style={{ marginBottom: 16 }}>
        <div className="tabs" role="tablist" aria-label="Filter">
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
            Wishlist only
          </label>
          <span className="pill">
            <CoinIcon size={12} /> {num(coin)} available
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
          title={onlyWished ? 'Your wishlist is empty' : 'Nothing here yet'}
          body={onlyWished ? 'Tap the heart on any item to save it for later.' : 'Try another filter.'}
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
                    {item.type === 'furniture' ? `Owned ×${item.owned}` : item.equipped ? 'Wearing' : 'Owned'}
                  </span>
                ) : null}
                <button
                  className="wish"
                  aria-pressed={item.wished}
                  aria-label={item.wished ? 'Remove from wishlist' : 'Add to wishlist'}
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
                      Wear
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={!affordable}
                      title={affordable ? undefined : 'Not enough Coin'}
                      onClick={() => setConfirm(item)}
                    >
                      {affordable ? 'Buy' : 'Need more Coin'}
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
          title={`Buy ${confirm.name}?`}
          body={
            <>
              This spends <strong>{num(confirm.price)} Coin</strong>. You will have{' '}
              {num(coin - confirm.price)} left. Purchases cannot be refunded.
            </>
          }
          confirmLabel={`Buy for ${num(confirm.price)}`}
          loading={buy.isPending}
          onConfirm={() => buy.mutate(confirm)}
          onClose={() => setConfirm(null)}
        />
      ) : null}
    </Panel>
  );
}
