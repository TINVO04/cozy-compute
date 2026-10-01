import { COMPANY_DESKS, COMPANY_COLS, COMPANY_ROWS, TILE, type Rect } from '@cozy/game-data';
import { shade } from './pixel';

type Palette = {
  floor: string;
  seam: string;
  wall: string;
  trim: string;
  accent: string;
  ink: string;
  wood: string;
};

const OFFICE: Palette = {
  floor: '#cdb28e',
  seam: '#b79b79',
  wall: '#e9e1ce',
  trim: '#496359',
  accent: '#a8c3a0',
  ink: '#293f38',
  wood: '#edce9f',
};

/** Static, cached canvas art: no particles, per-frame painting or additional assets. */
class RoomPainter {
  readonly canvas = document.createElement('canvas');
  readonly ctx: CanvasRenderingContext2D;

  constructor(
    readonly p: Palette,
    width: number,
    height: number,
  ) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
  }

  rect(x: number, y: number, w: number, h: number, color: string) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  }

  text(text: string, x: number, y: number, size: number, color: string, width?: number) {
    this.ctx.font = '600 ' + size + 'px "Segoe UI", sans-serif';
    this.ctx.fillStyle = color;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(text, x, y, width);
  }

  shell(woodFloor: boolean) {
    const { width: w, height: h } = this.canvas;
    const p = this.p;
    this.rect(0, 0, w, h, shade(p.trim, -0.32));
    this.rect(32, 64, w - 64, h - 64, p.floor);
    // Low-contrast seams, instead of a competing checkerboard pattern.
    for (let y = 64; y < h; y += woodFloor ? 16 : 32) {
      this.rect(32, y, w - 64, woodFloor ? 1 : 2, p.seam);
      this.rect(32, y + 2, w - 64, 1, shade(p.floor, 0.07));
      for (let x = 32 + (y % 32 ? 48 : 0); x < w - 32; x += woodFloor ? 96 : 64) {
        this.rect(x, y, 1, woodFloor ? 16 : 32, p.seam);
        if (woodFloor) {
          const start = Math.max(32, x + 8);
          const end = Math.min(w - 32, x + 44);
          if (end > start) this.rect(start, y + 5, end - start, 1, '#c4a783');
          const grainStart = Math.max(32, x + 20);
          const grainEnd = Math.min(w - 32, x + 40);
          if (grainEnd > grainStart) this.rect(grainStart, y + 10, grainEnd - grainStart, 1, '#d6bb97');
        } else {
          this.rect(x + 4, y + 5, 8, 2, '#f1ecdc');
        }
      }
    }
    // The back wall has a cap, plaster panels and a deep skirting board.
    this.rect(8, 4, w - 16, 56, p.wall);
    this.rect(4, 0, w - 8, 4, shade(p.trim, 0.24));
    this.rect(8, 4, w - 16, 2, '#fff1d8');
    this.rect(8, 45, w - 16, 11, shade(p.wall, -0.1));
    for (let x = 16; x < w - 16; x += 24) this.rect(x, 46, 1, 10, shade(p.wall, -0.18));
    this.rect(8, 56, w - 16, 8, p.trim);
    this.rect(8, 57, w - 16, 2, p.accent);
    this.rect(32, 64, w - 64, 4, '#302d2a16');
    // Paneled side walls retain the original server wall footprint.
    for (const x of [0, w - 32]) {
      this.rect(x + 3, 64, 26, 256, shade(p.wall, -0.17));
      this.rect(x + 3, 64, 3, 256, shade(p.trim, 0.16));
      this.rect(x + 27, 64, 5, 256, p.trim);
      for (let y = 184; y < 314; y += 32) {
        this.rect(x + 8, y, 16, 26, shade(p.wall, -0.23));
        this.rect(x + 9, y + 1, 14, 23, shade(p.wall, -0.12));
      }
    }
    // Side windows sit inside the existing solid wall footprint.
    for (const x of [6, w - 26]) {
      this.rect(x, 96, 20, 72, p.ink);
      this.rect(x + 3, 100, 14, 64, '#bbd9d4');
      this.rect(x + 3, 102, 5, 26, '#e3efe0');
      this.rect(x + 3, 151, 14, 13, '#87a183');
      this.rect(x + 5, 147, 4, 8, '#a6bc98');
      this.rect(x + 3, 134, 14, 3, p.wall);
      this.rect(x + 8, 100, 2, 64, p.wall);
      this.rect(x, 170, 20, 4, p.accent);
    }
    this.rect(0, 320, 192, 32, p.trim);
    this.rect(320, 320, w - 320, 32, p.trim);
    this.rect(8, 322, 184, 2, p.accent);
    this.rect(320, 322, w - 328, 2, p.accent);
    this.rect(4, 346, 188, 6, shade(p.trim, -0.22));
    this.rect(320, 346, w - 324, 6, shade(p.trim, -0.22));
    // Cushioned benches are part of the solid foreground wall, not new obstacles.
    for (const x of [50, 354]) {
      this.rect(x, 328, 108, 14, shade(p.trim, -0.18));
      this.rect(x + 2, 329, 104, 10, shade(p.accent, -0.12));
      for (let sx = x + 5; sx < x + 100; sx += 34) {
        this.rect(sx, 330, 30, 6, p.accent);
        this.rect(sx, 338, 30, 2, shade(p.accent, -0.22));
      }
    }
    // Entry threshold matches the shared four-tile exit opening.
    this.rect(200, 320, 112, 30, p.ink);
    this.rect(204, 322, 104, 2, p.accent);
    this.text('↓  THỊ TRẤN', 256, 341, 10, '#f5f1e7', 96);
    this.plant(6, 202);
    this.plant(w - 27, 234);
    this.sunlight(woodFloor);
  }

  sunlight(office: boolean) {
    // Fixed pixel bands hint at afternoon light, leaving signs and desks legible.
    for (let i = 0; i < 3; i++) {
      const x = 34 + i * 14;
      const y = 96 + i * 26;
      for (let row = 0; row < 20; row++) {
        this.rect(x + Math.floor(row / 2), y + row, 34, 1, office ? '#fff1cd18' : '#fff9e924');
      }
    }
  }

  rug(x: number, y: number, w: number, h: number, color: string) {
    this.rect(x, y, w, h, color);
    this.rect(x + 4, y + 4, w - 8, 1, this.p.accent);
    this.rect(x + 4, y + h - 5, w - 8, 1, this.p.accent);
    for (let px = x + 8; px < x + w - 8; px += 8) this.rect(px, y + 8, 1, h - 16, '#ffffff0b');
  }

  plant(x: number, y: number) {
    this.rect(x + 4, y + 32, 17, 3, '#202e2528');
    this.rect(x + 5, y + 20, 14, 14, '#e7dbbf');
    this.rect(x + 7, y + 23, 10, 11, '#b6a185');
    this.rect(x + 10, y + 6, 3, 17, '#526d4f');
    this.rect(x + 1, y + 7, 11, 7, '#5d8065');
    this.rect(x + 12, y + 1, 10, 8, '#7f9a72');
    this.rect(x + 11, y + 13, 13, 6, '#456b52');
    this.rect(x + 3, y + 8, 6, 2, '#91ae7c');
    this.rect(x + 15, y + 2, 5, 2, '#b6c894');
    this.rect(x + 8, y + 21, 8, 2, '#f6e8ca');
  }

  sconce(x: number) {
    this.rect(x - 7, 8, 14, 40, '#fff2ce25');
    this.rect(x - 1, 16, 3, 17, this.p.trim);
    this.rect(x - 6, 16, 13, 7, '#f1c98e');
    this.rect(x - 4, 17, 9, 4, '#ffebba');
    this.rect(x - 3, 32, 7, 2, shade(this.p.trim, -0.18));
  }

  book(x: number, y: number, color: string, width = 12) {
    this.rect(x, y, width, 3, color);
    this.rect(x + 1, y + 3, width - 2, 3, '#f5e5c9');
    this.rect(x, y + 6, width, 1, shade(color, -0.18));
  }

  monitor(x: number, y: number, design = false) {
    this.rect(x + 11, y + 19, 4, 5, '#697777');
    this.rect(x + 7, y + 23, 12, 2, '#414e4c');
    this.rect(x, y, 28, 20, '#394746');
    this.rect(x + 2, y + 2, 24, 15, '#172b30');
    if (design) {
      this.rect(x + 4, y + 4, 10, 10, '#bb7964');
      this.rect(x + 16, y + 4, 7, 5, '#d5c396');
      this.rect(x + 16, y + 11, 7, 3, '#82bda3');
    } else {
      for (let i = 0; i < 3; i++) {
        this.rect(x + 4, y + 4 + i * 4, [12, 18, 9][i]!, 1, i === 1 ? '#d8c496' : '#8bc2ae');
      }
    }
    this.rect(x + 1, y + 29, 25, 8, '#f1e8d7');
    this.rect(x + 3, y + 31, 21, 1, '#9eaaa3');
    this.rect(x + 3, y + 34, 21, 1, '#9eaaa3');
    this.rect(x + 30, y + 31, 4, 6, '#eae1d0');
  }

  desk(rect: Rect, campus: boolean) {
    const { x, y, w, h } = rect;
    const p = this.p;
    this.rect(x + 2, y + h, w, 5, '#25353020');
    this.rect(x, y, w, h, p.trim);
    this.rect(x + 2, y + 2, w - 4, h - 8, p.wood);
    this.rect(x + 4, y + 4, w - 8, 2, '#fff4dd');
    for (let grain = 0; grain < 3; grain++) this.rect(x + 8, y + 16 + grain * 16, w - 16, 1, '#a9845520');
    this.rect(x + 4, y + h - 6, w - 8, 2, p.accent);
    this.rect(x + 8, y + h - 3, 7, 3, p.ink);
    this.rect(x + w - 15, y + h - 3, 7, 3, p.ink);
    if (campus) {
      this.rect(x + 8, y + 6, w - 16, 52, '#cda979');
      this.monitor(x + 26, y + 10, x > 256);
      this.monitor(x + 86, y + 10);
      this.rect(x + 12, y + 66, 27, 16, '#bf7660');
      this.rect(x + 15, y + 69, 21, 10, '#f5e9d0');
      this.rect(x + 80, y + 69, 29, 2, '#b9a484');
      this.rect(x + 57, y + 12, 6, 12, p.accent);
      this.rect(x + 58, y + 15, 4, 2, '#f9e7c5');
      this.book(x + 49, y + 69, '#567d76', 18);
      this.text(x < 256 ? '01 · LAB AI' : '02 · THIẾT KẾ', x + w / 2, y + h - 10, 8, p.ink);
    } else {
      this.rect(x + 7, y + 6, 46, 44, '#b79872');
      this.rect(x + 71, y + 6, 46, 44, '#b79872');
      this.monitor(x + 14, y + 8);
      this.monitor(x + 78, y + 8, x > 256);
      this.rect(x + 54, y + 11, 7, 10, '#f2e9d9');
      this.rect(x + 55, y + 13, 5, 3, '#745a43');
      this.rect(x + 54, y + 34, 8, 12, '#659981');
      this.rect(x + 56, y + 36, 4, 1, '#e2eddf');
      this.rect(x + 62, y + 8, 2, 43, '#a98861');
    }
  }

  office() {
    const p = this.p;
    this.shell(true);
    // Acoustic oak slats frame the studio's wall sign.
    for (let x = 184; x < 406; x += 8) {
      this.rect(x, 7, 4, 48, '#baa17d');
      this.rect(x, 7, 1, 48, '#dcc7a4');
    }
    this.sconce(98);
    this.sconce(409);
    // Three independent wall fixtures, with no sign/board overlap.
    this.rect(190, 8, 210, 42, p.ink);
    this.rect(190, 49, 210, 3, '#182e2850');
    this.rect(194, 12, 3, 34, p.accent);
    this.text('VietProDev', 296, 30, 20, '#e7eee4', 182);
    this.text('CODE · COFFEE · COMMUNITY', 296, 43, 7, '#a5cbb7', 182);
    this.rect(110, 12, 68, 40, '#83948a');
    this.rect(112, 14, 64, 36, '#f2eee1');
    this.text('SPRINT', 144, 23, 8, p.ink);
    for (let i = 0; i < 3; i++) {
      this.rect(117 + i * 19, 28, 14, 14, ['#dbbf83', '#bf9788', '#8fbda6'][i]!);
      this.rect(120 + i * 19, 32, 8, 1, p.ink);
    }
    this.rect(34, 14, 52, 68, p.ink);
    this.rect(34, 80, 52, 10, '#283d36');
    for (let i = 0; i < 5; i++) {
      this.rect(38, 18 + i * 11, 44, 8, '#455750');
      this.rect(41, 21 + i * 11, 3, 2, p.accent);
      this.rect(50, 21 + i * 11, 26, 1, '#263b34');
      for (let slot = 0; slot < 4; slot++) this.rect(51 + slot * 6, 23 + i * 11, 3, 1, '#8a9d8b');
    }
    this.text('SERVER', 60, 77, 7, '#dbe6d9');
    this.rect(420, 36, 56, 46, '#877259');
    this.rect(422, 62, 52, 18, '#725d46');
    this.rect(446, 62, 2, 18, '#554a3c');
    this.rect(431, 65, 8, 2, '#c9b99a');
    this.rect(455, 65, 8, 2, '#c9b99a');
    this.rect(418, 34, 60, 5, p.wood);
    this.rect(426, 12, 25, 24, '#344640');
    this.rect(429, 15, 19, 10, '#879f94');
    this.rect(435, 27, 6, 6, '#eee6d7');
    this.rect(459, 25, 9, 9, '#f5edde');
    this.rect(467, 27, 3, 5, '#f5edde');
    this.rect(460, 26, 7, 2, '#795b41');
    this.rect(454, 8, 20, 12, '#58796a');
    this.rect(460, 11, 7, 6, '#f6e2b8');
    this.rect(467, 12, 3, 3, '#f6e2b8');
    this.rect(460, 18, 9, 1, '#f6e2b8');
    this.text('COFFEE', 448, 55, 8, '#f2e4cd');
    this.rug(84, 120, 152, 120, '#82977e');
    this.rug(276, 120, 152, 120, '#82977e');
    this.rect(88, 124, 144, 2, '#b2bea0');
    this.rect(280, 124, 144, 2, '#b2bea0');
    for (const desk of COMPANY_DESKS) this.desk(desk, false);
    // A small floor inlay makes the entry a welcome area without blocking it.
    this.rect(242, 80, 28, 25, '#b6a183');
    this.text('</>', 256, 97, 14, p.ink);
    this.rect(246, 116, 20, 2, '#ead1a9');
    this.rect(254, 122, 4, 126, '#dcc3a1');
    this.rug(192, 258, 128, 44, '#3d5148');
    this.text('VietProDev', 256, 278, 13, '#e0e9d8');
    this.text('Không gian làm việc chung', 256, 291, 7, '#bfd3bb', 110);
    return this.canvas;
  }
}

export function paintOfficeInterior(): HTMLCanvasElement {
  return new RoomPainter(OFFICE, COMPANY_COLS * TILE, COMPANY_ROWS * TILE).office();
}
