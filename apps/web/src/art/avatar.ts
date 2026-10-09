import {
  HAIR_COLORS,
  SKIN_TONES,
  TOP_COLORS,
  normalizeRodId,
  normalizeSwordId,
  type Appearance,
} from '@cozy/game-data';
import { INK, PixelGrid, shade } from './pixel';
import { drawFish, getSpeciesData } from './fish';

export const AV_W = 16;
export const AV_H = 28;
export const AV_SCALE = 2;
export const AV_FRAME_W = 48;
export const AV_FRAME_H = 56;
export type Dir = 0 | 1 | 2 | 3; // down, left, right, up

const parse = (sprite?: string | null) => {
  if (!sprite) return null;
  const [kind, color] = sprite.split(':');
  return { kind: kind!, color: color ?? '#888888' };
};

interface SwordPalette {
  scabbard: string;
  scabbardTrim: string;
  hilt: string;
  guard: string;
  pommel: string;
  blade: string;
  tassel: string;
  glow?: string;
  sparkle?: string;
  strap: string;
  strapBuckle: string;
}

const SWORD_PALETTES: Record<string, SwordPalette> = {
  sword_training: {
    scabbard: '#854d0e',
    scabbardTrim: '#a16207',
    hilt: '#b45309',
    guard: '#78350f',
    pommel: '#92400e',
    blade: '#d9bea2',
    tassel: '#ca8a04',
    strap: '#543217',
    strapBuckle: '#d4b886',
  },
  sword_iron: {
    scabbard: '#1e293b',
    scabbardTrim: '#475569',
    hilt: '#334155',
    guard: '#eab308',
    pommel: '#cbd5e1',
    blade: '#e2e8f0',
    tassel: '#dc2626',
    glow: '#94a3b8',
    strap: '#382517',
    strapBuckle: '#e2e8f0',
  },
  sword_crystal: {
    scabbard: '#0f766e',
    scabbardTrim: '#14b8a6',
    hilt: '#0e7490',
    guard: '#2dd4bf',
    pommel: '#67e8f9',
    blade: '#5eead4',
    tassel: '#06b6d4',
    glow: '#38bdf8',
    sparkle: '#ffffff',
    strap: '#134e4a',
    strapBuckle: '#5eead4',
  },
  sword_ancient: {
    scabbard: '#78350f',
    scabbardTrim: '#b45309',
    hilt: '#92400e',
    guard: '#f59e0b',
    pommel: '#fbbf24',
    blade: '#fde047',
    tassel: '#b91c1c',
    glow: '#fde047',
    sparkle: '#fef08a',
    strap: '#451a03',
    strapBuckle: '#f59e0b',
  },
  sword_flame: {
    scabbard: '#450a0a',
    scabbardTrim: '#991b1b',
    hilt: '#7f1d1d',
    guard: '#dc2626',
    pommel: '#ef4444',
    blade: '#f87171',
    tassel: '#f97316',
    glow: '#ef4444',
    sparkle: '#fbbf24',
    strap: '#450a0a',
    strapBuckle: '#f97316',
  },
  sword_frost: {
    scabbard: '#0369a1',
    scabbardTrim: '#0284c7',
    hilt: '#075985',
    guard: '#38bdf8',
    pommel: '#bae6fd',
    blade: '#e0f2fe',
    tassel: '#7dd3fc',
    glow: '#38bdf8',
    sparkle: '#ffffff',
    strap: '#0c4a6e',
    strapBuckle: '#bae6fd',
  },
};

/**
 * 2026 High-Detail Pixel Avatar:
 * Masterpiece anime-inspired character rendering (Fields of Mistria / Stardew Valley 1.6 / HD-2D).
 * Grid 16x28:
 * - Head: rows 6..13 (anime twinkle catchlights, glossy blush cheekbones, delicate button nose, expressive smile)
 * - Torso: rows 14..20 (bespoke tailoring, ribbed collars, kangaroo pockets, Nordic knit, metallic belt buckles)
 * - Legs & Shoes: rows 21..27 (structured denim seams, knee creases, designer sneakers with rubber cup soles)
 */
