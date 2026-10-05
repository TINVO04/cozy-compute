type Snapshot = { x: number; y: number; dir: number; moving: boolean; time: number };

/** Render two server ticks behind the fastest observed delivery, absorbing packet jitter. */
export class MovementInterpolation {
  private snapshots: Snapshot[] = [];
  private clockOffset = Infinity;
  private renderedTime = -Infinity;

  push(snapshot: Snapshot, receivedAt: number) {
    const previous = this.snapshots.at(-1);
    if (previous && snapshot.time <= previous.time) return;
    this.clockOffset = Math.min(this.clockOffset, receivedAt - snapshot.time);
    // Room teleports must not draw a path through the intervening world.
    if (previous && Math.hypot(snapshot.x - previous.x, snapshot.y - previous.y) > 128) {
      this.snapshots = [];
      this.renderedTime = snapshot.time;
    }
    this.snapshots.push({ ...snapshot });
    if (this.snapshots.length > 32) this.snapshots.shift();
  }

  sample(now: number): Snapshot | undefined {
    if (!this.snapshots.length) return;
    const latest = this.snapshots.at(-1)!;
    this.renderedTime = Math.min(latest.time, Math.max(this.renderedTime, now - this.clockOffset - 100));
    while (this.snapshots.length > 2 && this.snapshots[1]!.time <= this.renderedTime) {
      this.snapshots.shift();
    }
    const a = this.snapshots[0]!;
    const b = this.snapshots[1];
    if (!b || this.renderedTime <= a.time) return a;
    const t = Math.min(1, (this.renderedTime - a.time) / (b.time - a.time));
    return {
      ...(t < 1 ? a : b),
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      moving: t < 1 ? a.x !== b.x || a.y !== b.y : b.moving,
    };
  }
}
