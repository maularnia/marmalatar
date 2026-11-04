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
  type TProjectFileBody,
  type TProjectFileData,
  type TProjectEditorState,
  type TGlossaryEntry,
} from './schemas';
import type { TProjectListEntry } from '@bridge/definitions/projectEntry';
import type { TProjectStatePrefs } from '@bridge/definitions/projectState';
import type { TPromptTemplateListEntry } from '@bridge/definitions/promptTemplateEntry';
import { TLanguage } from '@src/types';
import { parseProjectFile } from './parsers/project';
import { IPC } from '@src/services/ipc/IPC';

export type { TProjectEditorState, TGlossaryEntry };
export type TProjectEntry = TProjectListEntry;
export type TPromptTemplateEntry = TPromptTemplateListEntry;

const t = i18n.getFixedT(null, 'errors');

// Files in the tracked folder are reached only through the main process's project, prompt template
// and glossary services, keyed by projectId or file name. The renderer reads whole files but
// writes only their bodies: headers (names, titles, emoji, languages) change through dedicated
// calls, and the services compute what derives from the file, such as translation progress.
// create and rename resolve to null when the file name the title maps to is taken.

// ── Projects ─────────────────────────────────────────────────────────────────

export async function readProjectFile(projectId: string): Promise<TProjectFileData> {
  const raw = await IPC.projects.get(projectId);
  if (!raw) throw new Error(t('project.cannotRead'));
  return parseProjectFile(raw);
}

function buildProjectBody(state: RootState): TProjectFileBody {
  const { lines, characterPool } = state.editor;
  return {
    editor: ProjectSaveV1Schema.shape.editor.parse({ lines, characterPool }),
  };
}

// The updated list entry, with the progress the main process computed from the new lines
export async function writeProjectBody(
  projectId: string,
  state: RootState
): Promise<TProjectEntry> {
  return IPC.projects.set(projectId, buildProjectBody(state));
}

type TProjectHeaderInput = {
  projectName: string;
  emoji: string;
  sourceLanguage: TLanguage;
  targetLanguage: TLanguage;
};

// The main process names the file and assigns the projectId. null when the name is taken.
export async function createProjectOnDisk(
  header: TProjectHeaderInput,
  body: TProjectFileBody
): Promise<TProjectEntry | null> {
  return IPC.projects.create(header, body);
}

export async function renameProjectOnDisk(
  projectId: string,
  projectName: string
): Promise<TProjectEntry | null> {
  return IPC.projects.rename(projectId, projectName);
}

export async function updateProjectEmojiOnDisk(
  projectId: string,
  emoji: string
): Promise<TProjectEntry> {
  return IPC.projects.setEmoji(projectId, emoji);
}

export async function updateProjectLanguagesOnDisk(
  projectId: string,
  sourceLanguage: TLanguage,
  targetLanguage: TLanguage
): Promise<TProjectEntry> {
  return IPC.projects.setLanguages(projectId, sourceLanguage, targetLanguage);
}

// The project's device state goes with it: the main process drops a project's entry once its
// file is gone
export async function deleteProjectOnDisk(projectId: string): Promise<void> {
  await IPC.projects.delete(projectId);
}

export async function listProjects(): Promise<TProjectEntry[]> {
  return IPC.projects.list();
}

// ── Per-project editor state ────────────────────────────────────────────────

export function buildProjectEditorStateSaveData(state: RootState): TProjectStatePrefs {
  return {
    editorMode: state.project.editorMode,
    isVideoCollapsed: state.editor.isVideoCollapsed,
    videoPath: state.project.videoFilePath,
  };
}

export async function getProjectEditorState(projectId: string): Promise<TProjectEditorState> {
  const raw = await IPC.projects.getState(projectId);
  return ProjectEditorStateSchema.parse(raw && typeof raw === 'object' ? raw : {});
}

export async function writeProjectEditorState(
  projectId: string,
  prefs: TProjectStatePrefs
): Promise<void> {
  await IPC.projects.setState(projectId, prefs);
}

// ── Prompt templates ─────────────────────────────────────────────────────────

export async function listPromptTemplates(): Promise<TPromptTemplateEntry[]> {
  return IPC.promptTemplates.list();
}

export async function readPromptTemplateFile(
  fileName: string
): Promise<PromptTemplateFileDataType | null> {
  const raw = await IPC.promptTemplates.get(fileName);
  if (!raw) return null;
  try {
    return readPromptTemplateFileContract(raw);
  } catch {
    return null;
  }
}

export async function writePromptTemplateBody(
  fileName: string,
  { promptTemplate }: PromptTemplateFileDataType
): Promise<void> {
  await IPC.promptTemplates.set(fileName, { promptTemplate });
}

// The new file name, or null when it's taken
export async function createPromptTemplateOnDisk({
  title,
  emoji,
  promptTemplate,
}: PromptTemplateFileDataType): Promise<string | null> {
  const entry = await IPC.promptTemplates.create({ title, emoji }, { promptTemplate });
  return entry?.fileName ?? null;
}

// The new file name, or null when it's taken
export async function renamePromptTemplateOnDisk(
  fileName: string,
  title: string
): Promise<string | null> {
  const entry = await IPC.promptTemplates.rename(fileName, title);
  return entry?.fileName ?? null;
}

export async function updatePromptTemplateEmojiOnDisk(
  fileName: string,
  emoji: string
): Promise<void> {
  await IPC.promptTemplates.setEmoji(fileName, emoji);
}

export async function deletePromptTemplateOnDisk(fileName: string): Promise<void> {
  await IPC.promptTemplates.delete(fileName);
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

export async function readGlossaryFile(fileName: string): Promise<AIGlossaryFileDataType | null> {
  const raw = await IPC.glossaries.get(fileName);
  if (!raw) return null;
  try {
    return readGlossaryFileContract(raw);
  } catch {
    return null;
  }
}

export async function writeGlossaryBody(
  fileName: string,
  { list }: Pick<AIGlossaryFileDataType, 'list'>
): Promise<void> {
  await IPC.glossaries.set(fileName, { list });
}

// The new file name, or null when it's taken
export async function createGlossaryOnDisk({
  title,
  emoji,
  sourceLanguage,
  targetLanguage,
  list,
}: AIGlossaryFileDataType): Promise<string | null> {
  const entry = await IPC.glossaries.create(
    { title, emoji, sourceLanguage, targetLanguage },
    { list }
  );
  return entry?.fileName ?? null;
}

// The new file name, or null when it's taken
export async function renameGlossaryOnDisk(
  fileName: string,
  title: string
): Promise<string | null> {
  const entry = await IPC.glossaries.rename(fileName, title);
  return entry?.fileName ?? null;
}

export async function updateGlossaryEmojiOnDisk(fileName: string, emoji: string): Promise<void> {
  await IPC.glossaries.setEmoji(fileName, emoji);
}

export async function updateGlossaryLanguagesOnDisk(
  fileName: string,
  sourceLanguage: TLanguage,
  targetLanguage: TLanguage
): Promise<void> {
  await IPC.glossaries.setLanguages(fileName, sourceLanguage, targetLanguage);
}

export async function deleteGlossaryOnDisk(fileName: string): Promise<void> {
  await IPC.glossaries.delete(fileName);
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

// Video paths live outside the tracked folder, wherever the user picked the video from
export async function checkExternalPathExists(absolutePath: string): Promise<boolean> {
  return IPC.files.checkExternalPathExists(absolutePath);
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
