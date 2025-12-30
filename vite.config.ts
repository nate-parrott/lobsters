import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/lobsters/' : '/',
  publicDir: 'public',
  build: {
    outDir: 'dist',
  },
}));
