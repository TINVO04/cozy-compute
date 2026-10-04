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
 * Pure Canvas 2D Procedural Farm Landscape Redesign.
 * Matching the exact Cozy Farm visual concept:
 * - Asymmetric, organic layout (goodbye rigid 3x3 dashboard grid!)
 * - Top-left Corner Gate Archway with winding dirt road into farm
 * - Organic Center Heart crossroads with ancient stone well, shady oak tree, bench & bulletin board
 * - North-West standalone Shop with striped awning and produce display
 * - Mid-East standalone Warehouse barn with red tile roof, hay bales & grain sacks
 * - North-East natural curved pond with organic rock shoreline, dock, lilies, rowboat & meandering stream
 * - North Terrace animal pens (distinct Chicken Coop, Pig Pen with mud wallow, Sheep Pasture)
 * - South-East 6 thematic organic crop field patches (Rice, Watermelon, Tomato, Seedlings, Corn, Chili)
 * - South-West rolling green meadow hills with pines, flowers & river stones
 */
let bgImage: HTMLImageElement | null = null;
let bgLoaded = false;
let bgPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

export function isFarmBgLoaded(): boolean {
  return bgLoaded;
}

export function getFarmBgImage(): HTMLImageElement | null {
  return bgImage;
}

export function loadFarmBackground(onLoaded?: () => void): Promise<void> {
  if (onLoaded) {
    if (bgLoaded) onLoaded();
    else listeners.add(onLoaded);
  }
  if (typeof Image === 'undefined') return Promise.resolve();
  if (bgLoaded) return Promise.resolve();
  if (bgPromise) return bgPromise;

  bgPromise = new Promise<void>((resolve) => {
    bgImage = new Image();
    bgImage.onload = () => {
      bgLoaded = true;
      listeners.forEach((fn) => fn());
      listeners.clear();
      resolve();
    };
    bgImage.onerror = () => {
      resolve();
    };
    bgImage.src = '/farm/farm_background.jpg';
  });
  return bgPromise;
}

if (typeof Image !== 'undefined') {
  void loadFarmBackground();
}

export function paintAuthoritativeFarmPlotsField(ctx: CanvasRenderingContext2D): void {
  // 1. Cover the old baked 4x5 plots with lush matching pasture grass
  const fx = 1050;
  const fy = 535;
  const fw = 435;
  const fh = 390;
  ctx.fillStyle = '#5ba83c';
  ctx.fillRect(fx, fy, fw, fh);

  // Subtle grass texture
  const prng = mulberry(20261002);
  for (let i = 0; i < 300; i++) {
    const rx = fx + prng() * fw;
    const ry = fy + prng() * fh;
    ctx.fillStyle = i % 2 === 0 ? '#6dbd47' : '#529b35';
    ctx.fillRect(Math.floor(rx), Math.floor(ry), 3, 2);
  }
  // Wildflower blooms in grass margins
  for (let i = 0; i < 25; i++) {
    const wx = fx + 8 + prng() * (fw - 16);
    const wy = fy + 6 + prng() * (fh - 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(Math.floor(wx), Math.floor(wy), 3, 3);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(Math.floor(wx) + 1, Math.floor(wy) + 1, 1, 1);
  }

  // 2. Draw the 36 authoritative agricultural soil beds
  for (let i = 0; i < FARM_PLOT_TOTAL; i++) {
    const r = getFarmPlotRect(i);
    // Dark earth border
    ctx.fillStyle = '#3f2613';
    ctx.fillRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
    // Rich tilled loam base
    ctx.fillStyle = '#5c381c';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = '#7a4b27';
    ctx.fillRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);

    // Soil furrows
    for (let furrowY = r.y + 6; furrowY < r.y + r.h - 4; furrowY += 8) {
      ctx.fillStyle = '#5c381c';
      ctx.fillRect(r.x + 4, furrowY, r.w - 8, 2);
      ctx.fillStyle = '#8c552b';
      ctx.fillRect(r.x + 4, furrowY + 2, r.w - 8, 2);
    }
  }
}

export function paintFarmLandscape(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = FARM_WIDTH;
  c.height = FARM_HEIGHT;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  if (bgLoaded && bgImage) {
    ctx.drawImage(bgImage, 0, 0, FARM_WIDTH, FARM_HEIGHT);
    paintAuthoritativeFarmPlotsField(ctx);
  } else {
    drawProceduralFarmLandscape(ctx);
  }
  return c;
}

