import { DNTU_COLS, DNTU_ROWS, TILE } from '@cozy/game-data';
import { INK, mulberry, shade } from './pixel';

export const DNTU_W = DNTU_COLS * TILE; // 1536
export const DNTU_H = DNTU_ROWS * TILE; // 1024

export interface DntuPerson {
  id: string;
  name: string;
  role: string;
  x: number; // in pixels
  y: number;
  dialogue: string;
  avatarStyle: {
    hairColor: string;
    shirtColor: string;
    pose: 'lecturing' | 'coding' | 'designing' | 'robot';
  };
}

export interface DntuBuilding {
  id: string;
  name: string;
  x: number; // footprint x in px
  y: number; // footprint y in px
  w: number; // footprint width in px
  h: number; // footprint depth in px
  roofHeight: number; // pixels facade/roof rises above footprint y
  depth?: number; // optional custom render depth (default: y + h)
  draw: () => HTMLCanvasElement;
}

export interface DntuProp {
  id: string;
  name: string;
  x: number; // center x in px
  y: number; // bottom base y in px (used for depth sorting)
  w: number;
  h: number;
  draw: () => HTMLCanvasElement;
}

export interface DntuTree {
  x: number;
  y: number;
  kind: 'flamboyant' | 'palm' | 'yellow' | 'shade';
  scale: number;
}

export const DNTU_PEOPLE: DntuPerson[] = [
  {
    id: 'thay_tan',
    name: 'Thầy Tân',
    role: 'Giảng viên DNTU',
    x: 29.5 * TILE,
    y: 17.5 * TILE,
    dialogue: 'Các em ơi các em lớn rồi mà! Cố gắng học tập, nghiên cứu và rèn luyện thật tốt tại DNTU nhé!',
    avatarStyle: {
      hairColor: '#1c1917',
      shirtColor: '#1e3a8a',
      pose: 'lecturing',
    },
  },
  {
    id: 'sv_minh_khang',
    name: 'Minh Khang',
    role: 'Thủ Khoa CNTT K22',
    x: 18.5 * TILE,
    y: 16.5 * TILE,
    dialogue:
      'Phòng máy Khu B và Trung tâm Tích hợp Khu G trang bị cấu hình khủng để chạy model AI, Cloud và IoT. Đồ án của tụi mình đang kết nối trực tiếp với server doanh nghiệp!',
    avatarStyle: {
      hairColor: '#292524',
      shirtColor: '#dc2626',
      pose: 'coding',
    },
  },
  {
    id: 'sv_thuy_duong',
    name: 'Thùy Dương',
    role: 'Sinh viên Truyền thông',
    x: 24 * TILE,
    y: 22.5 * TILE,
    dialogue:
      'Khuôn viên DNTU xanh mướt, góc nào check-in cũng đẹp! Bọn mình chuẩn bị quay số mới cho kênh DNTU Media tại Trường Quay Khu A đấy!',
    avatarStyle: {
      hairColor: '#78350f',
      shirtColor: '#ea580c',
      pose: 'designing',
    },
  },
  {
    id: 'robot_dntu',
    name: 'DNTU-Bot v4.0',
    role: 'Robot Trợ Lý AI',
    x: 24 * TILE,
    y: 15 * TILE,
    dialogue:
      'Bíp bíp! Chào mừng bạn đến với 360 Campus DNTU! Thư viện có hơn 50,000 đầu sách, hệ thống thể thao đa năng và 25 ngành đào tạo đạt chuẩn kiểm định quốc gia!',
    avatarStyle: {
      hairColor: '#38bdf8',
      shirtColor: '#0284c7',
      pose: 'robot',
    },
  },
  {
    id: 'bao_ve_dntu',
    name: 'Bác Bảo Vệ Năm',
    role: 'Bảo Vệ Cổng Chính',
    x: 43.2 * TILE,
    y: 17.5 * TILE,
    dialogue:
      'Chào mừng các bạn sinh viên và phụ huynh đến với Đại học Công nghệ Đồng Nai! Nhớ đeo thẻ sinh viên và giữ gìn khuôn viên xanh sạch đẹp nhé!',
    avatarStyle: {
      hairColor: '#334155',
      shirtColor: '#0284c7',
      pose: 'lecturing',
    },
  },
  {
    id: 'hlv_the_thao',
    name: 'HLV Tuấn Anh',
    role: 'HLV Thể Thao DNTU',
    x: 7.5 * TILE,
    y: 15 * TILE,
    dialogue:
      'Sân bóng đá cỏ nhân tạo và sân bóng rổ DNTU vừa được nâng cấp chuẩn thi đấu sinh viên toàn quốc. Vào làm vài đường bóng đi bạn ơi!',
    avatarStyle: {
      hairColor: '#1c1917',
      shirtColor: '#16a34a',
      pose: 'lecturing',
    },
  },
];

