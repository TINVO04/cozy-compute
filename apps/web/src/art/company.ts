import { COMPANY_COLS, COMPANY_ROWS, TILE } from '@cozy/game-data';
import { INK, shade } from './pixel';

export const COMP_W = COMPANY_COLS * TILE; // 512
export const COMP_H = COMPANY_ROWS * TILE; // 352

export interface SleepingEmployee {
  id: string;
  name: string;
  role: string;
  x: number; // in pixels
  y: number;
  dialogue: string;
  avatarStyle: {
    hairColor: string;
    shirtColor: string;
    pose: 'slumped' | 'lean_back' | 'head_down' | 'pillow_books';
  };
}

export const SLEEPING_EMPLOYEES: SleepingEmployee[] = [
  {
    id: 'hai',
    name: 'Mr. Hải',
    role: 'Tech Lead / Mentor',
    x: 4.5 * TILE,
    y: 4.2 * TILE,
    dialogue: 'Các bạn nhớ viết test case kỹ nhé... bug production là sếp gõ đầu... khò khò... zzz...',
    avatarStyle: {
      hairColor: '#2b231d',
      shirtColor: '#1e3a8a',
      pose: 'slumped',
    },
  },
  {
    id: 'tuan',
    name: 'Hoàng Tuấn',
    role: 'Frontend Dev',
    x: 6.8 * TILE,
    y: 4.2 * TILE,
    dialogue: 'Responsive trên mobile sao lại lệch 1px thế này... CSS flexbox ơi là flexbox... zzz...',
    avatarStyle: {
      hairColor: '#7c2d12',
      shirtColor: '#ec4899',
      pose: 'lean_back',
    },
  },
  {
    id: 'nguyetque',
    name: 'Nguyệt Quế',
    role: 'Backend Dev',
    x: 9.2 * TILE,
    y: 4.2 * TILE,
    dialogue: 'Viết xong 50 endpoint API rồi... mai mới deploy lên AWS... buồn ngủ quá... zzz...',
    avatarStyle: {
      hairColor: '#1e293b',
      shirtColor: '#10b981',
      pose: 'head_down',
    },
  },
  {
    id: 'lanh',
    name: 'Phượng Lành',
    role: 'Intern Tester / QC',
    x: 11.5 * TILE,
    y: 4.2 * TILE,
    dialogue: 'Tìm ra 99 bugs rồi... dev cứ bảo "nó chạy tốt trên máy của anh"... zzz...',
    avatarStyle: {
      hairColor: '#b45309',
      shirtColor: '#f59e0b',
      pose: 'pillow_books',
    },
  },
];

