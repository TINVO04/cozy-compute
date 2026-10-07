// ============================================================================
// File: apps/web/src/art/farm-animals.ts
// Hand-crafted pixel art spritesheets for Farm Livestock:
// Pig (Heo Mọi), Goat (Dê Núi), Sheep (Cừu), Duck (Vịt Xiêm),
// plus robust procedural fallbacks for Chicken and Cow.
// ============================================================================

function px(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/**
 * 1. Duck Spritesheet (16x16 frames, 4 frames wide: 64x16)
 * Frames 0-1: Idle (bobbing head & tail wag)
 * Frames 2-3: Waddling Walk
 */
export function paintDuckSpritesheet(): HTMLCanvasElement {
  const fw = 16;
  const fh = 16;
  const c = document.createElement('canvas');
  c.width = fw * 4;
  c.height = fh;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  for (let f = 0; f < 4; f++) {
    const ox = f * fw;
    const isWalk = f >= 2;
    const step = f % 2;
    const bob = isWalk ? (step === 0 ? 0 : -1) : step === 1 ? -1 : 0;

    // Soft drop shadow
    px(ctx, 'rgba(0,0,0,0.18)', ox + 4, 14, 8, 2);

    // Orange webbed feet
    if (isWalk) {
      if (step === 0) {
        px(ctx, '#ea580c', ox + 5, 13, 3, 2);
        px(ctx, '#ea580c', ox + 9, 12, 2, 2);
      } else {
        px(ctx, '#ea580c', ox + 5, 12, 2, 2);
        px(ctx, '#ea580c', ox + 8, 13, 3, 2);
      }
    } else {
      px(ctx, '#ea580c', ox + 5, 13, 3, 2);
      px(ctx, '#ea580c', ox + 9, 13, 3, 2);
    }

    // Body (plumage)
    px(ctx, '#cbd5e1', ox + 4, 7 + bob, 8, 6);
    px(ctx, '#f8fafc', ox + 4, 6 + bob, 7, 6);
    px(ctx, '#ffffff', ox + 5, 7 + bob, 5, 4);

    // Wing feather fold
    px(ctx, '#94a3b8', ox + 4, 8 + bob, 4, 3);
    px(ctx, '#e2e8f0', ox + 5, 8 + bob, 3, 2);

    // Little tail tip
    px(ctx, '#cbd5e1', ox + 2, 6 + bob, 2, 2);
    px(ctx, '#f8fafc', ox + 2, 5 + bob, 2, 2);

    // Head and neck
    px(ctx, '#f8fafc', ox + 9, 3 + bob, 5, 5);
    px(ctx, '#ffffff', ox + 10, 3 + bob, 3, 4);

    // Cute dark eye
    px(ctx, '#0f172a', ox + 12, 4 + bob, 1, 2);
    px(ctx, '#ffffff', ox + 12, 4 + bob, 1, 1);

    // Orange beak
    px(ctx, '#f97316', ox + 14, 5 + bob, 2, 2);
    px(ctx, '#ea580c', ox + 14, 6 + bob, 2, 1);
  }

  return c;
}

/**
 * 2. Pig Spritesheet (Heo Mọi Sọc Dưa/Đốm) (24x20 frames, 4 frames wide: 96x20)
 * Frames 0-1: Idle (snout sniff & tail curl wag)
 * Frames 2-3: Trot Walk
 */
export function paintPigSpritesheet(): HTMLCanvasElement {
  const fw = 24;
  const fh = 20;
  const c = document.createElement('canvas');
  c.width = fw * 4;
  c.height = fh;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  for (let f = 0; f < 4; f++) {
    const ox = f * fw;
    const isWalk = f >= 2;
    const step = f % 2;
    const bob = isWalk ? (step === 0 ? 0 : -1) : 0;

    // Drop shadow
    px(ctx, 'rgba(0,0,0,0.22)', ox + 4, 17, 16, 3);

    // Trotter legs
    const legY = 14 + bob;
    if (isWalk) {
      if (step === 0) {
        px(ctx, '#d9778f', ox + 6, legY, 3, 4);
        px(ctx, '#be185d', ox + 6, legY + 3, 3, 1);
        px(ctx, '#d9778f', ox + 15, legY - 1, 3, 3);
        px(ctx, '#be185d', ox + 15, legY + 1, 3, 1);
      } else {
        px(ctx, '#d9778f', ox + 7, legY - 1, 3, 3);
        px(ctx, '#be185d', ox + 7, legY + 1, 3, 1);
        px(ctx, '#d9778f', ox + 14, legY, 3, 4);
        px(ctx, '#be185d', ox + 14, legY + 3, 3, 1);
      }
    } else {
      px(ctx, '#d9778f', ox + 6, legY, 3, 4);
      px(ctx, '#be185d', ox + 6, legY + 3, 3, 1);
      px(ctx, '#d9778f', ox + 15, legY, 3, 4);
      px(ctx, '#be185d', ox + 15, legY + 3, 3, 1);
    }

    // Chubby Pig Body
    px(ctx, '#e08298', ox + 4, 6 + bob, 14, 9);
    px(ctx, '#f4a7b9', ox + 5, 5 + bob, 12, 10);
    px(ctx, '#fbcfe8', ox + 6, 6 + bob, 9, 7);

    // Rustic dark mud/spots (Heo mọi đốm Nam Bộ)
    px(ctx, '#654321', ox + 8, 5 + bob, 4, 3);
    px(ctx, '#78350f', ox + 7, 7 + bob, 3, 3);
    px(ctx, '#654321', ox + 13, 8 + bob, 3, 3);

    // Curly tail
    const tailWag = f === 1 ? -1 : 0;
    px(ctx, '#e08298', ox + 2, 7 + bob + tailWag, 3, 2);
    px(ctx, '#f4a7b9', ox + 1, 6 + bob + tailWag, 2, 2);

    // Head
    px(ctx, '#e08298', ox + 15, 6 + bob, 6, 8);
    px(ctx, '#f4a7b9', ox + 16, 5 + bob, 6, 8);
    px(ctx, '#fbcfe8', ox + 17, 6 + bob, 4, 5);

    // Floppy Ear
    px(ctx, '#be185d', ox + 15, 3 + bob, 3, 3);
    px(ctx, '#e08298', ox + 16, 4 + bob, 2, 3);

    // Eye
    px(ctx, '#0f172a', ox + 18, 6 + bob, 2, 2);
    px(ctx, '#ffffff', ox + 18, 6 + bob, 1, 1);

    // Cute Snout with Nostrils
    px(ctx, '#fb7185', ox + 20, 8 + bob, 4, 4);
    px(ctx, '#fda4af', ox + 21, 9 + bob, 2, 2);
    px(ctx, '#881337', ox + 22, 9 + bob, 1, 1);
    px(ctx, '#881337', ox + 22, 11 + bob, 1, 1);
  }

  return c;
}

/**
 * 3. Goat Spritesheet (Dê Núi Bách Thảo) (24x24 frames, 4 frames wide: 96x24)
 * Frames 0-1: Idle (chewing cud & ear twitch)
 * Frames 2-3: Walk
 */
export function paintGoatSpritesheet(): HTMLCanvasElement {
  const fw = 24;
  const fh = 24;
  const c = document.createElement('canvas');
  c.width = fw * 4;
  c.height = fh;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  for (let f = 0; f < 4; f++) {
    const ox = f * fw;
    const isWalk = f >= 2;
    const step = f % 2;
    const bob = isWalk ? (step === 0 ? 0 : -1) : 0;

    // Drop shadow
    px(ctx, 'rgba(0,0,0,0.2)', ox + 4, 20, 15, 3);

    // Four slim goat legs & clattering hooves
    const legY = 15 + bob;
    if (isWalk) {
      if (step === 0) {
        px(ctx, '#b45309', ox + 6, legY, 2, 6);
        px(ctx, '#451a03', ox + 6, legY + 5, 2, 1);
        px(ctx, '#d97706', ox + 9, legY - 1, 2, 5);
        px(ctx, '#451a03', ox + 9, legY + 3, 2, 1);
        px(ctx, '#b45309', ox + 14, legY - 1, 2, 5);
        px(ctx, '#451a03', ox + 14, legY + 3, 2, 1);
        px(ctx, '#d97706', ox + 17, legY, 2, 6);
        px(ctx, '#451a03', ox + 17, legY + 5, 2, 1);
      } else {
        px(ctx, '#b45309', ox + 6, legY - 1, 2, 5);
        px(ctx, '#451a03', ox + 6, legY + 3, 2, 1);
        px(ctx, '#d97706', ox + 9, legY, 2, 6);
        px(ctx, '#451a03', ox + 9, legY + 5, 2, 1);
        px(ctx, '#b45309', ox + 14, legY, 2, 6);
        px(ctx, '#451a03', ox + 14, legY + 5, 2, 1);
        px(ctx, '#d97706', ox + 17, legY - 1, 2, 5);
        px(ctx, '#451a03', ox + 17, legY + 3, 2, 1);
      }
    } else {
      px(ctx, '#b45309', ox + 6, legY, 2, 6);
      px(ctx, '#451a03', ox + 6, legY + 5, 2, 1);
      px(ctx, '#d97706', ox + 9, legY, 2, 6);
      px(ctx, '#451a03', ox + 9, legY + 5, 2, 1);
      px(ctx, '#b45309', ox + 14, legY, 2, 6);
      px(ctx, '#451a03', ox + 14, legY + 5, 2, 1);
      px(ctx, '#d97706', ox + 17, legY, 2, 6);
      px(ctx, '#451a03', ox + 17, legY + 5, 2, 1);
    }

    // Body
    px(ctx, '#92400e', ox + 5, 9 + bob, 12, 8);
    px(ctx, '#d97706', ox + 6, 8 + bob, 11, 7);
    px(ctx, '#fef3c7', ox + 7, 10 + bob, 8, 4);

    // Little upturned tail
    px(ctx, '#92400e', ox + 3, 8 + bob, 3, 3);
    px(ctx, '#fef3c7', ox + 3, 7 + bob, 2, 2);

    // Slender neck & head
    px(ctx, '#b45309', ox + 14, 6 + bob, 5, 6);
    px(ctx, '#d97706', ox + 15, 4 + bob, 5, 7);
    px(ctx, '#fef3c7', ox + 16, 5 + bob, 3, 5);

    // Curved Horns
    px(ctx, '#78350f', ox + 14, 1 + bob, 2, 4);
    px(ctx, '#fde047', ox + 15, 2 + bob, 2, 3);

    // Eye
    px(ctx, '#1e293b', ox + 18, 5 + bob, 1, 2);

    // Muzzle & Chewing jaw
    const chew = f === 1 ? 1 : 0;
    px(ctx, '#fef3c7', ox + 19, 7 + bob, 3, 3);
    px(ctx, '#78350f', ox + 20, 8 + bob, 2, 1);

    // Little white goatee beard
    px(ctx, '#fefce8', ox + 18 + chew, 10 + bob, 3, 3);
    px(ctx, '#e2e8f0', ox + 19 + chew, 11 + bob, 2, 2);
  }

  return c;
}

/**
 * 4. Sheep Spritesheet (Cừu Phan Rang) (24x24 frames, 4 frames wide: 96x24)
 * Frames 0-1: Idle (fluffy fleece bobbing)
 * Frames 2-3: Walk
 */
export function paintSheepSpritesheet(): HTMLCanvasElement {
  const fw = 24;
  const fh = 24;
  const c = document.createElement('canvas');
  c.width = fw * 4;
  c.height = fh;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  for (let f = 0; f < 4; f++) {
    const ox = f * fw;
    const isWalk = f >= 2;
    const step = f % 2;
    const bob = isWalk ? (step === 0 ? 0 : -1) : 0;

    // Drop shadow
    px(ctx, 'rgba(0,0,0,0.2)', ox + 3, 20, 17, 3);

    // Dark slender hooves
    const legY = 16 + bob;
    if (isWalk) {
      if (step === 0) {
        px(ctx, '#334155', ox + 6, legY, 2, 5);
        px(ctx, '#0f172a', ox + 6, legY + 4, 2, 1);
        px(ctx, '#334155', ox + 14, legY - 1, 2, 4);
        px(ctx, '#0f172a', ox + 14, legY + 2, 2, 1);
      } else {
        px(ctx, '#334155', ox + 6, legY - 1, 2, 4);
        px(ctx, '#0f172a', ox + 6, legY + 2, 2, 1);
        px(ctx, '#334155', ox + 14, legY, 2, 5);
        px(ctx, '#0f172a', ox + 14, legY + 4, 2, 1);
      }
    } else {
      px(ctx, '#334155', ox + 6, legY, 2, 5);
      px(ctx, '#0f172a', ox + 6, legY + 4, 2, 1);
      px(ctx, '#334155', ox + 14, legY, 2, 5);
      px(ctx, '#0f172a', ox + 14, legY + 4, 2, 1);
    }

    // Puffy cloud wool body
    px(ctx, '#cbd5e1', ox + 4, 8 + bob, 14, 10);
    px(ctx, '#f8fafc', ox + 4, 7 + bob, 13, 10);
    px(ctx, '#ffffff', ox + 5, 8 + bob, 11, 7);

    // Wool fleece cloud bumps
    px(ctx, '#f8fafc', ox + 3, 9 + bob, 2, 4);
    px(ctx, '#f8fafc', ox + 16, 9 + bob, 2, 5);
    px(ctx, '#f8fafc', ox + 7, 5 + bob, 6, 2);

    // Dark grey face & ears
    px(ctx, '#334155', ox + 16, 8 + bob, 6, 6);
    px(ctx, '#475569', ox + 17, 7 + bob, 4, 6);

    // Wool cap on top of head
    px(ctx, '#ffffff', ox + 16, 6 + bob, 4, 2);

    // Floppy dark ear
    px(ctx, '#1e293b', ox + 15, 9 + bob, 2, 3);

    // Shiny eye
    px(ctx, '#0f172a', ox + 19, 9 + bob, 1, 2);
    px(ctx, '#ffffff', ox + 19, 9 + bob, 1, 1);

    // Snout
    px(ctx, '#1e293b', ox + 20, 11 + bob, 2, 2);
  }

  return c;
}

/**
 * 5. Procedural Chicken Spritesheet Fallback (Gà Ri Nam Bộ)
 * 16x16 frames, 4 cols x 2 rows (64x32)
 * Row 0: frames 0-1 (idle), frames 2-3 (peck)
 * Row 1: frames 4-7 (walk)
 */
export function paintChickenSpritesheet(): HTMLCanvasElement {
  const fw = 16;
  const fh = 16;
  const c = document.createElement('canvas');
  c.width = fw * 4;
  c.height = fh * 2;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const ox = col * fw;
      const oy = row * fh;
      const f = row * 4 + col;
      const isPeck = f === 2 || f === 3;
      const isWalk = row === 1;
      const bob = isPeck ? (f === 2 ? 1 : 2) : isWalk ? (col % 2 === 0 ? 0 : -1) : col === 1 ? -1 : 0;

      // Soft shadow
      px(ctx, 'rgba(0,0,0,0.2)', ox + 3, oy + 14, 10, 2);

      // Feet
      px(ctx, '#ea580c', ox + 5, oy + 13, 2, 2);
      px(ctx, '#ea580c', ox + 9, oy + 13, 2, 2);

      // Body (warm golden feathers)
      px(ctx, '#d97706', ox + 4, oy + 6 + bob, 8, 7);
      px(ctx, '#f59e0b', ox + 5, oy + 5 + bob, 7, 7);
      px(ctx, '#fef3c7', ox + 6, oy + 7 + bob, 4, 4);

      // Wing
      px(ctx, '#b45309', ox + 4, oy + 7 + bob, 4, 4);
      px(ctx, '#d97706', ox + 5, oy + 8 + bob, 3, 2);

      // Head & Neck
      const headY = isPeck ? oy + 8 + bob : oy + 3 + bob;
      const headX = isPeck ? ox + 11 : ox + 9;
      px(ctx, '#f59e0b', headX, headY, 5, 5);
      px(ctx, '#fef3c7', headX + 1, headY + 1, 3, 3);

      // Red Comb
      px(ctx, '#dc2626', headX + 1, headY - 2, 3, 2);
      px(ctx, '#ef4444', headX + 2, headY - 1, 2, 1);

      // Eye
      px(ctx, '#0f172a', headX + 3, headY + 2, 1, 1);

      // Orange Beak & Wattle
      px(ctx, '#ea580c', headX + 5, headY + 2, 2, 2);
      px(ctx, '#dc2626', headX + 4, headY + 4, 1, 2);
    }
  }

  return c;
}

