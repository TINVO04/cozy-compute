import { BIDA_COLS, BIDA_ROWS, TILE } from '@cozy/game-data';

export const BIDA_W = BIDA_COLS * TILE; // 512
export const BIDA_H = BIDA_ROWS * TILE; // 384

export interface BidaPerson {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  dialogue: string;
  avatarStyle: {
    hairColor: string;
    shirtColor: string;
    pose: 'manager' | 'player' | 'referee';
  };
}

export const BIDA_PEOPLE: BidaPerson[] = [
  {
    id: 'tuan_quan_ly',
    name: 'Anh Tuấn',
    role: 'Chủ & Quản Lý CLB H2S',
    x: 3.2 * TILE,
    y: 2.2 * TILE,
    dialogue:
      'Chào mừng bạn đến với CLB Bida H2S Trảng Dài Biên Hòa! Toàn bộ bàn thi đấu chuẩn tournament quốc tế, băng cao su Đài Loan và vải nỉ Min cao cấp. Bạn có thể nhấn E vào bất kỳ bàn bida nào để tạo phòng đấu 1v1 hoặc luyện tập nhé!',
    avatarStyle: {
      hairColor: '#0f172a',
      shirtColor: '#047857',
      pose: 'manager',
    },
  },
  {
    id: 'minh_long_co_thu',
    name: 'Minh Long',
    role: 'Cơ Thủ Hạng A Biên Hòa',
    x: 6.8 * TILE,
    y: 5.2 * TILE,
    dialogue:
      'Cơ Predator carbon của tôi đã mài sẵn đầu tẩy Kamui rồi! Ai muốn solo 8-Ball hay Carom 3 Băng thì tạo phòng vào so tài kiếm Xu giao lưu nào!',
    avatarStyle: {
      hairColor: '#334155',
      shirtColor: '#ea580c',
      pose: 'player',
    },
  },
  {
    id: 'huy_trong_tai',
    name: 'Trọng Tài Huy',
    role: 'Trọng Tài & Hướng Dẫn',
    x: 13.5 * TILE,
    y: 5.2 * TILE,
    dialogue:
      'Luật thi đấu chuẩn: Ăn bi hợp lệ được đánh tiếp, bi cái vào lỗ (scratch) sẽ bị phạt nhường lượt! Hãy chọn bàn bida, nhấn E hoặc bấm nút Bida Arena để vào trận!',
    avatarStyle: {
      hairColor: '#1e293b',
      shirtColor: '#0284c7',
      pose: 'referee',
    },
  },
];

function r(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function oval(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, rx: number, ry: number) {
  for (let dy = -Math.floor(ry); dy <= ry; dy++) {
    const dx = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)));
    r(ctx, color, x - dx, y + dy, dx * 2 + 1, 1);
  }
}

