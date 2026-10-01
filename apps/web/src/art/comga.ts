import { COMGA_COLS, COMGA_ROWS, TILE } from '@cozy/game-data';

export const COMGA_W = COMGA_COLS * TILE; // 448
export const COMGA_H = COMGA_ROWS * TILE; // 320

export interface ComGaPerson {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  dialogue: string;
  avatarStyle: {
    hairColor: string;
    shirtColor: string;
    apronColor?: string;
    pose: 'cooking' | 'eating' | 'delivering';
  };
}

export const COMGA_PEOPLE: ComGaPerson[] = [
  {
    id: 'anh_sau_chu_quan',
    name: 'Anh Sáu',
    role: 'Chủ Quán Cơm Gà 68 Biên Hòa',
    x: 2.8 * TILE,
    y: 2.2 * TILE,
    dialogue:
      'Cơm gà xối mỡ 68 Biên Hòa xin chào! Đùi gà góc tư da giòn rụm, thịt mềm mọng nước, xối mỡ nóng hổi ăn kèm cơm chiên cà chua thơm phức nha em ơi!',
    avatarStyle: {
      hairColor: '#1c1917',
      shirtColor: '#ffffff',
      apronColor: '#dc2626',
      pose: 'cooking',
    },
  },
  {
    id: 'be_vy_sinh_vien',
    name: 'Bé Vy',
    role: 'Sinh viên DNTU quen thuộc',
    x: 4.8 * TILE,
    y: 4.8 * TILE,
    dialogue:
      'Tụi em tan học bên DNTU là kéo nhau qua quán 68 liền! Cơm gà xối mỡ ở đây da giòn tan chấm với nước tương sa tế đặc chế ngon đỉnh chóp!',
    avatarStyle: {
      hairColor: '#78350f',
      shirtColor: '#f59e0b',
      pose: 'eating',
    },
  },
  {
    id: 'chu_ba_shipper',
    name: 'Chú Ba Shipper',
    role: 'Tài xế giao đồ ăn Biên Hòa',
    x: 10.5 * TILE,
    y: 2.2 * TILE,
    dialogue:
      'Quán 68 trưa nào cũng nổ đơn ầm ầm. Đang chờ lấy 5 phần cơm gà xối mỡ đùi góc tư giao gấp qua tiệm net Cyber HNT cho mấy bạn cày game nè!',
    avatarStyle: {
      hairColor: '#292524',
      shirtColor: '#16a34a',
      pose: 'delivering',
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

/** Paints the authentic interior of Cơm Gà Xối Mỡ 68 Biên Hòa */
export function paintComGaInterior(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = COMGA_W;
  c.height = COMGA_H;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // 1. FLOOR (Sàn gạch men vàng kem ấm cúng đặc trưng quán ăn Việt Nam)
  for (let row = 1; row < COMGA_ROWS; row++) {
    for (let col = 0; col < COMGA_COLS; col++) {
      const isAlt = (row + col) % 2 === 0;
      r(ctx, isAlt ? '#fffbeb' : '#fef3c7', col * TILE, row * TILE, TILE, TILE);
      r(ctx, '#fde68a', col * TILE, row * TILE + TILE - 1, TILE, 1);
      r(ctx, '#fde68a', col * TILE + TILE - 1, row * TILE, 1, TILE);
    }
  }

  // 2. BACK WALL & ROOF BEAMS (y: 0..64)
  r(ctx, '#fef08a', 0, 0, COMGA_W, 64);
  r(ctx, '#fde047', 0, 0, COMGA_W, 8);
  r(ctx, '#ca8a04', 0, 60, COMGA_W, 4);

  // Big Red Wall Sign: "CƠM GÀ XỐI MỠ 68 - ĐẶC SẢN BIÊN HÒA"
  r(ctx, '#dc2626', 80, 10, COMGA_W - 160, 36);
  r(ctx, '#fef08a', 82, 12, COMGA_W - 164, 32);
  r(ctx, '#b91c1c', 84, 14, COMGA_W - 168, 28);
  ctx.font = '800 12px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('🍗 CƠM GÀ XỐI MỠ 68 - BIÊN HÒA 🍗', COMGA_W / 2, 28);

  // 3. KITCHEN ZONE (Phía trước bên trái: Chảo xối mỡ & quầy inox)
  // Quầy inox bếp xối mỡ
  r(ctx, '#94a3b8', 20, 48, 120, 48);
  r(ctx, '#cbd5e1', 22, 50, 116, 44);
  r(ctx, '#e2e8f0', 22, 50, 116, 8);

  // Chảo xối mỡ lớn & mỡ vàng sôi sùng sục
  r(ctx, '#334155', 30, 60, 42, 24);
  r(ctx, '#eab308', 34, 62, 34, 20); // Dầu mỡ vàng óng
  r(ctx, '#f59e0b', 36, 64, 30, 16);
  r(ctx, '#ef4444', 40, 68, 10, 8); // Đùi gà chiên da giòn trong chảo
  r(ctx, '#d97706', 52, 68, 10, 8);

  // Ống vòi xối mỡ inox
  r(ctx, '#64748b', 48, 44, 4, 20);
  r(ctx, '#94a3b8', 46, 62, 8, 4);

  // Tủ kính giữ nóng gà luộc & đùi gà chiên vàng rộm
  r(ctx, 'rgba(224, 242, 254, 0.7)', 80, 52, 50, 38);
  r(ctx, '#0284c7', 80, 52, 50, 2);
  r(ctx, '#0284c7', 80, 88, 50, 2);
  r(ctx, '#d97706', 84, 58, 12, 10); // Đùi gà 1
  r(ctx, '#f59e0b', 100, 58, 12, 10); // Đùi gà 2
  r(ctx, '#b45309', 116, 58, 12, 10); // Đùi gà 3
  r(ctx, '#22c55e', 86, 74, 40, 8); // Rau răm & dưa leo

  // 4. NỒI CƠM CHIÊN CÀ CHUA LÒNG ĐÀO (Giữa sau)
  r(ctx, '#94a3b8', 160, 48, 70, 46);
  r(ctx, '#cbd5e1', 162, 50, 66, 42);
  r(ctx, '#475569', 170, 56, 48, 26);
  r(ctx, '#f97316', 173, 58, 42, 22); // Hạt cơm màu cam đỏ tơi xốp
  r(ctx, '#ea580c', 176, 62, 36, 14);
  // Vá múc cơm
  r(ctx, '#f8fafc', 204, 52, 4, 16);

  // 5. QUẦY GIA VỊ, NƯỚC SỐT & TRÀ ĐÁ (Phía bên phải)
  r(ctx, '#94a3b8', 300, 48, 124, 48);
  r(ctx, '#cbd5e1', 302, 50, 120, 44);
  // Chai nước tương tỏi ớt đặc chế
  r(ctx, '#451a03', 312, 54, 8, 18);
  r(ctx, '#dc2626', 313, 52, 6, 4);
  // Hũ ớt sa tế cay nồng
  r(ctx, '#ef4444', 326, 56, 12, 16);
  r(ctx, '#ffffff', 328, 54, 8, 3);
  // Hũ dưa chua đồ chua ăn kèm
  r(ctx, '#ffffff', 344, 54, 16, 18);
  r(ctx, '#f97316', 346, 58, 6, 12);
  r(ctx, '#ffffff', 353, 58, 5, 12);
  // Thùng trà đá inox "TRÀ ĐÁ MIỄN PHÍ"
  r(ctx, '#0284c7', 374, 46, 40, 36);
  r(ctx, '#38bdf8', 376, 48, 36, 32);
  r(ctx, '#0369a1', 390, 80, 8, 8); // Vòi xả trà đá
  ctx.font = '700 5.5px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('TRÀ ĐÁ', 394, 62);
  ctx.fillText('MIỄN PHÍ', 394, 70);

  // 6. DÃY BÀN ĂN INOX & GHẾ ĐẨU ĐỎ QUEN THUỘC (Dining Area)
  function drawDiningTable(tx: number, ty: number, w: number) {
    // Bóng đổ bàn ăn
    r(ctx, 'rgba(54, 48, 36, 0.18)', tx + 2, ty + 24, w, 8);
    // Mặt bàn inox sáng loáng
    r(ctx, '#64748b', tx, ty, w, 22);
    r(ctx, '#e2e8f0', tx + 2, ty + 2, w - 4, 18);
    r(ctx, '#ffffff', tx + 4, ty + 3, w - 8, 4);
    // Chân bàn inox
    r(ctx, '#94a3b8', tx + 4, ty + 22, 3, 14);
    r(ctx, '#94a3b8', tx + w - 7, ty + 22, 3, 14);

    // Món ăn trên bàn: Đĩa cơm gà xối mỡ đùi góc tư!
    r(ctx, '#ffffff', tx + 14, ty + 6, 20, 12);
    r(ctx, '#ea580c', tx + 16, ty + 8, 8, 8); // Cơm chiên cam
    r(ctx, '#b45309', tx + 24, ty + 7, 8, 8); // Đùi gà chiên vàng
    r(ctx, '#22c55e', tx + 20, ty + 14, 4, 3); // Dưa leo xắt lát

    // Ly trà đá trên bàn
    r(ctx, '#e0f2fe', tx + 38, ty + 4, 6, 10);
    r(ctx, '#d97706', tx + 39, ty + 6, 4, 7); // Nước trà vàng

    // Hộp khăn giấy & ống đũa muỗng
    r(ctx, '#ef4444', tx + w - 18, ty + 4, 8, 10);
    r(ctx, '#fef08a', tx + w - 8, ty + 2, 4, 12);

    // Ghế đẩu nhựa đỏ 2 bên bàn
    r(ctx, '#dc2626', tx - 14, ty + 10, 10, 12);
    r(ctx, '#b91c1c', tx - 12, ty + 22, 2, 8);
    r(ctx, '#b91c1c', tx - 6, ty + 22, 2, 8);

    r(ctx, '#dc2626', tx + w + 4, ty + 10, 10, 12);
    r(ctx, '#b91c1c', tx + w + 6, ty + 22, 2, 8);
    r(ctx, '#b91c1c', tx + w + 12, ty + 22, 2, 8);
  }

  // Bàn ăn 1 (Bên trái)
  drawDiningTable(56, 148, 100);
  // Bàn ăn 2 (Bên phải)
  drawDiningTable(260, 148, 110);

  // 7. EXIT DOOR MAT (Thảm đỏ dẫn ra thị trấn ở cửa phía Nam)
  const exitX = 6 * TILE;
  const exitY = (COMGA_ROWS - 1) * TILE;
  r(ctx, '#991b1b', exitX, exitY + 6, 2 * TILE, 26);
  r(ctx, '#dc2626', exitX + 2, exitY + 8, 2 * TILE - 4, 22);
  ctx.font = '700 8px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('LỐI RA THỊ TRẤN', exitX + TILE, exitY + 20);

  return c;
}

/** Draws animated person sprite for Com Ga restaurant */
export function drawComGaPerson(person: ComGaPerson): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = 44;
  c.height = 48;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const skin = '#fcd34d';
  const hair = person.avatarStyle.hairColor;
  const shirt = person.avatarStyle.shirtColor;
  const apron = person.avatarStyle.apronColor ?? '#dc2626';

  // Shadow
  oval(ctx, 'rgba(30, 20, 10, 0.28)', 22, 44, 12, 3);

  if (person.avatarStyle.pose === 'cooking') {
    // Chef cooking at frying station: White shirt, red apron, chef hat, holding ladle
    // Body & Apron
    r(ctx, shirt, 14, 18, 16, 20);
    r(ctx, apron, 16, 22, 12, 18);
    r(ctx, '#b91c1c', 18, 20, 8, 4); // Dây tạp dề quàng cổ

    // Arm holding stainless ladle over the chicken frying pan
    r(ctx, shirt, 10, 22, 5, 8);
    r(ctx, skin, 8, 28, 6, 5);
    r(ctx, '#94a3b8', 2, 28, 8, 2); // Cán vá
    r(ctx, '#cbd5e1', 0, 26, 3, 6); // Đầu vá inox

    // Head
    r(ctx, hair, 14, 8, 16, 10);
    r(ctx, skin, 16, 12, 12, 8);
    // Chef tall paper cap
    r(ctx, '#ffffff', 13, 0, 18, 9);
    r(ctx, '#e2e8f0', 14, 8, 16, 2);

    // Cheerful friendly smile
    r(ctx, '#1c1917', 18, 14, 2, 2);
    r(ctx, '#1c1917', 24, 14, 2, 2);
    r(ctx, '#dc2626', 20, 17, 4, 1);
  } else if (person.avatarStyle.pose === 'delivering') {
    // Delivery Shipper: Green jacket, delivery helmet, backpack
    r(ctx, shirt, 13, 18, 18, 22);
    r(ctx, '#15803d', 13, 18, 18, 5);

    // Helmet
    r(ctx, '#16a34a', 12, 4, 20, 12);
    r(ctx, '#ffffff', 14, 8, 16, 3);
    r(ctx, skin, 16, 13, 12, 6);
    r(ctx, '#1c1917', 18, 15, 2, 2);
    r(ctx, '#1c1917', 24, 15, 2, 2);

    // Insulated delivery bag held in hand
    r(ctx, '#ea580c', 28, 26, 14, 16);
    r(ctx, '#ffffff', 30, 30, 10, 4);
    r(ctx, skin, 26, 26, 4, 4);
  } else {
    // Eating student seated at the table
    r(ctx, shirt, 14, 20, 16, 18);
    // Arms holding fork & spoon
    r(ctx, skin, 10, 26, 6, 4);
    r(ctx, skin, 28, 26, 6, 4);
    r(ctx, '#94a3b8', 8, 24, 2, 6); // Muỗng
    r(ctx, '#94a3b8', 34, 24, 2, 6); // Nĩa

    // Head with cute styled hair
    r(ctx, hair, 12, 6, 20, 12);
    r(ctx, skin, 15, 12, 14, 8);
    // Big happy eyes eating delicious crispy chicken
    r(ctx, '#1c1917', 17, 14, 2, 2);
    r(ctx, '#1c1917', 25, 14, 2, 2);
    r(ctx, '#e11d48', 20, 17, 4, 2);
  }

  return c;
}
