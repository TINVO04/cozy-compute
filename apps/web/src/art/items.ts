import { INK, PixelGrid } from './pixel';
import { drawFurniture } from './furniture';
export { drawFurniture } from './furniture';

import { chibiItemIcon } from './chibi';
import { boatIcon } from './boat';
import { vehicleCanvas } from './vehicle';
export { boatIcon } from './boat';

/** Icon for any catalogue item, using HD Chibi mannequins for clothing, physical materials for furniture, and boat models. */
export function itemIcon(
  sprite: string,
  type: 'clothing' | 'furniture' | 'rod' | 'boat' | 'vehicle',
  size = { w: 1, h: 1 },
  scale = 3,
): string {
  const key = `${sprite}|${type}|${size.w}x${size.h}|${scale}`;
  const hit = iconCache.get(key);
  if (hit) return hit;
  if (type === 'vehicle') {
    const url = vehicleCanvas(sprite).toDataURL();
    iconCache.set(key, url);
    return url;
  }

  if (type === 'boat') {
    const url = boatIcon(sprite, 2);
    iconCache.set(key, url);
    return url;
  }

  if (type === 'rod') {
    const url = rodIcon(sprite, 64);
    iconCache.set(key, url);
    return url;
  }

  if (type === 'clothing') {
    const [kind] = sprite.split(':');
    const hatKinds = [
      'beanie',
      'cap',
      'chef',
      'cone',
      'crown',
      'cat_ears',
      'straw_summer',
      'witch_cosmic',
      'beret_artist',
      'halo_angel',
    ];
    const faceKinds = ['glasses', 'shades', 'mustache', 'blush_anime', 'bandage', 'eyepatch', 'mask_kawaii'];
    const slot: 'hat' | 'face' | 'top' = hatKinds.includes(kind!)
      ? 'hat'
      : faceKinds.includes(kind!)
        ? 'face'
        : 'top';
    const url = chibiItemIcon(sprite, slot, 64);
    iconCache.set(key, url);
    return url;
  }

  const canvas = drawFurniture(sprite, size).toCanvas(
    size.w > 1 || size.h > 1 ? Math.max(1, scale - 1) : scale,
  );
  const url = canvas.toDataURL();
  iconCache.set(key, url);
  return url;
}
const iconCache = new Map<string, string>();

/** Adorable plump yellow rubber duck with wing shine, orange bill and glistening eye */
export function duckGrid(): PixelGrid {
  const g = new PixelGrid(14, 13);
  const y = '#f5c542';
  const yL = '#ffeaa7';
  const yD = '#d49a24';

  // Body
  g.rect(2, 6, 10, 6, y);
  g.rect(3, 6, 8, 2, yL); // top shine
  g.rect(2, 11, 10, 1, yD); // bottom shadow
  // Wing tuft
  g.rect(3, 8, 5, 3, yD);
  g.rect(4, 8, 3, 2, y);

  // Head
  g.rect(6, 1, 6, 6, y);
  g.rect(7, 1, 4, 1, yL);
  g.set(9, 2, INK); // eye
  g.set(9, 2, '#ffffff'); // eye catchlight twinkle
  g.set(10, 3, INK);

  // Beak with smile curve
  g.rect(12, 3, 2, 3, '#e67e22');
  g.set(13, 4, '#d35400');

  // Tail perk
  g.rect(0, 5, 3, 3, y);
  g.set(0, 4, yL);

  g.outline(INK);
  return g;
}

export { drawFish, fishIcon } from './fish';

/**
 * 2026 Pixel Art Coffee Cup for Bean There Cafe activity.
 * Renders an artisan ceramic mug with steamy aroma curls and ingredients.
 */