/* Helper drawing primitives */
function r(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function oval(ctx: CanvasRenderingContext2D, color: string, cx: number, cy: number, rx: number, ry: number) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Draws realistic paved roads with individual stone pavers, mortar seams, and stone curbs */
function drawPavedRoad(
  ctx: CanvasRenderingContext2D,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  seed = 42,
) {
  const rng = mulberry(seed);
  r(ctx, '#8e8467', rx - 2, ry - 2, rw + 4, rh + 4);
  r(ctx, '#d4caa9', rx, ry, rw, rh);

  for (let y = ry; y < ry + rh - 4; y += 8) {
    for (let x = rx; x < rx + rw - 4; x += 12) {
      const isAlt = ((y - ry) / 8) % 2 === 1;
      const ox = isAlt ? x + 6 : x;
      if (ox + 10 > rx + rw) continue;
      const paverColor = rng() > 0.5 ? '#eee4c9' : rng() > 0.3 ? '#e5dab9' : '#dfd2af';
      r(ctx, '#b7ab8b', ox, y, 11, 7);
      r(ctx, paverColor, ox + 1, y + 1, 9, 5);
      r(ctx, '#fef9e7', ox + 1, y + 1, 9, 1);
    }
  }
}

/** Draws flower beds with terracotta brick edging and blooming flowers */
function drawFlowerBed(
  ctx: CanvasRenderingContext2D,
  fx: number,
  fy: number,
  fw: number,
  fh: number,
  seed = 7,
) {
  const rng = mulberry(seed);
  r(ctx, '#7c2d12', fx - 2, fy - 2, fw + 4, fh + 4);
  r(ctx, '#c2410c', fx - 1, fy - 1, fw + 2, fh + 2);
  r(ctx, '#2d4529', fx, fy, fw, fh);
  r(ctx, '#3f6339', fx + 1, fy + 1, fw - 2, fh - 2);

  for (let i = 0; i < (fw * fh) / 36; i++) {
    const px = fx + 3 + rng() * (fw - 6);
    const py = fy + 3 + rng() * (fh - 6);
    const flowerColor = ['#ef4444', '#f43f5e', '#facc15', '#fb923c', '#ffffff'][Math.floor(rng() * 5)]!;
    oval(ctx, '#16a34a', px, py, 3, 2.5);
    r(ctx, flowerColor, px - 1, py - 1, 3, 3);
    r(ctx, '#fef08a', px, py, 1, 1);
  }
}

// ==========================================
// 1. DNTU CAMPUS GROUND BASE CANVAS
// ==========================================
export function paintDntuGround(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = DNTU_W;
  c.height = DNTU_H;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const rng = mulberry(2026);

  // 1. Lush Green Lawn Base
  r(ctx, '#82aa67', 0, 0, DNTU_W, DNTU_H);

  for (let i = 0; i < 90; i++) {
    oval(
      ctx,
      i % 2 === 0 ? '#8eb872' : '#769f5c',
      rng() * DNTU_W,
      rng() * DNTU_H,
      40 + rng() * 80,
      25 + rng() * 45,
    );
  }

  for (let i = 0; i < 5000; i++) {
    const gx = Math.floor(rng() * DNTU_W);
    const gy = Math.floor(rng() * DNTU_H);
    r(ctx, rng() > 0.5 ? '#9ac57c' : '#6b9253', gx, gy, 1, 2);
    if (i % 4 === 0) r(ctx, '#a6d187', gx + 2, gy + 1, 1, 2);
  }

  // 2. PAVED PROMENADES & ROADS
  // Grand Boulevard connecting Gate 1 through the Grand Archway into Sân Trường:
  drawPavedRoad(ctx, 23 * TILE, 15.5 * TILE, 25 * TILE, 7.5 * TILE, 101);

  drawPavedRoad(ctx, 35.5 * TILE, 2 * TILE, 3.5 * TILE, 28 * TILE, 102);
  drawPavedRoad(ctx, 12 * TILE, 15 * TILE, 25 * TILE, 3.2 * TILE, 103);
  drawPavedRoad(ctx, 12 * TILE, 1.5 * TILE, 3.2 * TILE, 29 * TILE, 104);
  drawPavedRoad(ctx, 12 * TILE, 6.5 * TILE, 26 * TILE, 2.8 * TILE, 105);
  drawPavedRoad(ctx, 2 * TILE, 26.5 * TILE, 24 * TILE, 2.2 * TILE, 106);

  // Paved avenue separating Khu G (Smart Labs/Gym) and Khu F (Automotive Workshop):
  drawPavedRoad(ctx, 2 * TILE, 4.4 * TILE, 12 * TILE, 1.2 * TILE, 107);
  // Paved avenue separating Khu F and Sân Thể Thao (Football & Basketball):
  drawPavedRoad(ctx, 2 * TILE, 9.1 * TILE, 12 * TILE, 1.4 * TILE, 108);

  // East Perimeter Street (Đường Nguyễn Khuyến)
  const streetX = 47 * TILE;
  r(ctx, '#334155', streetX, 0, DNTU_W - streetX, DNTU_H);
  r(ctx, '#1e293b', streetX, 0, 2, DNTU_H);
  for (let sy = 8; sy < DNTU_H; sy += 24) {
    r(ctx, '#f8fafc', streetX + 16, sy, 3, 14);
  }

  for (const zy of [21 * TILE, 14 * TILE]) {
    for (let bx = streetX + 4; bx < DNTU_W - 6; bx += 8) {
      r(ctx, '#ffffff', bx, zy, 5, 24);
    }
  }

  // 3. KHU A GRAND COURTYARD (Sân Trong Khu A)
  const courtX = 25 * TILE + 8;
  const courtY = 13 * TILE + 2;
  const courtW = 10 * TILE - 16;
  const courtH = 10 * TILE - 4;

  r(ctx, '#d4caa9', courtX, courtY, courtW, courtH);
  for (let cy = courtY; cy < courtY + courtH; cy += 16) {
    for (let cx = courtX; cx < courtX + courtW; cx += 16) {
      const isAlt = (Math.floor((cx - courtX) / 16) + Math.floor((cy - courtY) / 16)) % 2 === 0;
      r(ctx, isAlt ? '#eee4c9' : '#e2d7b5', cx + 1, cy + 1, 14, 14);
      r(ctx, '#fff9e6', cx + 2, cy + 2, 12, 1);
    }
  }

  // Central Compass Star Emblem
  const midCourtx = courtX + courtW / 2;
  const midCourty = courtY + courtH / 2;
  oval(ctx, '#7c2d12', midCourtx, midCourty, 38, 38);
  oval(ctx, '#b91c1c', midCourtx, midCourty, 36, 36);
  oval(ctx, '#fef08a', midCourtx, midCourty, 32, 32);
  oval(ctx, '#b91c1c', midCourtx, midCourty, 28, 28);
  ctx.font = '900 9px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('DNTU', midCourtx, midCourty + 3.5);

  // 4. SPORTS GROUND BASE MARKINGS (KHU E)
  const turfX = 2 * TILE;
  const turfY = 10.5 * TILE;
  const turfW = 10.5 * TILE;
  const turfH = 10.5 * TILE;

  r(ctx, 'rgba(25, 40, 20, 0.45)', turfX - 4, turfY - 4, turfW + 8, turfH + 8);
  r(ctx, '#14532d', turfX, turfY, turfW, turfH);

  for (let sy = turfY; sy < turfY + turfH; sy += 24) {
    const isAlt = Math.floor((sy - turfY) / 24) % 2 === 0;
    r(ctx, isAlt ? '#15803d' : '#16a34a', turfX, sy, turfW, 24);
    for (let gx = turfX + 4; gx < turfX + turfW - 4; gx += 8) {
      r(ctx, isAlt ? '#166534' : '#22c55e', gx, sy + 6, 2, 1);
      r(ctx, isAlt ? '#22c55e' : '#15803d', gx + 4, sy + 18, 2, 1);
    }
  }

  const strokeLine = (lx: number, ly: number, lw: number, lh: number) => {
    r(ctx, 'rgba(255, 255, 255, 0.95)', lx, ly, lw, lh);
  };
  strokeLine(turfX + 8, turfY + 8, turfW - 16, 2);
  strokeLine(turfX + 8, turfY + turfH - 10, turfW - 16, 2);
  strokeLine(turfX + 8, turfY + 8, 2, turfH - 18);
  strokeLine(turfX + turfW - 10, turfY + 8, 2, turfH - 18);

  const midFbY = turfY + turfH / 2;
  const midFbX = turfX + turfW / 2;
  strokeLine(turfX + 8, midFbY - 1, turfW - 16, 2);

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(midFbX, midFbY, 32, 0, Math.PI * 2);
  ctx.stroke();
  r(ctx, '#ffffff', midFbX - 2, midFbY - 2, 4, 4);

  const pBoxW = 100;
  const pBoxH = 42;
  strokeLine(midFbX - pBoxW / 2, turfY + 8, pBoxW, 2);
  strokeLine(midFbX - pBoxW / 2, turfY + 8, 2, pBoxH);
  strokeLine(midFbX + pBoxW / 2, turfY + 8, 2, pBoxH);
  strokeLine(midFbX - pBoxW / 2, turfY + 8 + pBoxH, pBoxW, 2);
  r(ctx, '#ffffff', midFbX - 2, turfY + 8 + 26, 4, 4);

  strokeLine(midFbX - pBoxW / 2, turfY + turfH - 10 - pBoxH, pBoxW, 2);
  strokeLine(midFbX - pBoxW / 2, turfY + turfH - 10 - pBoxH, 2, pBoxH);
  strokeLine(midFbX + pBoxW / 2, turfY + turfH - 10 - pBoxH, 2, pBoxH);
  strokeLine(midFbX - pBoxW / 2, turfY + turfH - 10, pBoxW, 2);
  r(ctx, '#ffffff', midFbX - 2, turfY + turfH - 10 - 26, 4, 4);

  for (const [fx, fy] of [
    [turfX + 8, turfY + 8],
    [turfX + turfW - 10, turfY + 8],
    [turfX + 8, turfY + turfH - 10],
    [turfX + turfW - 10, turfY + turfH - 10],
  ]) {
    r(ctx, '#facc15', fx! - 1, fy! - 10, 2, 10);
    r(ctx, '#ef4444', fx!, fy! - 10, 6, 5);
  }

  // Basketball Court
  const bbX = 7.5 * TILE;
  const bbY = 21.5 * TILE;
  const bbW = 5.2 * TILE;
  const bbH = 5 * TILE;
  r(ctx, 'rgba(30, 20, 10, 0.35)', bbX - 3, bbY - 3, bbW + 6, bbH + 6);
  r(ctx, '#c2410c', bbX, bbY, bbW, bbH);
  r(ctx, '#15803d', bbX + 4, bbY + 12, 38, bbH - 24);
  r(ctx, '#15803d', bbX + bbW - 42, bbY + 12, 38, bbH - 24);
  strokeLine(bbX + 4, bbY + 4, bbW - 8, 2);
  strokeLine(bbX + 4, bbY + bbH - 6, bbW - 8, 2);
  strokeLine(bbX + 4, bbY + 4, 2, bbH - 8);
  strokeLine(bbX + bbW - 6, bbY + 4, 2, bbH - 8);
  strokeLine(bbX + bbW / 2 - 1, bbY + 4, 2, bbH - 8);

  // Volleyball Court
  const vbX = 2 * TILE;
  const vbY = 21.5 * TILE;
  const vbW = 4.8 * TILE;
  const vbH = 5 * TILE;
  r(ctx, 'rgba(20, 30, 45, 0.35)', vbX - 3, vbY - 3, vbW + 6, vbH + 6);
  r(ctx, '#1d4ed8', vbX, vbY, vbW, vbH);
  r(ctx, '#facc15', vbX + 4, vbY + 4, vbW - 8, 2);
  r(ctx, '#facc15', vbX + 4, vbY + vbH - 6, vbW - 8, 2);
  r(ctx, '#facc15', vbX + 4, vbY + 4, 2, vbH - 8);
  r(ctx, '#facc15', vbX + vbW - 6, vbY + 4, 2, vbH - 8);

  // Badminton Court
  const badX = 35 * TILE;
  const badY = 2.5 * TILE;
  const badW = 4 * TILE;
  const badH = 5 * TILE;
  r(ctx, 'rgba(20, 45, 25, 0.3)', badX - 2, badY - 2, badW + 4, badH + 4);
  r(ctx, '#15803d', badX, badY, badW, badH);
  strokeLine(badX + 2, badY + 2, badW - 4, 1.5);
  strokeLine(badX + 2, badY + badH - 3, badW - 4, 1.5);
  strokeLine(badX + 2, badY + 2, 1.5, badH - 4);
  strokeLine(badX + badW - 3, badY + 2, 1.5, badH - 4);
  strokeLine(badX + badW / 2, badY + 2, 1.5, badH - 4);
  r(ctx, 'rgba(255, 255, 255, 0.85)', badX + badW / 2 - 1, badY + 4, 2, badH - 8);

  // Motorbike Parking Lot
  const parkMotoX = 39 * TILE;
  const parkMotoY = 12.5 * TILE;
  const parkMotoW = 4.5 * TILE;
  const parkMotoH = 4 * TILE;
  r(ctx, '#475569', parkMotoX, parkMotoY, parkMotoW, parkMotoH);
  r(ctx, '#64748b', parkMotoX + 2, parkMotoY + 2, parkMotoW - 4, parkMotoH - 4);
  for (let px = parkMotoX + 12; px < parkMotoX + parkMotoW - 12; px += 18) {
    for (let py = parkMotoY + 8; py < parkMotoY + parkMotoH - 12; py += 24) {
      r(ctx, '#ffffff', px, py, 14, 2);
      r(ctx, '#cbd5e1', px, py + 2, 2, 18);
    }
  }

  // Công Viên DNTU
  const parkX = 14 * TILE;
  const parkY = 1 * TILE;
  const parkW = 10 * TILE;
  const parkH = 5.5 * TILE;
  oval(ctx, '#8ab86e', parkX + parkW / 2, parkY + parkH / 2, parkW / 2 - 8, parkH / 2 - 4);
  for (let px = parkX + 16; px < parkX + parkW - 16; px += 28) {
    oval(ctx, '#dfd4b4', px + 10, parkY + 36, 14, 9);
    oval(ctx, '#efe6ce', px + 11, parkY + 35, 12, 7);
  }

  // Landscaped Flower Beds
  drawFlowerBed(ctx, 43 * TILE + 4, 25 * TILE + 2, 4 * TILE - 8, 12, 11);
  drawFlowerBed(ctx, 43 * TILE + 4, 14.8 * TILE, 4 * TILE - 8, 12, 12);
  drawFlowerBed(ctx, 25 * TILE + 4, 13 * TILE + 4, 9 * TILE - 8, 10, 13);
  drawFlowerBed(ctx, 25 * TILE + 4, 22 * TILE + 6, 9 * TILE - 8, 10, 14);

  // Perimeter Fences
  const drawFence = (fx: number, fy: number, fw: number, fh: number) => {
    r(ctx, '#334155', fx, fy, fw, fh);
    r(ctx, '#94a3b8', fx + 1, fy + 1, Math.max(1, fw - 2), Math.max(1, fh - 2));
  };
  drawFence(0, 0, DNTU_W, 4);
  drawFence(0, DNTU_H - 4, DNTU_W, 4);
  drawFence(0, 0, 4, 7 * TILE);
  drawFence(0, 9.5 * TILE, 4, DNTU_H - 9.5 * TILE);
  drawFence(DNTU_W - 4, 0, 4, 12 * TILE);
  drawFence(DNTU_W - 4, 15 * TILE, 4, 1 * TILE);
  drawFence(DNTU_W - 4, 24 * TILE, 4, DNTU_H - 24 * TILE);

  return c;
}

// ==========================================
// 2. 2.5D HIGH-FIDELITY BUILDINGS
// ==========================================

/** Khu A - Cánh Bắc: Giảng Đường & Hội Trường (Neoclassical French Colonial Mansard) */
function drawKhuANorth(): HTMLCanvasElement {
  const w = 13 * TILE; // 416
  const h = 3 * TILE; // 96
  const roofH = 38;
  const canvas = document.createElement('canvas');
  canvas.width = w + 8;
  canvas.height = h + roofH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  r(ctx, 'rgba(30, 24, 18, 0.35)', 2, roofH + h - 8, w + 4, 12);

  // Terracotta Mansard Tile Roof
  r(ctx, '#5c220e', 4, 2, w, roofH + 18);
  r(ctx, '#b43403', 5, 3, w - 2, roofH + 16);
  for (let ty = 6; ty < roofH + 16; ty += 5) {
    r(ctx, '#ea580c', 6, ty, w - 4, 2);
    r(ctx, '#7c2d12', 6, ty + 2, w - 4, 1);
  }
  r(ctx, '#f97316', 5, 3, w - 2, 2);

  // Roof Dormer Windows
  for (let dx = 28; dx < w - 28; dx += 48) {
    r(ctx, '#7c2d12', dx - 1, 10, 18, 20);
    r(ctx, '#fde68a', dx, 11, 16, 18);
    r(ctx, '#0284c7', dx + 2, 13, 12, 14);
    r(ctx, '#ffffff', dx + 3, 14, 4, 4);
  }

  // White balustrade
  r(ctx, '#fef3c7', 4, roofH + 16, w, 6);
  r(ctx, '#d4caa9', 4, roofH + 21, w, 2);
  for (let bx = 10; bx < w - 10; bx += 12) {
    r(ctx, '#ffffff', bx, roofH + 14, 3, 8);
  }

  // Facade Wall (French Colonial Cream)
  const fy = roofH + 22;
  const fh = canvas.height - fy - 4;
  r(ctx, '#fef3c7', 6, fy, w - 4, fh);
  r(ctx, '#fde68a', 8, fy + 2, w - 8, fh - 4);

  for (let colx = 16; colx < w - 20; colx += 28) {
    r(ctx, '#ffffff', colx, fy, 5, fh);
    r(ctx, '#fef9e7', colx + 1, fy, 2, fh);
    r(ctx, '#0369a1', colx + 8, fy + 6, 14, fh - 14);
    r(ctx, '#38bdf8', colx + 9, fy + 7, 12, fh - 16);
    r(ctx, '#ffffff', colx + 10, fy + 8, 4, 5);
    r(ctx, '#ffffff', colx + 7, fy + fh - 8, 16, 2);
  }

  // Dimensional Gold Banner
  const bw = 240;
  const bx = (w - bw) / 2;
  r(ctx, '#7c2d12', bx - 1, fy - 18, bw + 2, 16);
  r(ctx, '#b91c1c', bx, fy - 17, bw, 14);
  r(ctx, '#facc15', bx + 1, fy - 16, bw - 2, 1);
  ctx.font = '800 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('ĐẠI HỌC CÔNG NGHỆ ĐỒNG NAI · KHU A BẮC', w / 2, fy - 7);

  return canvas;
}

/** Khu A - Trụ Sở Chính: Tháp Hành Chính Cánh Bắc (BGH & Đào Tạo) */
function drawKhuAEastNorth(): HTMLCanvasElement {
  const w = 3.5 * TILE; // 112
  const h = 4 * TILE; // 128
  const roofH = 42;
  const canvas = document.createElement('canvas');
  canvas.width = w + 8;
  canvas.height = h + roofH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  r(ctx, 'rgba(30, 24, 18, 0.35)', 2, roofH + h - 8, w + 4, 12);

  // Mansard Terracotta Tile Roof
  r(ctx, '#5c220e', 4, 2, w, roofH + 14);
  r(ctx, '#b43403', 6, 4, w - 4, roofH + 10);
  for (let ty = 6; ty < roofH + 12; ty += 5) {
    r(ctx, '#ea580c', 8, ty, w - 8, 2);
    r(ctx, '#7c2d12', 8, ty + 2, w - 8, 1);
  }

  // Neoclassical Dormer Windows
  for (const dx of [24, 72]) {
    r(ctx, '#7c2d12', dx - 1, 10, 16, 18);
    r(ctx, '#fde68a', dx, 11, 14, 16);
    r(ctx, '#0284c7', dx + 2, 13, 10, 12);
    r(ctx, '#38bdf8', dx + 3, 14, 8, 10);
    r(ctx, '#ffffff', dx + 4, 15, 3, 4);
  }

  // Balustrade Cornice
  r(ctx, '#fef3c7', 4, roofH + 12, w, 5);
  r(ctx, '#d4caa9', 4, roofH + 16, w, 2);
  for (let bx = 8; bx < w - 8; bx += 10) {
    r(ctx, '#ffffff', bx, roofH + 10, 3, 6);
  }

  // Facade Wall (French Colonial Cream)
  const fy = roofH + 18;
  const fh = canvas.height - fy - 4;
  r(ctx, '#fef3c7', 6, fy, w - 4, fh);
  r(ctx, '#fde68a', 8, fy + 2, w - 8, fh - 4);

  // Ionic Pilasters
  for (const cx of [10, 52, 94]) {
    r(ctx, '#ffffff', cx, fy, 8, fh);
    r(ctx, '#f1f5f9', cx + 1, fy, 3, fh);
    r(ctx, '#cbd5e1', cx + 6, fy, 2, fh);
  }

  // Administration Windows with Blue Glare and Warm Lighting
  for (let wy = fy + 10; wy < fy + fh - 24; wy += 32) {
    for (const wx of [24, 68]) {
      r(ctx, '#0369a1', wx, wy, 16, 20);
      r(ctx, '#38bdf8', wx + 1, wy + 1, 14, 18);
      r(ctx, '#fef08a', wx + 2, wy + 2, 4, 5);
      r(ctx, '#ffffff', wx + 7, wy + 2, 6, 3);
      r(ctx, '#ffffff', wx - 1, wy + 19, 18, 2);
    }
  }

  // Golden Signboard
  r(ctx, '#ca8a04', 12, fy + fh - 18, w - 16, 15);
  r(ctx, '#b91c1c', 13, fy + fh - 17, w - 18, 13);
  ctx.font = '800 6.5px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('BGH · PHÒNG ĐÀO TẠO', w / 2 + 4, fy + fh - 8);

  return canvas;
}

/** Khu A - Trụ Sở Chính: Tháp Hành Chính Cánh Nam (Đảng Ủy & CTSV) */
function drawKhuAEastSouth(): HTMLCanvasElement {
  const w = 3.5 * TILE; // 112
  const h = 4 * TILE; // 128
  const roofH = 42;
  const canvas = document.createElement('canvas');
  canvas.width = w + 8;
  canvas.height = h + roofH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  r(ctx, 'rgba(30, 24, 18, 0.35)', 2, roofH + h - 8, w + 4, 12);

  // Mansard Terracotta Tile Roof
  r(ctx, '#5c220e', 4, 2, w, roofH + 14);
  r(ctx, '#b43403', 6, 4, w - 4, roofH + 10);
  for (let ty = 6; ty < roofH + 12; ty += 5) {
    r(ctx, '#ea580c', 8, ty, w - 8, 2);
    r(ctx, '#7c2d12', 8, ty + 2, w - 8, 1);
  }

  // Neoclassical Dormer Windows
  for (const dx of [24, 72]) {
    r(ctx, '#7c2d12', dx - 1, 10, 16, 18);
    r(ctx, '#fde68a', dx, 11, 14, 16);
    r(ctx, '#0284c7', dx + 2, 13, 10, 12);
    r(ctx, '#38bdf8', dx + 3, 14, 8, 10);
    r(ctx, '#ffffff', dx + 4, 15, 3, 4);
  }

  // Balustrade Cornice
  r(ctx, '#fef3c7', 4, roofH + 12, w, 5);
  r(ctx, '#d4caa9', 4, roofH + 16, w, 2);
  for (let bx = 8; bx < w - 8; bx += 10) {
    r(ctx, '#ffffff', bx, roofH + 10, 3, 6);
  }

  // Facade Wall (French Colonial Cream)
  const fy = roofH + 18;
  const fh = canvas.height - fy - 4;
  r(ctx, '#fef3c7', 6, fy, w - 4, fh);
  r(ctx, '#fde68a', 8, fy + 2, w - 8, fh - 4);

  // Ionic Pilasters
  for (const cx of [10, 52, 94]) {
    r(ctx, '#ffffff', cx, fy, 8, fh);
    r(ctx, '#f1f5f9', cx + 1, fy, 3, fh);
    r(ctx, '#cbd5e1', cx + 6, fy, 2, fh);
  }

  // Administration Windows with Blue Glare and Warm Lighting
  for (let wy = fy + 10; wy < fy + fh - 24; wy += 32) {
    for (const wx of [24, 68]) {
      r(ctx, '#0369a1', wx, wy, 16, 20);
      r(ctx, '#38bdf8', wx + 1, wy + 1, 14, 18);
      r(ctx, '#fef08a', wx + 2, wy + 2, 4, 5);
      r(ctx, '#ffffff', wx + 7, wy + 2, 6, 3);
      r(ctx, '#ffffff', wx - 1, wy + 19, 18, 2);
    }
  }

  // Golden Signboard
  r(ctx, '#ca8a04', 12, fy + fh - 18, w - 16, 15);
  r(ctx, '#1e3a8a', 13, fy + fh - 17, w - 18, 13);
  ctx.font = '800 6.5px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('ĐẢNG ỦY · CÔNG TÁC SV', w / 2 + 4, fy + fh - 8);

  return canvas;
}

/** Khu A - Cổng Vòm Khải Hoàn Trụ Sở Chính (Grand Neoclassical Archway) */
function drawKhuAArchway(): HTMLCanvasElement {
  const w = 4.5 * TILE; // 144
  const h = 7 * TILE; // 224
  const roofH = 46;
  const canvas = document.createElement('canvas');
  canvas.width = w + 8;
  canvas.height = h + roofH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const midX = w / 2 + 4; // 76

  // 1. Drop shadow along building base
  r(ctx, 'rgba(30, 24, 18, 0.35)', 2, roofH + h - 8, w + 4, 12);

  // 2. Neoclassical Mansard Terracotta Roof & Central Pediment (canvas y: 0..46)
  // Triangular Pediment over the central portal
  ctx.fillStyle = '#5c220e';
  ctx.beginPath();
  ctx.moveTo(midX, 2);
  ctx.lineTo(w + 2, 28);
  ctx.lineTo(6, 28);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#b43403';
  ctx.beginPath();
  ctx.moveTo(midX, 4);
  ctx.lineTo(w, 26);
  ctx.lineTo(8, 26);
  ctx.closePath();
  ctx.fill();

  // Terracotta tile ridge lines
  for (let py = 10; py < 26; py += 4) {
    const frac = (py - 4) / 22;
    const span = (w - 8) * frac;
    r(ctx, '#ea580c', midX - span / 2, py, span, 1.5);
  }

  // Clock Tower & Gilded DNTU Crest
  oval(ctx, '#ca8a04', midX, 16, 12, 12);
  oval(ctx, '#fef08a', midX, 16, 10, 10);
  oval(ctx, '#b91c1c', midX, 16, 8, 8);
  oval(ctx, '#ffffff', midX, 16, 6, 6);
  // Clock hands showing 8:30 AM
  r(ctx, '#0f172a', midX - 1, 12, 2, 5);
  r(ctx, '#0f172a', midX - 1, 15, 4, 2);
  // Gilded finial on top of pediment
  r(ctx, '#ca8a04', midX - 2, 0, 4, 4);
  oval(ctx, '#fef08a', midX, 1, 3, 3);

  // Terracotta Cornice & Architrave Beam
  r(ctx, '#7c2d12', 4, 28, w, 10);
  r(ctx, '#ea580c', 6, 30, w - 4, 6);
  r(ctx, '#facc15', 6, 30, w - 4, 1.5);
  // Dentil molding under cornice
  for (let dx = 8; dx < w; dx += 6) {
    r(ctx, '#ffffff', dx, 36, 3, 2);
  }

  // 3. Dimensional University Header Signboard
  r(ctx, '#ca8a04', 6, 38, w - 4, 20);
  r(ctx, '#b91c1c', 8, 40, w - 8, 16);
  r(ctx, '#fef08a', 9, 41, w - 10, 1);
  ctx.font = '900 7px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('ĐẠI HỌC CÔNG NGHỆ ĐỒNG NAI', midX, 49);
  ctx.font = '800 6px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('🏛️ TRỤ SỞ CHÍNH · BAN GIÁM HIỆU 🏛️', midX, 55);

  // 4. North Wing Pier (canvas y: 58..118, rows 14 to 16.2 * TILE)
  // French Colonial Cream Stucco Facade
  const nPierY = 58;
  const nPierH = 60;
  r(ctx, '#fef3c7', 6, nPierY, w - 4, nPierH);
  r(ctx, '#fde68a', 8, nPierY + 2, w - 8, nPierH - 4);

  // Balustrade molding on North pier
  r(ctx, '#ffffff', 6, nPierY, w - 4, 3);
  r(ctx, '#d4caa9', 6, nPierY + 3, w - 4, 1);

  // Ionic Pilasters on North Wing
  for (const px of [10, midX - 6, w - 12]) {
    r(ctx, '#ffffff', px, nPierY + 4, 8, nPierH - 8);
    r(ctx, '#f1f5f9', px + 1, nPierY + 4, 3, nPierH - 8);
    r(ctx, '#cbd5e1', px + 6, nPierY + 4, 2, nPierH - 8);
    // Capital & Base
    r(ctx, '#ffffff', px - 2, nPierY + 4, 12, 3);
    r(ctx, '#ffffff', px - 1, nPierY + nPierH - 7, 10, 3);
  }

  // Neoclassical Arched Windows on North Wing
  for (const wx of [26, 92]) {
    r(ctx, '#d4caa9', wx - 1, nPierY + 8, 22, 34);
    r(ctx, '#ffffff', wx, nPierY + 9, 20, 32);
    r(ctx, '#0369a1', wx + 2, nPierY + 11, 16, 28);
    r(ctx, '#38bdf8', wx + 3, nPierY + 12, 14, 26);
    // Window panes & glare
    r(ctx, '#ffffff', wx + 4, nPierY + 13, 5, 5);
    r(ctx, '#fef08a', wx + 4, nPierY + 24, 12, 2);
    r(ctx, '#ffffff', wx + 2, nPierY + 25, 16, 1);
    r(ctx, '#ffffff', wx + 10, nPierY + 12, 1, 26);
    // Stone sill
    r(ctx, '#ffffff', wx - 2, nPierY + 42, 24, 3);
  }

  // North Stone Springer / Impost Block (where arch begins)
  r(ctx, '#d4caa9', 6, nPierY + nPierH - 4, w - 4, 5);
  r(ctx, '#cbd5e1', 6, nPierY + nPierH - 1, w - 4, 2);

  // Brass Lantern Sconce (North Pier)
  r(ctx, '#1e293b', 16, nPierY + nPierH - 18, 8, 2);
  r(ctx, '#ca8a04', 18, nPierY + nPierH - 24, 6, 12);
  r(ctx, '#fef08a', 20, nPierY + nPierH - 22, 6, 8);
  r(ctx, '#ffffff', 22, nPierY + nPierH - 20, 3, 4);

  // 5. South Wing Pier (canvas y: 222..268, rows 19.6 to 21 * TILE)
  const sPierY = 222;
  const sPierH = canvas.height - sPierY - 4;
  r(ctx, '#fef3c7', 6, sPierY, w - 4, sPierH);
  r(ctx, '#fde68a', 8, sPierY + 2, w - 8, sPierH - 4);

  // South Stone Springer / Impost Block (where arch begins)
  r(ctx, '#d4caa9', 6, sPierY, w - 4, 5);
  r(ctx, '#cbd5e1', 6, sPierY + 4, w - 4, 2);

  // Ionic Pilasters on South Wing
  for (const px of [10, midX - 6, w - 12]) {
    r(ctx, '#ffffff', px, sPierY + 5, 8, sPierH - 9);
    r(ctx, '#f1f5f9', px + 1, sPierY + 5, 3, sPierH - 9);
    r(ctx, '#cbd5e1', px + 6, sPierY + 5, 2, sPierH - 9);
    r(ctx, '#ffffff', px - 2, sPierY + 5, 12, 3);
    r(ctx, '#ffffff', px - 1, sPierY + sPierH - 6, 10, 3);
  }

  // Neoclassical Windows on South Wing
  for (const wx of [26, 92]) {
    r(ctx, '#d4caa9', wx - 1, sPierY + 10, 22, sPierH - 16);
    r(ctx, '#ffffff', wx, sPierY + 11, 20, sPierH - 18);
    r(ctx, '#0369a1', wx + 2, sPierY + 13, 16, sPierH - 22);
    r(ctx, '#38bdf8', wx + 3, sPierY + 14, 14, sPierH - 24);
    r(ctx, '#ffffff', wx + 4, sPierY + 15, 5, 5);
    r(ctx, '#ffffff', wx - 2, sPierY + sPierH - 7, 24, 3);
  }

  // Brass Lantern Sconce (South Pier)
  r(ctx, '#1e293b', 16, sPierY + 6, 8, 2);
  r(ctx, '#ca8a04', 18, sPierY + 8, 6, 12);
  r(ctx, '#fef08a', 20, sPierY + 10, 6, 8);
  r(ctx, '#ffffff', 22, sPierY + 12, 3, 4);

  // Stone base plinth along ground
  r(ctx, '#d4caa9', 6, canvas.height - 6, w - 4, 4);

  // 6. Triumphal Archway Portal & Coffered Vault Underpass (between y: 118 and y: 222)
  // Left jamb masonry reveal (facing inside the portal)
  r(ctx, '#d4caa9', 6, 118, 14, 104);
  r(ctx, '#e2d7b5', 8, 120, 10, 100);
  r(ctx, '#a89d7d', 18, 120, 2, 100);

  // Right jamb masonry reveal
  r(ctx, '#d4caa9', w - 12, 118, 14, 104);
  r(ctx, '#e2d7b5', w - 10, 120, 10, 100);
  r(ctx, '#a89d7d', w - 12, 120, 2, 100);

  // Stone ashlar block lines on jambs
  for (let jy = 126; jy < 220; jy += 14) {
    r(ctx, '#b8aa85', 6, jy, 14, 1);
    r(ctx, '#b8aa85', w - 12, jy, 14, 1);
  }

  // Overhead Vaulted Coffered Archway Ceiling (top of portal)
  r(ctx, '#544634', 20, 118, w - 32, 12);
  r(ctx, '#3e3425', 24, 119, w - 40, 10);
  for (let cx = 30; cx < w - 30; cx += 22) {
    r(ctx, '#6b5c46', cx, 120, 16, 8);
    r(ctx, '#8a795f', cx + 1, 121, 14, 6);
  }

  // Grand Radial Stone Arch Ring (carved arch curve spanning across the top of the portal)
  r(ctx, '#d4caa9', 20, 118, 20, 8);
  r(ctx, '#d4caa9', w - 32, 118, 20, 8);
  r(ctx, '#ffffff', 20, 116, w - 32, 3);

  // Open ornamental wrought-iron gates swung back against jambs
  // North gate wing (folded against north jamb)
  r(ctx, '#0f172a', 20, 124, 3, 36);
  r(ctx, '#ca8a04', 20, 122, 3, 3); // Gold spearhead finial
  r(ctx, '#0f172a', 23, 130, 8, 2);
  r(ctx, '#0f172a', 23, 145, 8, 2);
  r(ctx, '#0f172a', 23, 158, 8, 2);
  r(ctx, '#0f172a', 30, 126, 2, 34);
  r(ctx, '#ca8a04', 30, 124, 2, 3);

  // South gate wing (folded against south jamb)
  r(ctx, '#0f172a', 20, 180, 3, 36);
  r(ctx, '#ca8a04', 20, 214, 3, 3);
  r(ctx, '#0f172a', 23, 184, 8, 2);
  r(ctx, '#0f172a', 23, 198, 8, 2);
  r(ctx, '#0f172a', 23, 212, 8, 2);
  r(ctx, '#0f172a', 30, 180, 2, 34);
  r(ctx, '#ca8a04', 30, 214, 2, 3);

  // Central corridor between y: 130 and y: 210, x: 32..w - 32 is open for player movement!
  return canvas;
}

/** Khu A - Cánh Nam: Trường Quay DNTU Media (Studio & Broadcast Dish) */
function drawKhuASouth(): HTMLCanvasElement {
  const w = 13 * TILE; // 416
  const h = 3 * TILE; // 96
  const roofH = 38;
  const canvas = document.createElement('canvas');
  canvas.width = w + 8;
  canvas.height = h + roofH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  r(ctx, 'rgba(30, 24, 18, 0.35)', 2, roofH + h - 8, w + 4, 12);

  r(ctx, '#5c220e', 4, 2, w, roofH + 18);
  r(ctx, '#b43403', 5, 3, w - 2, roofH + 16);
  for (let ty = 6; ty < roofH + 16; ty += 5) {
    r(ctx, '#ea580c', 6, ty, w - 4, 2);
    r(ctx, '#7c2d12', 6, ty + 2, w - 4, 1);
  }

  oval(ctx, '#cbd5e1', 54, 14, 16, 10);
  oval(ctx, '#94a3b8', 54, 14, 12, 7);
  r(ctx, '#475569', 53, 6, 3, 10);
  r(ctx, '#ef4444', 52, 2, 5, 4);

  const fy = roofH + 22;
  const fh = canvas.height - fy - 4;
  r(ctx, '#0f172a', 6, fy, w - 4, fh);
  r(ctx, '#1e293b', 8, fy + 2, w - 8, fh - 4);

  for (let wx = 16; wx < w - 24; wx += 44) {
    r(ctx, '#0284c7', wx, fy + 8, 32, fh - 16);
    r(ctx, '#38bdf8', wx + 1, fy + 9, 30, fh - 18);
    r(ctx, '#fef08a', wx + 6, fy + 12, 6, 6);
    r(ctx, '#f97316', wx + 18, fy + 12, 6, 6);
  }

  const bw = 250;
  const bx = (w - bw) / 2;
  r(ctx, '#0284c7', bx - 1, fy - 18, bw + 2, 16);
  r(ctx, '#0369a1', bx, fy - 17, bw, 14);
  ctx.font = '800 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('🎥 TRƯỜNG QUAY DNTU - MEDIA STUDIO', w / 2 - 16, fy - 7);

  r(ctx, '#ef4444', bx + bw - 44, fy - 16, 40, 12);
  ctx.font = '900 6.5px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('● ON AIR', bx + bw - 24, fy - 7.5);

  return canvas;
}

/** Khu B - Nguyễn Khuyến: Khoa CNTT & Kinh Tế (4-Story Academic Building) */
function drawKhuB(): HTMLCanvasElement {
  const w = 9 * TILE; // 288
  const h = 9 * TILE; // 288
  const roofH = 42;
  const canvas = document.createElement('canvas');
  canvas.width = w + 8;
  canvas.height = h + roofH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Ground drop shadow
  r(ctx, 'rgba(30, 24, 18, 0.4)', 2, roofH + h - 8, w + 4, 12);

  // 1. Terracotta 4-Slope Hipped Mansard Roof
  r(ctx, '#5c220e', 4, 2, w, roofH + 16);
  r(ctx, '#b43403', 6, 4, w - 4, roofH + 12);
  for (let ty = 6; ty < roofH + 12; ty += 5) {
    r(ctx, '#ea580c', 8, ty, w - 8, 2);
    r(ctx, '#7c2d12', 8, ty + 2, w - 8, 1);
  }

  // Neoclassical Dormer Windows on Roof
  for (let dx = 28; dx < w - 28; dx += 46) {
    r(ctx, '#7c2d12', dx - 1, 10, 16, 18);
    r(ctx, '#fde68a', dx, 11, 14, 16);
    r(ctx, '#0284c7', dx + 2, 13, 10, 12);
    r(ctx, '#38bdf8', dx + 3, 14, 8, 10);
    r(ctx, '#ffffff', dx + 4, 15, 3, 4);
  }

  // White Balustrade & Cornice
  r(ctx, '#fef3c7', 4, roofH + 12, w, 5);
  r(ctx, '#d4caa9', 4, roofH + 16, w, 2);
  for (let bx = 8; bx < w - 8; bx += 10) {
    r(ctx, '#ffffff', bx, roofH + 10, 3, 6);
  }

  // 2. Academic 4-Story Concrete Facade (Cream Stucco & Classical Pilasters)
  const fy = roofH + 18;
  const fh = canvas.height - fy - 4;
  r(ctx, '#fef3c7', 6, fy, w - 4, fh);
  r(ctx, '#fde68a', 8, fy + 2, w - 8, fh - 4);

  // Classical Pilasters dividing the building into 5 bays
  for (let px = 10; px < w - 6; px += 44) {
    r(ctx, '#ffffff', px, fy, 6, fh);
    r(ctx, '#f1f5f9', px + 1, fy, 2, fh);
    r(ctx, '#cbd5e1', px + 4, fy, 2, fh);
  }

  // Multi-tier Classroom & Computer Lab Windows
  for (let wy = fy + 12; wy < fy + fh - 40; wy += 40) {
    // Concrete Sunshade Brise-Soleil above window row
    r(ctx, '#ffffff', 14, wy - 4, w - 24, 3);
    r(ctx, '#cbd5e1', 14, wy - 1, w - 24, 1);

    for (let wx = 18; wx < w - 30; wx += 44) {
      // Double-hung classroom window
      r(ctx, '#0369a1', wx, wy, 28, 26);
      r(ctx, '#38bdf8', wx + 1, wy + 1, 26, 24);

      // Window panes & mullions
      r(ctx, '#ffffff', wx + 13, wy + 1, 2, 24);
      r(ctx, '#ffffff', wx + 1, wy + 12, 26, 2);

      // Interior IT Lab Glow: computer monitors and warm lighting
      r(ctx, '#fef08a', wx + 3, wy + 3, 8, 7); // warm light
      r(ctx, '#1e293b', wx + 16, wy + 15, 8, 7); // monitor frame
      r(ctx, '#22c55e', wx + 17, wy + 16, 6, 5); // green code screen
      r(ctx, '#ffffff', wx + 4, wy + 3, 6, 2); // glass glare
      r(ctx, '#ffffff', wx - 1, wy + 25, 30, 2); // sill
    }
  }

  // 3. Ground Floor Main Entrance (Polished Granite Stairs & Glass Doors)
  const entY = fy + fh - 36;
  const entW = 88;
  const entX = (w - entW) / 2;

  // Red Granite Steps
  r(ctx, '#7f1d1d', entX - 8, entY + 16, entW + 16, 16);
  r(ctx, '#b91c1c', entX - 6, entY + 18, entW + 12, 14);
  r(ctx, '#facc15', entX - 6, entY + 18, entW + 12, 1);

  // Entrance Double Glass Doors
  r(ctx, '#0f172a', entX, entY, entW, 20);
  r(ctx, '#0284c7', entX + 4, entY + 2, entW / 2 - 6, 18);
  r(ctx, '#0284c7', entX + entW / 2 + 2, entY + 2, entW / 2 - 6, 18);
  r(ctx, '#38bdf8', entX + 6, entY + 4, entW / 2 - 10, 14);
  r(ctx, '#38bdf8', entX + entW / 2 + 4, entY + 4, entW / 2 - 10, 14);
  r(ctx, '#facc15', entX + entW / 2 - 2, entY + 8, 4, 8); // brass handles

  // 4. Blue Acrylic 3D Faculty Signboard
  r(ctx, '#1e3a8a', 14, entY - 14, w - 20, 15);
  r(ctx, '#3b82f6', 15, entY - 13, w - 22, 13);
  r(ctx, '#facc15', 16, entY - 12, w - 24, 1);
  ctx.font = '900 7px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('KHU B - NGUYỄN KHUYẾN · KHOA CNTT & KINH TẾ', w / 2 + 4, entY - 3.5);

  return canvas;
}

/** Khu C - Trung Tâm Thông Tin - Thư Viện DNTU (Emerald Curtain Wall & Modern Atrium) */
function drawKhuC(): HTMLCanvasElement {
  const w = 9 * TILE; // 288
  const h = 6.5 * TILE; // 208
  const roofH = 42;
  const canvas = document.createElement('canvas');
  canvas.width = w + 8;
  canvas.height = h + roofH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  r(ctx, 'rgba(20, 30, 45, 0.4)', 2, roofH + h - 8, w + 4, 12);

  // 1. Sage-Green Metallic High-Tech Roof with Solar Skylights
  r(ctx, '#334155', 4, 2, w, roofH + 16);
  r(ctx, '#64748b', 6, 4, w - 4, roofH + 12);
  r(ctx, '#94a3b8', 8, 6, w - 8, roofH + 8);
  r(ctx, '#8eb89f', 10, 8, w - 12, roofH + 4);

  for (let sx = 20; sx < w - 24; sx += 32) {
    r(ctx, '#0369a1', sx, 12, 24, 18);
    r(ctx, '#38bdf8', sx + 1, 13, 22, 2);
    r(ctx, '#0284c7', sx + 1, 16, 22, 1);
  }

  // 2. 4-Story Curved Emerald Glass Curtain Wall
  const fy = roofH + 18;
  const fh = canvas.height - fy - 4;
  r(ctx, '#0f172a', 6, fy, w - 4, fh);

  // Multilevel Bookshelves through Glass
  for (let wx = 12; wx < w - 16; wx += 22) {
    r(ctx, '#0284c7', wx, fy + 4, 18, fh - 32);
    r(ctx, '#38bdf8', wx + 1, fy + 5, 16, fh - 34);

    // Bookshelf tiers with colorful book spines
    for (let by = fy + 12; by < fy + fh - 36; by += 18) {
      r(ctx, '#78350f', wx + 2, by, 14, 3);
      r(ctx, '#dc2626', wx + 3, by - 6, 2, 6);
      r(ctx, '#fbbf24', wx + 6, by - 6, 2, 6);
      r(ctx, '#22c55e', wx + 9, by - 6, 2, 6);
      r(ctx, '#fef08a', wx + 12, by - 4, 3, 3); // brass reading lamp
    }

    // Glass glare highlights
    r(ctx, 'rgba(255, 255, 255, 0.45)', wx + 3, fy + 6, 4, fh - 38);
  }

  // 3. Library Entrance & Turnstile Kiosk
  const signY = fy + fh - 26;
  r(ctx, '#047857', 14, signY, w - 20, 22);
  r(ctx, '#10b981', 16, signY + 2, w - 24, 2);
  ctx.font = '900 7.5px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('TRUNG TÂM THÔNG TIN - THƯ VIỆN DNTU · 50,000+ SÁCH', w / 2 + 4, signY + 14);

  return canvas;
}

/** Khu G - Trung Tâm Tích HỢp & Smart Labs & DNTU Gym (Modern Tech Complex) */
function drawKhuG(): HTMLCanvasElement {
  const w = 11 * TILE; // 352
  const h = 3.2 * TILE; // 102
  const roofH = 28;
  const canvas = document.createElement('canvas');
  canvas.width = w + 8;
  canvas.height = h + roofH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Ground drop shadow
  r(ctx, 'rgba(15, 23, 42, 0.45)', 2, roofH + h - 8, w + 4, 12);

  // 1. High-Tech Obsidian Rooftop with Solar Panels & Telecom Dish
  r(ctx, '#0f172a', 4, 2, w, roofH + 10);
  r(ctx, '#1e293b', 6, 4, w - 4, roofH + 6);

  // Photovoltaic Solar Panel Arrays
  for (let sx = 20; sx < 160; sx += 32) {
    r(ctx, '#334155', sx, 6, 26, 14);
    r(ctx, '#0284c7', sx + 1, 7, 24, 12);
    r(ctx, '#38bdf8', sx + 2, 8, 10, 4);
    r(ctx, '#1e293b', sx + 12, 7, 2, 12);
    r(ctx, '#1e293b', sx + 1, 12, 24, 2);
  }

  // HVAC Chillers & Satellite Telemetry Dish
  r(ctx, '#475569', 180, 6, 36, 14);
  r(ctx, '#64748b', 182, 8, 32, 10);
  oval(ctx, '#334155', 198, 13, 8, 4);

  oval(ctx, '#cbd5e1', 260, 11, 14, 8);
  oval(ctx, '#94a3b8', 260, 11, 10, 5);
  r(ctx, '#475569', 259, 11, 2, 10);
  r(ctx, '#dc2626', 258, 4, 4, 4);

  // 2. Bold Crimson Architectural Accent Band
  r(ctx, '#991b1b', 4, roofH + 6, w, 8);
  r(ctx, '#dc2626', 4, roofH + 7, w, 6);
  r(ctx, '#facc15', 4, roofH + 8, w, 1);
  ctx.font = '900 7px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('KHU G · TRUNG TÂM TÍCH HỢP & SMART LABS · ĐẠI HỌC CÔNG NGHỆ ĐỒNG NAI', w / 2 + 4, roofH + 13);

  // 3. Facade Body (High-tech Dark Slate with Glass Showcases)
  const fy = roofH + 16;
  const fh = canvas.height - fy - 4;
  r(ctx, '#0f172a', 6, fy, w - 4, fh);
  r(ctx, '#1e293b', 8, fy + 2, w - 8, fh - 4);

  // SECTION A: DNTU FITNESS & GYM CENTER (Left 108px)
  r(ctx, '#0f172a', 10, fy + 4, 108, fh - 8);
  r(ctx, '#0284c7', 12, fy + 6, 104, fh - 12);
  r(ctx, '#0369a1', 13, fy + 7, 102, fh - 14);

  // Gym Treadmills (3 units)
  for (let mx = 18; mx < 80; mx += 22) {
    r(ctx, '#1e293b', mx, fy + 16, 14, fh - 30);
    r(ctx, '#334155', mx + 1, fy + 17, 12, 14);
    r(ctx, '#38bdf8', mx + 3, fy + 19, 8, 4); // digital screen
    r(ctx, '#22c55e', mx + 4, fy + 24, 2, 2); // speed indicator
    r(ctx, '#0f172a', mx + 2, fy + 32, 10, fh - 46); // running belt
  }

  // Dumbbell Rack & Training Mirrors
  r(ctx, '#38bdf8', 84, fy + 12, 28, fh - 24);
  r(ctx, '#ffffff', 86, fy + 14, 4, fh - 28);
  r(ctx, '#475569', 86, fy + fh - 22, 24, 6);
  for (let dx = 88; dx < 108; dx += 6) {
    r(ctx, '#0f172a', dx, fy + fh - 26, 4, 5); // dumbbell weights
  }

  // Yellow Neon Gym Sign
  r(ctx, '#ca8a04', 14, fy + fh - 16, 98, 12);
  r(ctx, '#facc15', 15, fy + fh - 15, 96, 10);
  ctx.font = '900 6.5px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#000000';
  ctx.fillText('🏋️ DNTU FITNESS & GYM', 63, fy + fh - 7.5);

  // SECTION B: SMART OPERATIONS & SERVER CENTER (Center 118px)
  const cx = 124;
  r(ctx, '#0f172a', cx, fy + 4, 114, fh - 8);
  r(ctx, '#1e293b', cx + 2, fy + 6, 110, fh - 12);

  // Server Racks with Pulsing LEDs
  for (let rx = cx + 8; rx < cx + 46; rx += 14) {
    r(ctx, '#0f172a', rx, fy + 10, 11, fh - 24);
    for (let sy = fy + 12; sy < fy + fh - 18; sy += 5) {
      r(ctx, '#334155', rx + 1, sy, 9, 3);
      r(ctx, '#22c55e', rx + 2, sy + 1, 2, 1); // green led
      r(ctx, '#06b6d4', rx + 6, sy + 1, 2, 1); // cyan led
    }
  }

  // Interactive Operations Monitor Screen (required by spec!)
  r(ctx, '#0284c7', cx + 50, fy + 10, 60, fh - 24);
  r(ctx, '#0f172a', cx + 52, fy + 12, 56, fh - 28);
  r(ctx, '#06b6d4', cx + 54, fy + 14, 52, 10);
  ctx.font = '800 5px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('DNTU SMART CAMPUS', cx + 80, fy + 21);
  // Data charts & graph lines
  r(ctx, '#22c55e', cx + 56, fy + 28, 12, 2);
  r(ctx, '#eab308', cx + 72, fy + 26, 16, 2);
  r(ctx, '#38bdf8', cx + 92, fy + 30, 14, 2);

  // Glass Sliding Automatic Entrance
  r(ctx, '#38bdf8', cx + 40, fy + fh - 16, 36, 12);
  r(ctx, '#ffffff', cx + 56, fy + fh - 16, 2, 12);

  // SECTION C: SMART ROBOTICS & IOT LAB (Right 98px)
  const rx = 244;
  r(ctx, '#0f172a', rx, fy + 4, 100, fh - 8);
  r(ctx, '#0369a1', rx + 2, fy + 6, 96, fh - 12);

  // Robotic Arm Demonstration Platform
  r(ctx, '#334155', rx + 10, fy + fh - 24, 24, 12);
  r(ctx, '#eab308', rx + 18, fy + fh - 34, 4, 12); // arm link 1
  r(ctx, '#dc2626', rx + 20, fy + fh - 38, 8, 4); // elbow joint
  r(ctx, '#facc15', rx + 26, fy + fh - 34, 6, 3); // gripper

  // Dual-Monitor Workstations
  for (let wx = rx + 44; wx < rx + 90; wx += 24) {
    r(ctx, '#1e293b', wx, fy + 12, 20, 16);
    r(ctx, '#38bdf8', wx + 1, fy + 13, 18, 14);
    r(ctx, '#facc15', wx + 4, fy + 16, 4, 3);
    r(ctx, '#22c55e', wx + 10, fy + 16, 5, 3);
    r(ctx, '#475569', wx + 8, fy + 28, 4, 6);
  }

  // Lab Signboard
  r(ctx, '#1e293b', rx + 6, fy + fh - 14, 88, 10);
  ctx.font = '800 6px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('ROBOTICS & AI LAB', rx + 50, fy + fh - 6.5);

  return canvas;
}

/** Khu F - Trung Tâm Thực Hành Kỹ Thuật Ô Tô & Cơ Khí (State-of-the-Art Workshop) */
function drawKhuF(): HTMLCanvasElement {
  const w = 11 * TILE; // 352
  const h = 3.5 * TILE; // 112
  const roofH = 28;
  const canvas = document.createElement('canvas');
  canvas.width = w + 8;
  canvas.height = h + roofH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Ground shadow
  r(ctx, 'rgba(20, 25, 35, 0.45)', 2, roofH + h - 8, w + 4, 12);

  // 1. Industrial Corrugated Metal Roof with Sawtooth Skylights
  r(ctx, '#334155', 4, 2, w, roofH + 10);
  r(ctx, '#64748b', 6, 4, w - 4, roofH + 6);
  r(ctx, '#94a3b8', 8, 6, w - 8, roofH + 2);

  // Sawtooth Skylights & Cyclone Exhaust Fans
  for (let rx = 16; rx < w - 24; rx += 28) {
    r(ctx, '#0284c7', rx, 8, 18, 12);
    r(ctx, '#38bdf8', rx + 1, 9, 16, 2);
    r(ctx, '#cbd5e1', rx + 18, 6, 3, 16);
  }
  for (const vx of [50, 140, 230, 310]) {
    oval(ctx, '#cbd5e1', vx, 5, 8, 5);
    oval(ctx, '#f8fafc', vx, 4, 5, 3);
  }

  // 2. Royal Blue Dimensional Header Signboard
  r(ctx, '#1e3a8a', 4, roofH + 6, w, 8);
  r(ctx, '#0284c7', 4, roofH + 7, w, 6);
  r(ctx, '#facc15', 4, roofH + 8, w, 1);
  ctx.font = '900 7px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('KHU F · TRUNG TÂM THỰC HÀNH KỸ THUẬT Ô TÔ & CƠ KHÍ · DNTU', w / 2 + 4, roofH + 13);

  // 3. Workshop Bays & Steel Structural Framing
  const fy = roofH + 16;
  const fh = canvas.height - fy - 4;
  r(ctx, '#334155', 6, fy, w - 4, fh);

  // Epoxy Floor with Yellow Safety Lines
  r(ctx, '#475569', 8, fy + fh - 18, w - 8, 16);
  r(ctx, '#eab308', 8, fy + fh - 18, w - 8, 2);

  const bayW = 78;
  const bayGap = 8;
  const startX = 12;

  // BAY 1: HYDRAULIC TWO-POST CAR LIFT & CHASSIS INSPECTION
  const b1 = startX;
  r(ctx, '#0f172a', b1, fy + 4, bayW, fh - 10);
  r(ctx, '#1e293b', b1 + 2, fy + 6, bayW - 4, fh - 14);

  // Hydraulic 2-Post Lift (Blue Columns)
  r(ctx, '#0284c7', b1 + 8, fy + 8, 6, fh - 18);
  r(ctx, '#0284c7', b1 + bayW - 14, fy + 8, 6, fh - 18);
  // Cross Lift Arms
  r(ctx, '#facc15', b1 + 14, fy + 24, bayW - 28, 4);

  // Elevated Red Sports Sedan Car
  r(ctx, '#dc2626', b1 + 18, fy + 14, bayW - 36, 12);
  r(ctx, '#ef4444', b1 + 22, fy + 12, bayW - 44, 4);
  r(ctx, '#0284c7', b1 + 24, fy + 14, 8, 4); // windshield
  r(ctx, '#0284c7', b1 + bayW - 32, fy + 14, 8, 4);
  // Wheels & Rotors
  r(ctx, '#0f172a', b1 + 20, fy + 22, 6, 7);
  r(ctx, '#0f172a', b1 + bayW - 26, fy + 22, 6, 7);
  r(ctx, '#cbd5e1', b1 + 21, fy + 24, 4, 3); // chrome alloy

  // Snap-on Style Red Rolling Tool Chest & Oil Drain Tank
  r(ctx, '#dc2626', b1 + 6, fy + fh - 24, 12, 14);
  r(ctx, '#ffffff', b1 + 8, fy + fh - 21, 8, 1);
  r(ctx, '#ffffff', b1 + 8, fy + fh - 18, 8, 1);
  r(ctx, '#ffffff', b1 + 8, fy + fh - 15, 8, 1);
  // Mobile Oil Drum with Funnel
  r(ctx, '#1e293b', b1 + bayW - 18, fy + fh - 22, 10, 12);
  r(ctx, '#facc15', b1 + bayW - 16, fy + fh - 28, 6, 6);

  // Bay 1 Label
  r(ctx, '#0284c7', b1 + 4, fy + 6, bayW - 8, 7);
  ctx.font = '800 5px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('BAY 1: CẦU NÂNG Ô TÔ', b1 + bayW / 2, fy + 11.5);

  // BAY 2: ELECTRIC VEHICLE (EV) & HYBRID DIAGNOSTICS LAB
  const b2 = b1 + bayW + bayGap;
  r(ctx, '#0f172a', b2, fy + 4, bayW, fh - 10);
  r(ctx, '#1e293b', b2 + 2, fy + 6, bayW - 4, fh - 14);

  // Scissor Lift Platform (Yellow)
  r(ctx, '#eab308', b2 + 14, fy + fh - 20, bayW - 28, 4);
  r(ctx, '#ca8a04', b2 + 20, fy + fh - 28, 4, 8);
  r(ctx, '#ca8a04', b2 + bayW - 24, fy + fh - 28, 4, 8);

  // Sleek Blue Electric Vehicle
  r(ctx, '#0284c7', b2 + 18, fy + 22, bayW - 36, 14);
  r(ctx, '#38bdf8', b2 + 22, fy + 18, bayW - 44, 5);
  r(ctx, '#0f172a', b2 + 20, fy + 32, 6, 8);
  r(ctx, '#0f172a', b2 + bayW - 26, fy + 32, 6, 8);

  // EV Battery Diagnostic Terminal & Cable
  r(ctx, '#10b981', b2 + 6, fy + 16, 12, 22);
  r(ctx, '#34d399', b2 + 8, fy + 18, 8, 8); // screen
  r(ctx, '#06b6d4', b2 + 12, fy + 32, 10, 2); // blue high-voltage cable

  // Bay 2 Label
  r(ctx, '#047857', b2 + 4, fy + 6, bayW - 8, 7);
  ctx.font = '800 5px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('BAY 2: CHẨN ĐOÁN EV & HYBRID', b2 + bayW / 2, fy + 11.5);

  // BAY 3: PRECISION CNC MACHINING & MECHANICAL WORKSHOP
  const b3 = b2 + bayW + bayGap;
  r(ctx, '#0f172a', b3, fy + 4, bayW, fh - 10);
  r(ctx, '#1e293b', b3 + 2, fy + 6, bayW - 4, fh - 14);

  // Heavy Industrial CNC Milling Machine
  r(ctx, '#334155', b3 + 8, fy + 14, 28, fh - 24);
  r(ctx, '#64748b', b3 + 10, fy + 16, 24, 16);
  r(ctx, '#38bdf8', b3 + 12, fy + 18, 12, 12); // acrylic window
  r(ctx, '#22c55e', b3 + 28, fy + 18, 4, 4); // status beacon

  // Precision Metal Lathe & Bench Vise Table
  r(ctx, '#475569', b3 + 42, fy + 18, 30, fh - 28);
  r(ctx, '#cbd5e1', b3 + 44, fy + 20, 16, 6); // metal chuck
  r(ctx, '#dc2626', b3 + 62, fy + 16, 6, 6); // bench vise clamp

  // Bay 3 Label
  r(ctx, '#0284c7', b3 + 4, fy + 6, bayW - 8, 7);
  ctx.font = '800 5px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('BAY 3: GIA CÔNG CNC & CƠ KHÍ', b3 + bayW / 2, fy + 11.5);

  // BAY 4: INDUSTRIAL ROLL-UP DOOR & PARTS STORAGE
  const b4 = b3 + bayW + bayGap;
  r(ctx, '#0f172a', b4, fy + 4, bayW, fh - 10);
  r(ctx, '#1e293b', b4 + 2, fy + 6, bayW - 4, fh - 14);

  // Industrial Galvanized Roll-up Shutter (Half-open)
  for (let sy = fy + 14; sy < fy + fh - 24; sy += 4) {
    r(ctx, '#94a3b8', b4 + 6, sy, bayW - 12, 2);
    r(ctx, '#64748b', b4 + 6, sy + 2, bayW - 12, 1);
  }

  // Heavy Pallet Rack with Automotive Tires & Parts
  r(ctx, '#eab308', b4 + 10, fy + fh - 24, bayW - 20, 3);
  for (let tx = b4 + 12; tx < b4 + bayW - 16; tx += 12) {
    oval(ctx, '#0f172a', tx + 4, fy + fh - 16, 5, 7);
    oval(ctx, '#cbd5e1', tx + 4, fy + fh - 16, 2, 4);
  }

  // Safety Hazard Stripes on Bay 4
  for (let hx = b4 + 6; hx < b4 + bayW - 6; hx += 8) {
    r(ctx, '#facc15', hx, fy + fh - 6, 4, 3);
    r(ctx, '#000000', hx + 4, fy + fh - 6, 4, 3);
  }

  // Bay 4 Label
  r(ctx, '#ea580c', b4 + 4, fy + 6, bayW - 8, 7);
  ctx.font = '800 5px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('BAY 4: KHO LINH KIỆN & CƠ ĐIỆN', b4 + bayW / 2, fy + 11.5);

  return canvas;
}

/** Ký Túc Xá & Căng Tin Sinh Viên DNTU */
function drawKtxCanteen(): HTMLCanvasElement {
  const w = 11 * TILE; // 352
  const h = 4 * TILE; // 128
  const roofH = 38;
  const canvas = document.createElement('canvas');
  canvas.width = w + 8;
  canvas.height = h + roofH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  r(ctx, 'rgba(30, 20, 10, 0.4)', 2, roofH + h - 8, w + 4, 12);

  r(ctx, '#5c220e', 4, 2, w, roofH + 14);
  r(ctx, '#b43403', 6, 4, w - 4, roofH + 10);
  for (let ty = 6; ty < roofH + 12; ty += 5) {
    r(ctx, '#ea580c', 8, ty, w - 8, 2);
  }
  for (let dx = 32; dx < w - 32; dx += 48) {
    r(ctx, '#7c2d12', dx - 1, 12, 16, 16);
    r(ctx, '#fde68a', dx, 13, 14, 14);
    r(ctx, '#0284c7', dx + 2, 15, 10, 10);
  }

  const fy = roofH + 16;
  const fh = canvas.height - fy - 4;
  r(ctx, '#fef3c7', 6, fy, w - 4, fh);
  r(ctx, '#fde68a', 8, fy + 2, w - 8, fh - 4);

  for (let bx = 16; bx < w - 24; bx += 32) {
    r(ctx, '#ffffff', bx, fy + 4, 24, 22);
    r(ctx, '#0284c7', bx + 2, fy + 6, 20, 14);
    r(ctx, '#cbd5e1', bx, fy + 20, 24, 8);
    r(ctx, (bx / 32) % 2 === 0 ? '#ef4444' : '#3b82f6', bx + 4, fy + 16, 6, 5);
  }

  const cantY = fy + 38;
  r(ctx, '#1e293b', 8, cantY, w - 8, fh - 38);
  r(ctx, '#cbd5e1', 12, cantY + 6, w - 16, 12);
  r(ctx, '#94a3b8', 12, cantY + 16, w - 16, 2);
  for (let tx = 20; tx < w - 30; tx += 28) {
    r(ctx, '#f59e0b', tx, cantY + 8, 18, 6);
  }

  r(ctx, '#dc2626', 16, cantY - 14, w - 24, 15);
  r(ctx, '#facc15', 18, cantY - 13, w - 28, 2);
  ctx.font = '800 7px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('KÝ TÚC XÁ & CĂNG TIN DNTU (CƠM GÀ XỐI MỠ · PHỞ BÒ · TRÀ ĐÀO)', w / 2 + 4, cantY - 3.5);

  return canvas;
}

/** Khu Sáng Tạo Khởi Nghiệp DNTU */
function drawKhuKhoiNghiep(): HTMLCanvasElement {
  const w = 10 * TILE; // 320
  const h = 5 * TILE; // 160
  const roofH = 34;
  const canvas = document.createElement('canvas');
  canvas.width = w + 8;
  canvas.height = h + roofH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  r(ctx, 'rgba(6, 95, 70, 0.4)', 2, roofH + h - 8, w + 4, 12);

  r(ctx, '#065f46', 4, 2, w, roofH + 14);
  r(ctx, '#047857', 6, 4, w - 4, roofH + 10);
  r(ctx, '#10b981', 8, 6, w - 8, 4);

  const fy = roofH + 16;
  const fh = canvas.height - fy - 4;
  r(ctx, '#0f172a', 6, fy, w - 4, fh);

  for (let wx = 16; wx < w - 24; wx += 36) {
    r(ctx, '#0284c7', wx, fy + 8, 28, fh - 24);
    r(ctx, '#38bdf8', wx + 1, fy + 9, 26, fh - 26);
    r(ctx, '#facc15', wx + 4, fy + 14, 4, 4);
    r(ctx, '#f43f5e', wx + 10, fy + 14, 4, 4);
    r(ctx, '#38bdf8', wx + 16, fy + 14, 4, 4);
  }

  r(ctx, '#047857', 16, fy + fh - 18, w - 24, 16);
  r(ctx, '#10b981', 18, fy + fh - 17, w - 28, 2);
  ctx.font = '800 7.5px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('TRUNG TÂM SÁNG TẠO KHỞI NGHIỆP DNTU', w / 2 + 4, fy + fh - 7);

  return canvas;
}

/** Trung Tâm Tuyển Sinh & Tư Vấn Hướng Nghiệp */
function drawTuyenSinh(): HTMLCanvasElement {
  const w = 6.5 * TILE; // 208
  const h = 5.5 * TILE; // 176
  const roofH = 34;
  const canvas = document.createElement('canvas');
  canvas.width = w + 8;
  canvas.height = h + roofH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  r(ctx, 'rgba(20, 30, 50, 0.4)', 2, roofH + h - 8, w + 4, 12);

  r(ctx, '#1e3a8a', 4, 2, w, roofH + 14);
  r(ctx, '#1d4ed8', 6, 4, w - 4, roofH + 10);
  r(ctx, '#facc15', 8, 6, w - 8, 3);

  const fy = roofH + 16;
  const fh = canvas.height - fy - 4;
  r(ctx, '#f8fafc', 6, fy, w - 4, fh);

  r(ctx, '#0284c7', 12, fy + 8, w - 20, fh - 36);
  r(ctx, '#38bdf8', 14, fy + 10, w - 24, fh - 40);

  r(ctx, '#b91c1c', 20, fy + 16, 44, fh - 52);
  ctx.font = '800 5.5px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('TUYỂN SINH', 42, fy + 26);
  ctx.fillText('2026', 42, fy + 36);

  r(ctx, '#1e3a8a', 12, fy + fh - 24, w - 16, 20);
  r(ctx, '#3b82f6', 14, fy + fh - 23, w - 20, 2);
  ctx.font = '800 7px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('TRUNG TÂM TUYỂN SINH DNTU', w / 2 + 4, fy + fh - 11);

  return canvas;
}

/** Cổng 1 - Cổng Chính Đại Học Công Nghệ Đồng Nai (North-South Oriented Entrance along East Perimeter) */
function drawCong1(): HTMLCanvasElement {
  const w = 4.5 * TILE; // 144
  const h = 8 * TILE; // 256
  const roofH = 36;
  const canvas = document.createElement('canvas');
  canvas.width = w + 8; // 152
  canvas.height = h + roofH; // 292
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Drop shadow on ground
  r(ctx, 'rgba(30, 20, 10, 0.35)', 2, roofH + h - 8, w + 4, 12);

  // 1. NORTH SECTION: NORTH BRICK PYLON & SECURITY GUARDHOUSE (y: 12..70)
  // 1a. Security Guardhouse (Bốt Bảo Vệ) on the campus side (x: 12..88, y: 16..68)
  const ghX = 12;
  const ghY = 16;
  const ghW = 76;
  const ghH = 52;

  // Guardhouse Shadow
  r(ctx, 'rgba(15, 23, 42, 0.25)', ghX - 2, ghY + ghH - 4, ghW + 4, 8);

  // Guardhouse Hipped Enamel Roof (DNTU Corporate Blue)
  r(ctx, '#0f172a', ghX - 2, ghY, ghW + 4, 12);
  r(ctx, '#0369a1', ghX, ghY + 1, ghW, 10);
  r(ctx, '#38bdf8', ghX + 2, ghY + 2, ghW - 4, 3);
  // White roof fascia & trim
  r(ctx, '#ffffff', ghX - 3, ghY + 11, ghW + 6, 2);

  // Guardhouse Walls (White Granite / Stucco)
  r(ctx, '#f8fafc', ghX, ghY + 13, ghW, ghH - 13);
  r(ctx, '#e2e8f0', ghX + 2, ghY + 15, ghW - 4, ghH - 17);

  // Wrap-around Observation Window with Blue Glare
  r(ctx, '#0f172a', ghX + 6, ghY + 18, ghW - 12, 22);
  r(ctx, '#0284c7', ghX + 8, ghY + 20, ghW - 16, 18);
  r(ctx, '#38bdf8', ghX + 10, ghY + 21, ghW - 20, 16);
  // Glass reflections
  r(ctx, '#ffffff', ghX + 12, ghY + 22, 6, 8);
  r(ctx, '#ffffff', ghX + 28, ghY + 22, 8, 8);
  r(ctx, '#fef08a', ghX + 44, ghY + 26, 4, 6); // Interior desk lamp glow
  // Window frame dividers
  r(ctx, '#0f172a', ghX + 24, ghY + 20, 2, 18);
  r(ctx, '#0f172a', ghX + 42, ghY + 20, 2, 18);

  // Stainless inspection counter shelf
  r(ctx, '#cbd5e1', ghX + 4, ghY + 40, ghW - 8, 3);
  r(ctx, '#94a3b8', ghX + 4, ghY + 43, ghW - 8, 1);

  // Guardhouse Badge
  r(ctx, '#b91c1c', ghX + ghW / 2 - 20, ghY + 46, 40, 6);
  ctx.font = '800 4.5px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('BẢO VỆ · CỔNG 1', ghX + ghW / 2, ghY + 50.5);

  // Automated Boom Barrier (Barie tự động)
  const barX = ghX + ghW + 2; // 90
  const barY = ghY + ghH - 16; // 52
  r(ctx, '#ea580c', barX, barY, 8, 16);
  r(ctx, '#f97316', barX + 1, barY + 1, 6, 14);
  oval(ctx, '#16a34a', barX + 4, barY + 4, 2, 2); // Green status LED
  // Raised diagonal barrier arm (45-degree angle up-right)
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(barX + 4, barY + 4);
  ctx.lineTo(barX - 16, barY - 20);
  ctx.stroke();
  // Red safety stripes on barrier arm
  for (let s = 0; s < 3; s++) {
    r(ctx, '#dc2626', barX - 4 - s * 5, barY - 4 - s * 6, 2, 3);
  }

  // 1b. North Pylon on East perimeter line (x: 108..142, y: 14..68)
  const npX = 108;
  const npY = 14;
  const npW = 34;
  const npH = 54;

  // Granite base plinth
  r(ctx, '#94a3b8', npX - 2, npY + npH - 6, npW + 4, 8);
  r(ctx, '#f8fafc', npX - 1, npY + npH - 5, npW + 2, 6);

  // Imperial red brick body
  r(ctx, '#7c2d12', npX, npY + 6, npW, npH - 12);
  r(ctx, '#b91c1c', npX + 2, npY + 8, npW - 4, npH - 16);
  // Brick mortar horizontal courses
  for (let by = npY + 12; by < npY + npH - 10; by += 5) {
    r(ctx, '#991b1b', npX + 2, by, npW - 4, 1);
  }

  // Molded white stone cornice cap
  r(ctx, '#cbd5e1', npX - 2, npY + 4, npW + 4, 4);
  r(ctx, '#ffffff', npX - 1, npY + 5, npW + 2, 2);
  r(ctx, '#94a3b8', npX + 2, npY + 1, npW - 4, 4);
  r(ctx, '#ffffff', npX + 3, npY + 2, npW - 6, 2);

  // Gilded bronze spherical finial lantern
  oval(ctx, '#ca8a04', npX + npW / 2, npY - 2, 7, 7);
  oval(ctx, '#facc15', npX + npW / 2, npY - 2, 5, 5);
  oval(ctx, '#ffffff', npX + npW / 2 - 1, npY - 3, 2, 2);

  // 2. SOUTH SECTION: SOUTH BRICK PYLON & PEDESTRIAN ACCESS (y: 224..284)
  // 2a. South Pylon on East perimeter line (x: 108..142, y: 224..278)
  const spX = 108;
  const spY = 224;
  const spW = 34;
  const spH = 54;

  // Granite base plinth
  r(ctx, '#94a3b8', spX - 2, spY + spH - 6, spW + 4, 8);
  r(ctx, '#f8fafc', spX - 1, spY + spH - 5, spW + 2, 6);

  // Imperial red brick body
  r(ctx, '#7c2d12', spX, spY + 6, spW, spH - 12);
  r(ctx, '#b91c1c', spX + 2, spY + 8, spW - 4, spH - 16);
  for (let by = spY + 12; by < spY + spH - 10; by += 5) {
    r(ctx, '#991b1b', spX + 2, by, spW - 4, 1);
  }

  // Molded white stone cornice cap
  r(ctx, '#cbd5e1', spX - 2, spY + 4, spW + 4, 4);
  r(ctx, '#ffffff', spX - 1, spY + 5, spW + 2, 2);
  r(ctx, '#94a3b8', spX + 2, spY + 1, spW - 4, 4);
  r(ctx, '#ffffff', spX + 3, spY + 2, spW - 6, 2);

  // Gilded bronze spherical finial lantern
  oval(ctx, '#ca8a04', spX + spW / 2, spY - 2, 7, 7);
  oval(ctx, '#facc15', spX + spW / 2, spY - 2, 5, 5);
  oval(ctx, '#ffffff', spX + spW / 2 - 1, spY - 3, 2, 2);

  // Polished Brass Address Plaque on South Pylon
  r(ctx, '#ca8a04', spX + 4, spY + 18, spW - 8, 24);
  r(ctx, '#fef08a', spX + 5, spY + 19, spW - 10, 22);
  r(ctx, '#78350f', spX + 6, spY + 20, spW - 12, 20);
  ctx.font = '800 4.5px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('ĐẠI HỌC DNTU', spX + spW / 2, spY + 26);
  ctx.font = '700 3.5px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('398 NGUYỄN KHUYẾN', spX + spW / 2, spY + 31);
  ctx.fillText('P. TRẢNG DÀI - TP. BH', spX + spW / 2, spY + 36);

  // 2b. Stainless Pedestrian Access Gate / RFID Turnstile (x: 64..104, y: 242..274)
  r(ctx, '#0f172a', 64, 246, 38, 24);
  r(ctx, '#334155', 66, 248, 34, 20);
  r(ctx, '#e2e8f0', 68, 250, 30, 8);
  r(ctx, '#10b981', 82, 260, 4, 4); // Green access LED
  ctx.font = '800 4px sans-serif';
  ctx.fillStyle = '#10b981';
  ctx.fillText('➔ LỐI ĐI BỘ', 83, 268);

  // 3. OVERHEAD ARCH CANOPY & LONGITUDINAL UNIVERSITY SIGNBOARD
  // Bridges across North and South pylons along the East perimeter (x: 112..144, y: 10..280)
  // Heavy Steel Beam / Fascia
  r(ctx, '#7c2d12', 114, 10, 26, 268);
  r(ctx, '#b91c1c', 116, 12, 22, 264);

  // Terracotta Mansard Tile Rooflet over beam
  r(ctx, '#5c220e', 112, 10, 8, 268);
  r(ctx, '#ea580c', 113, 11, 5, 266);
  r(ctx, '#c2410c', 114, 11, 2, 266);

  // Grand University Entrance Signboard (Vertical banner on the street facade)
  ctx.save();
  ctx.translate(128, 144);
  ctx.rotate(Math.PI / 2); // Rotated to run longitudinally along the East road
  ctx.font = '900 8.5px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('TRƯỜNG ĐẠI HỌC CÔNG NGHỆ ĐỒNG NAI', 0, -2);
  ctx.font = '800 6.5px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('★ CỔNG CHÍNH SỐ 1 · DNTU CAMPUS ★', 0, 5);
  ctx.restore();

  // Overhead LED Welcome Ticker
  r(ctx, '#0f172a', 104, 76, 8, 136);
  r(ctx, '#0284c7', 105, 78, 6, 132);
  ctx.save();
  ctx.translate(108, 144);
  ctx.rotate(Math.PI / 2);
  ctx.font = '800 5px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fde047';
  ctx.fillText('CHÀO MỪNG QUÝ KHÁCH & TÂN SINH VIÊN', 0, 1.5);
  ctx.restore();

  // 4. BOUNDARY CURBS & TACTILE STRIPES
  // North curb edge
  r(ctx, '#cbd5e1', 14, 68, 96, 3);
  r(ctx, '#94a3b8', 14, 71, 96, 1);
  for (let hx = 16; hx < 100; hx += 12) {
    r(ctx, '#facc15', hx, 69, 6, 2);
    r(ctx, '#0f172a', hx + 6, 69, 6, 2);
  }

  // South curb edge
  r(ctx, '#cbd5e1', 14, 222, 96, 3);
  r(ctx, '#94a3b8', 14, 225, 96, 1);
  for (let hx = 16; hx < 100; hx += 12) {
    r(ctx, '#facc15', hx, 222, 6, 2);
    r(ctx, '#0f172a', hx + 6, 222, 6, 2);
  }

  // Notice: The central passageway between y: 72 and y: 222 is completely open!
  return canvas;
}

/** Cổng 2 - Cổng Xe Máy Sinh Viên */
function drawCong2(): HTMLCanvasElement {
  const w = 4 * TILE; // 128
  const h = 3.5 * TILE; // 112
  const roofH = 26;
  const canvas = document.createElement('canvas');
  canvas.width = w + 8;
  canvas.height = h + roofH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  r(ctx, 'rgba(30, 20, 10, 0.4)', 2, roofH + h - 8, w + 4, 12);

  r(ctx, '#334155', 8, 10, w - 16, h + roofH - 16);
  r(ctx, '#64748b', 10, 12, w - 20, h + roofH - 20);
  r(ctx, '#dc2626', 14, 40, w - 28, 4);
  r(ctx, '#ffffff', 24, 40, 12, 4);
  r(ctx, '#ffffff', 54, 40, 12, 4);

  r(ctx, '#0f172a', 14, 18, w - 28, 16);
  ctx.font = '800 6.5px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('CỔNG 2 (XE MÁY)', w / 2 + 4, 29);

  return canvas;
}

/** Trạm Xe Bus Tuyến Số 1 (DNTU ⇄ Biên Hòa) with Blue City Bus */
function drawBusStop(): HTMLCanvasElement {
  const w = 4.2 * TILE; // 134
  const h = 2.2 * TILE; // 70
  const roofH = 20;
  const canvas = document.createElement('canvas');
  canvas.width = w + 8;
  canvas.height = h + roofH;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  r(ctx, '#0369a1', 6, 4, w - 4, 16);
  r(ctx, '#facc15', 6, 4, w - 4, 3);
  ctx.font = '800 6.5px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('🚌 TUYẾN XE BUS SỐ 1 (DNTU ⇄ BIÊN HÒA)', w / 2 + 4, 15);

  const busY = 24;
  r(ctx, '#0284c7', 12, busY, w - 20, 42);
  r(ctx, '#38bdf8', 14, busY + 2, w - 24, 16);
  for (let wx = 20; wx < w - 24; wx += 16) {
    r(ctx, '#ffffff', wx, busY + 4, 10, 12);
  }
  r(ctx, '#fef08a', w - 16, busY + 28, 6, 6);
  r(ctx, '#0f172a', 26, busY + 36, 12, 12);
  r(ctx, '#0f172a', w - 36, busY + 36, 12, 12);

  return canvas;
}

export const DNTU_BUILDINGS: DntuBuilding[] = [
  {
    id: 'khu_a_north',
    name: 'Khu A Cánh Bắc (Giảng Đường & Hội Trường)',
    x: 25 * TILE,
    y: 10 * TILE,
    w: 13 * TILE,
    h: 3 * TILE,
    roofHeight: 38,
    draw: drawKhuANorth,
  },
  {
    id: 'khu_a_east_north',
    name: 'Khu A Trụ Sở Chính - Tháp Hành Chính Bắc',
    x: 35 * TILE,
    y: 10 * TILE,
    w: 3.5 * TILE,
    h: 4 * TILE,
    roofHeight: 42,
    draw: drawKhuAEastNorth,
  },
  {
    id: 'khu_a_east_south',
    name: 'Khu A Trụ Sở Chính - Tháp Hành Chính Nam',
    x: 35 * TILE,
    y: 21 * TILE,
    w: 3.5 * TILE,
    h: 4 * TILE,
    roofHeight: 42,
    draw: drawKhuAEastSouth,
  },
  {
    id: 'khu_a_archway',
    name: 'Cổng Vòm Khải Hoàn Trụ Sở Chính DNTU',
    x: 34.5 * TILE,
    y: 14 * TILE,
    w: 4.5 * TILE,
    h: 7 * TILE,
    roofHeight: 46,
    depth: 2500, // Overhead triumphal archway canopy so player walks underneath!
    draw: drawKhuAArchway,
  },
  {
    id: 'khu_a_south',
    name: 'Khu A Cánh Nam & Trường Quay DNTU Media',
    x: 25 * TILE,
    y: 23 * TILE,
    w: 13 * TILE,
    h: 3 * TILE,
    roofHeight: 38,
    draw: drawKhuASouth,
  },
  {
    id: 'khu_b',
    name: 'Khu B - Nguyễn Khuyến (Khoa CNTT & Kinh Tế)',
    x: 14 * TILE,
    y: 18 * TILE,
    w: 9 * TILE,
    h: 9 * TILE,
    roofHeight: 42,
    draw: drawKhuB,
  },
  {
    id: 'khu_c',
    name: 'Khu C - Trung Tâm Thông Tin - Thư Viện DNTU',
    x: 14 * TILE,
    y: 9 * TILE,
    w: 9 * TILE,
    h: 6.5 * TILE,
    roofHeight: 42,
    draw: drawKhuC,
  },
  {
    id: 'khu_g',
    name: 'Khu G - Trung Tâm Tích Hợp & Smart Labs & DNTU Gym',
    x: 2 * TILE,
    y: 1.2 * TILE,
    w: 11 * TILE,
    h: 3.2 * TILE,
    roofHeight: 28,
    draw: drawKhuG,
  },
  {
    id: 'khu_f',
    name: 'Khu F - Trung Tâm Thực Hành Kỹ Thuật Ô Tô & Cơ Khí',
    x: 2 * TILE,
    y: 5.6 * TILE,
    w: 11 * TILE,
    h: 3.5 * TILE,
    roofHeight: 28,
    draw: drawKhuF,
  },
  {
    id: 'ktx_canteen',
    name: 'Ký Túc Xá & Căng Tin Sinh Viên DNTU',
    x: 2 * TILE,
    y: 27.5 * TILE,
    w: 11 * TILE,
    h: 4 * TILE,
    roofHeight: 38,
    draw: drawKtxCanteen,
  },
  {
    id: 'khu_khoi_nghiep',
    name: 'Trung Tâm Sáng Tạo Khởi Nghiệp DNTU',
    x: 24 * TILE,
    y: 1 * TILE,
    w: 10 * TILE,
    h: 5 * TILE,
    roofHeight: 34,
    draw: drawKhuKhoiNghiep,
  },
  {
    id: 'tuyen_sinh',
    name: 'Trung Tâm Tuyển Sinh & Tư Vấn Hướng Nghiệp',
    x: 40 * TILE,
    y: 3 * TILE,
    w: 6.5 * TILE,
    h: 5.5 * TILE,
    roofHeight: 34,
    draw: drawTuyenSinh,
  },
  {
    id: 'cong_1',
    name: 'Cổng 1 - Cổng Chính Đại Học Công Nghệ Đồng Nai',
    x: 43.5 * TILE,
    y: 16 * TILE,
    w: 4.5 * TILE,
    h: 8 * TILE,
    roofHeight: 36,
    depth: 2500,
    draw: drawCong1,
  },
  {
    id: 'cong_2',
    name: 'Cổng 2 - Cổng Xe Máy Sinh Viên',
    x: 44 * TILE,
    y: 12.5 * TILE,
    w: 4 * TILE,
    h: 3.5 * TILE,
    roofHeight: 26,
    draw: drawCong2,
  },
  {
    id: 'bus_stop',
    name: 'Trạm Xe Bus Tuyến Số 1 DNTU',
    x: 43.5 * TILE,
    y: 0.5 * TILE,
    w: 4.2 * TILE,
    h: 2.2 * TILE,
    roofHeight: 20,
    draw: drawBusStop,
  },
];

// ==========================================
// 3. 2.5D DEPTH-SORTED PROPS & SPORTS ASSETS
// ==========================================

function drawSoccerGoal(isNorth: boolean): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 36;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const gx = 32;
  const gy = isNorth ? 12 : 24;
  r(ctx, 'rgba(0,0,0,0.35)', gx - 28, gy - 2, 56, 10);
  r(ctx, '#ffffff', gx - 26, gy, 52, 3);
  r(ctx, '#ffffff', gx - 26, isNorth ? gy : gy - 16, 3, 18);
  r(ctx, '#ffffff', gx + 23, isNorth ? gy : gy - 16, 3, 18);
  for (let nx = gx - 24; nx < gx + 24; nx += 4) {
    r(ctx, 'rgba(255, 255, 255, 0.45)', nx, isNorth ? gy + 2 : gy - 16, 1, 16);
  }
  return canvas;
}

