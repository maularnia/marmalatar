import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import type Store from 'electron-store';
import { createNamespacedRecordStore } from '../utils/namespacedRecordStore';
import { listFilesByExtension } from '../utils/listFilesByExtension';
import { getWorkFolderPath } from '../utils/resolveWorkFolderPath';
import { updateFolderScanCache } from './scanner/folderScanCacheStore';
import { ProjectStateV1Schema, type ProjectState } from '../../bridge/definitions/projectState';
import { ProjectCacheEntryV1Schema } from '../../bridge/definitions/projectCacheEntry';
import { readProjectState } from '../../bridge/contracts';

export function registerProjectIpc(appStore: Store): void {
  // Per-project device-specific state (editorMode, isVideoCollapsed, video path), keyed by the
  // project's own stable projectId -- electron-store is already local per install, so no separate
  // device key is needed.
  const projectStateStore = createNamespacedRecordStore<ProjectState>(appStore, 'projectStates');

  ipcMain.handle('get-project-state', (_: IpcMainInvokeEvent, projectId: string) => {
    const raw = projectStateStore.get(projectId);
    return raw ? readProjectState(raw) : null;
  });
  ipcMain.handle(
    'set-project-state',
    (_: IpcMainInvokeEvent, projectId: string, projectState: unknown) => {
      projectStateStore.set(projectId, ProjectStateV1Schema.parse(projectState));
    }
  );
  ipcMain.handle('remove-project-state', (_: IpcMainInvokeEvent, projectId: string) => {
    projectStateStore.remove(projectId);
  });

  ipcMain.handle('upsert-project-cache-entry', (_: IpcMainInvokeEvent, entry: unknown) => {
    const parsed = ProjectCacheEntryV1Schema.parse(entry);
    updateFolderScanCache(appStore, (cache) => {
      cache.projects[parsed.filePath] = parsed;
    });
  });
  ipcMain.handle('remove-project-cache-entry', (_: IpcMainInvokeEvent, filePath: string) => {
    updateFolderScanCache(appStore, (cache) => {
      delete cache.projects[filePath];
    });
  });
  ipcMain.handle(
    'update-project-cache-progress',
    (_: IpcMainInvokeEvent, filePath: string, translationProgress: number) => {
      updateFolderScanCache(appStore, (cache) => {
        const entry = cache.projects[filePath];
        if (entry) entry.translationProgress = translationProgress;
      });
    }
  );

  ipcMain.handle('list-project-files', () => {
    const workFolder = getWorkFolderPath(appStore);
    return workFolder ? listFilesByExtension(workFolder, '.mrml') : [];
  });
}
