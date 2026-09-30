import { stepMovement, type MoveInput } from '@cozy/game-data';

type Position = { x: number; y: number };
type World = Parameters<typeof stepMovement>[3];
type Sample = { seq: number; input: MoveInput; dtMs: number };

/** Logical position is separate from the displayed avatar, so smoothing never feeds collision prediction. */
export class MovementPrediction {
  position: Position;
  private samples: Sample[] = [];
  private acknowledgedSeq = 0;

  constructor(position: Position) {
    this.position = { ...position };
  }

  predict(seq: number, input: MoveInput, dtMs: number, world: World) {
    const elapsed = Number.isFinite(dtMs) ? Math.max(0, Math.min(250, dtMs)) : 0;
    this.position = stepMovement(this.position, input, elapsed / 1000, world);
    this.samples.push({ seq, input: { ...input }, dtMs: elapsed });
    // Bounded history when the connection stalls; the next snapshot remains authoritative.
    if (this.samples.length > 600) this.samples.shift();
    return this.position;
  }

  reconcile(snapshot: Position & { seq: number; inputElapsedMs: number }, world: World) {
    if (snapshot.seq < this.acknowledgedSeq) return;
    this.acknowledgedSeq = snapshot.seq;
    this.samples = this.samples.filter((sample) => sample.seq >= snapshot.seq);
    let consumed = Math.max(0, snapshot.inputElapsedMs || 0);
    let position = { x: snapshot.x, y: snapshot.y };
    for (const sample of this.samples) {
      const acknowledged = sample.seq === snapshot.seq ? Math.min(consumed, sample.dtMs) : 0;
      if (sample.seq === snapshot.seq) consumed -= acknowledged;
      position = stepMovement(position, sample.input, (sample.dtMs - acknowledged) / 1000, world);
    }
    this.position = position;
  }
}

export function smoothMovement(display: Position, before: Position, after: Position, dtMs: number): Position {
  const moved = { x: display.x + after.x - before.x, y: display.y + after.y - before.y };
  if (Math.hypot(after.x - moved.x, after.y - moved.y) > 48) return { ...after };
  const blend = 1 - Math.exp((-12 * Math.max(0, Math.min(dtMs, 250))) / 1000);
  return { x: moved.x + (after.x - moved.x) * blend, y: moved.y + (after.y - moved.y) * blend };
}
