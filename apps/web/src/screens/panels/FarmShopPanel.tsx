import {
  BAC_SAU_SHOP_ITEMS,
  CROPS,
  ANIMALS,
  POND_FISHES,
  DAILY_MARKET_CONTRACTS,
  computeAnimalGrowthStage,
  type FarmShopItemDef,
  type MarketContractDef,
} from '@cozy/game-data';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DollarSign, PackageCheck, ScrollText, ShoppingBag, Sparkles, Store, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { farmItemIcon } from '../../art/farm-icons';
import { api, ApiError, num, type Me } from '../../lib/api';
import { play } from '../../lib/sound';
import { useUi } from '../../lib/store';
import { Button, CoinIcon, Panel } from '../../ui/primitives';

type ShopTab = 'buy' | 'sell' | 'contracts';
type ShopCategory = 'all' | 'seeds' | 'livestock' | 'feed' | 'supplies';

interface WarehouseItem {
  id: string;
  itemId: string;
  quantity: number;
  tab: string;
}

interface FarmAnimalSummary {
  id: string;
  type: string;
  name: string;
  createdAt?: string;
  fedAt?: string | null;
  growthAccumSec?: number;
  happiness: number;
  isDead?: boolean;
}

interface FarmMeResponse {
  completedContracts?: string[];
  farm: { ownerId: string };
  warehouse: { capacity: number; items: WarehouseItem[] };
  todayContracts?: MarketContractDef[];
  animals?: FarmAnimalSummary[];
}

