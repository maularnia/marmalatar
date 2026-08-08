import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import type Store from 'electron-store';
import { listFilesByExtension } from '../utils/listFilesByExtension';
import { getWorkFolderPath } from '../utils/resolveWorkFolderPath';
import { updateFolderScanCache } from './scanner/folderScanCacheStore';
import { GlossaryCacheEntryContractV1Schema } from '../../bridge/definitions/glossaryCacheEntry';

export function registerGlossaryIpc(appStore: Store): void {
  ipcMain.handle('upsert-glossary-cache-entry', (_: IpcMainInvokeEvent, entry: unknown) => {
    const parsed = GlossaryCacheEntryContractV1Schema.parse(entry);
    updateFolderScanCache(appStore, (cache) => {
      cache.glossaries[parsed.fileName] = parsed;
    });
  });
  ipcMain.handle('remove-glossary-cache-entry', (_: IpcMainInvokeEvent, fileName: string) => {
    updateFolderScanCache(appStore, (cache) => {
      delete cache.glossaries[fileName];
    });
  });

  ipcMain.handle('list-glossary-files', () => {
    const workFolder = getWorkFolderPath(appStore);
    return workFolder ? listFilesByExtension(workFolder, '.mrmlg') : [];
  });
}
