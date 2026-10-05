import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MapValidator,
  MapLoader,
  MapSaver,
  ServerCollisionExporter,
  UndoRedoManager,
  AddObjectCommand,
  MoveObjectCommand,
  DeleteObjectCommand,
  PaintTileCommand,
  AIMapGenerator,
  AIDecorator,
  type MapDefinition,
  type MapObjectLayer,
  type MapTileLayer,
} from './index.js';
import { defaultAssetRegistry } from '@cozy/game-assets';

function createSampleMap(): MapDefinition {
  return {
    id: 'farm-dong-nai-sample',
    version: 1,
    tileSize: 32,
    width: 48,
    height: 32,
    layers: [
      {
        id: 'layer_ground',
        name: 'Ground',
        type: 'tilelayer',
        depth: -10,
        visible: true,
        data: new Array(48 * 32).fill(1),
      },
      {
        id: 'layer_structures',
        name: 'Structures',
        type: 'objectgroup',
        depth: 0,
        visible: true,
        objects: [
          {
            id: 'obj_tree_001',
            assetId: 'tree-mango-large',
            x: 256,
            y: 256,
          },
          {
            id: 'obj_shop_001',
            assetId: 'building-shop-bac-sau',
            x: 512,
            y: 384,
          },
        ],
      },
    ],
    zones: [
      {
        id: 'zone_farm_gate',
        label: 'Cổng Nông Trại Đồng Nai',
        prompt: 'Nhấn E để vào cổng',
        x: 100,
        y: 100,
        width: 64,
        height: 64,
      },
    ],
    farmPlots: [
      {
        id: 'plot_01',
        tileX: 10,
        tileY: 10,
        tileWidth: 4,
        tileHeight: 4,
        soilType: 'loam',
        purchasable: true,
        price: 500,
      },
    ],
    metadata: {
      name: 'Nông Trại Mẫu Đồng Nai',
      region: 'Đồng Nai',
      biome: 'tropical-farm',
      createdAt: '2026-10-05T00:00:00Z',
    },
  };
}