function drawSoccerBall(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  oval(ctx, 'rgba(0,0,0,0.3)', 8, 14, 6, 2);
  oval(ctx, '#ffffff', 8, 7, 6, 6);
  r(ctx, '#0f172a', 7, 6, 3, 3);
  r(ctx, '#0f172a', 4, 7, 2, 2);
  r(ctx, '#0f172a', 11, 7, 2, 2);
  return canvas;
}

function drawBasketballHoop(facingRight: boolean): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 36;
  canvas.height = 54;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const bx = facingRight ? 6 : 28;
  r(ctx, 'rgba(0,0,0,0.35)', 10, 48, 16, 4);
  r(ctx, '#334155', bx, 8, 4, 42);
  r(ctx, '#ffffff', facingRight ? bx + 4 : bx - 6, 6, 2, 26);
  r(ctx, '#ea580c', facingRight ? bx + 6 : bx - 14, 24, 10, 4);
  r(ctx, 'rgba(255,255,255,0.7)', facingRight ? bx + 7 : bx - 13, 28, 8, 8);
  return canvas;
}

function drawVolleyballNet(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 44;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  r(ctx, '#0f172a', 4, 2, 3, 40);
  r(ctx, '#0f172a', 153, 2, 3, 40);
  r(ctx, '#ffffff', 7, 10, 146, 2);
  r(ctx, '#ffffff', 7, 26, 146, 2);
  for (let nx = 9; nx < 151; nx += 4) {
    r(ctx, 'rgba(255, 255, 255, 0.5)', nx, 12, 1, 14);
  }
  r(ctx, '#ef4444', 24, 4, 2, 12);
  r(ctx, '#ef4444', 136, 4, 2, 12);
  return canvas;
}

