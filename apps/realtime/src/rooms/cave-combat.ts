import {
  CAVE_BLOCKERS,
  CAVE_WIDTH,
  CAVE_HEIGHT,
  CAVE_WEAPONS,
  MARTIAL_SKILLS,
  MARTIAL_DASH_MS,
  MARTIAL_DASH_DISTANCE,
  isWalkable,
  martialDashHits,
  martialHits,
  type CaveEnemy,
  type CaveWeapon,
  type MartialEffect,
  type MartialSkillId,
} from '@cozy/game-data';

type Position = { x: number; y: number; dir: number; connected: boolean };
type Cast = MartialEffect & { at: number };
/** Reuses the dojo skill definitions; only the authoritative room can supply ownership or targets. */
export class CaveCombat {
  learned: MartialSkillId[] = ['slash'];
  energy = 100;
  cooldowns: Partial<Record<MartialSkillId, number>> = {};
  guardUntil = 0;
  private cast: Cast | null = null;
  private dash: {
    cast: Cast;
    from: { x: number; y: number };
    to: { x: number; y: number };
    elapsed: number;
    hit: Set<string>;
  } | null = null;
  constructor(private emit: (e: MartialEffect) => void) {}
  get busy() {
    return !!this.cast || !!this.dash;
  }
  get casting() {
    return this.cast?.skill ?? this.dash?.cast.skill ?? null;
  }
  cancel() {
    this.cast = null;
    this.dash = null;
    this.guardUntil = 0;
  }
  start(id: string, p: Position, sid: string, now: number) {
    const move = MARTIAL_SKILLS.find((s) => s.id === id);
    if (
      !p.connected ||
      !move ||
      !this.learned.includes(move.id) ||
      this.busy ||
      this.energy < move.energy ||
      now < (this.cooldowns[move.id] ?? 0)
    )
      return false;
    this.energy -= move.energy;
    this.cooldowns[move.id] = now + move.cooldown;
    const effect: Cast = {
      skill: move.id,
      sid,
      phase: 'windup',
      x: p.x,
      y: p.y,
      angle: [Math.PI / 2, Math.PI, 0, -Math.PI / 2][p.dir] ?? 0,
      at: now + move.windup,
    };
    if (move.id === 'guard') {
      this.guardUntil = now + 1000;
      this.emit({ ...effect, phase: 'cast' });
    } else {
      this.cast = effect;
      this.emit(effect);
    }
    return true;
  }
  update(
    p: Position,
    enemies: CaveEnemy[],
    weapon: CaveWeapon,
    now: number,
    dt: number,
    hit: (e: CaveEnemy, n: number) => void,
    heal: (n: number) => number,
  ) {
    if (!p.connected) {
      this.cancel();
      return;
    }
    this.energy = Math.min(100, this.energy + (12 * Math.min(dt, 100)) / 1000);
    const damage = (id: MartialSkillId) =>
      Math.round(
        CAVE_WEAPONS.find((w) => w.id === weapon)!.damage * MARTIAL_SKILLS.find((s) => s.id === id)!.damage,
      );
    if (this.dash) {
      const d = this.dash;
      const from = { x: p.x, y: p.y };
      d.elapsed += Math.min(dt, 100);
      const t = Math.min(1, d.elapsed / MARTIAL_DASH_MS);
      p.x = d.from.x + (d.to.x - d.from.x) * t;
      p.y = d.from.y + (d.to.y - d.from.y) * t;
      if (d.cast.skill === 'wave')
        for (const enemy of enemies) {
          if (enemy.hp > 0 && !d.hit.has(enemy.id) && martialDashHits(from, p, enemy)) {
            d.hit.add(enemy.id);
            hit(enemy, damage('wave'));
          }
        }
      if (t >= 1) {
        this.emit({ ...d.cast, x: p.x, y: p.y, phase: 'cast' });
        this.dash = null;
      }
    }
    if (!this.cast || now < this.cast.at) return;
    const cast = this.cast;
    this.cast = null;
    if (cast.skill === 'wave' || cast.skill === 'step') {
      const from = { x: p.x, y: p.y };
      let to = { ...from };
      for (let distance = 2; distance <= MARTIAL_DASH_DISTANCE; distance += 2) {
        const x = from.x + Math.cos(cast.angle) * distance,
          y = from.y + Math.sin(cast.angle) * distance;
        if (
          x < 10 ||
          x > CAVE_WIDTH - 10 ||
          y < 12 ||
          y > CAVE_HEIGHT - 4 ||
          !isWalkable(x, y, CAVE_BLOCKERS)
        )
          break;
        to = { x, y };
      }
      this.dash = { cast, from, to, elapsed: 0, hit: new Set() };
      this.emit({ ...cast, ...from, phase: 'dash', endX: to.x, endY: to.y, duration: MARTIAL_DASH_MS });
      return;
    }
    if (cast.skill === 'heal') {
      this.emit({ ...cast, phase: 'cast', amount: heal(24) });
      return;
    }
    this.emit({ ...cast, phase: 'cast' });
    for (const enemy of enemies)
      if (enemy.hp > 0 && martialHits(cast.skill, cast, enemy, cast.angle)) hit(enemy, damage(cast.skill));
  }
}
