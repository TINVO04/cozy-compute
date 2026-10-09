import { FARM_POIS, getFarmPlotRect } from '@cozy/game-data';
import { farmBuilding, paintFarmPen } from './farm-scenery';
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
 * 1. Quầy Bán Hàng (Tiệm Nông Nghiệp Bác Sáu).
 * Modular artwork aligned with the authoritative footprint.
 */
export function paintShopBacSau(): HTMLCanvasElement {
  const p = FARM_POIS.shop_bac_sau;
  return farmBuilding(p, 'TIỆM BÁC SÁU', 0xaf7057);
}

/**
 * 2. Nhà Kho Nông Sản Silo.
 * Modular artwork aligned with the authoritative footprint.
 */
export function paintSiloWarehouse(): HTMLCanvasElement {
  const p = FARM_POIS.silo_warehouse;
  return farmBuilding(p, 'KHO NÔNG SẢN', 0x778767, true);
}

/**
 * 3. Chuồng Gà (Poultry Coop).
 * Modular artwork aligned with the authoritative footprint.
 */
export function paintPoultryCoop(): HTMLCanvasElement {
  const p = FARM_POIS.poultry_coop;
  return paintFarmPen(p, '#ad7659', 'poultry');
}

/**
 * 4. Chuồng Heo (Pig Pen).
 * Modular artwork aligned with the authoritative footprint.
 */
export function paintPigPen(): HTMLCanvasElement {
  const p = FARM_POIS.pig_pen;
  return paintFarmPen(p, '#b48069', 'pig');
}

/**
 * 5. Chuồng Cừu (Sheep & Goat Pen).
 * Modular artwork aligned with the authoritative footprint.
 */
export function paintGoatPen(): HTMLCanvasElement {
  const p = FARM_POIS.goat_pen;
  return paintFarmPen(p, '#82916b', 'goat');
}

/**
 * 6. Chuồng Bò (Cattle Pasture).
 * Modular artwork aligned with the authoritative footprint.
 */
export function paintCattlePasture(): HTMLCanvasElement {
  const p = FARM_POIS.cattle_pasture;
  return paintFarmPen(p, '#a47658', 'cattle');
}

/**
 * 7. Guồng Nước Sục Khí Ao Cá (Waterwheel Aerator).
 * Authentic rotating 4-paddle waterwheel aerator with water foam spray:
 * - Floating pontoons and drive shaft motor
 * - 4 aeration paddle blades throwing crystalline water droplets
 */
export function paintWaterwheelAerator(angle = 0): HTMLCanvasElement {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const cx = size / 2;
  const cy = size / 2;

  // 1. Water foam circle
  ctx.fillStyle = 'rgba(224, 242, 254, 0.7)';
  ctx.beginPath();
  ctx.arc(cx, cy + 6, 22, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy + 6, 16, 0, Math.PI * 2);
  ctx.fill();

  // 2. Rotating Wheel Hub & Paddles
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((angle * Math.PI) / 180);

  // 4 Paddle blades
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    // Paddle spoke
    rect(ctx, '#0284c7', -2, -18, 4, 18);
    rect(ctx, '#38bdf8', -1, -18, 2, 18);
    // Perforated aeration paddle blade
    rect(ctx, '#f8fafc', -7, -22, 14, 6);
    rect(ctx, '#38bdf8', -6, -21, 12, 4);
    rect(ctx, '#ffffff', -4, -20, 2, 2);
    rect(ctx, '#ffffff', 2, -20, 2, 2);
  }

  // Center brass axis hub
  oval(ctx, '#0f172a', 0, 0, 6, 6);
  oval(ctx, '#ca8a04', 0, 0, 4, 4);
  oval(ctx, '#eed58c', 0, 0, 2, 2);
  ctx.restore();

  // 3. Spray droplets flung into air
  for (let d = 0; d < 8; d++) {
    const da = ((angle + d * 45) * Math.PI) / 180;
    const dr = 18 + ((d * 7) % 8);
    rect(ctx, '#ffffff', Math.round(cx + Math.cos(da) * dr), Math.round(cy + Math.sin(da) * dr), 2, 2);
  }

  return c;
}