function drawStadiumFloodlight(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 24;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  r(ctx, 'rgba(0,0,0,0.35)', 4, 58, 16, 5);
  r(ctx, '#334155', 10, 12, 4, 48);
  for (let y = 16; y < 56; y += 8) {
    r(ctx, '#64748b', 8, y, 8, 1);
  }
  r(ctx, '#0f172a', 2, 4, 20, 10);
  r(ctx, '#fef08a', 4, 6, 16, 6);
  return canvas;
}

function drawFlagpole(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 84;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const fx = 12;
  r(ctx, 'rgba(0,0,0,0.3)', fx - 8, 76, 16, 6);
  r(ctx, '#64748b', fx - 2, 4, 4, 74);
  r(ctx, '#cbd5e1', fx - 1, 4, 2, 74);
  r(ctx, '#fbbf24', fx - 3, 2, 6, 4);

  r(ctx, '#dc2626', fx + 2, 6, 28, 18);
  r(ctx, '#b91c1c', fx + 2, 22, 28, 2);
  r(ctx, '#facc15', fx + 12, 11, 8, 8);
  return canvas;
}

function drawLecturePodium(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 68;
  canvas.height = 36;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  r(ctx, 'rgba(0,0,0,0.3)', 2, 28, 64, 6);
  r(ctx, '#5c220e', 4, 10, 60, 20);
  r(ctx, '#fef3c7', 6, 12, 56, 16);
  r(ctx, '#b91c1c', 10, 14, 48, 12);
  ctx.font = '800 6.5px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('BỤC GIẢNG DNTU', 34, 23);
  r(ctx, '#0f172a', 32, 2, 2, 8);
  r(ctx, '#cbd5e1', 31, 0, 4, 3);
  return canvas;
}

