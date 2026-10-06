/** Shared travelling wave field: hulls and highlights sample the same water surface. */
export function riverWave(time: number, x: number, y: number, windKmh = 14) {
  const strength = 0.65 + Math.max(0, Math.min(60, windKmh)) / 40;
  const swell = x * 0.018 + y * 0.012 - time * 0.0018;
  const chop = x * -0.027 + y * 0.022 - time * 0.0031;
  return (Math.sin(swell) * 1.5 + Math.sin(chop) * 0.55) * strength;
}

export function boatPose(
  time: number,
  x: number,
  y: number,
  boatId: string,
  dir: number,
  moving = false,
  windKmh = 14,
  reducedMotion = false,
) {
  if (reducedMotion) return { heave: 0, roll: 0 };
  const stability =
    boatId === 'boat_trawler' ? 0.4 : boatId === 'boat_cutter' ? 0.6 : boatId === 'boat_sampan' ? 0.78 : 1;
  const side = dir === 1 || dir === 2;
  const slope = riverWave(time, x + 18, y, windKmh) - riverWave(time, x - 18, y, windKmh);
  const pitch = moving ? Math.sin(time * 0.005 + x * 0.012) * 0.008 : 0;
  return {
    heave: riverWave(time, x, y, windKmh) * stability,
    roll: Math.max(-0.065, Math.min(0.065, (slope * (side ? 0.022 : 0.014) + pitch) * stability)),
  };
}
