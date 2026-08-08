import fs from 'fs';
import path from 'path';
import type Store from 'electron-store';

// Returns the tracked ("working") folder path, or null if none is set or it no longer exists on
// disk (e.g. moved/deleted externally since it was tracked).
export function getWorkFolderPath(appStore: Store): string | null {
  const trackedFolder = appStore.get('trackedFolder') as string | undefined;
  if (!trackedFolder || !fs.existsSync(trackedFolder)) return null;
  return trackedFolder;
}

// Resolves relativePath against the tracked folder and refuses anything that would escape it
// (e.g. a `../` traversal) -- nothing outside the tracked folder can ever be reached through this.
// Throws if no tracked folder is set (or it no longer exists on disk).
export function resolveWorkFolderPath(appStore: Store, relativePath: string): string {
  const workFolder = getWorkFolderPath(appStore);
  if (!workFolder) {
    throw new Error('No tracked folder is set.');
  }
  const root = path.resolve(workFolder);
  const resolved = path.resolve(root, relativePath);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error(`Refusing to access a path outside the tracked folder: ${relativePath}`);
  }
  return resolved;
}
