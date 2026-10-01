import { shade } from './pixel';
import { FISH } from '@cozy/game-data';

type Shape =
  | 'fish'
  | 'slender'
  | 'round'
  | 'shark'
  | 'dolphin'
  | 'whale'
  | 'eel'
  | 'ray'
  | 'squid'
  | 'octopus'
  | 'seahorse'
  | 'axolotl'
  | 'crayfish'
  | 'boot'
  | 'duck'
  | 'dragon';
interface FishDesign {
  shape: Shape;
  back: string;
  side: string;
  belly: string;
  fin: string;
  pattern?: 'scales' | 'stripes' | 'spots' | 'koi' | 'orca' | 'circuit';
  detail?:
    | 'tie'
    | 'paper'
    | 'monocle'
    | 'lightning'
    | 'lantern'
    | 'sword'
    | 'hammer'
    | 'horn'
    | 'crown'
    | 'coin'
    | 'teeth'
    | 'barbels'
    | 'wings'
    | 'spines';
}

const design = (
  shape: Shape,
  back: string,
  side: string,
  belly: string,
  fin: string,
  pattern?: FishDesign['pattern'],
  detail?: FishDesign['detail'],
): FishDesign => ({ shape, back, side, belly, fin, pattern, detail });

/** Every collectible has its own anatomy, palette and identifying detail. */
export const FISH_DESIGNS: Record<string, FishDesign> = {
  soggy_boot: design('boot', '#422619', '#855331', '#bc9867', '#365f4a'),
  anxious_minnow: design('slender', '#245968', '#63b4b5', '#d7eddf', '#86c2c6', 'scales'),
  office_carp: design('fish', '#994322', '#e58b48', '#f9e0ab', '#bf6236', 'scales', 'tie'),
  clownfish: design('fish', '#a94722', '#ee8b32', '#ffcc74', '#b65029', 'stripes'),
  seahorse: design('seahorse', '#966029', '#d5a252', '#f5d596', '#cd9752', 'scales'),
  tilapia: design('fish', '#374e45', '#8a9e85', '#e5e3c5', '#748572', 'stripes'),
  chub: design('slender', '#355958', '#9fbbaf', '#f2edd3', '#b9a773', 'scales'),
  guppy_rainbow: design('fish', '#3c4987', '#87b6d2', '#ecddc2', '#d87cb2', 'spots'),
  crawfish: design('crayfish', '#773726', '#c35535', '#e9a778', '#af412e'),
  pufferfish: design('round', '#776631', '#bca263', '#f2e6c2', '#a6894f', 'spots', 'spines'),
  flounder: design('round', '#594e3c', '#9a8763', '#d1bd8d', '#7c6950', 'spots'),
  blue_tang: design('fish', '#133260', '#2d75ba', '#7fb9df', '#edd264', 'stripes'),
  flying_fish: design('slender', '#24495c', '#7baabd', '#dce4de', '#9cbcc6', 'scales', 'wings'),
  bass_largemouth: design('fish', '#314f3d', '#8aab65', '#ece8c0', '#687f56', 'spots'),
  flying_squid: design('squid', '#7f4351', '#cd8d91', '#f2d9c7', '#b8757d'),
  disco_trout: design('fish', '#40536e', '#82a7bc', '#e6d4c9', '#8e6b9c', 'spots'),
  tax_salmon: design('slender', '#415b65', '#8aa9ad', '#eac5ab', '#7f91a0', 'scales', 'paper'),
  golden_koi: design('fish', '#966528', '#e7bc62', '#fbedbd', '#e0b36f', 'koi'),
  betta_fighting: design('fish', '#702b48', '#c35978', '#edabb0', '#a82951', 'scales', 'wings'),
  piranha: design('round', '#3e5258', '#8faaaa', '#cf856f', '#b45944', 'scales', 'teeth'),
  snakehead: design('slender', '#344a3c', '#839670', '#d9d7b2', '#6a795d', 'spots'),
  lionfish: design('fish', '#6a372d', '#ca9274', '#f3d4af', '#9a5842', 'stripes', 'spines'),
  barracuda: design('slender', '#345a6b', '#9ebdc5', '#eaf1e8', '#597d8c', 'stripes', 'teeth'),
  anglerfish: design('round', '#253540', '#546d71', '#a1aea0', '#405861', 'spots', 'lantern'),
  moray_eel: design('eel', '#4c603d', '#899554', '#d6cf92', '#6f7847', 'spots', 'teeth'),
  pink_dolphin: design('dolphin', '#a76683', '#d6a0b1', '#f7d7d4', '#b88197'),
  dolphin_playful: design('dolphin', '#35576e', '#819db1', '#e0e9e4', '#4f758c'),
  hammerhead_shark: design('shark', '#355969', '#88a5ae', '#dde5df', '#5b8192', undefined, 'hammer'),
  swordfish: design('slender', '#112d4e', '#3b83a8', '#dce3dd', '#244e75', 'scales', 'sword'),
  tuna_giant: design('fish', '#193c64', '#597f9c', '#e2e6de', '#dfbc51', 'scales'),
  philosopher_eel: design('eel', '#5c4260', '#a4869f', '#e5d4cb', '#806680', undefined, 'monocle'),
  electric_catfish: design('fish', '#665522', '#bdab51', '#efe3ad', '#998947', 'scales', 'lightning'),
  electric_eel: design('eel', '#254d5e', '#75a3a4', '#d3dabc', '#487789', undefined, 'lightning'),
  arowana_dragon: design('slender', '#80552a', '#dab96b', '#f7e8b4', '#c9a05b', 'scales', 'barbels'),
  sturgeon: design('slender', '#465d60', '#91a7a1', '#e0ddc7', '#6b8384', 'scales', 'barbels'),
  axolotl: design('axolotl', '#be8698', '#edbbc8', '#ffe9df', '#d7658a'),
  catfish_giant: design('fish', '#344c57', '#8599a0', '#d5ddd0', '#567581', undefined, 'barbels'),
  alligator_gar: design('slender', '#46573c', '#a0a578', '#e0ddb2', '#71805a', 'scales', 'teeth'),
  sunfish_mola: design('round', '#53696b', '#a0b2af', '#dfe2d6', '#6e878a', 'spots'),
  cyber_koi: design('fish', '#273447', '#557c92', '#c8dade', '#669dab', 'circuit'),
  phoenix_tetra: design('fish', '#8d352b', '#e8853e', '#f7d679', '#d85935', 'scales', 'wings'),
  ghost_shark: design('shark', '#426577', '#a6c7cf', '#edf2e6', '#83b8bd'),
  beluga_whale: design('whale', '#a2b7b6', '#d6e4df', '#fff8e5', '#adcbc8'),
  narwhal: design('whale', '#435b6c', '#9aafba', '#ece8dc', '#698995', 'spots', 'horn'),
  killer_whale: design('whale', '#142d3e', '#293e4c', '#f7f5df', '#1d3547', 'orca'),
  humpback_whale: design('whale', '#294553', '#64818a', '#b6c6c4', '#436671', 'spots'),
  blue_whale: design('whale', '#315975', '#789dad', '#cddad5', '#4b7990', 'spots'),
  great_white_shark: design('shark', '#456678', '#9fb0b3', '#f2eee0', '#6b8a9c', undefined, 'teeth'),
  manta_ray: design('ray', '#213d50', '#52798d', '#b8d2d3', '#35586b', 'spots'),
  giant_squid: design('squid', '#783a4b', '#b77380', '#eecab6', '#9d5466'),
  crypto_whale: design('whale', '#244a63', '#588ca5', '#c5d8d9', '#386c83', undefined, 'coin'),
  abyssal_kraken: design('octopus', '#2d2b4f', '#675589', '#afa1bf', '#433761', 'spots'),
  golden_dragon_fish: design('dragon', '#81572a', '#dbb868', '#fcf0bf', '#b9914a', 'scales', 'crown'),
  rubber_duck_leviathan: design('duck', '#b67d24', '#f0c65a', '#fff0a7', '#d9a040', undefined, 'crown'),
  landlord_pike: design('slender', '#426344', '#8eac70', '#e4dfaf', '#728958', 'spots', 'crown'),
};

