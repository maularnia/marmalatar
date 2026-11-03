import i18n from '@src/i18n';
import type { RootState } from '@store/root';
import {
  ProjectSaveV1Schema,
  ProjectEditorStateSchema,
  FolderScanCacheSchema,
  readPromptTemplateFileContract,
  readGlossaryFileContract,
  type PromptTemplateFileDataType,
  type AIGlossaryFileDataType,
  type TProjectFileData,
  type TProjectEditorState,
  type TProjectCacheEntry,
  type TPromptTemplateCacheEntry,
  type TGlossaryCacheEntry,
  type TFolderScanCache,
} from './schemas';
import { parseProjectFile } from './parsers/project';
import { computeTranslationProgress } from '@utils/translationProgress';
import { FALLBACK_EMOJI } from '@utils/emoji';
import { IPC } from '@src/services/ipc/IPC';

export type { TProjectCacheEntry, TFolderScanCache, TProjectEditorState };
export type TPromptTemplateEntry = TPromptTemplateCacheEntry;
export type TGlossaryFileEntry = TGlossaryCacheEntry;

const t = i18n.getFixedT(null, 'errors');

export type TScannedProjectEntry = TProjectFileData & {
  filePath: string;
  fileName: string;
  translationProgress: number;
};

// Project/prompt-template/glossary files always live directly in the tracked folder root (no
// subdirectories) -- the electron side now resolves read/write/delete/exists paths against the
// tracked folder itself, so only the basename ever needs to cross the bridge.
function toFileName(filePath: string): string {
  return filePath.split(/[/\\]/).pop() ?? filePath;
}

function toProjectCacheEntry(
  full: TScannedProjectEntry,
  translationProgress: number
): TProjectCacheEntry {
  return {
    version: 1,
    filePath: full.filePath,
    fileName: full.fileName,
    translationProgress,
    project: {
      projectId: full.project.projectId,
      projectName: full.project.projectName,
      emoji: full.project.emoji,
    },
  };
}

export async function readProjectFile(filePath: string): Promise<TScannedProjectEntry> {
  const text = await IPC.files.readFile(toFileName(filePath));
  if (!text) throw new Error(t('project.cannotRead'));

  const data = parseProjectFile(text);
  const translationProgress = computeTranslationProgress(data.editor.lines);

  return {
    ...data,
    filePath,
    fileName: toFileName(filePath),
    translationProgress,
  };
}

export async function writeProjectSaveData(filePath: string, state: RootState): Promise<void> {
  const { editor, project } = state;
  const { projectId, projectName, emoji, sourceLanguage, targetLanguage } = project;
  const { lines, characterPool } = editor;

  if (!projectName) {
    throw new Error(t('project.cannotSaveWithoutName'));
  }

  const payload = ProjectSaveV1Schema.parse({
    version: 1,
    project: {
      // projectId is always assigned by createNewProject before any save can happen.
      projectId,
      projectName,
      // Defensive fallback only -- emoji is always set by creation/load before any save can happen.
      emoji: emoji ?? FALLBACK_EMOJI,
      // sourceLanguage/targetLanguage are always set by the New Project form before any save can happen.
      sourceLanguage,
      targetLanguage,
    },
    editor: {
      lines,
      characterPool,
    },
  });

  await IPC.files.writeFile(toFileName(filePath), JSON.stringify(payload, null, 2));
}

export function buildProjectEditorStateSaveData(state: RootState): TProjectEditorState {
  return ProjectEditorStateSchema.parse({
    editorMode: state.project.editorMode,
    isVideoCollapsed: state.editor.isVideoCollapsed,
    videoPath: state.project.videoFilePath,
  });
}

function parseProjectEditorState(raw: unknown): TProjectEditorState {
  return ProjectEditorStateSchema.parse(raw && typeof raw === 'object' ? raw : {});
}

export async function readPromptTemplateFile(
  fileName: string
): Promise<PromptTemplateFileDataType | null> {
  const text = await IPC.files.readFile(fileName);
  if (!text) return null;
  try {
    return readPromptTemplateFileContract(JSON.parse(text));
  } catch {
    return null;
  }
}

