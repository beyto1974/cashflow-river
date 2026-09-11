import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteSingleFile } from 'vite-plugin-singlefile';

/* One HTML file out, so the build is still publishable as an Artifact. */
export default defineConfig({
  plugins: [svelte(), viteSingleFile()],
  build: { outDir: 'dist-app', target: 'es2022', assetsInlineLimit: 100_000_000 },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] }
});