export function drawProceduralFarmLandscape(ctx: CanvasRenderingContext2D): void {
  const rng = mulberry(20261002);

  // =========================================================================
  // 1. BASE MEADOW GRASS & TOPOGRAPHY
  // =========================================================================
  // Primary vibrant pasture green
  rect(ctx, '#5ba83c', 0, 0, FARM_WIDTH, FARM_HEIGHT);

  // Organic soft grass hue variations
  for (let i = 0; i < 180; i++) {
    const gx = rng() * FARM_WIDTH;
    const gy = rng() * FARM_HEIGHT;
    const rx = 35 + rng() * 80;
    const ry = 25 + rng() * 50;
    oval(ctx, i % 2 === 0 ? '#6dbd47' : '#529b35', gx, gy, rx, ry);
  }

  // Top Cliff Ridge / Terrace framing the northern enclosures
  rect(ctx, '#382517', 0, 0, FARM_WIDTH, 1.2 * TILE);
  rect(ctx, '#523720', 0, 0.2 * TILE, FARM_WIDTH, 0.8 * TILE);
  rect(ctx, '#6e4b2c', 0, 0.4 * TILE, FARM_WIDTH, 0.4 * TILE);
  rect(ctx, '#478c2e', 0, 1.1 * TILE, FARM_WIDTH, 4);
  rect(ctx, '#6dbd47', 0, 1.2 * TILE, FARM_WIDTH, 2);

  // South-West stepped grassy hill ledges
  const drawHillLedge = (x: number, y: number, w: number, h: number) => {
    oval(ctx, '#382517', x, y + h, w / 2, 10);
    oval(ctx, '#523720', x, y + h - 4, w / 2 - 2, 8);
    oval(ctx, '#529b35', x, y + h / 2, w / 2, h / 2);
    oval(ctx, '#6dbd47', x, y + h / 2 - 4, w / 2 - 6, h / 2 - 6);
  };
  drawHillLedge(3 * TILE, 22 * TILE, 7 * TILE, 4 * TILE);
  drawHillLedge(2 * TILE, 28 * TILE, 8 * TILE, 5 * TILE);

  // Pixel grass blades & clover tufts
  for (let i = 0; i < 1600; i++) {
    const x = Math.floor(rng() * FARM_WIDTH);
    const y = Math.floor(rng() * FARM_HEIGHT);
    rect(ctx, '#478c2e', x, y, 3, 2);
    rect(ctx, '#76c450', x, y - 1, 2, 1);
  }

  // Wildflower blooms
  for (let i = 0; i < 320; i++) {
    const fx = Math.floor(rng() * (FARM_WIDTH - 60)) + 30;
    const fy = Math.floor(rng() * (FARM_HEIGHT - 60)) + 30;
    const flowerType = i % 3;
    if (flowerType === 0) {
      rect(ctx, '#ffffff', fx - 2, fy - 1, 5, 3);
      rect(ctx, '#ffffff', fx - 1, fy - 2, 3, 5);
      rect(ctx, '#fde047', fx, fy, 1, 1);
    } else if (flowerType === 1) {
      oval(ctx, '#f472b6', fx, fy, 3, 3);
      rect(ctx, '#fbcfe8', fx - 1, fy - 1, 2, 2);
    } else {
      oval(ctx, '#facc15', fx, fy, 3, 3);
      rect(ctx, '#fef08a', fx, fy, 1, 1);
    }
  }

  // =========================================================================
  // 2. WINDING WARM SANDY DIRT ROAD NETWORK
  // =========================================================================
  const drawWindingPath = (points: [number, number, number][]) => {
    for (const [x, y, r] of points) {
      oval(ctx, '#9c7336', x, y, r + 4, r + 4);
    }
    for (const [x, y, r] of points) {
      oval(ctx, '#cca05b', x, y, r + 2, r + 2);
    }
    for (const [x, y, r] of points) {
      oval(ctx, '#e5b974', x, y, r, r);
    }
    for (const [x, y, r] of points) {
      for (let p = 0; p < 4; p++) {
        const px = x + (rng() - 0.5) * r * 1.5;
        const py = y + (rng() - 0.5) * r * 1.5;
        rect(ctx, rng() > 0.5 ? '#f3cb8a' : '#baa06b', px, py, 2, 1);
      }
    }
  };

  // 2.1 Main Gate Entrance to Shop and Center Crossroads
  const mainRoad: [number, number, number][] = [];
  for (let x = 0; x <= 5.5 * TILE; x += 6) {
    mainRoad.push([x, 3.5 * TILE, 26]);
  }
  for (let t = 0; t <= 1; t += 0.05) {
    const x = (5.5 + t * 1.5) * TILE;
    const y = (3.5 + t * 6.5) * TILE;
    mainRoad.push([x, y, 26]);
  }
  for (let x = 3.5 * TILE; x <= 8.5 * TILE; x += 8) {
    mainRoad.push([x, 10.5 * TILE, 24]);
  }
  for (let t = 0; t <= 1; t += 0.04) {
    const x = (7 + t * 13) * TILE;
    const y = (10.5 + Math.sin(t * Math.PI) * 1.5 + t * 3.5) * TILE;
    mainRoad.push([x, y, 28]);
  }
  drawWindingPath(mainRoad);

  // 2.2 Northern Avenue to Animal Pens & Pond Dock
  const northAvenue: [number, number, number][] = [];
  for (let t = 0; t <= 1; t += 0.05) {
    const x = (18 - t * 4) * TILE;
    const y = (13 - t * 5.5) * TILE;
    northAvenue.push([x, y, 24]);
  }
  for (let x = 9.5 * TILE; x <= 29 * TILE; x += 8) {
    northAvenue.push([x, 7.5 * TILE, 22]);
  }
  for (let t = 0; t <= 1; t += 0.05) {
    const x = (29 + t * 4) * TILE;
    const y = (7.5 + t * 2) * TILE;
    northAvenue.push([x, y, 22]);
  }
  drawWindingPath(northAvenue);

  // 2.3 Eastern Road from Center Heart to Warehouse Barn
  const eastRoad: [number, number, number][] = [];
  for (let x = 24 * TILE; x <= 40 * TILE; x += 8) {
    const y = (14 + Math.sin(((x - 24 * TILE) / (16 * TILE)) * Math.PI) * 0.5) * TILE;
    eastRoad.push([x, y, 26]);
  }
  drawWindingPath(eastRoad);

  // 2.4 South-East Crop Fields Pathway Network
  const fieldPaths: [number, number, number][] = [];
  for (let y = 14 * TILE; y <= 31 * TILE; y += 8) {
    fieldPaths.push([34 * TILE, y, 22]);
  }
  for (let x = 25 * TILE; x <= 46 * TILE; x += 8) {
    fieldPaths.push([x, 23.5 * TILE, 22]);
  }
  for (let x = 25 * TILE; x <= 46 * TILE; x += 10) {
    fieldPaths.push([x, 30.5 * TILE, 20]);
  }
  drawWindingPath(fieldPaths);

  // 2.5 South-West Nature Trail
  const natureTrail: [number, number, number][] = [];
  for (let t = 0; t <= 1; t += 0.04) {
    const x = (6.5 + Math.sin(t * Math.PI * 2) * 2) * TILE;
    const y = (11 + t * 16) * TILE;
    natureTrail.push([x, y, 20]);
  }
  drawWindingPath(natureTrail);

  // 2.6 Center Heart Crossroads Open Plaza
  const heartCx = 22.5 * TILE;
  const heartCy = 14.5 * TILE;
  oval(ctx, '#9c7336', heartCx, heartCy, 120, 68);
  oval(ctx, '#cca05b', heartCx, heartCy, 116, 64);
  oval(ctx, '#e5b974', heartCx, heartCy, 112, 60);
  oval(ctx, '#478c2e', heartCx, heartCy - 2, 78, 42);
  oval(ctx, '#5ba83c', heartCx, heartCy - 4, 76, 40);
  oval(ctx, '#6dbd47', heartCx, heartCy - 6, 70, 36);

  // =========================================================================
  // 3. AQUACULTURE POND (Natural Organic Curved Lake with Stream)
  // =========================================================================
  const pond = FARM_POIS.aquaculture_pond;
  const pcx = pond.x + pond.w / 2;
  const pcy = pond.y + pond.h / 2;

  // Meandering natural stream flowing out north-east
  for (let t = 0; t <= 1; t += 0.05) {
    const sx = (39 + t * 9) * TILE;
    const sy = (4 - t * 4) * TILE;
    const sr = 18 - t * 4;
    oval(ctx, '#1e293b', sx, sy, sr + 4, sr + 3);
    oval(ctx, '#3898cb', sx, sy, sr, sr - 1);
    oval(ctx, '#60a5fa', sx, sy, sr - 4, sr - 3);
  }

  // Pond drop shadow
  oval(ctx, 'rgba(40, 70, 20, 0.4)', pcx + 4, pcy + 8, pond.w / 2 + 16, pond.h / 2 + 12);

  // Natural organic curved water basin (curved kidney/teardrop shape)
  oval(ctx, '#1e293b', pcx, pcy, pond.w / 2 + 4, pond.h / 2 + 4);
  oval(ctx, '#1e40af', pcx - 12, pcy, pond.w / 2 - 18, pond.h / 2 - 10);
  oval(ctx, '#2596be', pcx - 12, pcy, pond.w / 2 - 16, pond.h / 2 - 8);
  oval(ctx, '#3898cb', pcx - 16, pcy - 4, pond.w / 2 - 24, pond.h / 2 - 14);
  oval(ctx, '#48b3e8', pcx - 18, pcy - 8, pond.w / 2 - 34, pond.h / 2 - 20);

  // Natural organic river boulders around shoreline
  for (let a = 0; a < Math.PI * 2; a += 0.13) {
    const radiusNoise = Math.sin(a * 4) * 8 + Math.cos(a * 7) * 6;
    const stoneDistX = (pond.w / 2 - 5 + radiusNoise) * Math.cos(a);
    const stoneDistY = (pond.h / 2 - 4 + radiusNoise * 0.6) * Math.sin(a);
    const bx = pcx + stoneDistX;
    const by = pcy + stoneDistY;
    const sR = 6 + (Math.sin(a * 8) > 0 ? 3 : 0) + (Math.cos(a * 5) > 0.5 ? 2 : 0);

    // Natural stone shading
    oval(ctx, '#0f172a', bx + 1, by + 1, sR + 1, sR);
    oval(ctx, '#334155', bx, by, sR, sR - 1);
    oval(ctx, '#64748b', bx - 1, by - 1, sR - 2, sR - 2);
    oval(ctx, '#94a3b8', bx - 2, by - 2, sR - 4, sR - 4);

    // Moss / grass tuft on some stones
    if (Math.sin(a * 11) > 0.4) {
      rect(ctx, '#478c2e', bx - 1, by - sR, 3, 2);
      rect(ctx, '#6dbd47', bx, by - sR - 1, 2, 1);
    }
  }

  // Sparkling wave reflections
  const pondRipples: [number, number, number][] = [
    [pcx - 55, pcy - 16, 22],
    [pcx + 20, pcy - 28, 28],
    [pcx - 30, pcy + 18, 32],
    [pcx + 40, pcy + 10, 20],
    [pcx - 5, pcy - 6, 36],
  ];
  for (const [rx, ry, rw] of pondRipples) {
    rect(ctx, '#bae6fd', rx - rw / 2, ry, rw, 1);
    rect(ctx, '#ffffff', rx - rw / 4, ry, rw / 2, 1);
  }

  // Floating green lily pads with pink & white lotus blossoms
  const lilyPads: [number, number, boolean][] = [
    [pcx - 65, pcy + 8, true],
    [pcx - 48, pcy - 22, false],
    [pcx - 22, pcy - 32, true],
    [pcx + 18, pcy - 30, false],
    [pcx + 50, pcy - 14, true],
    [pcx - 70, pcy - 8, false],
    [pcx - 15, pcy + 22, true],
    [pcx + 30, pcy + 18, false],
  ];
  for (const [lx, ly, hasFlower] of lilyPads) {
    oval(ctx, '#15803d', lx, ly, 10, 7);
    oval(ctx, '#22c55e', lx - 1, ly - 1, 8, 5);
    rect(ctx, '#3898cb', lx + 4, ly, 4, 2);
    if (hasFlower) {
      oval(ctx, '#f472b6', lx - 1, ly - 3, 5, 5);
      oval(ctx, '#ffffff', lx - 1, ly - 4, 3, 3);
      rect(ctx, '#fbbf24', lx - 1, ly - 4, 2, 2);
    }
  }

  // Wooden Fishing Pier / Dock on left bank of pond
  const dockX = pcx - pond.w / 2 + 16;
  const dockY = pcy - 12;
  const dockW = 46;
  const dockH = 28;
  rect(ctx, '#542d0c', dockX + 4, dockY + dockH, 6, 14);
  rect(ctx, '#542d0c', dockX + dockW - 10, dockY + dockH, 6, 14);
  rect(ctx, '#542d0c', dockX, dockY, dockW, dockH);
  rect(ctx, '#8b5028', dockX + 2, dockY + 2, dockW - 4, dockH - 4);
  for (let py = dockY + 4; py < dockY + dockH - 4; py += 6) {
    rect(ctx, '#ab6938', dockX + 2, py, dockW - 4, 4);
    rect(ctx, '#542d0c', dockX + 2, py + 4, dockW - 4, 1);
  }
  rect(ctx, '#8b5028', dockX - 2, dockY + dockH - 8, 5, 10);
  rect(ctx, '#c9854e', dockX - 1, dockY + dockH - 7, 2, 2);
  rect(ctx, '#8b5028', dockX + dockW - 3, dockY + dockH - 8, 5, 10);
  rect(ctx, '#c9854e', dockX + dockW - 2, dockY + dockH - 7, 2, 2);

  // Small wooden rowboat moored on east bank
  const boatX = pcx + pond.w / 2 - 42;
  const boatY = pcy + 4;
  rect(ctx, '#451a03', boatX - 2, boatY - 2, 26, 44);
  rect(ctx, '#78350f', boatX, boatY, 22, 40);
  rect(ctx, '#b45309', boatX + 2, boatY + 2, 18, 36);
  rect(ctx, '#451a03', boatX + 4, boatY + 4, 14, 32);
  rect(ctx, '#d4a373', boatX + 4, boatY + 18, 14, 6);
  rect(ctx, '#fde047', boatX - 6, boatY + 14, 30, 2);
  rect(ctx, '#ca8a04', boatX + 22, boatY + 12, 4, 6);

  // =========================================================================
  // 4. NORTH TERRACE ANIMAL ENCLOSURES SURFACING
  // =========================================================================
  // 4.1 Chicken Coop Ground (North-West)
  const poultry = FARM_POIS.poultry_coop;
  rect(ctx, '#cca05b', poultry.x, poultry.y, poultry.w, poultry.h);
  rect(ctx, '#e0b875', poultry.x + 2, poultry.y + 2, poultry.w - 4, poultry.h - 4);
  for (let s = 0; s < 100; s++) {
    rect(
      ctx,
      s % 2 === 0 ? '#fef08a' : '#b45309',
      poultry.x + rng() * poultry.w,
      poultry.y + rng() * poultry.h,
      3,
      1,
    );
  }

  // 4.2 Pig Pen Ground (North-Center) with organic mud wallow
  const pig = FARM_POIS.pig_pen;
  rect(ctx, '#cca05b', pig.x, pig.y, pig.w, pig.h);
  rect(ctx, '#d4a373', pig.x + 2, pig.y + 2, pig.w - 4, pig.h - 4);
  oval(ctx, '#542d0c', pig.x + pig.w * 0.48, pig.y + pig.h * 0.52, pig.w * 0.36, pig.h * 0.34);
  oval(ctx, '#3f1d0b', pig.x + pig.w * 0.48, pig.y + pig.h * 0.52, pig.w * 0.28, pig.h * 0.24);
  oval(ctx, '#261205', pig.x + pig.w * 0.48, pig.y + pig.h * 0.52, pig.w * 0.16, pig.h * 0.14);

  // 4.3 Sheep Pasture Ground (North-East) with golden hay & clover
  const goat = FARM_POIS.goat_pen;
  rect(ctx, '#529b35', goat.x, goat.y, goat.w, goat.h);
  rect(ctx, '#68b643', goat.x + 2, goat.y + 2, goat.w - 4, goat.h - 4);
  for (let s = 0; s < 90; s++) {
    rect(ctx, s % 2 === 0 ? '#fde047' : '#86efac', goat.x + rng() * goat.w, goat.y + rng() * goat.h, 3, 1);
  }

  // =========================================================================
  // 5. SOUTH-EAST 6 THEMATIC ORGANIC CROP FIELD PATCHES
  // =========================================================================
  const patches = [
    {
      name: 'Rice Paddy',
      rect: { x: 25.5 * TILE, y: 16.5 * TILE, w: 7 * TILE, h: 6.5 * TILE },
      soil: '#543217',
      crop: 'rice',
    },
    {
      name: 'Watermelon Patch',
      rect: { x: 33 * TILE, y: 16.5 * TILE, w: 6.5 * TILE, h: 6.5 * TILE },
      soil: '#543217',
      crop: 'melon',
    },
    {
      name: 'Tomato Trellis',
      rect: { x: 40 * TILE, y: 16.5 * TILE, w: 6.5 * TILE, h: 6.5 * TILE },
      soil: '#543217',
      crop: 'tomato',
    },
    {
      name: 'Seedling Beds',
      rect: { x: 25 * TILE, y: 24 * TILE, w: 9 * TILE, h: 6.5 * TILE },
      soil: '#543217',
      crop: 'sprout',
    },
    {
      name: 'Sweet Corn Rows',
      rect: { x: 34.5 * TILE, y: 24 * TILE, w: 6 * TILE, h: 6.5 * TILE },
      soil: '#543217',
      crop: 'corn',
    },
    {
      name: 'Chili & Berry Patch',
      rect: { x: 41 * TILE, y: 24 * TILE, w: 5.5 * TILE, h: 6.5 * TILE },
      soil: '#543217',
      crop: 'chili',
    },
  ];

  for (const patch of patches) {
    const pr = patch.rect;
    // Soft soil bed shadow
    rect(ctx, 'rgba(40, 70, 20, 0.35)', pr.x - 2, pr.y - 1, pr.w + 4, pr.h + 4);
    // Raised rustic timber border
    rect(ctx, '#451a03', pr.x - 2, pr.y - 2, pr.w + 4, pr.h + 4);
    rect(ctx, '#8b5028', pr.x - 1, pr.y - 1, pr.w + 2, pr.h + 2);
    rect(ctx, '#ab6938', pr.x, pr.y, pr.w, 2);
    // Rich fertile planting soil
    rect(ctx, patch.soil, pr.x + 2, pr.y + 2, pr.w - 4, pr.h - 4);

    // Deep tilled furrow lines
    for (let fy = pr.y + 8; fy < pr.y + pr.h - 6; fy += 8) {
      rect(ctx, '#3f210d', pr.x + 4, fy, pr.w - 8, 3);
      rect(ctx, '#73461e', pr.x + 4, fy + 3, pr.w - 8, 1);
    }

    // Wooden Patch Marker Signpost
    const sx = pr.x + 8;
    const sy = pr.y + 6;
    rect(ctx, '#451a03', sx - 1, sy, 3, 14);
    rect(ctx, '#b45309', sx - 5, sy - 7, 12, 8);
    rect(ctx, '#fef08a', sx - 3, sy - 5, 8, 4);

    // Thematic border plant decorations
    if (patch.crop === 'rice') {
      for (let rx = pr.x + 24; rx < pr.x + pr.w - 8; rx += 14) {
        rect(ctx, '#eab308', rx, pr.y + 4, 2, 7);
        rect(ctx, '#fde047', rx + 1, pr.y + 2, 3, 3);
      }
    } else if (patch.crop === 'melon') {
      for (let mx = pr.x + 24; mx < pr.x + pr.w - 8; mx += 20) {
        oval(ctx, '#15803d', mx, pr.y + 6, 4, 3);
        rect(ctx, '#166534', mx - 2, pr.y + 5, 1, 3);
      }
    } else if (patch.crop === 'tomato') {
      for (let tx = pr.x + 22; tx < pr.x + pr.w - 8; tx += 16) {
        rect(ctx, '#15803d', tx, pr.y + 3, 2, 6);
        oval(ctx, '#dc2626', tx + 2, pr.y + 6, 3, 3);
      }
    } else if (patch.crop === 'corn') {
      for (let cx = pr.x + 22; cx < pr.x + pr.w - 8; cx += 16) {
        rect(ctx, '#15803d', cx, pr.y + 2, 2, 8);
        rect(ctx, '#facc15', cx + 1, pr.y + 4, 3, 4);
      }
    }
  }

  // =========================================================================
  // 6. CENTER HEART PROPS (Ancient Well, Leafy Oak Tree, Bench & Board)
  // =========================================================================
  // 6.1 Ancient Stone Water Well (x: 19 * TILE, y: 14 * TILE)
  const wellX = 19 * TILE;
  const wellY = 14 * TILE;
  oval(ctx, 'rgba(30, 50, 20, 0.4)', wellX + 2, wellY + 12, 22, 12);
  oval(ctx, '#475569', wellX, wellY, 20, 14);
  oval(ctx, '#64748b', wellX, wellY, 18, 12);
  oval(ctx, '#94a3b8', wellX - 1, wellY - 1, 16, 10);
  oval(ctx, '#cbd5e1', wellX - 2, wellY - 2, 14, 8);
  oval(ctx, '#0f172a', wellX, wellY, 12, 7);
  oval(ctx, '#0284c7', wellX, wellY, 10, 5);
  oval(ctx, '#38bdf8', wellX - 2, wellY - 1, 6, 2);
  for (let a = 0; a < Math.PI * 2; a += 0.5) {
    const wx = wellX + Math.cos(a) * 17;
    const wy = wellY + Math.sin(a) * 11;
    rect(ctx, '#334155', wx - 1, wy - 1, 3, 3);
  }
  rect(ctx, '#451a03', wellX - 14, wellY - 24, 4, 24);
  rect(ctx, '#8b5028', wellX - 13, wellY - 24, 2, 24);
  rect(ctx, '#451a03', wellX + 10, wellY - 24, 4, 24);
  rect(ctx, '#8b5028', wellX + 11, wellY - 24, 2, 24);
  rect(ctx, '#7f1d1d', wellX - 18, wellY - 30, 36, 8);
  rect(ctx, '#c43c35', wellX - 17, wellY - 29, 34, 6);
  rect(ctx, '#df524b', wellX - 16, wellY - 29, 32, 2);
  rect(ctx, '#ca8a04', wellX - 4, wellY - 22, 8, 4);
  rect(ctx, '#78350f', wellX + 16, wellY + 2, 8, 10);
  rect(ctx, '#38bdf8', wellX + 17, wellY + 3, 6, 3);

  // Helper for drawing puffy, multi-lobed deciduous tree foliage
  const drawOakFoliageClump = (clumpX: number, clumpY: number, rx: number, ry: number) => {
    oval(ctx, '#164e12', clumpX, clumpY, rx + 1, ry + 1);
    oval(ctx, '#2d7a22', clumpX, clumpY - 1, rx, ry);
    oval(ctx, '#48a832', clumpX - 2, clumpY - 2, rx - 3, ry - 3);
    oval(ctx, '#6bc44e', clumpX - 3, clumpY - 3, rx - 6, ry - 5);
    rect(ctx, '#86efac', clumpX - 4, clumpY - 4, 3, 2);
    rect(ctx, '#86efac', clumpX - 1, clumpY - ry + 4, 2, 2);
  };

  // 6.2 Shady Big Oak Tree (x: 24.5 * TILE, y: 13.5 * TILE)
  const treeX = 24.5 * TILE;
  const treeY = 13.5 * TILE;
  // Broad tree drop shadow
  oval(ctx, 'rgba(30, 60, 15, 0.45)', treeX, treeY + 20, 52, 22);
  // Thick gnarled trunk & spreading roots
  rect(ctx, '#451a03', treeX - 9, treeY - 8, 18, 30);
  rect(ctx, '#78350f', treeX - 7, treeY - 8, 14, 30);
  rect(ctx, '#b45309', treeX - 6, treeY - 8, 4, 30);
  rect(ctx, '#451a03', treeX - 16, treeY + 16, 10, 6);
  rect(ctx, '#451a03', treeX + 6, treeY + 16, 10, 6);
  // Gnarled branches
  rect(ctx, '#451a03', treeX - 18, treeY - 18, 14, 6);
  rect(ctx, '#78350f', treeX - 16, treeY - 17, 12, 4);
  rect(ctx, '#451a03', treeX + 6, treeY - 16, 16, 6);
  rect(ctx, '#78350f', treeX + 8, treeY - 15, 14, 4);

  // Multi-lobed puffy oak canopy
  drawOakFoliageClump(treeX - 24, treeY - 14, 20, 18);
  drawOakFoliageClump(treeX + 24, treeY - 12, 20, 18);
  drawOakFoliageClump(treeX - 18, treeY - 32, 22, 20);
  drawOakFoliageClump(treeX + 18, treeY - 30, 22, 20);
  drawOakFoliageClump(treeX, treeY - 44, 24, 22);
  drawOakFoliageClump(treeX, treeY - 22, 26, 22);

  // 6.3 Wooden Park Bench (x: 22 * TILE, y: 15.5 * TILE)
  const bx = 22 * TILE;
  const by = 15.5 * TILE;
  rect(ctx, 'rgba(40, 70, 20, 0.4)', bx - 2, by + 12, 36, 4);
  rect(ctx, '#334155', bx + 2, by + 4, 3, 10);
  rect(ctx, '#334155', bx + 29, by + 4, 3, 10);
  rect(ctx, '#8b5028', bx, by, 34, 5);
  rect(ctx, '#ab6938', bx, by + 1, 34, 2);
  rect(ctx, '#8b5028', bx, by + 5, 34, 5);
  rect(ctx, '#c9854e', bx, by + 5, 34, 2);

  // 6.4 Wooden Notice / Bulletin Board (x: 26.5 * TILE, y: 15 * TILE)
  const nbX = 26.5 * TILE;
  const nbY = 15 * TILE;
  rect(ctx, '#451a03', nbX - 10, nbY + 4, 3, 16);
  rect(ctx, '#451a03', nbX + 8, nbY + 4, 3, 16);
  rect(ctx, '#451a03', nbX - 14, nbY - 10, 28, 18);
  rect(ctx, '#78350f', nbX - 13, nbY - 9, 26, 16);
  rect(ctx, '#b45309', nbX - 11, nbY - 7, 22, 12);
  rect(ctx, '#ffffff', nbX - 9, nbY - 5, 6, 6);
  rect(ctx, '#fef08a', nbX - 1, nbY - 5, 8, 7);
  rect(ctx, '#ffffff', nbX + 2, nbY - 3, 5, 4);

  // =========================================================================
  // 7. TOP-LEFT ENTRANCE GATE ("NÔNG TRẠI" ARCHWAY)
  // =========================================================================
  const gateX = 1 * TILE;
  const gateY = 1.6 * TILE;
  const gateW = 3.5 * TILE;
  rect(ctx, '#451a03', gateX - 1, gateY, 10, 42);
  rect(ctx, '#8b5028', gateX, gateY, 8, 42);
  rect(ctx, '#c9854e', gateX, gateY, 2, 42);
  rect(ctx, '#451a03', gateX + gateW - 9, gateY, 10, 42);
  rect(ctx, '#8b5028', gateX + gateW - 8, gateY, 8, 42);
  rect(ctx, '#c9854e', gateX + gateW - 8, gateY, 2, 42);
  rect(ctx, '#451a03', gateX - 4, gateY + 4, gateW + 8, 12);
  rect(ctx, '#8b5028', gateX - 2, gateY + 6, gateW + 4, 8);
  rect(ctx, '#c9854e', gateX - 2, gateY + 6, gateW + 4, 2);

  const gSignW = gateW - 16;
  const gSignX = gateX + 8;
  const gSignY = gateY + 16;
  rect(ctx, '#3f1d0b', gSignX - 1, gSignY - 1, gSignW + 2, 18);
  rect(ctx, '#6d3b19', gSignX, gSignY, gSignW, 16);
  rect(ctx, '#965325', gSignX + 1, gSignY + 1, gSignW - 2, 14);
  ctx.font = 'bold 8px sans-serif';
  ctx.fillStyle = '#fef08a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NÔNG TRẠI', gSignX + gSignW / 2, gSignY + 8);

  for (const lx of [gateX - 8, gateX + gateW + 2]) {
    rect(ctx, '#451a03', lx + 1, gateY + 10, 6, 8);
    rect(ctx, '#fef08a', lx + 2, gateY + 12, 4, 4);
    rect(ctx, '#f59e0b', lx + 3, gateY + 13, 2, 2);
  }

  const drawFenceLine = (x1: number, y1: number, x2: number, y2: number) => {
    if (y1 === y2) {
      rect(ctx, '#8b5028', x1, y1 + 5, x2 - x1, 3);
      rect(ctx, '#b56d35', x1, y1 + 5, x2 - x1, 1);
      rect(ctx, '#8b5028', x1, y1 + 13, x2 - x1, 3);
      rect(ctx, '#b56d35', x1, y1 + 13, x2 - x1, 1);
      for (let x = x1; x <= x2; x += 24) {
        rect(ctx, '#451a03', x + 1, y1 + 1, 5, 22);
        rect(ctx, '#8b5028', x, y1, 5, 22);
        rect(ctx, '#ab6938', x, y1, 1, 22);
      }
    } else {
      rect(ctx, '#8b5028', x1 + 5, y1, 3, y2 - y1);
      rect(ctx, '#b56d35', x1 + 5, y1, 1, y2 - y1);
      rect(ctx, '#8b5028', x1 + 13, y1, 3, y2 - y1);
      rect(ctx, '#b56d35', x1 + 13, y1, 1, y2 - y1);
      for (let y = y1; y <= y2; y += 24) {
        rect(ctx, '#451a03', x1 + 1, y + 1, 22, 5);
        rect(ctx, '#8b5028', x1, y, 22, 5);
        rect(ctx, '#ab6938', x1, y, 22, 1);
      }
    }
  };

  drawFenceLine(4.5 * TILE, 0, FARM_WIDTH - 12, 0);
  drawFenceLine(12, FARM_HEIGHT - 22, FARM_WIDTH - 12, FARM_HEIGHT - 22);
  drawFenceLine(FARM_WIDTH - 22, 0, FARM_WIDTH - 22, FARM_HEIGHT - 22);
  drawFenceLine(0, 5 * TILE, 0, FARM_HEIGHT - 22);

  // =========================================================================
  // 8. NATURE TREES, ROCKS & SHRUBS
  // =========================================================================
  const drawConiferTree = (tx: number, ty: number) => {
    oval(ctx, 'rgba(30, 50, 15, 0.4)', tx, ty + 24, 18, 8);
    rect(ctx, '#451a03', tx - 3, ty + 12, 6, 14);
    for (let tier = 0; tier < 3; tier++) {
      const topY = ty - 16 + tier * 10;
      const w = 24 - tier * 4;
      ctx.beginPath();
      ctx.moveTo(tx, topY - 12);
      ctx.lineTo(tx - w / 2, topY + 8);
      ctx.lineTo(tx + w / 2, topY + 8);
      ctx.closePath();
      ctx.fillStyle = tier === 0 ? '#15803d' : tier === 1 ? '#166534' : '#14532d';
      ctx.fill();
    }
  };

  const drawDeciduousTree = (tx: number, ty: number, r: number) => {
    oval(ctx, 'rgba(40, 70, 20, 0.45)', tx, ty + r * 0.8, r * 1.1, r * 0.45);
    rect(ctx, '#542d0c', tx - 4, ty, 8, r * 0.8);
    rect(ctx, '#8b5028', tx - 3, ty, 6, r * 0.8);
    drawOakFoliageClump(tx - r * 0.35, ty - r * 0.2, r * 0.65, r * 0.55);
    drawOakFoliageClump(tx + r * 0.35, ty - r * 0.2, r * 0.65, r * 0.55);
    drawOakFoliageClump(tx, ty - r * 0.5, r * 0.75, r * 0.65);
  };

  drawConiferTree(2.5 * TILE, 20 * TILE);
  drawConiferTree(1.5 * TILE, 26 * TILE);
  drawConiferTree(7 * TILE, 28 * TILE);
  drawConiferTree(10 * TILE, 25 * TILE);

  drawDeciduousTree(8.5 * TILE, 3.5 * TILE, 24);
  drawDeciduousTree(29.5 * TILE, 4 * TILE, 22);
  drawDeciduousTree(43.5 * TILE, 2.5 * TILE, 26);
  drawDeciduousTree(46 * TILE, 8 * TILE, 24);
  drawDeciduousTree(1.5 * TILE, 12 * TILE, 22);
  drawDeciduousTree(13 * TILE, 20 * TILE, 20);

  const drawRockCluster = (rx: number, ry: number) => {
    oval(ctx, '#334155', rx + 1, ry + 1, 13, 9);
    oval(ctx, '#475569', rx, ry, 12, 8);
    oval(ctx, '#64748b', rx - 1, ry - 1, 10, 6);
    oval(ctx, '#94a3b8', rx - 2, ry - 2, 7, 4);
    oval(ctx, '#cbd5e1', rx - 3, ry - 3, 4, 2);
    oval(ctx, '#334155', rx + 13, ry + 4, 8, 6);
    oval(ctx, '#475569', rx + 12, ry + 3, 7, 5);
    oval(ctx, '#94a3b8', rx + 11, ry + 2, 5, 3);
  };

  drawRockCluster(6 * TILE, 14 * TILE);
  drawRockCluster(14 * TILE, 18 * TILE);
  drawRockCluster(21 * TILE, 19 * TILE);
  drawRockCluster(32 * TILE, 11 * TILE);
}
