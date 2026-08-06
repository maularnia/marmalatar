import { defineConfig, mergeConfig } from 'electron-vite';
import path from 'node:path';
import rendererConfig from './vite.renderer.config';

export default defineConfig({
  main: {
    build: {
      lib: {
        entry: path.resolve(__dirname, 'electron/main.ts'),
      },
      // Ship node_modules alongside the built main.js instead of bundling them into it (Node
      // packages like electron-store/@lmstudio/sdk/deepl-node don't reliably survive being
      // Rollup-bundled) -- electron-builder.yml's `files` includes node_modules to match.
      externalizeDeps: true,
    },
  },
  preload: {
    build: {
      lib: {
        entry: path.resolve(__dirname, 'electron/preload.ts'),
      },
      externalizeDeps: true,
    },
  },
  // electron-vite defaults to looking for index.html under src/renderer/ -- this project keeps it
  // at the project root (plain Vite convention), so root/rollupOptions.input are pinned explicitly.
  renderer: mergeConfig(rendererConfig, {
    root: __dirname,
    build: {
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html'),
      },
    },
  }),
});
