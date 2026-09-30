import { backup } from './windows-deploy.mjs';
import { settings } from './windows-common.mjs';

try {
  await backup(await settings());
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
