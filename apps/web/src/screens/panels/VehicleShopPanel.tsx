import { vehicleById } from '@cozy/game-data';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Car } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { net } from '../../game/net';
import { vehicleCanvas } from '../../art/vehicle';
import { api, newIdempotencyKey, num, type Me, type ShopItem } from '../../lib/api';
import { qk, useRefreshEconomy } from '../../lib/queries';
import { useUi } from '../../lib/store';
import { Button, ErrorState, LoadingState, Panel, toastError } from '../../ui/primitives';
const BRAND_COLORS: Record<string, { bg: string; color: string }> = {
  Ducati: { bg: 'rgba(220, 38, 38, 0.2)', color: '#ef4444' },
  Ferrari: { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' },
  Lamborghini: { bg: 'rgba(234, 179, 8, 0.2)', color: '#facc15' },
  'Mercedes-Benz': { bg: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' },
  Porsche: { bg: 'rgba(14, 165, 233, 0.2)', color: '#38bdf8' },
  Kawasaki: { bg: 'rgba(34, 197, 94, 0.2)', color: '#4ade80' },
  Yamaha: { bg: 'rgba(37, 99, 235, 0.2)', color: '#60a5fa' },
  BMW: { bg: 'rgba(234, 179, 8, 0.2)', color: '#facc15' },
  Toyota: { bg: 'rgba(249, 115, 22, 0.2)', color: '#fb923c' },
  Ford: { bg: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' },
  Trek: { bg: 'rgba(2, 132, 199, 0.2)', color: '#38bdf8' },
  Vespa: { bg: 'rgba(244, 63, 94, 0.2)', color: '#fb7185' },
  Honda: { bg: 'rgba(14, 165, 233, 0.2)', color: '#38bdf8' },
  'Harley-Davidson': { bg: 'rgba(113, 113, 122, 0.2)', color: '#d4d4d8' },
  'Rolls-Royce': { bg: 'rgba(100, 116, 139, 0.2)', color: '#cbd5e1' },
  Tesla: { bg: 'rgba(226, 232, 240, 0.2)', color: '#f1f5f9' },
};

type VehicleCategoryFilter =
  'all' | 'inspect' | 'supercars' | 'luxury_muscle' | 'superbikes' | 'heritage_bicycle';

const VEHICLE_CATEGORIES: Record<string, 'supercars' | 'luxury_muscle' | 'superbikes' | 'heritage_bicycle'> =
  {
    car_ferrari_f40: 'supercars',
    car_lamborghini: 'supercars',
    car_porsche: 'supercars',
    car_toyota_supra_mk4: 'supercars',
    car_sunset: 'supercars',

    car_rolls_royce_phantom: 'luxury_muscle',
    car_mint: 'luxury_muscle',
    car_ford_mustang: 'luxury_muscle',
    car_tesla_model_s: 'luxury_muscle',
    car_mercedes: 'luxury_muscle',

    motorcycle_ducati: 'superbikes',
    motorcycle_kawasaki_ninja_h2: 'superbikes',
    motorcycle_yamaha_r1: 'superbikes',
    motorcycle_bmw_r1250_gs: 'superbikes',

    motorcycle_coral: 'heritage_bicycle',
    motorcycle_honda_super_cub: 'heritage_bicycle',
    motorcycle_harley_fat_boy: 'heritage_bicycle',
    bicycle_sky: 'heritage_bicycle',
  };

const ROTATION_ORDER = [0, 2, 3, 1] as const;
const DIR_LABELS: Record<number, string> = {
  0: 'Mặt trước',
  1: 'Hông trái',
  2: 'Hông phải',
  3: 'Đuôi xe',
};

function VehiclePreview({ id }: { id: string }) {
  const [dir, setDir] = useState<number>(2);
  const src = useMemo(() => vehicleCanvas(id, dir).toDataURL(), [id, dir]);

  const rotate = (delta: 1 | -1) => {
    setDir((cur) => {
      const idx = ROTATION_ORDER.indexOf(cur as (typeof ROTATION_ORDER)[number]);
      const nextIdx = (idx + delta + ROTATION_ORDER.length) % ROTATION_ORDER.length;
      return ROTATION_ORDER[nextIdx]!;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 148 }}>
      <img
        src={src}
        alt=""
        width={144}
        height={120}
        style={{ imageRendering: 'pixelated', objectFit: 'contain', display: 'block' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <Button variant="secondary" size="sm" onClick={() => rotate(-1)} title="Xoay ngược chiều kim đồng hồ">
          ◀
        </Button>
        <Button variant="secondary" size="sm" onClick={() => rotate(1)} title="Xoay 360 độ">
          Xoay 360° ({DIR_LABELS[dir] ?? 'Xoay'}) ▶
        </Button>
      </div>
    </div>
  );
}
export function VehicleShopPanel({ me, onClose }: { me: Me; onClose: () => void }) {
  const room = useUi((s) => s.room.kind);
  const displayId = useUi((s) => s.showroomVehicle);
  const [category, setCategory] = useState<VehicleCategoryFilter>(displayId ? 'inspect' : 'all');
  const shop = useQuery({ queryKey: qk.shop, queryFn: () => api<ShopItem[]>('/shop') });
  const refresh = useRefreshEconomy();
  const keys = useRef(new Map<string, string>());
  const buy = useMutation({
    mutationFn: (item: ShopItem) => {
      if (!keys.current.has(item.id)) keys.current.set(item.id, newIdempotencyKey());
      return api('/shop/buy', {
        body: { itemId: item.id, quantity: 1 },
        idempotencyKey: keys.current.get(item.id)!,
      });
    },
    onSuccess: (_data, item) => {
      keys.current.delete(item.id);
      refresh();
      useUi.getState().toast({
        kind: 'success',
        title: `Đã mua ${item.name}`,
        body: 'Chọn xe, ra lòng đường hoặc sân gara rồi nhấn V để lái.',
      });
    },
    onError: (e) => {
      refresh();
      toastError(e);
    },
  });
  const equip = useMutation({
    mutationFn: (itemId: string) => api('/inventory/equip', { body: { itemId, slot: 'vehicle' } }),
    onSuccess: () => {
      refresh();
      useUi.getState().toast({
        kind: 'success',
        title: 'Đã trang bị xe',
        body: 'Ra sân gara, nhấn V hoặc bấm Lên xe để bắt đầu lái.',
      });
    },
    onError: (e) => toastError(e),
  });
  return (
    <Panel
      icon={<Car size={18} />}
      eyebrow="Gara Bạc Hà · Phòng trưng bày"
      title="Cửa hàng xe & gara"
      onClose={onClose}
    >
      <p>
        Ví của bạn: <strong>{num(me.balances.coin)} Coin</strong>. Xe đã mua được lưu trong tài khoản.
      </p>
      <p className="muted">
        Bấm Xoay xe để xem các hướng. Mua và chọn mẫu xe bạn thích, rồi ra sân gara và nhấn V để lên xe. Lái
        bằng WASD hoặc phím mũi tên; thả phím để dừng. Đèn xe tự bật khi trời tối.
      </p>
      <div
        role="note"
        style={{ padding: 16, background: 'rgba(245, 190, 85, .12)', borderRadius: 12, marginBottom: 16 }}
      >
        Đèn đỏ: dừng trước vạch trắng. Đèn vàng: chuẩn bị dừng. Đèn xanh: được đi. Vượt đèn đỏ: 80 Coin. Lái
        ngoài lòng đường hơn 1 giây: 40 Coin. Tiền phạt tối đa bằng số dư; xe tự dừng khi bị phạt.
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {room === 'showroom' && displayId ? (
          <Button
            variant={category === 'inspect' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setCategory('inspect')}
          >
            Xe đang xem trên bục
          </Button>
        ) : null}
        <Button
          variant={category === 'all' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setCategory('all')}
        >
          Tất cả (16)
        </Button>
        <Button
          variant={category === 'supercars' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setCategory('supercars')}
        >
          Siêu xe (4)
        </Button>
        <Button
          variant={category === 'luxury_muscle' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setCategory('luxury_muscle')}
        >
          Xe sang & Cơ bắp (4)
        </Button>
        <Button
          variant={category === 'superbikes' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setCategory('superbikes')}
        >
          Mô tô PKL (4)
        </Button>
        <Button
          variant={category === 'heritage_bicycle' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setCategory('heritage_bicycle')}
        >
          Xe phố & Xe đạp (4)
        </Button>
      </div>
      {shop.isPending ? (
        <LoadingState />
      ) : shop.isError ? (
        <ErrorState error={shop.error} onRetry={() => void shop.refetch()} />
      ) : (
        (shop.data ?? [])
          .filter((i) => i.type === 'vehicle')
          .filter((i) => {
            if (category === 'inspect') return i.id === displayId;
            if (category === 'all') return true;
            return VEHICLE_CATEGORIES[i.id] === category;
          })
          .map((item) => {
            const config = vehicleById(item.id);
            const brandStyle = config?.brand
              ? (BRAND_COLORS[config.brand] ?? { bg: 'rgba(255, 255, 255, 0.1)', color: '#e2e8f0' })
              : null;
            return (
              <div
                key={item.id}
                className="row wrap"
                style={{ gap: 24, padding: 16, borderBottom: '1px solid var(--border)' }}
              >
                <VehiclePreview id={item.id} />
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                      marginBottom: 4,
                    }}
                  >
                    <h3 style={{ margin: 0 }}>{item.name}</h3>
                    {config?.brand && brandStyle ? (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 6,
                          background: brandStyle.bg,
                          color: brandStyle.color,
                          border: '1px solid currentColor',
                        }}
                      >
                        {config.brand}
                      </span>
                    ) : null}
                  </div>
                  <p>
                    {config?.kind === 'bicycle'
                      ? 'Xe đạp thể thao'
                      : config?.kind === 'motorcycle'
                        ? 'Mô tô / Xe máy'
                        : 'Siêu xe / Ô tô'}
                    {' · '}
                    {num(item.price)} Coin · Tốc độ: {config?.speed} px/s (×
                    {((config?.speed ?? 150) / 150).toFixed(1)})
                    {config?.showroomTheme?.badge ? (
                      <span
                        style={{
                          marginLeft: 8,
                          padding: '1px 6px',
                          fontSize: 10,
                          fontWeight: 700,
                          borderRadius: 4,
                          background: 'rgba(78, 237, 202, 0.15)',
                          color: '#a7f3d0',
                          border: '1px solid rgba(78, 237, 202, 0.3)',
                        }}
                      >
                        {config.showroomTheme.badge}
                      </span>
                    ) : null}
                  </p>
                  <p className="muted">
                    {item.owned ? 'Đã sở hữu · dùng lại bất cứ lúc nào' : item.description}
                  </p>
                </div>
                {item.owned ? (
                  <Button disabled={item.equipped || equip.isPending} onClick={() => equip.mutate(item.id)}>
                    {item.equipped ? 'Đang chọn' : 'Chọn xe'}
                  </Button>
                ) : (
                  <Button
                    disabled={
                      room !== 'showroom' || !item.enabled || buy.isPending || me.balances.coin < item.price
                    }
                    onClick={() => buy.mutate(item)}
                  >
                    {buy.isPending && buy.variables?.id === item.id
                      ? 'Đang mua…'
                      : me.balances.coin < item.price
                        ? 'Chưa đủ Coin'
                        : `Mua · ${num(item.price)} Coin`}
                  </Button>
                )}
              </div>
            );
          })
      )}
      {room === 'showroom' && me.appearance.vehicle ? (
        <Button
          onClick={() => {
            onClose();
            void net.goTown();
          }}
        >
          Ra sân gara · Nhấn V để lên xe
        </Button>
      ) : null}
    </Panel>
  );
}
