export const FISHING_NIBBLE_DURATION_MS = 420;
export const FISHING_APPROACH_MS = 2200;

/** The server rolls each pause independently, including the pause before the real bite. */
export function rollFishingSequence(rng: () => number, shadowDelayMs: number, nibbleCount: number) {
  const nibbleOffsetsMs: number[] = [];
  const nibbleOrbitTurns: number[] = [];
  let nextNibbleMs = shadowDelayMs + FISHING_APPROACH_MS;
  for (let i = 0; i < nibbleCount; i++) {
    nibbleOffsetsMs.push(nextNibbleMs);
    const pauseMs = 2000 + Math.floor(rng() * 3001);
    // At least one full lap, then stop at a random angle in either direction.
    const turns = 1 + rng();
    nibbleOrbitTurns.push((rng() < 0.5 ? -1 : 1) * turns);
    nextNibbleMs += FISHING_NIBBLE_DURATION_MS + pauseMs;
  }
  return { nibbleOffsetsMs, nibbleOrbitTurns, biteInMs: nextNibbleMs };
}