export function drawAvatar(a: Appearance, dir: Dir, frame: 0 | 1 | 2): PixelGrid {
  if (dir === 2) return drawAvatar(a, 1, frame).mirror();
  const g = new PixelGrid(AV_W, AV_H);
  const skin = SKIN_TONES[a.skin] ?? SKIN_TONES[1] ?? '#f0c8a0';
  const skinD = shade(skin, -0.2);
  const skinDD = shade(skin, -0.32);
  const skinL = shade(skin, 0.18);
  const blush = shade(skin, -0.35); // natural warm blush
  const hair = HAIR_COLORS[a.hairColor] ?? HAIR_COLORS[1] ?? '#4a3224';
  const hairD = shade(hair, -0.32);
  const hairL = shade(hair, 0.38); // brilliant specular shine band
  const top = parse(a.top);
  const topColor = top?.color ?? TOP_COLORS[a.baseTop] ?? TOP_COLORS[0] ?? '#4f6fd1';
  const topD = shade(topColor, -0.26);
  const topDD = shade(topColor, -0.4);
  const topL = shade(topColor, 0.26);
  const pants = '#2d334a';
  const pantsD = shade(pants, -0.28);
  const pantsL = shade(pants, 0.22);
  const shoes = '#2c221c';
  const shoesD = shade(shoes, -0.35);
  const shoesSole = '#f4f0e6'; // crisp off-white sneaker cupsole
  const side = dir === 1;
  const back = dir === 3;

  // Walk cycle leg offsets and body bob
  const lOff = frame === 1 ? -1 : 0;
  const rOff = frame === 2 ? -1 : 0;
  const bodyBob = frame !== 0 ? -1 : 0;

  // --- 1. LEGS & DESIGNER SHOES (rows 21..27) ---
  if (side) {
    const leadCol = frame === 1 ? pants : pantsD;
    const trailCol = frame === 1 ? pantsD : pants;
    // Lead leg (profile)
    g.rect(6, 21 + lOff, 2, 4, leadCol);
    g.set(6, 21 + lOff, pantsL);
    g.set(6, 23 + lOff, pantsL); // knee fold highlight
    // Trailing leg
    g.rect(8, 21 + rOff, 2, 4, trailCol);
    g.set(8, 22 + rOff, shade(trailCol, 0.15));

    // Profile designer shoes
    g.rect(5, 25 + lOff, 3, 1, shoes);
    g.set(5, 25 + lOff, '#ffffff'); // toe cap glint
    g.rect(5, 26 + lOff, 3, 1, shoesSole);
    g.set(5, 26 + lOff, shade(shoesSole, -0.15));

    g.rect(8, 25 + rOff, 2, 1, shoesD);
    g.rect(8, 26 + rOff, 2, 1, shade(shoesSole, -0.2));
  } else {
    // Front / Back legs
    g.rect(5, 21 + lOff, 3, 4, pants);
    g.rect(8, 21 + rOff, 3, 4, pants);
    // Outer seams & knee creases
    g.set(5, 21 + lOff, pantsL);
    g.set(10, 21 + rOff, pantsL);
    g.set(5, 23 + lOff, pantsL);
    g.set(10, 23 + rOff, pantsL);
    // Inseam shadows
    g.rect(6, 23 + lOff, 1, 2, pantsD);
    g.rect(9, 23 + rOff, 1, 2, pantsD);
    // Ankle cuff fold
    g.rect(5, 24 + lOff, 3, 1, pantsD);
    g.rect(8, 24 + rOff, 3, 1, pantsD);

    // Modern sneakers with white laces, toe caps & rubber soles
    g.rect(4, 25 + lOff, 4, 1, shoes);
    g.rect(8, 25 + rOff, 4, 1, shoes);
    g.set(4, 25 + lOff, '#ffffff'); // white rubber toe cap
    g.set(11, 25 + rOff, '#ffffff');
    g.set(6, 25 + lOff, '#f4f0e6'); // white lace criss-cross
    g.set(9, 25 + rOff, '#f4f0e6');
    g.rect(4, 26 + lOff, 4, 1, shoesSole);
    g.rect(8, 26 + rOff, 4, 1, shoesSole);
    g.set(4, 26 + lOff, shade(shoesSole, -0.15)); // sole tread groove
    g.set(11, 26 + rOff, shade(shoesSole, -0.15));
  }

  // --- 2. TORSO & APPAREL (rows 14..20 + bodyBob) ---
  const tx = side ? 5 : 4;
  const tw = side ? 6 : 8;
  const ty = 14 + bodyBob;

  // Base garment body
  g.rect(tx, ty, tw, 7, topColor);
  g.rect(tx, ty + 5, tw, 1, topD); // lower waist fold

  // Waist belt & metallic buckle at row 20
  g.rect(tx, ty + 6, tw, 1, '#201b2a');
  if (!back) {
    if (side) {
      g.set(tx, ty + 6, '#f5c542'); // gold buckle
    } else {
      g.set(6, ty + 6, '#201b2a');
      g.set(7, ty + 6, '#ffd700'); // brilliant gold buckle
      g.set(8, ty + 6, '#e6b84a');
      g.set(9, ty + 6, '#201b2a');
    }
  }

  // Collar & Neckline
  if (!back) {
    if (side) {
      g.set(5, ty, '#fdfbf7');
      g.set(6, ty, topL);
    } else {
      g.set(6, ty, '#fdfbf7');
      g.set(9, ty, '#fdfbf7');
      g.set(7, ty, skin);
      g.set(8, ty, skin);
      g.set(7, ty + 1, skinD); // collar shadow on neck
      g.set(8, ty + 1, skinD);
    }
  }

  // Arms and sleeves with walk cycle swing
  const short = top?.kind === 'tee';
  const armSwing = frame === 0 ? 0 : frame === 1 ? 1 : -1;
  if (side) {
    g.rect(7, ty + 1 + armSwing, 2, short ? 2 : 4, topD);
    g.set(7, ty + 1 + armSwing, topL);
    g.rect(7, (short ? ty + 3 : ty + 5) + armSwing, 2, short ? 3 : 1, skin);
    g.set(7, (short ? ty + 3 : ty + 5) + armSwing, skinL);
    if (!short) g.rect(7, ty + 4 + armSwing, 2, 1, topL); // sleeve cuff
  } else {
    // Left arm
    g.rect(3, ty + 1 - armSwing, 1, short ? 2 : 4, topD);
    g.set(3, ty + 1 - armSwing, topL);
    g.rect(3, short ? ty + 3 - armSwing : ty + 5 - armSwing, 1, short ? 3 : 1, skin);
    g.set(3, short ? ty + 3 - armSwing : ty + 5 - armSwing, skinL);
    // Right arm
    g.rect(12, ty + 1 + armSwing, 1, short ? 2 : 4, topD);
    g.set(12, ty + 1 + armSwing, topL);
    g.rect(12, short ? ty + 3 + armSwing : ty + 5 + armSwing, 1, short ? 3 : 1, skin);
    g.set(12, short ? ty + 3 + armSwing : ty + 5 + armSwing, skinL);
  }

  // Masterpiece clothing styling
  if (top?.kind === 'hoodie') {
    if (!back) {
      // 3D kangaroo pocket with rim highlight
      g.rect(tx + 1, ty + 4, tw - 2, 2, topD);
      g.set(tx + 1, ty + 4, topL);
      g.set(tx + tw - 2, ty + 4, topL);
      // Hood drawstrings with silver aglet tips
      g.set(7, ty + 1, '#ffffff');
      g.set(8, ty + 1, '#ffffff');
      g.set(7, ty + 2, '#ffffff');
      g.set(8, ty + 3, '#ffffff');
      g.set(7, ty + 3, '#c0c0c0'); // metal aglet
      g.set(8, ty + 4, '#c0c0c0');
    } else {
      // Draped hood cowl on the back
      g.rect(5, ty, 6, 4, topD);
      g.rect(6, ty + 1, 4, 2, topDD);
      g.rect(6, ty, 4, 1, topL);
    }
  } else if (top?.kind === 'suit') {
    if (!back) {
      if (side) {
        g.rect(5, ty, 1, 4, '#ffffff'); // crisp white dress shirt
        g.rect(5, ty + 1, 1, 2, '#c0392b'); // silk ruby tie
      } else {
        // Crisp dress shirt & silk ruby tie with golden tie clip
        g.rect(7, ty, 2, 5, '#ffffff');
        g.set(7, ty + 1, '#c0392b');
        g.set(8, ty + 1, '#c0392b');
        g.set(7, ty + 2, '#e6b84a'); // golden tie bar clip
        g.set(8, ty + 2, '#e6b84a');
        g.set(7, ty + 3, '#a93226');
        g.set(8, ty + 3, '#c0392b');
        g.set(7, ty + 4, '#c0392b');
        // Tailored blazer notched lapels
        g.rect(5, ty + 1, 2, 4, topD);
        g.rect(9, ty + 1, 2, 4, topD);
        g.set(5, ty + 1, topL);
        g.set(10, ty + 1, topL);
        // Folded gold silk pocket square
        g.set(10, ty + 2, '#ffd700');
        g.set(11, ty + 2, '#ffffff');
      }
    }
  } else if (top?.kind === 'sweater') {
    if (!back && !side) {
      // Scandinavian Fair Isle / cable-knit snowflake diamonds
      g.rect(6, ty + 2, 4, 1, '#fde68a');
      g.set(7, ty + 1, '#ffffff');
      g.set(8, ty + 1, '#ffffff');
      g.set(7, ty + 3, '#ffffff');
      g.set(8, ty + 3, '#ffffff');
      g.set(5, ty + 2, '#f87171');
      g.set(10, ty + 2, '#f87171');
      g.set(6, ty + 4, '#fde68a');
      g.set(9, ty + 4, '#fde68a');
    }
  } else if (top?.kind === 'raincoat') {
    if (!back && !side) {
      // Glossy vinyl storm flap & wooden toggle buttons
      g.rect(6, ty, 1, 6, topL); // glossy vinyl sheen streak
      [ty + 1, ty + 3, ty + 5].forEach((y) => {
        g.set(7, y, '#452b14'); // dark toggle button
        g.set(8, y, '#fef3c7'); // braided rope loop
      });
    }
  } else {
    // Default Top / Tee: crisp crewneck collar, stylish chest logo
    if (!back && !side) {
      // Golden star emblem on chest
      g.set(6, ty + 2, '#ffd700');
      g.set(6, ty + 3, '#f59e0b');
      // Gentle cloth drapery fold
      g.set(8, ty + 3, topD);
      g.set(8, ty + 5, topD);
      g.set(7, ty + 4, topL);
    }
  }

  // --- 3. HEAD, FACE & ANIME SPARKLE EYES (rows 6..13 + bodyBob) ---
  const hy = 6 + bodyBob;

  // Head base & jawline
  g.rect(4, hy, 8, 8, skin);
  g.rect(4, hy + 7, 8, 1, skinDD); // neck shadow
  g.set(4, hy + 6, skinD);
  g.set(11, hy + 6, skinD);

  if (!back) {
    if (side) {
      // Side profile
      g.set(3, hy + 4, skin); // nose tip
      g.set(3, hy + 5, skinD);
      g.set(4, hy + 6, skinD); // cute jaw curve
      // Expressive anime eye with double sparkle catchlight
      g.set(4, hy + 3, INK);
      g.set(4, hy + 4, '#ffffff'); // bright catchlight
      g.set(5, hy + 3, INK);
      g.set(5, hy + 4, '#7dd3fc'); // soft pupil iris tint
      // Soft blush
      g.set(5, hy + 5, blush);
      g.set(4, hy + 5, '#ffffff'); // cheek glint
      // Ear with inner auricle shading
      g.rect(9, hy + 4, 1, 2, skinD);
      g.set(9, hy + 4, skinDD);
    } else {
      // Front face: Anime eye design with twin sparkle catchlights & eyelashes
      // Eyelash rims
      g.set(6, hy + 2, INK);
      g.set(9, hy + 2, INK);

      // Left eye (twinkle catchlights + iris depth)
      g.set(6, hy + 3, '#ffffff'); // primary bright glint
      g.set(7, hy + 3, INK); // pupil
      g.set(6, hy + 4, '#38bdf8'); // colorful iris catchlight
      g.set(7, hy + 4, INK);

      // Right eye (twinkle catchlights + iris depth)
      g.set(9, hy + 3, '#ffffff');
      g.set(10, hy + 3, INK);
      g.set(9, hy + 4, '#38bdf8');
      g.set(10, hy + 4, INK);

      // Sweet blushing cheeks with subtle specular cheekbone gleam
      g.set(5, hy + 5, blush);
      g.set(5, hy + 4, '#ffffff'); // cheekbone highlight
      g.set(10, hy + 5, blush);
      g.set(10, hy + 4, '#ffffff');

      // Cute button nose & smiling mouth
      g.set(7, hy + 5, skinD);
      g.set(8, hy + 5, skinD);
      g.rect(7, hy + 6, 2, 1, '#b94343'); // warm peach-rose smile

      // Ears
      g.set(3, hy + 4, skin);
      g.set(3, hy + 5, skinD);
      g.set(12, hy + 4, skin);
      g.set(12, hy + 5, skinD);
    }
  }

  // --- 4. HAIR STYLES & SPECULAR LUSTER ---
  const style = a.hairStyle;
  if (style !== 'bald') {
    // Hair base crown
    g.rect(4, hy - 1, 8, 2, hair);
    g.rect(3, hy, 1, 4, hair);
    g.rect(12, hy, 1, 4, hair);

    // Specular shine band (anime halo)
    g.rect(5, hy - 1, 6, 1, hairL);
    g.set(6, hy - 1, '#ffffff'); // peak specular sparkle
    g.rect(4, hy, 8, 1, hair);

    if (back) {
      g.rect(4, hy, 8, 7, hair);
      g.rect(5, hy + 2, 6, 1, hairL); // back luster
      g.rect(4, hy + 6, 8, 1, hairD);
    } else if (side) {
      g.rect(7, hy, 5, 5, hair);
      g.rect(8, hy + 1, 3, 1, hairL);
      g.rect(7, hy + 4, 5, 1, hairD);
      g.set(5, hy + 1, hair);
      g.set(4, hy + 2, hair);
      g.set(4, hy + 3, hairD); // sideburn tuft
    } else {
      // Front bangs with cute tufts and shaded tips
      g.set(4, hy + 1, hair);
      g.set(5, hy + 1, hairL);
      g.set(6, hy + 1, hair);
      g.set(9, hy + 1, hair);
      g.set(10, hy + 1, hairL);
      g.set(11, hy + 1, hair);
      // Bang tips shadow over forehead
      g.set(5, hy + 2, hairD);
      g.set(10, hy + 2, hairD);
    }

    if (style === 'long') {
      // Flowing silky locks past shoulders to row 19
      if (!side) {
        g.rect(3, hy + 4, 1, 8, hair);
        g.rect(12, hy + 4, 1, 8, hair);
        g.set(3, hy + 6, hairL);
        g.set(12, hy + 6, hairL);
        g.set(3, hy + 7, '#ffffff'); // silky glint
        g.set(12, hy + 7, '#ffffff');
        g.set(3, hy + 11, hairD);
        g.set(12, hy + 11, hairD);
        if (back) {
          g.rect(4, hy + 7, 8, 5, hair);
          g.rect(5, hy + 8, 6, 1, hairL);
          g.rect(4, hy + 11, 8, 1, hairD);
        }
      } else {
        g.rect(9, hy + 4, 3, 8, hair);
        g.set(10, hy + 6, hairL);
        g.set(10, hy + 7, '#ffffff');
        g.rect(9, hy + 11, 3, 1, hairD);
      }
    } else if (style === 'bun') {
      // High bun with cute hair ribbon
      g.rect(6, hy - 4, 4, 3, hair);
      g.rect(7, hy - 4, 2, 1, hairL);
      g.set(7, hy - 4, '#ffffff'); // bun specular glint
      g.rect(6, hy - 2, 4, 1, '#f43f5e'); // vibrant coral-rose ribbon
      g.set(5, hy - 1, '#f43f5e'); // ribbon tails
      g.set(10, hy - 1, '#f43f5e');
    } else if (style === 'spiky') {
      // Dynamic anime spikes with highlighted tips
      [4, 6, 8, 10].forEach((x) => {
        g.set(x, hy - 2, hairL);
        g.set(x + 1, hy - 3, hair);
        g.set(x, hy - 3, '#ffffff'); // spike sparkle
        g.set(x, hy - 1, hair);
      });
      g.set(3, hy + 2, hairD); // sideburn spikes
      g.set(12, hy + 2, hairD);
    }
  } else {
    // Bald: sleek shine highlight
    g.set(6, hy + 1, skinL);
    g.set(7, hy + 1, skinL);
    g.set(7, hy + 1, '#ffffff'); // specular point
    g.set(8, hy + 2, skinL);
  }

  // --- 5. FACE ACCESSORIES ---
  const face = parse(a.face);
  if (face && !back) {
    if (face.kind === 'glasses') {
      const c = face.color;
      if (side) {
        g.rect(3, hy + 3, 3, 2, c);
        g.set(4, hy + 3, '#ffffff'); // glass lens gleam
      } else {
        g.rect(5, hy + 2, 3, 3, c);
        g.rect(8, hy + 2, 3, 3, c);
        g.set(6, hy + 3, '#ffffff'); // specular glare
        g.set(9, hy + 3, '#ffffff');
        g.set(7, hy + 3, c); // nose bridge
        g.set(7, hy + 2, '#ffffff');
      }
    } else if (face.kind === 'shades') {
      const c = face.color;
      if (side) {
        g.rect(3, hy + 3, 4, 2, c);
        g.set(4, hy + 3, '#38bdf8'); // polarized mirror reflection
        g.set(5, hy + 4, '#818cf8');
      } else {
        g.rect(5, hy + 3, 6, 2, c);
        g.set(6, hy + 3, '#38bdf8'); // cool gradient reflection
        g.set(7, hy + 3, '#818cf8');
        g.set(9, hy + 3, '#38bdf8');
        g.set(10, hy + 3, '#818cf8');
      }
    } else if (face.kind === 'mustache') {
      const c = face.color;
      if (side) {
        g.rect(3, hy + 5, 3, 2, c);
        g.set(2, hy + 5, shade(c, 0.2)); // curled tip
      } else {
        g.rect(6, hy + 5, 4, 1, c);
        g.set(5, hy + 5, shade(c, 0.2)); // upward curled handlebar tip
        g.set(10, hy + 5, shade(c, 0.2));
        g.set(5, hy + 6, c);
        g.set(10, hy + 6, c);
      }
    } else if (face.kind === 'starlight_pin') {
      g.set(11, hy + 2, '#ffd700');
      g.set(12, hy + 2, '#fffbeb');
      g.set(11, hy + 1, '#ffffff');
      g.set(11, hy + 3, '#f59e0b');
    }
  }

  // --- 6. HATS & CROWNS ---
  const hat = parse(a.hat);
  if (hat) {
    const c = hat.color;
    const d = shade(c, -0.28);
    const l = shade(c, 0.3);
    if (hat.kind === 'beanie') {
      g.rect(4, hy - 3, 8, 4, c);
      g.rect(3, hy + 1, 10, 1, d); // ribbed knit cuff
      g.set(4, hy + 1, l);
      g.set(6, hy + 1, l);
      g.set(8, hy + 1, l);
      g.set(10, hy + 1, l);
      // Fluffy multi-tone pompom
      g.rect(7, hy - 4, 2, 1, l);
      g.set(7, hy - 5, '#ffffff');
    } else if (hat.kind === 'cap') {
      g.rect(4, hy - 2, 8, 3, c);
      g.rect(4, hy + 1, 8, 1, d);
      g.set(7, hy - 2, '#ffffff'); // top crown button
      if (side) {
        g.rect(1, hy + 1, 4, 1, d); // curved bill
        g.set(1, hy + 1, l);
      } else if (!back) {
        g.rect(4, hy + 1, 8, 1, d);
        g.set(7, hy, l); // front embroidered eyelet
      }
    } else if (hat.kind === 'chef') {
      g.rect(4, hy, 8, 2, '#ffffff');
      g.rect(3, hy - 5, 10, 5, '#ffffff');
      // Fluffy crisp vertical pleats
      g.set(4, hy - 4, '#e2e8f0');
      g.set(6, hy - 4, '#e2e8f0');
      g.set(8, hy - 4, '#e2e8f0');
      g.set(10, hy - 4, '#e2e8f0');
      g.rect(5, hy - 6, 6, 1, '#ffffff'); // billowing top
    } else if (hat.kind === 'cone') {
      g.rect(3, hy + 1, 10, 1, '#c2410c'); // sturdy rubber base
      g.rect(4, hy - 1, 8, 2, c);
      g.rect(5, hy - 3, 6, 2, '#ffffff'); // reflective white safety band
      g.rect(6, hy - 5, 4, 2, c);
      g.set(7, hy - 4, '#ffffff'); // reflective sheen
      g.set(7, hy - 6, '#ffd700'); // golden star top
      g.set(8, hy - 6, '#ffd700');
    } else if (hat.kind === 'crown') {
      // Imperial golden crown with 5 peaks & precious gemstones
      g.rect(4, hy - 2, 8, 3, '#f59e0b');
      g.rect(4, hy - 1, 8, 2, '#f5c542');
      [4, 6, 7, 9, 11].forEach((x) => g.set(x, hy - 3, '#f5c542'));
      [4, 7, 11].forEach((x) => g.set(x, hy - 4, '#fef08a')); // crown finial points
      // Inset precious jewels
      g.set(5, hy - 1, '#ef4444'); // ruby
      g.set(5, hy - 2, '#ffffff'); // ruby glint
      g.set(8, hy - 1, '#3b82f6'); // sapphire
      g.set(8, hy - 2, '#ffffff'); // sapphire glint
      g.set(10, hy - 1, '#10b981'); // emerald
      g.rect(4, hy, 8, 1, '#b45309'); // base shadow
    } else if (hat.kind === 'diamond_crown') {
      // Sovereign Brilliant-Cut Diamond Crown
      g.rect(4, hy - 2, 8, 3, '#cbd5e1');
      g.rect(4, hy - 1, 8, 2, '#f8fafc');
      [4, 6, 7, 9, 11].forEach((x) => g.set(x, hy - 3, '#f8fafc'));
      g.set(7, hy - 4, '#ffffff'); // high diamond spire
      g.set(7, hy - 3, '#67e8f9'); // cyan diamond
      g.set(5, hy - 1, '#38bdf8');
      g.set(9, hy - 1, '#38bdf8');
      g.rect(4, hy, 8, 1, '#64748b');
    }
  }

  // --- 5. HELD FISH ON HANDS (with dynamic pixel size scaling) ---
  if (a.heldFish) {
    const held = a.heldFish;
    const fishGrid = drawFish(held.speciesId);
    const cm = held.sizeCm;

    // Calculate dynamic handheld pixel dimensions
    let targetW = 12;
    let targetH = 6;
    if (cm < 35) {
      targetW = 7;
      targetH = 4;
    } else if (cm < 80) {
      targetW = 10;
      targetH = 5;
    } else if (cm < 180) {
      targetW = 13;
      targetH = 7;
    } else if (cm < 450) {
      targetW = 15;
      targetH = 8;
    } else {
      // Colossal / Whale / Kraken / Leviathan
      targetW = 16;
      targetH = 10;
    }

    if (!back) {
      if (side) {
        // Facing side (profile): fish held projecting forward
        const ox = 0;
        const oy = 15 + bodyBob;
        const sideW = Math.min(targetW, 11);
        for (let dy = 0; dy < targetH; dy++) {
          for (let dx = 0; dx < sideW; dx++) {
            const srcX = Math.floor((dx / sideW) * fishGrid.w);
            const srcY = Math.floor((dy / targetH) * fishGrid.h);
            const col = fishGrid.get(srcX, srcY);
            if (col && col !== INK) g.set(ox + dx, oy + dy, col);
          }
        }
        // Hands holding fish from back
        g.rect(sideW - 1, oy + Math.floor(targetH / 2), 2, 2, skin);
      } else {
        // Facing front (camera): fish held across the chest/torso
        const ox = Math.floor((AV_W - targetW) / 2);
        const oy = 15 + bodyBob;

        for (let dy = 0; dy < targetH; dy++) {
          for (let dx = 0; dx < targetW; dx++) {
            const srcX = Math.floor((dx / targetW) * fishGrid.w);
            const srcY = Math.floor((dy / targetH) * fishGrid.h);
            const col = fishGrid.get(srcX, srcY);
            if (col && col !== INK) g.set(ox + dx, oy + dy, col);
          }
        }

        // Two hands clasping the fish firmly
        const handY = oy + targetH - 2;
        g.rect(Math.max(1, ox + 1), handY, 2, 2, skin);
        g.rect(Math.min(AV_W - 3, ox + targetW - 3), handY, 2, 2, skin);
        // Sleeves / arms forward
        g.set(Math.max(1, ox + 1), handY - 1, topColor);
        g.set(Math.min(AV_W - 3, ox + targetW - 3), handY - 1, topColor);

        // Rare / Epic / Legendary prestige sparkles around held fish
        const sp = getSpeciesData(held.speciesId);
        if (sp?.rarity === 'sovereign' || sp?.rarity === 'defiant') {
          const color = sp.rarity === 'sovereign' ? '#67e8f9' : '#fb7185';
          g.set(Math.max(0, ox - 1), oy - 1, color);
          g.set(Math.min(AV_W - 1, ox + targetW), oy - 1, '#ffffff');
          g.set(Math.floor(AV_W / 2), oy - 2, color);
        } else if (sp?.rarity === 'legendary') {
          g.set(Math.max(0, ox - 1), oy - 1, '#fbbf24');
          g.set(Math.min(AV_W - 1, ox + targetW), oy - 1, '#ffffff');
          g.set(Math.floor(AV_W / 2), oy - 2, '#fef08a');
        } else if (sp?.rarity === 'epic') {
          g.set(Math.max(0, ox - 1), oy - 1, '#c084fc');
          g.set(Math.min(AV_W - 1, ox + targetW), oy, '#38bdf8');
        } else if (sp?.rarity === 'rare') {
          g.set(Math.max(0, ox - 1), oy - 1, '#38bdf8');
        }
      }
    } else {
      // Facing back (from behind): fish ends stick out left and right behind player
      const ox = Math.floor((AV_W - targetW) / 2);
      const oy = 15 + bodyBob;
      for (let dy = 0; dy < targetH; dy++) {
        for (let dx = 0; dx < targetW; dx++) {
          const px = ox + dx;
          // Only show pixels sticking out beyond the back (x < 5 or x > 10)
          if (px < 5 || px > 10) {
            const srcX = Math.floor((dx / targetW) * fishGrid.w);
            const srcY = Math.floor((dy / targetH) * fishGrid.h);
            const col = fishGrid.get(srcX, srcY);
            if (col && col !== INK) g.set(px, oy + dy, col);
          }
        }
      }
    }
  }

  // --- 8. FISHING ROD (slung across back when equipped) ---
  if (a.rod && !a.heldFish && !a.isFishing) {
    const rodColors: Record<string, string> = {
      rod_twig: '#854d0e',
      rod_wooden: '#b45309',
      rod_fiberglass: '#0284c7',
      rod_pro_carbon: '#1e293b',
      rod_golden_legend: '#f59e0b',
      rod_abyssal: '#7c3aed',
    };
    const rodId = normalizeRodId(a.rod);
    const rc = rodColors[rodId] ?? '#854d0e';
    if (back) {
      g.set(3, 20 + bodyBob, '#1e293b'); // grip
      g.set(4, 18 + bodyBob, rc);
      g.set(6, 15 + bodyBob, rc);
      g.set(8, 12 + bodyBob, rc);
      g.set(10, 9 + bodyBob, rc);
      g.set(12, 6 + bodyBob, rc);
      g.set(13, 3 + bodyBob, rc); // tip
      g.set(14, 5 + bodyBob, '#ef4444'); // bobber
      // Glowing tip accents for rare / epic / legendary rods
      if (rodId === 'rod_golden_legend') {
        g.set(13, 2 + bodyBob, '#fef08a');
        g.set(14, 1 + bodyBob, '#ffffff');
      } else if (rodId === 'rod_abyssal') {
        g.set(13, 2 + bodyBob, '#06b6d4');
        g.set(14, 1 + bodyBob, '#c084fc');
      } else if (rodId === 'rod_pro_carbon') {
        g.set(13, 2 + bodyBob, '#34d399');
      } else if (rodId === 'rod_fiberglass') {
        g.set(13, 2 + bodyBob, '#38bdf8');
      }
    } else if (side) {
      g.set(8, 18 + bodyBob, '#1e293b');
      g.set(9, 15 + bodyBob, rc);
      g.set(11, 11 + bodyBob, rc);
      g.set(12, 7 + bodyBob, rc);
      g.set(13, 3 + bodyBob, rc);
      g.set(14, 5 + bodyBob, '#ef4444');
      if (rodId === 'rod_golden_legend') {
        g.set(13, 2 + bodyBob, '#fef08a');
      } else if (rodId === 'rod_abyssal') {
        g.set(13, 2 + bodyBob, '#06b6d4');
      } else if (rodId === 'rod_pro_carbon') {
        g.set(13, 2 + bodyBob, '#34d399');
      } else if (rodId === 'rod_fiberglass') {
        g.set(13, 2 + bodyBob, '#38bdf8');
      }
    } else {
      // Front view: tip peeking over right shoulder
      g.set(11, 13 + bodyBob, rc);
      g.set(12, 9 + bodyBob, rc);
      g.set(13, 5 + bodyBob, rc);
      g.set(14, 2 + bodyBob, rc);
      g.set(14, 5 + bodyBob, '#ef4444');
      if (rodId === 'rod_golden_legend') {
        g.set(14, 1 + bodyBob, '#fef08a');
      } else if (rodId === 'rod_abyssal') {
        g.set(14, 1 + bodyBob, '#06b6d4');
      } else if (rodId === 'rod_pro_carbon') {
        g.set(14, 1 + bodyBob, '#34d399');
      } else if (rodId === 'rod_fiberglass') {
        g.set(14, 1 + bodyBob, '#38bdf8');
      }
    }
  }

  // --- 9. MARTIAL SWORD (Vác chéo lưng hiệp khách như trong phim) ---
  if (a.sword && !a.heldFish && !a.isFishing) {
    const swordId = normalizeSwordId(a.sword);
    const pal = SWORD_PALETTES[swordId] ?? SWORD_PALETTES.sword_training!;

    if (back) {
      // Nhìn từ sau lưng: Bao kiếm vắt chéo từ vai phải xuống hông trái, dây đai da chéo lưng
      g.set(5, 13 + bodyBob, pal.strap);
      g.set(6, 14 + bodyBob, pal.strap);
      g.set(7, 15 + bodyBob, pal.strapBuckle);
      g.set(8, 16 + bodyBob, pal.strap);
      g.set(9, 17 + bodyBob, pal.strap);

      // Thân bao kiếm chéo lưng góc 45 độ
      g.set(10, 8 + bodyBob, pal.scabbardTrim);
      g.set(9, 9 + bodyBob, pal.scabbard);
      g.set(9, 10 + bodyBob, pal.scabbard);
      g.set(8, 11 + bodyBob, pal.scabbard);
      g.set(8, 12 + bodyBob, pal.scabbard);
      g.set(7, 13 + bodyBob, pal.scabbardTrim);
      g.set(7, 14 + bodyBob, pal.scabbard);
      g.set(6, 15 + bodyBob, pal.scabbard);
      g.set(6, 16 + bodyBob, pal.scabbard);
      g.set(5, 17 + bodyBob, pal.scabbard);
      g.set(5, 18 + bodyBob, pal.scabbardTrim);
      g.set(4, 19 + bodyBob, pal.scabbard);
      g.set(4, 20 + bodyBob, pal.scabbard);
      // Chóp bao kiếm kim loại
      g.set(3, 21 + bodyBob, pal.scabbardTrim);
      g.set(3, 22 + bodyBob, pal.guard);

      // Đốc kiếm (crossguard)
      g.set(10, 7 + bodyBob, pal.guard);
      g.set(11, 7 + bodyBob, pal.guard);
      g.set(11, 6 + bodyBob, pal.guard);
      g.set(12, 6 + bodyBob, pal.guard);

      // Chuôi kiếm (grip) vươn cao chéo qua vai phải
      g.set(11, 5 + bodyBob, pal.hilt);
      g.set(12, 4 + bodyBob, pal.hilt);
      g.set(12, 3 + bodyBob, pal.hilt);

      // Núm chuôi kiếm (pommel)
      g.set(13, 2 + bodyBob, pal.pommel);
      g.set(13, 1 + bodyBob, pal.pommel);

      // Dây tua rua kiếm lụa đỏ / ngọc bội rủ xuống
      g.set(14, 2 + bodyBob, pal.tassel);
      g.set(14, 3 + bodyBob, pal.tassel);
      g.set(14, 4 + bodyBob, pal.tassel);

      // Hiệu ứng ánh sáng huyền ảo cho kiếm xịn
      if (pal.glow) {
        g.set(12, 2 + bodyBob, pal.glow);
        g.set(14, 1 + bodyBob, pal.glow);
      }
      if (pal.sparkle) {
        g.set(13, 0 + bodyBob, pal.sparkle);
        g.set(2, 22 + bodyBob, pal.sparkle);
      }
    } else if (side) {
      // Nhìn nghiêng: Thân kiếm chéo sau lưng, dây đeo ôm mạn sườn
      g.set(7, 14 + bodyBob, pal.strap);
      g.set(6, 16 + bodyBob, pal.strapBuckle);
      g.set(6, 18 + bodyBob, pal.strap);

      // Bao kiếm chạy dọc nghiêng phía sau lưng
      g.set(11, 10 + bodyBob, pal.scabbardTrim);
      g.set(10, 12 + bodyBob, pal.scabbard);
      g.set(10, 14 + bodyBob, pal.scabbardTrim);
      g.set(9, 16 + bodyBob, pal.scabbard);
      g.set(9, 18 + bodyBob, pal.scabbard);
      g.set(8, 20 + bodyBob, pal.scabbard);
      g.set(8, 22 + bodyBob, pal.scabbardTrim);

      // Đốc kiếm & chuôi kiếm
      g.set(11, 8 + bodyBob, pal.guard);
      g.set(12, 7 + bodyBob, pal.guard);
      g.set(12, 5 + bodyBob, pal.hilt);
      g.set(13, 4 + bodyBob, pal.hilt);
      g.set(13, 2 + bodyBob, pal.pommel);

      // Tua kiếm bay theo bước chân
      g.set(14, 3 + bodyBob, pal.tassel);
      g.set(14, 4 + bodyBob, pal.tassel);

      if (pal.glow) {
        g.set(13, 1 + bodyBob, pal.glow);
      }
      if (pal.sparkle) {
        g.set(14, 2 + bodyBob, pal.sparkle);
      }
    } else {
      // Nhìn chính diện phía trước: Dây đai da vắt chéo ngực (như trong phim kiếm hiệp)
      g.set(4, 19 + bodyBob, pal.strap);
      g.set(5, 18 + bodyBob, pal.strap);
      g.set(6, 16 + bodyBob, pal.strap);
      g.set(7, 15 + bodyBob, pal.strapBuckle); // Khóa kim loại sáng bóng trước ngực
      g.set(8, 14 + bodyBob, pal.strap);
      g.set(9, 13 + bodyBob, pal.strap);
      g.set(10, 12 + bodyBob, pal.strap);

      // Chuôi kiếm và đốc kiếm vươn cao kiêu hãnh qua vai phải
      g.set(11, 7 + bodyBob, pal.guard);
      g.set(11, 6 + bodyBob, pal.guard);
      g.set(12, 5 + bodyBob, pal.hilt);
      g.set(12, 4 + bodyBob, pal.hilt);
      g.set(13, 3 + bodyBob, pal.hilt);
      g.set(13, 2 + bodyBob, pal.pommel);
      g.set(14, 1 + bodyBob, pal.pommel);

      // Dây tua rua kiếm đung đưa cạnh vai
      g.set(14, 2 + bodyBob, pal.tassel);
      g.set(14, 3 + bodyBob, pal.tassel);
      g.set(14, 4 + bodyBob, pal.tassel);

      // Chóp bao kiếm ló ra nhẹ bên hông trái
      g.set(3, 21 + bodyBob, pal.scabbard);
      g.set(3, 22 + bodyBob, pal.scabbardTrim);

      if (pal.glow) {
        g.set(13, 1 + bodyBob, pal.glow);
        g.set(12, 2 + bodyBob, pal.glow);
      }
      if (pal.sparkle) {
        g.set(14, 0 + bodyBob, pal.sparkle);
      }
    }
  }

  // --- 8. BACK WINGS & ACCESSORIES ---
  if (a.back) {
    const [backKind] = a.back.split(':');
    if (backKind === 'wings_angel') {
      const wingPts: [number, number][] = [
        [2, 10],
        [1, 11],
        [0, 12],
        [0, 13],
        [1, 14],
        [2, 15],
        [13, 10],
        [14, 11],
        [15, 12],
        [15, 13],
        [14, 14],
        [13, 15],
      ];
      wingPts.forEach(([wx, wy]) => {
        g.set(wx, wy + bodyBob, '#ffffff');
      });
      g.set(0, 11 + bodyBob, '#fde047');
      g.set(15, 11 + bodyBob, '#fde047');
      g.set(1, 10 + bodyBob, '#facc15');
      g.set(14, 10 + bodyBob, '#facc15');
    } else if (backKind === 'wings_fairy') {
      const wingPts: [number, number][] = [
        [2, 9],
        [1, 10],
        [0, 11],
        [1, 13],
        [2, 15],
        [13, 9],
        [14, 10],
        [15, 11],
        [14, 13],
        [13, 15],
      ];
      wingPts.forEach(([wx, wy]) => {
        g.set(wx, wy + bodyBob, '#67e8f9');
      });
      g.set(1, 11 + bodyBob, '#f472b6');
      g.set(14, 11 + bodyBob, '#f472b6');
      g.set(0, 10 + bodyBob, '#ffffff');
      g.set(15, 10 + bodyBob, '#ffffff');
    } else if (backKind === 'wings_cyber') {
      const wingPts: [number, number][] = [
        [2, 10],
        [0, 11],
        [1, 12],
        [0, 14],
        [2, 16],
        [13, 10],
        [15, 11],
        [14, 12],
        [15, 14],
        [13, 16],
      ];
      wingPts.forEach(([wx, wy]) => {
        g.set(wx, wy + bodyBob, '#06b6d4');
      });
      g.set(0, 11 + bodyBob, '#22d3ee');
      g.set(15, 11 + bodyBob, '#22d3ee');
      g.set(1, 16 + bodyBob, '#f97316');
      g.set(14, 16 + bodyBob, '#f97316');
    } else if (backKind === 'wings_demon') {
      const wingPts: [number, number][] = [
        [2, 9],
        [1, 10],
        [0, 12],
        [1, 14],
        [0, 16],
        [13, 9],
        [14, 10],
        [15, 12],
        [14, 14],
        [15, 16],
      ];
      wingPts.forEach(([wx, wy]) => {
        g.set(wx, wy + bodyBob, '#3b0764');
      });
      g.set(1, 9 + bodyBob, '#7c3aed');
      g.set(14, 9 + bodyBob, '#7c3aed');
      g.set(0, 12 + bodyBob, '#dc2626');
      g.set(15, 12 + bodyBob, '#dc2626');
    } else if (backKind === 'sparkle_aura') {
      g.set(1, 9 + bodyBob, '#ffffff');
      g.set(14, 8 + bodyBob, '#ffd700');
      g.set(2, 19 + bodyBob, '#38bdf8');
      g.set(13, 21 + bodyBob, '#f472b6');
      g.set(8, 2 + bodyBob, '#ffffff');
    } else if (backKind === 'magic_orb') {
      g.set(2, 12 + bodyBob, '#a855f7');
      g.set(1, 12 + bodyBob, '#7c3aed');
      g.set(2, 11 + bodyBob, '#c084fc');
      g.set(1, 11 + bodyBob, '#ffffff');
      g.set(13, 10 + bodyBob, '#bef264');
      g.set(14, 11 + bodyBob, '#fef08a');
    }
  }

  g.outline(INK);
  return g;
}

