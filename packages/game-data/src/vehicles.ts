import type { Rect } from './map.js';

export type VehicleKind = 'car' | 'motorcycle' | 'bicycle';

export interface VehicleDimensions {
  /** Width of the render frame in pixels (standard 48 px). */
  frameWidth: number;
  /** Height of the render frame in pixels (standard 40 px). */
  frameHeight: number;
  /** Collision / physical width of vehicle body; must be <= 40 to fit TOWN_ROADS without off-road fine. */
  bodyWidth: number;
  /** Collision / physical length or height of vehicle body in pixels. */
  bodyHeight: number;
  /** Bottom contact Y coordinate in frame coordinates (standard 37 px). */
  contactY: number;
}

export interface VehicleMountingGeometry {
  /** Center of saddle/seat in frame coordinates; for 2-wheelers x=24, y=16..20. */
  seat: { x: number; y: number };
  /** Whether driver sprite is completely hidden inside cabin (true for 4-wheelers/cars). */
  hideAvatar: boolean;
  /** Crop rect for avatar when mounted on 2-wheelers (standard { x: 0, y: 0, width: 32, height: 40 }). */
  cropAvatar?: { x: number; y: number; width: number; height: number };
  /** Offset for avatar container Y when mounted (e.g. -4 px). */
  avatarOffsetY?: number;
}

export interface VehicleLightingGeometry {
  /** Forward headlight beam emitter offset multiplier relative to heading vector (dx * 20, dy * 18). */
  headlight: { dx: number; dy: number };
  /** Rear taillight offset multiplier relative to heading vector (-dx * 18, -dy * 18). */
  taillight: { dx: number; dy: number };
}

export interface VehicleShowroomTheme {
  /** Accent glow color used on showroom pedestal and showcase UI. */
  accentColor: string;
  /** Badge or category label for showroom showcase. */
  badge?: string;
  /** Lighting intensity factor or ambient tint. */
  spotlightIntensity?: number;
}

export interface VehicleDef {
  id: string;
  kind: VehicleKind;
  name: string;
  brand: string;
  price: number;
  speed: number;
  color: string;
  assetPath: string;
  description?: string;
  dimensions: VehicleDimensions;
  mounting: VehicleMountingGeometry;
  lighting: VehicleLightingGeometry;
  showroomTheme?: VehicleShowroomTheme;
}

export const CANONICAL_VEHICLE_IDS = [
  'bicycle_sky',
  'motorcycle_coral',
  'motorcycle_ducati',
  'motorcycle_honda_super_cub',
  'motorcycle_harley_fat_boy',
  'motorcycle_kawasaki_ninja_h2',
  'motorcycle_yamaha_r1',
  'motorcycle_bmw_r1250_gs',
  'car_mint',
  'car_lamborghini',
  'car_porsche',
  'car_toyota_supra_mk4',
  'car_ferrari_f40',
  'car_ford_mustang',
  'car_rolls_royce_phantom',
  'car_tesla_model_s',
] as const;

export type CanonicalVehicleId = (typeof CANONICAL_VEHICLE_IDS)[number];

