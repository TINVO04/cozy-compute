import type { AssetDefinition } from '../types/asset.js';

export const CHARACTER_ASSETS: AssetDefinition[] = [
  {
    id: 'character-farmer-vietnamese',
    category: 'characters',
    name: 'Bác Nông Dân Đội Nón Lá (Vietnamese Farmer NPC)',
    texture: '/farm/sprites/sprite_053_cid8.png',
    visualBounds: { width: 32, height: 32 },
    footprint: { tileWidth: 1, tileHeight: 1 },
    anchor: { x: 0.5, y: 1.0 },
    collision: { solid: true },
    tags: ['character', 'farmer', 'npc', 'vietnamese', 'non-la', 'rural'],
    styleVersion: 1,
    animation: {
      type: 'spritesheet',
      frameWidth: 32,
      frameHeight: 32,
      frameCount: 4,
      frameRate: 6,
      directions: ['down', 'up', 'left', 'right'],
    },
  },
  {
    id: 'character-merchant-stall',
    category: 'characters',
    name: 'Bác Sáu Chủ Tiệm Tạp Hóa (Produce Merchant NPC)',
    texture: '/farm/sprites/sprite_052_cid59.png',
    visualBounds: { width: 32, height: 32 },
    footprint: { tileWidth: 1, tileHeight: 1 },
    anchor: { x: 0.5, y: 1.0 },
    collision: { solid: true },
    tags: ['character', 'merchant', 'npc', 'shopkeeper', 'commercial'],
    styleVersion: 1,
    animation: {
      type: 'spritesheet',
      frameWidth: 32,
      frameHeight: 32,
      frameCount: 4,
      frameRate: 6,
      directions: ['down', 'up', 'left', 'right'],
    },
  },
];