function drawFountain(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 68;
  canvas.height = 54;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  oval(ctx, 'rgba(30, 45, 55, 0.4)', 34, 44, 30, 10);
  oval(ctx, '#94a3b8', 34, 36, 28, 14);
  oval(ctx, '#cbd5e1', 34, 35, 26, 12);
  oval(ctx, '#0284c7', 34, 35, 22, 9);
  oval(ctx, '#38bdf8', 34, 34, 18, 6);

  r(ctx, '#64748b', 32, 18, 4, 18);
  oval(ctx, '#f8fafc', 34, 16, 6, 4);
  oval(ctx, '#38bdf8', 34, 10, 8, 12);
  oval(ctx, '#ffffff', 34, 6, 4, 6);
  return canvas;
}

function drawParkBench(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 34;
  canvas.height = 18;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  r(ctx, 'rgba(0,0,0,0.3)', 2, 12, 30, 4);
  r(ctx, '#475569', 4, 6, 4, 8);
  r(ctx, '#475569', 26, 6, 4, 8);
  r(ctx, '#78350f', 2, 4, 30, 4);
  r(ctx, '#a16207', 3, 4, 28, 2);
  return canvas;
}

function drawDirectoryBoard(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 44;
  canvas.height = 36;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  r(ctx, 'rgba(0,0,0,0.3)', 4, 30, 36, 5);
  r(ctx, '#334155', 10, 16, 4, 16);
  r(ctx, '#334155', 30, 16, 4, 16);
  r(ctx, '#1e3a8a', 4, 4, 36, 18);
  r(ctx, '#38bdf8', 6, 6, 32, 14);
  r(ctx, '#ffffff', 8, 8, 8, 10);
  r(ctx, '#ef4444', 18, 8, 8, 10);
  r(ctx, '#22c55e', 28, 8, 8, 10);
  r(ctx, '#ca8a04', 6, 2, 32, 4);
  ctx.font = '800 4px sans-serif';
  ctx.fillStyle = '#fef08a';
  ctx.textAlign = 'center';
  ctx.fillText('BẢN ĐỒ DNTU', 22, 5);
  return canvas;
}

