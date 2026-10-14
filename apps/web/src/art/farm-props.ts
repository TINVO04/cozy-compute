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
 * 7. Entrance Welcome Mat / Footstep Mat.
 * Woven rustic mat marking the doorway of farm buildings for clear navigation.
 */
export function paintWelcomeMat(width = 40, height = 18): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Outer drop shadow
  rect(ctx, 'rgba(15, 23, 42, 0.45)', 1, 2, width - 2, height - 2);

  // Wooden / woven rim
  rect(ctx, '#78350f', 0, 0, width, height - 1);
  rect(ctx, '#92400e', 1, 1, width - 2, height - 3);

  // Woven mat fabric interior (warm amber/golden-straw)
  rect(ctx, '#d97706', 2, 2, width - 4, height - 5);
  rect(ctx, '#f59e0b', 3, 3, width - 6, height - 7);

  // Diagonal woven texture
  for (let x = 4; x < width - 4; x += 4) {
    rect(ctx, '#b45309', x, 4, 1, height - 9);
    rect(ctx, '#fef08a', x + 1, 4, 1, 2);
  }

  // Welcoming border stitching
  rect(ctx, '#fef3c7', 3, 3, width - 6, 1);
  rect(ctx, '#78350f', 3, height - 5, width - 6, 1);

  // Footstep chevron / entry indicator in center
  const mx = Math.floor(width / 2);
  rect(ctx, '#451a03', mx - 2, 6, 4, 1);
  rect(ctx, '#451a03', mx - 4, 8, 8, 1);
  rect(ctx, '#fef3c7', mx - 1, 5, 2, 1);

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
  const soilColor = isWatered ? '#523d2e' : '#927354';
  const ridgeColor = isWatered ? '#6b503e' : '#ac8a60';
  rect(ctx, soilColor, 3, 3, w - 6, h - 6);

  // Furrows with rich loamy texture
  for (let y = 8; y < h - 8; y += 8) {
    rect(ctx, ridgeColor, 6, y, w - 12, 3);
    if (isWatered) {
      // Shimmering moist gleam & reflections
      rect(ctx, '#8bbcb0', 12 + ((y * 7) % (w - 24)), y + 1, 8, 1);
      rect(ctx, '#cffafe', 14 + ((y * 7) % (w - 24)), y + 1, 3, 1);
    }
  }

  // Crop stage rendering
  if (cropId && stage) {
    const cx = w / 2;
    const cy = h / 2 + 2;

    if (stage === 'seed') {
      // High-detail sprouted seedling with dew drops & leaf cotyledons
      rect(ctx, '#3e2723', cx - 4, cy + 1, 8, 2); // earth mound
      rect(ctx, '#4d7c0f', cx - 1, cy - 3, 2, 5); // tender stem
      oval(ctx, '#84cc16', cx - 4, cy - 4, 4, 2); // left leaf
      oval(ctx, '#a3e635', cx + 4, cy - 4, 4, 2); // right leaf
      rect(ctx, '#bef264', cx - 1, cy - 5, 2, 2); // tip shoot
      rect(ctx, '#ffffff', cx - 3, cy - 5, 1, 1); // dew drop sparkle
      rect(ctx, '#ffffff', cx + 3, cy - 5, 1, 1);
    } else if (stage === 'sprout') {
      // Multi-branching lush stalk with structured foliage
      rect(ctx, '#365314', cx - 2, cy - 11, 4, 12); // main stem
      rect(ctx, '#4d7c0f', cx - 1, cy - 10, 2, 11); // stem highlight
      // Left foliage tiers
      oval(ctx, '#4d7c0f', cx - 7, cy - 7, 6, 3);
      oval(ctx, '#84cc16', cx - 6, cy - 8, 5, 2);
      // Right foliage tiers
      oval(ctx, '#3f6212', cx + 7, cy - 6, 6, 3);
      oval(ctx, '#65a30d', cx + 6, cy - 7, 5, 2);
      // Top central shoot
      oval(ctx, '#a3e635', cx, cy - 13, 5, 3);
      rect(ctx, '#bef264', cx - 1, cy - 14, 2, 2);
    } else if (stage === 'blooming') {
      // Lush bushy foliage with species-authentic blossoms
      oval(ctx, '#365314', cx, cy - 7, 16, 11);
      oval(ctx, '#4d7c0f', cx, cy - 8, 14, 9);
      oval(ctx, '#65a30d', cx - 3, cy - 10, 10, 7);

      if (cropId.includes('strawberry')) {
        // Delicate white strawberry blossoms with sunny yellow centers
        const blossoms: [number, number][] = [
          [cx - 6, cy - 9],
          [cx + 5, cy - 8],
          [cx - 1, cy - 12],
        ];
        for (const [bx, by] of blossoms) {
          oval(ctx, '#ffffff', bx, by, 3, 3);
          rect(ctx, '#facc15', bx, by, 1, 1);
        }
      } else if (cropId.includes('pumpkin')) {
        // Broad lush leaves and star-shaped golden-orange pumpkin blossom
        oval(ctx, '#f59e0b', cx + 4, cy - 8, 5, 4);
        rect(ctx, '#ea580c', cx + 4, cy - 8, 2, 2);
      } else if (cropId.includes('eggplant')) {
        // Violet bell blossoms with yellow pistil
        oval(ctx, '#c084fc', cx - 5, cy - 9, 4, 3);
        rect(ctx, '#fef08a', cx - 5, cy - 9, 1, 1);
      } else if (cropId.includes('sunflower')) {
        // Developing round flower head
        oval(ctx, '#eab308', cx, cy - 10, 6, 6);
        oval(ctx, '#713f12', cx, cy - 10, 3, 3);
      } else if (cropId.includes('grape')) {
        // Tiny green grape flower clusters
        oval(ctx, '#bef264', cx - 5, cy - 7, 3, 3);
        oval(ctx, '#bef264', cx + 4, cy - 9, 3, 3);
      } else {
        // Cheerful standard flowers
        oval(ctx, '#fef08a', cx - 5, cy - 10, 3, 3);
        rect(ctx, '#f59e0b', cx - 5, cy - 10, 1, 1);
        oval(ctx, '#fbcfe8', cx + 5, cy - 8, 3, 3);
        rect(ctx, '#db2777', cx + 5, cy - 8, 1, 1);
      }
    } else if (stage === 'mature') {
      // ----------------------------------------------------
      // HIGH-FIDELITY CROP ARTWORK (ALL 11 CROPS)
      // ----------------------------------------------------
      if (cropId.includes('rice') || cropId.includes('lua')) {
        // LÚA NƯỚC NÀNG THƠM: Arched golden stalks with heavy grains
        for (let s = -2; s <= 2; s++) {
          const sx = cx + s * 6;
          ctx.beginPath();
          ctx.moveTo(sx, cy + 4);
          ctx.quadraticCurveTo(sx + 5, cy - 14, sx + 9, cy - 9);
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#b45309';
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(sx, cy + 4);
          ctx.quadraticCurveTo(sx + 4, cy - 13, sx + 8, cy - 9);
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#f59e0b';
          ctx.stroke();
          for (let g = 0; g < 4; g++) {
            oval(ctx, '#fef08a', sx + 3 + g * 2, cy - 11 + g * 2, 2, 3);
            rect(ctx, '#ffffff', sx + 3 + g * 2, cy - 11 + g * 2, 1, 1);
          }
        }
      } else if (cropId.includes('corn') || cropId.includes('bap')) {
        // BẮP NGÔ NGỌT SỮA: Plump sweet corn with green husks & silky tassel
        oval(ctx, '#15803d', cx - 7, cy - 5, 6, 12);
        oval(ctx, '#16a34a', cx + 7, cy - 5, 6, 12);
        // Golden cob
        oval(ctx, '#ca8a04', cx, cy - 7, 7, 13);
        oval(ctx, '#eab308', cx, cy - 7, 6, 12);
        // Kernel grid
        for (let kx = -3; kx <= 3; kx += 2) {
          for (let ky = -10; ky <= -3; ky += 2) {
            rect(ctx, '#fef08a', cx + kx, cy + ky, 1, 1);
          }
        }
        // Silk tassel
        rect(ctx, '#d97706', cx - 2, cy - 15, 4, 3);
        rect(ctx, '#fef08a', cx - 1, cy - 16, 2, 2);
      } else if (cropId.includes('watermelon') || cropId.includes('dua')) {
        // DƯA HẤU RUỘT ĐỎ: Plump Long An watermelon with rich dark stripes & curly vine
        oval(ctx, '#14532d', cx, cy - 4, 16, 11);
        oval(ctx, '#16a34a', cx, cy - 4, 14, 10);
        oval(ctx, '#22c55e', cx - 2, cy - 5, 12, 8);
        // Dark wavy stripes
        for (const sx of [-9, -4, 2, 7]) {
          rect(ctx, '#052e16', cx + sx, cy - 8, 2, 9);
          rect(ctx, '#052e16', cx + sx + 1, cy - 7, 1, 7);
        }
        // Pale yellow ground spot & highlight
        oval(ctx, '#fef08a', cx - 6, cy - 1, 3, 2);
        rect(ctx, '#86efac', cx + 2, cy - 7, 4, 1);
        // Curly vine tendril
        rect(ctx, '#15803d', cx + 8, cy - 11, 2, 3);
        rect(ctx, '#4ade80', cx + 10, cy - 12, 2, 2);
      } else if (cropId.includes('tomato') || cropId.includes('ca_chua')) {
        // CÀ CHUA BI CHÙM MỘNG: Clusters of glossy red tomatoes with green calyx
        oval(ctx, '#166534', cx, cy - 6, 13, 9);
        const tomatoes: [number, number, number][] = [
          [cx - 7, cy - 4, 5],
          [cx + 7, cy - 4, 5],
          [cx, cy - 7, 6],
          [cx - 3, cy - 1, 4],
          [cx + 4, cy - 1, 4],
        ];
        for (const [tx, ty, r] of tomatoes) {
          oval(ctx, '#991b1b', tx, ty, r, r);
          oval(ctx, '#dc2626', tx, ty, r - 1, r - 1);
          oval(ctx, '#ef4444', tx - 1, ty - 1, r - 2, r - 2);
          rect(ctx, '#ffffff', tx - 1, ty - 2, 1, 1); // glint
          // Green star calyx
          rect(ctx, '#15803d', tx - 1, ty - r + 1, 3, 1);
          rect(ctx, '#22c55e', tx, ty - r, 1, 2);
        }
      } else if (cropId.includes('chili') || cropId.includes('ot')) {
        // ỚT HIỂM CHỈ THIÊN: Pointed upright fiery red peppers
        oval(ctx, '#166534', cx, cy - 6, 13, 8);
        for (let ch = -2; ch <= 2; ch++) {
          const px = cx + ch * 5;
          const py = cy - 4 + (Math.abs(ch) % 2) * 2;
          rect(ctx, '#991b1b', px, py, 3, 8);
          rect(ctx, '#ef4444', px + 1, py, 2, 7);
          rect(ctx, '#f87171', px + 1, py + 1, 1, 4);
          rect(ctx, '#15803d', px, py - 2, 3, 2);
          rect(ctx, '#22c55e', px + 1, py - 3, 1, 2);
        }
      } else if (cropId.includes('strawberry')) {
        // DÂU TÂY ĐÀ LẠT: Ruby-red heart strawberries with seed dots & leafy crown
        oval(ctx, '#166534', cx, cy - 4, 15, 8);
        const berries: [number, number][] = [
          [cx - 6, cy - 3],
          [cx + 6, cy - 3],
          [cx, cy - 6],
        ];
        for (const [bx, by] of berries) {
          oval(ctx, '#991b1b', bx, by, 5, 6);
          oval(ctx, '#e11d48', bx, by, 4, 5);
          oval(ctx, '#fb7185', bx - 1, by - 1, 2, 3);
          // Seed specks
          rect(ctx, '#fef08a', bx - 2, by + 1, 1, 1);
          rect(ctx, '#fef08a', bx + 2, by + 1, 1, 1);
          rect(ctx, '#fef08a', bx, by - 1, 1, 1);
          rect(ctx, '#fef08a', bx, by + 3, 1, 1);
          // Crown calyx
          rect(ctx, '#15803d', bx - 3, by - 4, 6, 2);
          rect(ctx, '#4ade80', bx - 1, by - 5, 2, 2);
        }
      } else if (cropId.includes('pumpkin')) {
        // BÍ NGÔ KHỔNG LỒ: Plump ribbed orange pumpkin with thick woody stem
        oval(ctx, '#7c2d12', cx, cy - 4, 16, 12);
        oval(ctx, '#ea580c', cx, cy - 4, 15, 11);
        oval(ctx, '#f97316', cx, cy - 5, 13, 9);
        // Vertical ribs
        for (const rx of [-9, -4, 4, 9]) {
          rect(ctx, '#c2410c', cx + rx, cy - 9, 2, 10);
        }
        oval(ctx, '#fb923c', cx, cy - 6, 6, 7);
        // Sturdy brown stem & curling green vine
        rect(ctx, '#78350f', cx - 1, cy - 13, 3, 4);
        rect(ctx, '#92400e', cx, cy - 14, 2, 2);
        rect(ctx, '#22c55e', cx + 3, cy - 13, 2, 1);
        rect(ctx, '#4ade80', cx + 4, cy - 14, 2, 2);
      } else if (cropId.includes('eggplant')) {
        // CÀ TÍM DÀI: Deep royal violet sheen with green spiny cap
        oval(ctx, '#166534', cx, cy - 5, 12, 7);
        // Two long glossy eggplants
        const eggplants: [number, number, number][] = [
          [cx - 4, cy - 3, -1],
          [cx + 4, cy - 4, 1],
        ];
        for (const [ex, ey, flip] of eggplants) {
          oval(ctx, '#3b0764', ex, ey, 5, 9);
          oval(ctx, '#6b21a8', ex, ey, 4, 8);
          oval(ctx, '#9333ea', ex, ey, 3, 7);
          // Glossy reflection streak
          rect(ctx, '#e9d5ff', ex + (flip > 0 ? 1 : -1), ey - 3, 1, 5);
          // Green cap
          rect(ctx, '#15803d', ex - 2, ey - 7, 5, 3);
          rect(ctx, '#4ade80', ex - 1, ey - 8, 2, 2);
        }
      } else if (cropId.includes('carrot')) {
        // CÀ RỐT CỦ CAM: Feather greens with fat orange carrot tops in soil
        const carrots: [number, number][] = [
          [cx - 6, cy - 2],
          [cx, cy - 3],
          [cx + 6, cy - 2],
        ];
        for (const [rx, ry] of carrots) {
          // Lush feathery greens
          rect(ctx, '#166534', rx - 1, ry - 11, 2, 9);
          rect(ctx, '#22c55e', rx - 3, ry - 12, 6, 2);
          rect(ctx, '#4ade80', rx - 2, ry - 14, 4, 3);
          // Bright orange carrot shoulder poking out
          oval(ctx, '#c2410c', rx, ry, 4, 4);
          oval(ctx, '#f97316', rx, ry, 3, 3);
          rect(ctx, '#fdba74', rx - 1, ry - 1, 2, 2);
        }
      } else if (cropId.includes('sunflower')) {
        // HOA HƯỚNG DƯƠNG: Giant radiating yellow petals & textured seed core
        rect(ctx, '#15803d', cx - 2, cy - 4, 4, 10); // thick stem
        oval(ctx, '#166534', cx - 6, cy + 1, 5, 3);
        oval(ctx, '#166534', cx + 6, cy + 1, 5, 3);
        // Petal disc
        oval(ctx, '#ca8a04', cx, cy - 9, 12, 12);
        oval(ctx, '#eab308', cx, cy - 9, 11, 11);
        oval(ctx, '#fde047', cx, cy - 9, 9, 9);
        // Dark rich seeded center
        oval(ctx, '#451a03', cx, cy - 9, 5, 5);
        oval(ctx, '#78350f', cx, cy - 9, 4, 4);
        rect(ctx, '#fbbf24', cx - 1, cy - 10, 2, 2);
      } else if (cropId.includes('grape')) {
        // NHO TÍM NINH THUẬN: Heavy hanging bunch of purple-violet grapes
        oval(ctx, '#166534', cx, cy - 11, 12, 6); // vine leaves
        rect(ctx, '#78350f', cx - 1, cy - 13, 2, 3); // vine stalk
        // Bunch of spherical grapes
        const grapePoints: [number, number][] = [
          [cx - 4, cy - 8],
          [cx, cy - 8],
          [cx + 4, cy - 8],
          [cx - 3, cy - 5],
          [cx + 2, cy - 5],
          [cx - 1, cy - 2],
        ];
        for (const [gx, gy] of grapePoints) {
          oval(ctx, '#2e1065', gx, gy, 3, 3);
          oval(ctx, '#581c87', gx, gy, 2.5, 2.5);
          oval(ctx, '#7e22ce', gx, gy, 2, 2);
          rect(ctx, '#d8b4fe', gx - 1, gy - 1, 1, 1); // frosty bloom
        }
      } else {
        // Default harvest
        oval(ctx, '#166534', cx, cy - 8, 14, 10);
        oval(ctx, '#f59e0b', cx, cy - 6, 10, 8);
        oval(ctx, '#fef08a', cx, cy - 8, 6, 5);
      }

      // Harvest sparkles with glowing radiance
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
