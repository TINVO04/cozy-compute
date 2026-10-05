#!/usr/bin/env tsx
import fs from 'node:fs';
import path from 'node:path';
import { MapLoader, ServerCollisionExporter } from '../../packages/map-editor/src/index.js';
import { defaultAssetRegistry } from '../../packages/game-assets/src/index.js';

function main() {
  const args = process.argv.slice(2);
  const inputPath = args[0] || 'maps/farm-dong-nai.json';
  const outputPath =
    args[1] || inputPath.replace(/\.json$/, '.server-collision.json');

  const fullInputPath = path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(fullInputPath)) {
    console.error(`Error: Input map file not found: ${fullInputPath}`);
    process.exit(1);
  }

  console.log(`\n📦 Exporting server collision blockers from: ${inputPath}`);
  console.log('='.repeat(55));

  try {
    const raw = fs.readFileSync(fullInputPath, 'utf-8');
    const { map, validation } = MapLoader.load(raw, { registry: defaultAssetRegistry });

    if (!validation.valid) {
      console.error(`❌ Cannot export invalid map (${validation.errors.length} errors). Run validate_map first.`);
      process.exit(1);
    }

    const serverData = ServerCollisionExporter.exportForServer(map, defaultAssetRegistry);
    const fullOutputPath = path.resolve(process.cwd(), outputPath);

    fs.writeFileSync(fullOutputPath, JSON.stringify(serverData, null, 2), 'utf-8');

    console.log(`✅ Successfully exported Colyseus server physics data to:`);
    console.log(`   ${outputPath}`);
    console.log(`- Map ID: ${serverData.mapId}`);
    console.log(`- World Dimensions: ${serverData.pixelWidth}x${serverData.pixelHeight} px`);
    console.log(`- Server BLOCKERS (Solid Collisions): ${serverData.blockers.length} rects`);
    console.log(`- Interactive Zones: ${serverData.zones.length}`);
    console.log(`- Farm Plots: ${serverData.farmPlots.length}`);
    console.log('='.repeat(55) + '\n');
  } catch (err) {
    console.error(`❌ Export failed: ${(err as Error).message}`);
    process.exit(1);
  }
}

main();
