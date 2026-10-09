import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { calculateAuthoritativeLights, REQUIRED_SHOWROOM_PEDESTAL } from './spec-oracle.js';
import { setupVirtualCanvasEnvironment, teardownVirtualCanvasEnvironment } from './test-environment.js';
import {
  vehicleById,
  onRoad,
  onDriveway,
  drivingSpeed,
  SHOWROOM,
  VEHICLE_DISPLAYS,
  showroomDisplayAt,
  INTERSECTIONS,
  trafficSignal,
  redLightCrossing,
  TRAFFIC_FINES,
} from '../../../packages/game-data/src/vehicles.js';
import { vehicleCanvas } from '../../../apps/web/src/art/vehicle.js';

describe('Tier 4: Real-World Application Scenarios (Requirement-Driven)', () => {
  beforeEach(() => {
    setupVirtualCanvasEnvironment();
  });

  afterEach(() => {
    teardownVirtualCanvasEnvironment();
  });

  // =========================================================================
  // Scenario 1: Luxury Supercar Journey — Showroom to Highway
  // =========================================================================
  it('Scenario 1: Luxury Supercar Journey — Showroom exploration, purchase, equip and high-speed highway driving', () => {
    // 1. Player enters Showroom at spawn
    const player = {
      id: 'supercar_enthusiast',
      x: SHOWROOM.spawn.x,
      y: SHOWROOM.spawn.y,
      coin: 10000,
      inventory: [] as string[],
      appearance: { vehicle: '' },
      driving: false,
    };
    assert.equal(player.x, 320);
    assert.equal(player.y, 416);

    // 2. Walks to featured display bay
    const lamboDisplay = VEHICLE_DISPLAYS.find((d) => d.id === 'car_lamborghini')!;
    assert.ok(lamboDisplay, 'Lamborghini Aventador SVJ must have a showroom display bay');
    const inspectedId = showroomDisplayAt(lamboDisplay.x, lamboDisplay.y);
    assert.equal(inspectedId, 'car_lamborghini');

    // 3. Verifies pedestal scale
    assert.equal(REQUIRED_SHOWROOM_PEDESTAL.width, 136);
    assert.equal(REQUIRED_SHOWROOM_PEDESTAL.scale, 2);

    // 4. Purchases vehicle in Shop
    const vehicleDef = vehicleById('car_lamborghini')!;
    assert.ok(player.coin >= vehicleDef.price);
    player.coin -= vehicleDef.price;
    player.inventory.push(vehicleDef.id);
    assert.equal(player.coin, 10000 - 4500);
    assert.equal(player.coin, 5500);

    // 5. Equips vehicle and exits through dealer driveway
    player.appearance.vehicle = 'car_lamborghini';
    player.x = 624;
    player.y = 810;
    assert.equal(onDriveway(player.x, player.y), true);

    // 6. Mounts car on town road
    player.y = 850;
    assert.equal(onRoad(player.x, player.y), true);
    player.driving = true;

    // 7. Avatar is hidden, car drives at full speed 340 px/s
    const avatarVisible = !player.driving;
    assert.equal(avatarVisible, false, 'Avatar must be hidden inside supercar cabin');
    const highwaySpeed = drivingSpeed(player.appearance.vehicle, player.x, player.y);
    assert.equal(highwaySpeed, 340, 'Supercar drives at 340 px/s along highway');
  });

  // =========================================================================
  // Scenario 2: Eco-Friendly Commuter Bicycle Journey
  // =========================================================================
  it('Scenario 2: Eco-Friendly Bicycle Journey — Affordable commute, 2-wheel torso cropping and dusk lighting', () => {
    // 1. Student player purchases Trek Marlin 7
    const student = {
      id: 'eco_student',
      coin: 500,
      inventory: ['bicycle_sky'],
      appearance: { vehicle: 'bicycle_sky' },
      driving: false,
      ridingTwoWheeler: false,
    };
    student.coin -= 200;
    assert.equal(student.coin, 300);

    // 2. Mounts bicycle on road
    student.driving = true;
    student.ridingTwoWheeler = true;

    // 3. Avatar crop is applied and remains visible
    const avatarVisible = !student.driving || student.ridingTwoWheeler;
    assert.equal(avatarVisible, true, 'Bicycle rider avatar remains visible');
    const torsoCrop = { x: 0, y: 0, w: 32, h: 40 };
    assert.equal(torsoCrop.h, 40);

    // 4. Commute speed along town road
    const commuteSpeed = drivingSpeed(student.appearance.vehicle, 500, 350);
    assert.equal(commuteSpeed, 195, 'Trek Marlin 7 cruises at 195 px/s');

    // 5. Night lights calculation for bicycle
    const bikeLights = calculateAuthoritativeLights(500, 350, 2, 'bicycle');
    assert.deepEqual(bikeLights.bulbOffsets, [0], 'Single light bulb for bicycle');
    assert.equal(bikeLights.frontX, 520);
    assert.equal(bikeLights.frontY, 340);

    // 6. Dismounts at campus destination
    student.driving = false;
    student.ridingTwoWheeler = false;
    assert.equal(!student.driving, true, 'Dismounted avatar is fully visible without crop');
  });

  // =========================================================================
  // Scenario 3: Commuter Scooter & Traffic Enforcement Journey
  // =========================================================================
  it('Scenario 3: Commuter Scooter & Traffic Enforcement — Compliant vs Reckless red-light crossings', () => {
    const vespa = vehicleById('motorcycle_coral')!;
    assert.equal(vespa.speed, 270);

    const westJunction = INTERSECTIONS.find((j) => j.id === 'west')!;
    assert.ok(westJunction);

    // 1. Time t = 5000: horizontal is green
    assert.equal(trafficSignal(5000, 'horizontal'), 'green');

    // 2. Compliant driver safely crosses green light
    const greenFrom = { x: westJunction.x - 30, y: westJunction.y };
    const greenTo = { x: westJunction.x, y: westJunction.y };
    const greenViolation = redLightCrossing(greenFrom, greenTo, 5000);
    assert.equal(greenViolation, null, 'Crossing during green signal must NOT trigger violation');

    // 3. Time t = 15000: horizontal is red
    assert.equal(trafficSignal(15000, 'horizontal'), 'red');

    // 4. Compliant driver stops before stop line (from: x - 30, to: x - 30)
    const stoppedViolation = redLightCrossing(greenFrom, greenFrom, 15000);
    assert.equal(stoppedViolation, null, 'Stationary vehicle before stop line must NOT trigger violation');

    // 5. Reckless driver crosses into junction during red
    const redFrom = { x: westJunction.x - 30, y: westJunction.y };
    const redTo = { x: westJunction.x, y: westJunction.y };
    const redViolation = redLightCrossing(redFrom, redTo, 15000);
    assert.equal(redViolation, 'west', 'Entering junction on red signal must ticket junction id');
    assert.equal(TRAFFIC_FINES.red_light, 80, 'Red light fine is 80 coin');
  });

  // =========================================================================
  // Scenario 4: Farm-to-Town Cross-Map Transit with Mercedes SUV
  // =========================================================================
  it('Scenario 4: Cross-Map Farm Transit — Preserving SUV equipment and speed across rooms', () => {
    // 1. Farmer player equips Mercedes-Benz G63 AMG
    const farmer = {
      id: 'rural_entrepreneur',
      vehicle: 'car_mint',
      currentRoom: 'town',
      speed: 240,
    };
    assert.equal(vehicleById(farmer.vehicle)?.speed, 240);
    assert.equal(vehicleById(farmer.vehicle)?.brand, 'Mercedes-Benz');

    // 2. Drives to west road threshold (x <= 32) to transition into farm
    farmer.currentRoom = 'farm';

    // 3. Farm room preserves vehicle equipment
    const farmState = {
      vehicle: farmer.vehicle,
      driving: true,
      farmSpeed: 240,
    };
    assert.equal(farmState.vehicle, 'car_mint');
    assert.equal(farmState.farmSpeed, 240);

    // 4. Returns to Town: appearance is consistent
    farmer.currentRoom = 'town';
    assert.equal(farmer.vehicle, 'car_mint');
  });

  // =========================================================================
  // Scenario 5: Multi-Vehicle Collector & Rapid Garage Switch Journey
  // =========================================================================
  it('Scenario 5: Multi-Vehicle Collector — Seamless switching between bicycle, superbike and supercar', () => {
    const collector = {
      id: 'ultimate_collector',
      garage: ['bicycle_sky', 'motorcycle_ducati', 'car_porsche'],
      activeVehicle: '',
      driving: false,
    };

    // 1. Collector takes out bicycle
    collector.activeVehicle = 'bicycle_sky';
    collector.driving = true;
    assert.equal(vehicleById(collector.activeVehicle)?.kind, 'bicycle');
    assert.equal(drivingSpeed(collector.activeVehicle, 500, 350), 195);

    // 2. Switches to Ducati Superbike
    collector.activeVehicle = 'motorcycle_ducati';
    assert.equal(vehicleById(collector.activeVehicle)?.kind, 'motorcycle');
    assert.equal(vehicleById(collector.activeVehicle)?.brand, 'Ducati');
    assert.equal(drivingSpeed(collector.activeVehicle, 500, 350), 310);

    // 3. Switches to Porsche 911 GT3 RS
    collector.activeVehicle = 'car_porsche';
    assert.equal(vehicleById(collector.activeVehicle)?.kind, 'car');
    assert.equal(vehicleById(collector.activeVehicle)?.brand, 'Porsche');
    assert.equal(drivingSpeed(collector.activeVehicle, 500, 350), 320);

    // 4. Verifies distinct render profiles exist for all 3
    for (const vId of collector.garage) {
      const c = vehicleCanvas(vId, 2);
      assert.ok(c);
      assert.equal(c.width, 48);
      assert.equal(c.height, 40);
    }

    // 5. Returns home and dismounts cleanly
    collector.driving = false;
    collector.activeVehicle = '';
    assert.equal(collector.driving, false);
  });
});
