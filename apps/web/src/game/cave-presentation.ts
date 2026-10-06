import type Phaser from 'phaser';
import type { CaveEffect, CaveSnapshot } from '@cozy/game-data';
import { ensureCaveCreatures } from '../art/cave-creatures';
import { paintCaveOre, CAVE_THEMES } from '../art/cave-world';
import { useUi } from '../lib/store';
import { play } from '../lib/sound';

type Actor = {
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Ellipse;
  hp: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  hit: number;
  dead: boolean;
  phase: number;
};
export class CavePresentation {
  private actors = new Map<string, Actor>();
  private ores = new Map<string, Phaser.GameObjects.Image>();
  private warnings: Phaser.GameObjects.Graphics;
  private motes: Phaser.GameObjects.Graphics;
  private floor = -1;
  private swing = 0;
  constructor(
    private scene: Phaser.Scene,
    private player: () => { x: number; y: number; sprite?: Phaser.GameObjects.Sprite } | null,
  ) {
    ensureCaveCreatures(scene);
    this.warnings = scene.add.graphics().setDepth(-1);
    this.motes = scene.add.graphics().setDepth(950);
  }
  reset() {
    for (const a of this.actors.values()) {
      this.scene.tweens.killTweensOf(a.sprite);
      a.sprite.destroy();
      a.shadow.destroy();
      a.hp.destroy();
    }
    this.actors.clear();
    for (const o of this.ores.values()) o.destroy();
    this.ores.clear();
  }
  update(state: CaveSnapshot, time: number, delta: number) {
    if (this.floor !== state.floor) {
      this.reset();
      this.floor = state.floor;
    }
    const reduced = useUi.getState().reducedMotion;
    this.warnings.clear();
    this.motes.clear();
    // Ambient lights share one graphics layer without accumulating particles.
    const pulse = reduced ? 0.5 : 0.5 + Math.sin(time / 190) * 0.2 + Math.sin(time / 83) * 0.12;
    const lamps = state.floor
      ? [
          [167, 69],
          [489, 69],
          [807, 69],
          [167, 567],
          [489, 567],
          [807, 567],
        ]
      : [
          [281, 216],
          [720, 268],
          [872, 269],
        ];
    for (const [x, y] of lamps) {
      this.warnings.fillStyle(0xffc979, 0.035 + pulse * 0.025).fillEllipse(x!, y!, 58, 39);
      this.motes.fillStyle(0xffedb0, 0.3 + pulse * 0.3).fillRect(x! - 1, y! - 3, 2, 4);
    }
    for (let i = 0; i < 26; i++) {
      const x = 60 + ((i * 137.31 + (reduced ? 0 : time * 0.008)) % 830),
        y = 78 + ((i * 93.83 + (reduced ? 0 : Math.sin(time / 2500 + i) * 16)) % 490);
      this.motes
        .fillStyle(state.floor ? 0x95cabe : 0xf2dcad, 0.12 + (i % 3) * 0.06)
        .fillRect(x, y, i % 5 === 0 ? 2 : 1, 1);
    }
    for (const ore of state.ores) {
      let img = this.ores.get(ore.id);
      if (!ore.hp) {
        img?.destroy();
        this.ores.delete(ore.id);
        continue;
      }
      const key = 'cave:ore:' + ore.resource + ':' + ore.hp;
      if (!this.scene.textures.exists(key))
        this.scene.textures.addCanvas(key, paintCaveOre(ore.resource, ore.hp));
      if (!img) {
        img = this.scene.add.image(ore.x, ore.y, key).setOrigin(0.5, 0.84).setDepth(ore.y);
        this.ores.set(ore.id, img);
      } else img.setTexture(key);
    }
    for (const enemy of state.enemies) {
      let a = this.actors.get(enemy.id);
      if (!enemy.hp) {
        if (a && !a.dead) {
          a.dead = true;
          this.scene.tweens.add({
            targets: a.sprite,
            alpha: 0,
            scaleX: 0.9,
            scaleY: 0.18,
            y: a.y + 12,
            angle: enemy.kind === 'bat' ? 65 : 0,
            duration: reduced ? 80 : 330,
            ease: 'Cubic.In',
            onComplete: () => a!.sprite.setVisible(false),
          });
          a.shadow.setVisible(false);
          a.hp.clear();
        }
        continue;
      }
      if (!a) {
        a = {
          sprite: this.scene.add.image(enemy.x, enemy.y, 'cave:creature:' + enemy.kind).setOrigin(0.5, 0.89),
          shadow: this.scene.add.ellipse(
            enemy.x,
            enemy.y,
            enemy.kind === 'golem' ? 56 : 44,
            14,
            0x0a1420,
            0.4,
          ),
          hp: this.scene.add.graphics(),
          x: enemy.x,
          y: enemy.y,
          hit: 0,
          dead: false,
          phase: this.actors.size * 91,
        };
        this.actors.set(enemy.id, a);
      }
      const dx = enemy.x - a.x,
        dy = enemy.y - a.y;
      const blend = 1 - Math.exp(-delta / 65);
      a.x += dx * blend;
      a.y += dy * blend;
      const moving = Math.hypot(dx, dy) > 1;
      const frame = reduced
        ? 0
        : Math.floor((time + a.phase) / (enemy.kind === 'bat' ? 65 : moving ? 90 : 160)) % 8;
      const hit = time < a.hit;
      const wind = !!enemy.windup;
      const recoil = hit && !reduced ? Math.sin(((a.hit - time) / 130) * Math.PI) * 5 : 0;
      a.sprite
        .setFrame(wind ? 1 : frame)
        .setPosition(Math.round(a.x + recoil), Math.round(a.y))
        .setDepth(a.y);
      if (Math.abs(dx) > 1) a.sprite.setFlipX(dx < 0);
      if (hit) a.sprite.setTintFill(0xe6fff1);
      else if (wind) a.sprite.setTint(0xffb6a0);
      else a.sprite.clearTint();
      const scale = enemy.kind === 'golem' ? 1.2 : enemy.kind === 'bat' ? 0.78 : 0.86;
      a.sprite.setScale(scale * (wind && !reduced ? 1.07 : 1), scale * (wind && !reduced ? 0.91 : 1));
      a.shadow.setPosition(a.x, a.y + 2).setDepth(a.y - 1);
      a.hp
        .clear()
        .setPosition(a.x, a.y - (enemy.kind === 'golem' ? 113 : 75))
        .setDepth(a.y + 1);
      if (enemy.hp < enemy.maxHp || wind || enemy.kind === 'golem') {
        const width = enemy.kind === 'golem' ? 64 : 38;
        a.hp.fillStyle(0x121d2a, 0.95).fillRoundedRect(-width / 2 - 2, -2, width + 4, 8, 2);
        a.hp
          .fillStyle(wind ? 0xf3ae88 : 0x9bc6ab)
          .fillRect(-width / 2, 0, (width * enemy.hp) / enemy.maxHp, 3);
        a.hp.fillStyle(0xe5efd4, 0.8).fillRect(-width / 2, 0, (width * enemy.hp) / enemy.maxHp, 1);
      }
      if (wind) {
        const progress = 1 - Math.max(0, Math.min(650, enemy.windup - Date.now())) / 650;
        this.warnings.lineStyle(1, 0xf0ab83, 0.8).strokeEllipse(a.x, a.y + 3, 112, 64);
        this.warnings
          .fillStyle(0xe77864, 0.08 + progress * 0.14)
          .fillEllipse(a.x, a.y + 3, 112 * progress, 64 * progress);
      }
    }
    if (state.cleared) {
      const c = Number.parseInt(CAVE_THEMES[state.floor]!.light.slice(1), 16);
      this.warnings.lineStyle(2, c, 0.75).strokeEllipse(832, 330, 104, 38);
    }
  }
  effect(e: CaveEffect) {
    const s = this.scene,
      reduced = useUi.getState().reducedMotion;
    const color = e.color ?? (e.kind === 'hurt' ? 0xf79791 : e.kind === 'loot' ? 0x9ee5c4 : 0xf5dfae);
    if (e.kind === 'slash') {
      play('cave_swing');
      const reverse = ++this.swing % 2 ? 1 : -1,
        angle = e.angle ?? 0;
      const sword = s.add
        .graphics()
        .setPosition(e.x, e.y - 17)
        .setDepth(e.y + 100);
      sword.rotation = angle - reverse * 1.5;
      sword.fillStyle(0x293644).fillPoints(
        [
          { x: 10, y: -4 },
          { x: 45, y: -3 },
          { x: 54, y: 0 },
          { x: 45, y: 3 },
          { x: 10, y: 4 },
        ],
        true,
      );
      sword.fillStyle(color).fillPoints(
        [
          { x: 15, y: -2 },
          { x: 44, y: -2 },
          { x: 52, y: 0 },
          { x: 15, y: 2 },
        ],
        true,
      );
      sword.lineStyle(1, 0xf6fff2).lineBetween(16, -2, 44, -2);
      sword.fillStyle(0xe4bc75).fillRect(12, -9, 3, 18);
      sword.fillStyle(0x86543c).fillRect(1, -2, 11, 4);
      sword.fillStyle(0xc6a271).fillRect(0, -3, 3, 6);
      if (reduced) {
        sword.rotation = angle;
        s.tweens.add({ targets: sword, alpha: 0, duration: 160, onComplete: () => sword.destroy() });
        return;
      }
      s.tweens.add({
        targets: sword,
        rotation: angle - reverse * 1.9,
        duration: reduced ? 1 : 65,
        ease: 'Sine.Out',
        onComplete: () => {
          const trail = s.add
            .graphics()
            .setPosition(e.x, e.y - 17)
            .setDepth(e.y + 99);
          for (let i = 0; i < 7; i++) {
            trail
              .lineStyle(2 + i * 0.4, color, 0.08 + i * 0.035)
              .beginPath()
              .arc(0, 0, 42 + i, angle - reverse * 1.15, angle + reverse * 0.9, reverse < 0)
              .strokePath();
          }
          s.tweens.add({ targets: trail, alpha: 0, duration: 180, onComplete: () => trail.destroy() });
          s.tweens.add({
            targets: sword,
            rotation: angle + reverse * 1.2,
            duration: 90,
            ease: 'Cubic.Out',
            onComplete: () => {
              s.tweens.add({
                targets: sword,
                rotation: angle + reverse * 0.7,
                alpha: 0,
                duration: 150,
                ease: 'Sine.Out',
                onComplete: () => sword.destroy(),
              });
            },
          });
        },
      });
      return;
    }
    if (e.kind === 'hit' || e.kind === 'hurt') {
      play(e.kind === 'hit' ? 'cave_hit' : 'cave_hurt');
      for (const a of this.actors.values())
        if (Math.hypot(a.x - e.x, a.y - e.y) < 35) a.hit = s.time.now + 140;
      const spark = s.add
        .graphics()
        .setPosition(e.x, e.y - 28)
        .setDepth(1400);
      spark.lineStyle(3, 0xfff4d4).lineBetween(-12, -12, 12, 12).lineBetween(-10, 10, 10, -10);
      s.tweens.add({
        targets: spark,
        scaleX: 1.5,
        scaleY: 1.5,
        alpha: 0,
        duration: 130,
        onComplete: () => spark.destroy(),
      });
      if (e.kind === 'hurt') {
        const p = this.player();
        p?.sprite?.setTint(0xffaaa4);
        s.time.delayedCall(130, () => p?.sprite?.active && p.sprite.clearTint());
        if (!reduced) s.cameras.main.shake(75, 0.0015);
      }
    } else if (e.kind === 'loot') play('cave_loot');
    else if (e.kind === 'mine') play('cave_mine');
    else if (e.kind === 'defeat') play('cave_defeat');
    const count = reduced ? 0 : e.kind === 'defeat' ? 14 : e.kind === 'loot' ? 10 : 6;
    for (let i = 0; i < count; i++) {
      const angle = (i * Math.PI * 2) / count;
      const particle = s.add.rectangle(e.x, e.y - 16, (i % 3) + 2, (i % 3) + 2, color, 0.9).setDepth(1300);
      s.tweens.add({
        targets: particle,
        x: e.x + Math.cos(angle) * (18 + i * 2),
        y: e.y - 20 + Math.sin(angle) * 24,
        alpha: 0,
        scale: 0.2,
        angle: 90,
        duration: 260 + i * 22,
        ease: 'Quad.Out',
        onComplete: () => particle.destroy(),
      });
    }
    if (e.kind === 'loot' && e.amount) {
      const gem = s.add
        .graphics()
        .setPosition(e.x, e.y - 18)
        .setDepth(1301);
      gem.fillStyle(color).fillPoints(
        [
          { x: 0, y: -10 },
          { x: 7, y: 0 },
          { x: 0, y: 7 },
          { x: -7, y: 0 },
        ],
        true,
      );
      gem.lineStyle(1, 0xe8fff1).lineBetween(0, -8, 0, 5);
      s.tweens.add({
        targets: gem,
        y: e.y - (reduced ? 20 : 52),
        duration: 220,
        ease: 'Back.Out',
        onComplete: () => {
          const p = this.player();
          s.tweens.add({
            targets: gem,
            x: p?.x ?? e.x,
            y: p ? p.y - 23 : e.y - 55,
            scale: 0.2,
            alpha: 0,
            delay: 200,
            duration: 360,
            ease: 'Cubic.In',
            onComplete: () => gem.destroy(),
          });
        },
      });
    }
    if (e.amount || e.label) {
      const value =
        e.kind === 'loot' ? (e.amount ? '+' + e.amount + ' ' : '') + (e.label ?? '') : '−' + e.amount;
      const t = s.add
        .text(e.x, e.y - 45, value, {
          fontFamily: 'sans-serif',
          fontSize: e.kind === 'loot' ? '14px' : '19px',
          fontStyle: 'bold',
          color: '#' + color.toString(16).padStart(6, '0'),
          stroke: '#182534',
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(1500);
      s.tweens.add({
        targets: t,
        y: e.y - (reduced ? 48 : 84),
        alpha: 0,
        delay: 120,
        duration: 800,
        ease: 'Quad.Out',
        onComplete: () => t.destroy(),
      });
    }
  }
  destroy() {
    this.reset();
    this.warnings.destroy();
    this.motes.destroy();
  }
}