export function drawCoffeeCup(sequence: string[] = []): PixelGrid {
  const g = new PixelGrid(20, 20);

  // Ceramic mug body
  g.rect(4, 7, 12, 11, '#f1f5f9');
  g.rect(4, 7, 12, 1, '#ffffff'); // rim
  g.rect(4, 17, 12, 1, '#cbd5e1'); // base
  // Ceramic mug handle
  g.rect(16, 9, 3, 6, '#f1f5f9');
  g.rect(17, 10, 1, 4, '#ffffff');

  // Coffee beverage surface
  const hasMilk = sequence.includes('milk') || sequence.includes('oat') || sequence.includes('foam');
  const brewCol = hasMilk ? '#b48356' : '#45220c';
  g.rect(5, 8, 10, 4, brewCol);

  // Latte art foam heart
  if (hasMilk) {
    g.rect(8, 8, 4, 2, '#fffbeb');
    g.set(7, 8, '#fffbeb');
    g.set(12, 8, '#fffbeb');
    g.set(9, 10, '#fffbeb');
    g.set(10, 10, '#fffbeb');
  }

  // Caramel drizzle
  if (sequence.includes('caramel')) {
    g.set(7, 9, '#d97706');
    g.set(9, 9, '#d97706');
    g.set(11, 9, '#d97706');
  }

  // Cinnamon dust specks
  if (sequence.includes('cinnamon')) {
    g.set(8, 8, '#78350f');
    g.set(11, 8, '#78350f');
  }

  // Ice cube
  if (sequence.includes('ice')) {
    g.rect(6, 7, 3, 3, '#bae6fd');
    g.set(7, 7, '#ffffff');
  }

  // Rising aromatic steam curls
  g.set(8, 4, 'rgba(255, 255, 255, 0.7)');
  g.set(9, 3, 'rgba(255, 255, 255, 0.7)');
  g.set(8, 2, 'rgba(255, 255, 255, 0.45)');
  g.set(12, 5, 'rgba(255, 255, 255, 0.7)');
  g.set(13, 4, 'rgba(255, 255, 255, 0.7)');

  g.outline(INK);
  return g;
}

const coffeeCache = new Map<string, string>();
export function coffeeIcon(sequence: string[] = [], scale = 4): string {
  const key = sequence.join(',') + '@' + scale;
  const hit = coffeeCache.get(key);
  if (hit) return hit;
  const url = drawCoffeeCup(sequence).toCanvas(scale).toDataURL();
  coffeeCache.set(key, url);
  return url;
}

/**
 * 2026 Masterpiece Fishing Rod Pixel Art:
 * Diagonal 45-degree rods with detailed grip, reel, line guides, flex taper, and suspended bobber.
 */
