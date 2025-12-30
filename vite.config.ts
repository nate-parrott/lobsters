import { defineConfig } from 'vite';

export default defineConfig({
  base: '/lobsterfolk/',
  publicDir: 'public',
  build: {
    outDir: 'dist',
  },
});
