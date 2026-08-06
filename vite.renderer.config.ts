import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import svgr from 'vite-plugin-svgr';
import path from 'node:path';
import { renderStaticCSS, renderThemeCSS, themeRegistry } from './src/theme/renderer';
import * as fs from 'node:fs';
import { TThemeName } from './src/theme/definitions';
import { version } from './package.json';

function paletteCssPlugin() {
  const writePaletteCss = () => {
    const globalVars = renderStaticCSS();
    const css = Object.keys(themeRegistry)
      .map((name) => renderThemeCSS(themeRegistry[name], name, name as TThemeName))
      .join('\n');
    const cssPath = path.resolve(__dirname, 'src/assets/variables.css');
    fs.mkdirSync(path.dirname(cssPath), { recursive: true });
    fs.writeFileSync(cssPath, globalVars + css, 'utf8');
    console.log('Palette CSS file generated successfully.');
  };
  return {
    name: 'palette-css-generator',
    configResolved() {
      return writePaletteCss();
    },
    buildStart() {
      return writePaletteCss();
    },
    configureServer() {
      return writePaletteCss();
    },
  };
}

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, 'src'),
      '@store': path.resolve(__dirname, 'src/store'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@ui-toolkit': path.resolve(__dirname, 'src/toolkit'),
      '@providers': path.resolve(__dirname, 'src/providers'),
      '@assets': path.resolve(__dirname, 'electron/assets'),
      '@bridge': path.resolve(__dirname, 'bridge'),
      // hunspell-asm's ESM build does `import * as runtime from './lib/node/hunspell'` over a
      // CJS-style `module.exports = factory` file -- Vite's ESM namespace interop leaves `runtime`
      // non-callable ("runtimeModule is not a function"). The CJS build uses a plain `require()`
      // for the same file, which bundles correctly, so force resolution to it.
      'hunspell-asm': path.resolve(__dirname, 'node_modules/hunspell-asm/dist/cjs/index.js'),
    },
  },
  plugins: [
    paletteCssPlugin(),
    react({
      plugins: [['@swc/plugin-styled-components', { displayName: true, ssr: true }]],
    }),
    svgr(),
  ],
  server: {
    proxy: {
      '/ollama': {
        target: 'http://127.0.0.1:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, ''),
      },
    },
  },
});
