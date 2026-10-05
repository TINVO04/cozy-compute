import { describe, expect, it, vi } from 'vitest';
import { CAVE_BLOCKERS, isWalkable, type CaveEnemy } from '@cozy/game-data';
import { CaveCombat } from './cave-combat.js';

const player = () => ({ x: 400, y: 320, dir: 2, connected: true });
const enemy = (id: string, x: number, y: number): CaveEnemy => ({
  id,
  kind: 'slime',
  x,
  y,
  hp: 100,
  maxHp: 100,
  nextAttack: 0,
  windup: 0,
});
describe('dojo techniques in cave combat', () => {
  it('enforces learned skills, energy, cooldowns and a single active cast', () => {
    const c = new CaveCombat(vi.fn()),
      p = player();
    expect(c.start('rain', p, 'p', 1000)).toBe(false);
    expect(c.start('unknown', p, 'p', 1000)).toBe(false);
    c.learned.push('rain');
    c.energy = 43;
    expect(c.start('rain', p, 'p', 1000)).toBe(false);
    c.energy = 100;
    expect(c.start('rain', p, 'p', 1000)).toBe(true);
    expect(c.energy).toBe(56);
    expect(c.start('slash', p, 'p', 1001)).toBe(false);
    c.cancel();
    expect(c.start('rain', p, 'p', 1500)).toBe(false);
  });
  it('resolves area damage after windup, once per living enemy, using equipped weapon', () => {
    const c = new CaveCombat(vi.fn()),
      p = player(),
      hit = vi.fn();
    c.learned.push('spin');
    const enemies = [
      enemy('a', 440, 320),
      enemy('b', 370, 340),
      enemy('far', 650, 320),
      { ...enemy('dead', 410, 320), hp: 0 },
    ];
    c.start('spin', p, 'p', 1000);
    c.update(p, enemies, 'iron', 1400, 50, hit, vi.fn());
    expect(hit).not.toHaveBeenCalled();
    c.update(p, enemies, 'iron', 1500, 50, hit, vi.fn());
    c.update(p, enemies, 'iron', 1600, 50, hit, vi.fn());
    expect(hit.mock.calls.map(([e, n]) => [e.id, n])).toEqual([
      ['a', 28],
      ['b', 28],
    ]);
  });
  it('sweeps dash hits once and stops at cave walls', () => {
    const c = new CaveCombat(vi.fn()),
      p = { ...player(), x: 810 },
      hit = vi.fn();
    c.learned.push('wave');
    c.start('wave', p, 'p', 1000);
    const enemies = [enemy('a', 856, 320)];
    for (let i = 0; i < 9; i++) c.update(p, enemies, 'training', 1520 + i * 50, 50, hit, vi.fn());
    expect(hit).toHaveBeenCalledTimes(1);
    expect(p.x).toBeLessThan(912);
    expect(p.x).toBeGreaterThan(850);
    expect(isWalkable(p.x, p.y, CAVE_BLOCKERS)).toBe(true);
  });
  it('cancels delayed attacks on disconnect and floor transitions', () => {
    const c = new CaveCombat(vi.fn()),
      p = player(),
      hit = vi.fn();
    c.start('slash', p, 'p', 1000);
    p.connected = false;
    c.update(p, [enemy('a', 440, 320)], 'training', 1200, 50, hit, vi.fn());
    expect(c.busy).toBe(false);
    expect(hit).not.toHaveBeenCalled();
    p.connected = true;
    c.start('slash', p, 'p', 2000);
    c.cancel();
    c.update(p, [enemy('a', 440, 320)], 'training', 2300, 50, hit, vi.fn());
    expect(hit).not.toHaveBeenCalled();
  });
  it('supports defensive guard and delayed healing', () => {
    const emit = vi.fn(),
      heal = vi.fn().mockReturnValue(10);
    const c = new CaveCombat(emit),
      p = player();
    c.learned.push('guard', 'heal');
    expect(c.start('guard', p, 'p', 1000)).toBe(true);
    expect(c.guardUntil).toBe(2000);
    c.start('heal', p, 'p', 1100);
    c.update(p, [], 'training', 1899, 50, vi.fn(), heal);
    expect(heal).not.toHaveBeenCalled();
    c.update(p, [], 'training', 1900, 50, vi.fn(), heal);
    expect(heal).toHaveBeenCalledWith(24);
    expect(emit).toHaveBeenLastCalledWith(
      expect.objectContaining({ skill: 'heal', phase: 'cast', amount: 10 }),
    );
  });
});
