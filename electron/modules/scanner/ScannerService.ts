import { BrowserWindow, dialog, type IpcMainInvokeEvent } from 'electron';
import fs from 'fs';
import path from 'path';
import {
  FolderScanResultV1Schema,
  type FolderScanResult,
} from '../../../bridge/definitions/scanResult';
import { readFolderScanResult } from '../../../bridge/contracts';
import { runWithFallback } from '../../utils/runWithFallback';
import { Service } from '../service/Service';
import type { TVersioning } from '../service/storeVersioning';

type TScannerData = {
  trackedFolder: string;
  // Lightweight project/prompt-template/glossary list metadata (incl. translationProgress)
  // rendered by the Main Menu without any live filesystem/content read
  folderScanCache: FolderScanResult;
};

const EMPTY_CACHE: FolderScanResult = {
  version: 1,
  folder: '',
  scannedAt: 0,
  projects: {},
  promptTemplates: {},
  glossaries: {},
};

// Filesystem/tracked-folder substrate shared by the project, prompt template and glossary
// services: picking and remembering the tracked folder, generic file I/O, and the folder scan
// cache (each of those services only mutates its own slice of it).
export class ScannerService extends Service<TScannerData> {
  static readonly serviceName = 'scanner';

  readonly versioning: TVersioning<TScannerData> = {
    0: (store) => ({
      ...(typeof store.trackedFolder === 'string' && { trackedFolder: store.trackedFolder }),
      // Still in its versioned wire format; readFolderScanResult validates it on every read
      ...(store.folderScanCache !== undefined && {
        folderScanCache: store.folderScanCache as FolderScanResult,
      }),
    }),
  };

  readonly handlers = [
    this.handle('get-tracked-folder', () => this.store.get('trackedFolder') ?? null),
    this.handle('set-tracked-folder', (_: IpcMainInvokeEvent, folder: string) => {
      this.store.set('trackedFolder', folder);
    }),
    this.handle('select-folder', async (event: IpcMainInvokeEvent) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      const { canceled, filePaths } = await dialog.showOpenDialog(win!, {
        properties: ['openDirectory'],
      });
      return canceled ? null : filePaths[0];
    }),
    this.handle('get-folder-scan-cache', () => this.getFolderScanCache()),
    this.handle('set-folder-scan-cache', (_: IpcMainInvokeEvent, cache: FolderScanResult) => {
      this.store.set('folderScanCache', FolderScanResultV1Schema.parse(cache));
    }),
    // Paths are resolved against (and may not escape) the tracked folder, see
    // resolveWorkFolderPath
    this.handle('delete-file', (_: IpcMainInvokeEvent, relativePath: string) => {
      runWithFallback(() => fs.unlinkSync(this.resolveWorkFolderPath(relativePath)), undefined);
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

  // Get -> mutate -> set run synchronously (no `await` in between), so concurrent IPC calls can't
  // interleave into a torn write
  updateFolderScanCache(mutate: (cache: FolderScanResult) => void): void {
    const cache = this.getFolderScanCache();
    mutate(cache);
    this.store.set('folderScanCache', FolderScanResultV1Schema.parse(cache));
  }

  private getFolderScanCache(): FolderScanResult {
    const raw = this.store.get('folderScanCache');
    return raw ? readFolderScanResult(raw) : EMPTY_CACHE;
  }
}
