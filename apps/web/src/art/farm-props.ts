import { TILE } from '@cozy/game-data';

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
 * Clean pixel art matching reference image:
 * - Striped red & white fabric awning canopy with scalloped lower valance
 * - Wooden market stall with crates of tomatoes, carrots, greens & corn
 * - Small chalkboard sign on easel
 * - Cheerful NPC Bác Sáu in brown áo bà ba with nón lá and khăn rằn
 */
export function paintShopBacSau(): HTMLCanvasElement {
  const w = 8 * TILE; // 256
  const h = 5 * TILE; // 160
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const base = h - 22;

  // Soft drop shadow
  oval(ctx, 'rgba(40, 70, 20, 0.35)', w / 2, base + 8, w / 2 - 14, 14);

  // Wooden deck base
  rect(ctx, '#542d0c', 12, base - 6, w - 24, 14);
  rect(ctx, '#8b5028', 14, base - 4, w - 28, 10);
  rect(ctx, '#ab6938', 14, base - 4, w - 28, 2);

  // Wooden support pillars
  for (const px of [22, w / 2 - 14, w - 32]) {
    rect(ctx, '#451a03', px - 1, 38, 8, base - 38);
    rect(ctx, '#8b5028', px, 38, 6, base - 38);
    rect(ctx, '#ab6938', px + 1, 38, 2, base - 38);
  }

  // Wooden counter table
  const counterY = base - 32;
  const counterW = w - 68;
  const counterX = 28;
  rect(ctx, '#451a03', counterX - 1, counterY - 1, counterW + 2, 28);
  rect(ctx, '#8b5028', counterX, counterY, counterW, 26);
  rect(ctx, '#ab6938', counterX + 1, counterY + 1, counterW - 2, 6); // table lip

  // 4 Display crates with fresh produce
  const crates: { name: string; color: string; leaf?: string }[] = [
    { name: 'tomato', color: '#ef4444', leaf: '#22c55e' }, // Tomatoes
    { name: 'carrot', color: '#f97316', leaf: '#16a34a' }, // Carrots
    { name: 'cabbage', color: '#22c55e', leaf: '#15803d' }, // Cabbages
    { name: 'corn', color: '#eab308', leaf: '#84cc16' }, // Corn
  ];

  for (let i = 0; i < 4; i++) {
    const cx = counterX + 10 + i * 40;
    const cy = counterY - 8;
    const crate = crates[i]!;

    // Wooden crate box
    rect(ctx, '#451a03', cx - 1, cy - 1, 32, 18);
    rect(ctx, '#b45309', cx, cy, 30, 16);
    rect(ctx, '#78350f', cx + 2, cy + 2, 26, 12);

    // Mounded fresh produce inside
    for (let p = 0; p < 5; p++) {
      const px = cx + 5 + (p % 3) * 8;
      const py = cy + 2 + Math.floor(p / 3) * 6;
      oval(ctx, crate.color, px, py, 4, 4);
      if (crate.leaf) {
        rect(ctx, crate.leaf, px - 1, py - 3, 2, 2);
      }
    }
  }

  // Striped Red & White Fabric Awning Canopy (Mái che bạt sọc đỏ trắng)
  const roofTop = 10;
  const roofH = 38;
  const roofW = w - 8;
  const rx = 4;

  // Canopy frame shadow
  rect(ctx, '#7f1d1d', rx, roofTop + roofH - 2, roofW, 4);

  // Vertical awning stripes: alternating Red (#c43c35) and White (#f8fafc)
  const stripeW = 16;
  const numStripes = Math.floor(roofW / stripeW);
  for (let s = 0; s < numStripes; s++) {
    const sx = rx + s * stripeW;
    const isRed = s % 2 === 0;
    const color = isRed ? '#c43c35' : '#f8fafc';
    const highlight = isRed ? '#df524b' : '#ffffff';
    rect(ctx, color, sx, roofTop, stripeW, roofH);
    rect(ctx, highlight, sx, roofTop, 2, roofH); // stripe left highlight
  }

  // Scalloped wavy awning valance at the bottom
  for (let s = 0; s < numStripes; s++) {
    const sx = rx + s * stripeW + stripeW / 2;
    const isRed = s % 2 === 0;
    oval(ctx, isRed ? '#c43c35' : '#f8fafc', sx, roofTop + roofH, stripeW / 2, 5);
    oval(ctx, isRed ? '#df524b' : '#ffffff', sx, roofTop + roofH - 1, stripeW / 2 - 2, 3);
  }

  // Small Standing Chalkboard Sign on the right
  const boardX = w - 34;
  const boardY = base - 26;
  // Wooden easel legs
  rect(ctx, '#78350f', boardX - 3, boardY + 4, 3, 22);
  rect(ctx, '#78350f', boardX + 22, boardY + 4, 3, 22);
  rect(ctx, '#542d0c', boardX + 9, boardY + 6, 3, 20); // back peg
  // Slate board
  rect(ctx, '#78350f', boardX, boardY, 22, 18);
  rect(ctx, '#1e293b', boardX + 2, boardY + 2, 18, 14);
  // White chalk doodles
  rect(ctx, '#f8fafc', boardX + 5, boardY + 5, 4, 3);
  rect(ctx, '#fde047', boardX + 11, boardY + 6, 6, 2);
  rect(ctx, '#f8fafc', boardX + 5, boardY + 10, 12, 1);

  // NPC Bác Sáu standing behind the counter
  const npcX = w / 2 + 12;
  const npcY = counterY - 14;

  // Brown shirt (Áo bà ba)
  rect(ctx, '#78350f', npcX - 10, npcY, 20, 22);
  rect(ctx, '#92400e', npcX - 8, npcY + 2, 16, 18);

  // Khăn rằn vắt qua vai (Checkered scarf)
  for (let k = 0; k < 6; k++) {
    rect(ctx, k % 2 === 0 ? '#18181b' : '#f8fafc', npcX - 6 + k * 2, npcY + 2, 2, 14);
  }

  // Friendly face & gentle smile
  oval(ctx, '#fed7aa', npcX, npcY - 8, 8, 8);
  rect(ctx, '#e4e4e7', npcX - 4, npcY - 4, 8, 5); // Chòm râu bạc hiền hậu
  rect(ctx, '#1c1917', npcX - 3, npcY - 9, 2, 2); // mắt
  rect(ctx, '#1c1917', npcX + 2, npcY - 9, 2, 2);

  // Conical Straw Hat (Nón lá)
  ctx.beginPath();
  ctx.moveTo(npcX, npcY - 26);
  ctx.lineTo(npcX - 22, npcY - 10);
  ctx.lineTo(npcX + 22, npcY - 10);
  ctx.closePath();
  ctx.fillStyle = '#fef08a';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#ca8a04';
  ctx.stroke();

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
  const w = 8 * TILE; // 256
  const h = 5.5 * TILE; // 176
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const base = h - 20;

  // Drop shadow
  oval(ctx, 'rgba(40, 70, 20, 0.4)', w / 2, base + 8, w / 2 - 10, 16);

  // Main wooden cottage walls
  rect(ctx, '#542d0c', 16, 46, w - 32, base - 46);
  rect(ctx, '#8b5028', 18, 48, w - 36, base - 50);
  // Horizontal timber planks
  for (let y = 52; y < base; y += 8) {
    rect(ctx, '#ab6938', 18, y, w - 36, 6);
    rect(ctx, '#542d0c', 18, y + 6, w - 36, 2);
  }

  // Double wooden barn door in center
  const doorW = 46;
  const doorH = 46;
  const doorX = (w - doorW) / 2;
  const doorY = base - doorH;
  rect(ctx, '#3f1d0b', doorX - 2, doorY - 2, doorW + 4, doorH + 2);
  rect(ctx, '#78350f', doorX, doorY, doorW, doorH);
  rect(ctx, '#92400e', doorX + 2, doorY + 2, doorW / 2 - 3, doorH - 4);
  rect(ctx, '#92400e', doorX + doorW / 2 + 1, doorY + 2, doorW / 2 - 3, doorH - 4);
  // Door ring knockers
  rect(ctx, '#334155', doorX + doorW / 2 - 5, doorY + 20, 3, 6);
  rect(ctx, '#334155', doorX + doorW / 2 + 2, doorY + 20, 3, 6);

  // 2 Side windows with white frames and soft blue glass
  for (const wx of [30, w - 54]) {
    const wy = base - 38;
    rect(ctx, '#542d0c', wx - 1, wy - 1, 22, 22);
    rect(ctx, '#ffffff', wx, wy, 20, 20);
    rect(ctx, '#93c5fd', wx + 2, wy + 2, 7, 7);
    rect(ctx, '#60a5fa', wx + 11, wy + 2, 7, 7);
    rect(ctx, '#93c5fd', wx + 2, wy + 11, 7, 7);
    rect(ctx, '#60a5fa', wx + 11, wy + 11, 7, 7);
    // Yellow marigold flower boxes below windows
    rect(ctx, '#78350f', wx - 2, wy + 18, 24, 6);
    rect(ctx, '#22c55e', wx, wy + 16, 20, 4);
    for (let f = 0; f < 3; f++) {
      oval(ctx, '#fbbf24', wx + 3 + f * 7, wy + 15, 3, 3);
      rect(ctx, '#fef08a', wx + 3 + f * 7, wy + 15, 1, 1);
    }
  }

  // Pitch Terracotta Red Tile Roof
  const roofTop = 8;
  const roofH = 46;
  const roofW = w - 12;
  const rx = 6;

  rect(ctx, '#7f1d1d', rx - 2, roofTop, roofW + 4, roofH);
  rect(ctx, '#c43c35', rx, roofTop + 2, roofW, roofH - 4);
  rect(ctx, '#df524b', rx + 2, roofTop + 3, roofW - 4, 6); // roof ridge highlight

  // Scalloped tile rows
  for (let ty = roofTop + 10; ty < roofTop + roofH - 4; ty += 8) {
    for (let tx = rx + 6; tx < rx + roofW - 8; tx += 12) {
      rect(ctx, '#8f2520', tx, ty, 10, 2);
      rect(ctx, '#df524b', tx + 1, ty + 1, 8, 1);
    }
  }

  // Signboard: "KHO NÔNG SẢN"
  const signW = 96;
  const signH = 18;
  const signX = (w - signW) / 2;
  const signY = roofTop + roofH - 8;
  rect(ctx, '#450a0a', signX - 1, signY - 1, signW + 2, signH + 2);
  rect(ctx, '#991b1b', signX, signY, signW, signH);
  rect(ctx, '#b91c1c', signX + 1, signY + 1, signW - 2, signH - 2);

  ctx.font = 'bold 8px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Kho Nông Sản', signX + signW / 2, signY + signH / 2);

  // Glowing lantern hanging on left of door
  const lx = doorX - 12;
  const ly = doorY + 6;
  rect(ctx, '#542d0c', lx + 1, ly - 4, 2, 6);
  rect(ctx, '#78350f', lx - 2, ly + 2, 8, 10);
  rect(ctx, '#fef08a', lx, ly + 4, 4, 6);
  rect(ctx, '#f59e0b', lx + 1, ly + 5, 2, 4);

  // Straw Scarecrow on right side of barn
  const scX = w - 30;
  const scY = base - 24;
  rect(ctx, '#78350f', scX - 1, scY - 10, 3, 34); // post
  rect(ctx, '#78350f', scX - 12, scY + 4, 24, 2); // arms
  rect(ctx, '#fef08a', scX - 8, scY + 2, 16, 16); // straw body
  rect(ctx, '#3b82f6', scX - 6, scY + 6, 12, 10); // blue overalls
  oval(ctx, '#fde047', scX, scY - 4, 5, 5); // head
  // Hat
  rect(ctx, '#ca8a04', scX - 8, scY - 8, 16, 2);
  rect(ctx, '#fde047', scX - 5, scY - 14, 10, 6);

  return c;
}

