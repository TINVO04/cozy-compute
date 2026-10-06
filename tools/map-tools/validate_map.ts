#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';
import { MapLoader } from '../../packages/map-editor/src/index.js';
import { defaultAssetRegistry } from '../../packages/game-assets/src/index.js';

function main() {
  const args = process.argv.slice(2);
  const targetPath = args[0] || 'maps/farm-dong-nai.json';

  const fullPath = path.resolve(process.cwd(), targetPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`Error: File not found at ${fullPath}`);
    process.exit(1);
  }

  console.log(`\n🔍 Validating map: ${targetPath}`);
  console.log('='.repeat(50));

  try {
    const raw = fs.readFileSync(fullPath, 'utf-8');
    const { map, validation } = MapLoader.load(raw, { registry: defaultAssetRegistry });

    if (!validation.valid) {
      console.error(`❌ Validation FAILED with ${validation.errors.length} error(s):`);
      validation.errors.forEach((err, i) => console.error(`  ${i + 1}. ${err}`));
      process.exit(1);
    }

    if (validation.warnings.length > 0) {
      console.warn(`⚠️ Warnings (${validation.warnings.length}):`);
      validation.warnings.forEach((warn) => console.warn(`  - ${warn}`));
    }

    console.log('✅ Validation PASSED 100%!');
    console.log(`- Map ID: ${map.id} (v${map.version})`);
    console.log(`- Tile Size: ${map.tileSize}px (Strict 32px Grid)`);
    console.log(
      `- Dimensions: ${map.width}x${map.height} tiles (${map.width * map.tileSize}x${map.height * map.tileSize}px)`,
    );
    console.log(`- Total Layers: ${map.layers.length}`);
    console.log(`- Gameplay Zones: ${map.zones.length}`);
    console.log(`- Farm Plots: ${map.farmPlots.length}`);
    console.log('='.repeat(50) + '\n');
  } catch (err) {
    console.error(`❌ Unexpected error: ${(err as Error).message}`);
    process.exit(1);
  }
}

main();
