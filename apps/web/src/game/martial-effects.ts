import type Phaser from 'phaser';
import { MARTIAL_SKILLS, type MartialEffect } from '@cozy/game-data';
import { useUi } from '../lib/store';
import { play } from '../lib/sound';
import type { Avatar } from './players';

type Slot = {
  g: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  e: MartialEffect | null;
  elapsed: number;
  life: number;
};
/** Bounded pool: even a crowded practice area cannot create unbounded particles/tweens. */
export class MartialEffects {
  private slots: Slot[];
  constructor(
    private scene: Phaser.Scene,
    private avatar: (sid: string) => Avatar | undefined = () => undefined,
  ) {
    this.slots = Array.from({ length: 48 }, () => ({
      g: scene.add.graphics().setDepth(4500).setVisible(false),
      text: scene.add
        .text(0, 0, '', {
          fontFamily: 'Inter, sans-serif',
          fontSize: '17px',
          fontStyle: 'bold',
          stroke: '#202639',
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(5000)
        .setVisible(false),
      e: null,
      elapsed: 0,
      life: 0,
    }));
    scene.events.on('update', this.update, this);
    scene.events.once('shutdown', this.destroy, this);
  }
  emit(e: MartialEffect) {
    const skill = MARTIAL_SKILLS.find((s) => s.id === e.skill);
    if (!skill) return;
    const slot =
      this.slots.find((s) => !s.e) ??
      this.slots.reduce((a, b) => (a.elapsed / a.life > b.elapsed / b.life ? a : b));
    slot.e = e;
    slot.elapsed = 0;
    slot.life =
      e.phase === 'windup'
        ? skill.windup
        : e.phase === 'dash'
          ? (e.duration ?? 240) + 120
          : e.skill === 'guard'
            ? 1000
            : e.phase === 'hit'
              ? 540
              : 480;
    slot.g.setVisible(true).setAlpha(1);
    slot.text.setVisible(false);
    if (e.phase === 'hit') {
      slot.text
        .setText('−' + (e.amount ?? 0))
        .setColor('#fff0c1')
        .setVisible(true);
      play('cyber_headshot');
    } else if (e.phase === 'dash') play('cyber_dash');
    else if (e.phase === 'cast')
      play(e.skill === 'guard' || e.skill === 'heal' ? 'cyber_windwall' : 'cyber_slash');
    else if (e.phase === 'windup') play('cyber_order');
    if (e.phase === 'cast' && e.skill === 'heal')
      slot.text
        .setText('+' + (e.amount ?? 24))
        .setColor('#aeffd0')
        .setVisible(true);
  }
  private update(_time: number, dt: number) {
    const reduced = useUi.getState().reducedMotion;
    for (const s of this.slots) {
      if (!s.e) continue;
      s.elapsed += Math.min(dt, 100);
      const e = s.e,
        t = Math.min(1, s.elapsed / s.life);
      if (t >= 1) {
        s.e = null;
        s.g.clear().setVisible(false);
        s.text.setVisible(false);
        continue;
      }
      const skill = MARTIAL_SKILLS.find((v) => v.id === e.skill)!;
      const g = s.g;
      g.clear()
        .setPosition(e.x, e.y - 14)
        .setRotation(0)
        .setAlpha(1);
      s.text.setPosition(e.x, e.y - 48 - (reduced ? 0 : 24 * t)).setAlpha(1 - t);
      const a = e.angle,
        color = skill.color,
        fade = Math.min(1, (1 - t) * 3);
      if (e.phase === 'hit') {
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          const r = 8 + t * (reduced ? 8 : 36);
          g.lineStyle(i % 2 ? 2 : 3, i % 2 ? color : 0xffffff, fade).lineBetween(
            Math.cos(angle) * r,
            Math.sin(angle) * r,
            Math.cos(angle) * (r + 10),
            Math.sin(angle) * (r + 10),
          );
        }
        continue;
      }
      if (e.phase === 'dash') {
        const dx = (e.endX ?? e.x) - e.x,
          dy = (e.endY ?? e.y) - e.y;
        const progress = Math.min(1, s.elapsed / (e.duration ?? 240));
        if (!reduced)
          for (let i = 0; i < 6; i++) {
            const q = Math.max(0, progress - i * 0.12),
              x = dx * q,
              y = dy * q;
            g.fillStyle(color, 0.22 * (1 - i / 7) * fade).fillEllipse(x, y - 8, 17, 29);
            g.fillStyle(0xf4ffff, 0.16 * fade).fillCircle(x, y - 28, 7);
            g.lineStyle(3 - i * 0.3, color, 0.6 * fade).lineBetween(
              x - Math.cos(a) * 34,
              y - Math.sin(a) * 34,
              x + Math.cos(a) * 20,
              y + Math.sin(a) * 20,
            );
          }
        sword(g, dx * progress, dy * progress, a, 1.3, color, fade);
        continue;
      }
      if (e.phase === 'windup') {
        // Quiet ground telegraph beneath the floating blades remains readable to the opponent.
        g.lineStyle(1, color, 0.22 + 0.35 * t);
        if (e.skill === 'rain') g.strokeCircle(Math.cos(a) * 116, Math.sin(a) * 116 + 14, 66);
        else if (e.skill === 'spin') g.strokeEllipse(0, 14, 224, 142);
        else if (e.skill === 'wave' || e.skill === 'bolt') {
          for (const side of [-1, 1])
            g.lineBetween(
              0,
              14,
              Math.cos(a) * 150 - Math.sin(a) * side * 20,
              Math.sin(a) * 150 + Math.cos(a) * side * 20 + 14,
            );
        }
        const count = e.skill === 'spin' || e.skill === 'rain' ? 6 : e.skill === 'slash' ? 1 : 3;
        const radius = e.skill === 'wave' || e.skill === 'bolt' ? 48 - 20 * t : 34 + 24 * t;
        for (let i = 0; i < count; i++) {
          const theta = (i * Math.PI * 2) / count + (reduced ? 0 : t * 1.4);
          const x = Math.cos(theta) * radius,
            y = Math.sin(theta) * radius * 0.52 - 24 - 12 * t;
          sword(
            g,
            x,
            y,
            e.skill === 'slash'
              ? a - 1.4 + 0.3 * t
              : -Math.PI / 2 + (e.skill === 'wave' || e.skill === 'bolt' ? (a + Math.PI / 2) * t : 0),
            0.45 + 0.45 * t,
            color,
            Math.min(1, t * 5),
          );
          g.lineStyle(1, color, 0.3).lineBetween(x, y, x, y + 16 * (1 - t));
        }
        seal(g, 0, 14, 27 + 6 * t, color, 0.5);
        continue;
      }
      if (e.skill === 'guard' || e.skill === 'heal') {
        const target = e.sid ? this.avatar(e.sid) : undefined;
        if (target) g.setPosition(target.container.x, target.container.y - 14);
        seal(g, 0, 14, 37, color, fade * 0.7);
        g.lineStyle(2, color, 0.45 * fade).strokeEllipse(0, -6, 76, 92);
        for (let i = 0; i < 6; i++) {
          const theta = (i * Math.PI) / 3 + (reduced ? 0 : t * 2);
          sword(g, Math.cos(theta) * 34, Math.sin(theta) * 20, -Math.PI / 2, 0.55, color, fade * 0.8);
        }
        for (let i = 0; i < 8; i++)
          g.fillStyle(color, fade * 0.6).fillRect(Math.sin(i * 9) * 30, 20 - ((i * 13 + t * 70) % 70), 2, 5);
      } else if (e.skill === 'rain') {
        const cx = Math.cos(a) * 116,
          cy = Math.sin(a) * 116;
        seal(g, cx, cy + 14, 66, color, fade * 0.6);
        for (let i = 0; i < 9; i++) {
          const theta = i * 2.4,
            r = Math.sqrt(i / 9) * 54;
          const drop = Math.min(1, t * 3 - i * 0.06);
          if (drop < 0) continue;
          const x = cx + Math.cos(theta) * r,
            y = cy + Math.sin(theta) * r * 0.65;
          sword(g, x, y - (1 - drop) * (reduced ? 15 : 130), Math.PI / 2, 1.1, color, fade);
          g.lineStyle(2, color, 0.25 * fade).lineBetween(x, y - 110 * (1 - drop) - 30, x, y);
        }
      } else if (e.skill === 'spin') {
        const r = 30 + Math.sin((t * Math.PI) / 2) * 70;
        for (let i = 0; i < 6; i++) {
          const theta = (i * Math.PI) / 3 + (reduced ? 0 : t * Math.PI * 2);
          sword(g, Math.cos(theta) * r, Math.sin(theta) * r * 0.72, theta + Math.PI / 2, 0.9, color, fade);
          arc(g, 0, 0, r, theta - 0.8, theta, color, fade * 0.65);
        }
        seal(g, 0, 14, r * 0.7, color, fade * 0.4);
      } else if (e.skill === 'bolt') {
        for (let i = -1; i <= 1; i++) {
          const travel = Math.min(1, t * 1.5) * 220;
          const x = Math.cos(a) * travel - Math.sin(a) * i * 16,
            y = Math.sin(a) * travel + Math.cos(a) * i * 16;
          sword(g, x, y, a, 1, color, fade);
          g.lineStyle(3, color, fade * 0.4).lineBetween(x, y, x - Math.cos(a) * 65, y - Math.sin(a) * 65);
        }
      } else {
        const swing = a - 1.4 + (reduced ? 1.4 : Math.min(1, t * 1.8) * 2.8);
        for (let i = 0; i < 4; i++)
          arc(
            g,
            0,
            0,
            46 + i * 7,
            swing - 1.2,
            swing,
            i === 3 ? 0xffffff : color,
            fade * (i === 3 ? 0.95 : 0.35),
          );
        sword(g, Math.cos(swing) * 22, Math.sin(swing) * 22, swing, 1.1, color, fade);
      }
    }
  }
  destroy() {
    this.scene.events.off('update', this.update, this);
    for (const s of this.slots) {
      s.g.destroy();
      s.text.destroy();
    }
    this.slots = [];
  }
}

function arc(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  r: number,
  start: number,
  end: number,
  color: number,
  alpha: number,
) {
  g.lineStyle(3, color, alpha).beginPath().arc(x, y, r, start, end).strokePath();
}
function seal(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, color: number, alpha: number) {
  g.lineStyle(1, color, alpha).strokeEllipse(x, y, r * 2, r);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    g.lineBetween(
      x + Math.cos(a) * r * 0.75,
      y + Math.sin(a) * r * 0.375,
      x + Math.cos(a) * r,
      y + Math.sin(a) * r * 0.5,
    );
  }
}
/** A shaped blade, split steel faces, gold crossguard, dark handle and trailing tassel. */
function sword(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  angle: number,
  scale: number,
  color: number,
  alpha: number,
) {
  const c = Math.cos(angle) * scale,
    s = Math.sin(angle) * scale;
  const point = (u: number, v: number) => ({ x: x + c * u - s * v, y: y + s * u + c * v });
  const poly = (coords: number[], fill: number, opacity: number) => {
    g.fillStyle(fill, opacity).fillPoints(
      Array.from({ length: coords.length / 2 }, (_, i) => point(coords[i * 2]!, coords[i * 2 + 1]!)),
      true,
    );
  };
  poly([-4, -9, 32, -8, 52, 0, 32, 8, -4, 9], color, alpha * 0.15);
  poly([0, -4, 30, -4, 44, 0, 0, 0], 0xf4ffff, alpha);
  poly([0, 0, 44, 0, 30, 4, 0, 4], color, alpha);
  poly([-4, -11, 1, -8, 2, 8, -4, 11, -2, 0], 0xe8bd74, alpha);
  poly([-15, -2, -3, -2, -3, 2, -15, 2], 0x3b5463, alpha);
  poly([-18, -3, -14, -3, -14, 3, -18, 3], 0xf7d991, alpha);
  const tip = point(-17, 0),
    tail = point(-29, 8);
  g.lineStyle(2, color, alpha * 0.8).lineBetween(tip.x, tip.y, tail.x, tail.y);
}
