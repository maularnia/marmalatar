import type { IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import { ProjectStateV1Schema, type ProjectState } from '../../../bridge/definitions/projectState';
import {
  ProjectFileHeaderSchema,
  type TProjectListEntry,
} from '../../../bridge/definitions/projectEntry';
import { readProjectState } from '../../../bridge/contracts';
import { readJsonFile } from '../../utils/readJsonFile';
import { runWithFallback } from '../../utils/runWithFallback';
import { normalizeEntries } from '../scanner/normalizeEntries';
import { ScannerService, scanLegacyTrackedFolder } from '../scanner/ScannerService';
import { readLegacyEntries } from '../service/readLegacyEntries';
import { Service } from '../service/Service';
import type { TVersioning } from '../service/storeVersioning';

const EXTENSION = '.mrml';

type TProjectEntry = TProjectListEntry & {
  fileHash: string;
  // Device-specific editor state (editor mode, video collapsed, video path). Kept here rather than
  // in the .mrml file because it isn't project content.
  state: ProjectState;
};

type TProjectData = {
  // Keyed by the projectId inside the file, so a renamed file keeps its order, state and progress
  list: Record<string, TProjectEntry>;
  scanHash: string;
};

// Version 0 kept list metadata in the scanner's folderScanCache.projects, keyed by filePath
const LegacyProjectCacheEntrySchema = z.object({
  filePath: z.string(),
  translationProgress: z.number().catch(0),
  project: z.object({ projectId: z.string(), projectName: z.string(), emoji: z.string() }),
});

const DEFAULT_STATE: ProjectState = ProjectStateV1Schema.parse({});

function toListEntry({ fileHash: _, state: __, ...entry }: TProjectEntry): TProjectListEntry {
  return entry;
}

export class ProjectService extends Service<TProjectData> {
  static readonly serviceName = 'project';

  readonly versioning: TVersioning<TProjectData> = {
    0: (store) => {
      const scan = scanLegacyTrackedFolder(store);
      if (!scan) return {};
      const filesByPath = new Map(scan.files.map((file) => [file.filePath, file]));
      const legacyStates = (store.projectStates ?? {}) as Record<string, unknown>;
      const list: Record<string, TProjectEntry> = {};
      // No scanHash: the first read still normalizes, but every file migrated here matches by hash
      // and isn't read again. Only files the old cache didn't know get read.
      readLegacyEntries(
        (store.folderScanCache as { projects?: unknown } | undefined)?.projects,
        LegacyProjectCacheEntrySchema
      ).forEach((legacy, index) => {
        const file = filesByPath.get(legacy.filePath);
        const { projectId, projectName, emoji } = legacy.project;
        if (file?.extension !== EXTENSION || projectId in list) return;
        const legacyState = legacyStates[projectId];
        list[projectId] = {
          projectId,
          fileName: file.fileName,
          filePath: file.filePath,
          fileHash: file.fileHash,
          projectName,
          emoji,
          translationProgress: legacy.translationProgress,
          order: index,
          hidden: false,
          state: legacyState
            ? runWithFallback(() => readProjectState(legacyState), DEFAULT_STATE)
            : DEFAULT_STATE,
        };
      });
      return { list };
    },
  };

  readonly handlers = [
    this.handle('list', () =>
      Object.values(this.readList())
        .sort((a, b) => a.order - b.order)
        .map(toListEntry)
    ),
    this.handle(
      'get-state',
      (_: IpcMainInvokeEvent, projectId: string) => this.readList()[projectId]?.state ?? null
    ),
    // The file has to be written first: a project the scan doesn't list has no entry to hold it
    this.handle(
      'set-state',
      (_: IpcMainInvokeEvent, projectId: string, projectState: ProjectState) => {
        this.updateEntry(projectId, { state: ProjectStateV1Schema.parse(projectState) });
      }
    ),
    this.handle(
      'update-progress',
      (_: IpcMainInvokeEvent, projectId: string, translationProgress: number) => {
        this.updateEntry(projectId, { translationProgress });
      }
    ),
  ] as const;

  // Video paths of every listed project, so the media service keeps their cached audio, previews
  // and waveforms
  listVideoPaths(): string[] {
    return Object.values(this.readList())
      .map(({ state }) => state.videoPath)
      .filter((videoPath): videoPath is string => Boolean(videoPath));
  }

  private updateEntry(projectId: string, patch: Partial<TProjectEntry>): void {
    const list = this.readList();
    const entry = list[projectId];
    if (!entry) throw new Error(`No project with id ${projectId} in the tracked folder`);
    this.store.set('list', { ...list, [projectId]: { ...entry, ...patch } });
  }

  // The list, renormalized against the scanner's current listing
  private readList(): Record<string, TProjectEntry> {
    const previousList = this.store.get('list') ?? {};
    let nextOrder = Math.max(-1, ...Object.values(previousList).map(({ order }) => order)) + 1;
    const { list, scanHash, changed } = normalizeEntries({
      scan: ScannerService.getInstance().scan(),
      extension: EXTENSION,
      list: previousList,
      scanHash: this.store.get('scanHash'),
      extract: (file) => readJsonFile(file.filePath, ProjectFileHeaderSchema)?.project ?? null,
      keyOf: ({ projectId }) => projectId,
      build: (file, { projectId, projectName, emoji }, previous): TProjectEntry => ({
        projectId,
        fileName: file.fileName,
        filePath: file.filePath,
        fileHash: file.fileHash,
        projectName,
        emoji,
        // Progress is computed by the renderer from the lines, and stays as last reported
        translationProgress: previous?.translationProgress ?? 0,
        order: previous?.order ?? nextOrder++,
        hidden: previous?.hidden ?? false,
        state: previous?.state ?? DEFAULT_STATE,
      }),
    });
    if (changed) {
      this.store.set('list', list);
      this.store.set('scanHash', scanHash);
    }
    return list;
  }
}