export const VEHICLES: Record<string, VehicleDef> = {
  // === 1 BICYCLE ===
  bicycle_sky: {
    id: 'bicycle_sky',
    kind: 'bicycle',
    name: 'Trek Marlin 7 Gen 3',
    brand: 'Trek',
    price: 200,
    speed: 195,
    color: '#0284c7',
    assetPath: 'bicycles/trek-marlin-7',
    description: 'Xe đạp địa hình thể thao Trek chính hãng, khung nhôm Alpha Silver nhẹ bền.',
    dimensions: {
      frameWidth: 48,
      frameHeight: 40,
      bodyWidth: 16,
      bodyHeight: 30,
      contactY: 37,
    },
    mounting: {
      seat: { x: 24, y: 18 },
      hideAvatar: false,
      cropAvatar: { x: 0, y: 0, width: 32, height: 40 },
      avatarOffsetY: -4,
    },
    lighting: {
      headlight: { dx: 20, dy: 18 },
      taillight: { dx: 18, dy: 18 },
    },
    showroomTheme: {
      accentColor: '#0284c7',
      badge: 'Xe đạp thể thao',
      spotlightIntensity: 0.8,
    },
  },

  // === 7 MOTORCYCLES ===
  motorcycle_coral: {
    id: 'motorcycle_coral',
    kind: 'motorcycle',
    name: 'Vespa Primavera 150',
    brand: 'Vespa',
    price: 700,
    speed: 270,
    color: '#f43f5e',
    assetPath: 'motorcycles/vespa-primavera-150',
    description: 'Xe tay ga thời trang Ý Vespa Primavera, thanh lịch và quyến rũ trên phố.',
    dimensions: {
      frameWidth: 48,
      frameHeight: 40,
      bodyWidth: 18,
      bodyHeight: 28,
      contactY: 37,
    },
    mounting: {
      seat: { x: 24, y: 18 },
      hideAvatar: false,
      cropAvatar: { x: 0, y: 0, width: 32, height: 40 },
      avatarOffsetY: -4,
    },
    lighting: {
      headlight: { dx: 20, dy: 18 },
      taillight: { dx: 18, dy: 18 },
    },
    showroomTheme: {
      accentColor: '#f43f5e',
      badge: 'Xe tay ga thời trang',
      spotlightIntensity: 0.85,
    },
  },
  motorcycle_ducati: {
    id: 'motorcycle_ducati',
    kind: 'motorcycle',
    name: 'Ducati Panigale V4 S',
    brand: 'Ducati',
    price: 2400,
    speed: 310,
    color: '#dc2626',
    assetPath: 'motorcycles/ducati-panigale-v4',
    description: 'Siêu mô tô phân khối lớn Ducati động cơ Desmosedici Stradale, sắc đỏ Rosso Corsa.',
    dimensions: {
      frameWidth: 48,
      frameHeight: 40,
      bodyWidth: 20,
      bodyHeight: 28,
      contactY: 37,
    },
    mounting: {
      seat: { x: 24, y: 17 },
      hideAvatar: false,
      cropAvatar: { x: 0, y: 0, width: 32, height: 40 },
      avatarOffsetY: -4,
    },
    lighting: {
      headlight: { dx: 20, dy: 18 },
      taillight: { dx: 18, dy: 18 },
    },
    showroomTheme: {
      accentColor: '#dc2626',
      badge: 'Siêu mô tô Ý',
      spotlightIntensity: 1.0,
    },
  },
  motorcycle_honda_super_cub: {
    id: 'motorcycle_honda_super_cub',
    kind: 'motorcycle',
    name: 'Honda Super Cub C125',
    brand: 'Honda',
    price: 500,
    speed: 220,
    color: '#0ea5e9',
    assetPath: 'motorcycles/honda-super-cub',
    description: 'Huyền thoại đô thị Honda Super Cub C125 cổ điển, tiết kiệm nhiên liệu và bền bỉ.',
    dimensions: {
      frameWidth: 48,
      frameHeight: 40,
      bodyWidth: 18,
      bodyHeight: 28,
      contactY: 37,
    },
    mounting: {
      seat: { x: 24, y: 18 },
      hideAvatar: false,
      cropAvatar: { x: 0, y: 0, width: 32, height: 40 },
      avatarOffsetY: -4,
    },
    lighting: {
      headlight: { dx: 20, dy: 18 },
      taillight: { dx: 18, dy: 18 },
    },
    showroomTheme: {
      accentColor: '#0ea5e9',
      badge: 'Huyền thoại đường phố',
      spotlightIntensity: 0.8,
    },
  },
  motorcycle_harley_fat_boy: {
    id: 'motorcycle_harley_fat_boy',
    kind: 'motorcycle',
    name: 'Harley-Davidson Fat Boy 114',
    brand: 'Harley-Davidson',
    price: 1600,
    speed: 250,
    color: '#71717a',
    assetPath: 'motorcycles/harley-davidson-fat-boy',
    description: 'Biểu tượng cơ bắp cruiser Harley-Davidson Fat Boy 114, động cơ Milwaukee-Eight uy lực.',
    dimensions: {
      frameWidth: 48,
      frameHeight: 40,
      bodyWidth: 22,
      bodyHeight: 30,
      contactY: 37,
    },
    mounting: {
      seat: { x: 24, y: 19 },
      hideAvatar: false,
      cropAvatar: { x: 0, y: 0, width: 32, height: 40 },
      avatarOffsetY: -4,
    },
    lighting: {
      headlight: { dx: 20, dy: 18 },
      taillight: { dx: 18, dy: 18 },
    },
    showroomTheme: {
      accentColor: '#71717a',
      badge: 'Cruiser cơ bắp Mỹ',
      spotlightIntensity: 0.9,
    },
  },
  motorcycle_kawasaki_ninja_h2: {
    id: 'motorcycle_kawasaki_ninja_h2',
    kind: 'motorcycle',
    name: 'Kawasaki Ninja H2 Carbon',
    brand: 'Kawasaki',
    price: 3000,
    speed: 330,
    color: '#22c55e',
    assetPath: 'motorcycles/kawasaki-ninja-h2',
    description: 'Siêu phẩm siêu nạp Kawasaki Ninja H2 Carbon, tốc độ xé gió đỉnh cao công nghệ.',
    dimensions: {
      frameWidth: 48,
      frameHeight: 40,
      bodyWidth: 20,
      bodyHeight: 28,
      contactY: 37,
    },
    mounting: {
      seat: { x: 24, y: 17 },
      hideAvatar: false,
      cropAvatar: { x: 0, y: 0, width: 32, height: 40 },
      avatarOffsetY: -4,
    },
    lighting: {
      headlight: { dx: 20, dy: 18 },
      taillight: { dx: 18, dy: 18 },
    },
    showroomTheme: {
      accentColor: '#22c55e',
      badge: 'Siêu nạp Hypersport',
      spotlightIntensity: 1.0,
    },
  },
  motorcycle_yamaha_r1: {
    id: 'motorcycle_yamaha_r1',
    kind: 'motorcycle',
    name: 'Yamaha YZF-R1M',
    brand: 'Yamaha',
    price: 2600,
    speed: 315,
    color: '#2563eb',
    assetPath: 'motorcycles/yamaha-yzf-r1',
    description: 'Chiến mã đua Yamaha YZF-R1M công nghệ MotoGP, động cơ Crossplane âm thanh phấn khích.',
    dimensions: {
      frameWidth: 48,
      frameHeight: 40,
      bodyWidth: 20,
      bodyHeight: 28,
      contactY: 37,
    },
    mounting: {
      seat: { x: 24, y: 17 },
      hideAvatar: false,
      cropAvatar: { x: 0, y: 0, width: 32, height: 40 },
      avatarOffsetY: -4,
    },
    lighting: {
      headlight: { dx: 20, dy: 18 },
      taillight: { dx: 18, dy: 18 },
    },
    showroomTheme: {
      accentColor: '#2563eb',
      badge: 'Chiến mã MotoGP',
      spotlightIntensity: 1.0,
    },
  },
  motorcycle_bmw_r1250_gs: {
    id: 'motorcycle_bmw_r1250_gs',
    kind: 'motorcycle',
    name: 'BMW R 1250 GS Adventure',
    brand: 'BMW',
    price: 2200,
    speed: 260,
    color: '#eab308',
    assetPath: 'motorcycles/bmw-r1250-gs',
    description:
      'Vua phượt địa hình BMW R 1250 GS Adventure động cơ Boxer ShiftCam, chinh phục mọi cung đường.',
    dimensions: {
      frameWidth: 48,
      frameHeight: 40,
      bodyWidth: 22,
      bodyHeight: 30,
      contactY: 37,
    },
    mounting: {
      seat: { x: 24, y: 18 },
      hideAvatar: false,
      cropAvatar: { x: 0, y: 0, width: 32, height: 40 },
      avatarOffsetY: -4,
    },
    lighting: {
      headlight: { dx: 20, dy: 18 },
      taillight: { dx: 18, dy: 18 },
    },
    showroomTheme: {
      accentColor: '#eab308',
      badge: 'Vua phượt Adventure',
      spotlightIntensity: 0.95,
    },
  },

  // === 8 CARS ===
  car_mint: {
    id: 'car_mint',
    kind: 'car',
    name: 'Mercedes-Benz G63 AMG',
    brand: 'Mercedes-Benz',
    price: 1800,
    speed: 240,
    color: '#1b4332',
    assetPath: 'cars/mercedes-benz-g63',
    description: 'Vua địa hình SUV Mercedes-AMG G63 hầm hố, động cơ V8 Biturbo mạnh mẽ uy lực.',
    dimensions: {
      frameWidth: 48,
      frameHeight: 40,
      bodyWidth: 36,
      bodyHeight: 26,
      contactY: 37,
    },
    mounting: {
      seat: { x: 24, y: 18 },
      hideAvatar: true,
    },
    lighting: {
      headlight: { dx: 20, dy: 18 },
      taillight: { dx: 18, dy: 18 },
    },
    showroomTheme: {
      accentColor: '#1b4332',
      badge: 'Vua địa hình SUV',
      spotlightIntensity: 0.9,
    },
  },
  car_lamborghini: {
    id: 'car_lamborghini',
    kind: 'car',
    name: 'Lamborghini Aventador SVJ',
    brand: 'Lamborghini',
    price: 4500,
    speed: 340,
    color: '#eab308',
    assetPath: 'cars/lamborghini-aventador',
    description: 'Siêu phẩm đỉnh cao Lamborghini Aventador SVJ V12 khí động học ALA, màu vàng Giallo rực rỡ.',
    dimensions: {
      frameWidth: 48,
      frameHeight: 40,
      bodyWidth: 38,
      bodyHeight: 22,
      contactY: 37,
    },
    mounting: {
      seat: { x: 24, y: 18 },
      hideAvatar: true,
    },
    lighting: {
      headlight: { dx: 20, dy: 18 },
      taillight: { dx: 18, dy: 18 },
    },
    showroomTheme: {
      accentColor: '#eab308',
      badge: 'Đỉnh cao V12 SVJ',
      spotlightIntensity: 1.0,
    },
  },
  car_porsche: {
    id: 'car_porsche',
    kind: 'car',
    name: 'Porsche 911 GT3 RS',
    brand: 'Porsche',
    price: 3600,
    speed: 320,
    color: '#0284c7',
    assetPath: 'cars/porsche-911',
    description: 'Chiến mã đường đua Porsche 911 GT3 RS cánh gió swan-neck khổng lồ, hiệu năng thuần chất.',
    dimensions: {
      frameWidth: 48,
      frameHeight: 40,
      bodyWidth: 36,
      bodyHeight: 24,
      contactY: 37,
    },
    mounting: {
      seat: { x: 24, y: 18 },
      hideAvatar: true,
    },
    lighting: {
      headlight: { dx: 20, dy: 18 },
      taillight: { dx: 18, dy: 18 },
    },
    showroomTheme: {
      accentColor: '#0284c7',
      badge: 'Chiến mã đường đua',
      spotlightIntensity: 1.0,
    },
  },
  car_toyota_supra_mk4: {
    id: 'car_toyota_supra_mk4',
    kind: 'car',
    name: 'Toyota Supra MK4 1994',
    brand: 'Toyota',
    price: 2500,
    speed: 290,
    color: '#f97316',
    assetPath: 'cars/toyota-supra-mk4',
    description: 'Huyền thoại đường phố Nhật Bản Toyota Supra MK4 động cơ 2JZ-GTE trứ danh.',
    dimensions: {
      frameWidth: 48,
      frameHeight: 40,
      bodyWidth: 36,
      bodyHeight: 24,
      contactY: 37,
    },
    mounting: {
      seat: { x: 24, y: 18 },
      hideAvatar: true,
    },
    lighting: {
      headlight: { dx: 20, dy: 18 },
      taillight: { dx: 18, dy: 18 },
    },
    showroomTheme: {
      accentColor: '#f97316',
      badge: 'Huyền thoại JDM 2JZ',
      spotlightIntensity: 0.95,
    },
  },
  car_ferrari_f40: {
    id: 'car_ferrari_f40',
    kind: 'car',
    name: 'Ferrari F40 1987',
    brand: 'Ferrari',
    price: 4200,
    speed: 335,
    color: '#ef4444',
    assetPath: 'cars/ferrari-f40',
    description: 'Kiệt tác siêu xe kỷ niệm Ferrari F40 V8 Twin-Turbo thuần cơ khí cổ điển sắc đỏ Ý.',
    dimensions: {
      frameWidth: 48,
      frameHeight: 40,
      bodyWidth: 38,
      bodyHeight: 22,
      contactY: 37,
    },
    mounting: {
      seat: { x: 24, y: 18 },
      hideAvatar: true,
    },
    lighting: {
      headlight: { dx: 20, dy: 18 },
      taillight: { dx: 18, dy: 18 },
    },
    showroomTheme: {
      accentColor: '#ef4444',
      badge: 'Kiệt tác siêu xe V8',
      spotlightIntensity: 1.0,
    },
  },
  car_ford_mustang: {
    id: 'car_ford_mustang',
    kind: 'car',
    name: 'Ford Mustang Shelby GT500',
    brand: 'Ford',
    price: 2000,
    speed: 275,
    color: '#3b82f6',
    assetPath: 'cars/ford-mustang',
    description: 'Cơ bắp Mỹ đích thực Ford Mustang Shelby GT500 siêu nạp V8 gầm rú uy lực.',
    dimensions: {
      frameWidth: 48,
      frameHeight: 40,
      bodyWidth: 36,
      bodyHeight: 25,
      contactY: 37,
    },
    mounting: {
      seat: { x: 24, y: 18 },
      hideAvatar: true,
    },
    lighting: {
      headlight: { dx: 20, dy: 18 },
      taillight: { dx: 18, dy: 18 },
    },
    showroomTheme: {
      accentColor: '#3b82f6',
      badge: 'Cơ bắp Mỹ Shelby GT500',
      spotlightIntensity: 0.95,
    },
  },
  car_rolls_royce_phantom: {
    id: 'car_rolls_royce_phantom',
    kind: 'car',
    name: 'Rolls-Royce Phantom VIII',
    brand: 'Rolls-Royce',
    price: 5000,
    speed: 250,
    color: '#475569',
    assetPath: 'cars/rolls-royce-phantom',
    description: 'Đỉnh cao xa xỉ quý tộc Rolls-Royce Phantom VIII êm ái cách âm tuyệt đối như thảm bay.',
    dimensions: {
      frameWidth: 48,
      frameHeight: 40,
      bodyWidth: 38,
      bodyHeight: 26,
      contactY: 37,
    },
    mounting: {
      seat: { x: 24, y: 18 },
      hideAvatar: true,
    },
    lighting: {
      headlight: { dx: 20, dy: 18 },
      taillight: { dx: 18, dy: 18 },
    },
    showroomTheme: {
      accentColor: '#475569',
      badge: 'Quý tộc siêu sang',
      spotlightIntensity: 1.0,
    },
  },
  car_tesla_model_s: {
    id: 'car_tesla_model_s',
    kind: 'car',
    name: 'Tesla Model S Plaid',
    brand: 'Tesla',
    price: 3100,
    speed: 325,
    color: '#e2e8f0',
    assetPath: 'cars/tesla-model-s',
    description: 'Quái vật tăng tốc thuần điện Tesla Model S Plaid 3 mô-tơ điện bứt phá ngoạn mục.',
    dimensions: {
      frameWidth: 48,
      frameHeight: 40,
      bodyWidth: 36,
      bodyHeight: 24,
      contactY: 37,
    },
    mounting: {
      seat: { x: 24, y: 18 },
      hideAvatar: true,
    },
    lighting: {
      headlight: { dx: 20, dy: 18 },
      taillight: { dx: 18, dy: 18 },
    },
    showroomTheme: {
      accentColor: '#e2e8f0',
      badge: 'Quái vật điện Tri-Motor',
      spotlightIntensity: 0.95,
    },
  },

  // === 2 BACKWARD COMPATIBILITY MODELS ===
  car_mercedes: {
    id: 'car_mercedes',
    kind: 'car',
    name: 'Mercedes-AMG GT Coupe',
    brand: 'Mercedes-Benz',
    price: 2800,
    speed: 285,
    color: '#334155',
    assetPath: 'cars/mercedes-benz-g63',
    description: 'Siêu xe thể thao Mercedes-AMG GT Coupe thiết kế khí động học sắc sảo và sang trọng.',
    dimensions: {
      frameWidth: 48,
      frameHeight: 40,
      bodyWidth: 36,
      bodyHeight: 24,
      contactY: 37,
    },
    mounting: {
      seat: { x: 24, y: 18 },
      hideAvatar: true,
    },
    lighting: {
      headlight: { dx: 20, dy: 18 },
      taillight: { dx: 18, dy: 18 },
    },
    showroomTheme: {
      accentColor: '#334155',
      badge: 'Siêu xe thể thao AMG',
      spotlightIntensity: 0.95,
    },
  },
  car_sunset: {
    id: 'car_sunset',
    kind: 'car',
    name: 'Lamborghini Huracán Tecnica',
    brand: 'Lamborghini',
    price: 3200,
    speed: 300,
    color: '#ea580c',
    assetPath: 'cars/lamborghini-aventador',
    description: 'Siêu bò Lamborghini Huracán động cơ V10 hút khí tự nhiên, màu cam Arancio rực cháy.',
    dimensions: {
      frameWidth: 48,
      frameHeight: 40,
      bodyWidth: 38,
      bodyHeight: 22,
      contactY: 37,
    },
    mounting: {
      seat: { x: 24, y: 18 },
      hideAvatar: true,
    },
    lighting: {
      headlight: { dx: 20, dy: 18 },
      taillight: { dx: 18, dy: 18 },
    },
    showroomTheme: {
      accentColor: '#ea580c',
      badge: 'Siêu bò V10 Cam',
      spotlightIntensity: 1.0,
    },
  },
};

