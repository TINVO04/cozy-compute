export const FISHING_NIBBLE_DURATION_MS = 420;
export const FISHING_APPROACH_MS = 2200;

export interface FishingBehaviorConfig {
  minNibbles: number;
  maxNibbles: number;
  nibbleIntervalMinMs: number;
  nibbleIntervalMaxMs: number;
  shadowDelayMinMs: number;
  shadowDelayMaxMs: number;
  retreatDistancePx: number;
  dashSpeedFactor: number;
}

export const DEFAULT_FISHING_BEHAVIOR_CONFIG: FishingBehaviorConfig = {
  minNibbles: 1,
  maxNibbles: 4,
  nibbleIntervalMinMs: 1400,
  nibbleIntervalMaxMs: 3200,
  shadowDelayMinMs: 3500,
  shadowDelayMaxMs: 7000,
  retreatDistancePx: 80,
  dashSpeedFactor: 1.4,
};

export function rollFishingSequence(
  rng: () => number,
  shadowDelayMs: number,
  nibbleCount: number,
  behavior?: Partial<FishingBehaviorConfig>,
) {
  const minPause = behavior?.nibbleIntervalMinMs ?? 2000;
  const maxPause = behavior?.nibbleIntervalMaxMs ?? 5000;
  const speed = behavior?.dashSpeedFactor ?? 1.0;
  const approachMs =
    nibbleCount === 0
      ? Math.max(600, Math.round(FISHING_APPROACH_MS / Math.max(1, speed)))
      : FISHING_APPROACH_MS;
  const nibbleOffsetsMs: number[] = [];
  const nibbleOrbitTurns: number[] = [];
  let nextNibbleMs = shadowDelayMs + approachMs;
  for (let i = 0; i < nibbleCount; i++) {
    nibbleOffsetsMs.push(nextNibbleMs);
    const pauseMs = minPause + Math.floor(rng() * Math.max(1, maxPause - minPause + 1));
    // At least one full lap, then stop at a random angle in either direction.
    const turns = 1 + rng();
    nibbleOrbitTurns.push((rng() < 0.5 ? -1 : 1) * turns);
    nextNibbleMs += FISHING_NIBBLE_DURATION_MS + pauseMs;
  }
  return { nibbleOffsetsMs, nibbleOrbitTurns, biteInMs: nextNibbleMs };
}
import { FISH } from './activities.js';
import type { OceanZoneId } from './map.js';

/** Location is resolved by the server; better rods never unlock river fish at the town pond. */
export function fishingGround(zone: OceanZoneId | 'town_pond') {
  const deep = zone === 'abyssal_trench';
  const fish = FISH.filter((species) =>
    zone === 'town_pond'
      ? species.habitat === 'freshwater' && species.rarity === 'common'
      : species.rarity !== 'common' &&
        (deep
          ? species.habitat === 'freshwater' || species.habitat === 'mythic'
          : species.habitat === 'freshwater' && ['rare', 'epic'].includes(species.rarity)),
  );
  const bonus = deep ? 2.5 : zone === 'open_sea' ? 1.5 : zone === 'coral_reef' ? 1 : 0;
  return { fish, bonus };
}
