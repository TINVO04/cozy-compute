import fs from 'node:fs';
import path from 'node:path';

const tsContent = fs.readFileSync('packages/game-data/src/vehicles.ts', 'utf8');

const models = [
  'bicycles/trek-marlin-7',
  'motorcycles/vespa-primavera-150',
  'motorcycles/ducati-panigale-v4',
  'motorcycles/honda-super-cub',
  'motorcycles/harley-davidson-fat-boy',
  'motorcycles/kawasaki-ninja-h2',
  'motorcycles/yamaha-yzf-r1',
  'motorcycles/bmw-r1250-gs',
  'cars/mercedes-benz-g63',
  'cars/lamborghini-aventador',
  'cars/porsche-911',
  'cars/toyota-supra-mk4',
  'cars/ferrari-f40',
  'cars/ford-mustang',
  'cars/rolls-royce-phantom',
  'cars/tesla-model-s',
];

console.log('Comparing meta.json with vehicles.ts specifications...');
let mismatches = 0;

for (const m of models) {
  const metaPath = path.join('assets/vehicles', m, 'meta.json');
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

  // Find the block where assetPath: '${m}' appears
  const idx = tsContent.indexOf(`assetPath: '${m}'`);
  if (idx === -1) {
    console.error(`[FAIL] Could not find assetPath '${m}' in vehicles.ts`);
    mismatches++;
    continue;
  }

  // Find the start of this vehicle definition (the previous '{')
  const startIdx = tsContent.lastIndexOf('  {\n', idx) !== -1 ? tsContent.lastIndexOf('  {\n', idx) : tsContent.lastIndexOf('  ', idx - 50);
  const endIdx = tsContent.indexOf('  },', idx);
  const block = tsContent.slice(startIdx, endIdx + 4);

  const priceMatch = block.match(/price:\s*(\d+)/);
  const speedMatch = block.match(/speed:\s*(\d+)/);

  if (!priceMatch || !speedMatch) {
    console.error(`[FAIL] Could not extract price/speed in block for ${m}`);
    mismatches++;
    continue;
  }

  const tsPrice = parseInt(priceMatch[1], 10);
  const tsSpeed = parseInt(speedMatch[1], 10);

  if (tsPrice !== meta.price) {
    console.error(`[FAIL] Price mismatch for ${m}: meta=${meta.price}, vehicles.ts=${tsPrice}`);
    mismatches++;
  } else if (tsSpeed !== meta.speed) {
    console.error(`[FAIL] Speed mismatch for ${m}: meta=${meta.speed}, vehicles.ts=${tsSpeed}`);
    mismatches++;
  } else {
    console.log(`  [OK] ${m}: price=${meta.price}, speed=${meta.speed} (matches vehicles.ts)`);
  }
}

if (mismatches === 0) {
  console.log('\n>>> ALL 16 MODELS 100% SYNCHRONIZED WITH GAME-DATA! <<<');
} else {
  console.error(`\nFound ${mismatches} mismatches!`);
  process.exit(1);
}