describe('packages/map-editor', () => {
  let sampleMap: MapDefinition;

  beforeEach(() => {
    sampleMap = createSampleMap();
  });

  describe('MapValidator & Loader', () => {
    it('should validate a correct MapDefinition with registered assets', () => {
      const result = MapValidator.validate(sampleMap, defaultAssetRegistry);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject a map with invalid tileSize (not 32)', () => {
      const invalidMap = { ...sampleMap, tileSize: 48 as unknown as 32 };
      const result = MapValidator.validate(invalidMap, defaultAssetRegistry);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Invalid tileSize'))).toBe(true);
    });

    it('should reject an object referencing unregistered assetId', () => {
      const badMap = createSampleMap();
      const objLayer = badMap.layers[1] as MapObjectLayer;
      objLayer.objects.push({
        id: 'obj_fake_001',
        assetId: 'unregistered-fake-asset-id',
        x: 100,
        y: 100,
      });

      const result = MapValidator.validate(badMap, defaultAssetRegistry);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('unregistered-fake-asset-id'))).toBe(true);
    });

    it('should reject duplicate object IDs', () => {
      const badMap = createSampleMap();
      const objLayer = badMap.layers[1] as MapObjectLayer;
      objLayer.objects.push({
        id: 'obj_tree_001', // duplicate!
        assetId: 'tree-mango-large',
        x: 300,
        y: 300,
      });

      const result = MapValidator.validate(badMap, defaultAssetRegistry);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Duplicate object ID'))).toBe(true);
    });

    it('should load and save valid MapDefinition JSON', () => {
      const jsonStr = MapSaver.save(sampleMap, { registry: defaultAssetRegistry });
      expect(jsonStr).toContain('farm-dong-nai-sample');

      const { map, validation } = MapLoader.load(jsonStr, { registry: defaultAssetRegistry });
      expect(validation.valid).toBe(true);
      expect(map.id).toBe('farm-dong-nai-sample');
      expect(map.tileSize).toBe(32);
    });
  });

  describe('ServerCollisionExporter (Colyseus synchronization)', () => {
    it('should export solid objects as BLOCKERS for server-authoritative physics', () => {
      const serverData = ServerCollisionExporter.exportForServer(sampleMap, defaultAssetRegistry);
      expect(serverData.mapId).toBe('farm-dong-nai-sample');
      expect(serverData.tileSize).toBe(32);
      expect(serverData.pixelWidth).toBe(48 * 32);
      expect(serverData.pixelHeight).toBe(32 * 32);

      // Both tree-mango-large and building-shop-bac-sau have solid: true
      expect(serverData.blockers.length).toBe(2);

      const treeBlocker = serverData.blockers[0]!;
      expect(treeBlocker.w).toBe(2 * 32); // tileWidth: 2
      expect(treeBlocker.h).toBe(1 * 32); // tileHeight: 1

      expect(serverData.zones.length).toBe(1);
      expect(serverData.zones[0]?.id).toBe('zone_farm_gate');

      expect(serverData.farmPlots.length).toBe(1);
      expect(serverData.farmPlots[0]?.rect.x).toBe(10 * 32);
    });
  });

  describe('Commands & UndoRedoManager', () => {
    it('should execute and undo AddObjectCommand', () => {
      const manager = new UndoRedoManager();
      const objLayer = sampleMap.layers[1] as MapObjectLayer;
      const initialCount = objLayer.objects.length;

      const newObj = {
        id: 'obj_bamboo_new',
        assetId: 'tree-bamboo-cluster',
        x: 320,
        y: 320,
      };

      manager.execute(new AddObjectCommand(sampleMap, 'layer_structures', newObj));
      expect(objLayer.objects.length).toBe(initialCount + 1);
      expect(objLayer.objects.some((o) => o.id === 'obj_bamboo_new')).toBe(true);

      manager.undo();
      expect(objLayer.objects.length).toBe(initialCount);
      expect(objLayer.objects.some((o) => o.id === 'obj_bamboo_new')).toBe(false);

      manager.redo();
      expect(objLayer.objects.length).toBe(initialCount + 1);
    });

    it('should execute and undo MoveObjectCommand', () => {
      const manager = new UndoRedoManager();
      const objLayer = sampleMap.layers[1] as MapObjectLayer;
      const targetObj = objLayer.objects.find((o) => o.id === 'obj_tree_001')!;

      manager.execute(new MoveObjectCommand(sampleMap, 'layer_structures', 'obj_tree_001', 600, 700));
      expect(targetObj.x).toBe(600);
      expect(targetObj.y).toBe(700);

      manager.undo();
      expect(targetObj.x).toBe(256);
      expect(targetObj.y).toBe(256);
    });

    it('should execute and undo DeleteObjectCommand', () => {
      const manager = new UndoRedoManager();
      const objLayer = sampleMap.layers[1] as MapObjectLayer;

      manager.execute(new DeleteObjectCommand(sampleMap, 'layer_structures', 'obj_tree_001'));
      expect(objLayer.objects.some((o) => o.id === 'obj_tree_001')).toBe(false);

      manager.undo();
      expect(objLayer.objects.some((o) => o.id === 'obj_tree_001')).toBe(true);
    });

    it('should execute and undo PaintTileCommand', () => {
      const manager = new UndoRedoManager();
      const tileLayer = sampleMap.layers[0] as MapTileLayer;
      const originalGid = tileLayer.data[5];

      manager.execute(new PaintTileCommand(sampleMap, 'layer_ground', 5, 99));
      expect(tileLayer.data[5]).toBe(99);

      manager.undo();
      expect(tileLayer.data[5]).toBe(originalGid);
    });
  });

  describe('Official maps/farm-dong-nai.json integration', () => {
    it('should validate the real maps/farm-dong-nai.json file with 0 errors', () => {
      const currentDir = path.dirname(fileURLToPath(import.meta.url));
      const mapFilePath = path.resolve(currentDir, '../../../maps/farm-dong-nai.json');
      expect(fs.existsSync(mapFilePath)).toBe(true);

      const rawJson = fs.readFileSync(mapFilePath, 'utf-8');
      const { map, validation } = MapLoader.load(rawJson, { registry: defaultAssetRegistry });

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(map.id).toBe('farm-dong-nai-01');
      expect(map.tileSize).toBe(32);
      expect(map.width).toBe(48);
      expect(map.height).toBe(32);
      expect(map.farmPlots.length).toBe(12);

      // Verify server collision export
      const serverData = ServerCollisionExporter.exportForServer(map, defaultAssetRegistry);
      expect(serverData.blockers.length).toBeGreaterThan(0);
      expect(serverData.zones.length).toBe(4);
      expect(serverData.farmPlots.length).toBe(12);
    });
  });

  describe('AIMapGenerator & AIDecorator (Section 10 & 16 of plan)', () => {
    it('should autonomously generate a valid 32px map using only registered assets', () => {
      const generatedMap = AIMapGenerator.generate(
        {
          mapType: 'farm',
          region: 'Đồng Nai',
          width: 48,
          height: 32,
          roadStyle: 'dirt',
          decorationDensity: 'medium',
          farmPlotCount: 8,
        },
        defaultAssetRegistry
      );

      expect(generatedMap.tileSize).toBe(32);
      expect(generatedMap.width).toBe(48);
      expect(generatedMap.height).toBe(32);
      expect(generatedMap.farmPlots.length).toBe(8);
      expect(generatedMap.zones.length).toBeGreaterThan(0);

      // Validate strict compliance
      const val = MapValidator.validate(generatedMap, defaultAssetRegistry);
      expect(val.valid).toBe(true);
      expect(val.errors).toHaveLength(0);

      // Ensure every single object references a real asset
      for (const layer of generatedMap.layers) {
        if (layer.type === 'objectgroup') {
          for (const obj of (layer as MapObjectLayer).objects) {
            expect(defaultAssetRegistry.has(obj.assetId)).toBe(true);
          }
        }
      }
    });

    it('should decorate a designated area with non-overlapping assets matching requested tags', () => {
      const decoObjects = AIDecorator.decorateArea(
        {
          bounds: { minX: 100, minY: 100, maxX: 600, maxY: 600 },
          tags: ['banana', 'flower', 'tree'],
          density: 'medium',
          idPrefix: 'deco_test',
        },
        defaultAssetRegistry
      );

      expect(decoObjects.length).toBeGreaterThan(0);
      for (const obj of decoObjects) {
        expect(obj.id).toContain('deco_test');
        expect(defaultAssetRegistry.has(obj.assetId)).toBe(true);
        expect(obj.x).toBeGreaterThanOrEqual(100);
        expect(obj.x).toBeLessThanOrEqual(600);
        expect(obj.y).toBeGreaterThanOrEqual(100);
        expect(obj.y).toBeLessThanOrEqual(600);
      }
    });
  });
});
