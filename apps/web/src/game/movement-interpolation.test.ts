import { describe, expect, it } from 'vitest';
import { MovementInterpolation } from './movement-interpolation';

describe('remote movement playback', () => {
  it('keeps ten moving peers continuous through jitter and batched patches', () => {
    const peers = Array.from({ length: 10 }, () => new MovementInterpolation());
    const packets = Array.from({ length: 201 }, (_, i) => ({
      time: i * 50,
      at: i * 50 + 80 + [0, 30, 65, 15][i % 4]!,
    }));
    for (let i = 1; i < packets.length; i++) packets[i]!.at = Math.max(packets[i]!.at, packets[i - 1]!.at);
    const last = new Array<number>(10).fill(100);
    let worstStep = 0;
    for (let now = 0; now < 11000; now += 1000 / 60) {
      while (packets[0] && packets[0].at <= now) {
        const packet = packets.shift()!;
        peers.forEach((peer, i) =>
          peer.push(
            {
              x: 100 + Math.min(packet.time, 9000) * 0.15,
              y: 100 + i * 20,
              dir: 2,
              moving: packet.time < 9000,
              time: packet.time,
            },
            now,
          ),
        );
      }
      peers.forEach((peer, i) => {
        const sample = peer.sample(now);
        if (!sample) return;
        expect(sample.x).toBeGreaterThanOrEqual(last[i]!);
        worstStep = Math.max(worstStep, sample.x - last[i]!);
        last[i] = sample.x;
      });
    }
    expect(worstStep).toBeLessThan(3);
    expect(last).toEqual(new Array(10).fill(1450));
    peers.forEach((peer) => expect(peer.sample(12000)?.moving).toBe(false));
  });

  it('holds through a stall, ignores stale snapshots and resets on teleports', () => {
    const peer = new MovementInterpolation();
    peer.push({ x: 100, y: 100, dir: 2, moving: true, time: 0 }, 80);
    peer.push({ x: 107.5, y: 100, dir: 2, moving: true, time: 50 }, 130);
    expect(peer.sample(5000)?.x).toBe(107.5);
    peer.push({ x: 0, y: 0, dir: 0, moving: false, time: 25 }, 5000);
    expect(peer.sample(5000)?.x).toBe(107.5);
    peer.push({ x: 900, y: 800, dir: 0, moving: false, time: 5000 }, 5080);
    expect(peer.sample(5080)).toMatchObject({ x: 900, y: 800, moving: false });
  });
});