/** Draws an authentic 2.5D Tournament Billiards Table */
function drawBilliardsTable(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  feltColor: string,
  tableNum: string,
  isPool = true,
) {
  oval(ctx, 'rgba(15, 23, 42, 0.45)', x + w / 2, y + h + 4, w / 2 + 8, 12);

  const legW = 12;
  const legH = 14;
  r(ctx, '#291809', x + 6, y + h - 6, legW, legH);
  r(ctx, '#451a03', x + 8, y + h - 6, legW - 4, legH);
  r(ctx, '#d4af37', x + 6, y + h + legH - 8, legW, 2);

  r(ctx, '#291809', x + w - 18, y + h - 6, legW, legH);
  r(ctx, '#451a03', x + w - 16, y + h - 6, legW - 4, legH);
  r(ctx, '#d4af37', x + w - 18, y + h + legH - 8, legW, 2);

  r(ctx, '#1c1917', x - 1, y - 1, w + 2, h + 2);
  r(ctx, '#451a03', x, y, w, h);
  r(ctx, '#78350f', x + 2, y + 2, w - 4, 4);

  r(ctx, '#e2e8f0', x, y, 7, 7);
  r(ctx, '#94a3b8', x + 1, y + 1, 5, 5);
  r(ctx, '#e2e8f0', x + w - 7, y, 7, 7);
  r(ctx, '#94a3b8', x + w - 6, y + 1, 5, 5);
  r(ctx, '#e2e8f0', x, y + h - 7, 7, 7);
  r(ctx, '#94a3b8', x + 1, y + h - 6, 5, 5);
  r(ctx, '#e2e8f0', x + w - 7, y + h - 7, 7, 7);
  r(ctx, '#94a3b8', x + w - 6, y + h - 6, 5, 5);

  for (let d = 1; d <= 5; d++) {
    const dx = x + (w * d) / 6;
    r(ctx, '#fef08a', dx - 1, y + 2, 2, 2);
    r(ctx, '#fef08a', dx - 1, y + h - 4, 2, 2);
  }
  for (let d = 1; d <= 3; d++) {
    const dy = y + (h * d) / 4;
    r(ctx, '#fef08a', x + 2, dy - 1, 2, 2);
    r(ctx, '#fef08a', x + w - 4, dy - 1, 2, 2);
  }

  const pad = 8;
  const pw = w - pad * 2;
  const ph = h - pad * 2;
  r(ctx, '#0f172a', x + pad - 1, y + pad - 1, pw + 2, ph + 2);
  r(ctx, feltColor, x + pad, y + pad, pw, ph);

  ctx.font = '700 7px "Inter", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.textAlign = 'center';
  ctx.fillText(`H2S · ${tableNum}`, x + w / 2, y + pad + 10);

  if (isPool) {
    const pr = 4;
    oval(ctx, '#09090b', x + pad, y + pad, pr, pr);
    oval(ctx, '#09090b', x + w - pad, y + pad, pr, pr);
    oval(ctx, '#09090b', x + pad, y + h - pad, pr, pr);
    oval(ctx, '#09090b', x + w - pad, y + h - pad, pr, pr);
    oval(ctx, '#09090b', x + w / 2, y + pad - 1, pr, pr - 1);
    oval(ctx, '#09090b', x + w / 2, y + h - pad + 1, pr, pr - 1);

    oval(ctx, '#f8fafc', x + pad + 25, y + h / 2, 3, 3);
    oval(ctx, '#eab308', x + w - pad - 35, y + h / 2, 3, 3);
    oval(ctx, '#2563eb', x + w - pad - 30, y + h / 2 - 5, 3, 3);
    oval(ctx, '#dc2626', x + w - pad - 30, y + h / 2 + 5, 3, 3);
    oval(ctx, '#09090b', x + w - pad - 25, y + h / 2, 3, 3);
  } else {
    oval(ctx, '#f8fafc', x + pad + 30, y + pad + 15, 3.5, 3.5);
    oval(ctx, '#facc15', x + w / 2, y + h - pad - 15, 3.5, 3.5);
    oval(ctx, '#dc2626', x + w - pad - 30, y + h / 2, 3.5, 3.5);
  }

  const lightW = w - 16;
  const lightH = 8;
  const lightY = y - 26;

  r(ctx, '#64748b', x + 18, lightY - 14, 1, 14);
  r(ctx, '#64748b', x + w - 19, lightY - 14, 1, 14);

  r(ctx, '#09090b', x + 8, lightY, lightW, lightH);
  r(ctx, '#d4af37', x + 8, lightY + lightH - 2, lightW, 2);

  r(ctx, '#ffffff', x + 10, lightY + lightH, lightW - 4, 3);
  r(ctx, 'rgba(254, 240, 138, 0.28)', x + 6, lightY + lightH + 3, lightW + 4, 12);
}