function drawEnclosingFence(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const fx = 8;
  const fy = 8;
  const fw = w - 16;
  const fh = h - 16;
  const postColor = '#8b5028';
  const postLight = '#ab6938';
  const postShadow = '#542d0c';
  const railColor = '#8b5028';

  // Horizontal rails
  rect(ctx, railColor, fx, fy + 4, fw, 2);
  rect(ctx, railColor, fx, fy + 10, fw, 2);
  rect(ctx, railColor, fx, fy + fh - 10, fw, 2);
  rect(ctx, railColor, fx, fy + fh - 4, fw, 2);

  // Vertical rails
  rect(ctx, railColor, fx + 4, fy, 2, fh);
  rect(ctx, railColor, fx + 10, fy, 2, fh);
  rect(ctx, railColor, fx + fw - 10, fy, 2, fh);
  rect(ctx, railColor, fx + fw - 4, fy, 2, fh);

  // Posts along top and bottom
  for (let x = fx; x <= fx + fw; x += 22) {
    rect(ctx, postShadow, x + 1, fy + 1, 4, 16);
    rect(ctx, postColor, x, fy, 4, 16);
    rect(ctx, postLight, x, fy, 1, 16);
    rect(ctx, postShadow, x + 1, fy + fh - 15, 4, 16);
    rect(ctx, postColor, x, fy + fh - 16, 4, 16);
    rect(ctx, postLight, x, fy + fh - 16, 1, 16);
  }
  // Posts along left and right
  for (let y = fy; y <= fy + fh; y += 22) {
    rect(ctx, postShadow, fx + 1, y + 1, 16, 4);
    rect(ctx, postColor, fx, y, 16, 4);
    rect(ctx, postLight, fx, y, 1, 4);
    rect(ctx, postShadow, fx + fw - 15, y + 1, 16, 4);
    rect(ctx, postColor, fx + fw - 16, y, 16, 4);
    rect(ctx, postLight, fx + fw - 16, y, 1, 4);
  }
}

