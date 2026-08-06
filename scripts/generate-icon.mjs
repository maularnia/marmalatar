import pngToIco from 'png-to-ico';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appAssetsDir = path.resolve(__dirname, '../electron/assets');

const sizes = [16, 32, 48, 64, 128, 256];
const pngPaths = sizes.map((size) => path.join(appAssetsDir, `icon-${size}.png`));

const buffer = await pngToIco(pngPaths);
const outPath = path.join(appAssetsDir, 'icon.ico');
await writeFile(outPath, buffer);
console.log(`Generated ${path.relative(process.cwd(), outPath)}`);