export async function writePromptTemplateFile(
  fileName: string,
  data: PromptTemplateFileDataType
): Promise<void> {
  await IPC.files.writeFile(fileName, JSON.stringify(data, null, 2));
}

export async function readGlossaryFile(fileName: string): Promise<AIGlossaryFileDataType | null> {
  const text = await IPC.files.readFile(fileName);
  if (!text) return null;
  try {
    return readGlossaryFileContract(JSON.parse(text));
  } catch {
    return null;
  }
}

export async function writeGlossaryFile(
  fileName: string,
  data: AIGlossaryFileDataType
): Promise<void> {
  await IPC.files.writeFile(fileName, JSON.stringify(data, null, 2));
}

// ── Working folder ──────────────────────────────────────────────────────────

export async function getTrackedFolder(): Promise<string | null> {
  return IPC.files.getTrackedFolder();
}

export async function setTrackedFolder(folder: string): Promise<void> {
  await IPC.files.setTrackedFolder(folder);
}

export async function selectFolderDialog(): Promise<string | null> {
  return IPC.files.selectFolder();
}

// ── Generic file helpers ────────────────────────────────────────────────────
// filePath/fileName below are resolved against the tracked folder on the electron side -- see
// toFileName's comment. checkExternalPathExists is the one exception (used only for video paths,
// which live outside the tracked folder).

export async function checkFileExists(fileName: string): Promise<boolean> {
  return IPC.files.checkFileExists(fileName);
}

export async function checkExternalPathExists(absolutePath: string): Promise<boolean> {
  return IPC.files.checkExternalPathExists(absolutePath);
}

export async function deleteFile(fileName: string): Promise<void> {
  await IPC.files.deleteFile(fileName);
}

// ── Projects ─────────────────────────────────────────────────────────────────

// Rescan-only header scan: reads/parses every project file (unavoidable -- name/emoji/
// languages live inside the same JSON blob as the lines) but discards `lines`/`characterPool`
// after extracting the header, and keeps each project's previously-cached progress instead
// of recomputing it -- a rescan only ever refreshes the file list, never progress.
export async function scanProjectFileHeaders(
  previousProgressByFilePath: ReadonlyMap<string, number>
): Promise<TProjectCacheEntry[]> {
  const filePaths = await IPC.files.listMrmlFiles();
  const results = await Promise.all(
    filePaths.map(async (fp) => {
      try {
        const full = await readProjectFile(fp);
        return toProjectCacheEntry(full, previousProgressByFilePath.get(fp) ?? 0);
      } catch {
        return null;
      }
    })
  );

  // Best-effort housekeeping side effect of scanning -- not awaited (so it can't slow down the
  // scan) and not surfaced as a toast (it isn't a user-initiated action).
  void cleanupMediaCache().catch(() => {});

  return results.filter((p): p is TProjectCacheEntry => p !== null);
}

export async function renameProjectFileOnDisk(
  filePath: string,
  newFilePath: string,
  projectName: string
): Promise<{ project: TProjectFileData['project'] }> {
  const text = await IPC.files.readFile(toFileName(filePath));
  if (!text) throw new Error(t('project.cannotRead'));

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(t('project.corrupted'));
  }
  const projectData = data.project as TProjectFileData['project'];
  projectData.projectName = projectName;

  await IPC.files.writeFile(toFileName(newFilePath), JSON.stringify(data, null, 2));
  if (newFilePath !== filePath) {
    await IPC.files.deleteFile(toFileName(filePath));
  }

  return { project: projectData };
}

export async function updateProjectEmojiOnDisk(
  filePath: string,
  emoji: string
): Promise<{ project: TProjectFileData['project'] }> {
  const text = await IPC.files.readFile(toFileName(filePath));
  if (!text) throw new Error(t('project.cannotRead'));

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(t('project.corrupted'));
  }
  const projectData = data.project as TProjectFileData['project'];
  projectData.emoji = emoji;

  await IPC.files.writeFile(toFileName(filePath), JSON.stringify(data, null, 2));

  return { project: projectData };
}

