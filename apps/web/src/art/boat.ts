import { normalizeBoatId } from '@cozy/game-data';
import type Phaser from 'phaser';

/** The game currently has four catalog boats; these visuals leave all catalog data untouched. */
export const BOAT_ART = {
  boat_coracle: {
    model: 'kayak',
    sheet: '/boats/hulls/kayak.png',
    icon: '/boats/icons/boat_coracle.png',
    frameSize: 64,
  },
  boat_sampan: {
    model: 'boat',
    sheet: '/boats/hulls/boat.png',
    icon: '/boats/icons/boat_sampan.png',
    frameSize: 64,
  },
  boat_cutter: {
    model: 'speedboat',
    sheet: '/boats/hulls/speedboat.png',
    icon: '/boats/icons/boat_cutter.png',
    frameSize: 64,
  },
  boat_trawler: {
    model: 'steamboat',
    sheet: '/boats/hulls/steamboat.png',
    icon: '/boats/icons/boat_trawler.png',
    frameSize: 128,
  },
} as const;

const DIRECTION_FRAMES: Record<0 | 1 | 2 | 3, number> = {
  0: 24, // down / south
  1: 36, // left / west
  2: 12, // right / east
  3: 0, // up / north
};

const SHEET_COLUMNS = 7;
const SHEET_FRAMES = SHEET_COLUMNS * SHEET_COLUMNS;
export const BOAT_DISPLAY_FRAME_SIZE = 64;
export const BOAT_SPRITE_Y = -4;
export const BOAT_SPRITE_ORIGIN_Y = 0.7;
/** Enlarges world boats so their deck reads clearly beneath a standing avatar. */
export const BOAT_WORLD_SCALE = 2.8;
export const STEAMBOAT_WORLD_SCALE = 4.3;

export function boatWorldScaleFor(boatId: string): number {
  return normalizeBoatId(boatId) === 'boat_trawler' ? STEAMBOAT_WORLD_SCALE : BOAT_WORLD_SCALE;
}

/** Places the passenger's sprite center at the center of the scaled boat deck. */
export function boatPassengerCenterY(boatId?: string): number {
  const scale = boatId ? boatWorldScaleFor(boatId) : BOAT_WORLD_SCALE;
  return BOAT_SPRITE_Y + BOAT_DISPLAY_FRAME_SIZE * (0.5 - BOAT_SPRITE_ORIGIN_Y) * scale;
}

export function boatArtFor(boatId: string) {
  const id = normalizeBoatId(boatId) ?? 'boat_coracle';
  return { id, ...BOAT_ART[id as keyof typeof BOAT_ART] };
}

export function boatFrameForDirection(direction: number): number {
  return DIRECTION_FRAMES[(direction >= 0 && direction <= 3 ? direction : 0) as 0 | 1 | 2 | 3];
}

/** Loads the four 7-by-7 directional sheets before a world scene creates players or dock props. */
export function preloadBoatTextures(scene: Phaser.Scene) {
  for (const [id, art] of Object.entries(BOAT_ART)) {
    const key = `boat-sheet:${id}`;
    if (!scene.textures.exists(key)) scene.load.image(key, art.sheet);
  }
}

/** Returns a direction-specific, nearest-neighbor canvas texture cropped from the matching sheet. */
export function ensureBoatTexture(scene: Phaser.Scene, boatId: string, dir: number): string {
  const art = boatArtFor(boatId);
  const frame = boatFrameForDirection(dir);
  const textureKey = `boat-tex:${art.id}:${frame}`;
  if (scene.textures.exists(textureKey)) return textureKey;

  const sheetKey = `boat-sheet:${art.id}`;
  if (!scene.textures.exists(sheetKey)) {
    throw new Error(`Boat art sheet ${sheetKey} was not loaded; call preloadBoatTextures in the scene.`);
  }

  const source = scene.textures.get(sheetKey).getSourceImage() as CanvasImageSource;
  const columns = Math.floor((source as HTMLImageElement).naturalWidth / art.frameSize);
  const rows = Math.floor((source as HTMLImageElement).naturalHeight / art.frameSize);
  if (columns !== SHEET_COLUMNS || rows !== SHEET_COLUMNS || frame >= SHEET_FRAMES) {
    throw new Error(`Boat art sheet ${sheetKey} must contain ${SHEET_FRAMES} square direction frames.`);
  }

  const canvas = document.createElement('canvas');
  canvas.width = BOAT_DISPLAY_FRAME_SIZE;
  canvas.height = BOAT_DISPLAY_FRAME_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create a canvas for boat art.');
  context.imageSmoothingEnabled = false;
  const sourceX = (frame % SHEET_COLUMNS) * art.frameSize;
  const sourceY = Math.floor(frame / SHEET_COLUMNS) * art.frameSize;
  context.drawImage(
    source,
    sourceX,
    sourceY,
    art.frameSize,
    art.frameSize,
    0,
    0,
    BOAT_DISPLAY_FRAME_SIZE,
    BOAT_DISPLAY_FRAME_SIZE,
  );
  scene.textures.addCanvas(textureKey, canvas);
  return textureKey;
}

/** Uses a pre-cropped, transparent 64px icon from the same art pack as the in-world hull. */
export function boatIcon(boatId: string): string {
  return boatArtFor(boatId).icon;
}
