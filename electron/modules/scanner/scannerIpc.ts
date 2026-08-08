import { ipcMain, dialog, BrowserWindow, type IpcMainInvokeEvent } from 'electron';
import fs from 'fs';
import type Store from 'electron-store';
import { runWithFallback } from '../../utils/runWithFallback';
import { resolveWorkFolderPath } from '../../utils/resolveWorkFolderPath';
import { FolderScanResultV1Schema } from '../../../bridge/definitions/scanResult';
import { getFolderScanCache } from './folderScanCacheStore';

// Filesystem/tracked-folder substrate shared by the Project/PromptTemplate/Glossary modules:
// picking and remembering the tracked folder, generic file I/O, and the raw folder-scan-cache
// read/write (the per-entity upsert/remove logic lives in each of those modules).
export function registerScannerIpc(appStore: Store): void {
  ipcMain.handle('get-tracked-folder', () => appStore.get('trackedFolder') ?? null);
  ipcMain.handle('set-tracked-folder', (_: IpcMainInvokeEvent, folder: string) => {
    appStore.set('trackedFolder', folder);
  });

  ipcMain.handle('select-folder', async (event: IpcMainInvokeEvent) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const { canceled, filePaths } = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory'],
    });
    return canceled ? null : filePaths[0];
  });

  ipcMain.handle('get-folder-scan-cache', () => getFolderScanCache(appStore));
  ipcMain.handle('set-folder-scan-cache', (_: IpcMainInvokeEvent, cache: unknown) => {
    appStore.set('folderScanCache', FolderScanResultV1Schema.parse(cache));
  });

  ipcMain.handle('delete-file', (_: IpcMainInvokeEvent, relativePath: string) => {
    runWithFallback(() => fs.unlinkSync(resolveWorkFolderPath(appStore, relativePath)), undefined);
  });
  ipcMain.handle('check-file-exists', (_: IpcMainInvokeEvent, relativePath: string) =>
    runWithFallback(() => fs.existsSync(resolveWorkFolderPath(appStore, relativePath)), false)
  );
  ipcMain.handle('read-file', (_: IpcMainInvokeEvent, relativePath: string) =>
    runWithFallback(
      () => fs.readFileSync(resolveWorkFolderPath(appStore, relativePath), 'utf8'),
      null
    )
  );
  ipcMain.handle('write-file', (_: IpcMainInvokeEvent, relativePath: string, content: string) => {
    fs.writeFileSync(resolveWorkFolderPath(appStore, relativePath), content, 'utf8');
  });

  // Video files live wherever the user picked them from, not inside the tracked folder -- this
  // channel is intentionally unrestricted (unlike everything else above), used only to check
  // whether a previously-saved video path is still on disk.
  ipcMain.handle('check-external-path-exists', (_: IpcMainInvokeEvent, absolutePath: string) =>
    runWithFallback(() => fs.existsSync(absolutePath), false)
  );
}
