import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  envDir: '../..',
  server: { port: 5173, strictPort: true },
  preview: { port: 4173 },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: { manualChunks: { phaser: ['phaser'], react: ['react', 'react-dom', 'react-router'] } },
    },
  },
});