/** Paints the high-end, realistic interior of CLB Bida H2S Trảng Dài Biên Hòa */
export function paintBidaInterior(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = BIDA_W;
  c.height = BIDA_H;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // 1. FLOOR & CARPETS
  for (let y = 0; y < BIDA_H; y += 16) {
    for (let x = 0; x < BIDA_W; x += 32) {
      const isAlt = ((x / 32) ^ (y / 16)) % 2 === 0;
      r(ctx, isAlt ? '#78350f' : '#6b2d0b', x, y, 32, 16);
      r(ctx, '#92400e', x, y, 32, 1);
      r(ctx, '#542008', x + 31, y, 1, 16);
    }
  }

  // Central Walkway Grand Red Carpet (Unobstructed entrance from door into hall)
  r(ctx, '#7f1d1d', 7.1 * TILE, 3.0 * TILE, 1.8 * TILE, 8.7 * TILE);
  r(ctx, '#d4af37', 7.1 * TILE, 3.0 * TILE, 2, 8.7 * TILE);
  r(ctx, '#d4af37', 8.9 * TILE - 2, 3.0 * TILE, 2, 8.7 * TILE);

  // Table 01 Carpet (Pool, Upper Left)
  r(ctx, '#1e293b', 1.5 * TILE, 3.5 * TILE, 5.4 * TILE, 3.1 * TILE);
  r(ctx, '#d4af37', 1.5 * TILE, 3.5 * TILE, 5.4 * TILE, 2);
  r(ctx, '#d4af37', 1.5 * TILE, 6.6 * TILE - 2, 5.4 * TILE, 2);

  // Table 02 Carpet (Carom, Upper Right)
  r(ctx, '#1e293b', 9.1 * TILE, 3.5 * TILE, 5.4 * TILE, 3.1 * TILE);
  r(ctx, '#d4af37', 9.1 * TILE, 3.5 * TILE, 5.4 * TILE, 2);
  r(ctx, '#d4af37', 9.1 * TILE, 6.6 * TILE - 2, 5.4 * TILE, 2);

  // Table 03 Carpet (VIP Arena, Lower Left)
  r(ctx, '#0f172a', 1.5 * TILE, 6.9 * TILE, 5.4 * TILE, 3.1 * TILE);
  r(ctx, '#e11d48', 1.5 * TILE, 6.9 * TILE, 5.4 * TILE, 2);
  r(ctx, '#e11d48', 1.5 * TILE, 10.0 * TILE - 2, 5.4 * TILE, 2);

  // 2. BACK WALL & SIGNBOARD
  r(ctx, '#1c1917', 0, 0, BIDA_W, 64);
  r(ctx, '#292524', 0, 4, BIDA_W, 58);
  for (let wx = 8; wx < BIDA_W; wx += 24) {
    r(ctx, '#44403c', wx, 4, 2, 58);
  }
  r(ctx, '#78350f', 0, 60, BIDA_W, 4);

  const signX = BIDA_W / 2 - 130;
  const signY = 10;
  const signW = 260;
  const signH = 32;

  r(ctx, '#09090b', signX - 2, signY - 2, signW + 4, signH + 4);
  r(ctx, '#111827', signX, signY, signW, signH);
  r(ctx, '#d4af37', signX + 1, signY + 1, signW - 2, signH - 2);
  r(ctx, '#0f172a', signX + 3, signY + 3, signW - 6, signH - 6);

  oval(ctx, '#d4af37', signX + 22, signY + 16, 10, 10);
  oval(ctx, '#09090b', signX + 22, signY + 16, 8, 8);
  oval(ctx, '#f8fafc', signX + 22, signY + 16, 4, 4);
  ctx.font = '800 6px sans-serif';
  ctx.fillStyle = '#09090b';
  ctx.textAlign = 'center';
  ctx.fillText('8', signX + 22, signY + 18);

  ctx.font = '900 11px "Inter", sans-serif';
  ctx.fillStyle = '#facc15';
  ctx.textAlign = 'center';
  ctx.fillText('CLB BIDA H2S · BIÊN HÒA', signX + signW / 2 + 6, signY + 15);

  ctx.font = '600 6.5px "Inter", sans-serif';
  ctx.fillStyle = '#67e8f9';
  ctx.fillText('BÀN THI ĐẤU QUỐC TẾ · TRẢNG DÀI · ĐỒNG NAI', signX + signW / 2 + 6, signY + 25);

  function drawCueRack(rx: number, ry: number) {
    r(ctx, '#451a03', rx, ry, 36, 40);
    r(ctx, '#78350f', rx + 2, ry + 2, 32, 36);
    for (let i = 0; i < 6; i++) {
      const cx = rx + 5 + i * 5;
      r(ctx, i % 2 === 0 ? '#fef08a' : '#09090b', cx, ry + 4, 2, 32);
      r(ctx, '#38bdf8', cx, ry + 4, 2, 4);
      r(ctx, '#d97706', cx, ry + 26, 2, 10);
    }
    r(ctx, '#291809', rx - 2, ry + 36, 40, 4);
    r(ctx, '#0284c7', rx + 4, ry + 34, 4, 3);
    r(ctx, '#0284c7', rx + 12, ry + 34, 4, 3);
  }

  drawCueRack(28, 12);
  drawCueRack(BIDA_W - 64, 12);

  const boardX = BIDA_W - 145;
  r(ctx, '#09090b', boardX, 12, 65, 34);
  r(ctx, '#1e293b', boardX + 2, 14, 61, 30);
  ctx.font = '700 6px monospace';
  ctx.fillStyle = '#ef4444';
  ctx.textAlign = 'left';
  ctx.fillText('TOURNAMENT LIVE', boardX + 5, 22);
  ctx.fillStyle = '#22c55e';
  ctx.fillText('P1: 80 PTS', boardX + 5, 30);
  ctx.fillStyle = '#eab308';
  ctx.fillText('P2: 60 PTS', boardX + 5, 38);

  // 3. BAR COUNTER
  const barX = 1 * TILE + 4;
  const barY = 1.2 * TILE;
  const barW = 4 * TILE;
  const barH = 1.8 * TILE;

  r(ctx, '#09090b', barX - 1, barY - 1, barW + 2, barH + 2);
  r(ctx, '#334155', barX, barY, barW, barH);
  r(ctx, '#475569', barX + 2, barY + 2, barW - 4, 4);

  r(ctx, '#0284c7', barX + 12, barY + 8, 38, 34);
  r(ctx, '#bae6fd', barX + 14, barY + 10, 34, 30);
  for (let dx = barX + 18; dx < barX + 38; dx += 8) {
    r(ctx, '#ef4444', dx, barY + 14, 6, 10);
    r(ctx, '#facc15', dx, barY + 26, 6, 10);
  }

  r(ctx, '#09090b', barX + 65, barY + 14, 20, 16);
  r(ctx, '#22c55e', barX + 67, barY + 16, 16, 10);
  r(ctx, '#f8fafc', barX + 95, barY + 20, 8, 10);
  r(ctx, '#78350f', barX + 96, barY + 24, 6, 5);

  // 4. TABLES
  drawBilliardsTable(ctx, 1.8 * TILE, 3.8 * TILE, 4.8 * TILE, 2.5 * TILE, '#047857', 'BÀN 01 (POOL)', true);
  drawBilliardsTable(ctx, 9.4 * TILE, 3.8 * TILE, 4.8 * TILE, 2.5 * TILE, '#1d4ed8', 'BÀN 02 (CAROM)', false);
  drawBilliardsTable(ctx, 1.8 * TILE, 7.2 * TILE, 4.8 * TILE, 2.5 * TILE, '#065f46', 'BÀN VIP 03', true);

  function drawSpectatorSofa(sx: number, sy: number) {
    r(ctx, '#0f172a', sx - 1, sy - 1, 34, 18);
    r(ctx, '#7f1d1d', sx, sy, 32, 16);
    r(ctx, '#991b1b', sx + 2, sy + 2, 28, 4);
    r(ctx, '#450a0a', sx + 6, sy + 6, 2, 8);
    r(ctx, '#450a0a', sx + 16, sy + 6, 2, 8);
    r(ctx, '#450a0a', sx + 24, sy + 6, 2, 8);
  }

  // Spectator VIP Lounge on Right Wing
  drawSpectatorSofa(10.5 * TILE, 7.6 * TILE);
  drawSpectatorSofa(13.2 * TILE, 7.6 * TILE);
  drawSpectatorSofa(10.5 * TILE, 9.2 * TILE);
  drawSpectatorSofa(13.2 * TILE, 9.2 * TILE);

  // 5. ENTRANCE
  const doorX = 6.5 * TILE;
  const doorW = 3 * TILE;
  r(ctx, '#991b1b', doorX, BIDA_H - 18, doorW, 18);
  r(ctx, '#fef08a', doorX + 4, BIDA_H - 15, doorW - 8, 12);
  ctx.font = '800 6.5px "Inter", sans-serif';
  ctx.fillStyle = '#991b1b';
  ctx.textAlign = 'center';
  ctx.fillText('WELCOME · CLB BIDA H2S', doorX + doorW / 2, BIDA_H - 7);

  return c;
}