function drawStreetlamp(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 18;
  canvas.height = 48;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  r(ctx, 'rgba(0,0,0,0.3)', 4, 44, 10, 3);
  r(ctx, '#1e293b', 8, 10, 2, 36);
  r(ctx, '#334155', 6, 4, 6, 8);
  r(ctx, '#fef08a', 7, 5, 4, 6);
  return canvas;
}

function drawMotorbike(color: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 24;
  canvas.height = 20;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  r(ctx, 'rgba(0,0,0,0.35)', 2, 16, 20, 3);
  r(ctx, '#0f172a', 3, 10, 5, 7);
  r(ctx, '#0f172a', 16, 10, 5, 7);
  r(ctx, color, 6, 6, 12, 8);
  r(ctx, '#0f172a', 10, 4, 8, 3);
  r(ctx, '#cbd5e1', 5, 2, 4, 5);
  r(ctx, '#fef08a', 3, 5, 2, 2);
  return canvas;
}

export const DNTU_PROPS: DntuProp[] = [
  {
    id: 'soccer_goal_north',
    name: 'Khung Thành Phía Bắc',
    x: 7.25 * TILE,
    y: 10.8 * TILE,
    w: 64,
    h: 36,
    draw: () => drawSoccerGoal(true),
  },
  {
    id: 'soccer_goal_south',
    name: 'Khung Thành Phía Nam',
    x: 7.25 * TILE,
    y: 20.8 * TILE,
    w: 64,
    h: 36,
    draw: () => drawSoccerGoal(false),
  },
  {
    id: 'soccer_ball',
    name: 'Quả Bóng Đá DNTU',
    x: 7.25 * TILE,
    y: 15.75 * TILE,
    w: 16,
    h: 16,
    draw: drawSoccerBall,
  },
  {
    id: 'bb_hoop_1',
    name: 'Rổ Bóng Rổ Trái',
    x: 7.8 * TILE,
    y: 24 * TILE,
    w: 36,
    h: 54,
    draw: () => drawBasketballHoop(true),
  },
  {
    id: 'bb_hoop_2',
    name: 'Rổ Bóng Rổ Phải',
    x: 12.3 * TILE,
    y: 24 * TILE,
    w: 36,
    h: 54,
    draw: () => drawBasketballHoop(false),
  },
  {
    id: 'volleyball_net',
    name: 'Lưới Bóng Chuyền DNTU',
    x: 4.4 * TILE,
    y: 24 * TILE,
    w: 160,
    h: 44,
    draw: drawVolleyballNet,
  },
  {
    id: 'flagpole',
    name: 'Cột Cờ Tổ Quốc DNTU',
    x: 27 * TILE,
    y: 18 * TILE,
    w: 48,
    h: 84,
    draw: drawFlagpole,
  },
  {
    id: 'podium',
    name: 'Bục Giảng Khối Khu A',
    x: 29.5 * TILE,
    y: 18 * TILE,
    w: 68,
    h: 36,
    draw: drawLecturePodium,
  },
  {
    id: 'fountain',
    name: 'Đài Phun Nước Công Viên DNTU',
    x: 19 * TILE,
    y: 4.2 * TILE,
    w: 68,
    h: 54,
    draw: drawFountain,
  },
  {
    id: 'floodlight_nw',
    name: 'Trụ Đèn Sân Bóng',
    x: 1.8 * TILE,
    y: 10.5 * TILE,
    w: 24,
    h: 64,
    draw: drawStadiumFloodlight,
  },
  {
    id: 'floodlight_ne',
    name: 'Trụ Đèn Sân Bóng',
    x: 12.7 * TILE,
    y: 10.5 * TILE,
    w: 24,
    h: 64,
    draw: drawStadiumFloodlight,
  },
  {
    id: 'floodlight_sw',
    name: 'Trụ Đèn Sân Bóng',
    x: 1.8 * TILE,
    y: 21 * TILE,
    w: 24,
    h: 64,
    draw: drawStadiumFloodlight,
  },
  {
    id: 'floodlight_se',
    name: 'Trụ Đèn Sân Bóng',
    x: 12.7 * TILE,
    y: 21 * TILE,
    w: 24,
    h: 64,
    draw: drawStadiumFloodlight,
  },
  {
    id: 'bench_1',
    name: 'Ghế Đá Công Viên',
    x: 16 * TILE,
    y: 5 * TILE,
    w: 34,
    h: 18,
    draw: drawParkBench,
  },
  {
    id: 'bench_2',
    name: 'Ghế Đá Công Viên',
    x: 21.5 * TILE,
    y: 5 * TILE,
    w: 34,
    h: 18,
    draw: drawParkBench,
  },
  {
    id: 'bench_3',
    name: 'Ghế Đá Sân Trường',
    x: 27 * TILE,
    y: 14 * TILE,
    w: 34,
    h: 18,
    draw: drawParkBench,
  },
  {
    id: 'bench_4',
    name: 'Ghế Đá Sân Trường',
    x: 32 * TILE,
    y: 14 * TILE,
    w: 34,
    h: 18,
    draw: drawParkBench,
  },
  {
    id: 'lamp_1',
    name: 'Đèn Đường Khuôn Viên',
    x: 35.5 * TILE,
    y: 8 * TILE,
    w: 18,
    h: 48,
    draw: drawStreetlamp,
  },
  {
    id: 'lamp_arch_north',
    name: 'Đèn Cổng Vòm Bắc',
    x: 35.5 * TILE,
    y: 15.2 * TILE,
    w: 18,
    h: 48,
    draw: drawStreetlamp,
  },
  {
    id: 'lamp_arch_south',
    name: 'Đèn Cổng Vòm Nam',
    x: 35.5 * TILE,
    y: 20.8 * TILE,
    w: 18,
    h: 48,
    draw: drawStreetlamp,
  },
  {
    id: 'directory_board',
    name: 'Bảng Chỉ Dẫn Khuôn Viên DNTU',
    x: 42 * TILE,
    y: 16.8 * TILE,
    w: 44,
    h: 36,
    draw: drawDirectoryBoard,
  },
  {
    id: 'lamp_3',
    name: 'Đèn Đường Khuôn Viên',
    x: 24 * TILE,
    y: 20.5 * TILE,
    w: 18,
    h: 48,
    draw: drawStreetlamp,
  },
  {
    id: 'moto_1',
    name: 'Xe Honda Wave Đỏ',
    x: 39.8 * TILE,
    y: 13.5 * TILE,
    w: 24,
    h: 20,
    draw: () => drawMotorbike('#dc2626'),
  },
  {
    id: 'moto_2',
    name: 'Xe AirBlade Xanh',
    x: 41 * TILE,
    y: 13.5 * TILE,
    w: 24,
    h: 20,
    draw: () => drawMotorbike('#0284c7'),
  },
  {
    id: 'moto_3',
    name: 'Xe Vision Trắng',
    x: 42.2 * TILE,
    y: 13.5 * TILE,
    w: 24,
    h: 20,
    draw: () => drawMotorbike('#f8fafc'),
  },
  {
    id: 'moto_4',
    name: 'Xe SH Đen Nhám',
    x: 39.8 * TILE,
    y: 15.2 * TILE,
    w: 24,
    h: 20,
    draw: () => drawMotorbike('#1e293b'),
  },
  {
    id: 'moto_5',
    name: 'Xe Wave Alpha Cam',
    x: 41 * TILE,
    y: 15.2 * TILE,
    w: 24,
    h: 20,
    draw: () => drawMotorbike('#ea580c'),
  },
];

