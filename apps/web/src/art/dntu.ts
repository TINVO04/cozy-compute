import { DNTU_COLS, DNTU_ROWS, TILE } from '@cozy/game-data';
import { INK, shade } from './pixel';

export const DNTU_W = DNTU_COLS * TILE; // 512
export const DNTU_H = DNTU_ROWS * TILE; // 352

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

export const DNTU_PEOPLE: DntuPerson[] = [
  {
    id: 'thay_truong_khoa',
    name: 'Thầy TS. Trần Đức',
    role: 'Trưởng Khoa CNTT - DNTU',
    x: 8 * TILE,
    y: 2.2 * TILE,
    dialogue:
      'Chào mừng bạn đến với Trường ĐH Công nghệ Đồng Nai! Triết lý của DNTU là "Xanh - Công nghệ - Hiện đại", gắn liền đào tạo với doanh nghiệp thực tiễn.',
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
    x: 4.8 * TILE,
    y: 4.5 * TILE,
    dialogue:
      'Mình đang hoàn thiện đồ án Trí tuệ Nhân tạo kết nối trực tiếp với server doanh nghiệp. Phòng máy DNTU cấu hình cao chạy model AI cực mượt!',
    avatarStyle: {
      hairColor: '#292524',
      shirtColor: '#dc2626',
      pose: 'coding',
    },
  },
  {
    id: 'sv_thuy_duong',
    name: 'Thùy Dương',
    role: 'Sinh viên Truyền thông & Thiết kế',
    x: 10.8 * TILE,
    y: 4.5 * TILE,
    dialogue:
      'Tại DNTU có hơn 20 Câu lạc bộ từ nghệ thuật, thể thao đến nghiên cứu sáng tạo. Tụi mình đang chuẩn bị cho sự kiện DNTU AURA sắp tới!',
    avatarStyle: {
      hairColor: '#78350f',
      shirtColor: '#ea580c',
      pose: 'designing',
    },
  },
  {
    id: 'robot_dntu',
    name: 'DNTU-Bot v4.0',
    role: 'Robot Trợ Lý AI Sinh Viên',
    x: 12.8 * TILE,
    y: 2.5 * TILE,
    dialogue:
      'Bíp bíp! DNTU đạt Chứng nhận Kiểm định Chất lượng Giáo dục Quốc gia với 25 ngành đào tạo. Chúc bạn có một ngày học tập tràn đầy cảm hứng!',
    avatarStyle: {
      hairColor: '#38bdf8',
      shirtColor: '#0284c7',
      pose: 'robot',
    },
  },
];

