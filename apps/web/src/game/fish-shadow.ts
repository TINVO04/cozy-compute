import type { SHADOW_TIER_CONFIG, FishShadowTier } from '@cozy/game-data';
import type Phaser from 'phaser';

/** Top-down silhouette: rounded head, tapered body and a traveling tail wave. */
export function drawOrganicFishShadow(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  angle: number,
  time: number,
  tier: (typeof SHADOW_TIER_CONFIG)[FishShadowTier],
  fadeAlpha: number,
  isBite: boolean,
  isRecoil: boolean,
) {
  const len = tier.lengthPx;
  const wid = tier.widthPx;
  const beat = time * 0.007 * tier.wiggleSpeed;
  const amplitude = wid * (isBite ? 0.34 : isRecoil ? 0.2 : 0.12);
  const spine = (u: number) => Math.sin(beat - u * 3.8) * amplitude * u * u;
  const body = (scale: number, offset: number) => {
    g.beginPath();
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i <= 24; i++) {
        const u = side === 0 ? i / 24 : 1 - i / 24;
        const x = (0.48 - u * 0.96) * len;
        // Broad shoulders behind a rounded snout, tapering to the tail wrist.
        const radius = wid * (0.5 * Math.pow(Math.sin(Math.PI * u), 0.7) * (1 - u * 0.62));
        const y = spine(u) + (side === 0 ? -radius : radius) * scale + offset;
        if (side === 0 && i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
    }
    g.closePath();
    g.fillPath();
  };

  g.save();
  g.translateCanvas(cx, cy);
  g.rotateCanvas(angle);

  // Shallow translucent layers blend the silhouette into the lake.
  g.fillStyle(0x082f40, 0.12 * fadeAlpha);
  body(1.25, wid * 0.13);
  if (tier.hasGlow || tier.hasCrown) {
    const glow = tier.hasCrown ? 0xfde68a : 0x67e8f9;
    g.fillStyle(glow, (0.055 + Math.sin(time * 0.003) * 0.015) * fadeAlpha);
    g.fillEllipse(-len * 0.05, 0, len * 1.6, wid * 2.2);
  }

  const tailY = spine(1);
  const tailBeat = Math.sin(beat - 4.2) * amplitude * 0.8;
  const tailSpread = wid * 0.45;
  g.fillStyle(0x103c4c, 0.58 * fadeAlpha);
  g.beginPath();
  g.moveTo(-len * 0.39, spine(0.9) - wid * 0.07);
  g.lineTo(-len * 0.67, tailY + tailBeat - tailSpread);
  g.lineTo(-len * 0.62, tailY + tailBeat - tailSpread * 0.45);
  g.lineTo(-len * 0.53, tailY + tailBeat * 0.5);
  g.lineTo(-len * 0.62, tailY + tailBeat + tailSpread * 0.45);
  g.lineTo(-len * 0.67, tailY + tailBeat + tailSpread);
  g.lineTo(-len * 0.39, spine(0.9) + wid * 0.07);
  g.closePath();
  g.fillPath();

  // Paired fins stay small enough for the body to read as a fish, not a ray.
  const flutter = Math.sin(beat + 0.8) * wid * 0.06;
  for (const side of [-1, 1]) {
    g.beginPath();
    g.moveTo(len * 0.12, side * wid * 0.22);
    g.lineTo(-len * 0.06, side * (wid * 0.55 + flutter));
    g.lineTo(-len * 0.12, side * wid * 0.44);
    g.lineTo(-len * 0.04, side * wid * 0.2);
    g.closePath();
    g.fillPath();
  }

  g.fillStyle(0x0b3041, 0.76 * fadeAlpha);
  body(1, 0);
  g.fillStyle(0x235467, 0.2 * fadeAlpha);
  body(0.46, -wid * 0.04);

  // Short broken caustics suggest water over the back rather than a neon spine.
  g.lineStyle(1, 0x83ccc8, 0.12 * fadeAlpha);
  for (let i = 0; i < 3; i++) {
    const u = 0.25 + i * 0.15;
    const x = (0.48 - u * 0.96) * len;
    g.lineBetween(x - len * 0.035, spine(u) - wid * 0.13, x + len * 0.025, spine(u) + wid * 0.08);
  }

  if (tier.hasCrown) {
    const crownX = len * 0.24;
    const crownY = -wid * 0.5;
    const size = Math.min(12, len * 0.2);
    g.fillStyle(0xfbbf24, 0.9 * fadeAlpha);
    g.beginPath();
    g.moveTo(crownX - size * 0.5, crownY);
    g.lineTo(crownX - size * 0.6, crownY - size * 0.5);
    g.lineTo(crownX - size * 0.2, crownY - size * 0.3);
    g.lineTo(crownX, crownY - size * 0.75);
    g.lineTo(crownX + size * 0.2, crownY - size * 0.3);
    g.lineTo(crownX + size * 0.6, crownY - size * 0.5);
    g.lineTo(crownX + size * 0.5, crownY);
    g.closePath();
    g.fillPath();
  }
  g.restore();
}
