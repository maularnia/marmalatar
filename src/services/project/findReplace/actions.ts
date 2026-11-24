import { media } from '@src/services/media';
import { Service } from '@src/services/Service';
import type { TSubtitleLine } from '@src/types';
import { getCaretX } from '@src/utils/contentEditable';
import { findMatches } from '@utils/findMatches';
import { focusInput, focusEditor, type TCaretEntry } from '../editor/actions';
import {
  selectIsEditMode,
  selectLines,
  textReplacedInLines,
  updateSourceText,
  updateTranslatedText,
} from '../editor/slice';
import {
  findReplaceClosed,
  findReplaceOpened,
  focusedColumnCleared,
  focusedResultChanged,
  queryChanged,
  selectCanFindReplaceReplaceAll,
  selectFindReplaceFocusedColumn,
  selectFindReplaceFocusedResultIndex,
  selectFindReplaceQuery,
  selectFindReplaceReplacement,
  selectFindReplaceResultLines,
  selectIsFindReplaceOpen,
  selectCanFindReplaceReplace,
  type TFindReplaceColumn,
} from './slice';

// Find & Replace's operations. It runs alongside the editor rather than through it: its own result
// list, its own focus and its own registry of rendered inputs, so the main table -- still mounted
// under the overlay -- keeps its rows, refs and focused line untouched. Lines are edited through the
// editor's reducers, so every change lands in the same undo history.

const lines = (): TSubtitleLine[] => Service.select(selectLines);
const resultLines = (): TSubtitleLine[] => Service.select(selectFindReplaceResultLines);

/** The columns searched and replaced in: the ones the current mode shows (edit mode hides the
 * output column). */
function getFindReplaceSearchColumns(): TFindReplaceColumn[] {
  return Service.select(selectIsEditMode) ? ['source'] : ['source', 'output'];
}

// The column the current mode edits, where focus lands by default (as in the editor)
const modeColumn = (): TFindReplaceColumn =>
  Service.select(selectIsEditMode) ? 'source' : 'output';

const columnText = (line: TSubtitleLine, column: TFindReplaceColumn): string =>
  (column === 'source' ? line.input : line.output) ?? '';

// Every line with the query in a searched column, or every line for an empty query
function findResultLineNos(query: string): number[] {
  const columns = getFindReplaceSearchColumns();
  return lines()
    .filter(
      (line) =>
        !query || columns.some((column) => findMatches(columnText(line, column), query).length)
    )
    .map((line) => line.line_no);
}

// ── Header inputs ────────────────────────────────────────────────────────────

type THeaderInput = 'query' | 'replacement';

const headerInputs: Record<THeaderInput, HTMLInputElement | null> = {
  query: null,
  replacement: null,
};
// Opening the overlay asks for an input that mounts with it: focused once it registers
let pendingHeaderFocus: THeaderInput | null = null;

export function registerFindReplaceHeaderInput(
  kind: THeaderInput,
  el: HTMLInputElement | null
): void {
  headerInputs[kind] = el;
  if (el && pendingHeaderFocus === kind) {
    pendingHeaderFocus = null;
    el.focus();
  }
}

export function focusFindReplaceHeaderInput(kind: THeaderInput): void {
  const el = headerInputs[kind];
  if (!el) {
    pendingHeaderFocus = kind;
    return;
  }
  pendingHeaderFocus = null;
  el.focus();
  el.select();
}

// ── Open / close ─────────────────────────────────────────────────────────────

// The text selected in the page (a line's text, typically), as a query: null when nothing is
// selected, it's only whitespace, or it spans lines -- the query field holds a single line
function getSelectedQuery(): string | null {
  const text = window.getSelection()?.toString() ?? '';
  if (!text.trim() || text.includes('\n')) return null;
  return text;
}

/** Opens the overlay searching for the selected text if there is any (every line is listed
 * otherwise), with focus in the query input -- or, for `replace: true` (ctrl+r), in the
 * replacement input. While already open it does the same, keeping the query and results unless a
 * selection replaces them. */
export function openFindReplace({ replace }: { replace: boolean }): void {
  // Read before anything moves focus, which would drop the selection
  const selectedQuery = getSelectedQuery();
  const wasOpen = Service.select(selectIsFindReplaceOpen);
  Service.dispatch(findReplaceOpened({ lineNos: wasOpen ? [] : findResultLineNos('') }));
  if (selectedQuery !== null) setFindReplaceQuery(selectedQuery);
  if (!wasOpen) media.pause();
  focusFindReplaceHeaderInput(replace ? 'replacement' : 'query');
}

