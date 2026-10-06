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
  const steps = speed > PLAYER_SPEED ? Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4)) : 1;
  for (let i = 0; i < steps; i++) {
    const nx = Math.max(PLAYER_RADIUS, Math.min(width - PLAYER_RADIUS, x + dx / steps));
    if (!collides(nx, y, blockers)) x = nx;
    const ny = Math.max(12, Math.min(height - 4, y + dy / steps));
    if (!collides(x, ny, blockers)) y = ny;
  }
  return { x, y };
}

export function isWalkable(x: number, y: number, blockers: Rect[] = BLOCKERS): boolean {
  return !collides(x, y, blockers);
}

/** Server-side input tracking. Only server simulation time advances positions, never packet count or client time. */
export class AuthoritativeMovement {
  input: MoveInput = { x: 0, y: 0 };
  private receivedSeq = 0;
  private appliedSeq = 0;
  private elapsedMs = 0;

  accept(message: { x?: number; y?: number; seq?: number }) {
    const seq = message?.seq;
    if (!Number.isSafeInteger(seq) || seq! <= this.receivedSeq || seq! > 0xffffffff) return;
    this.receivedSeq = seq!;
    this.input = clampInput({ x: Number(message.x), y: Number(message.y) });
  }

  stop() {
    this.input = { x: 0, y: 0 };
  }

  advance(position: { x: number; y: number }, dtMs: number, world: Parameters<typeof stepMovement>[3]) {
    if (this.appliedSeq !== this.receivedSeq) {
      this.appliedSeq = this.receivedSeq;
      this.elapsedMs = 0;
    }
    const elapsed = Number.isFinite(dtMs) ? Math.max(0, Math.min(250, dtMs)) : 0;
    if (this.input.x || this.input.y) this.elapsedMs += elapsed;
    return {
      ...stepMovement(position, this.input, elapsed / 1000, world),
      seq: this.appliedSeq,
      inputElapsedMs: this.elapsedMs,
    };
  }
}
