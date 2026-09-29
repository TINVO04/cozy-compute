import { HAIR_COLORS, SKIN_TONES, TOP_COLORS, type Appearance } from '@cozy/game-data';

export type Dir = 0 | 1 | 2 | 3; // 0: down, 1: left, 2: right, 3: up

interface LpcImageCache {
  body: HTMLImageElement;
  head: HTMLImageElement;
  pants: HTMLImageElement;
  hairShort: HTMLImageElement;
  hairLong: HTMLImageElement;
  hairSpiky: HTMLImageElement;
  hairBun: HTMLImageElement;
  topTshirt: HTMLImageElement;
  topLongsleeve: HTMLImageElement;
  topVest: HTMLImageElement;
  hatCap: HTMLImageElement;
  hatBandana: HTMLImageElement;
}

let cachedImages: LpcImageCache | null = null;
let preloadPromise: Promise<LpcImageCache> | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const fallback = new Image();
      fallback.src = canvas.toDataURL();
      fallback.onload = () => resolve(fallback);
    };
  });
}

export function preloadLpcAssets(): Promise<LpcImageCache> {
  if (cachedImages) return Promise.resolve(cachedImages);
  if (preloadPromise) return preloadPromise;

  preloadPromise = Promise.all([
    loadImage('/assets/characters/bodies/body_male.png'),
    loadImage('/assets/characters/bodies/head_male.png'),
    loadImage('/assets/characters/bodies/pants.png'),
    loadImage('/assets/characters/hair/hair_short.png'),
    loadImage('/assets/characters/hair/hair_long.png'),
    loadImage('/assets/characters/hair/hair_spiky.png'),
    loadImage('/assets/characters/hair/hair_bun.png'),
    loadImage('/assets/characters/tops/tshirt.png'),
    loadImage('/assets/characters/tops/longsleeve.png'),
    loadImage('/assets/characters/tops/vest.png'),
    loadImage('/assets/characters/hats/cap.png'),
    loadImage('/assets/characters/hats/bandana.png'),
  ]).then(
    ([
      body,
      head,
      pants,
      hairShort,
      hairLong,
      hairSpiky,
      hairBun,
      topTshirt,
      topLongsleeve,
      topVest,
      hatCap,
      hatBandana,
    ]) => {
      cachedImages = {
        body,
        head,
        pants,
        hairShort,
        hairLong,
        hairSpiky,
        hairBun,
        topTshirt,
        topLongsleeve,
        topVest,
        hatCap,
        hatBandana,
      };
      return cachedImages;
    },
  );

  return preloadPromise;
}

if (typeof window !== 'undefined') {
  preloadLpcAssets().catch(() => {});
}

export function hasLpcAssets(): boolean {
  return cachedImages !== null && cachedImages.body.complete && cachedImages.body.naturalWidth > 0;
}

let scratchCanvas: HTMLCanvasElement | null = null;
let scratchCtx: CanvasRenderingContext2D | null = null;

function getScratch(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  if (!scratchCanvas) {
    scratchCanvas = document.createElement('canvas');
    scratchCanvas.width = 64;
    scratchCanvas.height = 64;
    scratchCtx = scratchCanvas.getContext('2d')!;
    scratchCtx.imageSmoothingEnabled = false;
  }
  return { canvas: scratchCanvas, ctx: scratchCtx! };
}

function drawTintedPart(
  targetCtx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  sx: number,
  sy: number,
  dx: number,
  dy: number,
  destW: number,
  destH: number,
  tintColor?: string,
  tintAlpha = 0.5,
) {
  if (!img.complete || img.naturalWidth === 0) return;

  if (!tintColor) {
    targetCtx.drawImage(img, sx, sy, 64, 64, dx, dy, destW, destH);
    return;
  }

  const { canvas, ctx } = getScratch();
  ctx.clearRect(0, 0, 64, 64);
  ctx.drawImage(img, sx, sy, 64, 64, 0, 0, 64, 64);

  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = tintColor;
  ctx.globalAlpha = tintAlpha;
  ctx.fillRect(0, 0, 64, 64);

  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';

  targetCtx.drawImage(canvas, 0, 0, 64, 64, dx, dy, destW, destH);
}