/**
 * 3. Chuồng Gà (Poultry Coop).
 * Clean post-and-rail wooden fence with red-roofed hen house, golden straw & cute white hens.
 */
export function paintPoultryCoop(): HTMLCanvasElement {
  const w = 9 * TILE; // 288
  const h = 5 * TILE; // 160
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // 4-sided enclosing wooden fence
  drawEnclosingFence(ctx, w, h);

  // Red-roofed wooden hen house (left)
  const hx = 18;
  const hy = 24;
  rect(ctx, '#542d0c', hx - 1, hy - 1, 62, 54);
  rect(ctx, '#8b5028', hx, hy, 60, 52);
  // Red sloped roof
  rect(ctx, '#7f1d1d', hx - 6, hy - 12, 72, 16);
  rect(ctx, '#c43c35', hx - 4, hy - 10, 68, 12);
  rect(ctx, '#df524b', hx - 2, hy - 8, 64, 4);
  // Dark entrance hole
  rect(ctx, '#261205', hx + 18, hy + 26, 24, 26);
  rect(ctx, '#fef08a', hx + 22, hy + 46, 16, 4); // straw inside

  // Golden hay bale cube
  const hayX = 94;
  const hayY = 36;
  rect(ctx, '#ca8a04', hayX - 1, hayY - 1, 26, 22);
  rect(ctx, '#f59e0b', hayX, hayY, 24, 20);
  rect(ctx, '#fde047', hayX + 1, hayY + 1, 22, 18);
  rect(ctx, '#854d0e', hayX + 7, hayY, 2, 20);
  rect(ctx, '#854d0e', hayX + 15, hayY, 2, 20);

  // Blue water trough
  rect(ctx, '#334155', 140, 110, 36, 12);
  rect(ctx, '#38bdf8', 142, 112, 32, 8);
  rect(ctx, '#bae6fd', 144, 113, 14, 2);

  // Cute white chickens with red crest & yellow beak
  const drawChicken = (cx: number, cy: number) => {
    oval(ctx, '#f8fafc', cx, cy, 7, 5); // body
    oval(ctx, '#ffffff', cx - 2, cy - 1, 5, 4);
    oval(ctx, '#ffffff', cx + 5, cy - 3, 4, 4); // head
    rect(ctx, '#ef4444', cx + 5, cy - 7, 3, 3); // red comb
    rect(ctx, '#f59e0b', cx + 8, cy - 2, 3, 2); // yellow beak
    rect(ctx, '#f97316', cx - 2, cy + 5, 2, 3); // feet
    rect(ctx, '#f97316', cx + 2, cy + 5, 2, 3);
  };

  drawChicken(140, 52);
  drawChicken(210, 68);
  drawChicken(180, 100);
  drawChicken(240, 105);

  return c;
}

