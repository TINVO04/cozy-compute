import { describe, expect, it } from 'vitest';
import { MovementPrediction, smoothMovement } from './movement-prediction';
import { AuthoritativeMovement } from '@cozy/game-data';

const world = { width: 5000, height: 5000, blockers: [] };
const right = { x: 1, y: 0 };
const idle = { x: 0, y: 0 };

describe('movement reconciliation', () => {
  it('replays only the unprocessed portion of an acknowledged sequence', () => {
    const prediction = new MovementPrediction({ x: 100, y: 100 });
    prediction.predict(1, right, 50, world);
    prediction.predict(1, right, 50, world);
    prediction.predict(2, right, 50, world);
    prediction.reconcile({ x: 107.5, y: 100, seq: 1, inputElapsedMs: 50 }, world);
    expect(prediction.position.x).toBe(122.5);
    prediction.reconcile({ x: 115, y: 100, seq: 1, inputElapsedMs: 100 }, world);
    expect(prediction.position.x).toBe(122.5);
    prediction.reconcile({ x: 122.5, y: 100, seq: 2, inputElapsedMs: 50 }, world);
    expect(prediction.position.x).toBe(122.5);
  });

  it('does not double-replay repeated snapshots or reintroduce stale ones', () => {
    const prediction = new MovementPrediction({ x: 100, y: 100 });
    prediction.predict(1, right, 50, world);
    prediction.predict(2, right, 50, world);
    const snapshot = { x: 107.5, y: 100, seq: 1, inputElapsedMs: 50 };
    prediction.reconcile(snapshot, world);
    prediction.reconcile(snapshot, world);
    expect(prediction.position.x).toBe(115);
    prediction.reconcile({ x: 115, y: 100, seq: 2, inputElapsedMs: 50 }, world);
    prediction.reconcile(snapshot, world);
    expect(prediction.position.x).toBe(115);
  });

  it('smooths a correction while moving without feeding visual error back into prediction', () => {
    const display = { x: 120, y: 100 };
    const before = { x: 110, y: 100 };
    const after = { x: 112.5, y: 100 };
    const result = smoothMovement(display, before, after, 1000 / 60);
    expect(result.x).toBeGreaterThan(120);
    expect(result.x).toBeLessThan(122.5);
    let settled = result;
    for (let i = 0; i < 60; i++) settled = smoothMovement(settled, after, after, 1000 / 60);
    expect(settled.x).toBeCloseTo(after.x, 2);
    expect(smoothMovement({ x: 500, y: 100 }, before, after, 16)).toEqual(after);
  });

  for (const frameMs of [1000 / 30, 1000 / 60, 1000 / 144]) {
    it(
      'stays smooth through 160–300ms RTT and jitter, then converges after stop at ' +
        Math.round(1000 / frameMs) +
        ' FPS',
      () => {
        const prediction = new MovementPrediction({ x: 100, y: 100 });
        const server = new AuthoritativeMovement();
        let state = { x: 100, y: 100, seq: 0, inputElapsedMs: 0 };
        let display = { x: 100, y: 100 };
        const packets: { at: number; seq: number; input: typeof right }[] = [];
        const snapshots: { at: number; state: typeof state }[] = [];
        let nextTick = 50,
          nextSend = 0,
          seq = 0,
          lastInput = idle,
          worstBackward = 0,
          snaps = 0;
        for (let now = 0; now < 9000; now += frameMs) {
          const input = now < 5000 ? right : idle;
          if (now >= nextSend || input !== lastInput) {
            if (seq === 0 || input !== lastInput) seq++;
            const at = now + 80 + (seq % 4) * 15;
            packets.push({ at: Math.max(at, (packets.at(-1)?.at ?? 0) + 1), seq, input });
            nextSend = now + 50;
            lastInput = input;
          }
          while (nextTick <= now) {
            while (packets[0] && packets[0].at <= nextTick) {
              const packet = packets.shift()!;
              server.accept({ ...packet.input, seq: packet.seq });
            }
            state = server.advance(state, 50, world);
            const at = nextTick + 80 + (Math.round(nextTick / 50) % 4) * 15;
            snapshots.push({ at: Math.max(at, (snapshots.at(-1)?.at ?? 0) + 1), state: { ...state } });
            nextTick += 50;
          }
          while (snapshots[0] && snapshots[0].at <= now)
            prediction.reconcile(snapshots.shift()!.state, world);
          const before = prediction.position;
          const after = prediction.predict(seq, input, frameMs, world);
          const rendered = smoothMovement(display, before, after, frameMs);
          if (now < 5000) worstBackward = Math.max(worstBackward, display.x - rendered.x);
          if (Math.abs(rendered.x - display.x) > 15) snaps++;
          display = rendered;
        }
        expect(worstBackward).toBeLessThan(1);
        expect(snaps).toBe(0);
        expect(display.x).toBeCloseTo(state.x, 2);
        expect(prediction.position.x).toBeCloseTo(state.x, 2);
      },
    );
  }

  it('keeps collision checks when replaying and bounds a stalled connection history', () => {
    const prediction = new MovementPrediction({ x: 100, y: 100 });
    const wall = { ...world, blockers: [{ x: 115, y: 0, w: 10, h: 5000 }] };
    for (let i = 0; i < 1000; i++) prediction.predict(1, right, 16, wall);
    prediction.reconcile({ x: 100, y: 100, seq: 1, inputElapsedMs: 16 }, wall);
    expect(prediction.position.x).toBeLessThanOrEqual(105);
  });

  it('retains the unacknowledged tail after holding a direction beyond the history limit', () => {
    const prediction = new MovementPrediction({ x: 100, y: 100 });
    for (let i = 0; i < 1200; i++) prediction.predict(1, right, 10, world);
    prediction.reconcile({ x: 1870, y: 100, seq: 1, inputElapsedMs: 11800 }, world);
    expect(prediction.position.x).toBeCloseTo(1900);
    prediction.reconcile({ x: 1885, y: 100, seq: 1, inputElapsedMs: 11900 }, world);
    expect(prediction.position.x).toBeCloseTo(1900);
  });
});
