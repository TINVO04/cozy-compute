import { BLOCKERS, MAP_HEIGHT, MAP_WIDTH, type Rect } from './map.js';

export const PLAYER_SPEED = 150; // px per second
export const PLAYER_RADIUS = 10;
export const TICK_RATE = 20;

export interface MoveInput {
  x: number; // -1..1
  y: number; // -1..1
}

function collides(x: number, y: number, blockers: Rect[]): boolean {
  // Collision uses the feet box of the avatar.
  const left = x - PLAYER_RADIUS;
  const right = x + PLAYER_RADIUS;
  const top = y - 6;
  const bottom = y + 4;
  for (const r of blockers) {
    if (right > r.x && left < r.x + r.w && bottom > r.y && top < r.y + r.h) return true;
  }
  return false;
}

export function clampInput(input: MoveInput): MoveInput {
  const x = Number.isFinite(input.x) ? Math.max(-1, Math.min(1, Math.round(input.x))) : 0;
  const y = Number.isFinite(input.y) ? Math.max(-1, Math.min(1, Math.round(input.y))) : 0;
  return { x, y };
}

/**
 * Deterministic movement shared by the authoritative server and client prediction.
 * Movement is resolved axis by axis so players slide along walls.
 */
export function stepMovement(
  pos: { x: number; y: number },
  rawInput: MoveInput,
  dtSeconds: number,
  opts: { blockers?: Rect[]; width?: number; height?: number; speed?: number } = {},
): { x: number; y: number } {
  const input = clampInput(rawInput);
  if (input.x === 0 && input.y === 0) return { x: pos.x, y: pos.y };
  const blockers = opts.blockers ?? BLOCKERS;
  const width = opts.width ?? MAP_WIDTH;
  const height = opts.height ?? MAP_HEIGHT;
  const speed = opts.speed ?? PLAYER_SPEED;
  const len = Math.hypot(input.x, input.y);
  const dt = Math.min(Math.max(dtSeconds, 0), 0.25);
  const dx = (input.x / len) * speed * dt;
  const dy = (input.y / len) * speed * dt;
  let x = pos.x;
  let y = pos.y;
  const nx = Math.max(PLAYER_RADIUS, Math.min(width - PLAYER_RADIUS, x + dx));
  if (!collides(nx, y, blockers)) x = nx;
  const ny = Math.max(12, Math.min(height - 4, y + dy));
  if (!collides(x, ny, blockers)) y = ny;
  return { x, y };
}

export function isWalkable(x: number, y: number, blockers: Rect[] = BLOCKERS): boolean {
  return !collides(x, y, blockers);
}
