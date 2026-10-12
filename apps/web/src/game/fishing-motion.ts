export interface FishMotionConfig {
  retreatDistancePx?: number;
  dashSpeedFactor?: number;
}

const DEFAULT_RETREAT_PX = 80;
const DEFAULT_DASH_SPEED = 1.4;

/**
 * Fish Nibble Motion:
 * The fish stays at a retreat distance (not orbiting around the float).
 * When it nibbles, it darts rapidly straight towards the bobber, taps the bait,
 * and recoils back to its retreat position facing the float attentively.
 */
export function fishNibblePose(
  elapsedMs: number,
  _pauseMs: number,
  startAngle: number,
  orbitTurnsOrOptions?: number | FishMotionConfig,
  options?: FishMotionConfig,
) {
  const cfg: FishMotionConfig =
    typeof orbitTurnsOrOptions === 'object' && orbitTurnsOrOptions !== null
      ? orbitTurnsOrOptions
      : (options ?? {});

  const retreatDistance = cfg.retreatDistancePx ?? DEFAULT_RETREAT_PX;
  const speed = Math.max(0.4, cfg.dashSpeedFactor ?? DEFAULT_DASH_SPEED);

  const dashMs = Math.max(120, Math.round(200 / speed));
  const recoilMs = Math.max(160, Math.round(280 / speed));
  const strikeEndMs = dashMs + recoilMs;

  let currentDist = retreatDistance;
  let angle = startAngle + Math.PI;
  let isRecoil = false;

  if (elapsedMs < dashMs) {
    // 1. Dash towards bobber: accelerates fast into bait contact (dist ~10px)
    const p = Math.max(0, elapsedMs / dashMs);
    const easeIn = p * p;
    currentDist = retreatDistance - (retreatDistance - 10) * easeIn;
    angle = startAngle + Math.PI;
  } else if (elapsedMs < strikeEndMs) {
    // 2. Recoil back to retreat distance
    const p = Math.max(0, (elapsedMs - dashMs) / recoilMs);
    const easeOut = 1 - Math.pow(1 - p, 2);
    currentDist = 10 + (retreatDistance - 10) * easeOut;
    isRecoil = true;
    angle = startAngle + Math.PI + Math.sin(p * Math.PI) * 0.15;
  } else {
    // 3. Stalking at retreat distance: attentive hovering facing bobber, slight water drift
    const hoverTime = elapsedMs - strikeEndMs;
    const sway = Math.sin(hoverTime * 0.005) * 2.5;
    currentDist = retreatDistance + sway;
    angle = startAngle + Math.PI;
  }

  return {
    x: Math.cos(startAngle) * currentDist,
    y: Math.sin(startAngle) * currentDist,
    angle,
    isRecoil,
    distance: currentDist,
  };
}

/** Direct strike to bite: darts directly from retreat position into bobber center */
export function fishStrikePose(
  elapsedMs: number,
  strikeDurationMs: number,
  startAngle: number,
  retreatDistance = DEFAULT_RETREAT_PX,
) {
  const p = Math.max(0, Math.min(1, elapsedMs / Math.max(1, strikeDurationMs)));
  const ease = p * p * (3 - 2 * p);
  const dist = retreatDistance * (1 - ease);
  return {
    x: Math.cos(startAngle) * dist,
    y: Math.sin(startAngle) * dist,
    angle: startAngle + Math.PI,
    distance: dist,
  };
}
