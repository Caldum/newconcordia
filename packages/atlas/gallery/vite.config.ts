import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The gallery renders every Atlas component in its example states (the "stories" of the brief).
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  server: { fs: { allow: ['../../..'] } },
  build: { outDir: '../dist-gallery', emptyOutDir: true },
});
