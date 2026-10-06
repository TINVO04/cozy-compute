import { FARM_BLOCKERS, FARM_COLS, FARM_ROWS, FARM_PATHS, FARM_POIS, TILE, type Rect } from '@cozy/game-data';
import { mulberry } from './pixel';

const contains = (r: Rect, x: number, y: number) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;

/** A single terrain matrix shared by the live tilemap and its editor metadata. */
export function farmTerrain(): number[] {
  const pond = FARM_POIS.aquaculture_pond;
  const bank = { x: pond.x - TILE, y: pond.y - TILE, w: pond.w + TILE * 2, h: pond.h + TILE * 2 };
  return Array.from({ length: FARM_COLS * FARM_ROWS }, (_, i) => {
    const x = (i % FARM_COLS) * TILE + TILE / 2;
    const y = Math.floor(i / FARM_COLS) * TILE + TILE / 2;
    if (contains(pond, x, y)) return 4;
    if (contains(bank, x, y)) return 5;
    if (FARM_PATHS.some((r) => contains(r, x, y))) return 2;
    return 1;
  });
}

export function paintFarmTileset(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = TILE * 5;
  c.height = TILE;
  const ctx = c.getContext('2d')!;
  const random = mulberry(607);
  ['#91b579', '#d4c299', '#94754f', '#669f9c', '#b7af87'].forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(i * TILE, 0, TILE, TILE);
    for (let j = 0; j < 12; j++) {
      ctx.fillStyle = i === 0 ? '#88ad71' : i === 3 ? '#71aaa4' : '#b5a580';
      ctx.fillRect(
        i * TILE + Math.floor(random() * 14) * 2,
        Math.floor(random() * 15) * 2,
        i === 3 ? 6 : 2,
        2,
      );
    }
  });
  return c;
}

export function farmTiledData() {
  const objects = (entries: [string, Rect][], offset: number) =>
    entries.map(([name, r], i) => ({
      id: offset + i,
      name,
      type: name,
      ...r,
      width: r.w,
      height: r.h,
      rotation: 0,
      visible: true,
    }));
  return {
    type: 'map',
    version: 1.1,
    tiledversion: '1.10.2',
    orientation: 'orthogonal',
    renderorder: 'right-down',
    width: FARM_COLS,
    height: FARM_ROWS,
    tilewidth: TILE,
    tileheight: TILE,
    infinite: false,
    tilesets: [
      {
        firstgid: 1,
        name: 'farm-town',
        tilewidth: TILE,
        tileheight: TILE,
        tilecount: 5,
        columns: 5,
        image: 'farm-town.png',
        imagewidth: TILE * 5,
        imageheight: TILE,
        margin: 0,
        spacing: 0,
      },
    ],
    layers: [
      {
        id: 1,
        name: 'Ground',
        type: 'tilelayer',
        width: FARM_COLS,
        height: FARM_ROWS,
        x: 0,
        y: 0,
        opacity: 1,
        visible: true,
        data: farmTerrain(),
      },
      {
        id: 2,
        name: 'Collisions',
        type: 'objectgroup',
        x: 0,
        y: 0,
        opacity: 1,
        visible: false,
        objects: objects(
          FARM_BLOCKERS.map((r, i) => [`blocker-${i}`, r]),
          1,
        ),
      },
      {
        id: 3,
        name: 'POIs',
        type: 'objectgroup',
        x: 0,
        y: 0,
        opacity: 1,
        visible: false,
        objects: objects(Object.entries(FARM_POIS), 1000),
      },
    ],
  };
}