/** Draws character sprites for Bida Club NPCs */
export function drawBidaPerson(person: BidaPerson): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 48;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const { hairColor, shirtColor, pose } = person.avatarStyle;

  oval(ctx, hairColor, 16, 12, 7, 7);
  oval(ctx, '#fed7aa', 16, 14, 5, 5);
  r(ctx, '#0f172a', 14, 13, 1, 2);
  r(ctx, '#0f172a', 18, 13, 1, 2);
  r(ctx, '#9a3412', 15, 17, 3, 1);

  r(ctx, shirtColor, 11, 20, 10, 14);

  if (pose === 'manager' || pose === 'referee') {
    r(ctx, '#ffffff', 14, 20, 4, 3);
    r(ctx, '#09090b', 15, 23, 2, 7);
  }

  r(ctx, '#1e293b', 12, 34, 4, 10);
  r(ctx, '#1e293b', 17, 34, 4, 10);

  r(ctx, '#0f172a', 11, 44, 5, 3);
  r(ctx, '#0f172a', 17, 44, 5, 3);

  if (pose === 'player') {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(8, 44);
    ctx.lineTo(26, 16);
    ctx.stroke();
    r(ctx, '#38bdf8', 25, 15, 2, 2);
  } else if (pose === 'manager') {
    r(ctx, '#451a03', 7, 24, 5, 8);
    r(ctx, '#f8fafc', 8, 25, 3, 6);
  }

  return c;
}