/**
 * 4. Chuồng Heo (Pig Pen).
 * Wooden fence, slate-blue roofed shelter, mud bath & chubby pink pigs.
 */
export function paintPigPen(): HTMLCanvasElement {
  const w = 9 * TILE; // 288
  const h = 5 * TILE; // 160
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // 4-sided enclosing wooden fence
  drawEnclosingFence(ctx, w, h);

  // Slate-blue roofed wooden shelter (left)
  const sx = 18;
  const sy = 24;
  rect(ctx, '#542d0c', sx - 1, sy - 1, 64, 52);
  rect(ctx, '#8b5028', sx, sy, 62, 50);
  // Slate-blue roof
  rect(ctx, '#1e293b', sx - 6, sy - 10, 74, 16);
  rect(ctx, '#475569', sx - 4, sy - 8, 70, 12);
  rect(ctx, '#64748b', sx - 2, sy - 6, 66, 4);
  // Shelter interior
  rect(ctx, '#261205', sx + 12, sy + 18, 38, 32);

  // Blue water trough
  rect(ctx, '#334155', 180, 110, 36, 12);
  rect(ctx, '#38bdf8', 182, 112, 32, 8);
  rect(ctx, '#bae6fd', 184, 113, 14, 2);

  // Chubby pink pigs with floppy ears and snout
  const drawPig = (px: number, py: number) => {
    oval(ctx, '#f9a8d4', px, py, 14, 10); // body
    oval(ctx, '#fbcfe8', px - 2, py - 2, 10, 7);
    oval(ctx, '#f9a8d4', px + 10, py - 2, 7, 7); // head
    oval(ctx, '#f472b6', px + 15, py - 1, 4, 4); // snout
    rect(ctx, '#9d174d', px + 15, py - 2, 1, 2); // nostrils
    rect(ctx, '#9d174d', px + 17, py - 2, 1, 2);
    rect(ctx, '#f472b6', px + 7, py - 8, 3, 4); // ears
    rect(ctx, '#f472b6', px + 12, py - 8, 3, 4);
    // Legs
    rect(ctx, '#ec4899', px - 8, py + 8, 3, 5);
    rect(ctx, '#ec4899', px - 2, py + 8, 3, 5);
    rect(ctx, '#ec4899', px + 4, py + 8, 3, 5);
    rect(ctx, '#ec4899', px + 9, py + 8, 3, 5);
  };

  drawPig(120, 70);
  drawPig(175, 55);
  drawPig(220, 85);

  return c;
}

