import type { AssetDefinition } from '../types/asset.js';

export const FARMING_ASSETS: AssetDefinition[] = [
  {
    id: 'crop-rice-paddy',
    category: 'farming',
    name: 'Lúa Nước Đồng Nai (Wetland Rice)',
    texture: '/farm/sprites/sprite_058_cid70.png',
    visualBounds: { width: 32, height: 32 },
    footprint: { tileWidth: 1, tileHeight: 1 },
    anchor: { x: 0.5, y: 1.0 },
    collision: { solid: false },
    tags: ['crop', 'rice', 'paddy', 'farming', 'food', 'vietnamese'],
    styleVersion: 1,
    animation: {
      type: 'growth_stages',
      stages: ['seed', 'sprout', 'blooming', 'mature'],
    },
  },
  {
    id: 'crop-corn-sweet',
    category: 'farming',
    name: 'Bắp Ngọt Vàng (Sweet Corn)',
    texture: '/farm/sprites/sprite_058_cid16.png',
    visualBounds: { width: 32, height: 48 },
    footprint: { tileWidth: 1, tileHeight: 1 },
    anchor: { x: 0.5, y: 1.0 },
    collision: { solid: false },
    tags: ['crop', 'corn', 'farming', 'vegetable', 'food'],
    styleVersion: 1,
    animation: {
      type: 'growth_stages',
      stages: ['seed', 'sprout', 'blooming', 'mature'],
    },
  },
  {
    id: 'farming-plot-tilled',
    category: 'farming',
    name: 'Ô Đất Cày Xới Sẵn Sàng Gieo Hạt (Tilled Plot)',
    texture: '/farm/tiled/sprout_tileset.png',
    visualBounds: { width: 32, height: 32 },
    footprint: { tileWidth: 1, tileHeight: 1 },
    anchor: { x: 0.5, y: 0.5 },
    collision: { solid: false, isTrigger: true },
    tags: ['plot', 'soil', 'tilled', 'farming', 'interactable'],
    styleVersion: 1,
  },
];