import { drawChibiAvatar, chibiAvatarPortrait } from './chibi';

export function appearanceKey(a: Appearance): string {
  return [
    a.skin,
    a.hairStyle,
    a.hairColor,
    a.baseTop,
    a.hat ?? '',
    a.top ?? '',
    a.face ?? '',
    a.back ?? '',
    a.rod ?? '',
    a.sword ?? '',
    a.heldFish ? `${a.heldFish.speciesId}:${a.heldFish.sizeCm}` : '',
    a.isFishing ? 'fishing' : '',
  ].join('|');
}

/** Sprite sheet canvas: rows = dir (down, left, right, up), cols = frame (idle, stepA, stepB). */
export function avatarSheet(
  a: Appearance,
  scale = AV_SCALE,
  options: { showWings?: boolean } = {},
): HTMLCanvasElement {
  const { showWings = true } = options;
  const c = document.createElement('canvas');
  const fw = scale === AV_SCALE ? AV_FRAME_W : Math.round(AV_FRAME_W * (scale / AV_SCALE));
  const fh = scale === AV_SCALE ? AV_FRAME_H : Math.round(AV_FRAME_H * (scale / AV_SCALE));
  c.width = fw * 3;
  c.height = fh * 4;
  const ctx = c.getContext('2d')!;

  for (let d = 0 as Dir; d < 4; d = (d + 1) as Dir) {
    for (let f = 0; f < 3; f++) {
      ctx.save();
      // Clip to frame boundary so NO wing/glow pixels bleed into neighboring animation frames
      ctx.beginPath();
      ctx.rect(f * fw, d * fh, fw, fh);
      ctx.clip();

      const cx = f * fw + fw / 2;
      const cy = d * fh + 31;
      const chibiScale = (fh / 56) * 0.42;

      drawChibiAvatar(ctx, a, {
        cx,
        cy,
        scale: chibiScale,
        dir: d,
        frame: f as 0 | 1 | 2,
        showFish: false,
        showWings,
      });
      ctx.restore();
    }
  }
  return c;
}

/** Data URL portrait of an avatar, for UI surfaces. */
export function avatarPortrait(a: Appearance, scale = 4): string {
  const size = Math.max(64, scale * 24);
  return chibiAvatarPortrait(a, size);
}