export const VEHICLE_ALIASES: Record<string, string> = {
  // Legacy aliases
  car_sunset: 'cars/lamborghini-aventador',
  car_mercedes: 'cars/mercedes-benz-g63',

  // Asset paths to canonical vehicle IDs
  'bicycles/trek-marlin-7': 'bicycle_sky',
  'motorcycles/vespa-primavera-150': 'motorcycle_coral',
  'motorcycles/ducati-panigale-v4': 'motorcycle_ducati',
  'motorcycles/honda-super-cub': 'motorcycle_honda_super_cub',
  'motorcycles/harley-davidson-fat-boy': 'motorcycle_harley_fat_boy',
  'motorcycles/kawasaki-ninja-h2': 'motorcycle_kawasaki_ninja_h2',
  'motorcycles/yamaha-yzf-r1': 'motorcycle_yamaha_r1',
  'motorcycles/bmw-r1250-gs': 'motorcycle_bmw_r1250_gs',
  'cars/mercedes-benz-g63': 'car_mint',
  'cars/lamborghini-aventador': 'car_lamborghini',
  'cars/porsche-911': 'car_porsche',
  'cars/toyota-supra-mk4': 'car_toyota_supra_mk4',
  'cars/ferrari-f40': 'car_ferrari_f40',
  'cars/ford-mustang': 'car_ford_mustang',
  'cars/rolls-royce-phantom': 'car_rolls_royce_phantom',
  'cars/tesla-model-s': 'car_tesla_model_s',

  // Directory slugs without category prefix to canonical vehicle IDs
  'trek-marlin-7': 'bicycle_sky',
  'vespa-primavera-150': 'motorcycle_coral',
  'ducati-panigale-v4': 'motorcycle_ducati',
  'honda-super-cub': 'motorcycle_honda_super_cub',
  'harley-davidson-fat-boy': 'motorcycle_harley_fat_boy',
  'kawasaki-ninja-h2': 'motorcycle_kawasaki_ninja_h2',
  'yamaha-yzf-r1': 'motorcycle_yamaha_r1',
  'bmw-r1250-gs': 'motorcycle_bmw_r1250_gs',
  'mercedes-benz-g63': 'car_mint',
  'lamborghini-aventador': 'car_lamborghini',
  'porsche-911': 'car_porsche',
  'toyota-supra-mk4': 'car_toyota_supra_mk4',
  'ferrari-f40': 'car_ferrari_f40',
  'ford-mustang': 'car_ford_mustang',
  'rolls-royce-phantom': 'car_rolls_royce_phantom',
  'tesla-model-s': 'car_tesla_model_s',
};