/** Paints the entire grand DNTU smart lecture hall and IT lab interior */
export function paintDntuCampus(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = DNTU_W;
  c.height = DNTU_H;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // 1. FLOOR (Polished French Cream Granite & Marble Tiles)
  for (let r = 1; r < DNTU_ROWS; r++) {
    for (let col = 0; col < DNTU_COLS; col++) {
      const isAlt = (r + col) % 2 === 0;
      ctx.fillStyle = isAlt ? '#fffbeb' : '#fef3c7';
      ctx.fillRect(col * TILE, r * TILE, TILE, TILE);

      // Fine golden marble seam
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(col * TILE, r * TILE + TILE - 1, TILE, 1);
      ctx.fillRect(col * TILE + TILE - 1, r * TILE, 1, TILE);

      // High-gloss marble reflection flecks
      if ((col * 3 + r * 7) % 4 === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(col * TILE + 6, r * TILE + 6, 10, 4);
      }
    }
  }

  // Polished Terracotta-Red Campus Border Inlay around floor
  ctx.strokeStyle = '#b91c1c';
  ctx.lineWidth = 3;
  ctx.strokeRect(1 * TILE + 4, 2 * TILE + 4, DNTU_W - 2 * TILE - 8, DNTU_H - 3 * TILE - 8);

  // Grand DNTU Circular Flame Emblem in Center of Foyer (Cols 7.5, Row 8)
  const embX = DNTU_W / 2;
  const embY = 8 * TILE;
  ctx.fillStyle = '#b91c1c';
  ctx.beginPath();
  ctx.arc(embX, embY, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(embX, embY, 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b91c1c';
  ctx.beginPath();
  ctx.arc(embX, embY, 22, 0, Math.PI * 2);
  ctx.fill();
  // Graduation Cap & Torch Flame
  ctx.fillStyle = '#facc15';
  ctx.fillRect(embX - 8, embY - 12, 16, 4); // cap brim
  ctx.fillRect(embX - 4, embY - 16, 8, 4);
  // Red flame swooshes
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(embX, embY + 4, 10, 0, Math.PI);
  ctx.fill();
  ctx.font = '800 6px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#b91c1c';
  ctx.fillText('DNTU', embX, embY + 12);

  // 2. BACK STAGE WALL (Rows 0 to 1) - Formal Indochine Gold & Wood Paneling
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(0, 0, DNTU_W, 2 * TILE);

  // Terracotta pilasters along back wall
  for (let x = 0; x < DNTU_W; x += 64) {
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(x, 0, 8, 2 * TILE);
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(x, 0, 2, 2 * TILE);
  }

  // Baseboard trim
  ctx.fillStyle = '#78350f';
  ctx.fillRect(0, 2 * TILE - 6, DNTU_W, 6);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(0, 2 * TILE - 2, DNTU_W, 2);

  // 3. GIANT SMART BOARD / INTERACTIVE PRESENTATION SCREEN (Center Cols 5 to 11)
  const sbX = 4.5 * TILE;
  const sbY = 6;
  const sbW = 7 * TILE; // 224px
  const sbH = 46;

  // Modern aluminum bezel & drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.fillRect(sbX - 3, sbY - 2, sbW + 6, sbH + 6);
  ctx.fillStyle = '#1c1917';
  ctx.fillRect(sbX - 2, sbY - 1, sbW + 4, sbH + 4);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(sbX, sbY, sbW, sbH);

  // Blue digital screen glow
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(sbX + 2, sbY + 2, sbW - 4, sbH - 4);

  // University Header on Screen
  ctx.font = '800 8px "Inter", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#facc15';
  ctx.fillText('TRƯỜNG ĐẠI HỌC CÔNG NGHỆ ĐỒNG NAI (DNTU)', sbX + sbW / 2, sbY + 11);

  ctx.font = '700 6px sans-serif';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('KHOA CÔNG NGHỆ THÔNG TIN · NGHIÊN CỨU AI & CHUYỂN ĐỔI SỐ', sbX + sbW / 2, sbY + 21);

  // Neural network nodes illustration on Smart Board
  const nodeY = sbY + 32;
  const nodeStartX = sbX + sbW / 2 - 50;
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let n = 0; n < 5; n++) {
    ctx.moveTo(nodeStartX + n * 25, nodeY - 4);
    ctx.lineTo(nodeStartX + (n + 1) * 25, nodeY + 4);
  }
  ctx.stroke();

  for (let n = 0; n < 5; n++) {
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(nodeStartX + n * 25, nodeY - 4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(nodeStartX + (n + 1) * 25, nodeY + 4, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. LECTURE PODIUM (Bục Giảng - Center at row 2)
  const podX = DNTU_W / 2 - 16;
  const podY = 2 * TILE - 4;
  ctx.fillStyle = '#78350f';
  ctx.fillRect(podX, podY, 32, 22);
  ctx.fillStyle = '#9a3412';
  ctx.fillRect(podX + 2, podY + 2, 28, 18);
  // DNTU Logo on Podium
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(podX + 16, podY + 10, 5, 0, Math.PI * 2);
  ctx.fill();
  // Microphone & tablet
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(podX + 6, podY - 4, 1, 6);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(podX + 14, podY + 2, 10, 6);

  // 5. DIGITAL LIBRARY BOOKSHELVES (Top-Left, Cols 1..2)
  const libX = 1 * TILE;
  const libY = 16;
  ctx.fillStyle = '#451a03';
  ctx.fillRect(libX, libY, 52, 54);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(libX + 2, libY + 2, 48, 50);

  // Book rows (colorful academic textbooks)
  for (let shelf = 0; shelf < 3; shelf++) {
    const sy = libY + 6 + shelf * 16;
    ctx.fillStyle = '#451a03';
    ctx.fillRect(libX + 4, sy + 11, 44, 3); // shelf beam

    const bookColors = ['#dc2626', '#1d4ed8', '#16a34a', '#f59e0b', '#7c3aed', '#0284c7'];
    for (let b = 0; b < 8; b++) {
      ctx.fillStyle = bookColors[(shelf + b) % bookColors.length]!;
      ctx.fillRect(libX + 6 + b * 5, sy, 4, 11);
    }
  }
  // Shelf Header: "THƯ VIỆN SỐ"
  ctx.fillStyle = '#facc15';
  ctx.font = '700 5px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('THƯ VIỆN DNTU', libX + 26, libY + 4);

  // 6. AWARDS & ACCREDITATION SHOWCASE (Top-Right, Cols 13..14)
  const cupX = 13 * TILE + 2;
  const cupY = 16;
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(cupX, cupY, 54, 54);
  ctx.fillStyle = '#334155';
  ctx.fillRect(cupX + 2, cupY + 2, 50, 50);
  ctx.fillStyle = 'rgba(224, 242, 254, 0.4)'; // Glass cabinet
  ctx.fillRect(cupX + 4, cupY + 4, 46, 46);

  // Gold Trophies & Accreditation Certificates inside cabinet
  // Trophy 1
  ctx.fillStyle = '#facc15';
  ctx.fillRect(cupX + 10, cupY + 12, 10, 8);
  ctx.fillRect(cupX + 13, cupY + 20, 4, 6);
  ctx.fillRect(cupX + 10, cupY + 26, 10, 3);

  // Trophy 2
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(cupX + 32, cupY + 10, 12, 10);
  ctx.fillRect(cupX + 36, cupY + 20, 4, 6);
  ctx.fillRect(cupX + 32, cupY + 26, 12, 3);

  // Accreditation Medal / Certificate
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cupX + 8, cupY + 34, 18, 12);
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(cupX + 10, cupY + 36, 14, 2);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(cupX + 15, cupY + 40, 4, 4); // gold seal

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(cupX + 30, cupY + 34, 18, 12);
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(cupX + 32, cupY + 36, 14, 2);
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(cupX + 37, cupY + 40, 4, 4);

  // 7. SMART LECTURE & COMPUTER LAB DESKS (Cols 3..13, Rows 4..6)
  const deskX = 3 * TILE;
  const deskY = 4.3 * TILE;
  const deskW = 10 * TILE; // 320px
  const deskH = 2 * TILE; // 64px

  // Contact shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.fillRect(deskX - 4, deskY + deskH - 4, deskW + 8, 12);

  // Clean stainless steel frame legs
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(deskX + 10, deskY + deskH, 8, 8);
  ctx.fillRect(deskX + deskW - 18, deskY + deskH, 8, 8);
  ctx.fillRect(deskX + deskW / 2 - 4, deskY + deskH, 8, 8);

  // Desk surface: Warm Light Birch & Tech Inlay
  ctx.fillStyle = '#c2410c'; // Terracotta accent trim
  ctx.fillRect(deskX, deskY, deskW, deskH);
  ctx.fillStyle = '#fed7aa';
  ctx.fillRect(deskX + 2, deskY + 2, deskW - 4, deskH - 4);
  ctx.fillStyle = '#ffedd5';
  ctx.fillRect(deskX + 4, deskY + 4, deskW - 8, deskH - 8);

  // Integrated Power & High-Speed LAN Channel
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(deskX + 12, deskY + 28, deskW - 24, 6);
  ctx.fillStyle = '#22c55e'; // Green network LED strip
  ctx.fillRect(deskX + 16, deskY + 30, deskW - 32, 2);

  // Student Workstations on the Desk
  for (let s = 0; s < 4; s++) {
    const stX = deskX + 26 + s * 74;

    // Student iMac / PC Display (Silver Frame, Glowing Code)
    ctx.fillStyle = '#64748b';
    ctx.fillRect(stX, deskY + 6, 26, 18);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(stX + 1, deskY + 7, 24, 16);
    // Code lines on screen
    ctx.fillStyle = s % 2 === 0 ? '#38bdf8' : '#4ade80';
    ctx.fillRect(stX + 3, deskY + 9, 12, 2);
    ctx.fillRect(stX + 3, deskY + 13, 18, 2);
    ctx.fillRect(stX + 3, deskY + 17, 10, 2);

    // Slim Keyboard & Mouse
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(stX + 2, deskY + 38, 22, 9);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(stX + 26, deskY + 40, 5, 6);

    // Student essentials: DNTU water tumbler & Capstone folder
    if (s % 2 === 0) {
      // DNTU Orange/Red Tumbler
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(stX - 10, deskY + 16, 7, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(stX - 10, deskY + 20, 7, 3);
    } else {
      // Capstone Research File
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(stX - 12, deskY + 16, 10, 13);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(stX - 11, deskY + 18, 8, 2);
    }
  }

  // 8. TROPICAL PALM PLANTS IN CERAMIC PLANTERS (Front corners)
  function drawUniversityPalm(px: number, py: number) {
    // Red ceramic pot
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(px + 4, py + 14, 16, 16);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(px + 6, py + 16, 12, 12);
    // Lush green palm fronds
    ctx.fillStyle = '#15803d';
    ctx.beginPath();
    ctx.arc(px + 12, py + 8, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(px + 10, py + 6, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  drawUniversityPalm(4, 2 * TILE + 4);
  drawUniversityPalm(DNTU_W - 28, 2 * TILE + 4);

  // 9. GRAND ENTRANCE / EXIT DOOR MAT (Cols 7-8, Row 10)
  const exitX = 7 * TILE;
  const exitY = 10 * TILE + 4;
  const exitW = 2 * TILE;
  const exitH = TILE - 8;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.fillRect(exitX - 2, exitY - 2, exitW + 4, exitH + 4);
  ctx.fillStyle = '#b91c1c';
  ctx.fillRect(exitX, exitY, exitW, exitH);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(exitX + 2, exitY + 2, exitW - 4, exitH - 4);

  ctx.font = '700 8.5px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fef08a';
  ctx.fillText('🏛️ LỐI RA THỊ TRẤN', exitX + exitW / 2, exitY + exitH / 2);

  return c;
}

/** Draws an authentic DNTU student, lecturer, or robot mascot */
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
    // Cute Futuristic DNTU-Bot
    // Wheels / Base
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(14, 38, 16, 6);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(16, 40, 12, 2);

    // Torso (Smooth white & cyan)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(12, 20, 20, 18);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(14, 24, 16, 10);
    // DNTU Emblem on chest
    ctx.fillStyle = '#facc15';
    ctx.fillRect(20, 27, 4, 4);

    // Head
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(14, 6, 16, 14);
    ctx.fillStyle = '#0f172a'; // Visor
    ctx.fillRect(16, 9, 12, 6);
    // Glowing cyan eyes
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(18, 11, 3, 2);
    ctx.fillRect(23, 11, 3, 2);

    // Antenna with pulsing light
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(21, 2, 2, 4);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(20, 0, 4, 3);
    return c;
  }

  // Modern Ergonomic Lecture Hall Chair
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(10, 6, 24, 28);
  ctx.fillStyle = '#475569';
  ctx.fillRect(12, 8, 20, 24);

  if (person.avatarStyle.pose === 'lecturing') {
    // Standing Lecturer at podium
    // Body in formal suit / shirt
    ctx.fillStyle = shirtShadow;
    ctx.fillRect(14, 18, 16, 22);
    ctx.fillStyle = shirt;
    ctx.fillRect(15, 18, 14, 20);

    // Red necktie
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(21, 20, 2, 10);

    // Head
    ctx.fillStyle = hair;
    ctx.fillRect(14, 6, 16, 12);
    ctx.fillStyle = skin;
    ctx.fillRect(16, 10, 12, 8);

    // Friendly face & glasses
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 1;
    ctx.strokeRect(17, 12, 4, 3);
    ctx.strokeRect(23, 12, 4, 3);
    ctx.fillStyle = '#16a34a'; // smile
    ctx.fillRect(20, 16, 4, 1);
  } else {
    // Student sitting at desk studying / coding
    ctx.fillStyle = shirtShadow;
    ctx.fillRect(12, 18, 20, 22);
    ctx.fillStyle = shirt;
    ctx.fillRect(14, 18, 16, 20);

    // Arms typing on keyboard
    ctx.fillStyle = shirt;
    ctx.fillRect(8, 26, 28, 6);
    ctx.fillStyle = skin;
    ctx.fillRect(18, 30, 8, 4);

    // Head
    ctx.fillStyle = hair;
    ctx.fillRect(13, 8, 18, 12);
    ctx.fillStyle = skin;
    ctx.fillRect(15, 12, 14, 8);

    // Focused eyes
    ctx.fillStyle = INK;
    ctx.fillRect(18, 14, 2, 2);
    ctx.fillRect(24, 14, 2, 2);

    // Student ID lanyard (Red ribbon with badge)
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(20, 20, 4, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(20, 28, 4, 4);
  }

  return c;
}
