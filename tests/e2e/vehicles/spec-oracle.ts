import type { VehicleSpec, SpritesheetSpec, RaytraceLightResult } from './types.js';

/**
 * Authoritative Specification Oracle for the 16 Vehicle Models in Cozy Compute.
 * Derived directly from:
 * - ORIGINAL_REQUEST.md (2026-10-08T12:29:53Z)
 * - PROJECT.md (Vehicle Asset Pack & Runtime System Architecture)
 */
export const REQUIRED_VEHICLE_MODELS: VehicleSpec[] = [
  // 1. Bicycle (1 model)
  {
    id: 'bicycles/trek-marlin-7',
    category: 'bicycle',
    brand: 'Trek',
    name: 'Trek Marlin 7 Gen 3',
    price: 200,
    speed: 195,
    color: '#0284c7',
    bodyWidth: 40,
    contactY: 37,
    seat: { x: 24, y: 17 },
    lights: { frontOffsetX: 20, frontOffsetY: 18, rearOffsetX: 18, rearOffsetY: 18 },
    assetPath: 'bicycles/trek-marlin-7',
    aliases: ['bicycle_sky'],
  },

  // 2-8. Motorcycles (7 models)
  {
    id: 'motorcycles/vespa-primavera-150',
    category: 'motorcycle',
    brand: 'Vespa',
    name: 'Vespa Primavera 150',
    price: 700,
    speed: 270,
    color: '#f43f5e',
    bodyWidth: 40,
    contactY: 37,
    seat: { x: 24, y: 17 },
    lights: { frontOffsetX: 20, frontOffsetY: 18, rearOffsetX: 18, rearOffsetY: 18 },
    assetPath: 'motorcycles/vespa-primavera-150',
    aliases: ['motorcycle_coral'],
  },
  {
    id: 'motorcycles/ducati-panigale-v4',
    category: 'motorcycle',
    brand: 'Ducati',
    name: 'Ducati Panigale V4 S',
    price: 2400,
    speed: 310,
    color: '#dc2626',
    bodyWidth: 40,
    contactY: 37,
    seat: { x: 24, y: 16 },
    lights: { frontOffsetX: 20, frontOffsetY: 18, rearOffsetX: 18, rearOffsetY: 18 },
    assetPath: 'motorcycles/ducati-panigale-v4',
    aliases: ['motorcycle_ducati'],
  },
  {
    id: 'motorcycles/honda-super-cub',
    category: 'motorcycle',
    brand: 'Honda',
    name: 'Honda Super Cub C125',
    price: 500,
    speed: 210,
    color: '#0284c7',
    bodyWidth: 40,
    contactY: 37,
    seat: { x: 24, y: 18 },
    lights: { frontOffsetX: 20, frontOffsetY: 18, rearOffsetX: 18, rearOffsetY: 18 },
    assetPath: 'motorcycles/honda-super-cub',
  },
  {
    id: 'motorcycles/harley-davidson-fat-boy',
    category: 'motorcycle',
    brand: 'Harley-Davidson',
    name: 'Harley-Davidson Fat Boy 114',
    price: 1800,
    speed: 250,
    color: '#334155',
    bodyWidth: 40,
    contactY: 37,
    seat: { x: 24, y: 19 },
    lights: { frontOffsetX: 20, frontOffsetY: 18, rearOffsetX: 18, rearOffsetY: 18 },
    assetPath: 'motorcycles/harley-davidson-fat-boy',
  },
  {
    id: 'motorcycles/kawasaki-ninja-h2',
    category: 'motorcycle',
    brand: 'Kawasaki',
    name: 'Kawasaki Ninja H2 Carbon',
    price: 2800,
    speed: 330,
    color: '#16a34a',
    bodyWidth: 40,
    contactY: 37,
    seat: { x: 24, y: 16 },
    lights: { frontOffsetX: 20, frontOffsetY: 18, rearOffsetX: 18, rearOffsetY: 18 },
    assetPath: 'motorcycles/kawasaki-ninja-h2',
  },
  {
    id: 'motorcycles/yamaha-yzf-r1',
    category: 'motorcycle',
    brand: 'Yamaha',
    name: 'Yamaha YZF-R1M',
    price: 2500,
    speed: 315,
    color: '#2563eb',
    bodyWidth: 40,
    contactY: 37,
    seat: { x: 24, y: 16 },
    lights: { frontOffsetX: 20, frontOffsetY: 18, rearOffsetX: 18, rearOffsetY: 18 },
    assetPath: 'motorcycles/yamaha-yzf-r1',
  },
  {
    id: 'motorcycles/bmw-r1250-gs',
    category: 'motorcycle',
    brand: 'BMW',
    name: 'BMW R 1250 GS Adventure',
    price: 2200,
    speed: 280,
    color: '#0284c7',
    bodyWidth: 40,
    contactY: 37,
    seat: { x: 24, y: 17 },
    lights: { frontOffsetX: 20, frontOffsetY: 18, rearOffsetX: 18, rearOffsetY: 18 },
    assetPath: 'motorcycles/bmw-r1250-gs',
  },

  // 9-16. Cars (8 models)
  {
    id: 'cars/mercedes-benz-g63',
    category: 'car',
    brand: 'Mercedes-Benz',
    name: 'Mercedes-Benz G63 AMG',
    price: 1800,
    speed: 240,
    color: '#1b4332',
    bodyWidth: 40,
    contactY: 37,
    seat: { x: 24, y: 20 },
    lights: { frontOffsetX: 20, frontOffsetY: 18, rearOffsetX: 18, rearOffsetY: 18 },
    assetPath: 'cars/mercedes-benz-g63',
    aliases: ['car_mint'],
  },
  {
    id: 'cars/lamborghini-aventador',
    category: 'car',
    brand: 'Lamborghini',
    name: 'Lamborghini Aventador SVJ',
    price: 4500,
    speed: 340,
    color: '#eab308',
    bodyWidth: 40,
    contactY: 37,
    seat: { x: 24, y: 20 },
    lights: { frontOffsetX: 20, frontOffsetY: 18, rearOffsetX: 18, rearOffsetY: 18 },
    assetPath: 'cars/lamborghini-aventador',
    aliases: ['car_lamborghini', 'car_sunset'],
  },
  {
    id: 'cars/porsche-911',
    category: 'car',
    brand: 'Porsche',
    name: 'Porsche 911 GT3 RS',
    price: 3600,
    speed: 320,
    color: '#0284c7',
    bodyWidth: 40,
    contactY: 37,
    seat: { x: 24, y: 20 },
    lights: { frontOffsetX: 20, frontOffsetY: 18, rearOffsetX: 18, rearOffsetY: 18 },
    assetPath: 'cars/porsche-911',
    aliases: ['car_porsche'],
  },
  {
    id: 'cars/toyota-supra-mk4',
    category: 'car',
    brand: 'Toyota',
    name: 'Toyota Supra MK4 1994',
    price: 2600,
    speed: 290,
    color: '#ea580c',
    bodyWidth: 40,
    contactY: 37,
    seat: { x: 24, y: 20 },
    lights: { frontOffsetX: 20, frontOffsetY: 18, rearOffsetX: 18, rearOffsetY: 18 },
    assetPath: 'cars/toyota-supra-mk4',
  },
  {
    id: 'cars/ferrari-f40',
    category: 'car',
    brand: 'Ferrari',
    name: 'Ferrari F40 Competizione',
    price: 5000,
    speed: 335,
    color: '#dc2626',
    bodyWidth: 40,
    contactY: 37,
    seat: { x: 24, y: 20 },
    lights: { frontOffsetX: 20, frontOffsetY: 18, rearOffsetX: 18, rearOffsetY: 18 },
    assetPath: 'cars/ferrari-f40',
  },
  {
    id: 'cars/ford-mustang',
    category: 'car',
    brand: 'Ford',
    name: 'Ford Mustang Dark Horse',
    price: 1900,
    speed: 275,
    color: '#1e3a8a',
    bodyWidth: 40,
    contactY: 37,
    seat: { x: 24, y: 20 },
    lights: { frontOffsetX: 20, frontOffsetY: 18, rearOffsetX: 18, rearOffsetY: 18 },
    assetPath: 'cars/ford-mustang',
  },
  {
    id: 'cars/rolls-royce-phantom',
    category: 'car',
    brand: 'Rolls-Royce',
    name: 'Rolls-Royce Phantom VIII',
    price: 6000,
    speed: 250,
    color: '#0f172a',
    bodyWidth: 40,
    contactY: 37,
    seat: { x: 24, y: 20 },
    lights: { frontOffsetX: 20, frontOffsetY: 18, rearOffsetX: 18, rearOffsetY: 18 },
    assetPath: 'cars/rolls-royce-phantom',
  },
  {
    id: 'cars/tesla-model-s',
    category: 'car',
    brand: 'Tesla',
    name: 'Tesla Model S Plaid',
    price: 3500,
    speed: 325,
    color: '#e2e8f0',
    bodyWidth: 40,
    contactY: 37,
    seat: { x: 24, y: 20 },
    lights: { frontOffsetX: 20, frontOffsetY: 18, rearOffsetX: 18, rearOffsetY: 18 },
    assetPath: 'cars/tesla-model-s',
  },
];

