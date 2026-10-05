import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const files = JSON.parse(await fs.readFile('output/vehicle-files.json', 'utf8'));
for (const [bin, args] of [
  ['node_modules/prettier/bin/prettier.cjs', ['--write', ...files]],
  ['node_modules/eslint/bin/eslint.js', files],
]) {
  const r = spawnSync(process.execPath, [bin, ...args], { stdio: 'inherit', windowsHide: true });
  if (r.status) process.exitCode = r.status;
}
