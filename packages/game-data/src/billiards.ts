/**
 * Authoritative 2D Billiards Physics & Match Logic
 * Used by both client-side simulation & prediction and server-side state resolution.
 */

export const BALL_RADIUS = 8;
export const BALL_MASS = 1;
export const FRICTION = 0.99;
export const STOP_VELOCITY = 0.05;
export const RESTITUTION = 0.95;
export const CUSHION_RESTITUTION = 0.85;

export interface TableBounds {
  width: number;
  height: number;
  cushionLeft: number;
  cushionTop: number;
  cushionRight: number;
  cushionBottom: number;
}

export const DEFAULT_TABLE_BOUNDS: TableBounds = {
  width: 800,
  height: 450,
  cushionLeft: 36,
  cushionTop: 36,
  cushionRight: 764,
  cushionBottom: 414,
};

export type BallType = 'cue' | 'solid' | 'stripe' | '8ball';

export interface BidaBall {
  id: number;
  number: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  type: BallType;
  pocketed: boolean;
}

export interface Pocket {
  x: number;
  y: number;
  radius: number;
}

export interface StepPhysicsResult {
  anyMoving: boolean;
  ballCollisions: [number, number][];
  cushionCollisions: number[];
  pocketedThisStep: number[];
}

export interface AimPrediction {
  cueBallCollisionPoint: { x: number; y: number };
  hitBallId?: number;
  targetBallDirection?: { x: number; y: number };
}

export const BALL_COLORS: Record<number, { color: string; type: BallType }> = {
  0: { color: '#f8fafc', type: 'cue' }, // Cue ball
  1: { color: '#facc15', type: 'solid' }, // 1 Yellow
  2: { color: '#2563eb', type: 'solid' }, // 2 Blue
  3: { color: '#dc2626', type: 'solid' }, // 3 Red
  4: { color: '#9333ea', type: 'solid' }, // 4 Purple
  5: { color: '#ea580c', type: 'solid' }, // 5 Orange
  6: { color: '#16a34a', type: 'solid' }, // 6 Green
  7: { color: '#9a3412', type: 'solid' }, // 7 Brown/Maroon
  8: { color: '#09090b', type: '8ball' }, // 8 Black
  9: { color: '#facc15', type: 'stripe' }, // 9 Yellow Stripe
  10: { color: '#2563eb', type: 'stripe' }, // 10 Blue Stripe
  11: { color: '#dc2626', type: 'stripe' }, // 11 Red Stripe
  12: { color: '#9333ea', type: 'stripe' }, // 12 Purple Stripe
  13: { color: '#ea580c', type: 'stripe' }, // 13 Orange Stripe
  14: { color: '#16a34a', type: 'stripe' }, // 14 Green Stripe
  15: { color: '#9a3412', type: 'stripe' }, // 15 Brown Stripe
};

/** Generates standard 6 pockets for pool tables. */
export function createStandardPockets(bounds: TableBounds = DEFAULT_TABLE_BOUNDS): Pocket[] {
  const cornerRadius = 18;
  const sideRadius = 15;
  const midX = (bounds.cushionLeft + bounds.cushionRight) / 2;

  return [
    { x: bounds.cushionLeft + 4, y: bounds.cushionTop + 4, radius: cornerRadius },
    { x: midX, y: bounds.cushionTop - 1, radius: sideRadius },
    { x: bounds.cushionRight - 4, y: bounds.cushionTop + 4, radius: cornerRadius },
    { x: bounds.cushionLeft + 4, y: bounds.cushionBottom - 4, radius: cornerRadius },
    { x: midX, y: bounds.cushionBottom + 1, radius: sideRadius },
    { x: bounds.cushionRight - 4, y: bounds.cushionBottom - 4, radius: cornerRadius },
  ];
}

/** Generates a standard triangular 8-ball rack. */
export function createStandard8BallRack(bounds: TableBounds = DEFAULT_TABLE_BOUNDS): BidaBall[] {
  const tableWidth = bounds.cushionRight - bounds.cushionLeft;
  const tableHeight = bounds.cushionBottom - bounds.cushionTop;
  const centerY = bounds.cushionTop + tableHeight / 2;

  // Cue ball at 25% of table (head string)
  const cueBall: BidaBall = {
    id: 0,
    number: 0,
    x: bounds.cushionLeft + tableWidth * 0.25,
    y: centerY,
    vx: 0,
    vy: 0,
    color: BALL_COLORS[0]!.color,
    type: 'cue',
    pocketed: false,
  };

  // 15 object balls in triangle
  // Row 0: 1 ball (Apex)
  // Row 1: 2 balls
  // Row 2: 3 balls (8-ball in center!)
  // Row 3: 4 balls
  // Row 4: 5 balls (Solid and stripe on opposite corners)
  const pattern = [[1], [9, 2], [3, 8, 10], [11, 4, 12, 5], [13, 6, 14, 7, 15]];

  const apexX = bounds.cushionLeft + tableWidth * 0.72;
  const dx = BALL_RADIUS * Math.sqrt(3) + 0.4;
  const dy = BALL_RADIUS * 2 + 0.4;

  const balls: BidaBall[] = [cueBall];

  pattern.forEach((row, rowIdx) => {
    const startY = centerY - ((row.length - 1) * dy) / 2;
    row.forEach((num, colIdx) => {
      const info = BALL_COLORS[num]!;
      balls.push({
        id: num,
        number: num,
        x: apexX + rowIdx * dx,
        y: startY + colIdx * dy,
        vx: 0,
        vy: 0,
        color: info.color,
        type: info.type,
        pocketed: false,
      });
    });
  });

  return balls;
}