/**
 * 5. Chuồng Cừu (Sheep Pen).
 * Wooden fence, slate-blue shelter, golden hay block & fluffy white sheep.
 */
export function paintGoatPen(): HTMLCanvasElement {
  const w = 9 * TILE; // 288
  const h = 5 * TILE; // 160
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // 4-sided enclosing wooden fence
  drawEnclosingFence(ctx, w, h);

  // Slate-blue shelter on left
  const sx = 18;
  const sy = 24;
  rect(ctx, '#542d0c', sx - 1, sy - 1, 56, 48);
  rect(ctx, '#8b5028', sx, sy, 54, 46);
  // Slate-blue roof
  rect(ctx, '#1e293b', sx - 6, sy - 10, 66, 16);
  rect(ctx, '#475569', sx - 4, sy - 8, 62, 12);
  rect(ctx, '#64748b', sx - 2, sy - 6, 58, 4);
  // Doorway
  rect(ctx, '#261205', sx + 10, sy + 16, 34, 30);

  // Golden hay bale on top-right (matching reference)
  const hayX = 185;
  const hayY = 28;
  rect(ctx, '#ca8a04', hayX - 1, hayY - 1, 26, 22);
  rect(ctx, '#f59e0b', hayX, hayY, 24, 20);
  rect(ctx, '#fde047', hayX + 1, hayY + 1, 22, 18);
  rect(ctx, '#854d0e', hayX + 7, hayY, 2, 20);
  rect(ctx, '#854d0e', hayX + 15, hayY, 2, 20);

  // Blue water trough on bottom-left
  rect(ctx, '#334155', 48, 112, 32, 12);
  rect(ctx, '#38bdf8', 50, 114, 28, 8);
  rect(ctx, '#bae6fd', 52, 115, 12, 2);

  // Fluffy round woolly white sheep with black face
  const drawSheep = (sx: number, sy: number) => {
    oval(ctx, '#e2e8f0', sx, sy, 15, 12); // wool body
    oval(ctx, '#f8fafc', sx - 2, sy - 2, 13, 10);
    oval(ctx, '#ffffff', sx - 4, sy - 4, 10, 8);
    oval(ctx, '#18181b', sx + 11, sy - 2, 6, 6); // cute black face
    rect(ctx, '#18181b', sx + 14, sy - 6, 2, 4); // ears
    // Legs
    rect(ctx, '#18181b', sx - 8, sy + 10, 3, 6);
    rect(ctx, '#18181b', sx - 2, sy + 10, 3, 6);
    rect(ctx, '#18181b', sx + 4, sy + 10, 3, 6);
    rect(ctx, '#18181b', sx + 9, sy + 10, 3, 6);
  };

  drawSheep(130, 75);
  drawSheep(190, 95);

  return c;
}