/** Closes the overlay and resets it. `restoreFocus` hands focus back to the main table's focused
 * line -- not wanted when the overlay closes because the user clicked elsewhere, which already
 * moved focus where they wanted it. */
export function closeFindReplace({ restoreFocus = false }: { restoreFocus?: boolean } = {}): void {
  if (!Service.select(selectIsFindReplaceOpen)) return;
  pendingFocus = null;
  pendingHeaderFocus = null;
  Service.dispatch(findReplaceClosed());
  // The main table is hidden until the overlay unmounts: an input inside it can't take focus
  // before the next frame
  if (restoreFocus) requestAnimationFrame(() => focusEditor());
}

/** Runs the search: the only place the result list is rebuilt, so edits made to the listed rows
 * never add or remove rows -- only a new query does. */
export function setFindReplaceQuery(query: string): void {
  Service.dispatch(queryChanged({ query, lineNos: findResultLineNos(query) }));
}

// ── Replacing ────────────────────────────────────────────────────────────────

function setColumnText(lineIndex: number, column: TFindReplaceColumn, text: string): void {
  Service.dispatch(
    column === 'source'
      ? updateSourceText({ lineIndex, text })
      : updateTranslatedText({ lineIndex, text })
  );
}

/** Replaces one highlighted match (the range is in the line's current text) with the replacement.
 * Only while there is a replacement. */
export function replaceFindReplaceMatch(
  lineNo: number,
  column: TFindReplaceColumn,
  start: number,
  end: number
): void {
  if (!Service.select(selectCanFindReplaceReplace)) return;
  const lineIndex = lines().findIndex((line) => line.line_no === lineNo);
  if (lineIndex < 0) return;
  const text = columnText(lines()[lineIndex], column);
  const replacement = Service.select(selectFindReplaceReplacement);
  setColumnText(lineIndex, column, text.slice(0, start) + replacement + text.slice(end));
}

/** Replaces every match in the listed rows -- exactly what the user sees -- as one undo step. */
export function replaceAllFindReplaceMatches(): void {
  if (!Service.select(selectCanFindReplaceReplaceAll)) return;
  Service.dispatch(
    textReplacedInLines({
      lineNos: resultLines().map((line) => line.line_no),
      query: Service.select(selectFindReplaceQuery),
      replacement: Service.select(selectFindReplaceReplacement),
      columns: getFindReplaceSearchColumns(),
    })
  );
}

// ── Result inputs ────────────────────────────────────────────────────────────

// The rendered rows' text inputs, by line number (results are kept by number, which stays put
// while their indices in the project don't). Its own registry: the main table's rows keep theirs.
type TResultInputs = Record<TFindReplaceColumn, HTMLElement | null>;

const resultInputs = new Map<number, TResultInputs>();

// A focus request for a row the virtualized list hasn't rendered yet: the row is already the
// focused one in the store, which pins it, so the list mounts it and its input resolves this as it
// registers. Any newer request replaces it.
let pendingFocus: {
  lineNo: number;
  column: TFindReplaceColumn;
  selectAll: boolean;
  caretEntry?: TCaretEntry;
} | null = null;

/** `el === null` removes the input; a row goes once both its columns are empty. */
export function registerFindReplaceResultInput(
  lineNo: number,
  column: TFindReplaceColumn,
  el: HTMLElement | null
): void {
  if (el === null) {
    const row = resultInputs.get(lineNo);
    if (!row) return;
    row[column] = null;
    if (!row.source && !row.output) resultInputs.delete(lineNo);
    // The focused input is going away while it holds the overlay's focus (its row remounts: a new
    // render epoch after undo, for instance): bring focus back once it registers again
    const focusedIndex = Service.select(selectFindReplaceFocusedResultIndex);
    if (
      !pendingFocus &&
      focusedIndex !== null &&
      resultLines()[focusedIndex]?.line_no === lineNo &&
      Service.select(selectFindReplaceFocusedColumn) === column
    ) {
      pendingFocus = { lineNo, column, selectAll: false };
    }
    return;
  }
  const row = resultInputs.get(lineNo) ?? { source: null, output: null };
  row[column] = el;
  resultInputs.set(lineNo, row);
  if (pendingFocus?.lineNo === lineNo && pendingFocus.column === column) {
    const { selectAll, caretEntry } = pendingFocus;
    pendingFocus = null;
    // Registration happens while React commits the row: focus once that's done
    queueMicrotask(() => {
      const input = resultInputs.get(lineNo)?.[column];
      if (input) focusInput(input, column, selectAll, caretEntry);
    });
  }
}