/** Generates Carom 3-cushion ball set (White cue, Yellow cue, Red target). */
export function createCaromRack(bounds: TableBounds = DEFAULT_TABLE_BOUNDS): BidaBall[] {
  const tableWidth = bounds.cushionRight - bounds.cushionLeft;
  const centerY = bounds.cushionTop + (bounds.cushionBottom - bounds.cushionTop) / 2;

  return [
    {
      id: 0,
      number: 0,
      x: bounds.cushionLeft + tableWidth * 0.25,
      y: centerY - 40,
      vx: 0,
      vy: 0,
      color: '#ffffff',
      type: 'cue',
      pocketed: false,
    },
    {
      id: 1,
      number: 1,
      x: bounds.cushionLeft + tableWidth * 0.25,
      y: centerY + 40,
      vx: 0,
      vy: 0,
      color: '#facc15',
      type: 'cue',
      pocketed: false,
    },
    {
      id: 2,
      number: 2,
      x: bounds.cushionLeft + tableWidth * 0.75,
      y: centerY,
      vx: 0,
      vy: 0,
      color: '#dc2626',
      type: 'solid',
      pocketed: false,
    },
  ];
}

/** Resets cue ball to kitchen spot after scratch. */
export function resetCueBallInKitchen(bounds: TableBounds = DEFAULT_TABLE_BOUNDS, balls: BidaBall[]): void {
  const cue = balls.find((b) => b.id === 0);
  if (!cue) return;
  const tableWidth = bounds.cushionRight - bounds.cushionLeft;
  const centerY = bounds.cushionTop + (bounds.cushionBottom - bounds.cushionTop) / 2;

  cue.pocketed = false;
  cue.vx = 0;
  cue.vy = 0;
  cue.x = bounds.cushionLeft + tableWidth * 0.25;
  cue.y = centerY;

  // Make sure not colliding with another ball at kitchen
  while (
    balls.some((b) => b.id !== 0 && !b.pocketed && Math.hypot(b.x - cue.x, b.y - cue.y) < BALL_RADIUS * 2 + 2)
  ) {
    cue.y += BALL_RADIUS * 2;
    if (cue.y > bounds.cushionBottom - BALL_RADIUS * 2) {
      cue.y = bounds.cushionTop + BALL_RADIUS * 2;
      cue.x += BALL_RADIUS * 2;
    }
  }
}