export const REQUIRED_SPRITESHEET_SPEC: SpritesheetSpec = {
  totalWidth: 192,
  totalHeight: 160,
  frameWidth: 48,
  frameHeight: 40,
  cols: 4,
  rows: 4,
  directions: ['down', 'left', 'right', 'up'],
  frames: ['idle', 'drive_1', 'drive_2', 'drive_3'],
};

export const REQUIRED_ROAD_WIDTH = 40;
export const REQUIRED_SHOWROOM_PEDESTAL = { width: 136, height: 66, scale: 2 };
export const REQUIRED_SHOP_PREVIEW = { width: 144, height: 120, scale: 3 };

/**
 * Calculates authoritative raytracing beam and bulb coordinates for any heading.
 * dir: 0=Down, 1=Left, 2=Right, 3=Up
 */
export function calculateAuthoritativeLights(
  x: number,
  y: number,
  dir: number,
  kind: 'car' | 'motorcycle' | 'bicycle',
): RaytraceLightResult {
  const angle = [Math.PI / 2, Math.PI, 0, -Math.PI / 2][dir] ?? 0;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const frontX = x + dx * 20;
  const frontY = y - 10 + dy * 18;
  const rearX = x - dx * 18;
  const rearY = y - 10 - dy * 18;
  const bulbOffsets = kind === 'car' ? [-8, 8] : [0];

  return {
    direction: dir,
    frontX,
    frontY,
    rearX,
    rearY,
    beamAngle: angle,
    beamActive: true,
    bulbOffsets,
  };
}

export function findOracleModel(idOrAlias: string): VehicleSpec | undefined {
  return REQUIRED_VEHICLE_MODELS.find(
    (m) => m.id === idOrAlias || (m.aliases && m.aliases.includes(idOrAlias)),
  );
}
