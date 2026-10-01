/** Bounds in the Chibi renderer's local coordinate system, including the held fish. */
export function heldFishLayout(sizeCm: number, aspect: number, trophy: boolean) {
  const width = trophy
    ? Math.max(60, Math.round(48 + Math.pow(sizeCm, 0.72) * 2.2))
    : Math.max(28, Math.round(22 + Math.pow(sizeCm, 0.65) * 1.8));
  const height = Math.round(width * aspect);
  return {
    width,
    height,
    top: trophy ? -52 - height : Math.min(-76, 4),
    bottom: trophy ? 56 : Math.max(56, 4 + height),
    left: -width / 2,
    right: width / 2,
  };
}

export function fitChibiWithFish(
  width: number,
  height: number,
  sizeCm: number,
  aspect: number,
  trophy: boolean,
  preferredScale: number,
) {
  const bounds = sizeCm > 0 ? heldFishLayout(sizeCm, aspect, trophy) : { width: 64, top: -80, bottom: 56 };
  // Trophy glow and sparkles extend beyond the image silhouette.
  const padding = trophy ? 22 : 12;
  const scale = Math.min(
    preferredScale,
    (width - padding * 2) / Math.max(64, bounds.width * (trophy ? 1 : 1.5)),
    (height - padding * 2) / (bounds.bottom - bounds.top),
  );
  const cy = padding + (height - padding * 2 - (bounds.bottom - bounds.top) * scale) / 2 - bounds.top * scale;
  return { scale, cy };
}
