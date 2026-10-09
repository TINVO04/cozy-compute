import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const EXPECTED_MODELS = [
  // 1 Bicycle
  'bicycles/trek-marlin-7',
  // 7 Motorcycles
  'motorcycles/vespa-primavera-150',
  'motorcycles/ducati-panigale-v4',
  'motorcycles/honda-super-cub',
  'motorcycles/harley-davidson-fat-boy',
  'motorcycles/kawasaki-ninja-h2',
  'motorcycles/yamaha-yzf-r1',
  'motorcycles/bmw-r1250-gs',
  // 8 Cars
  'cars/mercedes-benz-g63',
  'cars/lamborghini-aventador',
  'cars/porsche-911',
  'cars/toyota-supra-mk4',
  'cars/ferrari-f40',
  'cars/ford-mustang',
  'cars/rolls-royce-phantom',
  'cars/tesla-model-s',
];

const REQUIRED_FILES = ['spritesheet.png', 'preview.png', 'icon.png', 'meta.json'];

function parsePngHeader(filePath) {
  const buf = fs.readFileSync(filePath);
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const pngSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.length < 24 || !buf.subarray(0, 8).equals(pngSig)) {
    throw new Error(`File is not a valid PNG: ${filePath}`);
  }
  const chunkType = buf.toString('ascii', 12, 16);
  if (chunkType !== 'IHDR') {
    throw new Error(`Corrupted PNG, first chunk is not IHDR: ${filePath}`);
  }
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height, sizeBytes: buf.length };
}

async function verifyAssets() {
  console.log('====================================================');
  console.log('VEHICLE ASSET PACK VERIFICATION REPORT');
  console.log('====================================================');

  const locations = [
    { name: 'Canonical Storage', baseDir: path.join(rootDir, 'assets', 'vehicles') },
    { name: 'Web Public Mirror', baseDir: path.join(rootDir, 'apps', 'web', 'public', 'vehicles') },
  ];

  let totalErrors = 0;
  let totalCheckedFiles = 0;

  for (const loc of locations) {
    console.log(`\nChecking location: ${loc.name} (${loc.baseDir})`);

    for (const relModelPath of EXPECTED_MODELS) {
      const modelDir = path.join(loc.baseDir, relModelPath);
      if (!fs.existsSync(modelDir)) {
        console.error(`[FAIL] Missing directory: ${modelDir}`);
        totalErrors++;
        continue;
      }

      for (const fileName of REQUIRED_FILES) {
        const filePath = path.join(modelDir, fileName);
        if (!fs.existsSync(filePath)) {
          console.error(`[FAIL] Missing file: ${filePath}`);
          totalErrors++;
          continue;
        }

        totalCheckedFiles++;

        if (fileName === 'spritesheet.png') {
          try {
            const { width, height, sizeBytes } = parsePngHeader(filePath);
            if (width !== 192 || height !== 160) {
              console.error(
                `[FAIL] Invalid spritesheet dimensions: ${filePath} (${width}x${height}, expected 192x160)`,
              );
              totalErrors++;
            } else if (sizeBytes < 1000) {
              console.error(`[FAIL] Spritesheet file abnormally small (${sizeBytes} bytes): ${filePath}`);
              totalErrors++;
            }
          } catch (err) {
            console.error(`[FAIL] Corrupt PNG header: ${filePath} - ${err.message}`);
            totalErrors++;
          }
        } else if (fileName === 'preview.png' || fileName === 'icon.png') {
          try {
            const { width, height } = parsePngHeader(filePath);
            if (fileName === 'preview.png' && (width !== 144 || height !== 120)) {
              console.warn(`[WARN] Preview dimension note: ${filePath} (${width}x${height})`);
            }
            if (fileName === 'icon.png' && (width !== 48 || height !== 40)) {
              console.warn(`[WARN] Icon dimension note: ${filePath} (${width}x${height})`);
            }
          } catch (err) {
            console.error(`[FAIL] Corrupt PNG header: ${filePath} - ${err.message}`);
            totalErrors++;
          }
        } else if (fileName === 'meta.json') {
          try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const data = JSON.parse(content);
            const requiredFields = [
              'id',
              'name',
              'brand',
              'category',
              'price',
              'speed',
              'dimensions',
              'anchorPoints',
              'lights',
              'colors',
            ];
            for (const field of requiredFields) {
              if (data[field] === undefined) {
                console.error(`[FAIL] meta.json missing field "${field}": ${filePath}`);
                totalErrors++;
              }
            }
            if (data.dimensions?.spritesheetWidth !== 192 || data.dimensions?.spritesheetHeight !== 160) {
              console.error(`[FAIL] meta.json dimension mismatch in: ${filePath}`);
              totalErrors++;
            }
            if (data.anchorPoints?.contactY !== 37) {
              console.error(`[FAIL] meta.json anchorPoints.contactY is not 37: ${filePath}`);
              totalErrors++;
            }
          } catch (err) {
            console.error(`[FAIL] Corrupt or unparseable JSON: ${filePath} - ${err.message}`);
            totalErrors++;
          }
        }
      }
    }
  }

  console.log('\n----------------------------------------------------');
  console.log(`Models verified: ${EXPECTED_MODELS.length}`);
  console.log(
    `Total files checked across both locations: ${totalCheckedFiles} / ${EXPECTED_MODELS.length * 4 * 2}`,
  );
  console.log(`Total errors found: ${totalErrors}`);
  console.log('----------------------------------------------------');

  if (totalErrors > 0) {
    console.error(`Verification FAILED with ${totalErrors} errors.`);
    process.exit(1);
  } else {
    console.log('All 16 vehicle asset packs VERIFIED SUCCESSFULLY in both locations!');

    // Run deep geometry auditor
    console.log('\n====================================================');
    console.log('RUNNING DEEP PIXEL GEOMETRY AUDITOR');
    console.log('====================================================');
    const { spawnSync } = await import('node:child_process');
    const auditPy = path.join(rootDir, 'scripts', 'audit_vehicle_geometry.py');
    const auditRes = spawnSync('python', [auditPy], { stdio: 'inherit' });
    if (auditRes.status !== 0) {
      console.error('[FAIL] Deep pixel geometry audit failed.');
      process.exit(auditRes.status ?? 1);
    }
    console.log('\n>>> COMPLETE ASSET VERIFICATION & GEOMETRY AUDIT PASSED 100% <<<');
  }
}

verifyAssets();