/**
 * 6. Procedural Cow Spritesheet Fallback (Bò Sữa Đồng Nai)
 * 32x32 frames, 3 cols x 2 rows (96x64)
 * Row 0: frames 0-2 (idle & chew)
 * Row 1: frames 3-5 (walk)
 */
export function paintCowSpritesheet(): HTMLCanvasElement {
  const fw = 32;
  const fh = 32;
  const c = document.createElement('canvas');
  c.width = fw * 3;
  c.height = fh * 2;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const ox = col * fw;
      const oy = row * fh;
      const isWalk = row === 1;
      const bob = isWalk ? (col % 2 === 0 ? 0 : -1) : col === 1 ? -1 : 0;

      // Shadow
      px(ctx, 'rgba(0,0,0,0.22)', ox + 4, oy + 28, 24, 3);

      // Legs
      const legY = oy + 22 + bob;
      px(ctx, '#475569', ox + 7, legY, 3, 6);
      px(ctx, '#0f172a', ox + 7, legY + 5, 3, 1);
      px(ctx, '#475569', ox + 12, legY, 3, 6);
      px(ctx, '#0f172a', ox + 12, legY + 5, 3, 1);
      px(ctx, '#475569', ox + 18, legY, 3, 6);
      px(ctx, '#0f172a', ox + 18, legY + 5, 3, 1);
      px(ctx, '#475569', ox + 23, legY, 3, 6);
      px(ctx, '#0f172a', ox + 23, legY + 5, 3, 1);

      // Body (White with black patches)
      px(ctx, '#e2e8f0', ox + 5, oy + 11 + bob, 18, 12);
      px(ctx, '#ffffff', ox + 6, oy + 10 + bob, 16, 12);
      // Black Holstein patches
      px(ctx, '#1e293b', ox + 8, oy + 11 + bob, 6, 6);
      px(ctx, '#1e293b', ox + 17, oy + 13 + bob, 5, 5);

      // Head
      px(ctx, '#ffffff', ox + 20, oy + 7 + bob, 9, 10);
      px(ctx, '#1e293b', ox + 21, oy + 7 + bob, 4, 4);

      // Horns & Ears
      px(ctx, '#fde047', ox + 21, oy + 4 + bob, 2, 3);
      px(ctx, '#f8fafc', ox + 19, oy + 8 + bob, 2, 3);

      // Pink muzzle & nostrils
      px(ctx, '#fda4af', ox + 26, oy + 11 + bob, 4, 6);
      px(ctx, '#e11d48', ox + 28, oy + 13 + bob, 1, 1);

      // Eye
      px(ctx, '#0f172a', ox + 24, oy + 9 + bob, 2, 2);
    }
  }

  return c;
}
