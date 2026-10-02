import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpCircle, Box, Egg, Package, Sprout, Wheat, X } from 'lucide-react';
import { useState } from 'react';
import { api, ApiError, type Me } from '../../lib/api';
import { play } from '../../lib/sound';
import { useUi } from '../../lib/store';
import { Button } from '../../ui/primitives';

type SiloTab = 'crops' | 'animal_products' | 'seeds_stocks' | 'supplies';

interface WarehouseItem {
  id: string;
  itemId: string;
  quantity: number;
  tab: string;
}

interface FarmMeResponse {
  farm: { ownerId: string };
  warehouse: { capacity: number; items: WarehouseItem[] };
}

const TAB_CONFIG: Record<SiloTab, { label: string; icon: typeof Wheat }> = {
  crops: { label: 'Nông Sản', icon: Wheat },
  animal_products: { label: 'Chăn Nuôi', icon: Egg },
  seeds_stocks: { label: 'Hạt & Con Giống', icon: Sprout },
  supplies: { label: 'Vật Tư', icon: Box },
};

export function FarmSiloPanel({ me, onClose }: { me: Me; onClose: () => void }) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<SiloTab>('crops');
  const [upgrading, setUpgrading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['farm', 'me'],
    queryFn: () => api<FarmMeResponse>('/api/farm/me'),
  });

  const isOwner = !data?.farm || data.farm.ownerId === me.id;
  const items = data?.warehouse.items ?? [];
  const capacity = data?.warehouse.capacity ?? 100;
  const totalQuantity = items.reduce((acc, it) => acc + it.quantity, 0);

  const filteredItems = items.filter((it) => {
    if (activeTab === 'crops') return it.tab === 'crops';
    if (activeTab === 'animal_products') return it.tab === 'animal_products';
    if (activeTab === 'seeds_stocks') return it.tab === 'seeds_stocks';
    if (activeTab === 'supplies') return it.tab === 'supplies';
    return true;
  });

  const handleUpgrade = async () => {
    setUpgrading(true);
    setErrorMsg(null);
    try {
      const res = await api<{ ok: boolean; newCapacity: number; coinBalance: number }>(
        '/api/farm/warehouse/upgrade',
        {
          method: 'POST',
          idempotencyKey: crypto.randomUUID(),
        },
      );
      play('coin');
      useUi.getState().toast({
        kind: 'reward',
        title: 'Nâng cấp kho thành công!',
        body: `Sức chứa mới: ${res.newCapacity} ngăn chứa đồ.`,
      });
      await refetch();
      await qc.invalidateQueries({ queryKey: ['me'] });
    } catch (err) {
      play('error');
      setErrorMsg(err instanceof ApiError ? err.message : 'Không thể nâng cấp kho Silo.');
    } finally {
      setUpgrading(false);
    }
  };

  return (
    <div className="backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="panel"
        style={{
          maxWidth: 580,
          background: 'linear-gradient(180deg, #24160c 0%, #150c06 100%)',
          borderColor: '#b45309',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header" style={{ borderBottomColor: '#78350f' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Box size={20} color="#f59e0b" />
            <span style={{ color: '#fef3c7', fontWeight: 700, fontSize: 16 }}>Nhà Kho Silo Nông Sản</span>
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

          {/* Capacity Progress Bar */}
          <div
            style={{
              background: '#1c1008',
              borderRadius: 8,
              padding: '12px 16px',
              border: '1px solid #78350f',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#d4b996', fontSize: 13 }}>
                Sức Chứa Kho Silo: <strong style={{ color: '#fef08a' }}>{totalQuantity}</strong> / {capacity}{' '}
                Ngăn
              </span>
              {isOwner ? (
                <Button
                  variant="ghost"
                  onClick={() => void handleUpgrade()}
                  disabled={upgrading || me.balances.coin < 1000}
                  style={{
                    fontSize: 12,
                    padding: '4px 10px',
                    borderColor: '#f59e0b',
                    color: '#fef08a',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <ArrowUpCircle size={14} /> Nâng cấp (+50 ngăn, 1,000 Xu)
                </Button>
              ) : null}
            </div>
            <div
              style={{ width: '100%', height: 8, background: '#0c0704', borderRadius: 4, overflow: 'hidden' }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.min(100, (totalQuantity / capacity) * 100)}%`,
                  background:
                    totalQuantity >= capacity
                      ? '#ef4444'
                      : totalQuantity > capacity * 0.8
                        ? '#f59e0b'
                        : '#22c55e',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          {/* 4 Tabs */}
          <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid #78350f', paddingBottom: 6 }}>
            {(Object.keys(TAB_CONFIG) as SiloTab[]).map((tabKey) => {
              const cfg = TAB_CONFIG[tabKey];
              const Icon = cfg.icon;
              const isSelected = activeTab === tabKey;
              return (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => {
                    play('click');
                    setActiveTab(tabKey);
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
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>

          {/* Items Grid */}
          {isLoading ? (
            <div style={{ color: '#d4b996', textAlign: 'center', padding: 30 }}>
              Đang kiểm tra kho Silo...
            </div>
          ) : filteredItems.length === 0 ? (
            <div style={{ color: '#a8a29e', textAlign: 'center', padding: '36px 0', fontSize: 13 }}>
              Danh mục này hiện chưa có vật phẩm trong kho Silo.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                gap: 10,
                maxHeight: 280,
                overflowY: 'auto',
                paddingRight: 4,
              }}
            >
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: '#1c1008',
                    border: '1px solid #78350f',
                    borderRadius: 8,
                    padding: '10px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 6,
                      background: '#0c0704',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid #5c3a21',
                    }}
                  >
                    <Package size={22} color="#f59e0b" />
                  </div>
                  <span
                    style={{
                      color: '#fef3c7',
                      fontSize: 12,
                      fontWeight: 600,
                      textAlign: 'center',
                      wordBreak: 'break-word',
                      lineHeight: 1.2,
                    }}
                  >
                    {item.itemId
                      .replace(/^(item_|seed_|fish_)/, '')
                      .replace(/_/g, ' ')
                      .toUpperCase()}
                  </span>
                  <span
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      background: '#b45309',
                      color: '#ffffff',
                      fontSize: 10,
                      fontWeight: 700,
                      borderRadius: 10,
                      padding: '1px 5px',
                    }}
                  >
                    x{item.quantity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