export const vehicleById = (id: string | null | undefined): VehicleDef | undefined => {
  if (!id) return undefined;
  if (Object.hasOwn(VEHICLES, id)) return VEHICLES[id];
  const aliasTarget = Object.hasOwn(VEHICLE_ALIASES, id) ? VEHICLE_ALIASES[id] : undefined;
  if (aliasTarget) {
    if (Object.hasOwn(VEHICLES, aliasTarget)) return VEHICLES[aliasTarget];
    const chained = Object.hasOwn(VEHICLE_ALIASES, aliasTarget) ? VEHICLE_ALIASES[aliasTarget] : undefined;
    if (chained && Object.hasOwn(VEHICLES, chained)) return VEHICLES[chained];
  }
  return undefined;
};

/** Shared by road art, prediction and authoritative traffic enforcement. */
export const TOWN_ROADS: Rect[] = [
  { x: 32, y: 332, w: 1472, h: 40 },
  { x: 332, y: 320, w: 40, h: 576 },
  { x: 1036, y: 320, w: 72, h: 576 },
  { x: 96, y: 844, w: 1024, h: 40 },
];
export const DEALER_DRIVEWAY: Rect = { x: 584, y: 788, w: 80, h: 58 };
export const SHOWROOM = { width: 640, height: 480, spawn: { x: 320, y: 416 } };
export interface ShowroomPedestalDef {
  index: number;
  name: string;
  category: string;
  x: number;
  y: number;
  vehicles: readonly string[];
}

