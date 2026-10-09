export type VehicleKind = 'bicycle' | 'motorcycle' | 'car';

export interface VehicleSpec {
  id: string;
  category: VehicleKind;
  brand: string;
  name: string;
  price: number;
  speed: number;
  color?: string;
  bodyWidth: number;
  contactY: number;
  seat: { x: number; y: number };
  lights: {
    frontOffsetX: number;
    frontOffsetY: number;
    rearOffsetX: number;
    rearOffsetY: number;
  };
  assetPath: string;
  aliases?: string[];
}

export interface SpritesheetSpec {
  totalWidth: number;
  totalHeight: number;
  frameWidth: number;
  frameHeight: number;
  cols: number;
  rows: number;
  directions: ['down', 'left', 'right', 'up'];
  frames: ['idle', 'drive_1', 'drive_2', 'drive_3'];
}

export interface PlayerVehicleMountState {
  playerId: string;
  vehicleId: string;
  driving: boolean;
  ridingTwoWheeler: boolean;
  avatarVisible: boolean;
  cropRect: { x: number; y: number; w: number; h: number } | null;
  spriteOffsetY: number;
  vehicleSpriteVisible: boolean;
}

export interface RaytraceLightResult {
  direction: number;
  frontX: number;
  frontY: number;
  rearX: number;
  rearY: number;
  beamAngle: number;
  beamActive: boolean;
  bulbOffsets: number[];
}
