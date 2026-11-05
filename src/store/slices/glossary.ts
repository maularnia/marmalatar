import { api } from '@store/createApi';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import i18n from '@src/i18n';
import { IPC } from '@src/services/ipc/IPC';
import { TLanguage } from '@src/types';
import { focusContentEditableToEnd, selectAllContentEditable } from '@src/utils/contentEditable';
import {
  GlossaryListEntrySchema,
  readGlossaryFileContract,
  type AIGlossaryFileDataType,
  type TGlossaryEntry,
} from '@src/utils/data/schemas';
import { pickRandomCreationEmoji } from '@src/utils/emoji';
import type { AppDispatch, RootState } from '@store/root';
import { overlays, TOverlay } from '@store/slices/overlays';
import { workingFolder } from '@store/slices/workingFolder';
import { pushMessage } from '@providers/bridges/messages';
import {
  emitAddGlossaryEntryErrorMessage,
  emitGlossaryEntrySaveFailedMessage,
  emitNoMatchingGlossariesMessage,
} from '@src/messages';
import { askForGlossaryPair } from '@src/segments/dialogs/addToGlossary/addToGlossaryDialog';
import { emitGlossaryPairSavedMessage } from '@src/segments/dialogs/addToGlossary/glossaryEntryAddedMessage';
import { select } from '@store/createApi';

// Everything about glossaries in one place: the tracked folder's glossary files, the glossary open
// in the editor overlay (its pairs, which pair input has focus), and the glossaries the translation
// uses (the selection, and the entries resolved from it for the AI request).

export type TGlossaryPairColumn = 'original' | 'translation';

const t = i18n.getFixedT(null, 'errors');

// ── IPC ──────────────────────────────────────────────────────────────────────

// Glossary files are reached only through the main process's glossary service, keyed by file name.
// The renderer reads whole files but writes only their pair list: the header (title, emoji,
// languages) changes through dedicated calls. create and rename resolve to null when the file name
// the title maps to is taken.

