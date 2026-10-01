import { DNTU_COLS, DNTU_ROWS, TILE } from '@cozy/game-data';
import { INK, shade } from './pixel';
import { paintCampusInterior } from './interior';

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
    id: 'thay_tan',
    name: 'Thầy Tân',
    role: 'Giảng viên DNTU',
    x: 8 * TILE,
    y: 2.8 * TILE,
    dialogue: 'Các em ơi các em lớn rồi mà!',
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
    x: 5 * TILE,
    y: 7.5 * TILE,
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
    x: 11 * TILE,
    y: 7.5 * TILE,
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
    name: 'DNTU-Bot',
    role: 'Robot Trợ Lý AI Sinh Viên',
    x: 12 * TILE,
    y: 3 * TILE,
    dialogue:
      'Bíp bíp! DNTU đạt Chứng nhận Kiểm định Chất lượng Giáo dục Quốc gia với 25 ngành đào tạo. Chúc bạn có một ngày học tập tràn đầy cảm hứng!',
    avatarStyle: {
      hairColor: '#38bdf8',
      shirtColor: '#0284c7',
      pose: 'robot',
    },
  },
];

/** Cached room background, using the same desk geometry as server collisions. */
export function paintDntuCampus(): HTMLCanvasElement {
  return paintCampusInterior();
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

  // Students sit; the lecturer stands at the podium without a chair behind him.
  if (person.avatarStyle.pose !== 'lecturing') {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(10, 6, 24, 28);
    ctx.fillStyle = '#475569';
    ctx.fillRect(12, 8, 20, 24);
  }

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