/** Paints the entire VietProDev modern office interior floor, walls, long table & stationary fixtures */
export function paintCompanyOffice(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = COMP_W;
  c.height = COMP_H;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // 1. CARPET FLOOR (Modern Tech Slate Tiles)
  for (let r = 1; r < COMPANY_ROWS; r++) {
    for (let col = 0; col < COMPANY_COLS; col++) {
      const isAlt = (r + col) % 2 === 0;
      ctx.fillStyle = isAlt ? '#1e2532' : '#232b3a';
      ctx.fillRect(col * TILE, r * TILE, TILE, TILE);

      // Subtle seam grid lines
      ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
      ctx.fillRect(col * TILE, r * TILE + TILE - 1, TILE, 1);
      ctx.fillRect(col * TILE + TILE - 1, r * TILE, 1, TILE);

      // Tiny carpet fleck texture
      if ((col * 7 + r * 13) % 5 === 0) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.fillRect(col * TILE + 8, r * TILE + 12, 2, 2);
      }
    }
  }

  // 2. BACK WALL (Rows 0 to 1) - Dark Tech Acoustic Paneling
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, COMP_W, 2 * TILE);

  // Acoustic wooden slat accents on wall
  ctx.fillStyle = '#1e293b';
  for (let x = 8; x < COMP_W - 8; x += 16) {
    ctx.fillRect(x, 4, 10, 2 * TILE - 10);
  }

  // Sleek baseboard trim between wall and floor
  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 2 * TILE - 6, COMP_W, 6);
  ctx.fillStyle = '#0284c7'; // Cyan LED floor trim
  ctx.fillRect(0, 2 * TILE - 2, COMP_W, 2);

  // 3. ILLUMINATED NEON LOGO: "VIETPRODEV" (Center top wall)
  const logoX = COMP_W / 2 - 110;
  const logoY = 8;
  const logoW = 220;
  const logoH = 34;

  // Sign backing plaque
  ctx.fillStyle = '#090d16';
  ctx.fillRect(logoX - 2, logoY - 2, logoW + 4, logoH + 4);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(logoX, logoY, logoW, logoH);
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(logoX + 2, logoY + 2, logoW - 4, logoH - 4);

  // Neon glowing text
  ctx.font = '900 15px "Courier New", monospace, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#38bdf8';
  ctx.shadowColor = '#0284c7';
  ctx.shadowBlur = 8;
  ctx.fillText('⚡ VIETPRODEV ⚡', COMP_W / 2, logoY + 12);
  ctx.shadowBlur = 0; // reset shadow

  ctx.font = '700 8px sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('THỰC HỌC · THỰC CHIẾN · DỰ ÁN THỰC THỤ', COMP_W / 2, logoY + 24);

  // 4. SERVER RACK IN TOP-LEFT (Cols 1-2, Rows 0.5-2)
  const srvX = 1 * TILE;
  const srvY = 14;
  ctx.fillStyle = '#090d16';
  ctx.fillRect(srvX, srvY, 48, 54);
  ctx.strokeStyle = '#334155';
  ctx.strokeRect(srvX, srvY, 48, 54);

  // Server units with blinking LEDs
  for (let u = 0; u < 5; u++) {
    const uy = srvY + 4 + u * 10;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(srvX + 4, uy, 40, 8);
    // Green, blue, amber lights
    ctx.fillStyle = u === 2 ? '#ef4444' : '#22c55e';
    ctx.fillRect(srvX + 8, uy + 2, 4, 3);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(srvX + 16, uy + 2, 4, 3);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(srvX + 24, uy + 2, 4, 3);
    // Ventilation louvers
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(srvX + 32, uy + 2, 8, 3);
  }

  // 5. COFFEE & REFRESHMENT BAR (Cols 13-14, Top-Right)
  const barX = 13 * TILE + 4;
  const barY = 24;
  // Wooden Countertop
  ctx.fillStyle = '#451a03';
  ctx.fillRect(barX, barY + 20, 56, 26);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(barX + 2, barY + 22, 52, 22);

  // Espresso Machine
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(barX + 6, barY + 4, 22, 18);
  ctx.fillStyle = '#334155';
  ctx.fillRect(barX + 8, barY + 6, 18, 8);
  ctx.fillStyle = '#ef4444'; // Power light
  ctx.fillRect(barX + 24, barY + 16, 2, 2);

  // Water Cooler (blue bottle)
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(barX + 34, barY + 10, 16, 14);
  // Translucent water jug
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(barX + 36, barY - 6, 12, 16);
  ctx.fillStyle = '#bae6fd';
  ctx.fillRect(barX + 38, barY - 4, 4, 12); // water highlight

  // 6. SPRINT WHITEBOARD (Wall Left of Center, cols 3.5 to 5.5)
  const wbX = 3.5 * TILE;
  const wbY = 16;
  const wbW = 60;
  const wbH = 40;
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(wbX - 2, wbY - 2, wbW + 4, wbH + 4);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(wbX, wbY, wbW, wbH);
  // Sticky notes on whiteboard
  ctx.fillStyle = '#fef08a'; // yellow sticky
  ctx.fillRect(wbX + 6, wbY + 6, 12, 10);
  ctx.fillStyle = '#fbcfe8'; // pink sticky
  ctx.fillRect(wbX + 22, wbY + 6, 12, 10);
  ctx.fillStyle = '#bae6fd'; // blue sticky
  ctx.fillRect(wbX + 38, wbY + 6, 12, 10);
  // Dry-erase marker scribbles
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(wbX + 8, wbY + 22, 30, 2);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(wbX + 8, wbY + 28, 20, 2);

  // 7. POTTED PLANTS AT CORNERS
  function drawPlant(px: number, py: number) {
    // Ceramic pot
    ctx.fillStyle = '#b45309';
    ctx.fillRect(px + 4, py + 14, 16, 16);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(px + 6, py + 16, 12, 12);
    // Foliage
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(px + 12, py + 8, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(px + 10, py + 6, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  drawPlant(4, 2 * TILE + 4);
  drawPlant(COMP_W - 28, 2 * TILE + 4);

  // 8. THE LONG CONFERENCE / WORK TABLE IN THE CENTER
  // Cols 3 to 13, Row 4 to 6
  const tableX = 3 * TILE;
  const tableY = 4 * TILE;
  const tableW = 10 * TILE; // 320px
  const tableH = 2 * TILE; // 64px

  // Contact shadow under the big table
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(tableX - 4, tableY + tableH - 4, tableW + 8, 14);

  // Sturdy metallic legs
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(tableX + 10, tableY + tableH, 10, 10);
  ctx.fillRect(tableX + tableW - 20, tableY + tableH, 10, 10);
  ctx.fillRect(tableX + tableW / 2 - 5, tableY + tableH, 10, 10);

  // Table surface (Rich dark walnut with warm chamfer)
  ctx.fillStyle = '#3e2723';
  ctx.fillRect(tableX, tableY, tableW, tableH);
  ctx.fillStyle = '#4e342e';
  ctx.fillRect(tableX + 2, tableY + 2, tableW - 4, tableH - 4);
  // Wood grain highlights
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(tableX + 6, tableY + 8, tableW - 12, 2);
  ctx.fillRect(tableX + 16, tableY + 28, tableW - 32, 2);
  ctx.fillRect(tableX + 8, tableY + 48, tableW - 16, 2);

  // Cable management tray running down the center of table
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(tableX + 16, tableY + 28, tableW - 32, 8);
  ctx.fillStyle = '#0ea5e9'; // Cable glow
  ctx.fillRect(tableX + 20, tableY + 31, tableW - 40, 2);

  // Workstation Setups on the Long Table:
  for (let s = 0; s < 4; s++) {
    const wsX = tableX + 28 + s * 72;

    // Dual Monitors / Laptops
    // Monitor 1 (Main code editor)
    ctx.fillStyle = '#090d16';
    ctx.fillRect(wsX, tableY + 6, 26, 18);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(wsX + 1, tableY + 7, 24, 16);
    // Glowing code lines on screen
    ctx.fillStyle = s === 2 ? '#ef4444' : '#22c55e';
    ctx.fillRect(wsX + 3, tableY + 9, 10, 2);
    ctx.fillRect(wsX + 3, tableY + 13, 16, 2);
    ctx.fillRect(wsX + 3, tableY + 17, 8, 2);

    // Keyboard & Mouse
    ctx.fillStyle = '#334155';
    ctx.fillRect(wsX + 2, tableY + 38, 22, 10);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(wsX + 27, tableY + 40, 5, 7); // mouse

    // Coffee Mug / Energy Drink Can
    if (s % 2 === 0) {
      // White coffee mug with coffee inside
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(wsX - 10, tableY + 18, 8, 10);
      ctx.fillStyle = '#3e2723'; // dark coffee
      ctx.fillRect(wsX - 8, tableY + 19, 4, 3);
    } else {
      // Energy drink can (Monster / Red Bull style)
      ctx.fillStyle = '#065f46';
      ctx.fillRect(wsX - 10, tableY + 16, 7, 12);
      ctx.fillStyle = '#34d399';
      ctx.fillRect(wsX - 9, tableY + 20, 5, 4);
    }
  }

  // 9. ENTRANCE / EXIT DOOR MAT (Cols 7-8, Row 10)
  const exitX = 7 * TILE;
  const exitY = 10 * TILE + 4;
  const exitW = 2 * TILE;
  const exitH = TILE - 8;

  ctx.fillStyle = '#090d16';
  ctx.fillRect(exitX - 2, exitY - 2, exitW + 4, exitH + 4);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(exitX, exitY, exitW, exitH);
  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 1;
  ctx.strokeRect(exitX + 2, exitY + 2, exitW - 4, exitH - 4);

  ctx.font = '700 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#4ade80';
  ctx.fillText('🚪 LỐI RA THỊ TRẤN', exitX + exitW / 2, exitY + exitH / 2);

  return c;
}

/** Draws a pixel art sleeping employee character */
export function drawSleepingEmployee(emp: SleepingEmployee): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 44;
  c.height = 48;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const skin = '#f8d0b0';
  const _skinShadow = '#e0a980';
  const hair = emp.avatarStyle.hairColor;
  const shirt = emp.avatarStyle.shirtColor;
  const shirtShadow = shade(shirt, -0.25);

  // Mesh office chair backrest
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(10, 4, 24, 30);
  ctx.fillStyle = '#334155';
  ctx.fillRect(12, 6, 20, 26);

  if (emp.avatarStyle.pose === 'slumped' || emp.avatarStyle.pose === 'head_down') {
    // Body slumped forward over desk
    ctx.fillStyle = shirtShadow;
    ctx.fillRect(12, 22, 20, 18);
    ctx.fillStyle = shirt;
    ctx.fillRect(14, 20, 16, 16);

    // Arms folded on table
    ctx.fillStyle = shirt;
    ctx.fillRect(8, 28, 28, 8);
    ctx.fillStyle = skin;
    ctx.fillRect(16, 32, 12, 6); // hands tucked

    // Head face down / tilted on folded arms
    ctx.fillStyle = hair;
    ctx.fillRect(14, 14, 16, 14);
    ctx.fillStyle = skin;
    ctx.fillRect(16, 20, 12, 8);

    // Closed sleeping eyes (crescent arcs: ^^)
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(19, 23, 2, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(25, 23, 2, Math.PI, 0);
    ctx.stroke();

    // Cute drool drop!
    ctx.fillStyle = '#67e8f9';
    ctx.fillRect(22, 27, 2, 4);
  } else if (emp.avatarStyle.pose === 'lean_back') {
    // Leaning back with sleep mask
    ctx.fillStyle = shirtShadow;
    ctx.fillRect(12, 18, 20, 22);
    ctx.fillStyle = shirt;
    ctx.fillRect(14, 16, 16, 20);

    // Head tilted back
    ctx.fillStyle = hair;
    ctx.fillRect(13, 8, 18, 14);
    ctx.fillStyle = skin;
    ctx.fillRect(15, 12, 14, 10);

    // Sleep mask over eyes
    ctx.fillStyle = '#f43f5e'; // Pink sleep mask
    ctx.fillRect(14, 14, 16, 6);
    ctx.fillStyle = '#ffffff';
    // Star or closed eye print on sleep mask
    ctx.fillRect(17, 16, 3, 2);
    ctx.fillRect(24, 16, 3, 2);

    // Little plush duck in lap
    ctx.fillStyle = '#facc15';
    ctx.fillRect(18, 30, 8, 8);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(24, 33, 3, 2); // beak
  } else {
    // Pillow of programming books!
    // Stack of books
    ctx.fillStyle = '#0284c7'; // Blue book
    ctx.fillRect(8, 32, 28, 5);
    ctx.fillStyle = '#dc2626'; // Red book
    ctx.fillRect(10, 27, 24, 5);
    ctx.fillStyle = '#16a34a'; // Green book
    ctx.fillRect(12, 22, 20, 5);

    // Head resting sideways on the book stack
    ctx.fillStyle = hair;
    ctx.fillRect(14, 12, 16, 14);
    ctx.fillStyle = skin;
    ctx.fillRect(16, 16, 12, 8);

    // Closed peaceful sleeping face
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(20, 19, 2, Math.PI, 0);
    ctx.stroke();

    // Body
    ctx.fillStyle = shirt;
    ctx.fillRect(12, 22, 18, 16);
  }

  return c;
}

/** Draws floating "Zzz..." animated bubbles */
export function drawZzzBubble(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  ctx.font = '800 12px "Pixelify Sans", monospace, sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.shadowColor = '#0284c7';
  ctx.shadowBlur = 4;
  ctx.fillText('Z', 6, 24);

  ctx.font = '700 10px "Pixelify Sans", monospace, sans-serif';
  ctx.fillText('z', 14, 18);

  ctx.font = '600 8px "Pixelify Sans", monospace, sans-serif';
  ctx.fillText('z', 22, 12);

  return c;
}
