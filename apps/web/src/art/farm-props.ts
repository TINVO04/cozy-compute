import { FARM_POIS } from '@cozy/game-data';

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
 * Pre-rendered background mode: transparent interactive hitbox canvas.
 */
export function paintShopBacSau(): HTMLCanvasElement {
  const p = FARM_POIS.shop_bac_sau;
  const c = document.createElement('canvas');
  c.width = p.w;
  c.height = p.h;
  return c;
}

/**
 * 2. Nhà Kho Nông Sản Silo.
 * Clean country timber cottage matching reference:
 * - Terracotta red tile roof with neat ridges
 * - Warm horizontal log wood siding
 * - Bold red signboard "Kho Nông Sản"
 * - Double wooden doors with iron ring handles
 * - Glass windows with white frames & blooming yellow marigold flowerboxes
 * - Glowing warm lantern by door
 * - Straw scarecrow & burlap grain sacks beside wall
 */
export function paintSiloWarehouse(): HTMLCanvasElement {
  const p = FARM_POIS.silo_warehouse;
  const c = document.createElement('canvas');
  c.width = p.w;
  c.height = p.h;
  return c;
}

/**
 * 3. Chuồng Gà (Poultry Coop).
 * Pre-rendered background mode: transparent interactive hitbox canvas.
 */
export function paintPoultryCoop(): HTMLCanvasElement {
  const p = FARM_POIS.poultry_coop;
  const c = document.createElement('canvas');
  c.width = p.w;
  c.height = p.h;
  return c;
}

/**
 * 4. Chuồng Heo (Pig Pen).
 * Pre-rendered background mode: transparent interactive hitbox canvas.
 */
export function paintPigPen(): HTMLCanvasElement {
  const p = FARM_POIS.pig_pen;
  const c = document.createElement('canvas');
  c.width = p.w;
  c.height = p.h;
  return c;
}

/**
 * 5. Chuồng Cừu (Sheep Pen).
 * Pre-rendered background mode: transparent interactive hitbox canvas.
 */
export function paintGoatPen(): HTMLCanvasElement {
  const p = FARM_POIS.goat_pen;
  const c = document.createElement('canvas');
  c.width = p.w;
  c.height = p.h;
  return c;
}

/**
 * 6. Chuồng Bò (Cattle Pasture).
 * Pre-rendered background mode: transparent interactive hitbox canvas.
 */
export function paintCattlePasture(): HTMLCanvasElement {
  const p = FARM_POIS.cattle_pasture;
  const c = document.createElement('canvas');
  c.width = p.w;
  c.height = p.h;
  return c;
}

/**
 * 7. Guồng Nước Sục Khí Ao Cá (Waterwheel Aerator).
 * Pre-rendered background mode: transparent interactive hitbox canvas.
 */
