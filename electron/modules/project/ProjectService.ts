import type { IpcMainInvokeEvent } from 'electron';
import { ProjectStateV1Schema, type ProjectState } from '../../../bridge/definitions/projectState';
import {
  ProjectCacheEntryV1Schema,
  type ProjectCacheEntry,
} from '../../../bridge/definitions/projectCacheEntry';
import { readProjectState } from '../../../bridge/contracts';
import { listFilesByExtension } from '../../utils/listFilesByExtension';
import { ScannerService } from '../scanner/ScannerService';
import { Service } from '../service/Service';
import type { TVersioning } from '../service/storeVersioning';

type TProjectData = {
  // Per-project device-specific state (editorMode, isVideoCollapsed, video path), keyed by the
  // project's own stable projectId -- electron-store is already local per install, so no separate
  // device key is needed. Kept in their versioned wire format; readProjectState migrates on read.
  projectStates: Record<string, unknown>;
};

export class ProjectService extends Service<TProjectData> {
  static readonly serviceName = 'project';

  readonly versioning: TVersioning<TProjectData> = {
    0: (store) => ({
      ...(store.projectStates !== undefined && {
        projectStates: store.projectStates as Record<string, unknown>,
      }),
    }),
  };

  readonly handlers = [
    this.handle('get-state', (_: IpcMainInvokeEvent, projectId: string) =>
      this.getProjectState(projectId)
    ),
    this.handle(
      'set-state',
      (_: IpcMainInvokeEvent, projectId: string, projectState: ProjectState) => {
        const projectStates = this.store.get('projectStates') ?? {};
        this.store.set('projectStates', {
          ...projectStates,
          [projectId]: ProjectStateV1Schema.parse(projectState),
        });
      }
    ),
    this.handle('remove-state', (_: IpcMainInvokeEvent, projectId: string) => {
      const projectStates = { ...this.store.get('projectStates') };
      delete projectStates[projectId];
      this.store.set('projectStates', projectStates);
    }),
    this.handle('upsert-cache-entry', (_: IpcMainInvokeEvent, entry: ProjectCacheEntry) => {
      const parsed = ProjectCacheEntryV1Schema.parse(entry);
      ScannerService.getInstance().updateFolderScanCache((cache) => {
        cache.projects[parsed.filePath] = parsed;
      });
    }),
    this.handle('remove-cache-entry', (_: IpcMainInvokeEvent, filePath: string) => {
      ScannerService.getInstance().updateFolderScanCache((cache) => {
        delete cache.projects[filePath];
      });
    }),
    this.handle(
      'update-cache-progress',
      (_: IpcMainInvokeEvent, filePath: string, translationProgress: number) => {
        ScannerService.getInstance().updateFolderScanCache((cache) => {
          const entry = cache.projects[filePath];
          if (entry) entry.translationProgress = translationProgress;
        });
      }
    ),
    this.handle('list-files', () => {
      const workFolder = ScannerService.getInstance().getWorkFolderPath();
      return workFolder ? listFilesByExtension(workFolder, '.mrml') : [];
    }),
  ] as const;

  // Also used by the media service's cache cleanup, to find the videos projects still use
  getProjectState(projectId: string): ProjectState | null {
    const raw = this.store.get('projectStates')?.[projectId];
    return raw ? readProjectState(raw) : null;
  }
}