// Variants inherit a safe anatomical fallback while their dedicated bitmaps are pending.
for (const species of FISH) {
  if (species.variantOf && FISH_DESIGNS[species.variantOf]) {
    FISH_DESIGNS[species.id] = { ...FISH_DESIGNS[species.variantOf]! };
  }
}

/** Smooth high-resolution illustration on transparent canvas, painted at a 600 × 360 master size. */
export function paintFishIllustration(
  speciesId: string,
  width: number,
  height: number,
  silhouette = false,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d')!;
  const d = FISH_DESIGNS[speciesId] ?? FISH_DESIGNS.anxious_minnow!;
  const scale = Math.min(canvas.width / 600, canvas.height / 360);
  ctx.translate((canvas.width - 600 * scale) / 2, (canvas.height - 360 * scale) / 2);
  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const gradient = (x1: number, y1: number, x2: number, y2: number, colors: string[]) => {
    const g = ctx.createLinearGradient(x1, y1, x2, y2);
    colors.forEach((color, i) => g.addColorStop(i / (colors.length - 1), color));
    return g;
  };
  const path = (outline: string, fill: string | CanvasGradient, stroke = true) => {
    const p = new Path2D(outline);
    ctx.fillStyle = fill;
    ctx.fill(p);
    if (stroke) {
      ctx.strokeStyle = shade(d.back, -0.3);
      ctx.lineWidth = 2;
      ctx.stroke(p);
    }
    return p;
  };
  const line = (outline: string, color: string, thickness = 2) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.stroke(new Path2D(outline));
  };
  const ellipse = (x: number, y: number, rx: number, ry: number, color: string | CanvasGradient) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  };
  const finFill = gradient(0, 75, 0, 290, [shade(d.fin, 0.4), d.fin, shade(d.fin, -0.35)]);
  const bodyFill = gradient(0, 110, 0, 258, [d.back, d.side, d.belly, shade(d.side, -0.15)]);
  let outline = '';
  let eye = { x: 449, y: 174, r: 9 };
  let body: Path2D | undefined;
  const fishShapes: Shape[] = ['fish', 'slender', 'round', 'shark', 'dolphin', 'whale', 'dragon'];

  if (fishShapes.includes(d.shape)) {
    const slender = d.shape === 'slender';
    const round = d.shape === 'round';
    const whale = d.shape === 'whale';
    const dolphin = d.shape === 'dolphin';
    const shark = d.shape === 'shark';
    const tail =
      speciesId === 'betta_fighting' || speciesId === 'guppy_rainbow'
        ? 'M170 183 C100 135 106 64 47 88 C22 156 25 218 53 288 C111 265 110 213 170 195 Z'
        : whale || dolphin
          ? 'M170 185 C105 139 65 115 44 141 C79 163 85 176 110 187 C80 202 59 214 42 240 C99 245 142 210 170 196 Z'
          : 'M176 185 C121 170 99 120 57 87 C66 129 91 162 102 190 C88 215 65 250 57 284 C115 247 121 211 177 194 Z';
    path(tail, finFill);
    for (let i = 0; i < 7; i++)
      line(
        'M151 190 Q105 ' + (142 + i * 15) + ' ' + (64 + Math.abs(i - 3) * 3) + ' ' + (107 + i * 25),
        shade(d.fin, 0.35),
        1,
      );
    if (speciesId === 'beluga_whale' || speciesId === 'narwhal') {
      path('M235 146 Q298 124 367 144 L356 152 Z', finFill);
    } else if (shark || dolphin || whale) {
      path('M267 140 Q296 110 313 65 Q335 103 355 145 Z', finFill);
    } else {
      const finTop = speciesId === 'swordfish' ? 58 : speciesId === 'sunfish_mola' ? 45 : 82;
      path('M202 151 Q258 113 305 ' + finTop + ' Q348 105 379 148 Z', finFill);
      for (let i = 0; i < 9; i++)
        line(
          'M' + (219 + i * 17) + ' 149 Q' + (250 + i * 11) + ' 121 ' + (292 + i * 7) + ' ' + (finTop + i * 6),
          shade(d.fin, 0.45),
          1,
        );
    }
    path('M252 223 Q301 266 329 286 Q328 253 347 219 Z', finFill);
    if (speciesId === 'sunfish_mola') {
      outline =
        'M217 188 C211 101 271 75 344 108 Q416 115 452 185 Q436 253 340 262 C268 290 214 249 217 188 Z';
      eye = { x: 421, y: 170, r: 8 };
      path('M283 114 Q294 55 336 32 Q338 88 360 125 Z', finFill);
      path('M284 249 Q310 305 344 328 Q344 284 371 249 Z', finFill);
    } else if (round) {
      outline =
        'M147 186 C176 113 252 77 340 100 C421 116 465 162 474 189 C467 233 429 279 349 283 C253 294 173 242 147 186 Z';
      eye = { x: 428, y: 171, r: 11 };
    } else if (dolphin) {
      outline =
        'M143 184 C211 144 287 116 358 125 C398 126 427 149 445 169 Q466 170 504 183 Q517 192 499 198 L453 202 C406 235 365 241 304 222 C236 209 197 196 143 197 Z';
      eye = { x: 432, y: 168, r: 7 };
    } else if (whale) {
      outline =
        'M143 178 C240 126 372 110 436 143 Q497 159 508 199 Q502 238 442 248 C325 268 231 225 143 199 Z';
      eye = { x: 458, y: 181, r: 7 };
    } else if (shark) {
      outline =
        'M139 183 C250 127 368 128 425 158 Q458 166 506 186 Q464 212 424 223 C322 242 251 211 139 196 Z';
      eye = { x: 452, y: 178, r: 7 };
    } else if (slender || d.shape === 'dragon') {
      outline =
        'M140 181 C229 134 371 133 449 163 Q482 174 494 187 Q479 207 447 219 C341 242 226 204 140 195 Z';
      eye = { x: 455, y: 180, r: 8 };
    } else {
      outline =
        'M153 182 C208 122 286 111 371 128 Q461 146 486 186 Q454 230 369 248 C274 260 212 222 153 196 Z';
    }
    body = path(outline, bodyFill);
    ctx.save();
    ctx.clip(body);
    path(
      'M136 197 Q276 218 402 204 Q463 201 501 185 L518 284 L136 294 Z',
      gradient(0, 197, 0, 258, [d.belly, shade(d.belly, -0.15)]),
      false,
    );
    if (d.pattern === 'scales' || d.shape === 'dragon') {
      ctx.globalAlpha = 0.24;
      for (let row = 0; row < 6; row++)
        for (let col = 0; col < 20; col++) {
          const x = 175 + col * 13 + (row % 2) * 6;
          const y = 144 + row * 13;
          line('M' + x + ' ' + y + ' q10 7 0 14', d.belly, 1.2);
        }
      ctx.globalAlpha = 1;
    } else if (d.pattern === 'spots') {
      for (let i = 0; i < 45; i++) {
        const x = 176 + ((i * 79) % 255);
        const y = 136 + ((i * 43) % 106);
        ellipse(x, y, 2 + (i % 3), 2, shade(d.back, 0.08));
      }
    } else if (d.pattern === 'stripes') {
      for (let i = 0; i < (speciesId === 'clownfish' ? 3 : 8); i++) {
        const x = speciesId === 'clownfish' ? 219 + i * 76 : 192 + i * 31;
        line(
          'M' + x + ' 110 Q' + (x - 20) + ' 179 ' + x + ' 268',
          speciesId === 'clownfish' ? '#f5efdf' : shade(d.back, 0.1),
          speciesId === 'clownfish' ? 27 : 8,
        );
      }
    } else if (d.pattern === 'koi') {
      path('M189 153 Q235 112 262 150 Q247 182 227 180 Z', '#fff4da', false);
      path('M311 137 Q344 151 332 180 Q300 194 286 162 Z', '#c96637', false);
      path('M374 213 Q418 184 438 210 L439 249 L358 254 Z', '#f9eac1', false);
    } else if (d.pattern === 'orca') {
      ellipse(421, 162, 25, 13, '#f4f1df');
      path('M295 222 Q346 185 380 210 L421 250 L291 273 Z', '#f4f1df', false);
    } else if (d.pattern === 'circuit') {
      for (let i = 0; i < 4; i++) line('M' + (211 + i * 44) + ' 143 v30 h24 v31 h-12', '#7ee5dd', 2);
    }
    // Narrow light bands, subtle mottling and cool rim give the body volume.
    ctx.globalAlpha = 0.22;
    for (let i = 0; i < 125; i++)
      ellipse(155 + ((i * 61) % 315), 126 + ((i * 47) % 113), 1, 0.8, i % 2 ? d.belly : d.back);
    line('M177 171 Q308 123 451 167', '#e8fbff', 5);
    ctx.globalAlpha = 1;
    ctx.restore();
    path('M365 182 Q304 200 302 230 Q333 220 383 191 Z', finFill);
    for (let i = 0; i < 5; i++)
      line(
        'M375 189 Q' + (342 - i * 5) + ' 208 ' + (310 + i * 7) + ' ' + (225 - i * 4),
        shade(d.fin, 0.3),
        1,
      );
    line('M410 162 Q387 185 409 214', shade(d.back, -0.1), 2);
    line('M470 192 Q456 200 439 200', shade(d.back, -0.25), 2);
    if (speciesId === 'humpback_whale') {
      path('M379 191 Q294 254 265 276 Q308 281 346 266 Q385 238 406 204 Z', finFill);
      for (let i = 0; i < 7; i++) line('M' + (352 + i * 13) + ' 218 q-12 22 -34 29', '#a5bdbc', 1);
    }
    if (speciesId === 'blue_whale' || speciesId === 'beluga_whale') {
      for (let i = 0; i < 6; i++) line('M' + (361 + i * 17) + ' 217 q-16 23 -53 27', shade(d.back, 0.1), 1.2);
    }
    if (speciesId === 'sturgeon') {
      for (let i = 0; i < 12; i++) {
        const x = 188 + i * 20;
        path('M' + x + ' 171 l9 -7 l10 7 l-9 7 Z', shade(d.belly, -0.15), false);
      }
    }
    if (speciesId === 'tuna_giant') {
      for (let i = 0; i < 5; i++) {
        path('M' + (183 + i * 14) + ' 158 l7 -12 l7 8 Z', '#d6b750', false);
        path('M' + (183 + i * 14) + ' 213 l7 12 l7 -8 Z', '#d6b750', false);
      }
    }
    if (speciesId === 'alligator_gar') {
      path('M455 168 Q498 171 553 185 Q506 201 467 207 Z', bodyFill);
      line('M491 190 L548 185', shade(d.back, -0.25), 2);
      for (let i = 0; i < 7; i++) path('M' + (505 + i * 6) + ' 190 l3 0 l-2 4 Z', '#eee8ce', false);
    }
    if (speciesId === 'golden_dragon_fish') {
      path('M400 162 Q429 101 457 115 Q445 143 455 164 Z', finFill);
      line('M484 205 Q532 215 518 260 M470 211 Q471 245 493 262', '#dfbe78', 4);
    }
    if (shark)
      for (let i = 0; i < 4; i++) line('M' + (387 - i * 9) + ' 174 q-8 10 0 25', shade(d.back, -0.25), 2);
  } else if (d.shape === 'eel') {
    outline =
      'M47 240 C166 119 197 264 308 203 C349 181 369 113 437 117 C480 118 507 151 514 171 C496 192 468 181 449 169 C404 142 395 209 342 240 C219 326 178 189 47 252 Z';
    path(
      'M49 230 C167 107 223 254 309 187 C366 145 368 84 439 97 Q486 101 501 147 L451 148 C392 125 402 201 346 247 L287 220 C174 258 164 139 49 245 Z',
      finFill,
    );
    body = path(outline, gradient(0, 114, 0, 282, [d.back, d.side, d.belly]));
    eye = { x: 481, y: 144, r: 8 };
    if (d.pattern === 'spots')
      for (let i = 0; i < 30; i++)
        ellipse(210 + ((i * 67) % 220), 199 + Math.sin(i * 0.7) * 22, 3, 2, d.back);
    line('M478 163 Q498 164 512 171', d.back, 2);
  } else if (d.shape === 'ray') {
    outline =
      'M297 173 C252 117 217 95 119 59 Q137 155 181 209 C214 255 259 243 298 214 C340 253 382 250 420 207 Q469 130 484 61 C395 96 345 119 311 174 Q307 161 297 173 Z';
    line('M303 207 Q341 284 278 322', d.back, 9);
    body = path(outline, gradient(0, 75, 0, 238, [d.back, d.side, d.belly]));
    line('M296 166 Q272 199 258 193 M309 166 Q338 201 350 194', d.back, 4);
    ellipse(287, 165, 4, 4, '#172a34');
    ellipse(321, 165, 4, 4, '#172a34');
    for (let i = 0; i < 18; i++) ellipse(214 + i * 10, 186 + Math.sin(i) * 9, 2, 2, '#a4c8ce');
    eye.r = 0;
  } else if (d.shape === 'squid' || d.shape === 'octopus') {
    for (let i = 0; i < 8; i++) {
      const endX = 140 + i * 49;
      line(
        'M' +
          (255 + i * 13) +
          ' 190 C' +
          (175 + i * 23) +
          ' 249 ' +
          (endX - 40) +
          ' 323 ' +
          endX +
          ' ' +
          (265 + (i % 3) * 15),
        d.back,
        18,
      );
      line(
        'M' +
          (255 + i * 13) +
          ' 190 C' +
          (175 + i * 23) +
          ' 249 ' +
          (endX - 40) +
          ' 323 ' +
          endX +
          ' ' +
          (265 + (i % 3) * 15),
        d.side,
        13,
      );
      for (let j = 0; j < 5; j++) ellipse(223 + i * 19 - j * 8, 227 + j * 11, 2, 2, d.belly);
    }
    if (d.shape === 'squid') {
      path('M284 67 Q245 99 219 160 L308 187 L383 161 Q350 104 316 65 Z', finFill);
      outline = 'M299 37 C319 74 352 138 345 188 Q305 220 264 187 C258 127 281 61 299 37 Z';
    } else outline = 'M227 167 C204 59 332 37 377 104 Q400 160 369 193 Q291 230 227 167 Z';
    body = path(outline, gradient(220, 60, 355, 208, [shade(d.side, 0.2), d.side, d.back]));
    eye = { x: 337, y: 176, r: 13 };
  } else if (d.shape === 'seahorse') {
    outline =
      'M316 56 Q367 42 381 85 L424 112 L421 130 L371 121 Q353 139 361 170 C365 203 321 221 310 244 C305 267 325 283 344 273 Q360 256 343 251 Q333 248 337 237 C378 230 389 290 343 307 C290 326 253 279 264 238 C274 208 313 186 305 159 Q282 145 288 117 L281 83 Z';
    path('M300 96 Q268 102 259 131 L283 166 L302 142 Z', finFill);
    body = path(outline, gradient(275, 90, 367, 283, [d.back, d.side, d.belly]));
    for (let i = 0; i < 10; i++)
      line('M' + (307 - i * 1.5) + ' ' + (145 + i * 9) + ' q26 5 39 0', shade(d.back, 0.2), 2);
    eye = { x: 359, y: 95, r: 8 };
  } else if (d.shape === 'axolotl') {
    path('M176 190 Q98 148 52 178 Q72 242 178 216 Z', finFill);
    path('M254 207 Q224 262 209 267 L202 255 L196 268 L192 251 L183 259 L181 242 L219 202 Z', bodyFill);
    path('M381 209 Q397 247 430 261 L436 249 L442 260 L447 246 L455 254 L457 236 L417 199 Z', bodyFill);
    body = path('M146 181 Q292 132 401 148 Q493 155 496 197 Q489 235 416 237 Q290 240 146 215 Z', bodyFill);
    for (const sign of [-1, 1])
      for (let i = 0; i < 3; i++) {
        const x = 410 + i * 18;
        line(
          'M' +
            x +
            ' ' +
            (184 + sign * 17) +
            ' Q' +
            (x - 19) +
            ' ' +
            (185 + sign * 52) +
            ' ' +
            (x - 27) +
            ' ' +
            (183 + sign * 68),
          d.fin,
          7,
        );
        for (let j = 0; j < 4; j++)
          line(
            'M' + (x - 14 - j * 4) + ' ' + (184 + sign * (32 + j * 9)) + ' l-12 ' + sign * 5,
            shade(d.fin, 0.2),
            2,
          );
      }
    eye = { x: 453, y: 182, r: 9 };
    line('M469 204 q12 9 20 -2', d.back, 2);
  } else if (d.shape === 'crayfish') {
    for (let i = 0; i < 5; i++) {
      line('M' + (235 + i * 23) + ' 203 l-32 49 l24 21', d.fin, 5);
      line('M' + (235 + i * 23) + ' 160 l-32 -34 l24 -21', d.fin, 5);
    }
    path('M193 170 Q112 143 57 164 L87 184 L55 213 Q134 238 197 205 Z', finFill);
    body = path('M172 174 Q285 131 383 158 Q435 177 388 212 Q299 238 172 200 Z', bodyFill);
    for (let i = 0; i < 7; i++) line('M' + (183 + i * 20) + ' 160 q-12 31 0 62', d.back, 2);
    line('M375 167 Q409 109 459 112 M371 200 Q406 260 452 246', d.fin, 11);
    path('M446 104 Q476 56 529 74 L496 107 L539 97 Q530 143 477 140 Z', finFill);
    path('M445 236 Q482 208 535 223 L507 246 L544 254 Q505 292 460 270 Z', finFill);
    line('M382 181 Q452 153 500 163 M380 190 Q450 212 493 196', d.back, 2);
    eye = { x: 385, y: 169, r: 6 };
  } else if (d.shape === 'boot') {
    body = path(
      'M222 62 L340 66 L327 205 Q371 207 428 249 Q442 287 387 290 L206 286 Q180 260 199 218 L212 100 Z',
      gradient(200, 80, 373, 286, [d.back, d.side, d.belly]),
    );
    path('M211 61 Q273 43 342 62 L339 88 Q267 73 211 84 Z', d.back);
    path('M188 276 Q318 290 433 270 L427 303 L191 302 Z', '#2a2926');
    for (let i = 0; i < 5; i++) line('M286 ' + (111 + i * 19) + ' l35 12 l-38 11', '#e0c19a', 3);
    line('M215 202 Q178 184 188 144 M202 267 Q158 271 166 238', '#5f8752', 6);
    eye.r = 0;
  } else if (d.shape === 'duck') {
    body = path(
      'M175 188 C97 148 101 263 237 279 C341 299 455 265 450 210 Q453 155 409 146 L408 109 C416 45 341 44 326 98 Q316 135 342 164 Q242 129 175 188 Z',
      gradient(0, 70, 0, 280, [d.belly, d.side, d.back]),
    );
    path('M394 115 Q451 98 484 125 Q468 148 408 147 Z', '#db852f');
    path('M203 194 Q292 179 324 228 Q274 259 196 231 Z', gradient(0, 186, 0, 255, [d.belly, d.fin]));
    eye = { x: 383, y: 107, r: 9 };
  }

  if (eye.r) {
    ellipse(eye.x, eye.y, eye.r + 2, eye.r + 2, shade(d.back, -0.2));
    ellipse(eye.x, eye.y, eye.r, eye.r, '#d3b05f');
    ellipse(eye.x + 1, eye.y, eye.r * 0.65, eye.r * 0.75, '#122430');
    ellipse(eye.x - eye.r * 0.3, eye.y - eye.r * 0.4, eye.r * 0.27, eye.r * 0.27, '#f7fcf5');
    if (speciesId === 'flounder') {
      ellipse(eye.x - 30, eye.y - 18, 10, 10, d.back);
      ellipse(eye.x - 30, eye.y - 18, 7, 7, '#ddc28a');
      ellipse(eye.x - 29, eye.y - 18, 4, 5, '#233134');
    }
  }

  if (d.detail === 'sword' || d.detail === 'horn') {
    path('M480 181 L577 166 L494 195 Z', gradient(0, 169, 0, 196, ['#c7e2e2', '#7598ae', d.back]));
    if (d.detail === 'horn')
      for (let i = 0; i < 7; i++) line('M' + (501 + i * 9) + ' 179 l5 8', '#d7c799', 1);
  } else if (d.detail === 'hammer') {
    path('M442 157 Q475 132 522 142 L522 169 L489 173 L509 207 L484 221 L441 197 Z', bodyFill);
    ellipse(513, 153, 4, 4, '#182c3b');
  } else if (d.detail === 'barbels') {
    line(
      'M477 203 Q497 221 542 227 M468 205 Q487 242 527 253 M452 212 Q460 246 484 264',
      shade(d.side, 0.35),
      3,
    );
  } else if (d.detail === 'teeth') {
    for (let i = 0; i < 6; i++) path('M' + (445 + i * 5) + ' 197 l4 0 l-2 6 Z', '#f5e9c7', false);
  } else if (d.detail === 'spines') {
    for (let i = 0; i < 13; i++) {
      const x = 180 + i * 20;
      line('M' + x + ' 150 l-18 ' + (-35 - Math.sin(i) * 18), d.fin, 3);
    }
    if (speciesId === 'pufferfish') {
      for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI * 2) / 16;
        const x = 315 + Math.cos(a) * 142;
        const y = 193 + Math.sin(a) * 92;
        line('M' + x + ' ' + y + ' l' + Math.cos(a) * 14 + ' ' + Math.sin(a) * 14, '#ded0a1', 3);
      }
    }
  } else if (d.detail === 'wings') {
    path('M331 188 Q190 215 216 295 Q303 284 372 208 Z', finFill);
    for (let i = 0; i < 9; i++)
      line(
        'M350 203 Q' + (246 + i * 5) + ' 252 ' + (223 + i * 12) + ' ' + (288 - i * 4),
        shade(d.fin, 0.5),
        1,
      );
  } else if (d.detail === 'lantern') {
    line('M403 144 Q404 69 485 74 Q517 81 511 108', d.fin, 4);
    const glow = ctx.createRadialGradient(511, 114, 1, 511, 114, 28);
    glow.addColorStop(0, '#fff5b4');
    glow.addColorStop(0.3, '#d9eaa0');
    glow.addColorStop(1, 'rgba(220,238,180,0)');
    ellipse(511, 114, 28, 28, glow);
    ellipse(511, 114, 8, 8, '#f7efbd');
  } else if (d.detail === 'lightning') {
    line('M251 119 l-18 -27 l20 0 l-11 -26 M342 254 l15 27 l-19 -3 l12 30', '#dfca68', 3);
  } else if (d.detail === 'tie') {
    path('M392 159 L414 160 L415 219 L397 211 Z', '#f5ecda');
    path('M405 180 L414 185 L412 226 L401 235 L395 220 Z', '#ae3640');
  } else if (d.detail === 'paper') {
    path('M476 192 L546 184 L556 242 L486 250 Z', '#f5eee2');
    for (let i = 0; i < 4; i++) line('M491 ' + (207 + i * 9) + ' l44 -5', '#7c8b9a', 1.5);
    ellipse(535, 231, 6, 6, '#b85f55');
  } else if (d.detail === 'monocle') {
    ctx.strokeStyle = '#d7bf76';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(eye.x, eye.y, 15, 0, Math.PI * 2);
    ctx.stroke();
    line('M' + (eye.x + 13) + ' ' + (eye.y + 8) + ' q37 40 10 65', '#d7bf76', 2);
  } else if (d.detail === 'coin') {
    ellipse(338, 179, 26, 26, gradient(0, 153, 0, 205, ['#ffe4a1', '#c89336']));
    ctx.fillStyle = '#7e602c';
    ctx.font = 'bold 32px serif';
    ctx.fillText('₿', 326, 190);
  } else if (d.detail === 'crown') {
    const x = d.shape === 'duck' ? 358 : 418;
    const y = d.shape === 'duck' ? 58 : 139;
    path(
      'M' + (x - 26) + ' ' + y + ' l-7 -32 l23 15 l15 -32 l16 32 l23 -15 l-8 32 Z',
      gradient(0, y - 40, 0, y, ['#ffebae', '#bd8e39']),
    );
    ellipse(x + 5, y - 13, 4, 5, '#b65c57');
  }

  if (silhouette) {
    ctx.resetTransform();
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#253849';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  return canvas;
}
