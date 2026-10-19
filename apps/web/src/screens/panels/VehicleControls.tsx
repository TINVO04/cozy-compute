import { Car, Warehouse } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { vehicleById } from '@cozy/game-data';
import { api, type Me } from '../../lib/api';
import { net } from '../../game/net';
import { useRefreshEconomy, useQueryClient } from '../../lib/queries';
import { useUi } from '../../lib/store';
import { useQuery } from '@tanstack/react-query';

interface FarmMeResponse {
  warehouse: { items: Array<{ itemId: string; quantity: number }> };
}

export function VehicleControls({ me }: { me: Me }) {
  const room = useUi((s) => s.room);
  const connection = useUi((s) => s.connection);
  const [driving, setDriving] = useState(false);
  const [canMount, setCanMount] = useState(false);
  const meRef = useRef(me);
  useEffect(() => {
    meRef.current = me;
  }, [me]);

  const { data: farmMe } = useQuery({
    queryKey: ['farm', 'me'],
    queryFn: () => api<FarmMeResponse>('/api/farm/me'),
    enabled: room.kind === 'farm',
  });

  const ownsTractor =
    me.appearance.vehicle === 'tractor_farm' ||
    me.appearance.vehicle === 'cars/tractor-farm' ||
    Boolean(farmMe?.warehouse?.items?.some((it) => it.itemId === 'tractor_farm' && it.quantity > 0));

  useEffect(() => {
    useUi.getState().setOwnsTractor(ownsTractor);
  }, [ownsTractor]);

  const effectiveVehicle =
    room.kind === 'farm'
      ? ownsTractor
        ? (vehicleById(me.appearance.vehicle) ?? vehicleById('tractor_farm'))
        : vehicleById(me.appearance.vehicle)
      : vehicleById(me.appearance.vehicle);
  const vehicle = effectiveVehicle;
  const refresh = useRefreshEconomy();
  const qc = useQueryClient();
  useEffect(() =>
    net.onRoomMessage<{ text: string }>('traffic:fine', (msg) => {
      refresh();
      void qc.invalidateQueries({ queryKey: ['ledger'] });
      useUi.getState().toast({ kind: 'error', title: 'Biên bản giao thông', body: msg.text });
    }),
  );
  useEffect(() => {
    const timer = window.setInterval(() => {
      const state = net.room?.state as
        { players?: Map<string, { vehicle?: string; x: number; y: number }> } | undefined;
      const player = state?.players?.get(net.room?.sessionId ?? '');
      setDriving(Boolean(player?.vehicle));
      setCanMount(Boolean(player));
    }, 100);
    const key = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const ui = useUi.getState();
      if (
        e.repeat ||
        el.closest('input, textarea, select, [contenteditable=true]') ||
        ui.panel ||
        ui.activity ||
        document.querySelector('.backdrop')
      )
        return;
      if (e.key.toLowerCase() === 'v' && (ui.room.kind === 'town' || ui.room.kind === 'farm')) {
        e.preventDefault();
        const state = net.room?.state as
          { players?: Map<string, { vehicle?: string; x: number; y: number }> } | undefined;
        const currentDriving = Boolean(state?.players?.get(net.room?.sessionId ?? '')?.vehicle);
        if (ui.room.kind === 'farm' && !currentDriving) {
          if (!ui.ownsTractor && !meRef.current.appearance.vehicle) {
            ui.toast({
              kind: 'info',
              title: '🚜 Máy Cày Nông Nghiệp',
              body: 'Bạn chưa sở hữu Máy Cày Farm! Hãy ghé Tiệm Bác Sáu để mua xe (Giá: 1.500 Xu).',
            });
            return;
          }
          net.send('vehicle:toggle', { vehicle: 'tractor_farm' });
        } else {
          net.send('vehicle:toggle', {});
        }
      }
    };
    window.addEventListener('keydown', key);
    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', key);
    };
  }, []);
  if (room.kind !== 'town' && room.kind !== 'farm') return null;
  return (
    <>
      {room.kind === 'town' && (
        <button
          className="hud-tool"
          title="Cửa hàng xe & gara"
          aria-label="Cửa hàng xe & gara"
          onClick={() => net.send('showroom:enter', {})}
        >
          <Warehouse size={20} />
        </button>
      )}
      {vehicle ? (
        <div style={{ position: 'relative' }}>
          <button
            className="hud-tool"
            disabled={connection !== 'online'}
            aria-pressed={driving}
            aria-label={driving ? 'Xuống xe (V)' : 'Lên xe (V)'}
            title={driving ? 'Xuống xe (V)' : room.kind === 'farm' ? 'Lên xe máy cày (V)' : 'Lên xe (V)'}
            onClick={() => {
              if (room.kind === 'farm' && !driving) {
                if (!ownsTractor && !me.appearance.vehicle) {
                  useUi.getState().toast({
                    kind: 'info',
                    title: '🚜 Máy Cày Nông Nghiệp',
                    body: 'Bạn chưa sở hữu Máy Cày Farm! Hãy ghé Tiệm Bác Sáu để mua xe (Giá: 1.500 Xu).',
                  });
                  return;
                }
                net.send('vehicle:toggle', { vehicle: 'tractor_farm' });
              } else {
                net.send('vehicle:toggle', {});
              }
            }}
          >
            <Car size={20} />
            <span style={{ fontSize: 10 }}>V</span>
          </button>
          <div
            className="vehicle-mount-hint"
            role="status"
            style={{
              position: 'absolute',
              left: -56,
              bottom: 60,
              width: 232,
              padding: 12,
              borderRadius: 12,
              background: '#182b2b',
              color: '#f4edd8',
              boxShadow: '0 4px 16px #0005',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              {vehicle.brand ? (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: 'rgba(255,255,255,0.15)',
                    color: '#f8fafc',
                  }}
                >
                  {vehicle.brand}
                </span>
              ) : null}
              <strong style={{ fontSize: 13 }}>{vehicle.name}</strong>
            </div>
            <button
              style={{ width: '100%', cursor: 'pointer', padding: 8 }}
              disabled={connection !== 'online' || (!driving && !canMount)}
              onClick={() => {
                if (room.kind === 'farm' && !driving) {
                  if (!ownsTractor && !me.appearance.vehicle) {
                    useUi.getState().toast({
                      kind: 'info',
                      title: '🚜 Máy Cày Nông Nghiệp',
                      body: 'Bạn chưa sở hữu Máy Cày Farm! Hãy ghé Tiệm Bác Sáu để mua xe (Giá: 1.500 Xu).',
                    });
                    return;
                  }
                  net.send('vehicle:toggle', { vehicle: 'tractor_farm' });
                } else {
                  net.send('vehicle:toggle', {});
                }
              }}
            >
              {driving ? 'V · Xuống xe' : room.kind === 'farm' ? 'V · Lên máy cày' : 'V · Lên xe'}
            </button>
            <small>
              {driving
                ? room.kind === 'farm'
                  ? 'WASD / mũi tên để lái · Lái qua các ô đất để tự động cày cấy & thu hoạch!'
                  : 'WASD / mũi tên để lái · Đèn tự bật khi trời tối'
                : room.kind === 'farm'
                  ? 'Nhấn V hoặc bấm nút để lên máy cày làm nông'
                  : canMount
                    ? 'Nhấn V hoặc bấm nút để lên xe'
                    : 'Đi ra lòng đường hoặc sân gara để lên xe'}
            </small>
          </div>
        </div>
      ) : null}
    </>
  );
}
