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
            enemy.kind === 'colossus' ? 80 : enemy.kind === 'golem' ? 56 : 44,
            enemy.kind === 'colossus' ? 20 : 14,
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
      else if (enemy.enraged) a.sprite.setTint(Math.sin(time / 90) > 0 ? 0xff4444 : 0xc084fc);
      else if (wind) a.sprite.setTint(0xffb6a0);
      else a.sprite.clearTint();
      const scale =
        enemy.kind === 'colossus'
          ? 1.65
          : enemy.kind === 'golem'
            ? 1.2
            : enemy.kind === 'serpent'
              ? 1.05
              : enemy.kind === 'bat'
                ? 0.78
                : 0.88;
      a.sprite.setScale(scale * (wind && !reduced ? 1.07 : 1), scale * (wind && !reduced ? 0.91 : 1));
      a.shadow.setPosition(a.x, a.y + 2).setDepth(a.y - 1);
      const hpOffsetY =
        enemy.kind === 'colossus' ? 140 : enemy.kind === 'golem' ? 113 : enemy.kind === 'serpent' ? 86 : 75;
      a.hp
        .clear()
        .setPosition(a.x, a.y - hpOffsetY)
        .setDepth(a.y + 1);
      if (enemy.hp < enemy.maxHp || wind || enemy.kind === 'colossus' || enemy.kind === 'golem') {
        const width = enemy.kind === 'colossus' ? 96 : enemy.kind === 'golem' ? 64 : 38;
        if (enemy.kind === 'colossus') {
          a.hp.fillStyle(0x0a0518, 0.95).fillRoundedRect(-width / 2 - 3, -3, width + 6, 11, 3);
          a.hp.lineStyle(1, 0xf59e0b, 0.9).strokeRoundedRect(-width / 2 - 3, -3, width + 6, 11, 3);
          const barWidth = Math.max(0, (width * enemy.hp) / enemy.maxHp);
          a.hp.fillStyle(enemy.enraged ? 0xef4444 : 0xa855f7).fillRect(-width / 2, -1, barWidth, 7);
          a.hp.fillStyle(0xffffff, 0.6).fillRect(-width / 2, -1, barWidth, 1);
        } else {
          a.hp.fillStyle(0x121d2a, 0.95).fillRoundedRect(-width / 2 - 2, -2, width + 4, 8, 2);
          a.hp
            .fillStyle(wind ? 0xf3ae88 : 0x9bc6ab)
            .fillRect(-width / 2, 0, (width * enemy.hp) / enemy.maxHp, 3);
          a.hp.fillStyle(0xe5efd4, 0.8).fillRect(-width / 2, 0, (width * enemy.hp) / enemy.maxHp, 1);
        }
      }
      if (wind) {
        const totalWindup = enemy.kind === 'colossus' ? 850 : enemy.kind === 'golem' ? 750 : 600;
        const remaining = Math.max(0, enemy.windup - Date.now());
        const progress = 1 - Math.min(totalWindup, remaining) / totalWindup;
        const attackKind = enemy.attackKind ?? 'melee';
        const p = this.player();
        const playerX = p?.x ?? a.x + 50;
        const playerY = p?.y ?? a.y;
        const aimAngle = Math.atan2(playerY - a.y, playerX - a.x);

        if (attackKind === 'radial_burst') {
          this.warnings.lineStyle(2, 0x2dd4bf, 0.6 + progress * 0.4).strokeCircle(a.x, a.y + 3, 96);
          this.warnings.fillStyle(0x2dd4bf, 0.04 + progress * 0.16).fillCircle(a.x, a.y + 3, 96 * progress);
        } else if (attackKind === 'poison_spray') {
          const coneLen = 140;
          this.warnings.lineStyle(2, 0x84cc16, 0.6 + progress * 0.4);
          this.warnings.fillStyle(0x84cc16, 0.05 + progress * 0.15);
          this.warnings.beginPath();
          this.warnings.moveTo(a.x, a.y);
          this.warnings.arc(a.x, a.y, coneLen * progress, aimAngle - Math.PI / 4, aimAngle + Math.PI / 4);
          this.warnings.closePath();
          this.warnings.fillPath();
          this.warnings.strokePath();
        } else if (attackKind === 'cone_slam') {
          const hitRadius = enemy.kind === 'colossus' ? 140 : 115;
          const slamColor = enemy.kind === 'colossus' ? 0xc084fc : 0x38bdf8;
          this.warnings.lineStyle(2, slamColor, 0.6 + progress * 0.4);
          this.warnings.fillStyle(slamColor, 0.05 + progress * 0.18);
          this.warnings.beginPath();
          this.warnings.moveTo(a.x, a.y);
          this.warnings.arc(a.x, a.y, hitRadius * progress, aimAngle - Math.PI / 3, aimAngle + Math.PI / 3);
          this.warnings.closePath();
          this.warnings.fillPath();
          this.warnings.strokePath();
        } else if (attackKind === 'meteor') {
          const targetX = playerX;
          const targetY = playerY;
          this.warnings.lineStyle(2, 0xa855f7, 0.7 + progress * 0.3).strokeCircle(targetX, targetY, 80);
          this.warnings
            .fillStyle(0xa855f7, 0.06 + progress * 0.2)
            .fillCircle(targetX, targetY, 80 * progress);
          this.warnings.lineStyle(1, 0xf0abfc, 0.8);
          this.warnings.lineBetween(targetX - 25, targetY, targetX + 25, targetY);
          this.warnings.lineBetween(targetX, targetY - 25, targetX, targetY + 25);
        } else if (attackKind === 'laser') {
          const beamLen = 380;
          const endX = a.x + Math.cos(aimAngle) * beamLen;
          const endY = a.y + Math.sin(aimAngle) * beamLen;
          this.warnings.lineStyle(1 + progress * 3, 0x06b6d4, 0.4 + progress * 0.6);
          this.warnings.lineBetween(a.x, a.y, endX, endY);
        } else {
          this.warnings.lineStyle(1, 0xf0ab83, 0.8).strokeEllipse(a.x, a.y + 3, 112, 64);
          this.warnings
            .fillStyle(0xe77864, 0.08 + progress * 0.14)
            .fillEllipse(a.x, a.y + 3, 112 * progress, 64 * progress);
        }
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

    if (e.kind === 'radial_burst') {
      play('cave_swing');
      const ring = s.add
        .graphics()
        .setPosition(e.x, e.y)
        .setDepth(e.y + 98);
      s.tweens.addCounter({
        from: 10,
        to: 96,
        duration: 340,
        ease: 'Quad.Out',
        onUpdate: (tw) => {
          const val = tw.getValue() ?? 0;
          ring.clear();
          ring.lineStyle(3, 0x2dd4bf, 1 - val / 96);
          ring.strokeCircle(0, 0, val);
        },
        onComplete: () => ring.destroy(),
      });
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4;
        const needle = s.add
          .graphics()
          .setPosition(e.x, e.y)
          .setDepth(e.y + 99);
        needle.rotation = ang;
        needle.fillStyle(0x34d399).fillPoints(
          [
            { x: -3, y: 0 },
            { x: 0, y: -8 },
            { x: 3, y: 0 },
            { x: 0, y: 8 },
          ],
          true,
        );
        needle.lineStyle(1, 0xecfdf5).lineBetween(0, -6, 0, 6);
        s.tweens.add({
          targets: needle,
          x: e.x + Math.cos(ang) * 92,
          y: e.y + Math.sin(ang) * 92,
          alpha: 0,
          scale: 0.4,
          duration: 320,
          ease: 'Cubic.Out',
          onComplete: () => needle.destroy(),
        });
      }
      return;
    }
    if (e.kind === 'cone_slam') {
      play('cave_hit');
      if (!reduced) s.cameras.main.shake(140, 0.007);
      const ang = e.angle ?? 0;
      const slamColor = e.color ?? 0x38bdf8;
      const fissure = s.add
        .graphics()
        .setPosition(e.x, e.y)
        .setDepth(e.y - 1);
      fissure.lineStyle(3, 0x090d16, 0.9);
      for (let i = -2; i <= 2; i++) {
        const fa = ang + (i * Math.PI) / 10;
        const fDist = 110 + (Math.abs(i) === 2 ? -25 : 0);
        fissure.beginPath();
        fissure.moveTo(0, 0);
        fissure.lineTo(Math.cos(fa) * fDist, Math.sin(fa) * fDist);
        fissure.strokePath();
      }
      fissure.lineStyle(2, slamColor, 0.85);
      for (let i = -2; i <= 2; i++) {
        const fa = ang + (i * Math.PI) / 10;
        fissure.lineBetween(0, 0, Math.cos(fa) * 95, Math.sin(fa) * 95);
      }
      s.tweens.add({
        targets: fissure,
        alpha: 0,
        delay: 200,
        duration: 400,
        onComplete: () => fissure.destroy(),
      });
      for (let i = 0; i < 12; i++) {
        const ra = ang - Math.PI / 3 + (Math.random() * (Math.PI * 2)) / 3;
        const dist = 30 + Math.random() * 85;
        const rock = s.add
          .rectangle(e.x, e.y, 4 + Math.random() * 4, 4 + Math.random() * 4, slamColor)
          .setDepth(e.y + 100);
        s.tweens.add({
          targets: rock,
          x: e.x + Math.cos(ra) * dist,
          y: e.y + Math.sin(ra) * dist - 15,
          angle: 180,
          scale: 0.2,
          alpha: 0,
          duration: 350 + Math.random() * 150,
          ease: 'Quad.Out',
          onComplete: () => rock.destroy(),
        });
      }
      return;
    }
    if (e.kind === 'poison_spray') {
      play('cave_swing');
      const ang = e.angle ?? 0;
      for (let i = 0; i < 14; i++) {
        const spread = ang - Math.PI / 4 + (Math.random() * Math.PI) / 2;
        const dist = 40 + Math.random() * 95;
        const drop = s.add.ellipse(e.x, e.y, 6, 4, 0x84cc16).setDepth(e.y + 100);
        drop.rotation = spread;
        s.tweens.add({
          targets: drop,
          x: e.x + Math.cos(spread) * dist,
          y: e.y + Math.sin(spread) * dist,
          duration: 220 + Math.random() * 120,
          ease: 'Quad.Out',
          onComplete: () => {
            drop.setFillStyle(0x22c55e, 0.7);
            drop.setScale(1.5, 0.8);
            s.tweens.add({
              targets: drop,
              alpha: 0,
              scaleX: 2.2,
              scaleY: 1.2,
              duration: 380,
              onComplete: () => drop.destroy(),
            });
          },
        });
      }
      return;
    }
    if (e.kind === 'meteor') {
      play('cave_defeat');
      const startX = e.x - 30;
      const startY = e.y - 280;
      const meteor = s.add.graphics().setPosition(startX, startY).setDepth(1600);
      meteor.fillStyle(0x7c3aed, 0.8).fillCircle(0, 0, 14);
      meteor.fillStyle(0xc084fc, 0.9).fillCircle(-2, -2, 9);
      meteor.fillStyle(0xffffff, 1).fillCircle(-3, -3, 4);

      s.tweens.add({
        targets: meteor,
        x: e.x,
        y: e.y,
        duration: 240,
        ease: 'Quad.In',
        onComplete: () => {
          meteor.destroy();
          if (!reduced) s.cameras.main.shake(160, 0.009);
          const crater = s.add
            .graphics()
            .setPosition(e.x, e.y)
            .setDepth(e.y - 1);
          crater.fillStyle(0x3b0764, 0.7).fillEllipse(0, 0, 70, 36);
          crater.lineStyle(2, 0xa855f7, 0.9).strokeEllipse(0, 0, 70, 36);
          s.tweens.add({
            targets: crater,
            alpha: 0,
            delay: 300,
            duration: 500,
            onComplete: () => crater.destroy(),
          });

          const ring = s.add.graphics().setPosition(e.x, e.y).setDepth(1500);
          s.tweens.addCounter({
            from: 10,
            to: 85,
            duration: 280,
            onUpdate: (tw) => {
              const val = tw.getValue() ?? 0;
              ring.clear();
              ring.lineStyle(4, 0xd8b4fe, 1 - val / 85);
              ring.strokeCircle(0, 0, val);
            },
            onComplete: () => ring.destroy(),
          });
          for (let i = 0; i < 16; i++) {
            const pAng = (i * Math.PI * 2) / 16;
            const pDist = 30 + Math.random() * 55;
            const spark = s.add.rectangle(e.x, e.y, 4, 4, 0xe879f9).setDepth(1501);
            s.tweens.add({
              targets: spark,
              x: e.x + Math.cos(pAng) * pDist,
              y: e.y + Math.sin(pAng) * pDist,
              scale: 0.1,
              alpha: 0,
              duration: 350 + Math.random() * 150,
              ease: 'Cubic.Out',
              onComplete: () => spark.destroy(),
            });
          }
        },
      });
      return;
    }
    if (e.kind === 'laser') {
      play('cave_swing');
      const startX = e.x;
      const startY = e.y;
      const targetX = e.targetX ?? e.x + 350;
      const targetY = e.targetY ?? e.y;
      const beam = s.add.graphics().setDepth(1600);
      beam.lineStyle(16, 0x06b6d4, 0.35).lineBetween(startX, startY, targetX, targetY);
      beam.lineStyle(7, 0x38bdf8, 0.85).lineBetween(startX, startY, targetX, targetY);
      beam.lineStyle(3, 0xffffff, 1.0).lineBetween(startX, startY, targetX, targetY);

      if (!reduced) s.cameras.main.shake(80, 0.003);

      s.tweens.add({
        targets: beam,
        alpha: 0,
        scaleY: 0.2,
        duration: 320,
        ease: 'Sine.In',
        onComplete: () => beam.destroy(),
      });
      return;
    }
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