/**
 * 8. Dynamic Plot Crop Renderer.
 * Renders an individual 36-plot state with clean wooden borders, loamy soil and crops.
 */
export function paintPlotTile(
  isUnlocked: boolean,
  isWatered: boolean,
  cropId?: string,
  stage?: 'seed' | 'sprout' | 'blooming' | 'mature',
  _price?: number,
  variant = 0,
): HTMLCanvasElement {
  const { w, h } = getFarmPlotRect(0);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  if (!isUnlocked) {
    // Untilled meadow: grasses, daisies and stones, never fake harvestable crops.
    const rng = mulberry(variant * 91 + 412);
    rect(ctx, '#929466', 1, 2, w - 2, h - 3);
    rect(ctx, '#9faa70', 2, 3, w - 4, h - 5);
    for (let i = 0; i < 48; i++) {
      const x = 4 + rng() * (w - 9),
        y = 8 + rng() * (h - 13);
      const height = 3 + rng() * 5;
      rect(ctx, '#79935c', x, y - height, 1, height);
      rect(ctx, '#bcc887', x + 2, y - height - 1, 1, height);
      rect(ctx, '#d0d396', x - 1, y, 3, 1);
      if (i % 7 === 0) {
        rect(ctx, variant % 3 ? '#eee5c1' : '#c4b4d1', x - 1, y - height - 2, 3, 3);
        rect(ctx, '#e9c477', x, y - height - 1, 1, 1);
      }
    }
    for (let i = 0; i < 3; i++) {
      const x = 10 + rng() * 32,
        y = 12 + rng() * 22;
      oval(ctx, '#668455', x, y + 2, 7, 4);
      oval(ctx, '#91ae64', x - 1, y, 6, 4);
      oval(ctx, '#b6c97e', x - 3, y - 2, 3, 2);
    }
    if (variant % 3 === 0) {
      oval(ctx, '#92947a', 12, h - 9, 6, 3);
      oval(ctx, '#d5c9a7', 11, h - 11, 5, 3);
      rect(ctx, '#eee0ba', 8, h - 13, 5, 1);
    }

    // A quiet corner marker keeps unopened plots legible without 32 large signs.
    rect(ctx, '#b39a70', w - 12, h - 12, 7, 7);
    rect(ctx, '#6c5b40', w - 10, h - 15, 3, 4);
    return c;
  }

  // Raised wooden bed frame
  rect(ctx, '#73573f', 0, 0, w, h);
  rect(ctx, '#b19369', 1, 1, w - 2, h - 2);
  rect(ctx, '#e2c497', 2, 2, w - 4, 2); // top highlight

  for (const x of [2, w - 5])
    for (const y of [2, h - 5]) {
      rect(ctx, '#e5ce9d', x, y, 3, 3);
      rect(ctx, '#806348', x + 1, y + 1, 1, 1);
    }

  // Soil
  const soilColor = isWatered ? '#634d3d' : '#927354';
  const ridgeColor = isWatered ? '#7c6350' : '#ac8a60';
  rect(ctx, soilColor, 3, 3, w - 6, h - 6);

  // Furrows
  for (let y = 8; y < h - 8; y += 8) {
    rect(ctx, ridgeColor, 6, y, w - 12, 3);
    if (isWatered) {
      // Water gleam
      rect(ctx, '#93b9b0', 14 + ((y * 5) % (w - 28)), y + 1, 6, 1);
    }
  }

  // Crop stage rendering
  if (cropId && stage) {
    const cx = w / 2;
    const cy = h / 2 + 2;

    if (stage === 'seed') {
      // Baby cotyledon sprout
      oval(ctx, '#80ae62', cx - 3, cy - 4, 3, 2);
      oval(ctx, '#80ae62', cx + 3, cy - 4, 3, 2);
      rect(ctx, '#84cc16', cx - 1, cy - 2, 2, 3);
    } else if (stage === 'sprout') {
      // Branching green stalk
      rect(ctx, '#5f8f50', cx - 1, cy - 10, 3, 10);
      oval(ctx, '#9cc679', cx - 6, cy - 8, 5, 3);
      oval(ctx, '#9cc679', cx + 6, cy - 8, 5, 3);
      oval(ctx, '#80ae62', cx, cy - 12, 4, 3);
    } else if (stage === 'blooming') {
      // Bush with flowers
      oval(ctx, '#527b49', cx, cy - 8, 14, 10);
      oval(ctx, '#80ae62', cx - 4, cy - 10, 10, 8);
      oval(ctx, '#fef08a', cx - 5, cy - 10, 3, 3);
      oval(ctx, '#dda4b1', cx + 5, cy - 8, 3, 3);
    } else if (stage === 'mature') {
      // Specific fruit / vegetable visualization
      if (cropId.includes('rice') || cropId.includes('lua')) {
        // Golden rice stalks (Lúa Nước)
        for (let s = -2; s <= 2; s++) {
          const sx = cx + s * 7;
          ctx.beginPath();
          ctx.moveTo(sx, cy + 4);
          ctx.quadraticCurveTo(sx + 6, cy - 12, sx + 10, cy - 8);
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#cda759';
          ctx.stroke();
          for (let g = 0; g < 4; g++) {
            oval(ctx, '#eed58c', sx + 4 + g * 2, cy - 10 + g * 2, 2, 3);
          }
        }
      } else if (cropId.includes('watermelon') || cropId.includes('dua')) {
        // Striped Long An Watermelon (Dưa hấu ruột đỏ)
        oval(ctx, '#3d6742', cx, cy - 4, 15, 11);
        oval(ctx, '#80ae62', cx, cy - 4, 13, 9);
        rect(ctx, '#3d6742', cx - 8, cy - 8, 2, 9);
        rect(ctx, '#3d6742', cx, cy - 9, 2, 10);
        rect(ctx, '#3d6742', cx + 8, cy - 8, 2, 9);
      } else if (cropId.includes('tomato') || cropId.includes('ca_chua')) {
        // Red cherry tomatoes (Cà chua bi)
        oval(ctx, '#527b49', cx, cy - 6, 12, 8);
        oval(ctx, '#bd5d4c', cx - 6, cy - 4, 7, 7);
        oval(ctx, '#bd5d4c', cx + 6, cy - 4, 7, 7);
        oval(ctx, '#dd8665', cx - 7, cy - 5, 3, 3);
      } else if (cropId.includes('corn') || cropId.includes('bap')) {
        // Golden corn cob with husk (Bắp Nếp)
        oval(ctx, '#527b49', cx, cy - 6, 8, 12);
        oval(ctx, '#cda759', cx, cy - 7, 6, 10);
        rect(ctx, '#fef08a', cx - 2, cy - 10, 4, 8);
      } else if (cropId.includes('chili') || cropId.includes('ot')) {
        // Bright red chili peppers (Ớt Hiểm)
        oval(ctx, '#527b49', cx, cy - 6, 12, 8);
        for (let ch = -1; ch <= 1; ch++) {
          rect(ctx, '#dd8665', cx + ch * 6, cy - 4, 3, 7);
          rect(ctx, '#80ae62', cx + ch * 6, cy - 6, 3, 2);
        }
      } else {
        oval(ctx, '#527b49', cx, cy - 8, 14, 10);
        oval(ctx, '#f59e0b', cx, cy - 6, 10, 8);
        oval(ctx, '#eed58c', cx, cy - 8, 6, 5);
      }

      // Harvest sparkles
      const sparkles: [number, number][] = [
        [cx - 14, cy - 16],
        [cx + 14, cy - 14],
        [cx, cy - 20],
      ];
      for (const [sx, sy] of sparkles) {
        rect(ctx, '#ffffff', sx, sy, 2, 2);
        rect(ctx, '#fef08a', sx - 1, sy, 1, 1);
        rect(ctx, '#fef08a', sx + 2, sy, 1, 1);
        rect(ctx, '#fef08a', sx, sy - 1, 1, 1);
        rect(ctx, '#fef08a', sx, sy + 2, 1, 1);
      }
    }
  }

  return c;
}