/**
 * 6. Chuồng Bò (Cattle Pasture).
 */
export function paintCattlePasture(): HTMLCanvasElement {
  const w = 9 * TILE; // 288
  const h = 5 * TILE; // 160
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Wooden shed roof
  rect(ctx, '#451a03', 12, 10, 120, 20);
  rect(ctx, '#78350f', 14, 12, 116, 16);
  rect(ctx, '#b45309', 16, 14, 112, 12);

  // Hay manger
  rect(ctx, '#3f1d0b', 24, 60, 80, 20);
  rect(ctx, '#78350f', 26, 62, 76, 16);
  for (let y = 60; y < 74; y += 3) {
    rect(ctx, '#fde047', 28, y, 72, 2);
  }

  // Yellow Cow with bell
  const cowX = 180;
  const cowY = 70;
  oval(ctx, '#ca8a04', cowX, cowY, 26, 16);
  oval(ctx, '#eab308', cowX - 4, cowY - 2, 22, 12);
  oval(ctx, '#ca8a04', cowX + 22, cowY - 4, 10, 10);
  rect(ctx, '#fde047', cowX + 22, cowY - 14, 3, 5); // horns
  rect(ctx, '#fde047', cowX + 16, cowY - 14, 3, 5);
  oval(ctx, '#fed7aa', cowX + 28, cowY - 2, 6, 6);
  rect(ctx, '#f59e0b', cowX + 20, cowY + 8, 6, 6); // bell
  rect(ctx, '#a16207', cowX - 16, cowY + 12, 5, 12);
  rect(ctx, '#a16207', cowX - 6, cowY + 12, 5, 12);
  rect(ctx, '#a16207', cowX + 8, cowY + 12, 5, 12);
  rect(ctx, '#a16207', cowX + 18, cowY + 12, 5, 12);

  return c;
}

/**
 * 7. Guồng Nước Sục Khí Ao Cá (Waterwheel Aerator).
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

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  // Wheel hub
  oval(ctx, '#451a03', 0, 0, 8, 8);
  oval(ctx, '#92400e', 0, 0, 5, 5);

  // 6 paddle blades
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    ctx.save();
    ctx.rotate(a);
    rect(ctx, '#78350f', -3, 8, 6, 16);
    rect(ctx, '#f59e0b', -2, 20, 4, 6);
    ctx.restore();
  }
  ctx.restore();

  // Foam spray splashes
  for (let s = 0; s < 12; s++) {
    const sx = 10 + s * 4;
    oval(ctx, '#ffffff', sx, size - 8, 4, 3);
    oval(ctx, '#bae6fd', sx - 1, size - 7, 3, 2);
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
  price?: number,
): HTMLCanvasElement {
  const w = 84;
  const h = 54;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  if (!isUnlocked) {
    // Locked plot: grassy with wooden padlock stake
    rect(ctx, '#4d7c0f', 2, 2, w - 4, h - 4);
    for (let i = 0; i < 20; i++) {
      rect(ctx, '#3f6212', 10 + ((i * 13) % (w - 20)), 10 + ((i * 17) % (h - 20)), 4, 4);
    }
    // Wooden sign stake
    rect(ctx, '#78350f', w / 2 - 2, h / 2 - 8, 4, 20);
    rect(ctx, '#f59e0b', w / 2 - 16, h / 2 - 20, 32, 16);
    rect(ctx, '#d97706', w / 2 - 14, h / 2 - 18, 28, 12);
    // Padlock icon
    rect(ctx, '#1c1917', w / 2 - 4, h / 2 - 15, 8, 7);
    rect(ctx, '#fde047', w / 2 - 3, h / 2 - 14, 6, 5);

    if (price) {
      ctx.font = 'bold 7px sans-serif';
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'center';
      ctx.fillText(`${price} C`, w / 2, h - 8);
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
