export const RIVER_BRIDGE = {
  top: 400,
  deckHeight: 78,
  gap: 20,
  bottom: 576,
  width: 1536,
  pierXs: [240, 580, 920, 1260],
} as const;
export interface BridgeTraveller {
  id: string;
  kind: 'car' | 'bus' | 'truck' | 'bike' | 'person';
  x: number;
  y: number;
  dir: number;
  variant: number;
}
function noise(seed: number) {
  let n = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
/** Stateless schedule keyed to server time: all clients see the same passing traffic,
 * including late joiners. Each departure is outside the bridge, never a mid-road wrap. */
export function bridgeTravellers(now: number): BridgeTraveller[] {
  const people: BridgeTraveller[] = [];
  for (let lane = 0; lane < 6; lane++) {
    const walking = lane >= 4;
    const interval = walking ? 22000 : 6500;
    const speed = walking ? 25 : lane % 2 ? 78 : 100;
    const duration = ((RIVER_BRIDGE.width + 160) / speed) * 1000;
    const slot = Math.floor(now / interval);
    for (let visit = slot - Math.ceil(duration / interval) - 1; visit <= slot; visit++) {
      const seed = visit * 13 + lane * 7919;
      if (noise(seed + 31) < 0.25) continue;
      const started = visit * interval + noise(seed + 1) * interval * 0.35;
      const age = (now - started) / 1000;
      if (age < 0 || age * speed > RIVER_BRIDGE.width + 160) continue;
      const dir = lane < 2 || lane === 4 ? -1 : 1;
      const y = walking
        ? lane === 4
          ? RIVER_BRIDGE.top + 13
          : RIVER_BRIDGE.bottom - 8
        : RIVER_BRIDGE.top +
          (lane >= 2 ? RIVER_BRIDGE.deckHeight + RIVER_BRIDGE.gap : 0) +
          (lane % 2 ? 53 : 29);
      people.push({
        id: `bridge-${lane}-${visit}`,
        kind: walking
          ? 'person'
          : (['car', 'bus', 'truck', 'bike'] as const)[Math.floor(noise(seed + 2) * 4)]!,
        x: dir > 0 ? -80 + age * speed : RIVER_BRIDGE.width + 80 - age * speed,
        y,
        dir,
        variant: Math.floor(noise(seed + 3) * 6),
      });
    }
  }
  return people;
}
