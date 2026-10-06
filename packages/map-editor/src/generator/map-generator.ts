import type { MapDefinition, MapZone, MapFarmPlot } from '../types/map.js';
import type { MapObject } from '../types/object.js';
import { defaultAssetRegistry, type AssetRegistry } from '@cozy/game-assets';
import { MapValidator } from '../validation/map-validator.js';

export type MapTemplateType = 'farm' | 'village' | 'market' | 'river';

export interface MapGenerationSpec {
  id?: string;
  name?: string;
  mapType: MapTemplateType;
  region?: string;
  width?: number; // tiles
  height?: number; // tiles
  roadStyle?: 'dirt' | 'concrete';
  decorationDensity?: 'low' | 'medium' | 'high';
  farmPlotCount?: number;
  tags?: string[];
}

export class AIMapGenerator {
  /**
   * Generates a fully validated MapDefinition JSON adhering strictly to the 32px grid
   * and using ONLY registered assets in AssetRegistry. Never invents asset IDs.
   */
  public static generate(
    spec: MapGenerationSpec,
    registry: AssetRegistry = defaultAssetRegistry,
  ): MapDefinition {
    const width = spec.width ?? 48;
    const height = spec.height ?? 32;
    const mapId = spec.id ?? `${spec.mapType}-${Date.now()}`;
    const name = spec.name ?? `Bản Đồ ${spec.mapType.toUpperCase()} ${spec.region ?? 'Đồng Nai'}`;
    const region = spec.region ?? 'Đồng Nai';

    const tileCount = width * height;

    // 1. Initialize Ground & Roads tilelayers
    const groundData = new Array(tileCount).fill(1); // 1 = Meadow grass
    const roadData = new Array(tileCount).fill(0); // 0 = empty

    // Determine road tile ID (2 = dirt, 3 = concrete)
    const roadGid = spec.roadStyle === 'concrete' ? 3 : 2;

    // Main road horizontal axis (middle of map)
    const mainRoadRow = Math.floor(height * 0.25);
    for (let r = mainRoadRow; r < mainRoadRow + 2; r++) {
      for (let c = 0; c < width; c++) {
        roadData[r * width + c] = roadGid;
      }
    }

    // Branch road vertical axis
    const branchRoadCol = Math.floor(width * 0.35);
    for (let r = mainRoadRow; r < height - 4; r++) {
      roadData[r * width + branchRoadCol] = roadGid;
    }

    // 2. Query Asset Registry for buildings and structures
    const availableBuildings = registry.getByCategory('buildings');
    const availableTrees = registry.getByCategory('vegetation');
    const availableProps = registry.getByCategory('props');
    const availableAnimals = registry.getByCategory('animals');
    const availableCharacters = registry.getByCategory('characters');

    const structureObjects: MapObject[] = [];
    const fenceObjects: MapObject[] = [];
    const zones: MapZone[] = [];
    const farmPlots: MapFarmPlot[] = [];

    let objCounter = 1;
    const getObjId = (prefix: string) => `${prefix}_${objCounter++}`;

    // 3. Template topology placement
    if (spec.mapType === 'farm') {
      // Place Farmhouse
      const farmhouse = availableBuildings.find((b) => b.id.includes('farmhouse')) ?? availableBuildings[0];
      if (farmhouse) {
        structureObjects.push({
          id: getObjId('obj_farmhouse'),
          assetId: farmhouse.id,
          x: 7 * 32,
          y: (mainRoadRow - 1) * 32,
          rotation: 0,
          scale: 1,
        });
      }

      // Place Shop / Stall
      const shop = availableBuildings.find((b) => b.id.includes('shop')) ?? availableBuildings[1];
      if (shop) {
        const shopX = 15 * 32;
        const shopY = (mainRoadRow - 1) * 32;
        structureObjects.push({
          id: getObjId('obj_shop'),
          assetId: shop.id,
          x: shopX,
          y: shopY,
          rotation: 0,
          scale: 1,
        });

        zones.push({
          id: 'zone_shop',
          label: 'Khu Giao Thương Nông Sản',
          prompt: 'Nhấn E để mở cửa hàng',
          x: shopX - 48,
          y: shopY - 64,
          width: 96,
          height: 96,
        });
      }

      // Place Silo Warehouse
      const silo = availableBuildings.find((b) => b.id.includes('silo'));
      if (silo) {
        structureObjects.push({
          id: getObjId('obj_silo'),
          assetId: silo.id,
          x: 11 * 32,
          y: (mainRoadRow - 1) * 32,
          rotation: 0,
          scale: 1,
        });
      }

      // Place Chicken Coop
      const coop = availableBuildings.find((b) => b.id.includes('coop'));
      if (coop) {
        structureObjects.push({
          id: getObjId('obj_coop'),
          assetId: coop.id,
          x: 22 * 32,
          y: (mainRoadRow - 1) * 32,
          rotation: 0,
          scale: 1,
        });
      }

      // Add Farm Plots in grid
      const plotCount = spec.farmPlotCount ?? 8;
      let plotsPlaced = 0;
      for (let r = mainRoadRow + 4; r < height - 5 && plotsPlaced < plotCount; r += 4) {
        for (let c = branchRoadCol + 4; c < width - 4 && plotsPlaced < plotCount; c += 4) {
          farmPlots.push({
            id: `plot_${plotsPlaced.toString().padStart(2, '0')}`,
            tileX: c,
            tileY: r,
            tileWidth: 3,
            tileHeight: 3,
            soilType: 'loam',
            purchasable: true,
            price: 150 * (plotsPlaced + 1),
          });
          plotsPlaced++;
        }
      }

      // Add Orchard (Trees) on Western sector
      const mangoTree = availableTrees.find((t) => t.id.includes('mango')) ?? availableTrees[0];
      if (mangoTree) {
        for (let r = mainRoadRow + 3; r < height - 3; r += 4) {
          structureObjects.push({
            id: getObjId('obj_orchard_tree'),
            assetId: mangoTree.id,
            x: 4 * 32,
            y: r * 32,
            rotation: 0,
            scale: 1,
          });
        }
      }

      // Place livestock
      const cow = availableAnimals.find((a) => a.id.includes('cow'));
      if (cow) {
        structureObjects.push({
          id: getObjId('obj_cow'),
          assetId: cow.id,
          x: 26 * 32,
          y: 7 * 32,
          rotation: 0,
          scale: 1,
        });
      }

      const chicken = availableAnimals.find((a) => a.id.includes('chicken'));
      if (chicken) {
        structureObjects.push({
          id: getObjId('obj_chicken'),
          assetId: chicken.id,
          x: 23 * 32,
          y: 7 * 32,
          rotation: 0,
          scale: 1,
        });
      }

      // Place Farmer & Merchant NPCs
      const farmer = availableCharacters.find((c) => c.id.includes('farmer'));
      if (farmer) {
        structureObjects.push({
          id: getObjId('obj_farmer_npc'),
          assetId: farmer.id,
          x: 9 * 32,
          y: (mainRoadRow + 2) * 32,
          rotation: 0,
          scale: 1,
        });
      }

      const merchant = availableCharacters.find((c) => c.id.includes('merchant'));
      if (merchant) {
        structureObjects.push({
          id: getObjId('obj_merchant_npc'),
          assetId: merchant.id,
          x: 15 * 32,
          y: (mainRoadRow + 2) * 32,
          rotation: 0,
          scale: 1,
        });
      }

      // Gate Zone
      zones.push({
        id: 'zone_farm_gate',
        label: 'Cổng Trang Trại',
        prompt: 'Nhấn E để trở về Thị Trấn',
        x: 16,
        y: mainRoadRow * 32,
        width: 64,
        height: 64,
      });
    }

    // 4. Decoration pass based on density
    const densityMultiplier =
      spec.decorationDensity === 'high' ? 12 : spec.decorationDensity === 'low' ? 3 : 6;
    const wildflower = availableTrees.find((t) => t.id.includes('flower'));
    const waterJar = availableProps.find((p) => p.id.includes('jar'));
    const lamp = availableProps.find((p) => p.id.includes('lamp'));

    if (wildflower) {
      for (let i = 0; i < densityMultiplier; i++) {
        const rx = Math.floor(Math.random() * (width - 4) + 2) * 32;
        const ry = Math.floor(Math.random() * (height - 4) + 2) * 32;
        structureObjects.push({
          id: getObjId('obj_flower'),
          assetId: wildflower.id,
          x: rx,
          y: ry,
          rotation: 0,
          scale: 1,
        });
      }
    }

    if (waterJar) {
      structureObjects.push({
        id: getObjId('obj_water_jar'),
        assetId: waterJar.id,
        x: 5 * 32,
        y: (mainRoadRow - 1) * 32,
        rotation: 0,
        scale: 1,
      });
    }

    if (lamp) {
      structureObjects.push({
        id: getObjId('obj_lamp'),
        assetId: lamp.id,
        x: (branchRoadCol + 1) * 32,
        y: (mainRoadRow + 1) * 32,
        rotation: 0,
        scale: 1,
      });
    }

    // 5. Assemble final MapDefinition
    const mapDef: MapDefinition = {
      id: mapId,
      version: 1,
      tileSize: 32,
      width,
      height,
      layers: [
        {
          id: 'layer_ground',
          name: 'Ground',
          type: 'tilelayer',
          depth: -10,
          visible: true,
          data: groundData,
        },
        {
          id: 'layer_roads',
          name: 'Roads',
          type: 'tilelayer',
          depth: -9,
          visible: true,
          data: roadData,
        },
        {
          id: 'layer_fences',
          name: 'Fences',
          type: 'objectgroup',
          depth: -8,
          visible: true,
          objects: fenceObjects,
        },
        {
          id: 'layer_structures',
          name: 'Structures',
          type: 'objectgroup',
          depth: 0,
          visible: true,
          objects: structureObjects,
        },
        {
          id: 'layer_overhang',
          name: 'Overhang',
          type: 'objectgroup',
          depth: 3000,
          visible: true,
          objects: [],
        },
      ],
      zones,
      farmPlots,
      metadata: {
        name,
        region,
        biome: `${spec.mapType}-tropical`,
        author: 'AI Map Generator',
        createdAt: new Date().toISOString(),
        description: `Bản đồ tự động sinh từ mẫu ${spec.mapType}, tuân thủ 100% Asset Registry và lưới 32px.`,
      },
    };

    // 6. Validate map before returning
    const validation = MapValidator.validate(mapDef, registry);
    if (!validation.valid) {
      throw new Error(`AI Map Generator produced invalid map: ${validation.errors.join('; ')}`);
    }

    return mapDef;
  }
}
