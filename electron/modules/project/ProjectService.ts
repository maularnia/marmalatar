import { randomUUID } from 'crypto';
import type { IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import { readProjectState } from '../../../bridge/contracts';
import {
  PROJECT_FILE_VERSION,
  ProjectFileBodySchema,
  ProjectFileHeaderSchema,
  ProjectFileSpellcheckSchema,
  type TProjectCreateInput,
  type TProjectFileBody,
  type TProjectFileHeader,
  type TProjectListEntry,
} from '../../../bridge/definitions/projectEntry';
import {
  ProjectStateV2Schema,
  type ProjectState,
  type TProjectStatePrefs,
} from '../../../bridge/definitions/projectState';
import { isLanguageCode, PROJECT_EXTENSION, toProjectFileName } from '../../../bridge/fileNames';
import {
  addDictionaryWord,
  removeDictionaryWord,
  type TProjectSpellcheck,
} from '../../../bridge/definitions/spellcheckDictionary';
import { readJsonFile } from '../../utils/readJsonFile';
import { runWithFallback } from '../../utils/runWithFallback';
import { normalizeEntries } from '../scanner/normalizeEntries';
import type { TScanEntry } from '../../../bridge/definitions/scan';
import { ScannerService, scanLegacyTrackedFolder } from '../scanner/ScannerService';
import { listAudioTracks } from '../media/metadata';
import { readLegacyEntries } from '../service/readLegacyEntries';
import { Service } from '../service/Service';
import type { TVersioning } from '../service/storeVersioning';

type THeader = TProjectFileHeader['project'];

type TProjectEntry = Omit<TProjectListEntry, 'translationProgress'> & {
  fileHash: string;
  // Device-specific state (editor mode, video collapsed, video path) and the progress computed
  // from the file. Kept here rather than in the .mrml file because it isn't project content.
  // Stored as written, possibly by an older build: read it through readState.
  state: ProjectState;
};

type TProjectData = {
  // Keyed by the projectId inside the file, so a renamed file keeps its order, state and progress
  list: Record<string, TProjectEntry>;
  scanHash: string;
};

// Version 0 kept list metadata in the scanner's folderScanCache.projects, keyed by filePath. Only
// the order and the projectId are taken from it: the cache has no languages, so the header and
// progress are read from the file itself.
const LegacyProjectCacheEntrySchema = z.object({
  filePath: z.string(),
  project: z.object({ projectId: z.string() }),
});

// What the list needs from a .mrml file. Lines that don't parse count as no progress rather than
// dropping the project from the list: the renderer reports the broken file when it's opened.
const ProjectListFileSchema = ProjectFileHeaderSchema.extend({
  editor: z
    .object({ lines: z.array(z.object({ completed: z.boolean().optional() })) })
    .catch({ lines: [] }),
});

// Share of lines marked completed, 0..100
function computeTranslationProgress(lines: readonly { completed?: boolean }[]): number {
  if (!lines.length) return 0;
  return (lines.filter((line) => Boolean(line.completed)).length / lines.length) * 100;
}

type TExtracted = { header: THeader; translationProgress: number };

function extractProjectFile(file: TScanEntry): TExtracted | null {
  const data = readJsonFile(file.filePath, ProjectListFileSchema);
  if (!data) return null;
  return {
    header: data.project,
    translationProgress: computeTranslationProgress(data.editor.lines),
  };
}

const DEFAULT_STATE: ProjectState = ProjectStateV2Schema.parse({});

// The stored state brought up to the current contract version
function readState(state: ProjectState | undefined): ProjectState {
  return state ? runWithFallback(() => readProjectState(state), DEFAULT_STATE) : DEFAULT_STATE;
}

function buildEntry(
  file: TScanEntry,
  { header, translationProgress }: TExtracted,
  // The entry stored under the same projectId, so a re-saved or renamed file keeps what the file
  // doesn't hold
  previous:
    (Pick<TProjectEntry, 'state'> & Partial<Pick<TProjectEntry, 'order' | 'hidden'>>) | undefined,
  order: number
): TProjectEntry {
  return {
    ...header,
    fileName: file.fileName,
    filePath: file.filePath,
    fileHash: file.fileHash,
    order: previous?.order ?? order,
    hidden: previous?.hidden ?? false,
    state: { ...readState(previous?.state), translationProgress },
  };
}

function toListEntry({ fileHash: _, state, ...entry }: TProjectEntry): TProjectListEntry {
  return {
    ...entry,
    translationProgress: readState(state).translationProgress,
  };
}

function headerOf(entry: TProjectEntry): THeader {
  const { projectId, projectName, emoji, sourceLanguage, targetLanguage } = entry;
  return { projectId, projectName, emoji, sourceLanguage, targetLanguage };
}

// The whole .mrml file, always in the current version. The header and the spellcheck dictionary
// come from the project service, the body from the renderer. All are validated, so a stale list
// entry can't write a file the list would then drop.
function assembleFile(
  header: THeader,
  body: TProjectFileBody,
  spellcheck: TProjectSpellcheck
): TProjectFileHeader & TProjectFileBody & { spellcheck: TProjectSpellcheck } {
  return {
    ...ProjectFileHeaderSchema.parse({ version: PROJECT_FILE_VERSION, project: header }),
    ...ProjectFileBodySchema.parse(body),
    ...ProjectFileSpellcheckSchema.parse({ spellcheck }),
  };
}

// The stored file's spellcheck dictionary, kept on every rewrite since the renderer never sends it.
// A version 1 file (or an unreadable one) has none.
function readSpellcheck(fileName: string): TProjectSpellcheck {
  return ProjectFileSpellcheckSchema.parse(ScannerService.getInstance().readFile(fileName) ?? {})
    .spellcheck;
}

export class ProjectService extends Service<TProjectData> {
  static readonly serviceName = 'project';

  readonly versioning: TVersioning<TProjectData> = {
    0: async (store) => {
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
        if (file?.extension !== PROJECT_EXTENSION) return;
        const extracted = extractProjectFile(file);
        const { projectId } = legacy.project;
        // A file that changed since the cache was written may hold another project by now
        if (!extracted || extracted.header.projectId !== projectId || projectId in list) return;
        const legacyState = legacyStates[projectId];
        const state = legacyState
          ? runWithFallback(() => readProjectState(legacyState), DEFAULT_STATE)
          : DEFAULT_STATE;
        // Archiving didn't exist before this version: every migrated project starts visible
        list[projectId] = buildEntry(file, extracted, { state, hidden: false }, index);
      });

      // Version 0 always played the video's first audio stream, so that stays the chosen track
      await Promise.all(
        Object.values(list).map(async (entry) => {
          const { videoPath } = entry.state;
          if (!videoPath) return;
          const tracks = await listAudioTracks(videoPath).catch(() => null);
          entry.state = { ...entry.state, audioTrackId: tracks?.[0]?.id ?? null };
        })
      );
      return { list };
    },
  };

  readonly handlers = [
    this.handle('list', () =>
      Object.values(this.readList())
        .sort((a, b) => a.order - b.order)
        .map(toListEntry)
    ),
    // The whole file as stored. The renderer validates it against its own contract, and reads the
    // header from it but never writes it.
    this.handle('get', (_: IpcMainInvokeEvent, projectId: string) => {
      const entry = this.readList()[projectId];
      return entry ? ScannerService.getInstance().readFile(entry.fileName) : null;
    }),
    // Writes the renderer's body under the listed header. The returned entry carries the progress
    // computed from the new lines.
    this.handle('set', (_: IpcMainInvokeEvent, projectId: string, body: TProjectFileBody) => {
      const entry = this.getEntry(projectId);
      ScannerService.getInstance().writeFile(
        entry.fileName,
        assembleFile(headerOf(entry), body, readSpellcheck(entry.fileName))
      );
      return this.getListEntry(projectId);
    }),
    // The file is named after the project. null when a file with that name already exists.
    this.handle(
      'create',
      (_: IpcMainInvokeEvent, input: TProjectCreateInput, body: TProjectFileBody) => {
        const header: THeader = { ...input, projectId: randomUUID() };
        ProjectFileHeaderSchema.shape.project.parse(header);
        const fileName = toProjectFileName(header.projectName);
        const scanner = ScannerService.getInstance();
        if (scanner.fileExists(fileName)) return null;
        scanner.writeFile(fileName, assembleFile(header, body, {}));
        return this.getListEntry(header.projectId);
      }
    ),
    // Renames the file along with the project. null when another file already has the new name.
    this.handle('rename', (_: IpcMainInvokeEvent, projectId: string, projectName: string) => {
      const entry = this.getEntry(projectId);
      const fileName = toProjectFileName(projectName);
      const scanner = ScannerService.getInstance();
      if (fileName !== entry.fileName && scanner.fileExists(fileName)) return null;
      this.writeHeader(entry, { projectName });
      scanner.moveFile(entry.fileName, fileName);
      return this.getListEntry(projectId);
    }),
    this.handle('set-emoji', (_: IpcMainInvokeEvent, projectId: string, emoji: string) => {
      this.writeHeader(this.getEntry(projectId), { emoji });
      return this.getListEntry(projectId);
    }),
    // Languages live in the file, so they travel with it to another device
    this.handle(
      'set-languages',
      (
        _: IpcMainInvokeEvent,
        projectId: string,
        sourceLanguage: string,
        targetLanguage: string
      ) => {
        const entry = this.getEntry(projectId);
        if (entry.sourceLanguage !== sourceLanguage || entry.targetLanguage !== targetLanguage) {
          this.writeHeader(entry, { sourceLanguage, targetLanguage });
        }
        return this.getListEntry(projectId);
      }
    ),
    // Adds a word to the project's spellcheck dictionary for one language, creating that
    // language's list on first use. Written to the file at once; returns the whole dictionary.
    this.handle(
      'add-to-dictionary',
      (_: IpcMainInvokeEvent, projectId: string, languageCode: string, word: string) => {
        if (!isLanguageCode(languageCode))
          throw new Error(`Invalid language code: ${languageCode}`);
        const entry = this.getEntry(projectId);
        const scanner = ScannerService.getInstance();
        const body = ProjectFileBodySchema.safeParse(scanner.readFile(entry.fileName));
        if (!body.success) throw new Error(`Cannot read project file ${entry.fileName}`);
        const current = readSpellcheck(entry.fileName);
        const spellcheck = {
          ...current,
          [languageCode]: addDictionaryWord(current[languageCode] ?? [], word),
        };
        scanner.writeFile(entry.fileName, assembleFile(headerOf(entry), body.data, spellcheck));
        return spellcheck;
      }
    ),
    // Removes a word (as stored) from the project's dictionary for one language; the language's
    // key goes with its last word. Written to the file at once; returns the whole dictionary.
    this.handle(
      'remove-from-dictionary',
      (_: IpcMainInvokeEvent, projectId: string, languageCode: string, word: string) => {
        const entry = this.getEntry(projectId);
        const scanner = ScannerService.getInstance();
        const body = ProjectFileBodySchema.safeParse(scanner.readFile(entry.fileName));
        if (!body.success) throw new Error(`Cannot read project file ${entry.fileName}`);
        const { [languageCode]: words = [], ...others } = readSpellcheck(entry.fileName);
        const remaining = removeDictionaryWord(words, word);
        const spellcheck = remaining.length ? { ...others, [languageCode]: remaining } : others;
        scanner.writeFile(entry.fileName, assembleFile(headerOf(entry), body.data, spellcheck));
        return spellcheck;
      }
    ),
    // The entry, with its state, goes with the file on the next read
    this.handle('delete', (_: IpcMainInvokeEvent, projectId: string) => {
      ScannerService.getInstance().deleteFile(this.getEntry(projectId).fileName);
    }),
    // Archives (hidden) or restores a project. Its cache isn't touched here: the next cache cleanup
    // treats a hidden project as deleted (see listVideoPaths).
    this.handle('set-hidden', (_: IpcMainInvokeEvent, projectId: string, hidden: boolean) => {
      const list = this.readList();
      const entry = list[projectId];
      if (!entry) throw new Error(`No project with id ${projectId} in the tracked folder`);
      this.store.set('list', { ...list, [projectId]: { ...entry, hidden } });
      return this.getListEntry(projectId);
    }),
    this.handle('get-state', (_: IpcMainInvokeEvent, projectId: string) => {
      const entry = this.readList()[projectId];
      return entry ? readState(entry.state) : null;
    }),
    // Only the renderer's preferences, and only those given: the rest, and computed fields such as
    // the progress, are kept. A different video drops the chosen audio track unless a new one is
    // given, since track ids belong to one file.
    this.handle(
      'set-state',
      (_: IpcMainInvokeEvent, projectId: string, prefs: Partial<TProjectStatePrefs>) => {
        const list = this.readList();
        const entry = list[projectId];
        if (!entry) throw new Error(`No project with id ${projectId} in the tracked folder`);
        const current = readState(entry.state);
        const { editorMode, isVideoCollapsed, videoPath, audioTrackId } = prefs;
        const videoChanged = videoPath !== undefined && videoPath !== current.videoPath;
        const state = ProjectStateV2Schema.parse({
          ...current,
          ...(editorMode !== undefined && { editorMode }),
          ...(isVideoCollapsed !== undefined && { isVideoCollapsed }),
          ...(videoPath !== undefined && { videoPath }),
          ...(audioTrackId !== undefined
            ? { audioTrackId }
            : videoChanged && { audioTrackId: null }),
        });
        this.store.set('list', { ...list, [projectId]: { ...entry, state } });
      }
    ),
  ] as const;

  // Video paths of every listed project, so the media service keeps their cached audio, previews
  // and waveforms. Archived (hidden) projects count as deleted: their cache goes with the next
  // cleanup, and is extracted again when the project is restored and opened.
  listVideoPaths(): string[] {
    return Object.values(this.readList())
      .filter((entry) => !entry.hidden)
      .map((entry) => readState(entry.state).videoPath)
      .filter((videoPath): videoPath is string => Boolean(videoPath));
  }

  private getEntry(projectId: string): TProjectEntry {
    const entry = this.readList()[projectId];
    if (!entry) throw new Error(`No project with id ${projectId} in the tracked folder`);
    return entry;
  }

  // Read after a write, so the list already holds the new file and its progress
  private getListEntry(projectId: string): TProjectListEntry {
    return toListEntry(this.getEntry(projectId));
  }

  // Rewrites the file with header fields replaced, keeping the body as stored
  private writeHeader(entry: TProjectEntry, patch: Partial<Omit<THeader, 'projectId'>>): void {
    const scanner = ScannerService.getInstance();
    const body = ProjectFileBodySchema.safeParse(scanner.readFile(entry.fileName));
    if (!body.success) throw new Error(`Cannot read project file ${entry.fileName}`);
    scanner.writeFile(
      entry.fileName,
      assembleFile({ ...headerOf(entry), ...patch }, body.data, readSpellcheck(entry.fileName))
    );
  }

  // The list, renormalized against the scanner's current listing
  private readList(): Record<string, TProjectEntry> {
    const previousList = this.store.get('list') ?? {};
    let nextOrder = Math.max(-1, ...Object.values(previousList).map(({ order }) => order)) + 1;
    const { list, scanHash, changed } = normalizeEntries({
      scan: ScannerService.getInstance().scan(),
      extension: PROJECT_EXTENSION,
      list: previousList,
      scanHash: this.store.get('scanHash'),
      extract: extractProjectFile,
      keyOf: ({ header }) => header.projectId,
      // Every new or changed file is read whole, so the progress is recomputed after each write
      // and after an edit made outside the app
      build: (file, extracted, previous) =>
        buildEntry(file, extracted, previous, previous ? previous.order : nextOrder++),
    });
    if (changed) {
      this.store.set('list', list);
      this.store.set('scanHash', scanHash);
    }
    return list;
  }
}
