import {
  APARTMENT_COLS,
  APARTMENT_ROWS,
  APARTMENT_THEMES,
  MAP_COLS,
  MAP_ROWS,
  PATHS,
  PIER,
  PLAZA,
  TILE,
  WATER,
  type Building,
} from '@cozy/game-data';
import { hex, INK, mulberry, shade } from './pixel';

const inRect = (x: number, y: number, r: { x: number; y: number; w: number; h: number }) =>
  x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

/**
 * Paints the rich town ground layer:
 * - Lush layered grass with wildflower patches (chamomile, lavender, buttercups, clovers)
 * - Cobblestone-bordered gravel paths
 * - Ornate paving stone plaza with mosaic details
 * - Deep shimmering pond with lily pads and water blossoms
 * - Weathered wooden pier with iron cleats and rope wraps
 */
export function paintTown(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = MAP_COLS * TILE;
  c.height = MAP_ROWS * TILE;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  const rng = mulberry(42);

  // --- 1. LUSH GRASS BASE WITH TONAL TEXTURE ---
  const grassTones = ['#88c276', '#82bc70', '#8ec77c', '#7cb56a'];
  for (let ty = 0; ty < MAP_ROWS; ty++) {
    for (let tx = 0; tx < MAP_COLS; tx++) {
      const idx = (tx * 11 + ty * 17) % grassTones.length;
      ctx.fillStyle = grassTones[idx]!;
      ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);

      // Fine grass tufts
      for (let i = 0; i < 4; i++) {
        const gx = tx * TILE + Math.floor(rng() * (TILE - 3));
        const gy = ty * TILE + Math.floor(rng() * (TILE - 4));
        ctx.fillStyle = rng() > 0.5 ? '#6da55b' : '#9bd485';
        ctx.fillRect(gx, gy, 1, 3);
        ctx.fillRect(gx + 1, gy + 1, 1, 2);
      }

      // Sprinkled wildflowers & clovers
      const flowerRoll = rng();
      if (flowerRoll < 0.12) {
        const fx = tx * TILE + 4 + Math.floor(rng() * (TILE - 8));
        const fy = ty * TILE + 4 + Math.floor(rng() * (TILE - 8));
        if (flowerRoll < 0.04) {
          // Chamomile daisy (white petals, yellow center)
          ctx.fillStyle = '#f8f6f0';
          ctx.fillRect(fx - 1, fy, 4, 2);
          ctx.fillRect(fx, fy - 1, 2, 4);
          ctx.fillStyle = '#f5c542';
          ctx.fillRect(fx, fy, 2, 2);
        } else if (flowerRoll < 0.07) {
          // Lavender spike (soft purple/violet)
          ctx.fillStyle = '#9c8ade';
          ctx.fillRect(fx, fy - 2, 2, 4);
          ctx.fillStyle = '#b8a8f0';
          ctx.fillRect(fx, fy - 3, 2, 1);
          ctx.fillStyle = '#5c8a4e';
          ctx.fillRect(fx, fy + 2, 1, 2);
        } else if (flowerRoll < 0.1) {
          // Buttercup (bright sunny yellow)
          ctx.fillStyle = '#ffcc22';
          ctx.fillRect(fx, fy, 3, 3);
          ctx.fillStyle = '#ff8800';
          ctx.fillRect(fx + 1, fy + 1, 1, 1);
        } else {
          // Clover patch
          ctx.fillStyle = '#559944';
          ctx.fillRect(fx, fy, 2, 2);
          ctx.fillRect(fx + 2, fy, 2, 2);
          ctx.fillRect(fx + 1, fy + 2, 2, 2);
        }
      }
    }
  }

  // --- 2. COBBLESTONE GRAVEL PATHS ---
  for (const r of PATHS) {
    // Warm gravel foundation
    ctx.fillStyle = '#dfcca4';
    ctx.fillRect(r.x, r.y, r.w, r.h);

    // Textured gravel flecks
    for (let x = r.x; x < r.x + r.w; x += 6) {
      for (let y = r.y; y < r.y + r.h; y += 6) {
        if (rng() < 0.35) {
          ctx.fillStyle = rng() > 0.5 ? '#cdb68a' : '#eddab4';
          ctx.fillRect(x + Math.floor(rng() * 4), y + Math.floor(rng() * 4), 2, 2);
        }
      }
    }

    // Cobblestone border trim along path edges
    ctx.fillStyle = '#bda479';
    for (let x = r.x; x < r.x + r.w; x += 4) {
      ctx.fillRect(x, r.y, 3, 1);
      ctx.fillRect(x, r.y + r.h - 1, 3, 1);
    }
    for (let y = r.y; y < r.y + r.h; y += 4) {
      ctx.fillRect(r.x, y, 1, 3);
      ctx.fillRect(r.x + r.w - 1, y, 1, 3);
    }
  }

  // --- 3. ORNATE PLAZA PAVING WITH MOSAIC BORDER ---
  for (let x = PLAZA.x; x < PLAZA.x + PLAZA.w; x += 16) {
    for (let y = PLAZA.y; y < PLAZA.y + PLAZA.h; y += 16) {
      const isAlt = ((x + y) / 16) % 2 === 0;
      ctx.fillStyle = isAlt ? '#eee2cb' : '#e4d4b6';
      ctx.fillRect(x, y, 16, 16);

      // Inner beveled stone highlight
      ctx.fillStyle = '#f8f1e2';
      ctx.fillRect(x + 1, y + 1, 14, 1);
      ctx.fillRect(x + 1, y + 1, 1, 14);

      // Mortar grout line
      ctx.fillStyle = '#c7b088';
      ctx.fillRect(x, y + 15, 16, 1);
      ctx.fillRect(x + 15, y, 1, 16);
    }
  }

  // Ornamental border around the plaza
  ctx.strokeStyle = '#bfa577';
  ctx.lineWidth = 2;
  ctx.strokeRect(PLAZA.x + 1, PLAZA.y + 1, PLAZA.w - 2, PLAZA.h - 2);
  ctx.strokeStyle = '#dfcca4';
  ctx.lineWidth = 1;
  ctx.strokeRect(PLAZA.x + 3, PLAZA.y + 3, PLAZA.w - 6, PLAZA.h - 6);

  // --- 4. SHIMMERING LAKE WATER & LILY PADS ---
  for (const w of WATER) {
    // Deep lagoon gradient
    ctx.fillStyle = '#58a8ce';
    ctx.fillRect(w.x, w.y, w.w, w.h);

    // Sandy shore transition
    ctx.fillStyle = '#dfcca4';
    ctx.fillRect(w.x, w.y - 4, w.w, 4);
    ctx.fillStyle = '#4895bb';
    ctx.fillRect(w.x, w.y, w.w, 3);

    // Water ripple streaks
    for (let i = 0; i < 110; i++) {
      ctx.fillStyle = rng() > 0.5 ? '#7ecef0' : '#458aa8';
      const x = w.x + Math.floor(rng() * (w.w - 10));
      const y = w.y + 6 + Math.floor(rng() * (w.h - 10));
      ctx.fillRect(x, y, 8, 1);
    }

    // Lily pads with pink water blossoms
    const lilyPads = [
      { x: w.x + 18, y: w.y + 26 },
      { x: w.x + 28, y: w.y + 70 },
      { x: w.x + w.w - 40, y: w.y + 32 },
      { x: w.x + w.w - 24, y: w.y + 88 },
      { x: w.x + 60, y: w.y + w.h - 40 },
    ];
    for (const lp of lilyPads) {
      // Round leaf with notch
      ctx.fillStyle = '#2f7547';
      ctx.fillRect(lp.x - 4, lp.y - 4, 8, 8);
      ctx.fillRect(lp.x - 5, lp.y - 2, 10, 4);
      ctx.fillRect(lp.x - 2, lp.y - 5, 4, 10);
      ctx.fillStyle = '#429e61';
      ctx.fillRect(lp.x - 3, lp.y - 3, 6, 6);
      ctx.fillStyle = '#58a8ce'; // notch cut
      ctx.fillRect(lp.x + 1, lp.y, 3, 1);

      // Blossom
      ctx.fillStyle = '#ff8fa3';
      ctx.fillRect(lp.x - 1, lp.y - 1, 3, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(lp.x, lp.y, 1, 1);
    }
  }

  // --- 5. WEATHERED WOODEN PIER ---
  ctx.fillStyle = '#8f5f3a';
  ctx.fillRect(PIER.x, PIER.y, PIER.w, PIER.h);
  for (let y = PIER.y; y < PIER.y + PIER.h; y += 8) {
    // Individual wood plank with highlight and shadow
    ctx.fillStyle = '#a67347';
    ctx.fillRect(PIER.x, y, PIER.w, 6);
    ctx.fillStyle = '#ba8557';
    ctx.fillRect(PIER.x, y, PIER.w, 1); // top plank highlight
    ctx.fillStyle = '#6e4526';
    ctx.fillRect(PIER.x, y + 6, PIER.w, 2); // deep gap between planks

    // Iron nails on each plank side
    ctx.fillStyle = '#3a2d24';
    ctx.fillRect(PIER.x + 4, y + 3, 2, 2);
    ctx.fillRect(PIER.x + PIER.w - 6, y + 3, 2, 2);
  }

  // Pier mooring posts with rope coils
  [PIER.y + 12, PIER.y + PIER.h - 16].forEach((y) => {
    // Left post
    ctx.fillStyle = '#52341d';
    ctx.fillRect(PIER.x - 4, y, 5, 10);
    ctx.fillStyle = '#e8d5a8'; // rope wrap
    ctx.fillRect(PIER.x - 4, y + 3, 5, 2);
    // Right post
    ctx.fillStyle = '#52341d';
    ctx.fillRect(PIER.x + PIER.w - 1, y, 5, 10);
    ctx.fillStyle = '#e8d5a8';
    ctx.fillRect(PIER.x + PIER.w - 1, y + 3, 5, 2);
  });

  // --- 6. NATURAL TREE BORDER ---
  for (let tx = 0; tx < MAP_COLS; tx++) {
    for (let ty = 0; ty < MAP_ROWS; ty++) {
      const edge = tx === 0 || ty === 0 || tx === MAP_COLS - 1 || ty === MAP_ROWS - 1;
      if (!edge) continue;
      if (WATER.some((w) => inRect(tx * TILE + 1, ty * TILE + 1, w)) && ty === MAP_ROWS - 1) continue;
      drawTree(ctx, tx * TILE + TILE / 2, ty * TILE + TILE - 2, 0.95 + ((tx * 3 + ty) % 3) * 0.08);
    }
  }

  return c;
}

