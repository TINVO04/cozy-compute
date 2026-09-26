import { HAIR_COLORS, SKIN_TONES, TOP_COLORS, type Appearance } from '@cozy/game-data';
import { INK, PixelGrid, shade } from './pixel';

export const AV_W = 16;
export const AV_H = 28;
export const AV_SCALE = 2;
export type Dir = 0 | 1 | 2 | 3; // down, left, right, up

const parse = (sprite?: string | null) => {
  if (!sprite) return null;
  const [kind, color] = sprite.split(':');
  return { kind: kind!, color: color ?? '#888888' };
};

/**
 * Draws one avatar frame on a 16x28 grid. Head occupies rows 6..13, torso 14..20, legs 21..25.
 * Side view (dir 1) is drawn facing left and mirrored for right.
 */
export function drawAvatar(a: Appearance, dir: Dir, frame: 0 | 1 | 2): PixelGrid {
  if (dir === 2) return drawAvatar(a, 1, frame).mirror();
  const g = new PixelGrid(AV_W, AV_H);
  const skin = SKIN_TONES[a.skin] ?? SKIN_TONES[1];
  const skinD = shade(skin, -0.18);
  const hair = HAIR_COLORS[a.hairColor] ?? HAIR_COLORS[1];
  const hairD = shade(hair, -0.25);
  const top = parse(a.top);
  const topColor = top?.color ?? TOP_COLORS[a.baseTop] ?? TOP_COLORS[0];
  const topD = shade(topColor, -0.22);
  const pants = '#3a3f58';
  const shoes = '#2b2320';
  const side = dir === 1;
  const back = dir === 3;

  // legs + shoes (walk cycle offsets)
  const lOff = frame === 1 ? -1 : 0;
  const rOff = frame === 2 ? -1 : 0;
  if (side) {
    g.rect(6, 21 + lOff, 2, 4, pants);
    g.rect(8, 21 + rOff, 2, 4, shade(pants, -0.15));
    g.rect(5, 25 + lOff, 3, 1, shoes);
    g.rect(8, 25 + rOff, 2, 1, shoes);
  } else {
    g.rect(5, 21 + lOff, 3, 4, pants);
    g.rect(8, 21 + rOff, 3, 4, pants);
    g.rect(5, 25 + lOff, 3, 1, shoes);
    g.rect(8, 25 + rOff, 3, 1, shoes);
  }

  // torso
  const tx = side ? 5 : 4;
  const tw = side ? 6 : 8;
  g.rect(tx, 14, tw, 7, topColor);
  g.rect(tx, 20, tw, 1, topD);
  // arms
  const short = top?.kind === 'tee';
  const armSwing = frame === 0 ? 0 : frame === 1 ? 1 : -1;
  if (side) {
    g.rect(7, 15 + armSwing, 2, short ? 2 : 4, topD);
    g.rect(7, (short ? 17 : 19) + armSwing, 2, short ? 3 : 1, skin);
  } else {
    g.rect(3, 15, 1, short ? 2 : 4, topD);
    g.rect(12, 15, 1, short ? 2 : 4, topD);
    g.rect(3, short ? 17 : 19, 1, short ? 3 : 1, skin);
    g.rect(12, short ? 17 : 19, 1, short ? 3 : 1, skin);
  }
  // clothing details
  if (top?.kind === 'hoodie' && !back) {
    g.rect(tx + 2, 18, tw - 4, 2, topD);
    g.set(7, 14, '#f2efe7');
    g.set(8, 14, '#f2efe7');
  }
  if (top?.kind === 'hoodie' && back) g.rect(5, 14, 6, 2, topD);
  if (top?.kind === 'raincoat') {
    g.rect(tx, 21, tw, 1, topColor);
    if (!back && !side) [15, 17, 19].forEach((y) => g.set(8, y, '#6d4a17'));
  }
  if (top?.kind === 'suit' && !back) {
    if (side) g.rect(5, 14, 1, 4, '#f7f4ee');
    else {
      g.rect(7, 14, 2, 4, '#f7f4ee');
      g.rect(7, 15, 2, 3, '#b4553f');
      g.set(7, 18, '#b4553f');
    }
  }
  if (top?.kind === 'sweater' && !back && !side) {
    g.rect(6, 16, 3, 2, '#e6c63a');
    g.set(9, 16, '#e6c63a');
    g.set(10, 16, '#ef7a3a');
    g.set(7, 16, INK);
  }

  // head
  g.rect(4, 6, 8, 8, skin);
  g.rect(4, 13, 8, 1, skinD);
  if (!back) {
    if (side) {
      g.set(4, 9, INK);
      g.set(3, 10, skin); // nose
      g.set(5, 12, skinD);
    } else {
      g.set(6, 9, INK);
      g.set(9, 9, INK);
      g.set(6, 10, INK);
      g.set(9, 10, INK);
      g.rect(7, 12, 2, 1, skinD);
      g.set(5, 11, shade(skin, -0.05));
    }
  }

  // hair
  const style = a.hairStyle;
  if (style !== 'bald') {
    g.rect(4, 5, 8, 2, hair);
    g.rect(3, 6, 1, 3, hair);
    g.rect(12, 6, 1, 3, hair);
    if (back) g.rect(4, 6, 8, 6, hair);
    else if (side) g.rect(8, 6, 4, 4, hair);
    else g.rect(4, 7, 8, 1, hair);
    if (style === 'long') {
      g.rect(3, 9, 1, 6, hair);
      g.rect(12, 9, 1, 6, hair);
      if (back) g.rect(4, 12, 8, 3, hair);
      if (side) g.rect(10, 10, 2, 5, hair);
    }
    if (style === 'bun') {
      g.rect(6, 2, 4, 3, hair);
      g.rect(7, 2, 2, 1, hairD);
    }
    if (style === 'spiky') {
      [4, 6, 8, 10].forEach((x) => {
        g.set(x, 4, hair);
        g.set(x + 1, 3, hair);
      });
    }
    g.rect(4, 5, 8, 1, hairD);
  } else {
    g.set(6, 6, shade(skin, 0.25));
  }

  // face accessories
  const face = parse(a.face);
  if (face && !back) {
    if (face.kind === 'glasses') {
      if (side) g.rect(3, 8, 3, 1, face.color);
      else {
        g.rect(5, 8, 3, 1, face.color);
        g.rect(8, 8, 3, 1, face.color);
        g.set(5, 10, face.color);
        g.set(10, 10, face.color);
      }
    }
    if (face.kind === 'shades') {
      if (side) g.rect(3, 9, 3, 1, face.color);
      else g.rect(5, 9, 6, 2, face.color);
    }
    if (face.kind === 'mustache') {
      if (side) g.rect(3, 11, 2, 1, face.color);
      else {
        g.rect(6, 11, 4, 1, face.color);
        g.set(5, 12, face.color);
        g.set(10, 12, face.color);
      }
    }
  }

  // hats
  const hat = parse(a.hat);
  if (hat) {
    const c = hat.color;
    const d = shade(c, -0.22);
    if (hat.kind === 'beanie') {
      g.rect(4, 3, 8, 4, c);
      g.rect(3, 6, 10, 1, d);
      g.rect(7, 2, 2, 1, shade(c, 0.3));
    } else if (hat.kind === 'cap') {
      g.rect(4, 3, 8, 3, c);
      g.rect(4, 6, 8, 1, d);
      if (side) g.rect(1, 6, 3, 1, d);
      else if (!back) g.rect(4, 6, 8, 1, d);
    } else if (hat.kind === 'chef') {
      g.rect(4, 5, 8, 2, c);
      g.rect(3, 0, 10, 5, c);
      g.rect(4, 1, 1, 3, shade(c, -0.08));
      g.rect(8, 1, 1, 3, shade(c, -0.08));
    } else if (hat.kind === 'cone') {
      g.rect(3, 6, 10, 1, c);
      g.rect(4, 4, 8, 2, c);
      g.rect(5, 2, 6, 2, c);
      g.rect(6, 0, 4, 2, c);
      g.rect(5, 3, 6, 1, '#f7f4ee');
      g.rect(3, 6, 10, 1, d);
    } else if (hat.kind === 'crown') {
      g.rect(4, 3, 8, 3, c);
      [4, 7, 11].forEach((x) => g.set(x, 2, c));
      g.set(8, 2, c);
      g.set(6, 4, '#d2556a');
      g.set(9, 4, '#4f6fd1');
      g.rect(4, 5, 8, 1, d);
    }
  }

  g.outline(INK);
  return g;
}

export function appearanceKey(a: Appearance): string {
  return [a.skin, a.hairStyle, a.hairColor, a.baseTop, a.hat ?? '', a.top ?? '', a.face ?? ''].join('|');
}

/** Sprite sheet canvas: rows = dir (down, left, right, up), cols = frame (idle, stepA, stepB). */
export function avatarSheet(a: Appearance, scale = AV_SCALE): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = AV_W * scale * 3;
  c.height = AV_H * scale * 4;
  const ctx = c.getContext('2d')!;
  for (let d = 0 as Dir; d < 4; d = (d + 1) as Dir)
    for (let f = 0; f < 3; f++)
      drawAvatar(a, d, f as 0 | 1 | 2).drawTo(ctx, f * AV_W * scale, d * AV_H * scale, scale);
  return c;
}

const portraitCache = new Map<string, string>();

/** Data URL portrait of an avatar facing down, for UI surfaces. */
export function avatarPortrait(a: Appearance, scale = 4): string {
  const key = appearanceKey(a) + '@' + scale;
  const hit = portraitCache.get(key);
  if (hit) return hit;
  const url = drawAvatar(a, 0, 0).toCanvas(scale).toDataURL();
  portraitCache.set(key, url);
  return url;
}
