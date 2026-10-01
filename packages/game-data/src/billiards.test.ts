import { describe, expect, it } from 'vitest';
import {
  BALL_RADIUS,
  FRICTION,
  CUSHION_RESTITUTION,
  calculateAimPrediction,
  createCaromRack,
  createStandard8BallRack,
  createStandardPockets,
  DEFAULT_TABLE_BOUNDS,
  getBallGroup,
  getLegalTargetsForGroup,
  resetCueBallInKitchen,
  stepBilliardsPhysics,
  type BidaBall,
} from './billiards.js';
import { BIDA_BLOCKERS, BIDA_SPAWN } from './map.js';
import { isWalkable } from './movement.js';

describe('billiards physics & match engine', () => {
  it('racks a standard 8-ball set of 16 balls with 8-ball in center', () => {
    const balls = createStandard8BallRack(DEFAULT_TABLE_BOUNDS);
    expect(balls).toHaveLength(16);

    const cue = balls.find((b) => b.id === 0);
    expect(cue).toBeDefined();
    expect(cue?.type).toBe('cue');
    expect(cue?.x).toBeLessThan(DEFAULT_TABLE_BOUNDS.cushionLeft + 300);

    const eight = balls.find((b) => b.id === 8);
    expect(eight).toBeDefined();
    expect(eight?.type).toBe('8ball');
    expect(eight?.color).toBe('#09090b');
    expect(eight?.y).toBe(cue?.y);
    const rear = balls
      .filter((b) => b.id !== 0 && b.x === Math.max(...balls.map((ball) => ball.x)))
      .sort((a, b) => a.y - b.y);
    expect(new Set([rear[0]?.type, rear.at(-1)?.type])).toEqual(new Set(['solid', 'stripe']));

    // All balls must be within cushion bounds
    for (const b of balls) {
      expect(b.x).toBeGreaterThan(DEFAULT_TABLE_BOUNDS.cushionLeft);
      expect(b.x).toBeLessThan(DEFAULT_TABLE_BOUNDS.cushionRight);
      expect(b.y).toBeGreaterThan(DEFAULT_TABLE_BOUNDS.cushionTop);
      expect(b.y).toBeLessThan(DEFAULT_TABLE_BOUNDS.cushionBottom);
    }
  });

  it('racks carom 3-ball set', () => {
    const balls = createCaromRack(DEFAULT_TABLE_BOUNDS);
    expect(balls).toHaveLength(3);
    expect(balls.map((b) => b.id)).toEqual([0, 1, 2]);
  });

  it('bounces ball off cushion with restitution', () => {
    const bounds = DEFAULT_TABLE_BOUNDS;
    const ball: BidaBall = {
      id: 0,
      number: 0,
      x: bounds.cushionRight - BALL_RADIUS + 2,
      y: 200,
      vx: 5,
      vy: 0,
      color: '#ffffff',
      type: 'cue',
      pocketed: false,
    };

    const res = stepBilliardsPhysics([ball], bounds, []);
    expect(ball.vx).toBeLessThan(0); // Reversed velocity
    expect(ball.vx).toBeCloseTo(-5 * FRICTION * CUSHION_RESTITUTION, 8);
    expect(ball.x).toBeLessThanOrEqual(bounds.cushionRight - BALL_RADIUS);
    expect(res.cushionCollisions).toContain(0);
  });

  it('pockets ball when within pocket radius', () => {
    const pockets = createStandardPockets(DEFAULT_TABLE_BOUNDS);
    const corner = pockets[0]!;

    const ball: BidaBall = {
      id: 1,
      number: 1,
      x: corner.x + 2,
      y: corner.y + 2,
      vx: 1,
      vy: 1,
      color: '#facc15',
      type: 'solid',
      pocketed: false,
    };

    const res = stepBilliardsPhysics([ball], DEFAULT_TABLE_BOUNDS, pockets);
    expect(ball.pocketed).toBe(true);
    expect(res.pocketedThisStep).toContain(1);
    expect(ball.vx).toBe(0);
    expect(ball.vy).toBe(0);
  });

  it('resolves elastic collision between two balls', () => {
    const b1: BidaBall = {
      id: 0,
      number: 0,
      x: 100,
      y: 200,
      vx: 4,
      vy: 0,
      color: '#ffffff',
      type: 'cue',
      pocketed: false,
    };
    const b2: BidaBall = {
      id: 1,
      number: 1,
      x: 100 + BALL_RADIUS * 1.5,
      y: 200,
      vx: 0,
      vy: 0,
      color: '#facc15',
      type: 'solid',
      pocketed: false,
    };

    const res = stepBilliardsPhysics([b1, b2], DEFAULT_TABLE_BOUNDS, []);
    expect(res.ballCollisions).toHaveLength(1);
    expect(b2.vx).toBeGreaterThan(0); // Target ball gained forward momentum
    expect(b1.vx).toBeLessThan(4); // Cue ball lost forward momentum
  });

  it('predicts aim raycast and target collision point accurately', () => {
    const cue: BidaBall = {
      id: 0,
      number: 0,
      x: 100,
      y: 200,
      vx: 0,
      vy: 0,
      color: '#ffffff',
      type: 'cue',
      pocketed: false,
    };
    const target: BidaBall = {
      id: 1,
      number: 1,
      x: 200,
      y: 200,
      vx: 0,
      vy: 0,
      color: '#facc15',
      type: 'solid',
      pocketed: false,
    };

    const pred = calculateAimPrediction(cue, [cue, target], 0, DEFAULT_TABLE_BOUNDS);
    expect(pred.hitBallId).toBe(1);
    expect(pred.cueBallCollisionPoint.x).toBeCloseTo(200 - BALL_RADIUS * 2, 0);
    expect(pred.cueBallCollisionPoint.y).toBeCloseTo(200, 0);
    expect(pred.targetBallDirection?.x).toBeCloseTo(1, 1);
  });

  it('resets cue ball in kitchen correctly after scratch', () => {
    const balls = createStandard8BallRack(DEFAULT_TABLE_BOUNDS);
    const cue = balls.find((b) => b.id === 0)!;
    cue.pocketed = true;
    cue.x = 0;
    cue.y = 0;

    resetCueBallInKitchen(DEFAULT_TABLE_BOUNDS, balls);
    expect(cue.pocketed).toBe(false);
    expect(cue.x).toBeGreaterThan(DEFAULT_TABLE_BOUNDS.cushionLeft);
    expect(cue.y).toBeGreaterThan(DEFAULT_TABLE_BOUNDS.cushionTop);
  });

  it('guarantees bida club entrance spawn point is free and walkable without table collision', () => {
    expect(isWalkable(BIDA_SPAWN.x, BIDA_SPAWN.y, BIDA_BLOCKERS)).toBe(true);
  });

  it('correctly classifies ball groups into solids (1-7), stripes (9-15), 8ball and cue', () => {
    expect(getBallGroup(0)).toBe('cue');
    expect(getBallGroup(1)).toBe('solid');
    expect(getBallGroup(7)).toBe('solid');
    expect(getBallGroup(8)).toBe('8ball');
    expect(getBallGroup(9)).toBe('stripe');
    expect(getBallGroup(15)).toBe('stripe');
  });

  it('determines legal 8-ball target balls for open table, assigned group, and 8-ball phase', () => {
    const balls = createStandard8BallRack(DEFAULT_TABLE_BOUNDS);

    // Open table (null group): legal targets are all object balls 1-15 except 8-ball
    const openTargets = getLegalTargetsForGroup(balls, null);
    expect(openTargets).toHaveLength(14);
    expect(openTargets).not.toContain(0);
    expect(openTargets).not.toContain(8);

    // Player assigned solids: legal targets are balls 1-7
    const solidTargets = getLegalTargetsForGroup(balls, 'solid');
    expect(solidTargets).toEqual([1, 2, 3, 4, 5, 6, 7]);

    // Player assigned stripes: legal targets are balls 9-15
    const stripeTargets = getLegalTargetsForGroup(balls, 'stripe');
    expect(stripeTargets).toEqual([9, 10, 11, 12, 13, 14, 15]);

    // Once all solids are pocketed, legal target becomes the 8-ball!
    balls.forEach((b) => {
      if (b.type === 'solid') b.pocketed = true;
    });
    const finalSolidTargets = getLegalTargetsForGroup(balls, 'solid');
    expect(finalSolidTargets).toEqual([8]);
  });
});
