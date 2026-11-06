import i18n from '@src/i18n';
import { modal } from '@src/services/modal';
import { DEFAULT_PROMPT_TEMPLATE } from '@src/services/ai/connector/config';
import { IPC } from '@src/services/ipc/IPC';
import {
  readPromptTemplateFileContract,
  type PromptTemplateFileDataType,
} from '@src/utils/data/schemas';
import { pickRandomCreationEmoji } from '@src/utils/emoji';
import type { TLoadOptions } from '@src/services/modal';
import { Service } from '@src/services/Service';
import { folder } from '@src/services/folder';
import {
  closePromptTemplateEditor,
  selectCurrentPromptTemplate,
  selectSelectedPromptTemplateFileName,
  setCurrentPromptTemplate,
  setPromptTemplateData,
  setPromptTemplateItems,
  selectPromptTemplateData,
  selectPromptTemplateItems,
  setSelectedPromptTemplateFileName,
  templateSaved,
  type TPromptTemplateEntry,
} from './slice';

// The prompt service's operations. They read their own state with Service.select(localSelector), not the
// facade: index.ts builds the facade from this file, so importing it here would be a cycle.

const t = i18n.getFixedT(null, 'errors');
const tMessages = i18n.getFixedT(null, 'messages');

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
  Service.dispatch(setPromptTemplateItems(promptTemplateItems));
  const selectedTemplate = Service.select(selectSelectedPromptTemplateFileName);
  if (selectedTemplate && !promptTemplateItems.some((i) => i.fileName === selectedTemplate)) {
    Service.dispatch(setSelectedPromptTemplateFileName(null));
  }
}

// ── Prompt templates ───────────────────────────────────────────────────

async function initializePromptTemplateEditor(fileName: string): Promise<void> {
  Service.dispatch(setCurrentPromptTemplate(fileName));
  Service.dispatch(setPromptTemplateData(null));
  const folderPath = folder.get.path();
  if (!folderPath) return;
  const data = await readPromptTemplateFile(fileName);
  Service.dispatch(setPromptTemplateData(data));
}

export async function deletePromptTemplate(fileName: string): Promise<void> {
  const folderPath = folder.get.path();
  if (!folderPath) return;
  await deletePromptTemplateOnDisk(fileName);
  await refreshPromptTemplates();
  if (Service.select(selectCurrentPromptTemplate) === fileName) {
    Service.dispatch(closePromptTemplateEditor());
  }
}

export async function renamePromptTemplate(fileName: string, newTitle: string): Promise<void> {
  const folderPath = folder.get.path();
  if (!folderPath) throw new Error(t('shared.folderNotSelected'));
  const trimmed = newTitle.trim();
  if (!trimmed) throw new Error(t('shared.nameEmpty'));

  const newFileName = await renamePromptTemplateOnDisk(fileName, trimmed);
  if (!newFileName) throw new Error(t('promptTemplate.alreadyExists', { title: trimmed }));
  // Re-read: the main process wrote the header
  const updated = await readPromptTemplateFile(newFileName);
  if (!updated) throw new Error(t('promptTemplate.readFailed'));

  if (newFileName !== fileName) {
    const selectedPt = Service.select(selectSelectedPromptTemplateFileName);
    if (selectedPt === fileName) Service.dispatch(setSelectedPromptTemplateFileName(newFileName));
    if (Service.select(selectCurrentPromptTemplate) === fileName) {
      Service.dispatch(setCurrentPromptTemplate(newFileName));
      Service.dispatch(setPromptTemplateData(updated));
    }
  } else if (Service.select(selectCurrentPromptTemplate) === fileName) {
    Service.dispatch(setPromptTemplateData(updated));
  }

  await refreshPromptTemplates();
}

export async function updatePromptTemplateEmoji(fileName: string, emoji: string): Promise<void> {
  const folderPath = folder.get.path();
  if (!folderPath) throw new Error(t('shared.folderNotSelected'));

  await updatePromptTemplateEmojiOnDisk(fileName, emoji);
  const updated = await readPromptTemplateFile(fileName);
  if (!updated) throw new Error(t('promptTemplate.readFailed'));

  if (Service.select(selectCurrentPromptTemplate) === fileName) {
    Service.dispatch(setPromptTemplateData(updated));
  }

  await refreshPromptTemplates();
}

export async function createPromptTemplate(title: string): Promise<void> {
  const folderPath = folder.get.path();
  if (!folderPath) throw new Error(t('shared.folderNotSelected'));
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

/** Writes the open template's body, refreshes the list, and announces it (`templateSaved`), so the
 * ai service can take the new text if it's the template the translation uses. */
export async function savePromptTemplate(): Promise<void> {
  const fileName = Service.select(selectCurrentPromptTemplate);
  const data = Service.select(selectPromptTemplateData);
  if (!fileName || !data || !folder.get.path()) return;
  await writePromptTemplateBody(fileName, data);
  await refreshPromptTemplates();
  const isSelected = Service.select(selectSelectedPromptTemplateFileName) === fileName;
  Service.dispatch(templateSaved({ fileName, data, isSelected }));
}

/** Saves the open template behind the saving loader, then closes the editor. `loaderOptions` lets
 * a caller that opens something else right after drop the loader's minimum lifetime. */
export async function saveAndClosePromptTemplate(loaderOptions?: TLoadOptions): Promise<void> {
  const fileName = Service.select(selectCurrentPromptTemplate);
  if (!fileName) return;
  const title =
    Service.select(selectPromptTemplateData)?.title ||
    Service.select(selectPromptTemplateItems).find((i) => i.fileName === fileName)?.title ||
    '...';
  await modal.load(
    { messages: [tMessages('promptTemplate.savingLabel', { title })] },
    savePromptTemplate(),
    loaderOptions
  );
  Service.dispatch(closePromptTemplateEditor());
}

export async function openPromptTemplateEditor(filename: string): Promise<void> {
  // Opening the editor is the prompt service's own business; closing other overlays first is up
  // to the caller
  if (Service.select(selectCurrentPromptTemplate) === filename) return;
  await initializePromptTemplateEditor(filename);
}
