import i18n from '@src/i18n';
import { DEFAULT_PROMPT_TEMPLATE } from '@src/services/ai/connector/config';
import { IPC } from '@src/services/ipc/IPC';
import {
  readPromptTemplateFileContract,
  type PromptTemplateFileDataType,
} from '@src/utils/data/schemas';
import { pickRandomCreationEmoji } from '@src/utils/emoji';
import { dispatch, select } from '@store/createApi';
import { overlays, TOverlay } from '@store/slices/overlays';
import { workingFolder } from '@store/slices/workingFolder';
import {
  closePromptTemplateEditor,
  selectCurrentPromptTemplate,
  selectSelectedPromptTemplateFileName,
  setCurrentPromptTemplate,
  setPromptTemplateData,
  setPromptTemplateItems,
  setSelectedPromptTemplateFileName,
  type TPromptTemplateEntry,
} from './slice';

// The prompt service's operations. They read their own state with select(localSelector), not the
// facade: index.ts builds the facade from this file, so importing it here would be a cycle.

const t = i18n.getFixedT(null, 'errors');

// ── IPC ──────────────────────────────────────────────────────────────────────

// Prompt template files are reached only through the main process's prompt template service, keyed
// by file name. The renderer reads whole files but writes only the template text: the header
// (title, emoji) changes through dedicated calls. create and rename resolve to null when the file
// name the title maps to is taken.

async function listPromptTemplates(): Promise<TPromptTemplateEntry[]> {
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
async function createPromptTemplateOnDisk({
  title,
  emoji,
  promptTemplate,
}: PromptTemplateFileDataType): Promise<string | null> {
  const entry = await IPC.promptTemplates.create({ title, emoji }, { promptTemplate });
  return entry?.fileName ?? null;
}

// The new file name, or null when it's taken
async function renamePromptTemplateOnDisk(fileName: string, title: string): Promise<string | null> {
  const entry = await IPC.promptTemplates.rename(fileName, title);
  return entry?.fileName ?? null;
}

async function updatePromptTemplateEmojiOnDisk(fileName: string, emoji: string): Promise<void> {
  await IPC.promptTemplates.setEmoji(fileName, emoji);
}

async function deletePromptTemplateOnDisk(fileName: string): Promise<void> {
  await IPC.promptTemplates.delete(fileName);
}

// ── List ─────────────────────────────────────────────────────────────────

// The list comes from the main process, which renormalizes it against the tracked folder on every
// read, so after any write the renderer just reads it again. A selection whose file is gone is
// dropped.
export async function refreshPromptTemplates(): Promise<void> {
  const promptTemplateItems = await listPromptTemplates();
  dispatch(setPromptTemplateItems(promptTemplateItems));
  const selectedTemplate = select(selectSelectedPromptTemplateFileName);
  if (selectedTemplate && !promptTemplateItems.some((i) => i.fileName === selectedTemplate)) {
    dispatch(setSelectedPromptTemplateFileName(null));
  }
}

// ── Prompt templates ───────────────────────────────────────────────────

async function initializePromptTemplateEditor(fileName: string): Promise<void> {
  dispatch(setCurrentPromptTemplate(fileName));
  dispatch(setPromptTemplateData(null));
  const folder = workingFolder.get.folder();
  if (!folder) return;
  const data = await readPromptTemplateFile(fileName);
  dispatch(setPromptTemplateData(data));
}

export async function deletePromptTemplate(fileName: string): Promise<void> {
  const folder = workingFolder.get.folder();
  if (!folder) return;
  await deletePromptTemplateOnDisk(fileName);
  await refreshPromptTemplates();
  if (select(selectCurrentPromptTemplate) === fileName) {
    dispatch(closePromptTemplateEditor());
  }
}

export async function renamePromptTemplate(fileName: string, newTitle: string): Promise<void> {
  const folder = workingFolder.get.folder();
  if (!folder) throw new Error(t('shared.folderNotSelected'));
  const trimmed = newTitle.trim();
  if (!trimmed) throw new Error(t('shared.nameEmpty'));

  const newFileName = await renamePromptTemplateOnDisk(fileName, trimmed);
  if (!newFileName) throw new Error(t('promptTemplate.alreadyExists', { title: trimmed }));
  // Re-read: the main process wrote the header
  const updated = await readPromptTemplateFile(newFileName);
  if (!updated) throw new Error(t('promptTemplate.readFailed'));

  if (newFileName !== fileName) {
    const selectedPt = select(selectSelectedPromptTemplateFileName);
    if (selectedPt === fileName) dispatch(setSelectedPromptTemplateFileName(newFileName));
    if (select(selectCurrentPromptTemplate) === fileName) {
      dispatch(setCurrentPromptTemplate(newFileName));
      dispatch(setPromptTemplateData(updated));
    }
  } else if (select(selectCurrentPromptTemplate) === fileName) {
    dispatch(setPromptTemplateData(updated));
  }

  await refreshPromptTemplates();
}

export async function updatePromptTemplateEmoji(fileName: string, emoji: string): Promise<void> {
  const folder = workingFolder.get.folder();
  if (!folder) throw new Error(t('shared.folderNotSelected'));

  await updatePromptTemplateEmojiOnDisk(fileName, emoji);
  const updated = await readPromptTemplateFile(fileName);
  if (!updated) throw new Error(t('promptTemplate.readFailed'));

  if (select(selectCurrentPromptTemplate) === fileName) {
    dispatch(setPromptTemplateData(updated));
  }

  await refreshPromptTemplates();
}

export async function createPromptTemplate(title: string): Promise<void> {
  const folder = workingFolder.get.folder();
  if (!folder) throw new Error(t('shared.folderNotSelected'));
  const trimmed = title.trim();
  if (!trimmed) throw new Error(t('shared.nameEmpty'));

  const emoji = await pickRandomCreationEmoji();
  const data: PromptTemplateFileDataType = {
    version: 1,
    title: trimmed,
    emoji,
    promptTemplate: DEFAULT_PROMPT_TEMPLATE,
  };
  const fileName = await createPromptTemplateOnDisk(data);
  if (!fileName) throw new Error(t('promptTemplate.alreadyExists', { title: trimmed }));
  await refreshPromptTemplates();
  await openPromptTemplateEditor(fileName);
}

export async function openPromptTemplateEditor(filename: string): Promise<void> {
  if (
    overlays.get.current() === TOverlay.PROMPT_TEMPLATE &&
    select(selectCurrentPromptTemplate) === filename
  ) {
    return;
  }
  overlays.setCurrent(TOverlay.PROMPT_TEMPLATE);
  await initializePromptTemplateEditor(filename);
}
