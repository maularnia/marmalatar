import { pushMessage } from '@providers/bridges/messages';
import i18n from '@src/i18n';
import {
  emitAddGlossaryEntryErrorMessage,
  emitGlossaryEntrySaveFailedMessage,
  emitNoMatchingGlossariesMessage,
} from '@src/messages';
import { askForGlossaryPair } from '@src/segments/dialogs/addToGlossary/addToGlossaryDialog';
import { emitGlossaryPairSavedMessage } from '@src/segments/dialogs/addToGlossary/glossaryEntryAddedMessage';
import { confirmDeleteGlossaryEntry } from '@src/segments/dialogs/deleteGlossaryEntry/deleteGlossaryEntryConfirmation';
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
import { dispatch, select } from '@store/createApi';
import { overlays, TOverlay } from '@store/slices/overlays';
import { workingFolder } from '@store/slices/workingFolder';
import {
  closeGlossaryEditor,
  selectCurrentGlossary,
  selectFocusedGlossaryColumn,
  selectFocusedGlossaryPairIndex,
  selectGlossaryData,
  selectGlossaryItems,
  selectSelectedGlossaryFileNames,
  setCurrentGlossary,
  setFocusedGlossaryPair,
  setGlossaryData,
  setGlossaryItems,
  setResolvedGlossaryEntries,
  setSelectedGlossaryFileNames,
  type TGlossaryPairColumn,
} from './slice';

// The glossary service's operations. They read their own state with select(localSelector), not
// the facade: index.ts builds the facade from this file, so importing it here would be a cycle.

const t = i18n.getFixedT(null, 'errors');

// The project service imports this one (to reconcile the selection when a project loads), so its
// facade can't be imported here. The project's languages are read from the raw state instead.
type TProjectLanguages = {
  project: { sourceLanguage: TLanguage | null; targetLanguage: TLanguage | null };
};
const projectLanguages = () => select((state: TProjectLanguages) => state.project);

const current = () => select(selectCurrentGlossary);
const data = () => select(selectGlossaryData);
const selectedFileNames = () => select(selectSelectedGlossaryFileNames);

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