export const SHOWROOM_PEDESTALS: readonly ShowroomPedestalDef[] = [
  {
    index: 0,
    name: 'Bục Tây Bắc',
    category: 'Siêu xe',
    x: 168,
    y: 156,
    vehicles: ['car_ferrari_f40', 'car_lamborghini', 'car_porsche', 'car_toyota_supra_mk4'] as const,
  },
  {
    index: 1,
    name: 'Bục Đông Bắc',
    category: 'Xe sang & Cơ bắp',
    x: 472,
    y: 156,
    vehicles: ['car_rolls_royce_phantom', 'car_mint', 'car_ford_mustang', 'car_tesla_model_s'] as const,
  },
  {
    index: 2,
    name: 'Bục Tây Nam',
    category: 'Mô tô PKL',
    x: 168,
    y: 308,
    vehicles: [
      'motorcycle_ducati',
      'motorcycle_kawasaki_ninja_h2',
      'motorcycle_yamaha_r1',
      'motorcycle_bmw_r1250_gs',
    ] as const,
  },
  {
    index: 3,
    name: 'Bục Đông Nam',
    category: 'Xe phố & Xe đạp',
    x: 472,
    y: 308,
    vehicles: [
      'motorcycle_coral',
      'motorcycle_honda_super_cub',
      'motorcycle_harley_fat_boy',
      'bicycle_sky',
    ] as const,
  },
];