// ==========================================
// 4. 2.5D DEPTH-SORTED CAMPUS TREES
// ==========================================

export function drawDntuTree(
  kind: 'flamboyant' | 'palm' | 'yellow' | 'shade' = 'shade',
  scale = 1,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(72 * scale);
  canvas.height = Math.round(88 * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const cx = canvas.width / 2;
  const by = canvas.height - 4 * scale;
  const rng = mulberry(Math.floor(scale * 100));

  oval(ctx, 'rgba(40, 56, 32, 0.28)', cx + 2, by - 1, 20 * scale, 6 * scale);

  if (kind === 'palm') {
    r(ctx, '#78563d', cx - 2 * scale, by - 36 * scale, 4 * scale, 36 * scale);
    r(ctx, '#a67d58', cx - 1 * scale, by - 34 * scale, 2 * scale, 32 * scale);
    for (let py = by - 32 * scale; py < by - 4 * scale; py += 6 * scale) {
      r(ctx, '#543b28', cx - 2 * scale, py, 4 * scale, 1);
    }
    const fronds = [
      [-18, -44, 20, 6, -0.3],
      [18, -44, 20, 6, 0.3],
      [-14, -52, 16, 6, -0.6],
      [14, -52, 16, 6, 0.6],
      [0, -58, 8, 20, 0],
    ];
    for (const [fdx, fdy, frx, fry, rot] of fronds) {
      ctx.save();
      ctx.translate(cx + fdx! * scale, by + fdy! * scale);
      ctx.rotate(rot!);
      oval(ctx, '#1e5f38', 0, 0, frx! * scale, fry! * scale);
      oval(ctx, '#2e8b4e', -1 * scale, -1 * scale, (frx! - 2) * scale, (fry! - 1) * scale);
      ctx.restore();
    }
    return canvas;
  }

  r(ctx, '#5b4432', cx - 4 * scale, by - 26 * scale, 8 * scale, 26 * scale);
  r(ctx, '#8b6947', cx - 3 * scale, by - 24 * scale, 3 * scale, 22 * scale);
  r(ctx, '#3f2e22', cx - 6 * scale, by - 3 * scale, 12 * scale, 4 * scale);

  const clusters = [
    [-12, -32, 16, 14],
    [12, -32, 16, 14],
    [-8, -46, 17, 15],
    [9, -46, 16, 14],
    [0, -58, 15, 13],
  ];

  const baseColor = kind === 'flamboyant' ? '#275231' : kind === 'yellow' ? '#3c5a2c' : '#2b4d34';
  const midColor = kind === 'flamboyant' ? '#3a7346' : kind === 'yellow' ? '#527c39' : '#3e6d49';
  const highColor = kind === 'flamboyant' ? '#599c68' : kind === 'yellow' ? '#7ca94c' : '#5da16b';

  for (const [dx, dy, rx, ry] of clusters) {
    const x = cx + dx! * scale;
    const y = by + dy! * scale;
    oval(ctx, baseColor, x, y, rx! * scale + 1, ry! * scale + 1);
    oval(ctx, midColor, x, y - 1 * scale, rx! * scale, ry! * scale - 1);
    oval(ctx, highColor, x - 2 * scale, y - 3 * scale, rx! * scale * 0.78, ry! * scale * 0.65);

    for (let i = 0; i < 9; i++) {
      let fleckColor = highColor;
      if (kind === 'flamboyant' && rng() > 0.35) {
        fleckColor = rng() > 0.5 ? '#dc2626' : '#ef4444';
      } else if (kind === 'yellow' && rng() > 0.35) {
        fleckColor = rng() > 0.5 ? '#facc15' : '#fde047';
      }
      r(
        ctx,
        fleckColor,
        x - 9 * scale + rng() * 18 * scale,
        y - 8 * scale + rng() * 14 * scale,
        2 * scale,
        1.5 * scale,
      );
    }
  }

  return canvas;
}

export const DNTU_TREES: DntuTree[] = [
  // Courtyard Royal Palms & Phượng Vĩ
  { x: 26 * TILE, y: 15 * TILE, kind: 'palm', scale: 1 },
  { x: 26 * TILE, y: 19 * TILE, kind: 'palm', scale: 1 },
  { x: 34 * TILE, y: 15 * TILE, kind: 'palm', scale: 1 },
  { x: 34 * TILE, y: 19 * TILE, kind: 'palm', scale: 1 },
  { x: 27 * TILE, y: 22 * TILE, kind: 'flamboyant', scale: 1.1 },
  { x: 33 * TILE, y: 22 * TILE, kind: 'flamboyant', scale: 1.1 },

  // Công Viên DNTU Trees (North Park)
  { x: 15.5 * TILE, y: 3 * TILE, kind: 'flamboyant', scale: 1.15 },
  { x: 18 * TILE, y: 2 * TILE, kind: 'yellow', scale: 1.05 },
  { x: 21 * TILE, y: 2.5 * TILE, kind: 'flamboyant', scale: 1.1 },
  { x: 23 * TILE, y: 3.5 * TILE, kind: 'shade', scale: 1.2 },
  { x: 16.5 * TILE, y: 6 * TILE, kind: 'shade', scale: 1.0 },
  { x: 22 * TILE, y: 6 * TILE, kind: 'yellow', scale: 1.0 },

  // Sports Field Perimeter Shade Trees
  { x: 1.5 * TILE, y: 13 * TILE, kind: 'shade', scale: 1.1 },
  { x: 1.5 * TILE, y: 17 * TILE, kind: 'shade', scale: 1.1 },
  { x: 1.5 * TILE, y: 24 * TILE, kind: 'shade', scale: 1.05 },
  { x: 7 * TILE, y: 27 * TILE, kind: 'shade', scale: 1.0 },
  { x: 12.8 * TILE, y: 13 * TILE, kind: 'flamboyant', scale: 1.05 },
  { x: 12.8 * TILE, y: 17 * TILE, kind: 'yellow', scale: 1.0 },

  // Central Spine & Avenue Palms
  { x: 35.5 * TILE, y: 5 * TILE, kind: 'palm', scale: 1 },
  { x: 35.5 * TILE, y: 11 * TILE, kind: 'palm', scale: 1 },
  { x: 35.5 * TILE, y: 23 * TILE, kind: 'palm', scale: 1 },
  { x: 35.5 * TILE, y: 27 * TILE, kind: 'palm', scale: 1 },
  { x: 38 * TILE, y: 15.2 * TILE, kind: 'palm', scale: 1.1 },
  { x: 38 * TILE, y: 21.2 * TILE, kind: 'palm', scale: 1.1 },
  { x: 42 * TILE, y: 15.2 * TILE, kind: 'palm', scale: 1.1 },
  { x: 42 * TILE, y: 21.2 * TILE, kind: 'flamboyant', scale: 1.2 },
  { x: 42 * TILE, y: 25 * TILE, kind: 'flamboyant', scale: 1.2 },

  // Walkways around Khu G & Khu F
  { x: 7 * TILE, y: 4.8 * TILE, kind: 'shade', scale: 0.9 },
  { x: 12.8 * TILE, y: 4.8 * TILE, kind: 'palm', scale: 0.95 },
  { x: 7 * TILE, y: 9.6 * TILE, kind: 'yellow', scale: 0.9 },

  // Admissions & Badminton Garden
  { x: 39.5 * TILE, y: 2 * TILE, kind: 'yellow', scale: 1.0 },
  { x: 46.5 * TILE, y: 2 * TILE, kind: 'flamboyant', scale: 1.0 },
  { x: 39.5 * TILE, y: 9 * TILE, kind: 'shade', scale: 1.05 },

  // Ký Túc Xá & South Boundary
  { x: 1.5 * TILE, y: 31 * TILE, kind: 'shade', scale: 1.1 },
  { x: 13.5 * TILE, y: 31 * TILE, kind: 'shade', scale: 1.1 },
  { x: 18 * TILE, y: 28 * TILE, kind: 'flamboyant', scale: 1.05 },
  { x: 23 * TILE, y: 28 * TILE, kind: 'yellow', scale: 1.05 },
];

// ==========================================
// 5. NPC CHARACTERS
// ==========================================

export function drawDntuPerson(person: DntuPerson): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 44;
  c.height = 48;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const skin = '#f8d0b0';
  const hair = person.avatarStyle.hairColor;
  const shirt = person.avatarStyle.shirtColor;
  const shirtShadow = shade(shirt, -0.25);

  if (person.avatarStyle.pose === 'robot') {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(14, 38, 16, 6);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(16, 40, 12, 2);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(12, 20, 20, 18);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(14, 24, 16, 10);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(20, 27, 4, 4);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(14, 6, 16, 14);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(16, 9, 12, 6);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(18, 11, 3, 2);
    ctx.fillRect(23, 11, 3, 2);

    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(21, 2, 2, 4);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(20, 0, 4, 3);
    return c;
  }

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(10, 6, 24, 28);
  ctx.fillStyle = '#475569';
  ctx.fillRect(12, 8, 20, 24);

  if (person.avatarStyle.pose === 'lecturing') {
    ctx.fillStyle = shirtShadow;
    ctx.fillRect(14, 18, 16, 22);
    ctx.fillStyle = shirt;
    ctx.fillRect(15, 18, 14, 20);

    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(21, 20, 2, 10);

    ctx.fillStyle = hair;
    ctx.fillRect(14, 6, 16, 12);
    ctx.fillStyle = skin;
    ctx.fillRect(16, 10, 12, 8);

    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 1;
    ctx.strokeRect(17, 12, 4, 3);
    ctx.strokeRect(23, 12, 4, 3);
    ctx.fillStyle = '#16a34a';
    ctx.fillRect(20, 16, 4, 1);
  } else {
    ctx.fillStyle = shirtShadow;
    ctx.fillRect(12, 18, 20, 22);
    ctx.fillStyle = shirt;
    ctx.fillRect(14, 18, 16, 20);

    ctx.fillStyle = shirt;
    ctx.fillRect(8, 26, 28, 6);
    ctx.fillStyle = skin;
    ctx.fillRect(18, 30, 8, 4);

    ctx.fillStyle = hair;
    ctx.fillRect(13, 8, 18, 12);
    ctx.fillStyle = skin;
    ctx.fillRect(15, 12, 14, 8);

    ctx.fillStyle = INK;
    ctx.fillRect(18, 14, 2, 2);
    ctx.fillRect(24, 14, 2, 2);

    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(20, 20, 4, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(20, 28, 4, 4);
  }

  return c;
}

/** Composite function for single-image backwards compatibility */
export function paintDntuCampus(): HTMLCanvasElement {
  const c = paintDntuGround();
  const ctx = c.getContext('2d')!;

  for (const b of DNTU_BUILDINGS) {
    const bCanvas = b.draw();
    ctx.drawImage(bCanvas, b.x, b.y - b.roofHeight);
  }

  for (const p of DNTU_PROPS) {
    const pCanvas = p.draw();
    ctx.drawImage(pCanvas, p.x - p.w / 2, p.y - p.h);
  }

  for (const t of DNTU_TREES) {
    const tCanvas = drawDntuTree(t.kind, t.scale);
    ctx.drawImage(tCanvas, t.x - tCanvas.width / 2, t.y - tCanvas.height + 4);
  }

  return c;
}
