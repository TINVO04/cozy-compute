import { vehicleById } from '@cozy/game-data';
import { useEffect } from 'react';
import { net } from '../../game/net';
import { useUi } from '../../lib/store';
import { Button } from '../../ui/primitives';

export function ShowroomHud() {
  const id = useUi((s) => s.showroomVehicle);
  const panel = useUi((s) => s.panel);
  const vehicle = vehicleById(id);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.repeat ||
        panel ||
        document.querySelector('.backdrop') ||
        (e.target as HTMLElement).closest('input,textarea,select,[contenteditable=true]')
      )
        return;
      if (e.key.toLowerCase() === 'e' && id) useUi.getState().setPanel('shop-vehicles');
      if (e.key === 'Escape') void net.goTown();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [id, panel]);
  if (panel) return null;
  return (
    <div className="hud-bottom" style={{ width: 'calc(100% - 32px)', maxWidth: 720 }}>
      <div className="prompt" role="status" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
        <div className="prompt-text">
          <strong>{vehicle?.name ?? 'Chào mừng đến Gara Bạc Hà'}</strong>
          <span>
            {vehicle
              ? 'Xem xe theo bốn hướng, giá và tốc độ trước khi mua.'
              : 'WASD / mũi tên: đi quanh phòng · Đến gần một bục xe để xem và mua.'}
          </span>
        </div>
        {vehicle ? (
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
