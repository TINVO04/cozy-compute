import type Phaser from 'phaser';
import { INTERSECTIONS, trafficSignal, TOWN_ROADS } from '@cozy/game-data';

export function createTraffic(scene: Phaser.Scene, serverTime: () => number) {
  const paint = scene.add.graphics().setDepth(-8);
  paint.lineStyle(1, 0xfacc15, 0.9);
  for (const r of TOWN_ROADS) {
    const horizontal = r.w > r.h;
    for (let a = 0; a < (horizontal ? r.w : r.h); a += 22) {
      const x = horizontal ? r.x + a : r.x + r.w / 2;
      const y = horizontal ? r.y + r.h / 2 : r.y + a;
      if (INTERSECTIONS.some((j) => Math.abs(x - j.x) < j.halfW + 18 && Math.abs(y - j.y) < j.halfH + 18))
        continue;
      paint.lineBetween(x, y, x + (horizontal ? 10 : 0), y + (horizontal ? 0 : 10));
    }
  }
  const lights: { lamp: Phaser.GameObjects.Arc; axis: 'horizontal' | 'vertical'; index: number }[] = [];
  for (const j of INTERSECTIONS) {
    paint.fillStyle(0xffffff);
    for (const side of [-1, 1]) {
      paint.fillRect(j.x + side * (j.halfW + 6) - 1, j.y - j.halfH, 2, j.halfH * 2);
      paint.fillRect(j.x - j.halfW, j.y + side * (j.halfH + 6) - 1, j.halfW * 2, 2);
    }
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
