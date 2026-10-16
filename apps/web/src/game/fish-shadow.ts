import type { ShadowTierInfo } from '@cozy/game-data';
import type Phaser from 'phaser';

/**
 * Top-down realistic organic fish silhouette for Phaser 3:
 * - Hydrodynamic fusiform body (rounded snout, widest at gill crest, tapered caudal peduncle).
 * - Graceful curved fins and flexible homocercal caudal tail.
 * - Multi-layer water depth shading with subtle spine caustics.
 * - Elegant sparkling golden crown & ethereal bioluminescent glow.
 */
export function drawOrganicFishShadow(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  angle: number,
  time: number,
  tier: ShadowTierInfo,
  fadeAlpha: number,
  isBite: boolean,
  isRecoil: boolean,
) {
  const len = tier.lengthPx;
  const wid = tier.widthPx;
  const beat = time * 0.007 * tier.wiggleSpeed;
  const amplitude = wid * (isBite ? 0.34 : isRecoil ? 0.2 : 0.12);

  // Traveling sinusoidal body wave: head stays relatively steady, tail swings wide
  const spine = (u: number) => Math.sin(beat - u * 3.4) * amplitude * Math.pow(u, 1.5);

  const body = (scale: number, offset: number) => {
    g.beginPath();
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i <= 28; i++) {
        const u = side === 0 ? i / 28 : 1 - i / 28;
        const x = (0.46 - u * 0.94) * len;
        // Smooth hydrodynamic body curve
        const radius = wid * 0.5 * Math.sin(Math.PI * Math.pow(u, 0.72)) * (1 - u * 0.55);
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

  // 1. Ethereal Bioluminescent Glow / Mythic Aura
  if (tier.hasGlow || tier.hasCrown) {
    const glowColor = tier.hasCrown ? 0xfef08a : 0x38bdf8;
    const pulse = 0.05 + Math.sin(time * 0.003) * 0.02;
    g.fillStyle(glowColor, pulse * fadeAlpha);
    g.fillEllipse(0, 0, len * 1.35, wid * 1.9);
  }

  // 2. Submerged Water Refraction Outer Layer
  g.fillStyle(0x062837, 0.18 * fadeAlpha);
  body(1.18, 0);

  // 3. Graceful Caudal Tail Fin (Forked Crescent)
  const tailY = spine(1);
  const tailBeat = Math.sin(beat - 3.8) * amplitude * 0.85;
  const tailSpread = wid * 0.52;
  const tailX = -len * 0.48;

  g.fillStyle(0x082b3a, 0.65 * fadeAlpha);
  g.beginPath();
  g.moveTo(tailX, spine(0.95) - wid * 0.08);
  g.lineTo(tailX - len * 0.22, tailY + tailBeat - tailSpread);
  g.lineTo(tailX - len * 0.17, tailY + tailBeat - tailSpread * 0.35);
  g.lineTo(tailX - len * 0.11, tailY + tailBeat);
  g.lineTo(tailX - len * 0.17, tailY + tailBeat + tailSpread * 0.35);
  g.lineTo(tailX - len * 0.22, tailY + tailBeat + tailSpread);
  g.lineTo(tailX, spine(0.95) + wid * 0.08);
  g.closePath();
  g.fillPath();

  // 4. Curved Pectoral Fins (flowing backwards with water)
  const finFlutter = Math.sin(beat + 0.8) * wid * 0.05;
  for (const side of [-1, 1]) {
    g.fillStyle(0x093142, 0.48 * fadeAlpha);
    g.beginPath();
    g.moveTo(len * 0.16, side * wid * 0.24);
    g.lineTo(len * 0.02, side * (wid * 0.58 + finFlutter));
    g.lineTo(-len * 0.08, side * (wid * 0.46 + finFlutter * 0.7));
    g.lineTo(-len * 0.02, side * wid * 0.22);
    g.closePath();
    g.fillPath();
  }

  // 5. Deep Aquatic Silhouette Core
  g.fillStyle(0x041d27, 0.88 * fadeAlpha);
  body(1.0, 0);

  // 6. Dorsal Spine Depth
  g.fillStyle(0x021118, 0.35 * fadeAlpha);
  body(0.42, 0);

  // 7. Subtle Water Surface Sheen (smooth flowing dorsal highlight)
  g.lineStyle(1.2, 0x7dd3fc, 0.14 * fadeAlpha);
  g.beginPath();
  for (let i = 4; i <= 20; i++) {
    const u = i / 28;
    const x = (0.46 - u * 0.94) * len;
    const y = spine(u) - wid * 0.04;
    if (i === 4) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.strokePath();

  // 8. Elegant Golden Crown 👑
  if (tier.hasCrown) {
    const crownX = len * 0.28;
    const crownY = spine(0.1) - Math.max(16, wid * 0.42) - 8 + Math.sin(time * 0.005) * 2.5;
    const size = Math.max(16, Math.min(len * 0.12, 36));

    // Warm golden aura
    g.fillStyle(0xfef08a, 0.32 * fadeAlpha);
    g.fillCircle(crownX, crownY - size * 0.2, size * 0.9);

    // Crown Body
    g.fillStyle(0xf59e0b, 0.95 * fadeAlpha);
    g.beginPath();
    g.moveTo(crownX - size * 0.5, crownY);
    g.lineTo(crownX - size * 0.55, crownY - size * 0.55);
    g.lineTo(crownX - size * 0.18, crownY - size * 0.28);
    g.lineTo(crownX, crownY - size * 0.75);
    g.lineTo(crownX + size * 0.18, crownY - size * 0.28);
    g.lineTo(crownX + size * 0.55, crownY - size * 0.55);
    g.lineTo(crownX + size * 0.5, crownY);
    g.closePath();
    g.fillPath();

    // Center jewel
    g.fillStyle(0xef4444, 0.95 * fadeAlpha);
    g.fillCircle(crownX, crownY - size * 0.22, Math.max(1.5, size * 0.12));
  }

  g.restore();
}

/**
 * HTML5 2D Canvas version of the organic fish shadow algorithm for Admin live preview studio:
 * - Perfectly matches top-down organic aquatic physics.
 * - Soft volumetric water falloff gradient.
 * - Refined glowing crown with sparkling motes.
 */
export function drawCanvasOrganicFishShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  angle: number,
  time: number,
  tier: ShadowTierInfo,
  fadeAlpha: number = 1,
  isBite: boolean = false,
  isRecoil: boolean = false,
) {
  const len = tier.lengthPx;
  const wid = tier.widthPx;
  const beat = time * 0.007 * tier.wiggleSpeed;
  const amplitude = wid * (isBite ? 0.34 : isRecoil ? 0.2 : 0.12);

  // Traveling sinusoidal body wave: head stays relatively steady, tail swings wide
  const spine = (u: number) => Math.sin(beat - u * 3.4) * amplitude * Math.pow(u, 1.5);

  const traceBodyPath = (scale: number, offset: number) => {
    ctx.beginPath();
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i <= 32; i++) {
        const u = side === 0 ? i / 32 : 1 - i / 32;
        const x = (0.46 - u * 0.94) * len;
        // Smooth hydrodynamic body curve
        const radius = wid * 0.5 * Math.sin(Math.PI * Math.pow(u, 0.72)) * (1 - u * 0.55);
        const y = spine(u) + (side === 0 ? -radius : radius) * scale + offset;
        if (side === 0 && i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
  };

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  // 1. Bioluminescent Glow / Mythic Aura (Soft radial falloff gradient)
  if (tier.hasGlow || tier.hasCrown) {
    const glowR = Math.max(len * 0.65, wid * 1.3);
    const glowGrad = ctx.createRadialGradient(0, 0, Math.max(1, wid * 0.2), 0, 0, glowR);
    if (tier.hasCrown) {
      glowGrad.addColorStop(0, `rgba(254, 240, 138, ${0.28 * fadeAlpha})`);
      glowGrad.addColorStop(0.4, `rgba(251, 191, 36, ${0.12 * fadeAlpha})`);
      glowGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');
    } else {
      glowGrad.addColorStop(0, `rgba(56, 189, 248, ${0.26 * fadeAlpha})`);
      glowGrad.addColorStop(0.5, `rgba(14, 165, 233, ${0.1 * fadeAlpha})`);
      glowGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');
    }
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, glowR, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Submerged Water Refraction Rim (soft outer layer)
  ctx.fillStyle = `rgba(6, 40, 56, ${0.18 * fadeAlpha})`;
  traceBodyPath(1.18, 0);
  ctx.fill();

  // 3. Graceful Caudal Tail Fin (Forked Crescent)
  const tailY = spine(1);
  const tailBeat = Math.sin(beat - 3.8) * amplitude * 0.85;
  const tailSpread = wid * 0.52;
  const tailX = -len * 0.48;

  ctx.fillStyle = `rgba(8, 43, 58, ${0.68 * fadeAlpha})`;
  ctx.beginPath();
  ctx.moveTo(tailX, spine(0.95) - wid * 0.08);
  ctx.lineTo(tailX - len * 0.22, tailY + tailBeat - tailSpread);
  ctx.lineTo(tailX - len * 0.17, tailY + tailBeat - tailSpread * 0.35);
  ctx.lineTo(tailX - len * 0.11, tailY + tailBeat);
  ctx.lineTo(tailX - len * 0.17, tailY + tailBeat + tailSpread * 0.35);
  ctx.lineTo(tailX - len * 0.22, tailY + tailBeat + tailSpread);
  ctx.lineTo(tailX, spine(0.95) + wid * 0.08);
  ctx.closePath();
  ctx.fill();

  // 4. Curved Pectoral Fins (flowing backwards with natural flex)
  const finFlutter = Math.sin(beat + 0.8) * wid * 0.05;
  for (const side of [-1, 1]) {
    ctx.fillStyle = `rgba(9, 49, 66, ${0.52 * fadeAlpha})`;
    ctx.beginPath();
    ctx.moveTo(len * 0.16, side * wid * 0.24);
    ctx.lineTo(len * 0.02, side * (wid * 0.58 + finFlutter));
    ctx.lineTo(-len * 0.08, side * (wid * 0.46 + finFlutter * 0.7));
    ctx.lineTo(-len * 0.02, side * wid * 0.22);
    ctx.closePath();
    ctx.fill();
  }

  // 5. Deep Aquatic Silhouette Core
  ctx.fillStyle = `rgba(4, 29, 39, ${0.88 * fadeAlpha})`;
  traceBodyPath(1.0, 0);
  ctx.fill();

  // 6. Dorsal Spine Depth Core
  ctx.fillStyle = `rgba(2, 17, 24, ${0.36 * fadeAlpha})`;
  traceBodyPath(0.42, 0);
  ctx.fill();

  // 7. Subtle Water Surface Sheen (flowing dorsal specular reflection)
  ctx.strokeStyle = `rgba(125, 211, 252, ${0.15 * fadeAlpha})`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = 4; i <= 24; i++) {
    const u = i / 32;
    const x = (0.46 - u * 0.94) * len;
    const y = spine(u) - wid * 0.04;
    if (i === 4) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // 8. Elegant Golden Crown 👑
  if (tier.hasCrown) {
    const crownX = len * 0.28;
    const crownY = spine(0.1) - Math.max(16, wid * 0.42) - 8 + Math.sin(time * 0.005) * 2.5;
    const size = Math.max(16, Math.min(len * 0.12, 36));

    // Warm golden aura
    const crownAura = ctx.createRadialGradient(
      crownX,
      crownY - size * 0.2,
      2,
      crownX,
      crownY - size * 0.2,
      size * 1.1,
    );
    crownAura.addColorStop(0, `rgba(254, 240, 138, ${0.45 * fadeAlpha})`);
    crownAura.addColorStop(0.5, `rgba(245, 158, 11, ${0.15 * fadeAlpha})`);
    crownAura.addColorStop(1, 'rgba(245, 158, 11, 0)');
    ctx.fillStyle = crownAura;
    ctx.beginPath();
    ctx.arc(crownX, crownY - size * 0.2, size * 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Crown Base & Peaks
    ctx.fillStyle = `rgba(245, 158, 11, ${0.96 * fadeAlpha})`;
    ctx.strokeStyle = `rgba(120, 53, 15, ${0.9 * fadeAlpha})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(crownX - size * 0.5, crownY);
    ctx.lineTo(crownX - size * 0.55, crownY - size * 0.55);
    ctx.lineTo(crownX - size * 0.18, crownY - size * 0.28);
    ctx.lineTo(crownX, crownY - size * 0.75);
    ctx.lineTo(crownX + size * 0.18, crownY - size * 0.28);
    ctx.lineTo(crownX + size * 0.55, crownY - size * 0.55);
    ctx.lineTo(crownX + size * 0.5, crownY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Golden Highlights on Peaks
    ctx.fillStyle = `rgba(254, 240, 138, ${0.95 * fadeAlpha})`;
    ctx.beginPath();
    ctx.arc(crownX - size * 0.55, crownY - size * 0.55, Math.max(1, size * 0.08), 0, Math.PI * 2);
    ctx.arc(crownX, crownY - size * 0.75, Math.max(1.2, size * 0.1), 0, Math.PI * 2);
    ctx.arc(crownX + size * 0.55, crownY - size * 0.55, Math.max(1, size * 0.08), 0, Math.PI * 2);
    ctx.fill();

    // Ruby Center Jewel
    ctx.fillStyle = `rgba(239, 68, 68, ${0.95 * fadeAlpha})`;
    ctx.beginPath();
    ctx.arc(crownX, crownY - size * 0.22, Math.max(1.5, size * 0.12), 0, Math.PI * 2);
    ctx.fill();

    // Subtle Twinkle Sparkles
    const tw = Math.sin(time * 0.008) * 0.5 + 0.5;
    if (tw > 0.2) {
      ctx.fillStyle = `rgba(255, 255, 255, ${tw * 0.8 * fadeAlpha})`;
      const spX = crownX + size * 0.7;
      const spY = crownY - size * 0.7;
      ctx.beginPath();
      ctx.moveTo(spX, spY - 3);
      ctx.lineTo(spX + 1, spY);
      ctx.lineTo(spX + 4, spY);
      ctx.lineTo(spX + 1, spY + 1);
      ctx.lineTo(spX, spY + 4);
      ctx.lineTo(spX - 1, spY + 1);
      ctx.lineTo(spX - 4, spY);
      ctx.lineTo(spX - 1, spY);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.restore();
}
