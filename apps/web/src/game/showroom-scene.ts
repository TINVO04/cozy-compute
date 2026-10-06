import {
  SHOWROOM,
  SHOWROOM_BLOCKERS,
  VEHICLE_DISPLAYS,
  vehicleById,
  showroomDisplayAt,
} from '@cozy/game-data';
import type { Room } from 'colyseus.js';
import { ensureVehicleTexture } from '../art/vehicle';
import { useUi } from '../lib/store';
import { WorldScene } from './scenes';

export class ShowroomScene extends WorldScene {
  constructor() {
    super('showroom');
  }
  protected worldSize() {
    return SHOWROOM;
  }
  protected blockers() {
    return SHOWROOM_BLOCKERS;
  }
  protected matchesRoom(room: Room) {
    return room.name === 'showroom';
  }
  protected override onSelfMove(x: number, y: number) {
    useUi.getState().setShowroomVehicle(showroomDisplayAt(x, y));
  }
  protected buildWorld() {
    const g = this.add.graphics();
    g.fillStyle(0x1e3537).fillRect(0, 0, 640, 480);
    g.fillStyle(0xd7d6c4).fillRect(24, 72, 592, 384);
    for (let y = 72; y < 456; y += 32)
      for (let x = 24; x < 616; x += 32)
        if ((x + y) % 64 === 32) g.fillStyle(0xc8cebf).fillRect(x, y, 32, 32);
    g.fillStyle(0x406e64).fillRect(24, 12, 592, 52);
    g.fillStyle(0xebc780).fillRect(24, 64, 592, 4);
    this.add
      .text(320, 28, 'GARA BẠC HÀ', {
        fontFamily: 'system-ui',
        fontSize: '23px',
        color: '#fff2cc',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0);
    for (const display of VEHICLE_DISPLAYS) {
      const vehicle = vehicleById(display.id)!;
      g.fillStyle(0x415c57).fillRoundedRect(display.x - 64, display.y - 30, 128, 64, 8);
      g.lineStyle(2, 0xeacb8c).strokeRoundedRect(display.x - 64, display.y - 30, 128, 64, 8);
      this.add
        .image(display.x, display.y - 4, ensureVehicleTexture(this, display.id, 2))
        .setScale(2)
        .setDepth(display.y);
      this.add
        .text(
          display.x,
          display.y + 39,
          [
            vehicle.name,
            vehicle.price.toLocaleString('vi-VN') + ' Coin · ×' + (vehicle.speed / 150).toFixed(1),
          ],
          { fontFamily: 'system-ui', fontSize: '12px', color: '#253e38', align: 'center', fontStyle: 'bold' },
        )
        .setOrigin(0.5, 0);
    }
    g.fillStyle(0x5b9680).fillRect(264, 406, 112, 50);
    this.add
      .text(320, 428, '↓ LỐI RA', { fontFamily: 'system-ui', fontSize: '14px', color: '#ffffff' })
      .setOrigin(0.5);
    this.events.once('shutdown', () => useUi.getState().setShowroomVehicle(null));
  }
}