export function registerGlossaryPairInput(
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

// ── Files ────────────────────────────────────────────────────────────────────

// The list comes from the main process, which renormalizes it against the tracked folder on every
// read, so after any write the renderer just reads it again. A selection whose file is gone is
// dropped.
export async function refreshGlossaries(): Promise<void> {
  const glossaryItems = await listGlossaries();
  dispatch(setGlossaryItems(glossaryItems));
  const selected = selectedFileNames();
  const stillValid = selected.filter((fn) => glossaryItems.some((i) => i.fileName === fn));
  if (stillValid.length !== selected.length) {
    dispatch(setSelectedGlossaryFileNames(stillValid));
  }
}

async function initializeGlossaryEditor(fileName: string): Promise<void> {
  clearPairInputs();
  dispatch(setCurrentGlossary(fileName));
  dispatch(setGlossaryData(null));
  if (!workingFolder.get.folder()) return;
  dispatch(setGlossaryData(await readGlossaryFile(fileName)));
}

export async function openGlossaryEditor(fileName: string): Promise<void> {
  if (overlays.get.current() === TOverlay.GLOSSARY && current() === fileName) return;
  overlays.setCurrent(TOverlay.GLOSSARY);
  await initializeGlossaryEditor(fileName);
}

export async function saveGlossary(): Promise<void> {
  const currentGlossary = current();
  const glossaryData = data();
  if (!currentGlossary || !workingFolder.get.folder() || !glossaryData) return;
  const dataToSave: AIGlossaryFileDataType = {
    ...glossaryData,
    list: glossaryData.list.filter((e) => e.original.trim() || e.translation.trim()),
  };
  await writeGlossaryBody(currentGlossary, dataToSave);
  await refreshGlossaries();
  if (selectedFileNames().includes(currentGlossary)) {
    reconcileGlossarySelectionWithDirection();
  }
}

// Languages are part of the file header, written by the main process. The open editor keeps its
// unsaved pairs and takes the new languages.
export async function updateGlossaryLanguages(
  fileName: string,
  sourceLanguage: TLanguage,
  targetLanguage: TLanguage
): Promise<void> {
  await updateGlossaryLanguagesOnDisk(fileName, sourceLanguage, targetLanguage);
  const glossaryData = data();
  if (current() === fileName && glossaryData) {
    dispatch(setGlossaryData({ ...glossaryData, sourceLanguage, targetLanguage }));
  }
  await refreshGlossaries();
  // A selected glossary may no longer match the project's direction
  if (selectedFileNames().includes(fileName)) {
    reconcileGlossarySelectionWithDirection();
  }
}

export async function deleteGlossary(fileName: string): Promise<void> {
  if (!workingFolder.get.folder()) return;
  await deleteGlossaryOnDisk(fileName);
  await refreshGlossaries();
  if (current() === fileName) {
    dispatch(closeGlossaryEditor());
  }
}

export async function renameGlossary(fileName: string, newTitle: string): Promise<void> {
  if (!workingFolder.get.folder()) throw new Error(t('shared.folderNotSelected'));
  const trimmed = newTitle.trim();
  if (!trimmed) throw new Error(t('shared.nameEmpty'));

  const newFileName = await renameGlossaryOnDisk(fileName, trimmed);
  if (!newFileName) throw new Error(t('glossaryFile.alreadyExists', { title: trimmed }));
  // Re-read: the main process wrote the header
  const updated = await readGlossaryFile(newFileName);
  if (!updated) throw new Error(t('glossaryFile.readFailed'));

  if (newFileName !== fileName) {
    const selected = selectedFileNames();
    if (selected.includes(fileName)) {
      dispatch(
        setSelectedGlossaryFileNames(selected.map((fn) => (fn === fileName ? newFileName : fn)))
      );
    }
    if (current() === fileName) {
      clearPairInputs();
      dispatch(setCurrentGlossary(newFileName));
      dispatch(setGlossaryData(updated));
    }
  } else if (current() === fileName) {
    dispatch(setGlossaryData(updated));
  }

  await refreshGlossaries();
}

export async function updateGlossaryEmoji(fileName: string, emoji: string): Promise<void> {
  if (!workingFolder.get.folder()) throw new Error(t('shared.folderNotSelected'));

  await updateGlossaryEmojiOnDisk(fileName, emoji);
  const updated = await readGlossaryFile(fileName);
  if (!updated) throw new Error(t('glossaryFile.readFailed'));

  if (current() === fileName) {
    dispatch(setGlossaryData(updated));
  }

  await refreshGlossaries();
}

export async function createGlossary(title: string): Promise<void> {
  if (!workingFolder.get.folder()) throw new Error(t('shared.folderNotSelected'));
  const trimmed = title.trim();
  if (!trimmed) throw new Error(t('shared.nameEmpty'));

  const emoji = await pickRandomCreationEmoji();
  const newData: AIGlossaryFileDataType = {
    version: 1,
    title: trimmed,
    emoji,
    sourceLanguage: TLanguage.English,
    targetLanguage: TLanguage.Belarusian,
    list: [],
  };
  const fileName = await createGlossaryOnDisk(newData);
  if (!fileName) throw new Error(t('glossaryFile.alreadyExists', { title: trimmed }));
  await refreshGlossaries();
  await openGlossaryEditor(fileName);
}

/** Appends a pair to a glossary (the open one by default). Resolves whether it was written. */
export async function addGlossaryEntry(
  entry: { original: string; translation: string },
  targetFileName?: string
): Promise<boolean> {
  const currentGlossary = current();
  const glossaryData = data();
  if (!workingFolder.get.folder()) return false;

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
}

// ── Translation selection ────────────────────────────────────────────────────

// Filters selected glossary file names down to those whose own source/target language actually
// matches the project's current translation direction -- the selection can go stale relative to
// the direction (e.g. right after the user flips source/target), and nothing upstream is
// guaranteed to have pruned it yet. Keeping this check here, at the one place entries actually get
// resolved for sending, means a mismatched glossary can never leak into a prompt regardless of
// what the UI selection currently looks like. The AI clients themselves stay language-agnostic --
// they only ever see the already-filtered `glossaryEntries` pairs.
function directionMatchedGlossaryFileNames(): string[] {
  const { sourceLanguage, targetLanguage } = projectLanguages();
  const itemsByFileName = new Map(select(selectGlossaryItems).map((item) => [item.fileName, item]));
  return selectedFileNames().filter((fileName) => {
    const item = itemsByFileName.get(fileName);
    return (
      item !== undefined &&
      item.sourceLanguage === sourceLanguage &&
      item.targetLanguage === targetLanguage
    );
  });
}

export async function refreshResolvedGlossaryEntries(): Promise<void> {
  const matchedFileNames = directionMatchedGlossaryFileNames();
  if (!workingFolder.get.folder() || !matchedFileNames.length) {
    dispatch(setResolvedGlossaryEntries([]));
    return;
  }
  const seen = new Map<string, string>();
  for (const fileName of matchedFileNames) {
    const fileData = await readGlossaryFile(fileName);
    if (fileData) {
      for (const e of fileData.list) seen.set(e.original, e.translation);
    }
  }
  dispatch(setResolvedGlossaryEntries(Array.from(seen.entries())));
}

// Prunes the glossary selection down to whatever still matches the project's current direction,
// and refreshes the resolved entries cache for what remains. Called explicitly at every point that
// can change what "matches the direction" means: a glossary being saved (its own language pair may
// have changed), the project's source/target language changing, or a different project loading --
// rather than via a listener, so the reconciliation lives right next to the action that actually
// needs it.
export function reconcileGlossarySelectionWithDirection(): void {
  const matchedFileNames = directionMatchedGlossaryFileNames();
  if (matchedFileNames.length !== selectedFileNames().length) {
    dispatch(setSelectedGlossaryFileNames(matchedFileNames));
  }
  void refreshResolvedGlossaryEntries();
}

// ── Pairs of the open glossary ───────────────────────────────────────────────

// Focuses one pair input of the open glossary and scrolls it into view. false when that input
// isn't mounted.
export function focusGlossaryPairInput(
  pairIndex: number,
  column: TGlossaryPairColumn,
  selectAll = false
): boolean {
  const el = pairInputs.get(pairIndex)?.[column];
  if (!el) return false;
  if (selectAll) selectAllContentEditable(el);
  else focusContentEditableToEnd(el);
  el.scrollIntoView({ block: 'nearest' });
  dispatch(setFocusedGlossaryPair({ pairIndex, column }));
  return true;
}

export function moveGlossaryPairFocus(direction: 'up' | 'down'): void {
  const pairCount = data()?.list.length ?? 0;
  const focusedPairIndex = select(selectFocusedGlossaryPairIndex);
  const column = select(selectFocusedGlossaryColumn) ?? 'original';
  if (focusedPairIndex == null) {
    if (pairCount === 0) return;
    focusGlossaryPairInput(0, column);
    return;
  }
  const targetIndex = direction === 'up' ? focusedPairIndex - 1 : focusedPairIndex + 1;
  if (targetIndex < 0 || targetIndex >= pairCount) return;
  focusGlossaryPairInput(targetIndex, column);
}

// Adds an empty pair next to pairIndex and focuses it once it has rendered
export function insertGlossaryPair(pairIndex: number, position: 'before' | 'after'): void {
  const glossaryData = data();
  if (!glossaryData) return;
  const targetIndex = position === 'before' ? pairIndex : pairIndex + 1;
  const list = [
    ...glossaryData.list.slice(0, targetIndex),
    { original: '', translation: '' },
    ...glossaryData.list.slice(targetIndex),
  ];
  dispatch(setGlossaryData({ ...glossaryData, list }));
  const column = select(selectFocusedGlossaryColumn) ?? 'original';
  requestAnimationFrame(() => {
    focusGlossaryPairInput(targetIndex, column, false);
  });
}

/** Asks, then removes a pair of the open glossary and moves focus to its neighbour, once
 * rendered. */
export async function deleteGlossaryPair(pairIndex: number): Promise<void> {
  const pair = data()?.list[pairIndex];
  if (!pair) return;
  if (
    !(await confirmDeleteGlossaryEntry({ original: pair.original, translation: pair.translation }))
  )
    return;
  // Re-read: the pairs may have changed while the dialog was open
  const glossaryData = data();
  if (!glossaryData?.list[pairIndex]) return;
  const hasNext = pairIndex + 1 < glossaryData.list.length;
  const hasPrev = pairIndex > 0;
  const list = glossaryData.list.filter((_, i) => i !== pairIndex);
  dispatch(setGlossaryData({ ...glossaryData, list }));
  const targetIndex = hasNext ? pairIndex : hasPrev ? pairIndex - 1 : null;
  const column = select(selectFocusedGlossaryColumn) ?? 'original';
  if (targetIndex == null) {
    dispatch(setFocusedGlossaryPair({ pairIndex: null, column: null }));
    return;
  }
  requestAnimationFrame(() => {
    focusGlossaryPairInput(targetIndex, column, false);
  });
}

// ── Adding entries from the editor ───────────────────────────────────────────

/** Asks for a pair prefilled with `text` and a glossary of the project's language direction to
 * add it to, then adds it, reporting the outcome through toasts. */
export async function addGlossaryEntryFromText(text: string): Promise<void> {
  const original = text.trim();
  if (!original) return;

  const { sourceLanguage, targetLanguage } = projectLanguages();
  const matching = select(selectGlossaryItems).filter(
    (g) => g.sourceLanguage === sourceLanguage && g.targetLanguage === targetLanguage
  );
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
    const added = await addGlossaryEntry(
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
