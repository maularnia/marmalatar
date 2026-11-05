import { api } from '@store/createApi';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { TPromptTemplateListEntry } from '@bridge/definitions/promptTemplateEntry';
import i18n from '@src/i18n';
import { DEFAULT_PROMPT_TEMPLATE } from '@src/services/ai/config';
import { IPC } from '@src/services/ipc/IPC';
import { TLanguage } from '@src/types';
import {
  GlossaryListEntrySchema,
  readGlossaryFileContract,
  readPromptTemplateFileContract,
  type AIGlossaryFileDataType,
  type PromptTemplateFileDataType,
  type TGlossaryEntry,
} from '@src/utils/data/schemas';
import { pickRandomCreationEmoji } from '@src/utils/emoji';
import type { AppDispatch, RootState } from '@store/root';
import { workingFolder } from '@store/slices/workingFolder';
import { TOverlay } from '@store/slices/overlays';
import { overlays } from '@store/slices/overlays';
import { prompt } from '@store/slices/prompt';

export type { TGlossaryEntry };
type TPromptTemplateEntry = TPromptTemplateListEntry;

const t = i18n.getFixedT(null, 'errors');

// ── IPC ──────────────────────────────────────────────────────────────────────

// Files in the tracked folder are reached only through the main process's project, prompt template
// and glossary services, keyed by projectId or file name. The renderer reads whole files but
// writes only their bodies: headers (names, titles, emoji, languages) change through dedicated
// calls, and the services compute what derives from the file, such as translation progress.
// create and rename resolve to null when the file name the title maps to is taken.

// Prompt templates

async function listPromptTemplates(): Promise<TPromptTemplateEntry[]> {
  return IPC.promptTemplates.list();
}

