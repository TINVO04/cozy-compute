import assert from 'node:assert/strict';
import {
  resolveVehicleAssetPath,
  getVehicleSpritesheetUrl,
  getVehiclePreviewUrl,
  getVehicleIconUrl,
  getVehicleMetaUrl,
  isVehicleSpritesheetLoaded,
  getCachedVehicleSpritesheet,
  setCachedVehicleSpritesheet,
  clearVehicleAssetCache,
  ensureVehicleTexture,
} from '../../../apps/web/src/art/vehicle-loader.js';
import { vehicleCanvas } from '../../../apps/web/src/art/vehicle.js';
import { CANONICAL_VEHICLE_IDS, vehicleById } from '../../../packages/game-data/src/vehicles.js';
import {
  setupVirtualCanvasEnvironment,
  teardownVirtualCanvasEnvironment,
  createMockPhaserScene,
} from '../../../tests/e2e/vehicles/test-environment.js';

console.log('Running worker_m2 isolated verification...');
setupVirtualCanvasEnvironment();

try {
  // 1. Verify path resolution for all 16 canonical models
  for (const id of CANONICAL_VEHICLE_IDS) {
    const path = resolveVehicleAssetPath(id);
    assert.ok(path, `Path must resolve for canonical vehicle ID ${id}`);
    const def = vehicleById(id);
    assert.equal(path, def.assetPath);
    assert.equal(getVehicleSpritesheetUrl(id), `/vehicles/${path}/spritesheet.png`);
    assert.equal(getVehiclePreviewUrl(id), `/vehicles/${path}/preview.png`);
    assert.equal(getVehicleIconUrl(id), `/vehicles/${path}/icon.png`);
    assert.equal(getVehicleMetaUrl(id), `/vehicles/${path}/meta.json`);
  }

  // 2. Verify aliases
  assert.equal(resolveVehicleAssetPath('car_sunset'), 'cars/lamborghini-aventador');
  assert.equal(resolveVehicleAssetPath('car_mercedes'), 'cars/mercedes-benz-g63');
  assert.equal(resolveVehicleAssetPath('trek-marlin-7'), 'bicycles/trek-marlin-7');
  assert.equal(resolveVehicleAssetPath('bicycles/trek-marlin-7'), 'bicycles/trek-marlin-7');

  // 3. Security: traversal rejection
  assert.equal(resolveVehicleAssetPath('../../../etc/passwd'), null);
  assert.equal(resolveVehicleAssetPath('cars/../../shadow'), null);
  assert.equal(resolveVehicleAssetPath('/absolute/path'), null);
  assert.equal(resolveVehicleAssetPath(''), null);
  assert.equal(resolveVehicleAssetPath('   '), null);

  // 4. Procedural canvas for all 16 vehicles across all 4 directions and frames
  for (const id of CANONICAL_VEHICLE_IDS) {
    for (const dir of [0, 1, 2, 3]) {
      for (const frame of [0, 1, 2, 3]) {
        const c = vehicleCanvas(id, dir, frame);
        assert.ok(c, `Canvas must exist for ${id} dir=${dir} frame=${frame}`);
        assert.equal(c.width, 48);
        assert.equal(c.height, 40);
      }
    }
  }

  // 5. Fallback for unknown / empty IDs
  const fallbackCanvas = vehicleCanvas('unknown_super_car');
  assert.ok(fallbackCanvas);
  assert.equal(fallbackCanvas.width, 48);
  assert.equal(fallbackCanvas.height, 40);

  // 6. Synchronous ensureVehicleTexture lifecycle and caching
  const scene = createMockPhaserScene();
  const key1 = ensureVehicleTexture(scene, 'car_mint', 2, 0);
  assert.equal(key1, 'vehicle:car_mint:2:0');
  assert.ok(scene.textures.exists(key1));

  // Second call must return existing key without recreation
  const key2 = ensureVehicleTexture(scene, 'car_mint', 2, 0);
  assert.equal(key2, key1);

  // 7. Simulated in-place texture upgrade with mock spritesheet
  clearVehicleAssetCache();
  assert.equal(isVehicleSpritesheetLoaded('car_lamborghini'), false);

  const mockImage = {
    width: 192,
    height: 160,
  };
  setCachedVehicleSpritesheet('car_lamborghini', mockImage);
  assert.equal(isVehicleSpritesheetLoaded('car_lamborghini'), true);
  assert.equal(getCachedVehicleSpritesheet('car_lamborghini'), mockImage);

  // Calling ensureVehicleTexture with cached image uses blitFrame onto canvas directly
  const keyLambo = ensureVehicleTexture(scene, 'car_lamborghini', 1, 2);
  assert.equal(keyLambo, 'vehicle:car_lamborghini:1:2');
  assert.ok(scene.textures.exists(keyLambo));

  clearVehicleAssetCache();
  assert.equal(isVehicleSpritesheetLoaded('car_lamborghini'), false);

  console.log('Worker_m2 isolated verification PASSED successfully!');
} finally {
  teardownVirtualCanvasEnvironment();
}
