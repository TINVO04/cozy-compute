// ============================================================================
// File: packages/game-data/src/river-traffic.ts
// Stateless time-synchronized river vessel traffic system for Sông Đồng Nai
// Generates authentic river vessels (Ghe Tam Bản, Xà Lan, Ca Nô, Tàu Cá)
// cruising peacefully and sparsely across the grand river.
// ============================================================================

export type RiverVesselKind = 'sampan' | 'barge' | 'cutter' | 'trawler';

export interface RiverVessel {
  id: string;
  kind: RiverVesselKind;
  x: number;
  y: number;
  dirX: number; // -1: West, 1: East, 0: Vertical
  dirY: number; // -1: North, 1: South, 0: Horizontal
  length: number;
  width: number;
  speed: number;
  variant: number; // color/cargo variation
  scene: 'ocean';
}

function noise(seed: number): number {
  let n = Math.imul(seed ^ (seed >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/**
 * River vessel schedule for OceanScene (Grand Sông Đồng Nai, 1536 x 1024).
 * Kept sparse, peaceful, and unhurried:
 * - 2 scenic lanes (1 northern lane above Cầu Hóa An, 1 southern deep lane below Cầu Hóa An).
 * - Generous 45-65s intervals so at most 1-2 vessels cruise leisurely across the wide river.
 */
export function oceanRiverVessels(now: number): RiverVessel[] {
  const vessels: RiverVessel[] = [];
  const channels = [
    // 1. Northern open water lane (above bridge, y ~ 260): Eastbound leisurely cruise
    { y: 260, dirX: 1, interval: 48000, speed: 36 },
    // 2. Southern deep-water shipping lane (below bridge, y ~ 750): Westbound cargo & fishing
    { y: 750, dirX: -1, interval: 56000, speed: 28 },
  ];

  for (let c = 0; c < channels.length; c++) {
    const ch = channels[c]!;
    const travelDistance = 1536 + 260;
    const duration = (travelDistance / ch.speed) * 1000;
    const slot = Math.floor(now / ch.interval);

    for (let visit = slot - Math.ceil(duration / ch.interval) - 1; visit <= slot; visit++) {
      const seed = visit * 47 + c * 8273;
      if (noise(seed + 19) < 0.25) continue; // Natural spacing
      const started = visit * ch.interval + noise(seed + 2) * ch.interval * 0.35;
      const age = (now - started) / 1000;
      if (age < 0 || age * ch.speed > travelDistance) continue;

      const kindSeed = noise(seed + 5);
      const kind: RiverVesselKind =
        c === 1 // Southern deep lane: heavy barges, classic trawlers, and sampans
          ? kindSeed < 0.45
            ? 'barge'
            : kindSeed < 0.75
              ? 'trawler'
              : 'sampan'
          : kindSeed < 0.45 // Northern lane: scenic wooden sampans, sport cutters, and trawlers
            ? 'sampan'
            : kindSeed < 0.75
              ? 'cutter'
              : 'trawler';

      const length = kind === 'barge' ? 88 : kind === 'trawler' ? 56 : kind === 'cutter' ? 40 : 34;
      const width = kind === 'barge' ? 26 : kind === 'trawler' ? 22 : kind === 'cutter' ? 16 : 14;

      const startX = ch.dirX > 0 ? -110 : 1536 + 110;
      const x = startX + ch.dirX * age * ch.speed;
      const ySway = ch.y + Math.sin(age * 0.3) * 6; // gentle river wave drift

      vessels.push({
        id: `ocean-vessel-${c}-${visit}`,
        kind,
        x,
        y: ySway,
        dirX: ch.dirX,
        dirY: 0,
        length,
        width,
        speed: ch.speed,
        variant: Math.floor(noise(seed + 9) * 4),
        scene: 'ocean',
      });
    }
  }

  return vessels;
}
