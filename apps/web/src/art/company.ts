import { COMPANY_COLS, COMPANY_ROWS, TILE } from '@cozy/game-data';
import { INK, shade } from './pixel';
import { paintOfficeInterior } from './interior';

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
    x: 4 * TILE,
    y: 6.2 * TILE,
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
    x: 6 * TILE,
    y: 6.2 * TILE,
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
    x: 10 * TILE,
    y: 6.2 * TILE,
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
    x: 12 * TILE,
    y: 6.2 * TILE,
    dialogue: 'Tìm ra 99 bugs rồi... dev cứ bảo "nó chạy tốt trên máy của anh"... zzz...',
    avatarStyle: {
      hairColor: '#b45309',
      shirtColor: '#f59e0b',
      pose: 'pillow_books',
    },
  },
];

/** Cached room background, using the same desk geometry as server collisions. */
export function paintCompanyOffice(): HTMLCanvasElement {
  return paintOfficeInterior();
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