export function drawFishingRod(sprite: string): PixelGrid {
  const [, subtype = 'twig'] = sprite.split(':');
  const g = new PixelGrid(28, 28);

  // Rod blank (Thân cần câu chéo từ góc dưới trái (4, 23) vút lên góc trên phải (23, 4))
  const drawBlank = (col: string, lCol: string, dCol: string) => {
    // Butt and handle
    g.rect(4, 22, 3, 3, dCol);
    g.rect(5, 21, 3, 3, col);
    g.rect(6, 20, 3, 3, lCol);

    // Main rod taper segments
    const pts = [
      [7, 19],
      [8, 18],
      [9, 17],
      [10, 16],
      [11, 15],
      [12, 14],
      [13, 13],
      [14, 12],
      [15, 11],
      [16, 10],
      [17, 9],
      [18, 8],
      [19, 7],
      [20, 6],
      [21, 5],
      [22, 4],
    ];

    pts.forEach(([x, y], idx) => {
      // Taper: thicker at bottom, thinner at tip
      if (idx < 6) {
        g.set(x!, y!, col);
        g.set(x! + 1, y!, lCol);
        g.set(x!, y! + 1, dCol);
      } else if (idx < 12) {
        g.set(x!, y!, col);
        g.set(x! + 1, y!, lCol);
      } else {
        g.set(x!, y!, lCol);
      }
    });

    // Tip guide
    g.set(23, 3, '#f8fafc');
  };

  switch (subtype) {
    case 'twig': {
      // Natural twisted branch with leafy shoot
      drawBlank('#8b5a2b', '#a3713f', '#5c3919');
      // Knots on branch
      g.set(11, 14, '#5c3919');
      g.set(16, 9, '#5c3919');
      // Small fresh green leaf sprouting
      g.set(15, 8, '#65a30d');
      g.set(14, 7, '#84cc16');
      // Simple twine string tied to handle
      g.rect(6, 21, 2, 2, '#d4a373');
      // Dangling fishing line and cork bobber
      g.set(23, 4, '#e2e8f0');
      g.set(23, 6, '#e2e8f0');
      g.set(22, 8, '#e2e8f0');
      g.set(22, 10, '#e2e8f0');
      // Tiny bobber
      g.rect(21, 11, 3, 2, '#ef4444');
      g.rect(21, 13, 3, 1, '#ffffff');
      break;
    }

    case 'wooden': {
      // Varnished pine wood rod with brass accents
      drawBlank('#b47547', '#d99b6c', '#784620');
      // Turned wood grip with leather wrap
      g.rect(4, 21, 3, 4, '#45220c');
      g.set(5, 22, '#6b3713');
      g.set(6, 23, '#6b3713');
      // Golden brass reel seat
      g.rect(8, 18, 3, 3, '#f59e0b');
      g.set(9, 19, '#fef08a');
      g.rect(7, 20, 2, 2, '#78350f'); // reel spool
      // Line guides (Khoen kim loại)
      g.set(12, 13, '#94a3b8');
      g.set(16, 9, '#94a3b8');
      g.set(20, 5, '#94a3b8');
      // Dangling line and painted wooden bobber
      g.set(23, 4, '#f8fafc');
      g.set(23, 7, '#f8fafc');
      g.set(22, 10, '#f8fafc');
      g.rect(21, 11, 3, 2, '#dc2626');
      g.rect(21, 13, 3, 2, '#f8fafc');
      break;
    }

    case 'fiberglass': {
      // Vivid cyan flexible fiberglass with neoprene handle
      drawBlank('#06b6d4', '#67e8f9', '#0e7490');
      // Black EVA foam grip
      g.rect(4, 21, 3, 4, '#1e293b');
      g.set(5, 22, '#334155');
      // Modern spinning reel
      g.rect(8, 17, 4, 3, '#38bdf8');
      g.rect(7, 19, 3, 3, '#0284c7');
      g.set(8, 20, '#bae6fd');
      // Ceramic guide rings
      g.set(12, 13, '#0284c7');
      g.set(16, 9, '#0284c7');
      g.set(20, 5, '#0284c7');
      // Fluorescent high-vis line
      g.set(23, 4, '#a7f3d0');
      g.set(23, 7, '#a7f3d0');
      g.set(22, 10, '#a7f3d0');
      g.rect(21, 11, 3, 2, '#f97316');
      g.rect(21, 13, 3, 2, '#38bdf8');
      break;
    }

    case 'pro_carbon': {
      // High-modulus carbon fiber with matte black & diamond weave
      drawBlank('#334155', '#64748b', '#0f172a');
      // Carbon weave cross pattern
      g.set(9, 17, '#94a3b8');
      g.set(13, 13, '#94a3b8');
      g.set(17, 9, '#94a3b8');
      // Split grip carbon handle
      g.rect(4, 21, 3, 4, '#020617');
      g.set(4, 21, '#475569');
      // Metallic titanium reel with purple anodized spool
      g.rect(8, 17, 4, 4, '#6366f1');
      g.set(9, 18, '#c7d2fe');
      g.rect(7, 19, 3, 3, '#1e1b4b');
      // Titanium micro-guides
      g.set(12, 13, '#818cf8');
      g.set(16, 9, '#818cf8');
      g.set(20, 5, '#818cf8');
      // Braided high-spec line
      g.set(23, 4, '#e0e7ff');
      g.set(23, 7, '#e0e7ff');
      g.set(22, 10, '#e0e7ff');
      g.rect(21, 11, 3, 2, '#ec4899');
      g.rect(21, 13, 3, 2, '#f43f5e');
      break;
    }

    case 'golden': {
      // 24K Royal Gold blank with radiant luster & ruby inlay
      drawBlank('#f59e0b', '#fef08a', '#b45309');
      // Pure gold ornamental grip
      g.rect(4, 21, 3, 4, '#b45309');
      g.rect(5, 21, 2, 3, '#fbbf24');
      g.set(5, 22, '#fef08a');
      // Royal Dragon reel with ruby core
      g.rect(8, 17, 4, 4, '#f59e0b');
      g.set(9, 18, '#fef08a');
      g.rect(7, 19, 3, 3, '#b45309');
      g.set(8, 20, '#ef4444'); // ruby gem
      // Golden dragon scale guides
      g.set(12, 13, '#fbbf24');
      g.set(16, 9, '#fbbf24');
      g.set(20, 5, '#fbbf24');
      // Golden shimmering silk line
      g.set(23, 4, '#fef08a');
      g.set(23, 7, '#fef08a');
      g.set(22, 10, '#fef08a');
      // Royal Crown bobber
      g.rect(20, 10, 4, 2, '#fbbf24');
      g.set(21, 10, '#ef4444');
      g.set(22, 10, '#fef08a');
      g.rect(21, 12, 3, 2, '#ffffff');
      // Golden aura sparkle stars
      g.set(25, 2, '#fef08a');
      g.set(26, 3, '#ffffff');
      g.set(18, 2, '#fef08a');
      g.set(14, 6, '#fef08a');
      break;
    }

    case 'abyssal': {
      // Eldritch abyssal bone with glowing violet luminescent runes
      drawBlank('#7c3aed', '#c084fc', '#4c1d95');
      // Bone grip wrapped in abyssal leather
      g.rect(4, 21, 3, 4, '#2e1065');
      g.set(5, 22, '#a855f7');
      // Abyssal Eye reel (Con mắt hư không)
      g.rect(8, 17, 4, 4, '#6b21a8');
      g.set(9, 18, '#e879f9');
      g.rect(7, 19, 3, 3, '#3b0764');
      g.set(8, 20, '#22d3ee'); // glowing cyan eldritch eye pupil
      // Void thorn guides
      g.set(12, 13, '#c084fc');
      g.set(16, 9, '#c084fc');
      g.set(20, 5, '#c084fc');
      // Tendril void line
      g.set(23, 4, '#f0abfc');
      g.set(23, 7, '#f0abfc');
      g.set(22, 10, '#f0abfc');
      // Abyssal skull/pearl bobber
      g.rect(21, 10, 3, 3, '#67e8f9');
      g.set(22, 11, '#0891b2');
      g.rect(21, 13, 3, 1, '#c084fc');
      // Violet magic sparkles
      g.set(25, 2, '#e879f9');
      g.set(24, 1, '#ffffff');
      g.set(19, 3, '#a855f7');
      g.set(10, 11, '#c084fc');
      break;
    }
  }

  g.outline(INK);
  return g;
}

const rodCache = new Map<string, string>();
export function rodIcon(spriteOrId: string, scale = 4): string {
  const key = spriteOrId + '@' + scale;
  const hit = rodCache.get(key);
  if (hit) return hit;
  // If sprite is a full key like 'rod:twig:#8b5a2b', use directly; otherwise construct
  const sprite = spriteOrId.startsWith('rod:')
    ? spriteOrId
    : spriteOrId === 'rod_wooden'
      ? 'rod:wooden:#b47547'
      : spriteOrId === 'rod_fiberglass'
        ? 'rod:fiberglass:#06b6d4'
        : spriteOrId === 'rod_pro_carbon'
          ? 'rod:carbon:#334155'
          : spriteOrId === 'rod_golden_legend'
            ? 'rod:golden:#f59e0b'
            : spriteOrId === 'rod_abyssal'
              ? 'rod:abyssal:#8b5cf6'
              : 'rod:twig:#8b5a2b';
  const url = drawFishingRod(sprite).toCanvas(scale).toDataURL();
  rodCache.set(key, url);
  return url;
}