/** Performs 1 physics tick: movement, pockets, cushions, and ball-ball collisions. */
export function stepBilliardsPhysics(
  balls: BidaBall[],
  bounds: TableBounds = DEFAULT_TABLE_BOUNDS,
  pockets: Pocket[] = [],
): StepPhysicsResult {
  const ballCollisions: [number, number][] = [];
  const cushionCollisions: number[] = [];
  const pocketedThisStep: number[] = [];

  const activeBalls = balls.filter((b) => !b.pocketed);

  // 1. Move balls and check pockets
  for (const b of activeBalls) {
    if (b.vx === 0 && b.vy === 0) continue;

    b.x += b.vx;
    b.y += b.vy;

    // Check pockets
    for (const p of pockets) {
      const dist = Math.hypot(b.x - p.x, b.y - p.y);
      if (dist < p.radius) {
        b.pocketed = true;
        b.vx = 0;
        b.vy = 0;
        pocketedThisStep.push(b.id);
        break;
      }
    }

    if (b.pocketed) continue;

    // Friction
    b.vx *= FRICTION;
    b.vy *= FRICTION;

    if (Math.hypot(b.vx, b.vy) < STOP_VELOCITY) {
      b.vx = 0;
      b.vy = 0;
    }

    // Cushion bounces
    if (b.x - BALL_RADIUS < bounds.cushionLeft) {
      b.x = bounds.cushionLeft + BALL_RADIUS;
      b.vx = -b.vx * CUSHION_RESTITUTION;
      cushionCollisions.push(b.id);
    } else if (b.x + BALL_RADIUS > bounds.cushionRight) {
      b.x = bounds.cushionRight - BALL_RADIUS;
      b.vx = -b.vx * CUSHION_RESTITUTION;
      cushionCollisions.push(b.id);
    }

    if (b.y - BALL_RADIUS < bounds.cushionTop) {
      b.y = bounds.cushionTop + BALL_RADIUS;
      b.vy = -b.vy * CUSHION_RESTITUTION;
      cushionCollisions.push(b.id);
    } else if (b.y + BALL_RADIUS > bounds.cushionBottom) {
      b.y = bounds.cushionBottom - BALL_RADIUS;
      b.vy = -b.vy * CUSHION_RESTITUTION;
      cushionCollisions.push(b.id);
    }
  }

  // 2. Ball-ball elastic collisions
  const remaining = balls.filter((b) => !b.pocketed);
  for (let i = 0; i < remaining.length; i++) {
    const b1 = remaining[i];
    if (!b1) continue;
    for (let j = i + 1; j < remaining.length; j++) {
      const b2 = remaining[j];
      if (!b2) continue;

      const dx = b2.x - b1.x;
      const dy = b2.y - b1.y;
      const dist = Math.hypot(dx, dy);
      const minDist = BALL_RADIUS * 2;

      if (dist < minDist && dist > 0.0001) {
        // Positional separation
        const overlap = (minDist - dist) * 0.5;
        const nx = dx / dist;
        const ny = dy / dist;

        b1.x -= nx * overlap;
        b1.y -= ny * overlap;
        b2.x += nx * overlap;
        b2.y += ny * overlap;

        // Velocity along collision normal
        const kx = b1.vx - b2.vx;
        const ky = b1.vy - b2.vy;
        const p = (2 * (nx * kx + ny * ky)) / (BALL_MASS + BALL_MASS);

        if (p > 0) {
          const impulse = p * RESTITUTION;
          b1.vx -= impulse * BALL_MASS * nx;
          b1.vy -= impulse * BALL_MASS * ny;
          b2.vx += impulse * BALL_MASS * nx;
          b2.vy += impulse * BALL_MASS * ny;
          ballCollisions.push([b1.id, b2.id]);
        }
      }
    }
  }

  const anyMoving = balls.some((b) => !b.pocketed && (b.vx !== 0 || b.vy !== 0));

  return {
    anyMoving,
    ballCollisions,
    cushionCollisions,
    pocketedThisStep,
  };
}

/** Calculates raycast aim trajectory and collision prediction point. */
export function calculateAimPrediction(
  cueBall: BidaBall,
  balls: BidaBall[],
  aimAngle: number,
  bounds: TableBounds = DEFAULT_TABLE_BOUNDS,
): AimPrediction {
  const dirX = Math.cos(aimAngle);
  const dirY = Math.sin(aimAngle);

  let closestDist = Infinity;
  let hitBall: BidaBall | null = null;
  const collisionRadius = BALL_RADIUS * 2;

  for (const b of balls) {
    if (b.id === cueBall.id || b.pocketed) continue;

    // Vector from cue to object ball
    const vx = b.x - cueBall.x;
    const vy = b.y - cueBall.y;

    // Projection along aim line
    const t = vx * dirX + vy * dirY;
    if (t <= 0) continue; // Behind cue ball

    // Perpendicular distance squared
    const perpSq = vx * vx + vy * vy - t * t;
    if (perpSq <= collisionRadius * collisionRadius) {
      const dt = Math.sqrt(Math.max(0, collisionRadius * collisionRadius - perpSq));
      const dist = t - dt;
      if (dist > 0 && dist < closestDist) {
        closestDist = dist;
        hitBall = b;
      }
    }
  }

  // Cushion boundary intersections
  let cushionDist = Infinity;
  if (dirX > 0) {
    const d = (bounds.cushionRight - BALL_RADIUS - cueBall.x) / dirX;
    if (d > 0 && d < cushionDist) cushionDist = d;
  } else if (dirX < 0) {
    const d = (bounds.cushionLeft + BALL_RADIUS - cueBall.x) / dirX;
    if (d > 0 && d < cushionDist) cushionDist = d;
  }
  if (dirY > 0) {
    const d = (bounds.cushionBottom - BALL_RADIUS - cueBall.y) / dirY;
    if (d > 0 && d < cushionDist) cushionDist = d;
  } else if (dirY < 0) {
    const d = (bounds.cushionTop + BALL_RADIUS - cueBall.y) / dirY;
    if (d > 0 && d < cushionDist) cushionDist = d;
  }

  if (hitBall && closestDist < cushionDist) {
    const colX = cueBall.x + dirX * closestDist;
    const colY = cueBall.y + dirY * closestDist;

    // Direction hit ball will take
    const targetDx = hitBall.x - colX;
    const targetDy = hitBall.y - colY;
    const targetDist = Math.hypot(targetDx, targetDy) || 1;

    return {
      cueBallCollisionPoint: { x: colX, y: colY },
      hitBallId: hitBall.id,
      targetBallDirection: { x: targetDx / targetDist, y: targetDy / targetDist },
    };
  }

  const travel = Math.min(cushionDist, 1000);
  return {
    cueBallCollisionPoint: {
      x: cueBall.x + dirX * travel,
      y: cueBall.y + dirY * travel,
    },
  };
}