export const SHOWROOM_FEATURED_VEHICLES = SHOWROOM_PEDESTALS.map((p) => p.vehicles[0]!) as [
  string,
  string,
  string,
  string,
];

export const VEHICLE_DISPLAYS = SHOWROOM_PEDESTALS.map((p) => ({
  id: p.vehicles[0]!,
  x: p.x,
  y: p.y,
}));

export const SHOWROOM_BLOCKERS: Rect[] = [
  { x: 0, y: 0, w: 640, h: 72 },
  { x: 0, y: 0, w: 24, h: 480 },
  { x: 616, y: 0, w: 24, h: 480 },
  { x: 0, y: 456, w: 640, h: 24 },
  ...VEHICLE_DISPLAYS.map(({ x, y }) => ({ x: x - 56, y: y - 26, w: 112, h: 52 })),
];

export const getPedestalForPosition = (x: number, y: number): ShowroomPedestalDef | null =>
  SHOWROOM_PEDESTALS.find((p) => Math.hypot(x - p.x, y - p.y) <= 100) ?? null;

export const showroomDisplayAt = (x: number, y: number, activeOverrides?: Record<number, string>) => {
  const pedestal = getPedestalForPosition(x, y);
  if (!pedestal) return null;
  return activeOverrides?.[pedestal.index] ?? pedestal.vehicles[0] ?? null;
};
export const onRoad = (x: number, y: number) =>
  TOWN_ROADS.some((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
export const onDriveway = (x: number, y: number) =>
  x >= DEALER_DRIVEWAY.x &&
  x <= DEALER_DRIVEWAY.x + DEALER_DRIVEWAY.w &&
  y >= DEALER_DRIVEWAY.y &&
  y <= DEALER_DRIVEWAY.y + DEALER_DRIVEWAY.h;
export const drivingSpeed = (id: string, x: number, y: number, allowOffRoad = false) =>
  allowOffRoad || onRoad(x, y) ? (vehicleById(id)?.speed ?? 150) : 90;

export const INTERSECTIONS = [
  { id: 'west', x: 352, y: 352, halfW: 20, halfH: 20 },
  { id: 'east', x: 1072, y: 352, halfW: 36, halfH: 20 },
  { id: 'south-west', x: 352, y: 864, halfW: 20, halfH: 20 },
  { id: 'south-east', x: 1072, y: 864, halfW: 36, halfH: 20 },
] as const;
export type Signal = 'red' | 'yellow' | 'green';
export function trafficSignal(now: number, axis: 'horizontal' | 'vertical'): Signal {
  const phase = ((now % 28000) + 28000) % 28000;
  const local = axis === 'horizontal' ? phase : (phase + 14000) % 28000;
  return local < 10000 ? 'green' : local < 12000 ? 'yellow' : 'red';
}
export type TrafficViolation = 'red_light' | 'off_road';
export const TRAFFIC_FINES: Record<TrafficViolation, number> = { red_light: 80, off_road: 40 };
export const TRAFFIC_LABELS: Record<TrafficViolation, string> = {
  red_light: 'Vượt đèn đỏ',
  off_road: 'Lái xe ngoài lòng đường',
};

/** Entry across a stop line, with interpolation to reject unrelated diagonal crossings. */
export function redLightCrossing(
  from: { x: number; y: number },
  to: { x: number; y: number },
  now: number,
): string | null {
  for (const junction of INTERSECTIONS) {
    for (const axis of ['horizontal', 'vertical'] as const) {
      if (trafficSignal(now, axis) !== 'red') continue;
      const horizontal = axis === 'horizontal';
      const a = horizontal ? from.x : from.y;
      const b = horizontal ? to.x : to.y;
      const center = horizontal ? junction.x : junction.y;
      const half = horizontal ? junction.halfW : junction.halfH;
      const otherCenter = horizontal ? junction.y : junction.x;
      const otherHalf = horizontal ? junction.halfH : junction.halfW;
      const line = b > a ? center - half - 6 : center + half + 6;
      if (!((a < line && b >= line) || (a > line && b <= line))) continue;
      if ((b > a && a > center) || (b < a && a < center)) continue;
      const ratio = (line - a) / (b - a);
      const lateral = horizontal ? from.y + (to.y - from.y) * ratio : from.x + (to.x - from.x) * ratio;
      if (Math.abs(lateral - otherCenter) <= otherHalf) return junction.id;
    }
  }
  return null;
}
