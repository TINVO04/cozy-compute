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
function VehiclePreview({ id }: { id: string }) {
  const [dir, setDir] = useState(2);
  const src = useMemo(() => vehicleCanvas(id, dir).toDataURL(), [id, dir]);
  return (
    <div>
      <img
        src={src}
        alt=""
        width={144}
        height={120}
        style={{ imageRendering: 'pixelated', objectFit: 'contain' }}
      />
      <Button variant="secondary" size="sm" onClick={() => setDir((dir + 1) % 4)}>
        Xoay xe
      </Button>
    </div>
  );
}
export function VehicleShopPanel({ me, onClose }: { me: Me; onClose: () => void }) {
  const room = useUi((s) => s.room.kind);
  const displayId = useUi((s) => s.showroomVehicle);
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
      {shop.isPending ? (
        <LoadingState />
      ) : shop.isError ? (
        <ErrorState error={shop.error} onRetry={() => void shop.refetch()} />
      ) : (
        (shop.data ?? [])
          .filter((i) => i.type === 'vehicle' && (room !== 'showroom' || i.id === displayId))
          .map((item) => {
            const config = vehicleById(item.id);
            return (
              <div
                key={item.id}
                className="row wrap"
                style={{ gap: 24, padding: 16, borderBottom: '1px solid var(--border)' }}
              >
                <VehiclePreview id={item.id} />
                <div style={{ flex: 1, minWidth: 180 }}>
                  <h3>{item.name}</h3>
                  <p>
                    {config?.kind === 'bicycle'
                      ? 'Xe đạp'
                      : config?.kind === 'motorcycle'
                        ? 'Xe máy'
                        : 'Ô tô'}
                    {' · '}
                    {num(item.price)} Coin · Tốc độ ×{((config?.speed ?? 150) / 150).toFixed(1)}
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
