import { describe, expect, it } from 'vitest';
import { AuthoritativeMovement } from '@cozy/game-data';

const world = { width: 1000, height: 1000, blockers: [] };

describe('authoritative movement acknowledgements', () => {
  it('acknowledges only after simulation and reports time under that input', () => {
    const movement = new AuthoritativeMovement();
    movement.accept({ x: 1, y: 0, seq: 1 });
    const first = movement.advance({ x: 100, y: 100 }, 50, world);
    expect(first).toEqual({ x: 107.5, y: 100, seq: 1, inputElapsedMs: 50 });
    const second = movement.advance(first, 50, world);
    expect(second).toEqual({ x: 115, y: 100, seq: 1, inputElapsedMs: 100 });
    movement.accept({ x: 0, y: 1, seq: 2 });
    expect(second.seq).toBe(1);
    expect(movement.advance(second, 50, world)).toEqual({ x: 115, y: 107.5, seq: 2, inputElapsedMs: 50 });
  });

  it('rejects stale, duplicate, missing and invalid sequences without changing direction', () => {
    const movement = new AuthoritativeMovement();
    movement.accept({ x: 1, y: 0, seq: 10 });
    for (const seq of [9, 10, -1, NaN, Infinity, 1.5, 0x100000000, undefined]) {
      movement.accept({ x: -1, y: 0, seq });
    }
    expect(movement.advance({ x: 100, y: 100 }, 50, world).x).toBe(107.5);
  });

  it('flooded sequences and forged speed/time do not grant extra movement', () => {
    const movement = new AuthoritativeMovement();
    for (let seq = 1; seq <= 1000; seq++) movement.accept({ x: 999, y: 0, seq });
    const result = movement.advance({ x: 100, y: 100 }, 50, world);
    expect(result.x).toBe(107.5);
    expect(result.seq).toBe(1000);
    movement.stop();
    expect(movement.advance(result, 50, world).x).toBe(result.x);
  });

  it('keeps diagonal speed, collisions and server timestep limits', () => {
    const movement = new AuthoritativeMovement();
    movement.accept({ x: 1, y: 1, seq: 1 });
    const result = movement.advance({ x: 100, y: 100 }, 50, world);
    expect(Math.hypot(result.x - 100, result.y - 100)).toBeCloseTo(7.5);
    movement.accept({ x: 1, y: 0, seq: 2 });
    const blocked = movement.advance({ x: 100, y: 100 }, 50, {
      ...world,
      blockers: [{ x: 115, y: 0, w: 10, h: 1000 }],
    });
    expect(blocked.x).toBe(100);
    expect(movement.advance({ x: 100, y: 100 }, 10000, world).x).toBe(137.5);
  });
});
