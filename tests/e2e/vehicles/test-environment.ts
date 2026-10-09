export interface MockDrawCall {
  method: string;
  args: unknown[];
}

export class MockCanvasRenderingContext2D {
  fillStyle: string | object = '';
  strokeStyle: string | object = '';
  lineWidth = 1;
  imageSmoothingEnabled = false;
  textAlign = 'start';
  textBaseline = 'alphabetic';
  font = '10px sans-serif';

  public calls: MockDrawCall[] = [];

  fillRect(x: number, y: number, w: number, h: number): void {
    this.calls.push({ method: 'fillRect', args: [x, y, w, h] });
  }

  strokeRect(x: number, y: number, w: number, h: number): void {
    this.calls.push({ method: 'strokeRect', args: [x, y, w, h] });
  }

  beginPath(): void {
    this.calls.push({ method: 'beginPath', args: [] });
  }

  closePath(): void {
    this.calls.push({ method: 'closePath', args: [] });
  }

  moveTo(x: number, y: number): void {
    this.calls.push({ method: 'moveTo', args: [x, y] });
  }

  lineTo(x: number, y: number): void {
    this.calls.push({ method: 'lineTo', args: [x, y] });
  }

  stroke(): void {
    this.calls.push({ method: 'stroke', args: [] });
  }

  fill(): void {
    this.calls.push({ method: 'fill', args: [] });
  }

  arc(x: number, y: number, r: number, sAngle: number, eAngle: number): void {
    this.calls.push({ method: 'arc', args: [x, y, r, sAngle, eAngle] });
  }

  ellipse(x: number, y: number, rx: number, ry: number, rot: number, sAngle: number, eAngle: number): void {
    this.calls.push({ method: 'ellipse', args: [x, y, rx, ry, rot, sAngle, eAngle] });
  }

  save(): void {
    this.calls.push({ method: 'save', args: [] });
  }

  restore(): void {
    this.calls.push({ method: 'restore', args: [] });
  }

  translate(x: number, y: number): void {
    this.calls.push({ method: 'translate', args: [x, y] });
  }

  scale(x: number, y: number): void {
    this.calls.push({ method: 'scale', args: [x, y] });
  }

  drawImage(...args: unknown[]): void {
    this.calls.push({ method: 'drawImage', args });
  }

  fillText(text: string, x: number, y: number): void {
    this.calls.push({ method: 'fillText', args: [text, x, y] });
  }

  strokeText(text: string, x: number, y: number): void {
    this.calls.push({ method: 'strokeText', args: [text, x, y] });
  }

  measureText(text: string): { width: number } {
    return { width: text.length * 6 };
  }

  createLinearGradient(x0: number, y0: number, x1: number, y1: number) {
    return {
      x0,
      y0,
      x1,
      y1,
      stops: [] as [number, string][],
      addColorStop(offset: number, color: string) {
        this.stops.push([offset, color]);
      },
    };
  }
}

export class MockHTMLCanvasElement {
  width = 0;
  height = 0;
  private ctx: MockCanvasRenderingContext2D;

  constructor(w = 0, h = 0) {
    this.width = w;
    this.height = h;
    this.ctx = new MockCanvasRenderingContext2D();
  }

  getContext(type: string): MockCanvasRenderingContext2D | null {
    if (type === '2d') return this.ctx;
    return null;
  }

  toDataURL(format = 'image/png'): string {
    return `data:${format};base64,MOCK_DATA_${this.width}x${this.height}`;
  }
}

let originalDocument: unknown;

export function setupVirtualCanvasEnvironment(): void {
  originalDocument = globalThis.document;
  // @ts-expect-error Mocking global document for headless tests
  globalThis.document = {
    createElement(tag: string) {
      if (tag === 'canvas') {
        return new MockHTMLCanvasElement();
      }
      return { tagName: tag };
    },
  };
}

export function teardownVirtualCanvasEnvironment(): void {
  if (originalDocument !== undefined) {
    // @ts-expect-error Restoring document
    globalThis.document = originalDocument;
  }
}

export function createMockPhaserScene() {
  const textures = new Map<string, unknown>();
  return {
    textures: {
      exists: (key: string) => textures.has(key),
      addCanvas: (key: string, canvas: unknown) => {
        textures.set(key, canvas);
        return { key, source: [canvas] };
      },
      get: (key: string) => textures.get(key),
    },
    add: {
      image: (x: number, y: number, key: string) => {
        const obj = {
          x,
          y,
          key,
          originX: 0,
          originY: 0,
          blendMode: 0,
          depth: 0,
          visible: true,
          alpha: 1,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          setOrigin(ox: number, oy = ox) {
            this.originX = ox;
            this.originY = oy;
            return this;
          },
          setBlendMode(bm: number) {
            this.blendMode = bm;
            return this;
          },
          setDepth(d: number) {
            this.depth = d;
            return this;
          },
          setVisible(v: boolean) {
            this.visible = v;
            return this;
          },
          setPosition(px: number, py: number) {
            this.x = px;
            this.y = py;
            return this;
          },
          setRotation(r: number) {
            this.rotation = r;
            return this;
          },
          setAlpha(a: number) {
            this.alpha = a;
            return this;
          },
          setScale(sx: number, sy = sx) {
            this.scaleX = sx;
            this.scaleY = sy;
            return this;
          },
          setTexture(k: string) {
            this.key = k;
            return this;
          },
          destroy() {},
        };
        return obj;
      },
      graphics: () => {
        return {
          blendMode: 0,
          depth: 0,
          fillColor: 0,
          fillAlpha: 1,
          circles: [] as Array<{ x: number; y: number; r: number }>,
          rects: [] as Array<{ x: number; y: number; w: number; h: number }>,
          setBlendMode(bm: number) {
            this.blendMode = bm;
            return this;
          },
          setDepth(d: number) {
            this.depth = d;
            return this;
          },
          clear() {
            this.circles = [];
            this.rects = [];
            return this;
          },
          fillStyle(c: number, a = 1) {
            this.fillColor = c;
            this.fillAlpha = a;
            return this;
          },
          fillCircle(x: number, y: number, r: number) {
            this.circles.push({ x, y, r });
            return this;
          },
          fillRect(x: number, y: number, w: number, h: number) {
            this.rects.push({ x, y, w, h });
            return this;
          },
          destroy() {},
        };
      },
    },
  };
}