// A glossary whose languages this build doesn't know is left out
async function listGlossaries(): Promise<TGlossaryEntry[]> {
  const entries = await IPC.glossaries.list();
  return entries.flatMap((entry) => {
    const parsed = GlossaryListEntrySchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}

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

// ── Pair inputs ──────────────────────────────────────────────────────────────

// The open glossary's pair input elements, by pair index and column, for moving focus. Kept out
// of the store: DOM elements aren't state. Inputs register themselves as they mount, and null
// removes one; a row goes once both its columns are empty, so the map cleans itself on unmount.
type TPairInputs = Record<TGlossaryPairColumn, HTMLElement | null>;
const pairInputs = new Map<number, TPairInputs>();

function registerGlossaryPairInput(
  pairIndex: number,
  column: TGlossaryPairColumn,
  el: HTMLElement | null
): void {
  if (el === null) {
    const row = pairInputs.get(pairIndex);
    if (!row) return;
    row[column] = null;
    if (!row.original && !row.translation) pairInputs.delete(pairIndex);
    return;
  }
  const row = pairInputs.get(pairIndex) ?? { original: null, translation: null };
  row[column] = el;
  pairInputs.set(pairIndex, row);
}

// Called whenever a different glossary is opened: the table may stay mounted across the switch,
// so its old inputs would otherwise still be found under the same indexes
function clearPairInputs(): void {
  pairInputs.clear();
}

type GlossaryState = {
  // The tracked folder's glossaries, as the main process lists them
  glossaryItems: TGlossaryEntry[];
  // The glossary open in the editor overlay
  currentGlossary: string | null;
  glossaryData: AIGlossaryFileDataType | null;
  focusedPairIndex: number | null;
  focusedColumn: TGlossaryPairColumn | null;
  // The glossaries the translation uses, and the entries resolved from them for the AI request
  selectedGlossaryFileNames: string[];
  resolvedGlossaryEntries: [string, string][];
};

const initialState: GlossaryState = {
  glossaryItems: [],
  currentGlossary: null,
  glossaryData: null,
  focusedPairIndex: null,
  focusedColumn: null,
  selectedGlossaryFileNames: [],
  resolvedGlossaryEntries: [],
};

function clearEditor(state: GlossaryState): void {
  state.currentGlossary = null;
  state.glossaryData = null;
  state.focusedPairIndex = null;
  state.focusedColumn = null;
}

const glossarySlice = createSlice({
  name: 'glossary',
  initialState,
  reducers: {
    setGlossaryItems(state, action: PayloadAction<TGlossaryEntry[]>) {
      state.glossaryItems = action.payload;
    },
    // A different glossary has no focused pair yet
    setCurrentGlossary(state, action: PayloadAction<string | null>) {
      if (state.currentGlossary !== action.payload) {
        state.focusedPairIndex = null;
        state.focusedColumn = null;
      }
      state.currentGlossary = action.payload;
    },
    setGlossaryData(state, action: PayloadAction<AIGlossaryFileDataType | null>) {
      state.glossaryData = action.payload;
    },
    closeGlossaryEditor(state) {
      clearEditor(state);
    },
    setFocusedGlossaryPair(
      state,
      action: PayloadAction<{ pairIndex: number | null; column?: TGlossaryPairColumn | null }>
    ) {
      state.focusedPairIndex = action.payload.pairIndex;
      if (action.payload.column !== undefined) state.focusedColumn = action.payload.column;
    },
    // The resolved entries belong to the previous selection, so they're dropped until resolved again
    setSelectedGlossaryFileNames(state, action: PayloadAction<string[]>) {
      state.selectedGlossaryFileNames = action.payload;
      state.resolvedGlossaryEntries = [];
    },
    setResolvedGlossaryEntries(state, action: PayloadAction<[string, string][]>) {
      state.resolvedGlossaryEntries = action.payload;
    },
  },
  extraReducers(builder) {
    // Opening another overlay, or closing them all, closes the glossary editor. The prompt
    // template editor does the same on its side, so neither slice has to reach into the other.
    builder.addCase(overlays.closeAll, clearEditor);
    builder.addCase(overlays.setCurrent, (state, action) => {
      if (action.payload !== TOverlay.GLOSSARY) clearEditor(state);
    });
  },
  selectors: {
    selectGlossaryItems: (state) => state.glossaryItems,
    selectCurrentGlossary: (state) => state.currentGlossary,
    selectGlossaryData: (state) => state.glossaryData,
    selectFocusedGlossaryPairIndex: (state) => state.focusedPairIndex,
    selectFocusedGlossaryColumn: (state) => state.focusedColumn,
    selectSelectedGlossaryFileNames: (state) => state.selectedGlossaryFileNames,
    selectResolvedGlossaryEntries: (state) => state.resolvedGlossaryEntries,
  },
});

const {
  setGlossaryItems,
  setCurrentGlossary,
  setGlossaryData,
  closeGlossaryEditor,
  setFocusedGlossaryPair,
  setSelectedGlossaryFileNames,
  setResolvedGlossaryEntries,
} = glossarySlice.actions;

const {
  selectGlossaryItems,
  selectCurrentGlossary,
  selectGlossaryData,
  selectFocusedGlossaryPairIndex,
  selectFocusedGlossaryColumn,
  selectSelectedGlossaryFileNames,
  selectResolvedGlossaryEntries,
} = glossarySlice.selectors;

export default glossarySlice.reducer;

// ── File thunks ──────────────────────────────────────────────────────────────

// The list comes from the main process, which renormalizes it against the tracked folder on every
// read, so after any write the renderer just reads it again. A selection whose file is gone is
// dropped.
const refreshGlossaries =
  () =>
  async (dispatch: AppDispatch): Promise<void> => {
    const glossaryItems = await listGlossaries();
    dispatch(setGlossaryItems(glossaryItems));
    const selectedGlossaries = glossaries.get.selectedFileNames();
    const stillValidGlossaries = selectedGlossaries.filter((fn) =>
      glossaryItems.some((i) => i.fileName === fn)
    );
    if (stillValidGlossaries.length !== selectedGlossaries.length) {
      glossaries.setSelectedFileNames(stillValidGlossaries);
    }
  };

const initializeGlossaryEditor =
  (fileName: string) =>
  async (dispatch: AppDispatch): Promise<void> => {
    clearPairInputs();
    dispatch(setCurrentGlossary(fileName));
    dispatch(setGlossaryData(null));
    const folder = workingFolder.get.folder();
    if (!folder) return;
    const data = await readGlossaryFile(fileName);
    dispatch(setGlossaryData(data));
  };

const saveGlossary =
  () =>
  async (dispatch: AppDispatch): Promise<void> => {
    const currentGlossary = glossaries.get.current();
    const glossaryData = glossaries.get.data();
    const folder = workingFolder.get.folder();
    if (!currentGlossary || !folder || !glossaryData) return;
    const dataToSave: AIGlossaryFileDataType = {
      ...glossaryData,
      list: glossaryData.list.filter((e) => e.original.trim() || e.translation.trim()),
    };
    await writeGlossaryBody(currentGlossary, dataToSave);
    await dispatch(refreshGlossaries());
    if (glossaries.get.selectedFileNames().includes(currentGlossary)) {
      dispatch(reconcileGlossarySelectionWithDirection());
    }
  };

// Languages are part of the file header, written by the main process. The open editor keeps its
// unsaved pairs and takes the new languages.
const updateGlossaryLanguages =
  (fileName: string, sourceLanguage: TLanguage, targetLanguage: TLanguage) =>
  async (dispatch: AppDispatch): Promise<void> => {
    await updateGlossaryLanguagesOnDisk(fileName, sourceLanguage, targetLanguage);
    const currentGlossary = glossaries.get.current();
    const glossaryData = glossaries.get.data();
    if (currentGlossary === fileName && glossaryData) {
      dispatch(setGlossaryData({ ...glossaryData, sourceLanguage, targetLanguage }));
    }
    await dispatch(refreshGlossaries());
    // A selected glossary may no longer match the project's direction
    if (glossaries.get.selectedFileNames().includes(fileName)) {
      dispatch(reconcileGlossarySelectionWithDirection());
    }
  };

const deleteGlossary =
  (fileName: string) =>
  async (dispatch: AppDispatch): Promise<void> => {
    const folder = workingFolder.get.folder();
    if (!folder) return;
    await deleteGlossaryOnDisk(fileName);
    await dispatch(refreshGlossaries());
    if (glossaries.get.current() === fileName) {
      dispatch(closeGlossaryEditor());
    }
  };

const renameGlossary =
  (fileName: string, newTitle: string) =>
  async (dispatch: AppDispatch): Promise<void> => {
    const folder = workingFolder.get.folder();
    if (!folder) throw new Error(t('shared.folderNotSelected'));
    const trimmed = newTitle.trim();
    if (!trimmed) throw new Error(t('shared.nameEmpty'));

    const newFileName = await renameGlossaryOnDisk(fileName, trimmed);
    if (!newFileName) throw new Error(t('glossaryFile.alreadyExists', { title: trimmed }));
    // Re-read: the main process wrote the header
    const updated = await readGlossaryFile(newFileName);
    if (!updated) throw new Error(t('glossaryFile.readFailed'));

    if (newFileName !== fileName) {
      const selectedGlossaries = glossaries.get.selectedFileNames();
      if (selectedGlossaries.includes(fileName)) {
        glossaries.setSelectedFileNames(
          selectedGlossaries.map((fn) => (fn === fileName ? newFileName : fn))
        );
      }
      if (glossaries.get.current() === fileName) {
        clearPairInputs();
        dispatch(setCurrentGlossary(newFileName));
        dispatch(setGlossaryData(updated));
      }
    } else if (glossaries.get.current() === fileName) {
      dispatch(setGlossaryData(updated));
    }

    await dispatch(refreshGlossaries());
  };

const updateGlossaryEmoji =
  (fileName: string, emoji: string) =>
  async (dispatch: AppDispatch): Promise<void> => {
    const folder = workingFolder.get.folder();
    if (!folder) throw new Error(t('shared.folderNotSelected'));

    await updateGlossaryEmojiOnDisk(fileName, emoji);
    const updated = await readGlossaryFile(fileName);
    if (!updated) throw new Error(t('glossaryFile.readFailed'));

    if (glossaries.get.current() === fileName) {
      dispatch(setGlossaryData(updated));
    }

    await dispatch(refreshGlossaries());
  };

const createGlossary =
  (title: string) =>
  async (dispatch: AppDispatch): Promise<void> => {
    const folder = workingFolder.get.folder();
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
  async (dispatch: AppDispatch): Promise<boolean> => {
    const currentGlossary = glossaries.get.current();
    const glossaryData = glossaries.get.data();
    const folder = workingFolder.get.folder();
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
// matches the project's current translation direction -- the selection can
// go stale relative to the direction (e.g. right after the user flips source/target), and nothing
// upstream is guaranteed to have pruned it yet. Keeping this check here, at the one place entries
// actually get resolved for sending, means a mismatched glossary can never leak into a prompt
// regardless of what the UI selection currently looks like. The AI clients themselves stay
// language-agnostic -- they only ever see the already-filtered `glossaryEntries` pairs.
function selectDirectionMatchedGlossaryFileNames(state: RootState): string[] {
  const selectedFileNames = glossaries.get.selectedFileNames();
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
    const matchedFileNames = selectDirectionMatchedGlossaryFileNames(getState());
    const folder = workingFolder.get.folder();
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
    const currentFileNames = glossaries.get.selectedFileNames();
    const matchedFileNames = selectDirectionMatchedGlossaryFileNames(getState());
    if (matchedFileNames.length !== currentFileNames.length) {
      glossaries.setSelectedFileNames(matchedFileNames);
    }
    void dispatch(refreshResolvedGlossaryEntries());
  };

const openGlossaryEditor =
  (filename: string) =>
  async (dispatch: AppDispatch): Promise<void> => {
    if (overlays.get.current() === TOverlay.GLOSSARY && glossaries.get.current() === filename) {
      return;
    }
    overlays.setCurrent(TOverlay.GLOSSARY);
    await dispatch(initializeGlossaryEditor(filename));
  };

// ── Pair thunks ──────────────────────────────────────────────────────────────

// Focuses one pair input of the open glossary and scrolls it into view. false when that input
// isn't mounted.
const focusGlossaryPairInput =
  (pairIndex: number, column: TGlossaryPairColumn, selectAll = false) =>
  (dispatch: AppDispatch): boolean => {
    const el = pairInputs.get(pairIndex)?.[column];
    if (!el) return false;
    if (selectAll) selectAllContentEditable(el);
    else focusContentEditableToEnd(el);
    el.scrollIntoView({ block: 'nearest' });
    dispatch(setFocusedGlossaryPair({ pairIndex, column }));
    return true;
  };

const moveGlossaryPairFocus =
  (direction: 'up' | 'down') =>
  (dispatch: AppDispatch): void => {
    const pairCount = glossaries.get.data()?.list.length ?? 0;
    const focusedPairIndex = glossaries.get.focusedPairIndex();
    const column = glossaries.get.focusedColumn() ?? 'original';
    if (focusedPairIndex == null) {
      if (pairCount === 0) return;
      dispatch(focusGlossaryPairInput(0, column));
      return;
    }
    const targetIndex = direction === 'up' ? focusedPairIndex - 1 : focusedPairIndex + 1;
    if (targetIndex < 0 || targetIndex >= pairCount) return;
    dispatch(focusGlossaryPairInput(targetIndex, column));
  };

// Adds an empty pair next to pairIndex and focuses it once it has rendered
const insertGlossaryPair =
  (pairIndex: number, position: 'before' | 'after') =>
  (dispatch: AppDispatch): void => {
    const glossaryData = glossaries.get.data();
    if (!glossaryData) return;
    const targetIndex = position === 'before' ? pairIndex : pairIndex + 1;
    const list = [
      ...glossaryData.list.slice(0, targetIndex),
      { original: '', translation: '' },
      ...glossaryData.list.slice(targetIndex),
    ];
    dispatch(setGlossaryData({ ...glossaryData, list }));
    const column = glossaries.get.focusedColumn() ?? 'original';
    requestAnimationFrame(() => {
      dispatch(focusGlossaryPairInput(targetIndex, column, false));
    });
  };

// Removes a pair and moves focus to its neighbour, once rendered. No confirmation here: callers go
// through useDeleteGlossaryEntryConfirmation, since dialogs come from hooks.
const deleteGlossaryPair =
  (pairIndex: number) =>
  (dispatch: AppDispatch): void => {
    const glossaryData = glossaries.get.data();
    if (!glossaryData?.list[pairIndex]) return;
    const hasNext = pairIndex + 1 < glossaryData.list.length;
    const hasPrev = pairIndex > 0;
    const list = glossaryData.list.filter((_, i) => i !== pairIndex);
    dispatch(setGlossaryData({ ...glossaryData, list }));
    const targetIndex = hasNext ? pairIndex : hasPrev ? pairIndex - 1 : null;
    const column = glossaries.get.focusedColumn() ?? 'original';
    if (targetIndex == null) {
      dispatch(setFocusedGlossaryPair({ pairIndex: null, column: null }));
      return;
    }
    requestAnimationFrame(() => {
      dispatch(focusGlossaryPairInput(targetIndex, column, false));
    });
  };
// ── Adding entries from the editor ───────────────────────────────────────────

/** Asks for a pair prefilled with `text` and a glossary of the project's language direction to
 * add it to, then adds it, reporting the outcome through toasts. */
async function addGlossaryEntryFromText(text: string): Promise<void> {
  const original = text.trim();
  if (!original) return;

  // Raw state, as in selectDirectionMatchedGlossaryFileNames: the project slice imports this one
  const { sourceLanguage, targetLanguage } = select((state: RootState) => state.project);
  const matching = glossaries.get
    .items()
    .filter((g) => g.sourceLanguage === sourceLanguage && g.targetLanguage === targetLanguage);
  if (!matching.length) {
    emitNoMatchingGlossariesMessage(pushMessage);
    return;
  }

  try {
    const result = await askForGlossaryPair({
      defaultOriginal: original,
      glossaryOptions: matching,
    });
    if (!result) return;
    const [pairOriginal, pairTranslation] = result.pair;
    const added = await glossaries.addEntry(
      { original: pairOriginal, translation: pairTranslation },
      result.glossaryFileName
    );
    if (added) emitGlossaryPairSavedMessage(pairOriginal, pairTranslation);
    else emitGlossaryEntrySaveFailedMessage(pushMessage);
  } catch (e) {
    emitAddGlossaryEntryErrorMessage(
      pushMessage,
      e instanceof Error ? e.message : 'Critical unexpected error white adding entry to a glossary'
    );
  }
}

// ── API ──────────────────────────────────────────────────────────────────────

export const glossaries = api('glossary', {
  actions: {
    closeGlossaryEditor,
    setFocusedGlossaryPair,
    setGlossaryData,
    setGlossaryItems,
    setResolvedGlossaryEntries,
    setSelectedGlossaryFileNames,
  },
  thunks: {
    addGlossaryEntry,
    createGlossary,
    deleteGlossary,
    deleteGlossaryPair,
    focusGlossaryPairInput,
    insertGlossaryPair,
    moveGlossaryPairFocus,
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
    selectFocusedGlossaryColumn,
    selectFocusedGlossaryPairIndex,
    selectGlossaryData,
    selectGlossaryItems,
    selectResolvedGlossaryEntries,
    selectSelectedGlossaryFileNames,
  },
  functions: {
    addGlossaryEntryFromText,
    registerGlossaryPairInput,
  },
});
