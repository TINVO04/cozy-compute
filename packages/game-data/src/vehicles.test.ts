import { describe, expect, it } from 'vitest';
import {
  CANONICAL_VEHICLE_IDS,
  DEALER_DRIVEWAY,
  INTERSECTIONS,
  SHOWROOM,
  SHOWROOM_BLOCKERS,
  SHOWROOM_FEATURED_VEHICLES,
  TOWN_ROADS,
  TRAFFIC_FINES,
  TRAFFIC_LABELS,
  VEHICLE_ALIASES,
  VEHICLE_DISPLAYS,
  VEHICLES,
  drivingSpeed,
  onDriveway,
  onRoad,
  redLightCrossing,
  showroomDisplayAt,
  trafficSignal,
  vehicleById,
} from './vehicles.js';
import { sanitizeAppearance, stepMovement } from './index.js';

describe('vehicles and traffic', () => {
  it('never has opposing green signals and provides yellow and all-red clearance', () => {
    for (let t = 0; t < 56000; t += 100) {
      expect(
        [trafficSignal(t, 'horizontal'), trafficSignal(t, 'vertical')].filter((s) => s === 'green'),
      ).toHaveLength(t % 14000 < 10000 ? 1 : 0);
    }
    expect(trafficSignal(10500, 'horizontal')).toBe('yellow');
    expect(trafficSignal(12500, 'vertical')).toBe('red');
  });

  it('tickets entry on red in all four directions, never exit or stationary vehicles', () => {
    for (const j of INTERSECTIONS) {
      for (const side of [-1, 1]) {
        const from = { x: j.x + side * (j.halfW + 10), y: j.y };
        const to = { x: j.x + side * j.halfW, y: j.y };
        expect(redLightCrossing(from, to, 15000)).toBe(j.id);
        expect(redLightCrossing(from, to, 5000)).toBeNull();
        expect(redLightCrossing(to, from, 15000)).toBeNull();
        expect(redLightCrossing(from, from, 15000)).toBeNull();
        const north = { x: j.x, y: j.y + side * (j.halfH + 10) };
        const inner = { x: j.x, y: j.y + side * j.halfH };
        expect(redLightCrossing(north, inner, 5000)).toBe(j.id);
        expect(redLightCrossing(north, inner, 15000)).toBeNull();
      }
    }
  });

  it('rejects spoofed ownership and slows down outside the road', () => {
    expect(vehicleById('__proto__')).toBeUndefined();
    expect(sanitizeAppearance({ vehicle: 'car_sunset' })).not.toHaveProperty('vehicle');
    expect(drivingSpeed('car_mint', 500, 350)).toBe(240);
    expect(drivingSpeed('car_sunset', 500, 350)).toBe(300);
    expect(drivingSpeed('car_sunset', 500, 450)).toBe(90);
    expect(drivingSpeed('car_sunset', 500, 450, true)).toBe(300);
    expect(vehicleById('motorcycle_ducati')?.brand).toBe('Ducati');
    expect(vehicleById('car_mercedes')?.brand).toBe('Mercedes-Benz');
    expect(vehicleById('car_lamborghini')?.brand).toBe('Lamborghini');
    expect(vehicleById('car_porsche')?.brand).toBe('Porsche');
    expect(drivingSpeed('motorcycle_ducati', 500, 350)).toBe(310);
    expect(drivingSpeed('car_lamborghini', 500, 350)).toBe(340);
  });

  it('fast cars cannot tunnel through thin walls during delayed frames', () => {
    const next = stepMovement({ x: 100, y: 100 }, { x: 1, y: 0 }, 0.25, {
      speed: 300,
      blockers: [{ x: 130, y: 70, w: 4, h: 60 }],
    });
    expect(next.x).toBeLessThanOrEqual(120);
  });

  it('contains all 16 canonical vehicle models with correct categorization and specs', () => {
    expect(CANONICAL_VEHICLE_IDS).toHaveLength(16);

    const canonicalDefs = CANONICAL_VEHICLE_IDS.map((id) => {
      const v = vehicleById(id);
      expect(v).toBeDefined();
      return v!;
    });

    const bicycles = canonicalDefs.filter((v) => v.kind === 'bicycle');
    const motorcycles = canonicalDefs.filter((v) => v.kind === 'motorcycle');
    const cars = canonicalDefs.filter((v) => v.kind === 'car');

    expect(bicycles).toHaveLength(1);
    expect(motorcycles).toHaveLength(7);
    expect(cars).toHaveLength(8);

    // Verify 1 Bicycle
    const bike = vehicleById('bicycle_sky')!;
    expect(bike.name).toBe('Trek Marlin 7 Gen 3');
    expect(bike.brand).toBe('Trek');
    expect(bike.price).toBe(200);
    expect(bike.speed).toBe(195);
    expect(bike.color).toBe('#0284c7');
    expect(bike.assetPath).toBe('bicycles/trek-marlin-7');

    // Verify 7 Motorcycles
    const expectedMotorcycles: Record<
      string,
      { name: string; brand: string; price: number; speed: number; color: string; assetPath: string }
    > = {
      motorcycle_coral: {
        name: 'Vespa Primavera 150',
        brand: 'Vespa',
        price: 700,
        speed: 270,
        color: '#f43f5e',
        assetPath: 'motorcycles/vespa-primavera-150',
      },
      motorcycle_ducati: {
        name: 'Ducati Panigale V4 S',
        brand: 'Ducati',
        price: 2400,
        speed: 310,
        color: '#dc2626',
        assetPath: 'motorcycles/ducati-panigale-v4',
      },
      motorcycle_honda_super_cub: {
        name: 'Honda Super Cub C125',
        brand: 'Honda',
        price: 500,
        speed: 220,
        color: '#0ea5e9',
        assetPath: 'motorcycles/honda-super-cub',
      },
      motorcycle_harley_fat_boy: {
        name: 'Harley-Davidson Fat Boy 114',
        brand: 'Harley-Davidson',
        price: 1600,
        speed: 250,
        color: '#71717a',
        assetPath: 'motorcycles/harley-davidson-fat-boy',
      },
      motorcycle_kawasaki_ninja_h2: {
        name: 'Kawasaki Ninja H2 Carbon',
        brand: 'Kawasaki',
        price: 3000,
        speed: 330,
        color: '#22c55e',
        assetPath: 'motorcycles/kawasaki-ninja-h2',
      },
      motorcycle_yamaha_r1: {
        name: 'Yamaha YZF-R1M',
        brand: 'Yamaha',
        price: 2600,
        speed: 315,
        color: '#2563eb',
        assetPath: 'motorcycles/yamaha-yzf-r1',
      },
      motorcycle_bmw_r1250_gs: {
        name: 'BMW R 1250 GS Adventure',
        brand: 'BMW',
        price: 2200,
        speed: 260,
        color: '#eab308',
        assetPath: 'motorcycles/bmw-r1250-gs',
      },
    };

    for (const [id, expected] of Object.entries(expectedMotorcycles)) {
      const moto = vehicleById(id)!;
      expect(moto).toBeDefined();
      expect(moto.name).toBe(expected.name);
      expect(moto.brand).toBe(expected.brand);
      expect(moto.price).toBe(expected.price);
      expect(moto.speed).toBe(expected.speed);
      expect(moto.color).toBe(expected.color);
      expect(moto.assetPath).toBe(expected.assetPath);
    }

    // Verify 8 Cars
    const expectedCars: Record<
      string,
      { name: string; brand: string; price: number; speed: number; color: string; assetPath: string }
    > = {
      car_mint: {
        name: 'Mercedes-Benz G63 AMG',
        brand: 'Mercedes-Benz',
        price: 1800,
        speed: 240,
        color: '#1b4332',
        assetPath: 'cars/mercedes-benz-g63',
      },
      car_lamborghini: {
        name: 'Lamborghini Aventador SVJ',
        brand: 'Lamborghini',
        price: 4500,
        speed: 340,
        color: '#eab308',
        assetPath: 'cars/lamborghini-aventador',
      },
      car_porsche: {
        name: 'Porsche 911 GT3 RS',
        brand: 'Porsche',
        price: 3600,
        speed: 320,
        color: '#0284c7',
        assetPath: 'cars/porsche-911',
      },
      car_toyota_supra_mk4: {
        name: 'Toyota Supra MK4 1994',
        brand: 'Toyota',
        price: 2500,
        speed: 290,
        color: '#f97316',
        assetPath: 'cars/toyota-supra-mk4',
      },
      car_ferrari_f40: {
        name: 'Ferrari F40 1987',
        brand: 'Ferrari',
        price: 4200,
        speed: 335,
        color: '#ef4444',
        assetPath: 'cars/ferrari-f40',
      },
      car_ford_mustang: {
        name: 'Ford Mustang Shelby GT500',
        brand: 'Ford',
        price: 2000,
        speed: 275,
        color: '#3b82f6',
        assetPath: 'cars/ford-mustang',
      },
      car_rolls_royce_phantom: {
        name: 'Rolls-Royce Phantom VIII',
        brand: 'Rolls-Royce',
        price: 5000,
        speed: 250,
        color: '#475569',
        assetPath: 'cars/rolls-royce-phantom',
      },
      car_tesla_model_s: {
        name: 'Tesla Model S Plaid',
        brand: 'Tesla',
        price: 3100,
        speed: 325,
        color: '#e2e8f0',
        assetPath: 'cars/tesla-model-s',
      },
    };

    for (const [id, expected] of Object.entries(expectedCars)) {
      const car = vehicleById(id)!;
      expect(car).toBeDefined();
      expect(car.name).toBe(expected.name);
      expect(car.brand).toBe(expected.brand);
      expect(car.price).toBe(expected.price);
      expect(car.speed).toBe(expected.speed);
      expect(car.color).toBe(expected.color);
      expect(car.assetPath).toBe(expected.assetPath);
    }
  });

  it('preserves backward compatibility for car_sunset and car_mercedes with exact properties', () => {
    expect(VEHICLES.car_sunset).toBeDefined();
    expect(VEHICLES.car_mercedes).toBeDefined();

    const sunset = vehicleById('car_sunset')!;
    expect(sunset).toBeDefined();
    expect(sunset.id).toBe('car_sunset');
    expect(sunset.speed).toBe(300);
    expect(sunset.price).toBe(3200);
    expect(sunset.brand).toBe('Lamborghini');

    const mercedes = vehicleById('car_mercedes')!;
    expect(mercedes).toBeDefined();
    expect(mercedes.id).toBe('car_mercedes');
    expect(mercedes.speed).toBe(285);
    expect(mercedes.price).toBe(2800);
    expect(mercedes.brand).toBe('Mercedes-Benz');

    expect(drivingSpeed('car_sunset', 500, 350)).toBe(300);
    expect(drivingSpeed('car_mercedes', 500, 350)).toBe(285);
    expect(drivingSpeed('car_mercedes', 500, 450)).toBe(90);
    expect(drivingSpeed('car_mercedes', 500, 450, true)).toBe(285);
  });

  it('exports VEHICLE_ALIASES and vehicleById resolves canonical IDs, path IDs, and aliases', () => {
    expect(VEHICLE_ALIASES).toBeDefined();
    expect(VEHICLE_ALIASES.car_sunset).toBe('cars/lamborghini-aventador');
    expect(VEHICLE_ALIASES.car_mercedes).toBe('cars/mercedes-benz-g63');

    // Resolves canonical IDs directly
    for (const id of CANONICAL_VEHICLE_IDS) {
      const resolved = vehicleById(id);
      expect(resolved).toBeDefined();
      expect(resolved?.id).toBe(id);
    }

    // Resolves full asset paths
    expect(vehicleById('bicycles/trek-marlin-7')?.id).toBe('bicycle_sky');
    expect(vehicleById('motorcycles/vespa-primavera-150')?.id).toBe('motorcycle_coral');
    expect(vehicleById('motorcycles/ducati-panigale-v4')?.id).toBe('motorcycle_ducati');
    expect(vehicleById('motorcycles/honda-super-cub')?.id).toBe('motorcycle_honda_super_cub');
    expect(vehicleById('motorcycles/harley-davidson-fat-boy')?.id).toBe('motorcycle_harley_fat_boy');
    expect(vehicleById('motorcycles/kawasaki-ninja-h2')?.id).toBe('motorcycle_kawasaki_ninja_h2');
    expect(vehicleById('motorcycles/yamaha-yzf-r1')?.id).toBe('motorcycle_yamaha_r1');
    expect(vehicleById('motorcycles/bmw-r1250-gs')?.id).toBe('motorcycle_bmw_r1250_gs');
    expect(vehicleById('cars/mercedes-benz-g63')?.id).toBe('car_mint');
    expect(vehicleById('cars/lamborghini-aventador')?.id).toBe('car_lamborghini');
    expect(vehicleById('cars/porsche-911')?.id).toBe('car_porsche');
    expect(vehicleById('cars/toyota-supra-mk4')?.id).toBe('car_toyota_supra_mk4');
    expect(vehicleById('cars/ferrari-f40')?.id).toBe('car_ferrari_f40');
    expect(vehicleById('cars/ford-mustang')?.id).toBe('car_ford_mustang');
    expect(vehicleById('cars/rolls-royce-phantom')?.id).toBe('car_rolls_royce_phantom');
    expect(vehicleById('cars/tesla-model-s')?.id).toBe('car_tesla_model_s');

    // Resolves folder slug aliases
    expect(vehicleById('trek-marlin-7')?.id).toBe('bicycle_sky');
    expect(vehicleById('ducati-panigale-v4')?.id).toBe('motorcycle_ducati');
    expect(vehicleById('tesla-model-s')?.id).toBe('car_tesla_model_s');

    // Handles null, undefined, unknown, and prototype injection cleanly
    expect(vehicleById(null)).toBeUndefined();
    expect(vehicleById(undefined)).toBeUndefined();
    expect(vehicleById('')).toBeUndefined();
    expect(vehicleById('nonexistent_vehicle')).toBeUndefined();
    expect(vehicleById('__proto__')).toBeUndefined();
    expect(vehicleById('toString')).toBeUndefined();
    expect(vehicleById('constructor')).toBeUndefined();
  });

  it('enforces rigorous geometry, mounting, and lighting contracts on all vehicle models', () => {
    const allVehicles = Object.values(VEHICLES);
    expect(allVehicles.length).toBeGreaterThanOrEqual(18);

    for (const v of allVehicles) {
      // Dimensions
      expect(v.dimensions).toBeDefined();
      expect(v.dimensions.frameWidth).toBe(48);
      expect(v.dimensions.frameHeight).toBe(40);
      expect(v.dimensions.bodyWidth).toBeLessThanOrEqual(40);
      expect(v.dimensions.bodyWidth).toBeGreaterThan(0);
      expect(v.dimensions.contactY).toBe(37);

      // Lighting geometry
      expect(v.lighting).toBeDefined();
      expect(v.lighting.headlight).toEqual({ dx: 20, dy: 18 });
      expect(v.lighting.taillight).toEqual({ dx: 18, dy: 18 });

      // Showroom theme
      expect(v.showroomTheme).toBeDefined();
      expect(v.showroomTheme?.accentColor).toMatch(/^#[0-9a-fA-F]{6}$/);

      // Mounting geometry
      expect(v.mounting).toBeDefined();
      if (v.kind === 'bicycle' || v.kind === 'motorcycle') {
        expect(v.mounting.seat.x).toBe(24);
        expect(v.mounting.seat.y).toBeGreaterThanOrEqual(16);
        expect(v.mounting.seat.y).toBeLessThanOrEqual(20);
        expect(v.mounting.hideAvatar).toBe(false);
        expect(v.mounting.cropAvatar).toEqual({ x: 0, y: 0, width: 32, height: 40 });
        expect(v.mounting.avatarOffsetY).toBe(-4);
      } else if (v.kind === 'car') {
        expect(v.mounting.hideAvatar).toBe(true);
      }
    }
  });

  it('calculates driving speed correctly across new models and aliases', () => {
    expect(drivingSpeed('car_tesla_model_s', 500, 350)).toBe(325);
    expect(drivingSpeed('car_tesla_model_s', 500, 450)).toBe(90);
    expect(drivingSpeed('car_tesla_model_s', 500, 450, true)).toBe(325);

    expect(drivingSpeed('motorcycle_kawasaki_ninja_h2', 500, 350)).toBe(330);
    expect(drivingSpeed('bicycle_sky', 500, 350)).toBe(195);
    expect(drivingSpeed('car_rolls_royce_phantom', 500, 350)).toBe(250);

    // Speed calculation using path alias
    expect(drivingSpeed('cars/tesla-model-s', 500, 350)).toBe(325);
    expect(drivingSpeed('motorcycles/kawasaki-ninja-h2', 500, 350)).toBe(330);
    expect(drivingSpeed('bicycles/trek-marlin-7', 500, 350)).toBe(195);
  });

  it('maintains town road layout, showroom plinths, and traffic fine standards', () => {
    expect(TOWN_ROADS).toHaveLength(4);
    for (const road of TOWN_ROADS) {
      expect(road.w === 40 || road.h === 40 || road.w === 72).toBe(true);
    }

    expect(SHOWROOM.width).toBe(640);
    expect(SHOWROOM.height).toBe(480);
    expect(SHOWROOM.spawn).toEqual({ x: 320, y: 416 });

    expect(SHOWROOM_FEATURED_VEHICLES).toHaveLength(4);
    for (const id of SHOWROOM_FEATURED_VEHICLES) {
      expect(vehicleById(id)).toBeDefined();
    }

    expect(VEHICLE_DISPLAYS).toHaveLength(4);
    for (const d of VEHICLE_DISPLAYS) {
      expect(showroomDisplayAt(d.x, d.y)).toBe(d.id);
    }

    expect(SHOWROOM_BLOCKERS.length).toBeGreaterThan(4);
    expect(onRoad(500, 350)).toBe(true);
    expect(onRoad(500, 450)).toBe(false);
    expect(onDriveway(DEALER_DRIVEWAY.x + 5, DEALER_DRIVEWAY.y + 5)).toBe(true);

    expect(TRAFFIC_FINES.red_light).toBe(80);
    expect(TRAFFIC_FINES.off_road).toBe(40);
    expect(TRAFFIC_LABELS.red_light).toBe('Vượt đèn đỏ');
    expect(TRAFFIC_LABELS.off_road).toBe('Lái xe ngoài lòng đường');
  });
});
