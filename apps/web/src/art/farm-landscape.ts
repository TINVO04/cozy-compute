import { FARM_HEIGHT, FARM_PLOT_TOTAL, FARM_POIS, FARM_WIDTH, getFarmPlotRect, TILE } from '@cozy/game-data';
import { mulberry } from './pixel';

function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function oval(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, rx: number, ry: number) {
  for (let dy = -Math.floor(ry); dy <= ry; dy++) {
    const dx = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)));
    rect(ctx, color, x - dx, y + dy, dx * 2 + 1, 1);
  }
}

/**
 * Pure Canvas 2D Procedural Farm Landscape.
 * Matching the exact Cozy Farm layout & bright pixel art aesthetic:
 * - Bright pasture grass with daisies & clover
 * - Warm sandy dirt path network connecting Gate -> Shop -> Silo -> Pond -> Field -> Pens
 * - Stone-lined pond with dock, rowboat, lotus pads & lantern post
 * - Raised wooden-bordered 36 crop plot beds
 * - Post-and-rail wooden perimeter fence with "Nông Trại" entrance arch
 * - Shaded center tree, wooden bench & golden hay bales
 */
export function paintFarmLandscape(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = FARM_WIDTH;
  c.height = FARM_HEIGHT;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const rng = mulberry(20261002);

  // =========================================================================
  // 1. BASE MEADOW GRASS (Bright Countryside Palette)
  // =========================================================================
  // Primary vibrant pasture green
  rect(ctx, '#5ba83c', 0, 0, FARM_WIDTH, FARM_HEIGHT);

  // Soft lush organic grass highlights
  for (let i = 0; i < 140; i++) {
    const gx = rng() * FARM_WIDTH;
    const gy = rng() * FARM_HEIGHT;
    const rx = 35 + rng() * 65;
    const ry = 22 + rng() * 40;
    oval(ctx, i % 2 === 0 ? '#6dbd47' : '#529b35', gx, gy, rx, ry);
  }

  // Pixel grass blades & clover tufts
  for (let i = 0; i < 1200; i++) {
    const x = Math.floor(rng() * FARM_WIDTH);
    const y = Math.floor(rng() * FARM_HEIGHT);
    rect(ctx, '#478c2e', x, y, 3, 2);
    rect(ctx, '#76c450', x, y - 1, 2, 1);
  }

  // Dainty 4-petal white daisies with yellow center
  for (let i = 0; i < 220; i++) {
    const fx = Math.floor(rng() * (FARM_WIDTH - 60)) + 30;
    const fy = Math.floor(rng() * (FARM_HEIGHT - 60)) + 30;
    // Petals
    rect(ctx, '#ffffff', fx - 2, fy - 1, 5, 3);
    rect(ctx, '#ffffff', fx - 1, fy - 2, 3, 5);
    // Yellow heart
    rect(ctx, '#fde047', fx, fy, 1, 1);
  }

  // =========================================================================
  // 2. WARM SANDY DIRT PATHWAYS (Clean geometric grid matching reference)
  // =========================================================================
  const drawPath = (x: number, y: number, w: number, h: number) => {
    // Dirt border shadow & highlight
    rect(ctx, '#9c7336', x - 3, y - 3, w + 6, h + 6);
    rect(ctx, '#cca05b', x - 1, y - 1, w + 2, h + 2);
    // Main warm golden sand surface
    rect(ctx, '#e5b974', x, y, w, h);
    // Subtle sand flecks & fine pebbles
    for (let p = 0; p < (w * h) / 60; p++) {
      const px = x + Math.floor(rng() * w);
      const py = y + Math.floor(rng() * h);
      rect(ctx, rng() > 0.5 ? '#f3cb8a' : '#baa06b', px, py, 2, 1);
    }
  };

  // Top-left gate entrance path heading south to front of shop
  drawPath(1.5 * TILE, 1 * TILE, 3.5 * TILE, 8.5 * TILE);

  // Main Northern Road running past front of Shop and Silo to Pond
  drawPath(1.5 * TILE, 8.5 * TILE, 24 * TILE, 2.5 * TILE);

  // Path leading up to Aquaculture Pond & Wooden Dock
  drawPath(23 * TILE, 8.5 * TILE, 4 * TILE, 4.5 * TILE);
  drawPath(26 * TILE, 10.5 * TILE, 6 * TILE, 2 * TILE);

  // West Road heading south beside Chicken Coop
  drawPath(1.5 * TILE, 11 * TILE, 3.5 * TILE, 11 * TILE);

  // Central North-South Avenue connecting northern avenue down to field
  drawPath(23 * TILE, 8.5 * TILE, 2.5 * TILE, 22 * TILE);

  // Pathway heading south between Chicken Coop and Pig/Sheep pens
  drawPath(1.5 * TILE, 21.5 * TILE, 24 * TILE, 2.5 * TILE);

  // Pathway separating Pig Pen and Sheep Pen
  drawPath(12.5 * TILE, 23 * TILE, 2 * TILE, 8.5 * TILE);

  // =========================================================================
  // 3. AQUACULTURE POND (Cobblestone border, bright blue water, lilies & boat)
  // =========================================================================
  const pond = FARM_POIS.aquaculture_pond;
  const pcx = pond.x + pond.w / 2;
  const pcy = pond.y + pond.h / 2 - 4;
  const prx = pond.w / 2 - 4;
  const pry = pond.h / 2 - 4;

  // Pond ground drop shadow
  oval(ctx, 'rgba(40, 70, 20, 0.4)', pcx + 4, pcy + 8, prx + 14, pry + 12);

  // Smooth rounded cobblestone embankment
  oval(ctx, '#64748b', pcx, pcy, prx + 12, pry + 10);
  oval(ctx, '#94a3b8', pcx, pcy, prx + 10, pry + 8);
  oval(ctx, '#cbd5e1', pcx, pcy, prx + 6, pry + 5);

  // Individual stone rim delineation
  for (let a = 0; a < Math.PI * 2; a += 0.14) {
    const sx = pcx + Math.cos(a) * (prx + 8);
    const sy = pcy + Math.sin(a) * (pry + 6.5);
    rect(ctx, '#475569', sx - 2, sy - 2, 4, 4);
    rect(ctx, '#e2e8f0', sx - 1, sy - 2, 2, 2);
  }

  // Water basin: clear turquoise cyan with deep center
  oval(ctx, '#2596be', pcx, pcy, prx - 1, pry - 1);
  oval(ctx, '#3898cb', pcx, pcy, prx - 6, pry - 5);
  oval(ctx, '#48b3e8', pcx, pcy, prx - 14, pry - 10);
  oval(ctx, '#6cd0fa', pcx - 8, pcy - 6, prx - 28, pry - 18);

  // Sparkling water ripples
  const ripples: [number, number, number][] = [
    [pcx - 50, pcy - 14, 18],
    [pcx + 30, pcy - 22, 24],
    [pcx - 20, pcy + 16, 28],
    [pcx + 45, pcy + 18, 16],
    [pcx, pcy - 4, 32],
  ];
  for (const [rx, ry, rw] of ripples) {
    rect(ctx, '#bae6fd', rx - rw / 2, ry, rw, 1);
    rect(ctx, '#ffffff', rx - rw / 4, ry, rw / 2, 1);
  }

  // Floating round green lily pads with lotus flowers
  const lilyPads: [number, number, boolean][] = [
    [pcx - 60, pcy + 10, true],
    [pcx - 45, pcy - 24, false],
    [pcx - 20, pcy - 30, true],
    [pcx + 25, pcy - 28, false],
    [pcx + 55, pcy - 12, false],
    [pcx - 65, pcy - 10, true],
    [pcx - 10, pcy + 24, false],
    [pcx + 25, pcy + 22, true],
  ];
  for (const [lx, ly, hasFlower] of lilyPads) {
    oval(ctx, '#15803d', lx, ly, 10, 7);
    oval(ctx, '#22c55e', lx - 1, ly - 1, 8, 5);
    // V-cutout in lily pad
    rect(ctx, '#3898cb', lx + 4, ly, 4, 2);
    if (hasFlower) {
      // White and pink lotus blossom
      oval(ctx, '#f472b6', lx - 1, ly - 3, 5, 5);
      oval(ctx, '#ffffff', lx - 1, ly - 4, 3, 3);
      rect(ctx, '#fbbf24', lx - 1, ly - 4, 2, 2);
    }
  }

  // Wooden dock / pier at bottom edge of pond
  const dockX = pcx - 20;
  const dockY = pcy + pry - 14;
  const dockW = 38;
  const dockH = 26;
  // Dock pilings
  rect(ctx, '#542d0c', dockX + 4, dockY + 12, 6, 14);
  rect(ctx, '#542d0c', dockX + dockW - 10, dockY + 12, 6, 14);
  // Dock wooden deck planks
  rect(ctx, '#542d0c', dockX, dockY, dockW, dockH);
  rect(ctx, '#8b5028', dockX + 2, dockY + 2, dockW - 4, dockH - 4);
  for (let py = dockY + 4; py < dockY + dockH - 4; py += 6) {
    rect(ctx, '#ab6938', dockX + 2, py, dockW - 4, 4);
    rect(ctx, '#542d0c', dockX + 2, py + 4, dockW - 4, 1);
  }
  // Pier mooring posts
  rect(ctx, '#8b5028', dockX, dockY + dockH - 8, 5, 8);
  rect(ctx, '#c9854e', dockX + 1, dockY + dockH - 7, 2, 2);
  rect(ctx, '#8b5028', dockX + dockW - 5, dockY + dockH - 8, 5, 8);
  rect(ctx, '#c9854e', dockX + dockW - 4, dockY + dockH - 7, 2, 2);

  // Small wooden rowboat moored on the right shore
  const boatX = pcx + prx - 26;
  const boatY = pcy + 4;
  // Boat hull
  rect(ctx, '#451a03', boatX - 2, boatY - 2, 24, 44);
  rect(ctx, '#78350f', boatX, boatY, 20, 40);
  rect(ctx, '#b45309', boatX + 2, boatY + 2, 16, 36);
  // Inside boat interior & bench
  rect(ctx, '#451a03', boatX + 4, boatY + 4, 12, 32);
  rect(ctx, '#d4a373', boatX + 4, boatY + 18, 12, 6);
  // Oar resting across boat
  rect(ctx, '#fde047', boatX - 4, boatY + 14, 28, 2);
  rect(ctx, '#ca8a04', boatX + 20, boatY + 12, 4, 6);

  // Wooden lantern post on the left bank of the pond
  const lpX = pcx - prx - 4;
  const lpY = pcy - 4;
  rect(ctx, '#542d0c', lpX - 2, lpY, 4, 26);
  rect(ctx, '#8b5028', lpX - 1, lpY, 2, 26);
  // Lantern head
  rect(ctx, '#451a03', lpX - 6, lpY - 12, 12, 12);
  rect(ctx, '#fef08a', lpX - 4, lpY - 10, 8, 8);
  rect(ctx, '#f59e0b', lpX - 2, lpY - 8, 4, 4);

  // =========================================================================
  // 4. LIVESTOCK ENCLOSURES GROUND SURFACING
  // =========================================================================
  // 4.1 Chuồng Gà (Mid-Left)
  const poultry = FARM_POIS.poultry_coop;
  rect(ctx, '#cca05b', poultry.x - 2, poultry.y - 2, poultry.w + 4, poultry.h + 4);
  rect(ctx, '#e0b875', poultry.x, poultry.y, poultry.w, poultry.h);
  for (let s = 0; s < 120; s++) {
    const sx = poultry.x + rng() * poultry.w;
    const sy = poultry.y + rng() * poultry.h;
    rect(ctx, s % 2 === 0 ? '#fef08a' : '#b45309', sx, sy, 3, 1);
  }

  // 4.2 Chuồng Heo (Bottom-Left) with rich dark mud wallow
  const pig = FARM_POIS.pig_pen;
  rect(ctx, '#cca05b', pig.x - 2, pig.y - 2, pig.w + 4, pig.h + 4);
  rect(ctx, '#d4a373', pig.x, pig.y, pig.w, pig.h);
  // Dark wet mud wallow
  oval(ctx, '#542d0c', pig.x + pig.w * 0.45, pig.y + pig.h * 0.55, pig.w * 0.38, pig.h * 0.32);
  oval(ctx, '#3f1d0b', pig.x + pig.w * 0.45, pig.y + pig.h * 0.55, pig.w * 0.28, pig.h * 0.22);
  oval(ctx, '#261205', pig.x + pig.w * 0.45, pig.y + pig.h * 0.55, pig.w * 0.16, pig.h * 0.14);

  // 4.3 Chuồng Cừu (Bottom-Center) with grass & golden hay flecks
  const goat = FARM_POIS.goat_pen;
  rect(ctx, '#cca05b', goat.x - 2, goat.y - 2, goat.w + 4, goat.h + 4);
  rect(ctx, '#e0b875', goat.x, goat.y, goat.w, goat.h);
  for (let s = 0; s < 90; s++) {
    const sx = goat.x + rng() * goat.w;
    const sy = goat.y + rng() * goat.h;
    rect(ctx, s % 2 === 0 ? '#fde047' : '#72c14a', sx, sy, 3, 1);
  }

  // =========================================================================
  // 5. 36 CROPS FIELD PLOT BEDS (Neat wooden-bordered raised soil beds)
  // =========================================================================
  for (let i = 0; i < FARM_PLOT_TOTAL; i++) {
    const p = getFarmPlotRect(i);
    // Dark soil shadow
    rect(ctx, '#261205', p.x - 2, p.y - 1, p.w + 4, p.h + 3);
    // Raised wooden border
    rect(ctx, '#5c3a21', p.x - 2, p.y - 2, p.w + 4, p.h + 4);
    rect(ctx, '#8b5028', p.x - 1, p.y - 1, p.w + 2, p.h + 2);
    // Rich dark planting soil
    rect(ctx, '#543217', p.x + 1, p.y + 1, p.w - 2, p.h - 2);
    // Furrow grooves
    for (let ty = p.y + 5; ty < p.y + p.h - 4; ty += 6) {
      rect(ctx, '#3d200b', p.x + 2, ty, p.w - 4, 2);
      rect(ctx, '#6d4323', p.x + 2, ty + 2, p.w - 4, 1);
    }
  }

  // =========================================================================
  // 6. PERIMETER WOODEN FENCE (Clean post-and-rail with rustic caps)
  // =========================================================================
  const postColor = '#8b5028';
  const postLight = '#ab6938';
  const railColor = '#965325';
  const railLight = '#b56d35';

  const drawFenceLine = (x1: number, y1: number, x2: number, y2: number) => {
    if (y1 === y2) {
      // Horizontal fence rails
      rect(ctx, railColor, x1, y1 + 5, x2 - x1, 3);
      rect(ctx, railLight, x1, y1 + 5, x2 - x1, 1);
      rect(ctx, railColor, x1, y1 + 13, x2 - x1, 3);
      rect(ctx, railLight, x1, y1 + 13, x2 - x1, 1);
      // Posts every 24px
      for (let x = x1; x <= x2; x += 24) {
        rect(ctx, '#451a03', x + 1, y1 + 1, 5, 22);
        rect(ctx, postColor, x, y1, 5, 22);
        rect(ctx, postLight, x, y1, 1, 22);
        // Post pointed cap
        rect(ctx, postLight, x + 1, y1 - 2, 3, 2);
      }
    } else {
      // Vertical fence rails
      rect(ctx, railColor, x1 + 5, y1, 3, y2 - y1);
      rect(ctx, railLight, x1 + 5, y1, 1, y2 - y1);
      rect(ctx, railColor, x1 + 13, y1, 3, y2 - y1);
      rect(ctx, railLight, x1 + 13, y1, 1, y2 - y1);
      // Posts every 24px
      for (let y = y1; y <= y2; y += 24) {
        rect(ctx, '#451a03', x1 + 1, y + 1, 22, 5);
        rect(ctx, postColor, x1, y, 22, 5);
        rect(ctx, postLight, x1, y, 22, 1);
        rect(ctx, postLight, x1 - 2, y + 1, 2, 3);
      }
    }
  };

  // Top fence: from Gate (x: 4.5 * TILE) to East boundary
  drawFenceLine(4.5 * TILE, 0, FARM_WIDTH - 12, 0);
  // Bottom fence
  drawFenceLine(12, FARM_HEIGHT - 22, FARM_WIDTH - 12, FARM_HEIGHT - 22);
  // Right fence
  drawFenceLine(FARM_WIDTH - 22, 0, FARM_WIDTH - 22, FARM_HEIGHT - 22);
  // Left fence: from below Gate (y: 4.5 * TILE) to Bottom
  drawFenceLine(0, 4.5 * TILE, 0, FARM_HEIGHT - 22);

  // =========================================================================
  // 7. TOP-LEFT ENTRANCE GATE ("NÔNG TRẠI" Arch)
  // =========================================================================
  const gateX = 1 * TILE;
  const gateY = 0;
  const gateW = 3.5 * TILE;
  // Left post
  rect(ctx, '#451a03', gateX - 1, gateY, 10, 40);
  rect(ctx, '#8b5028', gateX, gateY, 8, 40);
  rect(ctx, '#c9854e', gateX, gateY, 2, 40);
  // Right post
  rect(ctx, '#451a03', gateX + gateW - 9, gateY, 10, 40);
  rect(ctx, '#8b5028', gateX + gateW - 8, gateY, 8, 40);
  rect(ctx, '#c9854e', gateX + gateW - 8, gateY, 2, 40);
  // Overhead beam
  rect(ctx, '#451a03', gateX - 4, gateY + 4, gateW + 8, 12);
  rect(ctx, '#8b5028', gateX - 2, gateY + 6, gateW + 4, 8);
  rect(ctx, '#c9854e', gateX - 2, gateY + 6, gateW + 4, 2);

  // Hanging Sign "NÔNG TRẠI"
  const signW = gateW - 16;
  const signX = gateX + 8;
  const signY = gateY + 16;
  rect(ctx, '#3f1d0b', signX - 1, signY - 1, signW + 2, 18);
  rect(ctx, '#6d3b19', signX, signY, signW, 16);
  rect(ctx, '#965325', signX + 1, signY + 1, signW - 2, 14);
  // Sign text
  ctx.font = 'bold 8px sans-serif';
  ctx.fillStyle = '#fef08a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NÔNG TRẠI', signX + signW / 2, signY + 8);

  // 2 Lanterns hanging from posts
  for (const lx of [gateX - 8, gateX + gateW + 2]) {
    rect(ctx, '#451a03', lx + 1, gateY + 10, 6, 8);
    rect(ctx, '#fef08a', lx + 2, gateY + 12, 4, 4);
    rect(ctx, '#f59e0b', lx + 3, gateY + 13, 2, 2);
  }

  // =========================================================================
  // 8. CENTER PARK DECOR (Puffy Tree, Wooden Bench & Golden Hay Bales)
  // =========================================================================
  const drawPuffyTree = (tx: number, ty: number, r: number) => {
    // Drop shadow
    oval(ctx, 'rgba(40, 70, 20, 0.45)', tx, ty + r * 0.8, r * 1.1, r * 0.45);
    // Tree trunk
    rect(ctx, '#542d0c', tx - 4, ty, 8, r * 0.8);
    rect(ctx, '#8b5028', tx - 3, ty, 6, r * 0.8);
    rect(ctx, '#c9854e', tx - 3, ty, 2, r * 0.8);
    // 3-tier round puffy foliage
    oval(ctx, '#2d7a22', tx, ty - r * 0.4, r, r * 0.9);
    oval(ctx, '#48a832', tx - 2, ty - r * 0.5, r * 0.85, r * 0.75);
    oval(ctx, '#6bc44e', tx - 4, ty - r * 0.6, r * 0.65, r * 0.55);
  };

  // Center tree
  drawPuffyTree(15.5 * TILE, 14 * TILE, 30);
  // Northeast tree beside pond & lantern
  drawPuffyTree(25.5 * TILE, 5 * TILE, 20);
  // Trees behind northern perimeter fence
  drawPuffyTree(6.5 * TILE, 1 * TILE, 20);
  drawPuffyTree(21.5 * TILE, 1 * TILE, 20);
  drawPuffyTree(32.5 * TILE, 1.2 * TILE, 20);
  drawPuffyTree(42.5 * TILE, 1.5 * TILE, 22);
  // Southeast tree beside field
  drawPuffyTree(33.5 * TILE, 29.5 * TILE, 22);
  // Southwest tree in corner
  drawPuffyTree(1.5 * TILE, 30.5 * TILE, 24);

  // Wooden fence along top rim of pond
  drawFenceLine(27.5 * TILE, 5.2 * TILE, 34 * TILE, 5.2 * TILE);

  // Center wooden signpost
  const spX = 18.5 * TILE;
  const spY = 13.5 * TILE;
  rect(ctx, '#451a03', spX - 2, spY, 4, 22);
  rect(ctx, '#8b5028', spX - 1, spY, 2, 22);
  rect(ctx, '#451a03', spX - 11, spY - 3, 22, 12);
  rect(ctx, '#b45309', spX - 10, spY - 2, 20, 10);
  rect(ctx, '#fef08a', spX - 7, spY + 1, 14, 2);
  rect(ctx, '#fef08a', spX - 4, spY + 5, 8, 2);

  // Decorative fence behind bench
  drawFenceLine(16.5 * TILE, 15.2 * TILE, 19.5 * TILE, 15.2 * TILE);

  // Center Wooden Bench
  const bx = 16.5 * TILE;
  const by = 16.5 * TILE;
  rect(ctx, '#451a03', bx - 2, by + 12, 36, 3); // shadow
  rect(ctx, '#334155', bx + 2, by + 4, 3, 10); // legs
  rect(ctx, '#334155', bx + 29, by + 4, 3, 10);
  rect(ctx, '#8b5028', bx, by, 34, 5); // seat back
  rect(ctx, '#ab6938', bx, by + 1, 34, 2);
  rect(ctx, '#8b5028', bx, by + 5, 34, 5); // seat cushion
  rect(ctx, '#c9854e', bx, by + 5, 34, 2);

  // Golden Hay Bales near center and pen
  const drawHayBale = (hx: number, hy: number) => {
    rect(ctx, '#ca8a04', hx - 1, hy - 1, 26, 20);
    rect(ctx, '#f59e0b', hx, hy, 24, 18);
    rect(ctx, '#fde047', hx + 1, hy + 1, 22, 16);
    // Twine bindings
    rect(ctx, '#854d0e', hx + 6, hy, 2, 18);
    rect(ctx, '#854d0e', hx + 16, hy, 2, 18);
  };
  drawHayBale(20 * TILE, 16 * TILE);

  // Horizontal dividing fence below center park (5 posts)
  drawFenceLine(15 * TILE, 19.5 * TILE, 22 * TILE, 19.5 * TILE);

  return c;
}
