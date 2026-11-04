import { BrowserWindow, dialog, type IpcMainInvokeEvent } from 'electron';
import fs from 'fs';
import path from 'path';
import { runWithFallback } from '../../utils/runWithFallback';
import { Service } from '../service/Service';
import type { TVersioning } from '../service/storeVersioning';
import { EMPTY_SCAN, scanFolder, type TScanResult } from './scanFolder';

type TScannerData = {
  trackedFolder: string;
  // Listing of the tracked folder, kept until the scanner drops it
  scan: TScanResult;
};

// Version 0 steps scan the folder the store tracked back then. Every step that runs in one
// migration lists the same files, so their file hashes match the scan the scanner stores.
export function scanLegacyTrackedFolder(
  store: Readonly<Record<string, unknown>>
): TScanResult | null {
  const folder = store.trackedFolder;
  return typeof folder === 'string' && fs.existsSync(folder) ? scanFolder(folder) : null;
}

// Owns the tracked folder: picking and remembering it, file I/O inside it, and listing its files.
// It never reads file contents for the listing; the project, prompt template and glossary
// services build their own entries from it.
export class ScannerService extends Service<TScannerData> {
  static readonly serviceName = 'scanner';

  readonly versioning: TVersioning<TScannerData> = {
    0: (store) => {
      const scan = scanLegacyTrackedFolder(store);
      return {
        ...(typeof store.trackedFolder === 'string' && { trackedFolder: store.trackedFolder }),
        ...(scan && { scan }),
      };
    },
  };

  readonly handlers = [
    this.handle('get-tracked-folder', () => this.store.get('trackedFolder') ?? null),
    this.handle('set-tracked-folder', (_: IpcMainInvokeEvent, folder: string) => {
      this.store.set('trackedFolder', folder);
      this.dropCache();
    }),
    this.handle('select-folder', async (event: IpcMainInvokeEvent) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      const { canceled, filePaths } = await dialog.showOpenDialog(win!, {
        properties: ['openDirectory'],
      });
      return canceled ? null : filePaths[0];
    }),
    // Rescan on request: picks up files changed outside the app
    this.handle('drop-cache', () => this.dropCache()),
    // Paths are resolved against (and may not escape) the tracked folder, see
    // resolveWorkFolderPath
    this.handle('delete-file', (_: IpcMainInvokeEvent, relativePath: string) => {
      runWithFallback(() => fs.unlinkSync(this.resolveWorkFolderPath(relativePath)), undefined);
      this.dropCache();
    }),
    this.handle('check-file-exists', (_: IpcMainInvokeEvent, relativePath: string) =>
      runWithFallback(() => fs.existsSync(this.resolveWorkFolderPath(relativePath)), false)
    ),
    this.handle('read-file', (_: IpcMainInvokeEvent, relativePath: string) =>
      runWithFallback(
        (): string | null => fs.readFileSync(this.resolveWorkFolderPath(relativePath), 'utf8'),
        null
      )
    ),
    this.handle('write-file', (_: IpcMainInvokeEvent, relativePath: string, content: string) => {
      fs.writeFileSync(this.resolveWorkFolderPath(relativePath), content, 'utf8');
      // The new modification time changes the file's hash
      this.dropCache();
    }),
    // Video files live wherever the user picked them from, not inside the tracked folder -- this
    // handler is intentionally unrestricted (unlike the ones above), used only to check whether a
    // previously-saved video path is still on disk.
    this.handle('check-external-path-exists', (_: IpcMainInvokeEvent, absolutePath: string) =>
      runWithFallback(() => fs.existsSync(absolutePath), false)
    ),
  ] as const;

  // The tracked ("working") folder path, or null if none is set or it no longer exists on disk
  // (e.g. moved/deleted externally since it was tracked)
  getWorkFolderPath(): string | null {
    const trackedFolder = this.store.get('trackedFolder');
    if (!trackedFolder || !fs.existsSync(trackedFolder)) return null;
    return trackedFolder;
  }

  // Resolves relativePath against the tracked folder and refuses anything that would escape it
  // (e.g. a `../` traversal) -- nothing outside the tracked folder can ever be reached through
  // this. Throws if no tracked folder is set (or it no longer exists on disk).
  resolveWorkFolderPath(relativePath: string): string {
    const workFolder = this.getWorkFolderPath();
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

  // The tracked folder's listing: the cached one, or a fresh scan that is cached until dropped.
  // Without a tracked folder it's empty and isn't cached.
  scan(): TScanResult {
    const workFolder = this.getWorkFolderPath();
    if (!workFolder) return EMPTY_SCAN;
    const cached = this.store.get('scan');
    if (cached) return cached;
    const scan = scanFolder(workFolder);
    this.store.set('scan', scan);
    return scan;
  }

  private dropCache(): void {
    this.store.delete('scan');
  }
}
