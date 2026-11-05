import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import type { TScanEntry, TScanResult } from '../../../bridge/definitions/scan';
import { runWithFallback } from '../../utils/runWithFallback';

function sha1(text: string): string {
  return createHash('sha1').update(text).digest('hex');
}

function hashFiles(files: readonly TScanEntry[]): string {
  return sha1(files.map(({ fileHash }) => fileHash).join('\n'));
}

export const EMPTY_SCAN: TScanResult = { hash: hashFiles([]), files: [] };

// Lists the files directly in `folder`, without reading them. Subfolders (such as .mrmlcache) are
// skipped: project, prompt template and glossary files always sit in the folder root.
export function scanFolder(folder: string): TScanResult {
  const files = runWithFallback(() => fs.readdirSync(folder, { withFileTypes: true }), [])
    .filter((dirent) => dirent.isFile())
    .flatMap((dirent): TScanEntry[] => {
      const filePath = path.join(folder, dirent.name);
      // A file deleted between readdir and stat is simply left out
      const stat = runWithFallback(() => fs.statSync(filePath), null);
      if (!stat) return [];
      return [
        {
          fileName: dirent.name,
          filePath,
          extension: path.extname(dirent.name),
          fileHash: sha1(`${filePath}\n${stat.mtimeMs}`),
        },
      ];
    })
    .sort((a, b) => a.fileName.localeCompare(b.fileName));
  return { hash: hashFiles(files), files };
}