/**
 * High-detail volumetric tree:
 * - Sturdy trunk with root flare and bark texturing
 * - Billowy layered canopy clusters in 4 tonal depths with sunlit dappling
 */
export function drawTree(ctx: CanvasRenderingContext2D, cx: number, by: number, s = 1) {
  // Ground drop shadow
  ctx.fillStyle = 'rgba(35, 28, 48, 0.22)';
  ctx.beginPath();
  ctx.ellipse(cx, by - 2, 16 * s, 6 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Textured wooden trunk with root flare
  ctx.fillStyle = '#654024';
  ctx.fillRect(cx - 4 * s, by - 14 * s, 8 * s, 14 * s);
  ctx.fillStyle = '#4c2e17'; // trunk shadow side
  ctx.fillRect(cx + 1 * s, by - 14 * s, 3 * s, 14 * s);
  ctx.fillStyle = '#7a5232'; // trunk light side
  ctx.fillRect(cx - 3 * s, by - 14 * s, 2 * s, 14 * s);

  // Root flares
  ctx.fillStyle = '#54341b';
  ctx.fillRect(cx - 6 * s, by - 4 * s, 3 * s, 4 * s);
  ctx.fillRect(cx + 3 * s, by - 4 * s, 3 * s, 4 * s);

  // Helper for layered foliage puff clusters
  const puff = (px: number, py: number, r: number) => {
    // Deep silhouette outline
    ctx.fillStyle = '#1c3825';
    ctx.beginPath();
    ctx.arc(px, py, r + 1, 0, Math.PI * 2);
    ctx.fill();

    // Deep forest green base
    ctx.fillStyle = '#2d5e38';
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();

    // Midtone lush green
    ctx.fillStyle = '#438a50';
    ctx.beginPath();
    ctx.arc(px - 1 * s, py - 1 * s, r * 0.78, 0, Math.PI * 2);
    ctx.fill();

    // Vibrant sunlight highlight
    ctx.fillStyle = '#66ba6f';
    ctx.beginPath();
    ctx.arc(px - 2.5 * s, py - 3 * s, r * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Sparkle rim highlight
    ctx.fillStyle = '#8de092';
    ctx.beginPath();
    ctx.arc(px - 3.5 * s, py - 4 * s, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  };

  // Multiple overlapping foliage puffs creating a rich organic canopy
  puff(cx - 7 * s, by - 20 * s, 10 * s);
  puff(cx + 7 * s, by - 20 * s, 10 * s);
  puff(cx - 6 * s, by - 30 * s, 11 * s);
  puff(cx + 6 * s, by - 30 * s, 11 * s);
  puff(cx, by - 26 * s, 13 * s);
  puff(cx, by - 38 * s, 9 * s);
}

export const BUILDING_ROOF = 30;

/**
 * High-detail European / Fantasy Cottage building:
 * - Scalloped fish-scale or cedar shake shingles with layered highlight and shadow
 * - Half-timbered Tudor beams framing warm stucco walls
 * - Rustic fieldstone foundation base
 * - Flowing green ivy vines curling up the corners
 * - Arched leaded-glass windows with warm interior amber glow and flower boxes
 * - Heavy arched oak plank door with iron strap hinges, knocker and glowing lantern
 * - Hanging carved wooden sign on iron chains
 */
export function paintBuilding(b: Building): HTMLCanvasElement {
  const roofH = BUILDING_ROOF;
  const c = document.createElement('canvas');
  c.width = b.rect.w + 8;
  c.height = b.rect.h + roofH;
  const ctx = c.getContext('2d')!;
  const ox = 4;
  const top = roofH;
  const wall = hex(b.wall);
  const roof = hex(b.roof);
  const accent = hex(b.accent);

  // 1. Soft ground contact shadow
  ctx.fillStyle = 'rgba(28, 24, 38, 0.28)';
  ctx.fillRect(ox + 2, top + b.rect.h - 4, b.rect.w + 4, 8);

  // 2. Base wall & Tudor plaster
  ctx.fillStyle = INK;
  ctx.fillRect(ox - 1, top - 1, b.rect.w + 2, b.rect.h + 2);
  ctx.fillStyle = wall;
  ctx.fillRect(ox, top, b.rect.w, b.rect.h);

  // Subtle stucco horizontal grain
  ctx.fillStyle = shade(wall, -0.06);
  for (let y = top + 8; y < top + b.rect.h - 12; y += 8) {
    ctx.fillRect(ox, y, b.rect.w, 1);
  }

  // 3. Half-timbered Tudor framing (vertical and diagonal beams)
  const timberCol = shade(accent, -0.15);
  const timberLight = shade(accent, 0.18);
  ctx.fillStyle = timberCol;

  // Corner timber pillars
  ctx.fillRect(ox, top, 4, b.rect.h);
  ctx.fillRect(ox + b.rect.w - 4, top, 4, b.rect.h);
  ctx.fillStyle = timberLight;
  ctx.fillRect(ox, top, 1, b.rect.h);
  ctx.fillRect(ox + b.rect.w - 4, top, 1, b.rect.h);

  // Horizontal mid-beam
  const midY = top + Math.floor(b.rect.h * 0.45);
  ctx.fillStyle = timberCol;
  ctx.fillRect(ox, midY, b.rect.w, 3);
  ctx.fillStyle = timberLight;
  ctx.fillRect(ox, midY, b.rect.w, 1);

  // Diagonal brace beams between window bays
  ctx.fillStyle = shade(timberCol, -0.05);
  for (let x = ox + 24; x < ox + b.rect.w - 24; x += 48) {
    for (let i = 0; i < 14; i++) {
      ctx.fillRect(x + i, top + 2 + i, 2, 2);
      ctx.fillRect(x + 24 - i, top + 2 + i, 2, 2);
    }
  }

  // 4. Rustic fieldstone foundation base along bottom 10px
  const baseH = 10;
  const baseY = top + b.rect.h - baseH;
  ctx.fillStyle = '#6b6357';
  ctx.fillRect(ox, baseY, b.rect.w, baseH);
  // Individual rounded fieldstones
  for (let x = ox + 1; x < ox + b.rect.w - 4; x += 8) {
    ctx.fillStyle = '#9c9282';
    ctx.fillRect(x, baseY + 1, 6, 4);
    ctx.fillStyle = '#b8ae9c';
    ctx.fillRect(x + 1, baseY + 1, 4, 1);
    ctx.fillStyle = '#4f473c'; // mortar gap
    ctx.fillRect(x + 6, baseY, 2, 5);

    ctx.fillStyle = '#877d6d';
    ctx.fillRect(x + 3, baseY + 5, 6, 4);
    ctx.fillStyle = '#a69a88';
    ctx.fillRect(x + 4, baseY + 5, 4, 1);
  }

  // 5. Layered shingle roof (Ngói xếp vảy cá)
  // Deep roof overhang outline
  ctx.fillStyle = INK;
  ctx.fillRect(ox - 6, 2, b.rect.w + 12, roofH + 5);

  // Roof body with scalloped shingle tiers
  ctx.fillStyle = roof;
  ctx.fillRect(ox - 5, 3, b.rect.w + 10, roofH + 3);

  // Shingle tiers with highlights & drop shadows
  for (let y = 6; y < roofH + 3; y += 6) {
    // Shadow under each shingle tier
    ctx.fillStyle = shade(roof, -0.28);
    ctx.fillRect(ox - 5, y + 4, b.rect.w + 10, 2);
    // Highlight on top edge of shingles
    ctx.fillStyle = shade(roof, 0.28);
    ctx.fillRect(ox - 5, y, b.rect.w + 10, 1);

    // Vertical shingle slit cuts (staggered)
    const offset = ((y / 6) % 2) * 8;
    ctx.fillStyle = shade(roof, -0.35);
    for (let x = ox - 4 + offset; x < ox + b.rect.w + 8; x += 16) {
      ctx.fillRect(x, y + 1, 1, 5);
      // Small rounded shingle bottom curve
      ctx.fillStyle = shade(roof, 0.15);
      ctx.fillRect(x + 1, y + 4, 7, 1);
    }
  }

  // Ornamental ridge cap on peak of roof
  ctx.fillStyle = shade(roof, 0.35);
  ctx.fillRect(ox - 5, 3, b.rect.w + 10, 2);

  // Chimney on top of roof
  const chimX = ox + b.rect.w - 20;
  ctx.fillStyle = INK;
  ctx.fillRect(chimX - 1, 0, 14, 14);
  ctx.fillStyle = '#9e4a3b'; // red brick
  ctx.fillRect(chimX, 1, 12, 12);
  ctx.fillStyle = '#c76856';
  ctx.fillRect(chimX + 1, 2, 4, 2);
  ctx.fillRect(chimX + 6, 5, 5, 2);
  ctx.fillStyle = '#ded9cf'; // stone chimney cap
  ctx.fillRect(chimX - 2, 0, 16, 3);

  // 6. Arched windows with warm interior glow & flower boxes
  const doorX = ox + (b.door.x * TILE - b.rect.x);
  const doorW = b.door.w * TILE;

  for (let x = ox + 10; x + 24 < ox + b.rect.w; x += 38) {
    if (x + 24 > doorX - 6 && x < doorX + doorW + 6) continue;
    const wy = top + 22;

    // Window frame outline
    ctx.fillStyle = INK;
    ctx.fillRect(x - 1, wy - 1, 24, 24);

    // Warm glowing amber interior light
    ctx.fillStyle = '#ffdf78';
    ctx.fillRect(x, wy, 22, 22);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(x + 2, wy + 2, 8, 8); // bright upper glow

    // Wooden crossbar muntins
    ctx.fillStyle = timberCol;
    ctx.fillRect(x + 10, wy, 2, 22);
    ctx.fillRect(x, wy + 11, 22, 2);

    // Glass shine reflection (diagonal streak)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.fillRect(x + 2, wy + 3, 4, 2);
    ctx.fillRect(x + 13, wy + 14, 5, 2);

    // Flower box underneath window!
    ctx.fillStyle = '#54351d';
    ctx.fillRect(x - 2, wy + 21, 26, 6);
    ctx.fillStyle = '#7a4e2b';
    ctx.fillRect(x - 1, wy + 22, 24, 4);

    // Blooming flowers in window box
    const blooms = ['#e63946', '#f4a261', '#ffd166', '#ffffff', '#e63946'];
    for (let bi = 0; bi < 5; bi++) {
      ctx.fillStyle = '#387339'; // green leaf
      ctx.fillRect(x + bi * 5, wy + 20, 3, 2);
      ctx.fillStyle = blooms[bi]!; // blossom
      ctx.fillRect(x + bi * 5 + 1, wy + 19, 2, 2);
    }
  }

  // 7. Store entrance & Arched Oak Door
  const dy = top + b.rect.h - 44;

  // Door frame & arch
  ctx.fillStyle = INK;
  ctx.fillRect(doorX + 5, dy - 2, doorW - 10, 46);

  // Oak wood planks
  ctx.fillStyle = shade(accent, -0.2);
  ctx.fillRect(doorX + 6, dy - 1, doorW - 12, 44);
  ctx.fillStyle = accent;
  ctx.fillRect(doorX + 7, dy, doorW - 14, 43);

  // Vertical wood plank grooves
  ctx.fillStyle = shade(accent, -0.25);
  for (let px = doorX + 12; px < doorX + doorW - 14; px += 6) {
    ctx.fillRect(px, dy + 2, 1, 40);
  }

  // Decorative wrought-iron strap hinges
  ctx.fillStyle = '#221c27';
  ctx.fillRect(doorX + 7, dy + 8, doorW - 14, 2);
  ctx.fillRect(doorX + 7, dy + 32, doorW - 14, 2);

  // Golden brass knocker
  ctx.fillStyle = '#f5c542';
  ctx.fillRect(doorX + doorW - 14, dy + 20, 4, 4);
  ctx.fillStyle = '#e5a820';
  ctx.fillRect(doorX + doorW - 13, dy + 22, 2, 3);

  // Stone threshold doorstep
  ctx.fillStyle = '#bbb1a0';
  ctx.fillRect(doorX + 4, top + b.rect.h - 2, doorW - 8, 3);

  // Glowing carriage lantern beside door
  const lampX = doorX - 6;
  const lampY = dy + 14;
  ctx.fillStyle = '#221c27';
  ctx.fillRect(lampX, lampY - 2, 4, 8);
  ctx.fillStyle = '#ffdd66';
  ctx.fillRect(lampX + 1, lampY, 2, 5); // glowing glass
  ctx.fillStyle = 'rgba(255, 230, 120, 0.35)'; // warm light halo
  ctx.fillRect(lampX - 3, lampY - 3, 10, 11);

  // 8. Climbing green ivy on building corners
  const drawIvy = (ix: number, alignRight = false) => {
    const ivyCol = '#386638';
    const ivyLight = '#529652';
    for (let iy = top + b.rect.h - 8; iy > top + 14; iy -= 7) {
      const xOff = alignRight ? -3 : 0;
      ctx.fillStyle = ivyCol;
      ctx.fillRect(ix + xOff, iy, 4, 4);
      ctx.fillStyle = ivyLight;
      ctx.fillRect(ix + xOff + 1, iy - 1, 2, 2);
    }
  };
  drawIvy(ox + 1);
  drawIvy(ox + b.rect.w - 3, true);

  // 9. Ornate carved hanging wooden sign
  ctx.font = '700 11px "Pixelify Sans", monospace';
  const textW = ctx.measureText(b.label).width;
  const sw = Math.min(b.rect.w - 16, Math.max(72, textW + 24));
  const sx = ox + (b.rect.w - sw) / 2;
  const sy = top + 6;

  // Iron hanging chains
  ctx.fillStyle = '#2a2438';
  ctx.fillRect(sx + 8, sy - 4, 1, 4);
  ctx.fillRect(sx + sw - 9, sy - 4, 1, 4);

  // Wooden sign body with border
  ctx.fillStyle = INK;
  ctx.fillRect(sx - 1, sy - 1, sw + 2, 20);
  ctx.fillStyle = '#f8f4ec'; // parchment cream sign face
  ctx.fillRect(sx, sy, sw, 18);
  ctx.strokeStyle = '#c49a45'; // golden ornamental border
  ctx.lineWidth = 1;
  ctx.strokeRect(sx + 1, sy + 1, sw - 2, 16);

  // Engraved shop label
  ctx.fillStyle = accent;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(b.label, sx + sw / 2, sy + 10, sw - 8);

  // 10. Special Fishing Shop Props (Phao cứu sinh, cần câu dựa tường, xô gỗ)
  if (b.id === 'fishing_shop') {
    // Red & white lifebuoy on the left wall
    const buoyX = ox + 8;
    const buoyY = top + 26;
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(buoyX, buoyY, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(buoyX, buoyY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#244c5a'; // wall hole
    ctx.beginPath();
    ctx.arc(buoyX, buoyY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Lifebuoy white stripes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(buoyX - 7, buoyY - 1, 3, 2);
    ctx.fillRect(buoyX + 4, buoyY - 1, 3, 2);
    ctx.fillRect(buoyX - 1, buoyY - 7, 2, 3);
    ctx.fillRect(buoyX - 1, buoyY + 4, 2, 3);

    // Fishing rods leaning against right wall
    const rodX = ox + b.rect.w - 14;
    const rodBottomY = top + b.rect.h - 4;
    // Rod 1 (Wooden)
    ctx.strokeStyle = '#b47547';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rodX + 4, rodBottomY);
    ctx.lineTo(rodX - 4, top + 18);
    ctx.stroke();
    // Rod 2 (Cyan fiberglass)
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(rodX + 8, rodBottomY);
    ctx.lineTo(rodX + 2, top + 14);
    ctx.stroke();

    // Wooden bait bucket by the door
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(doorX - 12, top + b.rect.h - 10, 8, 8);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(doorX - 11, top + b.rect.h - 9, 6, 7);
    ctx.fillStyle = '#94a3b8'; // metal handle
    ctx.fillRect(doorX - 12, top + b.rect.h - 12, 8, 2);
  }

  return c;
}

/**
 * High-detail town props:
 * - Fountain: Multi-tiered circular limestone fountain with glistening waterfalls and rippling basin
 * - Event Board: Gabled roof canopy with corkboard, pinned notices, wax seals
 * - Kiosk: Retro-futuristic brass & mahogany arcade terminal with glowing AI core
 * - Bench: Ornate cast-iron scrollwork with curved polished oak slats
 * - Lamp: Victorian wrought-iron carriage streetlamp with warm ambient filament
 */
export function paintProp(kind: 'fountain' | 'board' | 'kiosk' | 'bench' | 'lamp'): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;

  if (kind === 'fountain') {
    c.width = 76;
    c.height = 76;

    // Soft circular shadow
    ctx.fillStyle = 'rgba(28, 24, 38, 0.28)';
    ctx.beginPath();
    ctx.ellipse(38, 52, 34, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Outer carved limestone basin rim
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(38, 48, 33, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#b5ada0';
    ctx.beginPath();
    ctx.ellipse(38, 48, 32, 19, 0, 0, Math.PI * 2);
    ctx.fill();

    // Top carved rim highlight
    ctx.fillStyle = '#dfd8cc';
    ctx.beginPath();
    ctx.ellipse(38, 46, 31, 17, 0, 0, Math.PI * 2);
    ctx.fill();

    // Deep water pool
    ctx.fillStyle = '#4c9ec2';
    ctx.beginPath();
    ctx.ellipse(38, 48, 27, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    // Water ripple rings
    ctx.strokeStyle = '#8ee0f8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(38, 48, 20, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(38, 48, 12, 6, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Center stone pillar pedestal
    ctx.fillStyle = INK;
    ctx.fillRect(32, 20, 12, 28);
    ctx.fillStyle = '#9e968a';
    ctx.fillRect(33, 21, 10, 26);
    ctx.fillStyle = '#ded7cb';
    ctx.fillRect(33, 21, 3, 26);

    // Upper bowl tier
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(38, 22, 17, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#cfc7ba';
    ctx.beginPath();
    ctx.ellipse(38, 21, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6ab8d9';
    ctx.beginPath();
    ctx.ellipse(38, 21, 13, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Spouting finial & crystal water streams
    ctx.fillStyle = '#ebe6dc';
    ctx.fillRect(36, 12, 4, 10);
    ctx.fillStyle = '#9fe8ff';
    ctx.fillRect(37, 6, 2, 8); // water jet
    ctx.fillRect(35, 8, 6, 2);
    // Waterfalls falling from upper bowl to basin
    ctx.fillStyle = 'rgba(180, 240, 255, 0.85)';
    ctx.fillRect(24, 24, 2, 22);
    ctx.fillRect(50, 24, 2, 22);
    ctx.fillRect(37, 26, 2, 20);
  } else if (kind === 'board') {
    c.width = 76;
    c.height = 70;

    // Ground shadow
    ctx.fillStyle = 'rgba(28, 24, 38, 0.22)';
    ctx.fillRect(8, 62, 12, 4);
    ctx.fillRect(56, 62, 12, 4);

    // Sturdy wooden support posts
    ctx.fillStyle = '#4a2c16';
    ctx.fillRect(11, 28, 7, 38);
    ctx.fillRect(58, 28, 7, 38);
    ctx.fillStyle = '#7a4e2d';
    ctx.fillRect(12, 28, 3, 38);
    ctx.fillRect(59, 28, 3, 38);

    // Main notice board frame
    ctx.fillStyle = INK;
    ctx.fillRect(3, 10, 70, 46);
    ctx.fillStyle = '#855633';
    ctx.fillRect(4, 11, 68, 44);

    // Warm textured corkboard backing
    ctx.fillStyle = '#e8d4a9';
    ctx.fillRect(7, 14, 62, 38);
    ctx.fillStyle = '#ddc594';
    for (let x = 8; x < 68; x += 4) {
      for (let y = 15; y < 51; y += 4) {
        if ((x + y) % 3 === 0) ctx.fillRect(x, y, 1, 1);
      }
    }

    // Gabled shingle canopy roof over the board!
    ctx.fillStyle = INK;
    ctx.fillRect(0, 5, 76, 8);
    ctx.fillStyle = '#9e432d'; // terracotta rooflet
    ctx.fillRect(1, 6, 74, 6);
    ctx.fillStyle = '#d4654b';
    ctx.fillRect(1, 6, 74, 2);

    // Colorful pinned flyers and notices
    // 1. Parchment quest flyer (left)
    ctx.fillStyle = '#fdfaf0';
    ctx.fillRect(9, 17, 24, 18);
    ctx.fillStyle = '#5c4d3c';
    ctx.fillRect(11, 20, 16, 2);
    ctx.fillRect(11, 24, 20, 1);
    ctx.fillRect(11, 27, 18, 1);
    ctx.fillRect(11, 30, 12, 1);
    // Red wax seal
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(25, 28, 5, 5);

    // 2. Event poster (right)
    ctx.fillStyle = '#fce5cd';
    ctx.fillRect(37, 16, 28, 16);
    ctx.fillStyle = '#e06666';
    ctx.fillRect(39, 19, 12, 2);
    ctx.fillRect(39, 23, 24, 2);
    // Yellow star pin
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(49, 15, 4, 3);

    // 3. Mini note & photo (bottom)
    ctx.fillStyle = '#d9ead3';
    ctx.fillRect(14, 38, 20, 12);
    ctx.fillStyle = '#fff2cc';
    ctx.fillRect(38, 35, 14, 14);
    ctx.fillStyle = '#6fa8dc';
    ctx.fillRect(40, 37, 10, 8); // photo of town

    // Push pins (brass & red)
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(20, 16, 2, 2);
    ctx.fillStyle = '#3498db';
    ctx.fillRect(23, 37, 2, 2);
  } else if (kind === 'kiosk') {
    c.width = 80;
    c.height = 76;

    // Contact shadow
    ctx.fillStyle = 'rgba(28, 24, 38, 0.28)';
    ctx.fillRect(6, 68, 68, 8);

    // Steampunk / retro-futuristic arcade housing
    ctx.fillStyle = INK;
    ctx.fillRect(6, 10, 68, 62);
    ctx.fillStyle = '#48356b'; // deep cosmic purple
    ctx.fillRect(7, 11, 66, 60);

    // Polished mahogany wooden side pillars
    ctx.fillStyle = '#6b3318';
    ctx.fillRect(7, 11, 6, 60);
    ctx.fillRect(67, 11, 6, 60);
    ctx.fillStyle = '#8f4a27';
    ctx.fillRect(8, 11, 2, 60);

    // Glowing CRT Display Screen
    ctx.fillStyle = '#0f1826';
    ctx.fillRect(15, 18, 50, 32);
    ctx.fillStyle = '#17363f';
    ctx.fillRect(16, 19, 48, 30);

    // Cyan glowing neural AI waves & readouts
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(20, 23, 14, 2);
    ctx.fillRect(20, 28, 38, 2);
    ctx.fillRect(20, 33, 26, 2);
    ctx.fillRect(20, 38, 40, 3);
    // Golden reward spark icon
    ctx.fillStyle = '#f5c542';
    ctx.fillRect(48, 22, 6, 6);

    // Lower control panel with glowing buttons & brass coin slot
    ctx.fillStyle = '#261b3d';
    ctx.fillRect(13, 53, 54, 18);
    ctx.fillStyle = '#f5c542';
    ctx.fillRect(18, 59, 8, 3); // coin slot
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(36, 58, 4, 4); // green button
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(44, 58, 4, 4); // red button
    ctx.fillStyle = '#3498db';
    ctx.fillRect(52, 58, 4, 4); // blue button

    // Marquee top header
    ctx.fillStyle = INK;
    ctx.fillRect(2, 2, 76, 13);
    ctx.fillStyle = '#f5c542';
    ctx.fillRect(3, 3, 74, 11);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(3, 3, 74, 1); // gold sheen
    ctx.fillStyle = INK;
    ctx.font = '700 9px "Pixelify Sans", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ AI REWARDS ⚡', 40, 11.5);
  } else if (kind === 'bench') {
    c.width = 52;
    c.height = 26;

    // Contact shadow
    ctx.fillStyle = 'rgba(28, 24, 38, 0.22)';
    ctx.fillRect(4, 21, 44, 4);

    // Ornate cast-iron curved legs & armrests
    ctx.fillStyle = INK;
    ctx.fillRect(5, 10, 3, 13);
    ctx.fillRect(44, 10, 3, 13);
    ctx.fillRect(3, 8, 7, 3); // left armrest
    ctx.fillRect(42, 8, 7, 3); // right armrest

    // Polished warm oak wood slats (backrest)
    ctx.fillStyle = '#9e6236';
    ctx.fillRect(4, 2, 44, 5);
    ctx.fillStyle = '#ba7846';
    ctx.fillRect(4, 2, 44, 2); // wood sheen
    ctx.fillStyle = '#693c1b';
    ctx.fillRect(4, 6, 44, 1);

    ctx.fillStyle = '#9e6236';
    ctx.fillRect(4, 8, 44, 5);
    ctx.fillStyle = '#ba7846';
    ctx.fillRect(4, 8, 44, 2);
    ctx.fillStyle = '#693c1b';
    ctx.fillRect(4, 12, 44, 1);

    // Bench seat slats
    ctx.fillStyle = '#9e6236';
    ctx.fillRect(4, 14, 44, 5);
    ctx.fillStyle = '#ba7846';
    ctx.fillRect(4, 14, 44, 2);
    ctx.fillStyle = '#542f13';
    ctx.fillRect(4, 18, 44, 1);
  } else {
    // Victorian Street Gaslamp
    c.width = 24;
    c.height = 62;

    // Base contact shadow
    ctx.fillStyle = 'rgba(28, 24, 38, 0.22)';
    ctx.fillRect(6, 58, 12, 3);

    // Fluted cast-iron lamp pole
    ctx.fillStyle = INK;
    ctx.fillRect(10, 14, 4, 46);
    ctx.fillStyle = '#3a4454';
    ctx.fillRect(11, 14, 2, 46);

    // Decorative stepped pedestal base
    ctx.fillStyle = INK;
    ctx.fillRect(8, 54, 8, 6);
    ctx.fillStyle = '#4c586c';
    ctx.fillRect(9, 55, 6, 4);

    // Warm radial light aura
    ctx.fillStyle = 'rgba(255, 230, 130, 0.22)';
    ctx.beginPath();
    ctx.arc(12, 8, 11, 0, Math.PI * 2);
    ctx.fill();

    // Carriage glass lantern housing
    ctx.fillStyle = INK;
    ctx.fillRect(5, 1, 14, 14);

    // Warm incandescent glowing filament
    ctx.fillStyle = '#ffef9f';
    ctx.fillRect(6, 2, 12, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(9, 5, 6, 6); // intense center glow

    // Iron corner ribs and roof peak
    ctx.fillStyle = INK;
    ctx.fillRect(5, 0, 14, 2);
    ctx.fillRect(11, -2, 2, 3); // finial spike
    ctx.fillStyle = '#3a4454';
    ctx.fillRect(5, 1, 14, 1);
  }

  return c;
}

export const APT_TILE = 32;

/** High-detail apartment interior: rich wood parquet floor, wainscoting trim, sunlit window. */
export function paintApartment(themeId: string): HTMLCanvasElement {
  const theme = APARTMENT_THEMES.find((t) => t.id === themeId) ?? APARTMENT_THEMES[0]!;
  const c = document.createElement('canvas');
  c.width = APARTMENT_COLS * APT_TILE;
  c.height = APARTMENT_ROWS * APT_TILE;
  const ctx = c.getContext('2d')!;

  // 1. Parquet wooden floor tiles with alternating grain
  for (let y = 1; y < APARTMENT_ROWS; y++) {
    for (let x = 0; x < APARTMENT_COLS; x++) {
      const isAlt = (x + y) % 2 === 1;
      const baseCol = hex(isAlt ? theme.floor : theme.floorAlt);
      ctx.fillStyle = baseCol;
      ctx.fillRect(x * APT_TILE, y * APT_TILE, APT_TILE, APT_TILE);

      // Wood plank seams
      ctx.fillStyle = shade(baseCol, -0.12);
      ctx.fillRect(x * APT_TILE, y * APT_TILE + APT_TILE - 1, APT_TILE, 1);
      ctx.fillRect(x * APT_TILE + APT_TILE - 1, y * APT_TILE, 1, APT_TILE);

      // Woodgrain striations
      ctx.fillStyle = shade(baseCol, 0.1);
      ctx.fillRect(x * APT_TILE + 2, y * APT_TILE + 8, APT_TILE - 4, 1);
      ctx.fillRect(x * APT_TILE + 4, y * APT_TILE + 20, APT_TILE - 8, 1);
    }
  }

  // 2. Wallpaper & Wall Paneling
  const wallCol = hex(theme.wall);
  ctx.fillStyle = wallCol;
  ctx.fillRect(0, 0, c.width, APT_TILE);

  // Elegant vertical wallpaper stripes
  ctx.fillStyle = shade(wallCol, -0.06);
  for (let x = 0; x < c.width; x += 16) {
    ctx.fillRect(x, 0, 8, APT_TILE - 8);
  }

  // Crown moulding and baseboard trim
  const trimCol = hex(theme.trim);
  ctx.fillStyle = shade(trimCol, 0.2);
  ctx.fillRect(0, 0, c.width, 3); // ceiling moulding
  ctx.fillStyle = trimCol;
  ctx.fillRect(0, APT_TILE - 8, c.width, 8); // baseboard
  ctx.fillStyle = shade(trimCol, -0.2);
  ctx.fillRect(0, APT_TILE - 2, c.width, 2);

  // 3. Large Arched Window with Daylight & Countryside view
  const winW = 84;
  const winH = 22;
  const winX = Math.floor((c.width - winW) / 2);
  const winY = 2;

  // Outer wooden casing
  ctx.fillStyle = INK;
  ctx.fillRect(winX - 1, winY - 1, winW + 2, winH + 2);

  // Sunny sky view
  ctx.fillStyle = '#8fd7f2';
  ctx.fillRect(winX, winY, winW, winH);

  // Green hill silhouette in the distance
  ctx.fillStyle = '#65bd6e';
  ctx.beginPath();
  ctx.ellipse(winX + 30, winY + winH, 36, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Fluffy white cloud
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(winX + winW - 32, winY + 4, 14, 4);
  ctx.fillRect(winX + winW - 28, winY + 2, 8, 3);

  // Window mullions (crossbars)
  ctx.fillStyle = trimCol;
  ctx.fillRect(winX + Math.floor(winW / 3), winY, 2, winH);
  ctx.fillRect(winX + Math.floor((winW * 2) / 3), winY, 2, winH);
  ctx.fillRect(winX, winY + Math.floor(winH / 2), winW, 2);

  return c;
}
