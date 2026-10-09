import { SHOWROOM_PEDESTALS, vehicleById } from '@cozy/game-data';
import { useEffect } from 'react';
import { net } from '../../game/net';
import { useUi } from '../../lib/store';
import { Button } from '../../ui/primitives';

export function ShowroomHud() {
  const id = useUi((s) => s.showroomVehicle);
  const pedestalIndex = useUi((s) => s.showroomPedestalIndex);
  const panel = useUi((s) => s.panel);
  const vehicle = vehicleById(id);
  const pedestal = pedestalIndex !== null ? (SHOWROOM_PEDESTALS[pedestalIndex] ?? null) : null;
  const currentIdx = pedestal && id ? pedestal.vehicles.indexOf(id) : -1;

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.repeat ||
        panel ||
        document.querySelector('.backdrop') ||
        (e.target as HTMLElement).closest('input,textarea,select,[contenteditable=true]')
      )
        return;
      if (e.key.toLowerCase() === 'e' && pedestalIndex !== null) {
        e.preventDefault();
        useUi.getState().cycleShowroomPedestal(1);
      }
      if (e.key === 'Escape') void net.goTown();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [id, pedestalIndex, panel]);

  if (panel) return null;

  return (
    <div className="hud-bottom" style={{ width: 'calc(100% - 32px)', maxWidth: 780 }}>
      <div className="prompt" role="status" style={{ flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
        <div className="prompt-text">
          <strong>
            {vehicle
              ? `${vehicle.name}${pedestal ? ` · ${pedestal.category} (${(currentIdx >= 0 ? currentIdx : 0) + 1}/${pedestal.vehicles.length})` : ''}`
              : 'Chào mừng đến Gara Bạc Hà'}
          </strong>
          <span>
            {vehicle
              ? `${vehicle.brand} · ${vehicle.price.toLocaleString('vi-VN')} Coin · Tốc độ: ${vehicle.speed} px/s (×${(vehicle.speed / 150).toFixed(1)}). Nhấn E hoặc nút ◀ ▶ để đổi xe trên bục.`
              : 'WASD / mũi tên: đi quanh phòng · Đến gần một bục xe để xem và mua.'}
          </span>
        </div>
        {vehicle && pedestal ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => useUi.getState().cycleShowroomPedestal(-1)}
              title="Xe trước trong phân khúc này"
            >
              ◀
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => useUi.getState().cycleShowroomPedestal(1)}
              title="Đổi mẫu xe khác trên bục này (phím E)"
            >
              <span className="kbd">E</span> Đổi xe ({(currentIdx >= 0 ? currentIdx : 0) + 1}/
              {pedestal.vehicles.length}) ▶
            </Button>
            <Button onClick={() => useUi.getState().setPanel('shop-vehicles')}>Xem & mua xe</Button>
          </div>
        ) : vehicle ? (
          <Button onClick={() => useUi.getState().setPanel('shop-vehicles')}>
            <span className="kbd">E</span> Xem & mua xe
          </Button>
        ) : null}
        <Button variant="secondary" onClick={() => void net.goTown()}>
          Ra sân gara
        </Button>
      </div>
    </div>
  );
}
