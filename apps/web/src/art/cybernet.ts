import { CYBERNET_COLS, CYBERNET_ROWS, TILE } from '@cozy/game-data';

export const CYBERNET_W = CYBERNET_COLS * TILE; // 512
export const CYBERNET_H = CYBERNET_ROWS * TILE; // 384

export interface CyberNetPerson {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  dialogue: string;
  avatarStyle: {
    hairColor: string;
    shirtColor: string;
    pose: 'cashier' | 'gaming' | 'serving';
  };
}

export const CYBERNET_PEOPLE: CyberNetPerson[] = [
  {
    id: 'kien_quan_ly',
    name: 'Kiên Quản Lý',
    role: 'Chủ & Quản Trị Cyber HNT',
    x: 2.8 * TILE,
    y: 2.2 * TILE,
    dialogue:
      'Chào mừng người anh em tới Cyber Game HNT Trảng Dài! Máy cấu hình Core i7, RTX 4070, màn 240Hz combat bao mượt. Nạp 50k tặng 20k, anh em cần gọi mì xào Sting đỏ cứ bấm phím gọi nhân viên nhé!',
    avatarStyle: {
      hairColor: '#0f172a',
      shirtColor: '#0284c7',
      pose: 'cashier',
    },
  },
  {
    id: 'duy_ganh_team',
    name: 'Duy Gánh Team',
    role: 'Cao Thủ Thách Đấu LMHT',
    x: 5.5 * TILE,
    y: 4.8 * TILE,
    dialogue:
      'Gank bot lẹ anh em ơi, penta kill đến nơi rồi! Máy ở Cyber HNT FPS 300 combat mượt không tụt một khung hình nào, leo rank sướng tay vãi!',
    avatarStyle: {
      hairColor: '#475569',
      shirtColor: '#ef4444',
      pose: 'gaming',
    },
  },
  {
    id: 'bao_staff',
    name: 'Bảo Staff',
    role: 'Phục Vụ Nước & Mì Gói',
    x: 10.5 * TILE,
    y: 2.2 * TILE,
    dialogue:
      'Mì tôm xào bò 2 trứng ốp la và chai Sting dâu ướp lạnh của máy VIP 08 có liền đây ạ! Chúc các cơ thủ combat thắng trận nhé!',
    avatarStyle: {
      hairColor: '#1e293b',
      shirtColor: '#10b981',
      pose: 'serving',
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

/** Paints the high-end Esports arena of Cyber Game HNT Trảng Dài */
export function paintCyberNetInterior(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = CYBERNET_W;
  c.height = CYBERNET_H;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // 1. FLOOR (Thảm cách âm gaming màu xám than sang trọng với dải neon RGB chạy ngầm)
  for (let row = 1; row < CYBERNET_ROWS; row++) {
    for (let col = 0; col < CYBERNET_COLS; col++) {
      const isAlt = (row + col) % 2 === 0;
      r(ctx, isAlt ? '#0f172a' : '#1e293b', col * TILE, row * TILE, TILE, TILE);
      // Đường chỉ điện tử viền mạch tinh tế
      r(ctx, '#334155', col * TILE, row * TILE + TILE - 1, TILE, 1);
      r(ctx, '#334155', col * TILE + TILE - 1, row * TILE, 1, TILE);
    }
  }

  // Dải LED RGB phát sáng chạy dọc sàn hành lang trung tâm
  r(ctx, 'rgba(56, 189, 248, 0.4)', 0, 138, CYBERNET_W, 2);
  r(ctx, 'rgba(236, 72, 153, 0.4)', 0, 230, CYBERNET_W, 2);

  // 2. BACK WALL & CYBERPUNK ACOUSTIC PANELS (y: 0..64)
  r(ctx, '#090d16', 0, 0, CYBERNET_W, 64);
  for (let x = 0; x < CYBERNET_W; x += 32) {
    r(ctx, '#1e293b', x + 2, 8, 28, 48);
    r(ctx, 'rgba(56, 189, 248, 0.15)', x + 4, 10, 24, 44);
  }

  // Neon Esports Header Sign: "CYBER GAME HNT - ESPORTS ARENA"
  r(ctx, '#030712', 64, 8, CYBERNET_W - 128, 40);
  r(ctx, '#38bdf8', 64, 8, CYBERNET_W - 128, 2);
  r(ctx, '#ec4899', 64, 46, CYBERNET_W - 128, 2);
  ctx.font = '900 13px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('⚡ CYBER GAME HNT - TRẢNG DÀI BIÊN HÒA ⚡', CYBERNET_W / 2, 24);
  ctx.font = '700 7px sans-serif';
  ctx.fillStyle = '#f472b6';
  ctx.fillText('CORE I7 14700K · RTX 4070 · 240Hz CURVED · GHẾ GAMING SOFA', CYBERNET_W / 2, 38);

  // 3. QUẦY THU NGÂN & POS SERVER NẠP GIỜ CHƠI (Góc trên bên trái)
  r(ctx, '#0f172a', 16, 48, 128, 48);
  r(ctx, '#1e293b', 18, 50, 124, 44);
  r(ctx, '#38bdf8', 18, 50, 124, 2);

  // Máy chủ POS thanh toán & màn hình quản lý phòng máy CSM
  r(ctx, '#334155', 30, 56, 28, 20);
  r(ctx, '#0284c7', 32, 58, 24, 16);
  r(ctx, '#38bdf8', 34, 60, 20, 12);
  // Máy in hóa đơn & khay tiền
  r(ctx, '#64748b', 64, 66, 12, 12);
  r(ctx, '#22c55e', 66, 68, 8, 3);
  // Biển hiệu "NẠP TÀI KHOẢN TẶNG 50%"
  r(ctx, '#f59e0b', 82, 54, 54, 18);
  r(ctx, '#000000', 84, 56, 50, 14);
  ctx.font = '800 6px sans-serif';
  ctx.fillStyle = '#fbbf24';
  ctx.textAlign = 'center';
  ctx.fillText('NẠP 50K TẶNG 20K', 109, 64);

  // 4. TỦ LẠNH STING & BẾP MÌ TÔM TIỆM NET (Góc trên bên phải)
  r(ctx, '#0f172a', 290, 46, 140, 50);
  r(ctx, '#1e293b', 292, 48, 136, 46);

  // Tủ mát trưng bày nước ngọt kính trong suốt (Sting dâu, Coca, Monster)
  r(ctx, 'rgba(56, 189, 248, 0.45)', 296, 50, 56, 42);
  r(ctx, '#38bdf8', 296, 50, 56, 2);
  // Hàng Sting đỏ dâu
  for (let i = 0; i < 4; i++) {
    r(ctx, '#ef4444', 300 + i * 8, 56, 5, 14); // Chai Sting đỏ
    r(ctx, '#fbbf24', 301 + i * 8, 58, 3, 4); // Nhãn vàng
  }
  // Hàng Monster xanh & bò húc
  for (let i = 0; i < 4; i++) {
    r(ctx, '#10b981', 300 + i * 8, 74, 5, 14); // Lon Monster
    r(ctx, '#34d399', 301 + i * 8, 76, 3, 4);
  }

  // Bếp nấu mì tiệm net: Bếp từ, nồi nước sôi, tô mì gói ăn liền
  r(ctx, '#475569', 360, 58, 66, 34);
  r(ctx, '#0f172a', 364, 62, 22, 14); // Bếp từ
  r(ctx, '#dc2626', 366, 64, 18, 10); // Đèn bếp đỏ
  // Tô mì xào trứng xúc xích
  r(ctx, '#ffffff', 394, 62, 16, 12);
  r(ctx, '#ea580c', 396, 64, 12, 8); // Sợi mì
  r(ctx, '#facc15', 398, 66, 6, 4); // Lòng đỏ trứng ốp la
  r(ctx, '#ef4444', 404, 65, 4, 3); // Lát xúc xích

  // 5. DÃY MÁY TÍNH GAMING VIP ESPORTS (Row 1: Cols 2..12, Row 4..5)
  function drawGamingStation(gx: number, gy: number, label: string) {
    // Bàn máy tính gaming mặt kính cường lực đen có dải led
    r(ctx, '#0f172a', gx, gy, 70, 24);
    r(ctx, '#1e293b', gx + 1, gy + 1, 68, 22);
    r(ctx, '#38bdf8', gx, gy + 22, 70, 2);

    // Màn hình gaming cong viền siêu mỏng 240Hz
    r(ctx, '#020617', gx + 8, gy + 2, 38, 18);
    // Màn hình đang hiển thị game (Bản đồ Summoner's Rift / Combat)
    r(ctx, '#1e3a8a', gx + 10, gy + 3, 34, 14);
    r(ctx, '#22c55e', gx + 14, gy + 8, 8, 6); // Cỏ Summoner's Rift
    r(ctx, '#ef4444', gx + 26, gy + 6, 4, 4); // Tướng địch

    // Bàn phím cơ LED RGB
    r(ctx, '#0f172a', gx + 10, gy + 17, 22, 5);
    r(ctx, '#ec4899', gx + 11, gy + 18, 20, 3); // LED hồng phím cơ
    // Chuột gaming
    r(ctx, '#38bdf8', gx + 34, gy + 18, 4, 4);

    // Case máy tính kính cường lực fan LED RGB xoay
    r(ctx, '#090d16', gx + 50, gy + 2, 16, 20);
    r(ctx, '#06b6d4', gx + 52, gy + 4, 12, 6); // Fan LED 1
    r(ctx, '#a855f7', gx + 52, gy + 12, 12, 6); // Fan LED 2

    // Ghế gaming da chân xoay ngả lưng
    r(ctx, '#1e293b', gx + 16, gy + 26, 22, 22);
    r(ctx, '#dc2626', gx + 18, gy + 28, 18, 18); // Đệm da đỏ
    r(ctx, '#0f172a', gx + 25, gy + 48, 4, 8); // Chân xoay
    r(ctx, '#334155', gx + 20, gy + 54, 14, 2);

    // Nhãn số máy
    ctx.font = '700 6px sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText(label, gx + 27, gy - 2);
  }

  // 4 Trạm máy Gaming VIP
  drawGamingStation(36, 144, 'VIP 01');
  drawGamingStation(132, 144, 'VIP 02');
  drawGamingStation(236, 144, 'VIP 03');
  drawGamingStation(332, 144, 'VIP 04');

  // 6. EXIT DOOR MAT (Thảm đỏ dẫn ra thị trấn ở cửa phía Nam)
  const exitX = 7 * TILE;
  const exitY = (CYBERNET_ROWS - 1) * TILE;
  r(ctx, '#1e293b', exitX, exitY + 6, 2 * TILE, 26);
  r(ctx, '#38bdf8', exitX + 2, exitY + 8, 2 * TILE - 4, 22);
  ctx.font = '800 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('LỐI RA THỊ TRẤN', exitX + TILE, exitY + 20);

  return c;
}

/** Draws animated person sprite for Cyber Game HNT */
export function drawCyberNetPerson(person: CyberNetPerson): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 44;
  c.height = 48;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const skin = '#fcd34d';
  const hair = person.avatarStyle.hairColor;
  const shirt = person.avatarStyle.shirtColor;

  // Shadow
  oval(ctx, 'rgba(10, 15, 25, 0.4)', 22, 44, 12, 3);

  if (person.avatarStyle.pose === 'cashier') {
    // Admin cashier: Polo shirt, cyber headset, welcoming hand
    r(ctx, shirt, 14, 18, 16, 20);
    r(ctx, '#ffffff', 18, 18, 8, 3); // Cổ áo polo trắng

    // Arm greeting customer
    r(ctx, shirt, 28, 22, 8, 4);
    r(ctx, skin, 34, 20, 5, 5);

    // Head
    r(ctx, hair, 14, 8, 16, 10);
    r(ctx, skin, 16, 12, 12, 8);
    // Headset with glowing mic
    r(ctx, '#38bdf8', 13, 8, 18, 2);
    r(ctx, '#0284c7', 12, 10, 3, 6);
    r(ctx, '#06b6d4', 15, 17, 4, 2); // Mic phát sáng

    r(ctx, '#1c1917', 18, 14, 2, 2);
    r(ctx, '#1c1917', 24, 14, 2, 2);
    r(ctx, '#0284c7', 20, 17, 4, 1);
  } else if (person.avatarStyle.pose === 'serving') {
    // Server holding tray with noodles and cold Sting
    r(ctx, shirt, 13, 18, 18, 22);

    // Tray in hands
    r(ctx, '#64748b', 6, 26, 32, 4);
    // Tô mì trên khay
    r(ctx, '#ffffff', 10, 20, 12, 7);
    r(ctx, '#ea580c', 12, 21, 8, 4);
    // Chai Sting dâu trên khay
    r(ctx, '#ef4444', 26, 16, 5, 11);
    r(ctx, '#fbbf24', 27, 18, 3, 3);

    // Head
    r(ctx, hair, 14, 8, 16, 10);
    r(ctx, skin, 16, 12, 12, 8);
    r(ctx, '#1c1917', 18, 14, 2, 2);
    r(ctx, '#1c1917', 24, 14, 2, 2);
    r(ctx, '#10b981', 20, 17, 4, 1);
  } else {
    // Pro gamer sitting with glowing RGB headphones, furiously gaming
    r(ctx, shirt, 14, 20, 16, 18);
    // Fast hands on keyboard & mouse
    r(ctx, skin, 8, 26, 8, 4);
    r(ctx, skin, 28, 26, 8, 4);

    // Head
    r(ctx, hair, 13, 8, 18, 10);
    r(ctx, skin, 15, 12, 14, 8);
    // Glowing RGB gaming headset
    r(ctx, '#ec4899', 12, 7, 20, 3); // Vòm tai nghe hồng
    r(ctx, '#38bdf8', 11, 10, 4, 8); // Ốp tai trái xanh
    r(ctx, '#a855f7', 29, 10, 4, 8); // Ốp tai phải tím

    // Focused game eyes
    r(ctx, '#0284c7', 17, 14, 3, 2);
    r(ctx, '#0284c7', 24, 14, 3, 2);
  }

  return c;
}