export function FarmShopPanel({ me, onClose }: { me: Me; onClose: () => void }) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<ShopTab>('buy');
  const [categoryFilter, setCategoryFilter] = useState<ShopCategory>('all');
  const [sellCategory, setSellCategory] = useState<'produce' | 'animals'>('produce');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data, refetch } = useQuery({
    queryKey: ['farm', 'me'],
    queryFn: () => api<FarmMeResponse>('/api/farm/me'),
  });

  const warehouseItems = data?.warehouse.items ?? [];
  const farmAnimals = data?.animals ?? [];
  const sellableItems = warehouseItems.filter(
    (item) =>
      Object.values(CROPS).some((c) => c.harvestItemId === item.itemId || c.id === item.itemId) ||
      Object.values(ANIMALS).some((a) => a.yieldItemId === item.itemId || a.yieldItem === item.itemId) ||
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
      if (item.id === 'tractor_farm') {
        try {
          await api('/inventory/equip', {
            method: 'POST',
            body: { itemId: 'tractor_farm', slot: 'vehicle' },
          });
        } catch {
          // ignore
        }
        useUi.getState().setOwnsTractor(true);
      }
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

  // 3. Sell All Produce
  const handleSellAll = async () => {
    if (sellableItems.length === 0) return;
    setLoadingAction('sell-all');
    setErrorMsg(null);
    try {
      const res = await api<{ ok: boolean; totalCoinEarned: number; totalItemsSold: number }>(
        '/api/farm/shop/sell-all',
        {
          method: 'POST',
          idempotencyKey: crypto.randomUUID(),
        },
      );
      play('coin');
      useUi.getState().toast({
        kind: 'reward',
        title: 'Bán tất cả nông sản thành công!',
        body: `Đã bán ${res.totalItemsSold} nông sản, nhận về +${res.totalCoinEarned.toLocaleString()} Xu!`,
      });
      await refetch();
      await qc.invalidateQueries({ queryKey: ['me'] });
    } catch (err) {
      play('error');
      setErrorMsg(err instanceof ApiError ? err.message : 'Không thể bán tất cả nông sản.');
    } finally {
      setLoadingAction(null);
    }
  };

  // 4. Fulfill Contract
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

  // 5. Sell Live Animal / Clean up Carcass
  const handleSellAnimal = async (animalId: string, sellPrice: number, name: string) => {
    setLoadingAction(`sell_animal_${animalId}`);
    setErrorMsg(null);
    try {
      const res = await api<{ ok: boolean; coinEarned: number }>('/api/farm/animals/sell', {
        method: 'POST',
        idempotencyKey: crypto.randomUUID(),
        body: { animalId },
      });
      if (sellPrice > 0) {
        play('coin');
        useUi.getState().toast({
          kind: 'reward',
          title: 'Xuất bán vật nuôi thành công!',
          body: `Đã bán ${name} cho Tiệm Bác Sáu thu về +${num(res.coinEarned || sellPrice)} Xu!`,
        });
      } else {
        play('pop');
        useUi.getState().toast({
          kind: 'info',
          title: 'Đã dọn dẹp xác!',
          body: `Đã dọn dẹp xác ${name} để giải phóng vị trí trong chuồng trại.`,
        });
      }
      await refetch();
      await qc.invalidateQueries({ queryKey: ['me'] });
      await qc.invalidateQueries({ queryKey: ['farm'] });
      window.dispatchEvent(new CustomEvent('farm:refresh'));
    } catch (err) {
      play('error');
      setErrorMsg(err instanceof ApiError ? err.message : 'Dọn dẹp/xuất bán vật nuôi thất bại.');
    } finally {
      setLoadingAction(null);
    }
  };

  const filteredShopItems = BAC_SAU_SHOP_ITEMS.filter((item) => {
    if (categoryFilter === 'all') return true;
    return item.category === categoryFilter;
  });

  return (
    <Panel
      title="Tiệm Nông Nghiệp Bác Sáu"
      icon={<Store size={20} color="#f59e0b" />}
      actions={
        <span className="row" style={{ gap: 6, fontWeight: 700, color: 'var(--coin)' }}>
          <CoinIcon size={16} /> {num(me.balances.coin)} Xu
        </span>
      }
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* NPC Greeting Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'rgba(30, 41, 59, 0.45)',
            border: '1px solid rgba(148, 163, 184, 0.15)',
            padding: '10px 14px',
            borderRadius: 8,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: '#b45309',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            🌾
          </div>
          <div>
            <div style={{ color: '#fef3c7', fontWeight: 600, fontSize: 13 }}>
              Bác Sáu Lão Nông · Tiệm Cung Ứng Nông Nghiệp
            </div>
            <div style={{ color: '#cbd5e1', fontSize: 12 }}>
              &quot;Giống tốt, phân ủ mục, máy cày khỏe tay thì mùa màng ắt bội thu rủng rỉnh túi tiền!&quot;
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

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            background: 'rgba(15, 23, 42, 0.6)',
            padding: 4,
            borderRadius: 8,
            border: '1px solid rgba(148, 163, 184, 0.15)',
          }}
        >
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
                  padding: '8px 12px',
                  background: isSelected ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                  border: isSelected ? '1px solid #f59e0b' : '1px solid transparent',
                  borderRadius: 6,
                  color: isSelected ? '#fef08a' : '#94a3b8',
                  fontSize: 13,
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: BUY SUPPLIES, SEEDS & TRACTOR */}
        {activeTab === 'buy' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Filter categories */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'Tất Cả' },
                { id: 'seeds', label: 'Hạt Giống' },
                { id: 'livestock', label: 'Con Giống' },
                { id: 'feed', label: 'Thức Ăn' },
                { id: 'supplies', label: 'Vật Tư & Xe Cày' },
              ].map((cat) => {
                const isSelected = categoryFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      play('click');
                      setCategoryFilter(cat.id as ShopCategory);
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 16,
                      fontSize: 12,
                      fontWeight: isSelected ? 700 : 500,
                      background: isSelected ? '#f59e0b' : 'rgba(30, 41, 59, 0.6)',
                      color: isSelected ? '#000000' : '#cbd5e1',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      cursor: 'pointer',
                    }}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Product Cards Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: 10,
                maxHeight: 380,
                overflowY: 'auto',
                paddingRight: 4,
              }}
            >
              {filteredShopItems.map((item) => {
                const qty = getQty(item.id);
                const cost = item.coinPrice * qty;
                const canAfford = me.balances.coin >= cost;
                const crop = Object.values(CROPS).find((c) => c.seedItemId === item.id);
                const animalDef = Object.values(ANIMALS).find((a) => a.stockItemId === item.id);
                const maxAfford = Math.max(1, Math.min(999, Math.floor(me.balances.coin / item.coinPrice)));

                return (
                  <div
                    key={item.id}
                    style={{
                      background: 'rgba(30, 41, 59, 0.45)',
                      border: '1px solid rgba(148, 163, 184, 0.15)',
                      borderRadius: 8,
                      padding: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    {/* Header info */}
                    <div style={{ display: 'flex', gap: 10 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 8,
                          background: 'rgba(15, 23, 42, 0.6)',
                          border: '1px solid rgba(148, 163, 184, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          overflow: 'hidden',
                        }}
                      >
                        <img
                          src={farmItemIcon(item.id, 40)}
                          alt={item.name}
                          style={{ width: 36, height: 36, imageRendering: 'pixelated' }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            color: '#fef3c7',
                            fontWeight: 700,
                            fontSize: 13,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.name}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.3, marginTop: 2 }}>
                          {item.description}
                        </div>
                      </div>
                    </div>

                    {/* Metadata tags */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {crop ? (
                        <span
                          style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: 'rgba(34, 197, 94, 0.15)',
                            color: '#4ade80',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                          }}
                        >
                          🌱 Lớn: {Math.round((crop.growthDurationSec / 60) * 10) / 10} phút
                        </span>
                      ) : null}
                      {animalDef ? (
                        <>
                          <span
                            style={{
                              fontSize: 10,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: 'rgba(56, 189, 248, 0.15)',
                              color: '#38bdf8',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                            }}
                          >
                            ⏳ Lớn: {Math.round(animalDef.growthDurationSec / 60)} phút
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: 'rgba(16, 185, 129, 0.15)',
                              color: '#34d399',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                            }}
                          >
                            💰 Lớn bán: {num(animalDef.matureSellPrice)} Xu
                          </span>
                        </>
                      ) : null}
                      {item.id.includes('tractor') ? (
                        <span
                          style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: 'rgba(234, 179, 8, 0.15)',
                            color: '#fde047',
                            border: '1px solid rgba(234, 179, 8, 0.3)',
                          }}
                        >
                          🚜 Tự động gieo & gặt
                        </span>
                      ) : null}
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--coin)',
                          marginLeft: 'auto',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <CoinIcon size={12} /> {num(item.coinPrice)} Xu
                      </span>
                    </div>

                    {/* Quick quantity selectors 1, 5, 10, Max */}
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[1, 5, 10].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setQty(item.id, amt)}
                          style={{
                            flex: 1,
                            padding: '3px 0',
                            borderRadius: 4,
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            background: qty === amt ? '#b45309' : 'rgba(15, 23, 42, 0.5)',
                            color: qty === amt ? '#ffffff' : '#cbd5e1',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {amt}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setQty(item.id, maxAfford)}
                        style={{
                          flex: 1,
                          padding: '3px 0',
                          borderRadius: 4,
                          border: '1px solid rgba(148, 163, 184, 0.2)',
                          background: qty === maxAfford ? '#b45309' : 'rgba(15, 23, 42, 0.5)',
                          color: '#fef08a',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Max
                      </button>
                    </div>

                    {/* Stepper & Buy Action */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          background: 'rgba(15, 23, 42, 0.6)',
                          borderRadius: 6,
                          border: '1px solid rgba(148, 163, 184, 0.2)',
                          padding: 2,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setQty(item.id, qty - 1)}
                          style={{
                            width: 24,
                            height: 24,
                            background: 'transparent',
                            border: 'none',
                            color: '#fef08a',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          -
                        </button>
                        <span
                          style={{
                            minWidth: 26,
                            textAlign: 'center',
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#ffffff',
                          }}
                        >
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(item.id, qty + 1)}
                          style={{
                            width: 24,
                            height: 24,
                            background: 'transparent',
                            border: 'none',
                            color: '#fef08a',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          +
                        </button>
                      </div>

                      <Button
                        variant={canAfford ? 'primary' : 'secondary'}
                        onClick={() => void handleBuy(item)}
                        disabled={!canAfford || loadingAction === item.id}
                        style={{
                          flex: 1,
                          fontSize: 12,
                          padding: '6px 8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <CoinIcon size={12} />
                        {loadingAction === item.id ? 'Đang mua...' : `Mua (${num(cost)} Xu)`}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* TAB 2: SELL HARVESTED PRODUCE */}
        {activeTab === 'sell' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Category Toggle: Nông Sản vs Vật Nuôi */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  play('click');
                  setSellCategory('produce');
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: sellCategory === 'produce' ? 700 : 500,
                  background: sellCategory === 'produce' ? '#f59e0b' : 'rgba(30, 41, 59, 0.6)',
                  color: sellCategory === 'produce' ? '#000000' : '#cbd5e1',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>🌾 Kho Nông Sản ({sellableItems.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  play('click');
                  setSellCategory('animals');
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: sellCategory === 'animals' ? 700 : 500,
                  background: sellCategory === 'animals' ? '#f59e0b' : 'rgba(30, 41, 59, 0.6)',
                  color: sellCategory === 'animals' ? '#000000' : '#cbd5e1',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>🐄 Đàn Vật Nuôi ({farmAnimals.length})</span>
              </button>
            </div>

            {sellCategory === 'animals' ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: 10,
                  maxHeight: 340,
                  overflowY: 'auto',
                  paddingRight: 4,
                }}
              >
                {farmAnimals.length === 0 ? (
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      textAlign: 'center',
                      padding: '36px 0',
                      color: '#94a3b8',
                      fontSize: 13,
                    }}
                  >
                    Trang trại hiện chưa có vật nuôi nào. Hãy mua con giống ở mục &quot;Mua Sắm&quot; để nuôi
                    lớn nhé!
                  </div>
                ) : (
                  farmAnimals.map((animal) => {
                    const def = (ANIMALS as Record<string, (typeof ANIMALS)[keyof typeof ANIMALS]>)[
                      animal.type
                    ];
                    const growth = computeAnimalGrowthStage(
                      animal.type,
                      animal.createdAt || null,
                      Date.now(),
                      animal.fedAt || null,
                      animal.growthAccumSec || 0,
                    );
                    const isDead = growth.isDead;
                    const isAdult = !isDead && growth.stage === 'adult';
                    const isBusy = loadingAction === `sell_animal_${animal.id}`;
                    return (
                      <div
                        key={animal.id}
                        style={{
                          background: isDead ? 'rgba(30, 15, 20, 0.7)' : 'rgba(30, 41, 59, 0.6)',
                          border: isDead
                            ? '1px solid rgba(239, 68, 68, 0.5)'
                            : isAdult
                              ? '1px solid rgba(16, 185, 129, 0.4)'
                              : '1px solid rgba(148, 163, 184, 0.2)',
                          borderRadius: 8,
                          padding: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <img
                            src={farmItemIcon(animal.type, 36)}
                            alt={growth.displayName}
                            style={{
                              width: 36,
                              height: 36,
                              imageRendering: 'pixelated',
                              filter: isDead ? 'grayscale(100%) opacity(50%)' : 'none',
                            }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{ color: isDead ? '#f87171' : '#fef3c7', fontWeight: 700, fontSize: 13 }}
                            >
                              {growth.displayName}
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: 11 }}>
                              {isDead
                                ? '💀 Đã chết vì đói'
                                : isAdult
                                  ? '✨ Trưởng thành'
                                  : !animal.fedAt && !animal.growthAccumSec
                                    ? '🌱 Cần ăn để lớn (0%)'
                                    : `Đang lớn: ${growth.progressPercent}%`}
                            </div>
                          </div>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 700,
                              background: isDead
                                ? 'rgba(239, 68, 68, 0.2)'
                                : isAdult
                                  ? 'rgba(16, 185, 129, 0.2)'
                                  : 'rgba(245, 158, 11, 0.2)',
                              color: isDead ? '#ef4444' : isAdult ? '#34d399' : '#fbbf24',
                            }}
                          >
                            {isDead ? 'Đã Chết' : isAdult ? 'Đạt chuẩn' : `${growth.progressPercent}%`}
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 11,
                            color: '#cbd5e1',
                          }}
                        >
                          <span>{isDead ? 'Dọn dẹp xác:' : 'Giá xuất bán:'}</span>
                          <span style={{ fontWeight: 700, color: isDead ? '#f87171' : 'var(--coin)' }}>
                            {num(growth.sellPrice)} Xu
                            {isAdult && def && !isDead ? (
                              <span style={{ color: '#34d399', marginLeft: 4 }}>
                                (+{num(growth.sellPrice - def.stockPrice)} Lãi)
                              </span>
                            ) : null}
                          </span>
                        </div>

                        <Button
                          variant={isDead ? 'secondary' : isAdult ? 'reward' : 'secondary'}
                          disabled={isBusy}
                          onClick={() =>
                            void handleSellAnimal(animal.id, growth.sellPrice, growth.displayName)
                          }
                          style={{
                            fontSize: 12,
                            padding: '6px 8px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6,
                            background: isDead ? 'rgba(239, 68, 68, 0.2)' : undefined,
                            color: isDead ? '#fca5a5' : undefined,
                            borderColor: isDead ? 'rgba(239, 68, 68, 0.4)' : undefined,
                          }}
                        >
                          <CoinIcon size={12} />
                          {isBusy
                            ? 'Đang xử lý...'
                            : isDead
                              ? 'Dọn Dẹp Xác (0 Xu)'
                              : `Bán Lấy ${num(growth.sellPrice)} Xu`}
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              <>
                {/* Quick sell all action bar */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(22, 163, 74, 0.15)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    padding: '10px 14px',
                    borderRadius: 8,
                  }}
                >
                  <div>
                    <div style={{ color: '#86efac', fontWeight: 700, fontSize: 13 }}>
                      Thu Mua Sỉ Nông Sản Bác Sáu
                    </div>
                    <div style={{ color: '#cbd5e1', fontSize: 11 }}>
                      Có sẵn {sellableItems.reduce((acc, it) => acc + it.quantity, 0)} nông sản trong kho Silo
                    </div>
                  </div>
                  <Button
                    variant="reward"
                    onClick={() => void handleSellAll()}
                    disabled={sellableItems.length === 0 || loadingAction === 'sell-all'}
                    style={{
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 700,
                    }}
                  >
                    <Sparkles size={14} />
                    {loadingAction === 'sell-all' ? 'Đang bán tất cả...' : 'Bán Tất Cả Nông Sản'}
                  </Button>
                </div>

                {/* Produce Cards Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: 10,
                    maxHeight: 340,
                    overflowY: 'auto',
                    paddingRight: 4,
                  }}
                >
                  {sellableItems.length === 0 ? (
                    <div
                      style={{
                        gridColumn: '1 / -1',
                        textAlign: 'center',
                        padding: '36px 0',
                        color: '#94a3b8',
                        fontSize: 13,
                      }}
                    >
                      Kho Silo đang trống, chưa có nông sản hoặc sản phẩm chăn nuôi để bán sỉ.
                    </div>
                  ) : (
                    sellableItems.map((item) => {
                      const qty = Math.min(getQty(item.itemId), item.quantity);
                      const crop = Object.values(CROPS).find(
                        (c) => c.harvestItemId === item.itemId || c.id === item.itemId,
                      );
                      const animal = Object.values(ANIMALS).find(
                        (a) => a.yieldItemId === item.itemId || a.yieldItem === item.itemId,
                      );
                      const pondFish = Object.values(POND_FISHES).find(
                        (p) => p.harvestItemId === item.itemId,
                      );

                      const unitPrice =
                        crop?.sellPrice ??
                        animal?.yieldPrice ??
                        (pondFish ? Math.floor(pondFish.pricePerKg * pondFish.marketWeightMinKg) : 20);
                      const totalEarned = unitPrice * qty;

                      return (
                        <div
                          key={item.id}
                          style={{
                            background: 'rgba(30, 41, 59, 0.45)',
                            border: '1px solid rgba(148, 163, 184, 0.15)',
                            borderRadius: 8,
                            padding: 12,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: 8,
                          }}
                        >
                          <div style={{ display: 'flex', gap: 10 }}>
                            <div
                              style={{
                                width: 44,
                                height: 44,
                                borderRadius: 8,
                                background: 'rgba(15, 23, 42, 0.6)',
                                border: '1px solid rgba(148, 163, 184, 0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <img
                                src={farmItemIcon(item.itemId, 40)}
                                alt={item.itemId}
                                style={{ width: 36, height: 36, imageRendering: 'pixelated' }}
                              />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  color: '#fef3c7',
                                  fontWeight: 700,
                                  fontSize: 13,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {crop?.name ??
                                  animal?.name ??
                                  pondFish?.name ??
                                  item.itemId.replace('crop_', '').replace('_harvest', '').toUpperCase()}
                              </div>
                              <div style={{ color: '#38bdf8', fontSize: 11, marginTop: 2 }}>
                                Có trong kho Silo: <strong>{item.quantity}</strong> cái
                              </div>
                            </div>
                          </div>

                          {/* Quick quantity selectors 1, 5, 10, Max */}
                          <div style={{ display: 'flex', gap: 4 }}>
                            {[1, 5, 10].map((amt) => (
                              <button
                                key={amt}
                                type="button"
                                onClick={() => setQty(item.itemId, Math.min(amt, item.quantity))}
                                style={{
                                  flex: 1,
                                  padding: '3px 0',
                                  borderRadius: 4,
                                  border: '1px solid rgba(148, 163, 184, 0.2)',
                                  background: qty === amt ? '#b45309' : 'rgba(15, 23, 42, 0.5)',
                                  color: qty === amt ? '#ffffff' : '#cbd5e1',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                {amt}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => setQty(item.itemId, item.quantity)}
                              style={{
                                flex: 1,
                                padding: '3px 0',
                                borderRadius: 4,
                                border: '1px solid rgba(148, 163, 184, 0.2)',
                                background: qty === item.quantity ? '#b45309' : 'rgba(15, 23, 42, 0.5)',
                                color: '#fef08a',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Max
                            </button>
                          </div>

                          {/* Stepper & Sell Action */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                background: 'rgba(15, 23, 42, 0.6)',
                                borderRadius: 6,
                                border: '1px solid rgba(148, 163, 184, 0.2)',
                                padding: 2,
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => setQty(item.itemId, qty - 1)}
                                style={{
                                  width: 24,
                                  height: 24,
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#fef08a',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                -
                              </button>
                              <span
                                style={{
                                  minWidth: 26,
                                  textAlign: 'center',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  color: '#ffffff',
                                }}
                              >
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => setQty(item.itemId, Math.min(item.quantity, qty + 1))}
                                style={{
                                  width: 24,
                                  height: 24,
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#fef08a',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                +
                              </button>
                            </div>

                            <Button
                              variant="secondary"
                              onClick={() => void handleSell(item)}
                              disabled={loadingAction === item.id}
                              style={{
                                flex: 1,
                                fontSize: 12,
                                padding: '6px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                color: 'var(--coin)',
                                fontWeight: 700,
                              }}
                            >
                              <CoinIcon size={12} />
                              {loadingAction === item.id ? 'Đang bán...' : `Bán (+${num(totalEarned)} Xu)`}
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        ) : null}

        {/* TAB 3: DAILY CONTRACTS */}
        {activeTab === 'contracts' ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              maxHeight: 380,
              overflowY: 'auto',
              paddingRight: 4,
            }}
          >
            {contracts.map((c) => {
              const stock =
                warehouseItems.find(
                  (i) =>
                    i.itemId === c.requiredItemId ||
                    i.itemId === c.requiredItemId.replace('_harvest', '') ||
                    i.itemId.replace('_harvest', '') === c.requiredItemId,
                )?.quantity ?? 0;
              const completed = data?.completedContracts?.includes(c.id) ?? false;
              const satisfied = stock >= c.requiredQuantity && !completed;
              const progressPct = Math.min(100, Math.round((stock / c.requiredQuantity) * 100));

              return (
                <div
                  key={c.id}
                  style={{
                    background: completed ? 'rgba(15, 23, 42, 0.4)' : 'rgba(30, 41, 59, 0.45)',
                    border: completed ? '1px solid rgba(148, 163, 184, 0.1)' : '1px solid #d97706',
                    borderRadius: 8,
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  {/* Contract Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ color: '#fef08a', fontWeight: 700, fontSize: 14 }}>{c.title}</div>
                      <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
                        Đối tác: <strong style={{ color: '#e2e8f0' }}>{c.clientName}</strong> ·{' '}
                        {c.description}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <span
                        style={{
                          background: 'rgba(234, 179, 8, 0.2)',
                          color: '#fde047',
                          border: '1px solid rgba(234, 179, 8, 0.4)',
                          fontSize: 10,
                          fontWeight: 700,
                          borderRadius: 4,
                          padding: '2px 6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <TrendingUp size={12} /> +25% Thưởng
                      </span>
                      <span
                        style={{
                          background: 'rgba(56, 189, 248, 0.15)',
                          color: '#38bdf8',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          fontSize: 10,
                          fontWeight: 700,
                          borderRadius: 4,
                          padding: '2px 6px',
                        }}
                      >
                        +{c.rewardFame} Fame
                      </span>
                    </div>
                  </div>

                  {/* Fulfillment Progress */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      background: 'rgba(15, 23, 42, 0.5)',
                      padding: '8px 12px',
                      borderRadius: 6,
                    }}
                  >
                    <img
                      src={farmItemIcon(c.requiredItemId, 32)}
                      alt={c.requiredItemId}
                      style={{ width: 28, height: 28, imageRendering: 'pixelated' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: '#cbd5e1' }}>Tiến độ gom hàng:</span>
                        <span
                          style={{
                            color: stock >= c.requiredQuantity ? '#4ade80' : '#f87171',
                            fontWeight: 700,
                          }}
                        >
                          {stock} / {c.requiredQuantity}
                        </span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: 6,
                          background: 'rgba(0,0,0,0.4)',
                          borderRadius: 3,
                          overflow: 'hidden',
                          marginTop: 4,
                        }}
                      >
                        <div
                          style={{
                            width: `${progressPct}%`,
                            height: '100%',
                            background: progressPct >= 100 ? '#22c55e' : '#f59e0b',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div
                        style={{
                          color: 'var(--coin)',
                          fontWeight: 700,
                          fontSize: 13,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <CoinIcon size={14} /> +{num(c.rewardCoin)} Xu
                      </div>
                    </div>
                  </div>

                  {/* Action button */}
                  <div>
                    {completed ? (
                      <div
                        style={{
                          color: '#4ade80',
                          fontSize: 12,
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          justifyContent: 'flex-end',
                        }}
                      >
                        <PackageCheck size={16} /> Đã hoàn thành hợp đồng hôm nay ✓
                      </div>
                    ) : (
                      <Button
                        variant={satisfied ? 'reward' : 'secondary'}
                        onClick={() => void handleFulfillContract(c)}
                        disabled={!satisfied || loadingAction === c.id}
                        style={{
                          width: '100%',
                          fontSize: 12,
                          fontWeight: 700,
                          padding: '6px 12px',
                        }}
                      >
                        {loadingAction === c.id
                          ? 'Đang giao nộp...'
                          : satisfied
                            ? `Giao Hàng Ngay (+${num(c.rewardCoin)} Xu & +${c.rewardFame} Fame)`
                            : `Còn thiếu ${c.requiredQuantity - stock} sản phẩm trong kho Silo`}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