const parseSprite = (sprite?: string | null) => {
  if (!sprite) return null;
  const [kind, color] = sprite.split(':');
  return { kind: kind!, color: color ?? '#888888' };
};

export function drawLpcAvatar(
  targetCtx: CanvasRenderingContext2D,
  a: Appearance,
  options: {
    cx: number;
    cy: number;
    dir: Dir; // 0: down, 1: left, 2: right, 3: up
    frame: 0 | 1 | 2; // 0: idle, 1: step1, 2: step2
    scale?: number;
  },
): void {
  if (!cachedImages) return;

  const scale = options.scale ?? 1;
  const rowMap: Record<Dir, number> = { 0: 2, 1: 1, 2: 3, 3: 0 };
  const row = rowMap[options.dir] ?? 2;
  const col = options.frame === 0 ? 0 : options.frame === 1 ? 1 : 3;

  const sx = col * 64;
  const sy = row * 64;
  const destW = 64 * scale;
  const destH = 64 * scale;
  const dx = Math.round(options.cx - destW / 2);
  const dy = Math.round(options.cy - destH / 2);

  const skinColor = SKIN_TONES[a.skin] ?? SKIN_TONES[1] ?? '#e8b98f';
  const hairColor = HAIR_COLORS[a.hairColor] ?? HAIR_COLORS[1] ?? '#6a3f24';
  const topItem = parseSprite(a.top);
  const topColor = topItem?.color ?? TOP_COLORS[a.baseTop] ?? TOP_COLORS[0] ?? '#5b57a6';
  const hatItem = parseSprite(a.hat);
  const faceItem = parseSprite(a.face);

  // 0. Equipped Fishing Rod (Behind player when facing down, left, right, or slung on back when facing up)
  if (a.rod && !a.heldFish && !a.isFishing) {
    const rodColor = a.rod.includes('golden')
      ? '#f59e0b'
      : a.rod.includes('abyssal')
        ? '#7c3aed'
        : a.rod.includes('pro')
          ? '#1e293b'
          : '#854d0e';
    targetCtx.save();
    targetCtx.strokeStyle = rodColor;
    targetCtx.lineWidth = Math.max(1, Math.round(1.5 * scale));
    if (options.dir === 3) {
      // Facing up / back: slung diagonally across the back
      targetCtx.beginPath();
      targetCtx.moveTo(dx + 22 * scale, dy + 42 * scale);
      targetCtx.lineTo(dx + 44 * scale, dy + 10 * scale);
      targetCtx.stroke();
    } else if (options.dir === 1) {
      // Facing left: rod sticks up behind back (right side)
      targetCtx.beginPath();
      targetCtx.moveTo(dx + 36 * scale, dy + 40 * scale);
      targetCtx.lineTo(dx + 44 * scale, dy + 12 * scale);
      targetCtx.stroke();
    } else if (options.dir === 2) {
      // Facing right: rod sticks up behind back (left side)
      targetCtx.beginPath();
      targetCtx.moveTo(dx + 28 * scale, dy + 40 * scale);
      targetCtx.lineTo(dx + 20 * scale, dy + 12 * scale);
      targetCtx.stroke();
    } else {
      // Facing down / front: rod tip peeks over shoulder
      targetCtx.beginPath();
      targetCtx.moveTo(dx + 38 * scale, dy + 28 * scale);
      targetCtx.lineTo(dx + 44 * scale, dy + 12 * scale);
      targetCtx.stroke();
    }
    targetCtx.restore();
  }

  // 1. Base Body (Skin)
  drawTintedPart(targetCtx, cachedImages.body, sx, sy, dx, dy, destW, destH, skinColor, 0.45);

  // 2. Head (Skin + eyes)
  drawTintedPart(targetCtx, cachedImages.head, sx, sy, dx, dy, destW, destH, skinColor, 0.45);

  // 3. Pants
  drawTintedPart(targetCtx, cachedImages.pants, sx, sy, dx, dy, destW, destH, '#334155', 0.35);

  // 4. Top
  if (topItem && (topItem.kind.includes('jacket') || topItem.kind.includes('vest'))) {
    drawTintedPart(targetCtx, cachedImages.topVest, sx, sy, dx, dy, destW, destH, topColor, 0.65);
  } else if (topItem && topItem.kind.includes('hoodie')) {
    drawTintedPart(targetCtx, cachedImages.topLongsleeve, sx, sy, dx, dy, destW, destH, topColor, 0.65);
    drawTintedPart(targetCtx, cachedImages.topTshirt, sx, sy, dx, dy, destW, destH, topColor, 0.65);
  } else {
    drawTintedPart(targetCtx, cachedImages.topTshirt, sx, sy, dx, dy, destW, destH, topColor, 0.65);
  }

  // 5. Hair
  if (a.hairStyle !== 'bald') {
    let hairImg = cachedImages.hairShort;
    if (a.hairStyle === 'long') hairImg = cachedImages.hairLong;
    else if (a.hairStyle === 'spiky') hairImg = cachedImages.hairSpiky;
    else if (a.hairStyle === 'bun') hairImg = cachedImages.hairBun;

    drawTintedPart(targetCtx, hairImg, sx, sy, dx, dy, destW, destH, hairColor, 0.62);
  }

  // 6. Face Accessories (Glasses, Shades, Mustache)
  if (faceItem && options.dir !== 3) {
    targetCtx.save();
    const faceCol = faceItem.color ?? '#222222';
    if (faceItem.kind === 'glasses') {
      targetCtx.strokeStyle = faceCol;
      targetCtx.lineWidth = 1;
      if (options.dir === 0) {
        targetCtx.strokeRect(dx + 27 * scale, dy + 25 * scale, 4 * scale, 3 * scale);
        targetCtx.strokeRect(dx + 33 * scale, dy + 25 * scale, 4 * scale, 3 * scale);
        targetCtx.beginPath();
        targetCtx.moveTo(dx + 31 * scale, dy + 26 * scale);
        targetCtx.lineTo(dx + 33 * scale, dy + 26 * scale);
        targetCtx.stroke();
      } else if (options.dir === 1) {
        targetCtx.strokeRect(dx + 26 * scale, dy + 25 * scale, 5 * scale, 3 * scale);
      } else {
        targetCtx.strokeRect(dx + 33 * scale, dy + 25 * scale, 5 * scale, 3 * scale);
      }
    } else if (faceItem.kind === 'shades') {
      targetCtx.fillStyle = faceCol;
      if (options.dir === 0) {
        targetCtx.fillRect(dx + 26 * scale, dy + 25 * scale, 5 * scale, 3 * scale);
        targetCtx.fillRect(dx + 33 * scale, dy + 25 * scale, 5 * scale, 3 * scale);
        targetCtx.fillRect(dx + 31 * scale, dy + 25 * scale, 2 * scale, 1 * scale);
      } else if (options.dir === 1) {
        targetCtx.fillRect(dx + 25 * scale, dy + 25 * scale, 7 * scale, 3 * scale);
      } else {
        targetCtx.fillRect(dx + 32 * scale, dy + 25 * scale, 7 * scale, 3 * scale);
      }
    } else if (faceItem.kind === 'mustache') {
      targetCtx.fillStyle = faceCol;
      if (options.dir === 0) {
        targetCtx.fillRect(dx + 28 * scale, dy + 31 * scale, 8 * scale, 2 * scale);
      } else if (options.dir === 1) {
        targetCtx.fillRect(dx + 27 * scale, dy + 31 * scale, 5 * scale, 2 * scale);
      } else {
        targetCtx.fillRect(dx + 32 * scale, dy + 31 * scale, 5 * scale, 2 * scale);
      }
    }
    targetCtx.restore();
  }

  // 7. Hat
  if (hatItem) {
    const hatColor = hatItem.color;
    if (hatItem.kind === 'crown') {
      targetCtx.save();
      targetCtx.fillStyle = '#f5c542';
      const crownX = dx + (options.dir === 1 ? 26 : options.dir === 2 ? 30 : 27) * scale;
      const crownY = dy + 14 * scale;
      targetCtx.fillRect(crownX, crownY, 10 * scale, 4 * scale);
      targetCtx.fillRect(crownX, crownY - 3 * scale, 2 * scale, 3 * scale);
      targetCtx.fillRect(crownX + 4 * scale, crownY - 4 * scale, 2 * scale, 4 * scale);
      targetCtx.fillRect(crownX + 8 * scale, crownY - 3 * scale, 2 * scale, 3 * scale);
      targetCtx.fillStyle = '#ef4444';
      targetCtx.fillRect(crownX + 4 * scale, crownY + 1 * scale, 2 * scale, 2 * scale);
      targetCtx.restore();
    } else if (hatItem.kind === 'cone') {
      targetCtx.save();
      targetCtx.fillStyle = '#ea580c';
      const cxCone = dx + (options.dir === 1 ? 29 : options.dir === 2 ? 35 : 32) * scale;
      const cyCone = dy + 17 * scale;
      targetCtx.beginPath();
      targetCtx.moveTo(cxCone, cyCone - 10 * scale);
      targetCtx.lineTo(cxCone + 6 * scale, cyCone);
      targetCtx.lineTo(cxCone - 6 * scale, cyCone);
      targetCtx.closePath();
      targetCtx.fill();
      targetCtx.fillStyle = '#ffffff';
      targetCtx.fillRect(cxCone - 4 * scale, cyCone - 4 * scale, 8 * scale, 2 * scale);
      targetCtx.restore();
    } else if (hatItem.kind === 'chef') {
      targetCtx.save();
      targetCtx.fillStyle = '#f8fafc';
      const chefX = dx + (options.dir === 1 ? 25 : options.dir === 2 ? 29 : 27) * scale;
      const chefY = dy + 10 * scale;
      targetCtx.fillRect(chefX, chefY + 4 * scale, 10 * scale, 4 * scale);
      targetCtx.beginPath();
      targetCtx.arc(chefX + 5 * scale, chefY + 2 * scale, 6 * scale, 0, Math.PI * 2);
      targetCtx.fill();
      targetCtx.restore();
    } else if (hatItem.kind.includes('cap') || hatItem.kind.includes('beret')) {
      drawTintedPart(targetCtx, cachedImages.hatCap, sx, sy, dx, dy, destW, destH, hatColor, 0.6);
    } else {
      drawTintedPart(targetCtx, cachedImages.hatBandana, sx, sy, dx, dy, destW, destH, hatColor, 0.6);
    }
  }
}

export function createLpcAvatarSheet(a: Appearance, fw = 32, fh = 56): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = fw * 3;
  canvas.height = fh * 4;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  for (let d = 0 as Dir; d < 4; d = (d + 1) as Dir) {
    for (let f = 0; f < 3; f++) {
      const cx = f * fw + fw / 2;
      const cy = d * fh + 25;
      drawLpcAvatar(ctx, a, {
        cx,
        cy,
        dir: d,
        frame: f as 0 | 1 | 2,
        scale: 0.9,
      });
    }
  }

  return canvas;
}

export function createLpcPortrait(a: Appearance, size = 64): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const scale = size / 36;
  drawLpcAvatar(ctx, a, {
    cx: size / 2,
    cy: size / 2 + 14 * (size / 64),
    dir: 0,
    frame: 0,
    scale,
  });

  return canvas.toDataURL();
}