// A glossary whose languages this build doesn't know is left out
async function listGlossaries(): Promise<TGlossaryEntry[]> {
  const entries = await IPC.glossaries.list();
  return entries.flatMap((entry) => {
    const parsed = GlossaryListEntrySchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}

async function readPromptTemplateFile(
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

async function writePromptTemplateBody(
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

// Glossaries

async function readGlossaryFile(fileName: string): Promise<AIGlossaryFileDataType | null> {
  const raw = await IPC.glossaries.get(fileName);
  if (!raw) return null;
  try {
    return readGlossaryFileContract(raw);
  } catch {
    return null;
  }
}

async function writeGlossaryBody(
  fileName: string,
  { list }: Pick<AIGlossaryFileDataType, 'list'>
): Promise<void> {
  await IPC.glossaries.set(fileName, { list });
}

// The new file name, or null when it's taken
async function createGlossaryOnDisk({
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
async function renameGlossaryOnDisk(fileName: string, title: string): Promise<string | null> {
  const entry = await IPC.glossaries.rename(fileName, title);
  return entry?.fileName ?? null;
}

async function updateGlossaryEmojiOnDisk(fileName: string, emoji: string): Promise<void> {
  await IPC.glossaries.setEmoji(fileName, emoji);
}

async function updateGlossaryLanguagesOnDisk(
  fileName: string,
  sourceLanguage: TLanguage,
  targetLanguage: TLanguage
): Promise<void> {
  await IPC.glossaries.setLanguages(fileName, sourceLanguage, targetLanguage);
}

async function deleteGlossaryOnDisk(fileName: string): Promise<void> {
  await IPC.glossaries.delete(fileName);
}

type AiPromptEditorState = {
  // The tracked folder's prompt templates and glossaries, as the main process lists them
  promptTemplateItems: TPromptTemplateEntry[];
  glossaryItems: TGlossaryEntry[];
  currentPromptTemplate: string | null;
  promptTemplateData: PromptTemplateFileDataType | null;
  currentGlossary: string | null;
  glossaryData: AIGlossaryFileDataType | null;
  resolvedGlossaryEntries: [string, string][];
};

const initialState: AiPromptEditorState = {
  promptTemplateItems: [],
  glossaryItems: [],
  currentPromptTemplate: null,
  promptTemplateData: null,
  currentGlossary: null,
  glossaryData: null,
  resolvedGlossaryEntries: [],
};

const aiPromptEditorSlice = createSlice({
  name: 'aiPromptEditor',
  initialState,
  reducers: {
    setPromptTemplateItems(state, action: PayloadAction<TPromptTemplateEntry[]>) {
      state.promptTemplateItems = action.payload;
    },
    setGlossaryItems(state, action: PayloadAction<TGlossaryEntry[]>) {
      state.glossaryItems = action.payload;
    },
    setCurrentPromptTemplate(state, action: PayloadAction<string | null>) {
      state.currentPromptTemplate = action.payload;
    },
    setPromptTemplateData(state, action: PayloadAction<PromptTemplateFileDataType | null>) {
      state.promptTemplateData = action.payload;
    },
    setCurrentGlossary(state, action: PayloadAction<string | null>) {
      state.currentGlossary = action.payload;
    },
    setGlossaryData(state, action: PayloadAction<AIGlossaryFileDataType | null>) {
      state.glossaryData = action.payload;
    },
    setResolvedGlossaryEntries(state, action: PayloadAction<[string, string][]>) {
      state.resolvedGlossaryEntries = action.payload;
    },
    // Resets the editor's own scratch state only -- resolvedGlossaryEntries is the active
    // translation-time glossary cache, not scratch editor state, and is deliberately preserved
    // here (dispatched from opening Settings/Export and switching/deleting projects, none of
    // which should invalidate a glossary resolution that's still valid). The lists are the tracked
    // folder's, not the editor's, and are kept too.
    resetAiPromptEditor(state): AiPromptEditorState {
      return {
        ...initialState,
        promptTemplateItems: state.promptTemplateItems,
        glossaryItems: state.glossaryItems,
        resolvedGlossaryEntries: state.resolvedGlossaryEntries,
      };
    },
  },
  extraReducers(builder) {
    builder.addCase(overlays.closeAll, (state) => {
      state.promptTemplateData = null;
      state.glossaryData = null;
      state.currentPromptTemplate = null;
      state.currentGlossary = null;
    });
    builder.addCase(prompt.setSelectedGlossaryFileNames, (state) => {
      state.resolvedGlossaryEntries = [];
    });
  },
  selectors: {
    selectPromptTemplateItems: (state) => state.promptTemplateItems,
    selectGlossaryItems: (state) => state.glossaryItems,
    selectCurrentPromptTemplate: (state) => state.currentPromptTemplate,
    selectPromptTemplateData: (state) => state.promptTemplateData,
    selectCurrentGlossary: (state) => state.currentGlossary,
    selectGlossaryData: (state) => state.glossaryData,
    selectResolvedGlossaryEntries: (state) => state.resolvedGlossaryEntries,
  },
});

const { setCurrentPromptTemplate, setCurrentGlossary } = aiPromptEditorSlice.actions;

const {
  setPromptTemplateItems,
  setGlossaryItems,
  setPromptTemplateData,
  setGlossaryData,
  setResolvedGlossaryEntries,
  resetAiPromptEditor,
} = aiPromptEditorSlice.actions;

const {
  selectPromptTemplateItems,
  selectGlossaryItems,
  selectCurrentPromptTemplate,
  selectPromptTemplateData,
  selectCurrentGlossary,
  selectGlossaryData,
  selectResolvedGlossaryEntries,
} = aiPromptEditorSlice.selectors;

export default aiPromptEditorSlice.reducer;

// ── List thunks ──────────────────────────────────────────────────────────────

// The lists come from the main process, which renormalizes them against the tracked folder on
// every read, so after any write the renderer just reads them again. A selection whose file is gone
// is dropped.
const refreshPromptTemplates =
  () =>
  async (dispatch: AppDispatch): Promise<void> => {
    const promptTemplateItems = await listPromptTemplates();
    dispatch(setPromptTemplateItems(promptTemplateItems));
    const selectedTemplate = prompt.get.selectedPromptTemplateFileName();
    if (selectedTemplate && !promptTemplateItems.some((i) => i.fileName === selectedTemplate)) {
      prompt.setSelectedPromptTemplateFileName(null);
    }
  };

const refreshGlossaries =
  () =>
  async (dispatch: AppDispatch): Promise<void> => {
    const glossaryItems = await listGlossaries();
    dispatch(setGlossaryItems(glossaryItems));
    const selectedGlossaries = prompt.get.selectedGlossaryFileNames();
    const stillValidGlossaries = selectedGlossaries.filter((fn) =>
      glossaryItems.some((i) => i.fileName === fn)
    );
    if (stillValidGlossaries.length !== selectedGlossaries.length) {
      prompt.setSelectedGlossaryFileNames(stillValidGlossaries);
    }
  };

// ── Prompt template thunks ───────────────────────────────────────────────────

const initializePromptTemplateEditor =
  (fileName: string) =>
  async (dispatch: AppDispatch): Promise<void> => {
    dispatch(setCurrentGlossary(null));
    dispatch(setGlossaryData(null));
    dispatch(setCurrentPromptTemplate(fileName));
    dispatch(setPromptTemplateData(null));
    const folder = workingFolder.get.folder();
    if (!folder) return;
    const data = await readPromptTemplateFile(fileName);
    dispatch(setPromptTemplateData(data));
  };

const deletePromptTemplate =
  (fileName: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const folder = workingFolder.selectFolder(state);
    if (!folder) return;
    await deletePromptTemplateOnDisk(fileName);
    await dispatch(refreshPromptTemplates());
    if (state.aiPromptEditor.currentPromptTemplate === fileName) {
      dispatch(resetAiPromptEditor());
    }
  };

const renamePromptTemplate =
  (fileName: string, newTitle: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const folder = workingFolder.selectFolder(state);
    if (!folder) throw new Error(t('shared.folderNotSelected'));
    const trimmed = newTitle.trim();
    if (!trimmed) throw new Error(t('shared.nameEmpty'));

    const newFileName = await renamePromptTemplateOnDisk(fileName, trimmed);
    if (!newFileName) throw new Error(t('promptTemplate.alreadyExists', { title: trimmed }));
    // Re-read: the main process wrote the header
    const updated = await readPromptTemplateFile(newFileName);
    if (!updated) throw new Error(t('promptTemplate.readFailed'));

    if (newFileName !== fileName) {
      const selectedPt = prompt.selectSelectedPromptTemplateFileName(state);
      if (selectedPt === fileName) prompt.setSelectedPromptTemplateFileName(newFileName);
      if (state.aiPromptEditor.currentPromptTemplate === fileName) {
        dispatch(setCurrentPromptTemplate(newFileName));
        dispatch(setPromptTemplateData(updated));
      }
    } else if (state.aiPromptEditor.currentPromptTemplate === fileName) {
      dispatch(setPromptTemplateData(updated));
    }

    await dispatch(refreshPromptTemplates());
  };

const updatePromptTemplateEmoji =
  (fileName: string, emoji: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const folder = workingFolder.selectFolder(state);
    if (!folder) throw new Error(t('shared.folderNotSelected'));

    await updatePromptTemplateEmojiOnDisk(fileName, emoji);
    const updated = await readPromptTemplateFile(fileName);
    if (!updated) throw new Error(t('promptTemplate.readFailed'));

    if (state.aiPromptEditor.currentPromptTemplate === fileName) {
      dispatch(setPromptTemplateData(updated));
    }

    await dispatch(refreshPromptTemplates());
  };

const createPromptTemplate =
  (title: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const folder = workingFolder.selectFolder(state);
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
    await dispatch(refreshPromptTemplates());
    await dispatch(openPromptTemplateEditor(fileName));
  };

const openPromptTemplateEditor =
  (filename: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    if (
      overlays.selectCurrent(state) === TOverlay.PROMPT_TEMPLATE &&
      selectCurrentPromptTemplate(state) === filename
    ) {
      return;
    }
    overlays.setCurrent(TOverlay.PROMPT_TEMPLATE);
    await dispatch(initializePromptTemplateEditor(filename));
  };

// ── Glossary thunks ──────────────────────────────────────────────────────────

const initializeGlossaryEditor =
  (fileName: string) =>
  async (dispatch: AppDispatch): Promise<void> => {
    dispatch(setCurrentPromptTemplate(null));
    dispatch(setPromptTemplateData(null));
    dispatch(setCurrentGlossary(fileName));
    dispatch(setGlossaryData(null));
    const folder = workingFolder.get.folder();
    if (!folder) return;
    const data = await readGlossaryFile(fileName);
    dispatch(setGlossaryData(data));
  };

const saveGlossary =
  () =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const { currentGlossary, glossaryData } = state.aiPromptEditor;
    const folder = workingFolder.selectFolder(state);
    if (!currentGlossary || !folder || !glossaryData) return;
    const dataToSave: AIGlossaryFileDataType = {
      ...glossaryData,
      list: glossaryData.list.filter((e) => e.original.trim() || e.translation.trim()),
    };
    await writeGlossaryBody(currentGlossary, dataToSave);
    await dispatch(refreshGlossaries());
    if (prompt.selectSelectedGlossaryFileNames(state).includes(currentGlossary)) {
      dispatch(reconcileGlossarySelectionWithDirection());
    }
  };

// Languages are part of the file header, written by the main process. The open editor keeps its
// unsaved pairs and takes the new languages.
const updateGlossaryLanguages =
  (fileName: string, sourceLanguage: TLanguage, targetLanguage: TLanguage) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    await updateGlossaryLanguagesOnDisk(fileName, sourceLanguage, targetLanguage);
    const { currentGlossary, glossaryData } = getState().aiPromptEditor;
    if (currentGlossary === fileName && glossaryData) {
      dispatch(setGlossaryData({ ...glossaryData, sourceLanguage, targetLanguage }));
    }
    await dispatch(refreshGlossaries());
    // A selected glossary may no longer match the project's direction
    if (prompt.get.selectedGlossaryFileNames().includes(fileName)) {
      dispatch(reconcileGlossarySelectionWithDirection());
    }
  };

const deleteGlossary =
  (fileName: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const folder = workingFolder.selectFolder(state);
    if (!folder) return;
    await deleteGlossaryOnDisk(fileName);
    await dispatch(refreshGlossaries());
    if (state.aiPromptEditor.currentGlossary === fileName) {
      dispatch(resetAiPromptEditor());
    }
  };

const renameGlossary =
  (fileName: string, newTitle: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const folder = workingFolder.selectFolder(state);
    if (!folder) throw new Error(t('shared.folderNotSelected'));
    const trimmed = newTitle.trim();
    if (!trimmed) throw new Error(t('shared.nameEmpty'));

    const newFileName = await renameGlossaryOnDisk(fileName, trimmed);
    if (!newFileName) throw new Error(t('glossaryFile.alreadyExists', { title: trimmed }));
    // Re-read: the main process wrote the header
    const updated = await readGlossaryFile(newFileName);
    if (!updated) throw new Error(t('glossaryFile.readFailed'));

    if (newFileName !== fileName) {
      const selectedGlossaries = prompt.selectSelectedGlossaryFileNames(state);
      if (selectedGlossaries.includes(fileName)) {
        prompt.setSelectedGlossaryFileNames(
          selectedGlossaries.map((fn) => (fn === fileName ? newFileName : fn))
        );
      }
      if (state.aiPromptEditor.currentGlossary === fileName) {
        dispatch(setCurrentGlossary(newFileName));
        dispatch(setGlossaryData(updated));
      }
    } else if (state.aiPromptEditor.currentGlossary === fileName) {
      dispatch(setGlossaryData(updated));
    }

    await dispatch(refreshGlossaries());
  };

const updateGlossaryEmoji =
  (fileName: string, emoji: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const folder = workingFolder.selectFolder(state);
    if (!folder) throw new Error(t('shared.folderNotSelected'));

    await updateGlossaryEmojiOnDisk(fileName, emoji);
    const updated = await readGlossaryFile(fileName);
    if (!updated) throw new Error(t('glossaryFile.readFailed'));

    if (state.aiPromptEditor.currentGlossary === fileName) {
      dispatch(setGlossaryData(updated));
    }

    await dispatch(refreshGlossaries());
  };

const createGlossary =
  (title: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const folder = workingFolder.selectFolder(state);
    if (!folder) throw new Error(t('shared.folderNotSelected'));
    const trimmed = title.trim();
    if (!trimmed) throw new Error(t('shared.nameEmpty'));

    const emoji = await pickRandomCreationEmoji();
    const data: AIGlossaryFileDataType = {
      version: 1,
      title: trimmed,
      emoji,
      sourceLanguage: TLanguage.English,
      targetLanguage: TLanguage.Belarusian,
      list: [],
    };
    const fileName = await createGlossaryOnDisk(data);
    if (!fileName) throw new Error(t('glossaryFile.alreadyExists', { title: trimmed }));
    await dispatch(refreshGlossaries());
    await dispatch(openGlossaryEditor(fileName));
  };

const addGlossaryEntry =
  (entry: { original: string; translation: string }, targetFileName?: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<boolean> => {
    const state = getState();
    const { currentGlossary, glossaryData } = state.aiPromptEditor;
    const folder = workingFolder.selectFolder(state);
    if (!folder) return false;

    const target = targetFileName ?? currentGlossary;
    if (!target) return false;

    const existing: AIGlossaryFileDataType | null =
      target === currentGlossary && glossaryData ? glossaryData : await readGlossaryFile(target);
    if (!existing) return false;

    const updated: AIGlossaryFileDataType = { ...existing, list: [...existing.list, entry] };
    await writeGlossaryBody(target, updated);

    if (target === currentGlossary) {
      dispatch(setGlossaryData(updated));
    }

    return true;
  };

// Filters selected glossary file names down to those whose own source/target language actually
// matches the project's current translation direction -- the selection in prompt slice state can
// go stale relative to the direction (e.g. right after the user flips source/target), and nothing
// upstream is guaranteed to have pruned it yet. Keeping this check here, at the one place entries
// actually get resolved for sending, means a mismatched glossary can never leak into a prompt
// regardless of what the UI selection currently looks like. The AI clients themselves stay
// language-agnostic -- they only ever see the already-filtered `glossaryEntries` pairs.
function selectDirectionMatchedGlossaryFileNames(state: RootState): string[] {
  const selectedFileNames = prompt.selectSelectedGlossaryFileNames(state);
  // Read straight from the state rather than through the project slice's selectors: the project
  // slice imports this one (to reconcile on load), so importing it back would be a cycle
  const { sourceLanguage, targetLanguage } = state.project;
  const glossaryItems = selectGlossaryItems(state);
  const itemsByFileName = new Map(glossaryItems.map((item) => [item.fileName, item]));
  return selectedFileNames.filter((fileName) => {
    const item = itemsByFileName.get(fileName);
    return (
      item !== undefined &&
      item.sourceLanguage === sourceLanguage &&
      item.targetLanguage === targetLanguage
    );
  });
}

const refreshResolvedGlossaryEntries =
  () =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    const matchedFileNames = selectDirectionMatchedGlossaryFileNames(state);
    const folder = workingFolder.selectFolder(state);
    if (!folder || !matchedFileNames.length) {
      dispatch(setResolvedGlossaryEntries([]));
      return;
    }
    const seen = new Map<string, string>();
    for (const fileName of matchedFileNames) {
      const data = await readGlossaryFile(fileName);
      if (data) {
        for (const e of data.list) seen.set(e.original, e.translation);
      }
    }
    dispatch(setResolvedGlossaryEntries(Array.from(seen.entries())));
  };

// Prunes the glossary selection down to whatever still matches the project's current direction,
// and refreshes the resolved entries cache for what remains. Dispatched explicitly at every point
// that can change what "matches the direction" means: a glossary being saved (its own language
// pair may have changed), the project's source/target language changing, or a different project
// loading -- rather than via a listener, so the reconciliation lives right next to the action that
// actually needs it.
const reconcileGlossarySelectionWithDirection =
  () =>
  (dispatch: AppDispatch, getState: () => RootState): void => {
    const state = getState();
    const currentFileNames = prompt.selectSelectedGlossaryFileNames(state);
    const matchedFileNames = selectDirectionMatchedGlossaryFileNames(state);
    if (matchedFileNames.length !== currentFileNames.length) {
      prompt.setSelectedGlossaryFileNames(matchedFileNames);
    }
    void dispatch(refreshResolvedGlossaryEntries());
  };

const openGlossaryEditor =
  (filename: string) =>
  async (dispatch: AppDispatch, getState: () => RootState): Promise<void> => {
    const state = getState();
    if (
      overlays.selectCurrent(state) === TOverlay.GLOSSARY &&
      selectCurrentGlossary(state) === filename
    ) {
      return;
    }
    overlays.setCurrent(TOverlay.GLOSSARY);
    await dispatch(initializeGlossaryEditor(filename));
  };

// ── API ──────────────────────────────────────────────────────────────────────

export const glossaries = api('glossary', {
  actions: {
    setGlossaryData,
    setGlossaryItems,
    setResolvedGlossaryEntries,
  },
  thunks: {
    addGlossaryEntry,
    createGlossary,
    deleteGlossary,
    openGlossaryEditor,
    reconcileGlossarySelectionWithDirection,
    refreshGlossaries,
    refreshResolvedGlossaryEntries,
    renameGlossary,
    saveGlossary,
    updateGlossaryEmoji,
    updateGlossaryLanguages,
  },
  selectors: {
    selectCurrentGlossary,
    selectGlossaryData,
    selectGlossaryItems,
    selectResolvedGlossaryEntries,
  },
});

export const promptTemplates = api('promptTemplate', {
  actions: {
    setPromptTemplateData,
    setPromptTemplateItems,
  },
  thunks: {
    createPromptTemplate,
    deletePromptTemplate,
    openPromptTemplateEditor,
    refreshPromptTemplates,
    renamePromptTemplate,
    updatePromptTemplateEmoji,
  },
  selectors: {
    selectCurrentPromptTemplate,
    selectPromptTemplateData,
    selectPromptTemplateItems,
  },
  helpers: {
    readPromptTemplateFile,
    writePromptTemplateBody,
  },
});

export const aiPromptEditor = api('aiPromptEditor', {
  actions: {
    resetAiPromptEditor,
  },
});
