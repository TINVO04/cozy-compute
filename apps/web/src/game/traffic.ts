import type Phaser from 'phaser';
import { INTERSECTIONS, trafficSignal } from '@cozy/game-data';

export function createTraffic(scene: Phaser.Scene, serverTime: () => number) {
  const lights: { lamp: Phaser.GameObjects.Arc; axis: 'horizontal' | 'vertical'; index: number }[] = [];
  for (const j of INTERSECTIONS) {
    const posts: { axis: 'horizontal' | 'vertical'; x: number; y: number }[] = [
      { axis: 'horizontal', x: j.x + (j.halfW + 12), y: j.y - (j.halfH + 12) },
      { axis: 'vertical', x: j.x - (j.halfW + 12), y: j.y + (j.halfH + 12) },
    ];
    for (const { axis, x, y } of posts) {
      const g = scene.add.graphics().setDepth(y);
      g.fillStyle(0x0f172a)
        .fillRect(x - 1, y - 22, 3, 23)
        .fillRect(x - 5, y - 34, 11, 24);
      g.fillStyle(0x1e293b).fillRect(x - 4, y - 33, 9, 22);
      for (let i = 0; i < 3; i++)
        lights.push({
          lamp: scene.add.circle(x, y - 30 + i * 7, 2.5, 0x1e293b).setDepth(y + 1),
          axis,
          index: i,
        });
    }
  }
  return () => {
    const now = serverTime();
    for (const { lamp, axis, index } of lights) {
      const phase = trafficSignal(now, axis);
      lamp.setFillStyle(
        ['red', 'yellow', 'green'][index] === phase ? [0xef4444, 0xfacc15, 0x22c55e][index]! : 0x1e293b,
      );
    }
  };
}