export function paintWaterwheelAerator(_angle = 0): HTMLCanvasElement {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
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
  price?: number,
): HTMLCanvasElement {
  const w = 58;
  const h = 46;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  if (!isUnlocked) {
    // Locked plot: untilled earthy bed with wooden padlock stake
    rect(ctx, '#3f2613', 0, 0, w, h);
    rect(ctx, '#5c381c', 1, 1, w - 2, h - 2);
    // Wild grass sprouts on untilled ground
    rect(ctx, '#478c2e', 6, 8, 3, 3);
    rect(ctx, '#6dbd47', 7, 7, 2, 2);
    rect(ctx, '#478c2e', w - 10, h - 12, 3, 3);
    rect(ctx, '#6dbd47', w - 9, h - 13, 2, 2);

    // Wooden sign stake
    rect(ctx, '#381e0b', w / 2 - 2, h / 2 - 8, 4, 18);
    rect(ctx, '#78350f', w / 2 - 1, h / 2 - 8, 2, 18);
    // Wooden plaque
    rect(ctx, '#451a03', w / 2 - 14, h / 2 - 18, 28, 14);
    rect(ctx, '#b45309', w / 2 - 13, h / 2 - 17, 26, 12);
    rect(ctx, '#d97706', w / 2 - 12, h / 2 - 16, 24, 10);
    // Padlock icon
    rect(ctx, '#1c1917', w / 2 - 4, h / 2 - 14, 8, 6);
    rect(ctx, '#fde047', w / 2 - 3, h / 2 - 13, 6, 4);

    if (price) {
      ctx.font = 'bold 7px sans-serif';
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'center';
      ctx.fillText(`${price} C`, w / 2, h - 5);
    }
    return c;
  }

  // Raised wooden bed frame
  rect(ctx, '#451a03', 0, 0, w, h);
  rect(ctx, '#8b5028', 1, 1, w - 2, h - 2);
  rect(ctx, '#ab6938', 2, 2, w - 4, 2); // top highlight

  // Soil
  const soilColor = isWatered ? '#3a200e' : '#543217';
  const ridgeColor = isWatered ? '#542d0c' : '#73461e';
  rect(ctx, soilColor, 3, 3, w - 6, h - 6);

  // Furrows
  for (let y = 8; y < h - 8; y += 8) {
    rect(ctx, ridgeColor, 6, y, w - 12, 3);
    if (isWatered) {
      // Water gleam
      rect(ctx, '#60a5fa', 14 + ((y * 5) % (w - 28)), y + 1, 6, 1);
    }
  }

  // Crop stage rendering
  if (cropId && stage) {
    const cx = w / 2;
    const cy = h / 2 + 2;

    if (stage === 'seed') {
      // Baby cotyledon sprout
      oval(ctx, '#22c55e', cx - 3, cy - 4, 3, 2);
      oval(ctx, '#22c55e', cx + 3, cy - 4, 3, 2);
      rect(ctx, '#84cc16', cx - 1, cy - 2, 2, 3);
    } else if (stage === 'sprout') {
      // Branching green stalk
      rect(ctx, '#16a34a', cx - 1, cy - 10, 3, 10);
      oval(ctx, '#4ade80', cx - 6, cy - 8, 5, 3);
      oval(ctx, '#4ade80', cx + 6, cy - 8, 5, 3);
      oval(ctx, '#22c55e', cx, cy - 12, 4, 3);
    } else if (stage === 'blooming') {
      // Bush with flowers
      oval(ctx, '#15803d', cx, cy - 8, 14, 10);
      oval(ctx, '#22c55e', cx - 4, cy - 10, 10, 8);
      oval(ctx, '#fef08a', cx - 5, cy - 10, 3, 3);
      oval(ctx, '#f472b6', cx + 5, cy - 8, 3, 3);
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
          ctx.strokeStyle = '#eab308';
          ctx.stroke();
          for (let g = 0; g < 4; g++) {
            oval(ctx, '#fde047', sx + 4 + g * 2, cy - 10 + g * 2, 2, 3);
          }
        }
      } else if (cropId.includes('watermelon') || cropId.includes('dua')) {
        // Striped Long An Watermelon (Dưa hấu ruột đỏ)
        oval(ctx, '#14532d', cx, cy - 4, 15, 11);
        oval(ctx, '#22c55e', cx, cy - 4, 13, 9);
        rect(ctx, '#14532d', cx - 8, cy - 8, 2, 9);
        rect(ctx, '#14532d', cx, cy - 9, 2, 10);
        rect(ctx, '#14532d', cx + 8, cy - 8, 2, 9);
      } else if (cropId.includes('tomato') || cropId.includes('ca_chua')) {
        // Red cherry tomatoes (Cà chua bi)
        oval(ctx, '#15803d', cx, cy - 6, 12, 8);
        oval(ctx, '#dc2626', cx - 6, cy - 4, 7, 7);
        oval(ctx, '#dc2626', cx + 6, cy - 4, 7, 7);
        oval(ctx, '#ef4444', cx - 7, cy - 5, 3, 3);
      } else if (cropId.includes('corn') || cropId.includes('bap')) {
        // Golden corn cob with husk (Bắp Nếp)
        oval(ctx, '#15803d', cx, cy - 6, 8, 12);
        oval(ctx, '#eab308', cx, cy - 7, 6, 10);
        rect(ctx, '#fef08a', cx - 2, cy - 10, 4, 8);
      } else if (cropId.includes('chili') || cropId.includes('ot')) {
        // Bright red chili peppers (Ớt Hiểm)
        oval(ctx, '#15803d', cx, cy - 6, 12, 8);
        for (let ch = -1; ch <= 1; ch++) {
          rect(ctx, '#ef4444', cx + ch * 6, cy - 4, 3, 7);
          rect(ctx, '#22c55e', cx + ch * 6, cy - 6, 3, 2);
        }
      } else {
        oval(ctx, '#15803d', cx, cy - 8, 14, 10);
        oval(ctx, '#f59e0b', cx, cy - 6, 10, 8);
        oval(ctx, '#fde047', cx, cy - 8, 6, 5);
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
