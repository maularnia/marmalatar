import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import type Store from 'electron-store';
import { listFilesByExtension } from '../utils/listFilesByExtension';
import { getWorkFolderPath } from '../utils/resolveWorkFolderPath';
import { updateFolderScanCache } from './scanner/folderScanCacheStore';
import { PromptTemplateCacheEntryV1Schema } from '../../bridge/definitions/promptTemplateCacheEntry';

export function registerPromptTemplateIpc(appStore: Store): void {
  ipcMain.handle('upsert-prompt-template-cache-entry', (_: IpcMainInvokeEvent, entry: unknown) => {
    const parsed = PromptTemplateCacheEntryV1Schema.parse(entry);
    updateFolderScanCache(appStore, (cache) => {
      cache.promptTemplates[parsed.fileName] = parsed;
    });
  });
  ipcMain.handle(
    'remove-prompt-template-cache-entry',
    (_: IpcMainInvokeEvent, fileName: string) => {
      updateFolderScanCache(appStore, (cache) => {
        delete cache.promptTemplates[fileName];
      });
    }
  );

  ipcMain.handle('list-prompt-template-files', () => {
    const workFolder = getWorkFolderPath(appStore);
    return workFolder ? listFilesByExtension(workFolder, '.mrmlpt') : [];
  });
}
