import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/migrate-cli.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  clean: true,
  noExternal: [/^@cozy\//],
});