export async function deleteProjectFileOnDisk(
  filePath: string,
  projectId?: string | null
): Promise<void> {
  await IPC.files.deleteFile(toFileName(filePath));
  if (projectId) await IPC.projectState.remove(projectId);
}

// ── Prompt templates ─────────────────────────────────────────────────────────

export async function scanPromptTemplateFiles(): Promise<TPromptTemplateEntry[]> {
  const paths = await IPC.files.listPromptTemplateFiles();
  const items: TPromptTemplateEntry[] = [];
  for (const p of paths) {
    const basename = toFileName(p);
    const text = await IPC.files.readFile(basename);
    if (!text) continue;
    try {
      const data = readPromptTemplateFileContract(JSON.parse(text));
      items.push({ version: 1, fileName: basename, title: data.title, emoji: data.emoji });
    } catch {
      /* skip invalid */
    }
  }
  return items;
}

// ── AI glossaries ────────────────────────────────────────────────────────────

export async function scanGlossaryFiles(): Promise<TGlossaryFileEntry[]> {
  const paths = await IPC.files.listAIGlossaryFiles();
  const items: TGlossaryFileEntry[] = [];
  for (const p of paths) {
    const basename = toFileName(p);
    const text = await IPC.files.readFile(basename);
    if (!text) continue;
    try {
      const data = readGlossaryFileContract(JSON.parse(text));
      items.push({
        version: 1,
        fileName: basename,
        title: data.title,
        emoji: data.emoji,
        sourceLanguage: data.sourceLanguage,
        targetLanguage: data.targetLanguage,
      });
    } catch {
      /* skip invalid */
    }
  }
  return items;
}

// ── Per-project editor state ────────────────────────────────────────────────

export async function getProjectEditorState(projectId: string): Promise<TProjectEditorState> {
  return parseProjectEditorState(await IPC.projectState.get(projectId));
}

export async function writeProjectEditorState(
  projectId: string,
  editorState: TProjectEditorState
): Promise<void> {
  await IPC.projectState.set(projectId, editorState);
}

// ── Media cache ──────────────────────────────────────────────────────────────

export async function cleanupMediaCache(): Promise<void> {
  await IPC.media.cleanupMediaCache();
}

// ── Folder-scan cache ───────────────────────────────────────────────────────

export async function getFolderScanCache(): Promise<TFolderScanCache | null> {
  const raw = await IPC.scanCache.get();
  if (!raw) return null;
  const result = FolderScanCacheSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export async function setFolderScanCache(cache: TFolderScanCache): Promise<void> {
  // The FE's own TFolderScanCache has no top-level `version` (it's rebuilt locally rather than
  // re-exporting the bridge contract -- see schemas.ts), so it's added here at the one place that
  // actually crosses into the versioned bridge contract.
  await IPC.scanCache.set({ version: 1, ...cache });
}

export async function upsertProjectCacheEntry(entry: TProjectCacheEntry): Promise<void> {
  await IPC.scanCache.upsertProject(entry);
}

export async function removeProjectCacheEntry(filePath: string): Promise<void> {
  await IPC.scanCache.removeProject(filePath);
}

export async function updateProjectCacheProgress(
  filePath: string,
  translationProgress: number
): Promise<void> {
  await IPC.scanCache.updateProjectProgress(filePath, translationProgress);
}

export async function upsertPromptTemplateCacheEntry(
  entry: TPromptTemplateCacheEntry
): Promise<void> {
  await IPC.scanCache.upsertPromptTemplate(entry);
}

export async function removePromptTemplateCacheEntry(fileName: string): Promise<void> {
  await IPC.scanCache.removePromptTemplate(fileName);
}

export async function upsertGlossaryCacheEntry(entry: TGlossaryCacheEntry): Promise<void> {
  await IPC.scanCache.upsertGlossary(entry);
}

export async function removeGlossaryCacheEntry(fileName: string): Promise<void> {
  await IPC.scanCache.removeGlossary(fileName);
}
