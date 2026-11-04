import i18n from '@src/i18n';
import type { RootState } from '@store/root';
import {
  ProjectSaveV1Schema,
  ProjectEditorStateSchema,
  GlossaryListEntrySchema,
  readPromptTemplateFileContract,
  readGlossaryFileContract,
  type PromptTemplateFileDataType,
  type AIGlossaryFileDataType,
  type TProjectFileData,
  type TProjectEditorState,
  type TGlossaryEntry,
} from './schemas';
import type { TProjectListEntry } from '@bridge/definitions/projectEntry';
import type { TPromptTemplateListEntry } from '@bridge/definitions/promptTemplateEntry';
import { parseProjectFile } from './parsers/project';
import { computeTranslationProgress } from '@utils/translationProgress';
import { FALLBACK_EMOJI } from '@utils/emoji';
import { IPC } from '@src/services/ipc/IPC';

export type { TProjectEditorState, TGlossaryEntry };
export type TProjectEntry = TProjectListEntry;
export type TPromptTemplateEntry = TPromptTemplateListEntry;

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

// Lists come from the main process, which keeps them in line with the tracked folder: it reads
// only files that changed since the last listing.
export async function listProjects(): Promise<TProjectEntry[]> {
  return IPC.projects.list();
}

export async function updateProjectProgress(
  projectId: string,
  translationProgress: number
): Promise<void> {
  await IPC.projects.updateProgress(projectId, translationProgress);
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

// The project's device state goes with it: the main process drops a project's entry once its
// file is gone
export async function deleteProjectFileOnDisk(filePath: string): Promise<void> {
  await IPC.files.deleteFile(toFileName(filePath));
}

// ── Prompt templates ─────────────────────────────────────────────────────────

export async function listPromptTemplates(): Promise<TPromptTemplateEntry[]> {
  return IPC.promptTemplates.list();
}

// ── AI glossaries ────────────────────────────────────────────────────────────

// A glossary whose languages this build doesn't know is left out
export async function listGlossaries(): Promise<TGlossaryEntry[]> {
  const entries = await IPC.glossaries.list();
  return entries.flatMap((entry) => {
    const parsed = GlossaryListEntrySchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}

// ── Per-project editor state ────────────────────────────────────────────────

export async function getProjectEditorState(projectId: string): Promise<TProjectEditorState> {
  return parseProjectEditorState(await IPC.projects.getState(projectId));
}

export async function writeProjectEditorState(
  projectId: string,
  editorState: TProjectEditorState
): Promise<void> {
  await IPC.projects.setState(projectId, editorState);
}

// ── Media cache ──────────────────────────────────────────────────────────────

export async function cleanupMediaCache(): Promise<void> {
  await IPC.media.cleanupCache();
}

// ── Rescan ───────────────────────────────────────────────────────────────────

// Makes the next list read scan the tracked folder again, picking up files changed outside the app
export async function rescanFolder(): Promise<void> {
  await IPC.files.rescan();
}
