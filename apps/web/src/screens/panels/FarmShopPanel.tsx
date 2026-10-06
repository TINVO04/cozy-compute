import {
  BAC_SAU_SHOP_ITEMS,
  CROPS,
  ANIMALS,
  POND_FISHES,
  DAILY_MARKET_CONTRACTS,
  type FarmShopItemDef,
  type MarketContractDef,
} from '@cozy/game-data';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, DollarSign, ScrollText, ShoppingBag, Store, X } from 'lucide-react';
import { useState } from 'react';
import { api, ApiError, type Me } from '../../lib/api';
import { play } from '../../lib/sound';
import { useUi } from '../../lib/store';
import { Button, CoinIcon } from '../../ui/primitives';

type ShopTab = 'buy' | 'sell' | 'contracts';

interface WarehouseItem {
  id: string;
  itemId: string;
  quantity: number;
  tab: string;
}

interface FarmMeResponse {
  completedContracts?: string[];
  farm: { ownerId: string };
  warehouse: { capacity: number; items: WarehouseItem[] };
  todayContracts?: MarketContractDef[];
}

export function FarmShopPanel({ me, onClose }: { me: Me; onClose: () => void }) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<ShopTab>('buy');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data, refetch } = useQuery({
    queryKey: ['farm', 'me'],
    queryFn: () => api<FarmMeResponse>('/api/farm/me'),
  });

  const warehouseItems = data?.warehouse.items ?? [];
  const sellableItems = warehouseItems.filter(
    (item) =>
      Object.values(CROPS).some((c) => c.harvestItemId === item.itemId) ||
      Object.values(ANIMALS).some((a) => a.yieldItemId === item.itemId) ||
      Object.values(POND_FISHES).some((f) => f.harvestItemId === item.itemId),
  );
  const contracts = data?.todayContracts ?? DAILY_MARKET_CONTRACTS;

  const getQty = (id: string) => quantities[id] ?? 1;
  const setQty = (id: string, val: number) => {
    setQuantities((q) => ({ ...q, [id]: Math.max(1, Math.min(999, val)) }));
  };

  // 1. Buy Shop Item
  const handleBuy = async (item: FarmShopItemDef) => {
    const qty = getQty(item.id);
    const totalCost = item.coinPrice * qty;
    if (me.balances.coin < totalCost) {
      setErrorMsg('Không đủ Xu để thanh toán đơn hàng này.');
      play('error');
      return;
    }
    setLoadingAction(item.id);
    setErrorMsg(null);
    try {
      await api('/api/farm/shop/buy', {
        method: 'POST',
        idempotencyKey: crypto.randomUUID(),
        body: { itemId: item.id, quantity: qty },
      });
      play('coin');
      useUi.getState().toast({
        kind: 'reward',
        title: 'Mua vật tư thành công!',
        body: `Đã mua ${qty}x ${item.name} chuyển vào kho Silo.`,
      });
      await refetch();
      await qc.invalidateQueries({ queryKey: ['me'] });
    } catch (err) {
      play('error');
      setErrorMsg(err instanceof ApiError ? err.message : 'Giao dịch mua thất bại.');
    } finally {
      setLoadingAction(null);
    }
  };

  // 2. Sell Wholesale Produce
  const handleSell = async (item: WarehouseItem) => {
    const qty = Math.min(getQty(item.itemId), item.quantity);
    setLoadingAction(item.id);
    setErrorMsg(null);
    try {
      const res = await api<{ ok: boolean; coinEarned: number; fameEarned: number }>('/api/farm/shop/sell', {
        method: 'POST',
        idempotencyKey: crypto.randomUUID(),
        body: { itemId: item.itemId, quantity: qty },
      });
      play('coin');
      useUi.getState().toast({
        kind: 'reward',
        title: 'Bán sỉ nông sản thành công!',
        body: `Nhận được +${res.coinEarned.toLocaleString()} Xu vào ví!`,
      });
      await refetch();
      await qc.invalidateQueries({ queryKey: ['me'] });
    } catch (err) {
      play('error');
      setErrorMsg(err instanceof ApiError ? err.message : 'Giao dịch bán thất bại.');
    } finally {
      setLoadingAction(null);
    }
  };

  // 3. Fulfill Contract
  const handleFulfillContract = async (contract: MarketContractDef) => {
    setLoadingAction(contract.id);
    setErrorMsg(null);
    try {
      const res = await api<{ ok: boolean; coinEarned: number; fameEarned: number; bonusPercent: number }>(
        '/api/farm/shop/sell',
        {
          method: 'POST',
          idempotencyKey: crypto.randomUUID(),
          body: {
            itemId: contract.requiredItemId,
            quantity: contract.requiredQuantity,
            contractId: contract.id,
          },
        },
      );
      play('coin');
      useUi.getState().toast({
        kind: 'reward',
        title: 'Giao nộp hợp đồng thành công!',
        body: `Nhận thưởng +${res.coinEarned.toLocaleString()} Xu (+${res.bonusPercent}% Thưởng) và +${res.fameEarned} Danh tiếng!`,
      });
      await refetch();
      await qc.invalidateQueries({ queryKey: ['me'] });
    } catch (err) {
      play('error');
      setErrorMsg(err instanceof ApiError ? err.message : 'Không thể giao nộp hợp đồng.');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="panel"
        style={{
          maxWidth: 620,
          background: 'linear-gradient(180deg, #24160c 0%, #150c06 100%)',
          borderColor: '#b45309',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header" style={{ borderBottomColor: '#78350f' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Store size={20} color="#f59e0b" />
            <span style={{ color: '#fef3c7', fontWeight: 700, fontSize: 16 }}>Tiệm Nông Nghiệp Bác Sáu</span>
          </div>
          <button className="panel-close" onClick={onClose} aria-label="Đóng (Esc)">
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* NPC Greeting Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: '#1c1008',
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #78350f',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#ca8a04',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
              }}
            >
              🌾
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fef08a', fontWeight: 700, fontSize: 13 }}>
                Bác Sáu (Nông Dân Cựu Trào)
              </div>
              <div style={{ color: '#d4b996', fontSize: 12, fontStyle: 'italic' }}>
                "Chào con! Mua hạt giống vụ mới hay tới giao hàng hợp đồng chợ hôm nay vậy?"
              </div>
            </div>
          </div>

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

          {/* 3 Tabs */}
          <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid #78350f', paddingBottom: 6 }}>
            {[
              { id: 'buy', label: 'Mua Vật Tư & Giống', icon: ShoppingBag },
              { id: 'sell', label: 'Bán Sỉ Nông Sản', icon: DollarSign },
              { id: 'contracts', label: 'Hợp Đồng Hôm Nay (+25% Xu)', icon: ScrollText },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    play('click');
                    setActiveTab(tab.id as ShopTab);
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '8px 0',
                    background: isSelected ? '#3f220d' : 'transparent',
                    border: 'none',
                    borderRadius: 6,
                    color: isSelected ? '#fef08a' : '#a8a29e',
                    fontSize: 13,
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Buy */}
          {activeTab === 'buy' ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                maxHeight: 300,
                overflowY: 'auto',
                paddingRight: 4,
              }}
            >
              {BAC_SAU_SHOP_ITEMS.map((item) => {
                const qty = getQty(item.id);
                const cost = item.coinPrice * qty;
                const canAfford = me.balances.coin >= cost;
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#1c1008',
                      border: '1px solid #78350f',
                      borderRadius: 8,
                      padding: '10px 14px',
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#fef3c7', fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                      <div style={{ color: '#a8a29e', fontSize: 12 }}>{item.description}</div>
                      <div style={{ color: '#fde047', fontSize: 13, fontWeight: 700, marginTop: 2 }}>
                        {item.coinPrice} Xu / {item.unit}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setQty(item.id, qty - 1)}
                        style={{
                          background: '#0c0704',
                          border: '1px solid #78350f',
                          color: '#fef08a',
                          width: 26,
                          height: 26,
                          borderRadius: 4,
                          cursor: 'pointer',
                        }}
                      >
                        -
                      </button>
                      <span style={{ color: '#fef3c7', fontWeight: 700, minWidth: 24, textAlign: 'center' }}>
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(item.id, qty + 1)}
                        style={{
                          background: '#0c0704',
                          border: '1px solid #78350f',
                          color: '#fef08a',
                          width: 26,
                          height: 26,
                          borderRadius: 4,
                          cursor: 'pointer',
                        }}
                      >
                        +
                      </button>
                    </div>

                    <Button
                      variant="primary"
                      onClick={() => void handleBuy(item)}
                      disabled={loadingAction === item.id || !canAfford}
                      style={{
                        background: canAfford ? '#d97706' : '#57534e',
                        borderColor: '#b45309',
                        color: '#1c1917',
                        fontWeight: 700,
                        fontSize: 12,
                        padding: '6px 12px',
                        minWidth: 100,
                      }}
                    >
                      {loadingAction === item.id ? 'Đang mua...' : `Mua (${cost.toLocaleString()} Xu)`}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* Tab 2: Sell */}
          {activeTab === 'sell' ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                maxHeight: 300,
                overflowY: 'auto',
                paddingRight: 4,
              }}
            >
              {sellableItems.length === 0 ? (
                <div style={{ color: '#a8a29e', textAlign: 'center', padding: '36px 0', fontSize: 13 }}>
                  Kho Silo đang trống, chưa có nông sản hoặc sản phẩm chăn nuôi để bán sỉ.
                </div>
              ) : (
                sellableItems.map((item) => {
                  const qty = Math.min(getQty(item.itemId), item.quantity);
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#1c1008',
                        border: '1px solid #78350f',
                        borderRadius: 8,
                        padding: '10px 14px',
                        gap: 12,
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#fef3c7', fontWeight: 600, fontSize: 14 }}>
                          {item.itemId
                            .replace(/^(item_|seed_|fish_)/, '')
                            .replace(/_/g, ' ')
                            .toUpperCase()}
                        </div>
                        <div style={{ color: '#d4b996', fontSize: 12 }}>
                          Tồn kho Silo: <strong>{item.quantity}</strong> cái
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => setQty(item.itemId, qty - 1)}
                          style={{
                            background: '#0c0704',
                            border: '1px solid #78350f',
                            color: '#fef08a',
                            width: 26,
                            height: 26,
                            borderRadius: 4,
                            cursor: 'pointer',
                          }}
                        >
                          -
                        </button>
                        <span
                          style={{ color: '#fef3c7', fontWeight: 700, minWidth: 24, textAlign: 'center' }}
                        >
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(item.itemId, qty + 1)}
                          style={{
                            background: '#0c0704',
                            border: '1px solid #78350f',
                            color: '#fef08a',
                            width: 26,
                            height: 26,
                            borderRadius: 4,
                            cursor: 'pointer',
                          }}
                        >
                          +
                        </button>
                      </div>

                      <Button
                        variant="primary"
                        onClick={() => void handleSell(item)}
                        disabled={loadingAction === item.id || item.quantity === 0}
                        style={{
                          background: '#16a34a',
                          borderColor: '#15803d',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: 12,
                          padding: '6px 12px',
                        }}
                      >
                        {loadingAction === item.id ? 'Đang bán...' : `Bán Sỉ ${qty} Cái`}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          ) : null}

          {/* Tab 3: Contracts */}
          {activeTab === 'contracts' ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                maxHeight: 300,
                overflowY: 'auto',
                paddingRight: 4,
              }}
            >
              {contracts.map((c) => {
                const stock = warehouseItems.find((it) => it.itemId === c.requiredItemId)?.quantity ?? 0;
                const completed = data?.completedContracts?.includes(c.id) ?? false;
                const satisfied = stock >= c.requiredQuantity && !completed;
                return (
                  <div
                    key={c.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#1c1008',
                      border: '1px solid #78350f',
                      borderRadius: 8,
                      padding: '12px 14px',
                      gap: 12,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#fef08a', fontWeight: 700, fontSize: 14 }}>{c.title}</div>
                      <div style={{ color: '#a8a29e', fontSize: 12 }}>Đối tác: {c.clientName}</div>
                      <div style={{ color: '#d4b996', fontSize: 12, marginTop: 4 }}>
                        Yêu cầu: {c.requiredQuantity}x{' '}
                        {c.requiredItemId.replace(/^(item_|seed_|fish_)/, '').toUpperCase()} (Hiện có:{' '}
                        <strong style={{ color: satisfied ? '#22c55e' : '#f87171' }}>{stock}</strong>)
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 12 }}>
                        <span
                          style={{
                            color: '#fde047',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <CoinIcon /> +{c.rewardCoin.toLocaleString()} Xu (+25% Thưởng)
                        </span>
                        <span
                          style={{
                            color: '#38bdf8',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Award size={14} /> +{c.rewardFame} Fame
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      onClick={() => void handleFulfillContract(c)}
                      disabled={loadingAction === c.id || !satisfied}
                      style={{
                        background: satisfied ? '#eab308' : '#57534e',
                        borderColor: '#ca8a04',
                        color: satisfied ? '#1c1917' : '#d4b996',
                        fontWeight: 700,
                        fontSize: 12,
                        padding: '8px 14px',
                      }}
                    >
                      {loadingAction === c.id ? 'Đang giao...' : 'Giao Hợp Đồng'}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
