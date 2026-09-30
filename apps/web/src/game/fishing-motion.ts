import { FISHING_NIBBLE_DURATION_MS } from '@cozy/game-data';

const HOVER_RADIUS = 22;
const TAU = Math.PI * 2;

function turnTowards(from: number, to: number, progress: number) {
  const difference = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + difference * Math.max(0, Math.min(1, progress));
}

/** A dart, a recoil, a complete lap and a stationary wait at the new approach angle. */
export function fishNibblePose(elapsedMs: number, pauseMs: number, startAngle: number, orbitTurns: number) {
  if (elapsedMs < FISHING_NIBBLE_DURATION_MS) {
    const progress = Math.max(0, elapsedMs / FISHING_NIBBLE_DURATION_MS);
    let dart = 0;
    if (progress < 0.15) {
      dart = -2.5 * Math.sin((progress / 0.15) * Math.PI);
    } else if (progress < 0.38) {
      dart = ((progress - 0.15) / 0.23) * 18;
    } else if (progress < 0.72) {
      dart = 18 * (1 - Math.sin(((progress - 0.38) / 0.34) * Math.PI * 0.5));
    }
    return {
      x: Math.cos(startAngle) * (HOVER_RADIUS - dart),
      y: Math.sin(startAngle) * (HOVER_RADIUS - dart),
      angle: startAngle + Math.PI,
      isRecoil: progress >= 0.38 && progress < 0.72,
    };
  }

  const orbitMs = Math.min(1800, pauseMs * 0.65);
  const orbitElapsedMs = elapsedMs - FISHING_NIBBLE_DURATION_MS;
  const progress = Math.max(0, Math.min(1, orbitElapsedMs / Math.max(1, orbitMs)));
  const ease = progress * progress * (3 - 2 * progress);
  const positionAngle = startAngle + orbitTurns * TAU * ease;
  const inwardAngle = positionAngle + Math.PI;
  const tangentAngle = positionAngle + (Math.sign(orbitTurns) * Math.PI) / 2;
  const swimmingAngle = turnTowards(inwardAngle, tangentAngle, orbitElapsedMs / 160);
  const angle = turnTowards(swimmingAngle, inwardAngle, (orbitElapsedMs - orbitMs + 220) / 220);
  return {
    x: Math.cos(positionAngle) * HOVER_RADIUS,
    y: Math.sin(positionAngle) * HOVER_RADIUS,
    angle,
    isRecoil: false,
  };
}