/** Makes a result row (and column) the focused one, moving DOM focus to its input unless it already
 * has it -- so rows call it from their inputs' onFocus to sync the store. `column` defaults to the
 * one the current mode edits. Returns whether the input is rendered. `focusResult(null)` only
 * clears the focused column (focus left the row's inputs), keeping the focused row. */
export function focusFindReplaceResult(resultIndex: null): void;
export function focusFindReplaceResult(
  resultIndex: number,
  column?: TFindReplaceColumn,
  options?: { selectAll?: boolean; caretEntry?: TCaretEntry }
): boolean;
export function focusFindReplaceResult(
  resultIndex: number | null,
  column: TFindReplaceColumn = modeColumn(),
  { selectAll = false, caretEntry }: { selectAll?: boolean; caretEntry?: TCaretEntry } = {}
): boolean | void {
  if (resultIndex === null) {
    Service.dispatch(focusedColumnCleared());
    return;
  }
  const line = resultLines()[resultIndex];
  if (!line) return false;
  Service.dispatch(focusedResultChanged({ index: resultIndex, column }));
  const el = resultInputs.get(line.line_no)?.[column];
  if (!el) {
    pendingFocus = { lineNo: line.line_no, column, selectAll, caretEntry };
    return false;
  }
  pendingFocus = null;
  if (selectAll || !el.contains(document.activeElement)) {
    focusInput(el, column, selectAll, caretEntry);
  }
  return true;
}

// ── Navigation ───────────────────────────────────────────────────────────────

function hasSelectedTextInElement(element: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return false;
  const range = selection.getRangeAt(0);
  return element.contains(range.startContainer) && element.contains(range.endContainer);
}

/** Moves to the same input of the previous/next listed row -- not the previous/next line of the
 * project, which may not be listed. `keepCaretX` (the arrow keys at an input's edge) lands the
 * caret at the same x; otherwise (alt+arrows) it goes to the end, or selects everything when the
 * output had a selection. Returns whether there was a row to go to. */
export function navigateFindReplaceResult(
  direction: 'up' | 'down',
  { keepCaretX = false }: { keepCaretX?: boolean } = {}
): boolean {
  const results = resultLines();
  if (results.length === 0) return false;
  const focusedIndex = Service.select(selectFindReplaceFocusedResultIndex);
  const focusedColumn = Service.select(selectFindReplaceFocusedColumn) ?? undefined;
  const targetIndex =
    focusedIndex === null ? 0 : direction === 'up' ? focusedIndex - 1 : focusedIndex + 1;
  if (targetIndex < 0 || targetIndex >= results.length) return false;

  const activeElement = (document.activeElement as HTMLElement | null) ?? document.body;
  const caretX = keepCaretX ? getCaretX(activeElement) : null;
  const caretEntry: TCaretEntry | undefined =
    caretX === null ? undefined : { x: caretX, line: direction === 'up' ? 'last' : 'first' };
  const selectAll =
    !caretEntry && focusedColumn === 'output' && hasSelectedTextInElement(activeElement);
  focusFindReplaceResult(targetIndex, focusedColumn, { selectAll, caretEntry });
  media.seekToLine(lines().indexOf(results[targetIndex]));
  return true;
}

/** Moves between the focused row's source and output. The character column isn't part of Find &
 * Replace's navigation, so focus goes straight across it. Edit mode lists only the source. */
export function switchFindReplaceColumn(direction: 'left' | 'right'): void {
  if (Service.select(selectIsEditMode)) return;
  const focusedIndex = Service.select(selectFindReplaceFocusedResultIndex);
  const target: TFindReplaceColumn = direction === 'left' ? 'source' : 'output';
  if (focusedIndex === null) {
    focusFindReplaceResult(0, target);
    return;
  }
  focusFindReplaceResult(focusedIndex, target);
}
