import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const pythonScript = path.join(rootDir, 'scripts', 'generate_vehicles.py');

console.log('[generate-vehicles] Running Python asset generator...');
const result = spawnSync('python', [pythonScript], {
  cwd: rootDir,
  stdio: 'inherit',
});

if (result.error) {
  console.error('[generate-vehicles] Failed to run python generator:', result.error);
  process.exit(1);
}

if (result.status !== 0) {
  console.error(`[generate-vehicles] Generator failed with exit code ${result.status}`);
  process.exit(result.status ?? 1);
}

console.log('[generate-vehicles] Successfully generated all vehicle asset packs!');
