import { pushMessage } from '@providers/bridges/messages';
import { playPause, seekToLine } from '@providers/bridges/video';
import {
  emitAutoMergeCancelledMessage,
  emitAutoMergeFailedMessage,
  emitCleanupCancelledMessage,
  emitCleanupFailedMessage,
  emitCopyAllCancelledMessage,
  emitCopyAllFailedMessage,
  emitCopyOperationCancelledMessage,
  emitCopyOperationFailedMessage,
  emitDeleteLineCancelledMessage,
  emitDeleteLineFailedMessage,
  emitEntryTimeShiftBlockedMessage,
  emitLineDeletedMessage,
  emitLinesMergedMessage,
  emitLineSplitMessage,
  emitLineTooShortToSplitMessage,
  emitMergeLinesFailedMessage,
  emitMergeOperationCancelledMessage,
  emitTextCopiedMessage,
} from '@src/messages';
import { confirmAutoMerge } from '@src/segments/dialogs/autoMergeLines/autoMergeLinesConfirmation';
import { TCleanupFormValues } from '@src/segments/dialogs/cleanup/CleanupDialog';
import { confirmCleanup } from '@src/segments/dialogs/cleanup/cleanupConfirmation';
import { confirmCopyAllSourceToOutput } from '@src/segments/dialogs/copyAllSourceToOutput/copyAllSourceToOutputConfirmation';
import { confirmCopyOverride } from '@src/segments/dialogs/copyOverride/copyOverrideConfirmation';
import { confirmDeleteLine } from '@src/segments/dialogs/delete/deleteLineConfirmation';
import { confirmMerge } from '@src/segments/dialogs/lineMerge/mergeConfirmation';
import { confirmSplit } from '@src/segments/dialogs/split/splitConfirmation';
import type { TInputColumn, TSubtitleLine } from '@src/types';
import { focusContentEditableToEnd, selectAllContentEditable } from '@src/utils/contentEditable';
import { dispatch, select } from '@store/createApi';
import { settings } from '@store/slices/settings';
import {
  allSourceCopiedToOutput,
  allTranslatedLinesCompleted,
  autoMergeAdjacentLines,
  cleanupLines,
  lineInserted,
  lineRemoved,
  lineSplit,
  linesMerged,
  restoreHistory,
  selectFocusedColumn,
  selectFocusedLineIndex,
  selectFrozenLineNumbers,
  selectIsEditMode,
  selectLines,
  setEditorMode,
  setFocusedColumn,
  setFocusedLineIndex,
  setLineCompleted,
  shiftAllLinesEarlier,
  shiftAllLinesLater,
  updateLineTiming,
  updateTranslatedText,
} from './slice';

// The editor service's operations. They read their own state with select(localSelector), not the
// facade: index.ts builds the facade from this file, so importing it here would be a cycle. Dialogs,
// toasts and the video player are reached through the bridges in src/providers/bridges.

const lines = (): TSubtitleLine[] => select(selectLines);

// The ai slice imports the editor, so its facade can't be imported here. Edits that restructure
// lines are blocked while a bulk AI translation runs, since its results are matched to lines by
// index; the job's flag is read from the raw state instead.
type TBulkJobState = { ai: { currentBulkJob: { running: boolean } | null } };
const isBulkTranslationRunning = (): boolean =>
  select((state: TBulkJobState) => Boolean(state.ai.currentBulkJob?.running));

// ── Line inputs ──────────────────────────────────────────────────────────────

// The DOM inputs of the rendered lines, per line and column. DOM elements aren't store state, so
// they live here, next to the operations that focus them.
type TRowInputMap = Record<TInputColumn, HTMLElement | null>;

const lineInputs = new Map<number, TRowInputMap>();

// `el === null` removes the input, and a row goes once all its columns are empty. Each row
// registers itself on mount and nulls its entries on unmount (EditorTableLine.tsx), so the map
// cleans itself as rows of one project unmount and rows of the next one mount.
export function registerLineInput(
  lineIndex: number,
  column: TInputColumn,
  el: HTMLElement | null
): void {
  if (el === null) {
    const row = lineInputs.get(lineIndex);
    if (!row) return;
    row[column] = null;
    if (!row.source && !row.output && !row.character) lineInputs.delete(lineIndex);
    return;
  }
  const row = lineInputs.get(lineIndex) ?? { source: null, output: null, character: null };
  row[column] = el;
  lineInputs.set(lineIndex, row);
}

export function getLineInput(lineIndex: number, column: TInputColumn): HTMLElement | null {
  return lineInputs.get(lineIndex)?.[column] ?? null;
}

// ── Split cursor ─────────────────────────────────────────────────────────────

// The caret offset in the focused line's text, recorded by the line as it changes, for splitting.
let splitCursor: number | null = null;

export function setSplitCursor(offset: number | null): void {
  splitCursor = offset;
}

// An offset is only meaningful for the project that recorded it: against the next project's
// differently-indexed lines it would be misread. The project service clears it whenever the open
// project changes (opened, created or closed).
export function clearSplitCursor(): void {
  splitCursor = null;
}

// ── Focus and navigation ─────────────────────────────────────────────────────

function setFocusedLine(lineIndex: number | null): void {
  dispatch(setFocusedLineIndex(lineIndex));
  splitCursor = null;
}

/** Focuses a line's input and makes it the focused line and column. Returns whether the input
 * exists (is rendered). */
export function focusInput(lineIndex: number, column: TInputColumn, selectAll = false): boolean {
  const el = getLineInput(lineIndex, column);
  if (!el) return false;
  if (column === 'output' || column === 'source') {
    if (selectAll) selectAllContentEditable(el);
    else focusContentEditableToEnd(el);
  } else {
    el.focus();
  }
  el.scrollIntoView({ block: 'nearest' });
  setFocusedLine(lineIndex);
  dispatch(setFocusedColumn(column));
  return true;
}

/** Syncs the focused line and column to an input that was focused through some element outside
 * the line inputs (e.g. a zone's generic fallback ref) -- the DOM focusing itself stays with the
 * caller, since only it knows which element that is. */
export function setFocusedLineAndColumn(lineIndex: number, column: TInputColumn): void {
  setFocusedLine(lineIndex);
  dispatch(setFocusedColumn(column));
}

/** Refocuses whatever was last focused, falling back to the first line's first available input
 * (output, then source) if nothing was focused yet or the editor has no lines. Returns whether
 * it actually found something to focus. */
// Shared by "an overlay just closed" and "a project just opened": prefer wherever the user last
// was, and otherwise land on the first line's first available input -- output normally, source
// when edit mode hides the output column.
export function focusEditor(): boolean {
  const focusedLineIndex = select(selectFocusedLineIndex);
  const focusedColumn = select(selectFocusedColumn);
  if (focusedLineIndex !== null && focusInput(focusedLineIndex, focusedColumn ?? 'output')) {
    return true;
  }
  if (lines().length === 0) return false;
  return focusInput(0, 'output') || focusInput(0, 'source');
}

// Several operations (split/merge/insert/remove line, undo/redo) dispatch a change that bumps the
// render epoch, which remounts every visible row (see VirtualizedList's epoch-keyed Slots) -- that
// destroys whatever was focused, so the refocus has to happen on the next frame, after the remount
// has actually happened. Centralized here so every such operation recovers the same way.
function refocusLineAfterRender(lineIndex: number, column: TInputColumn): void {
  requestAnimationFrame(() => {
    focusInput(lineIndex, column, false);
  });
}

/** Makes an existing line the focused one, without moving DOM focus. */
export function focusLine(lineIndex: number): void {
  if (!lines()[lineIndex]) return;
  setFocusedLine(lineIndex);
}

export function switchColumn(targetColumn: TInputColumn, lineIndex: number | null): void {
  if (lineIndex == null) {
    if (lines().length === 0) return;
    focusInput(0, targetColumn);
    return;
  }
  if (!select(selectFocusedColumn)) return;
  focusInput(lineIndex, targetColumn);
}

function hasSelectedTextInElement(element: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return false;
  }
  const range = selection.getRangeAt(0);
  return element.contains(range.startContainer) && element.contains(range.endContainer);
}

export function navigateLine(direction: 'up' | 'down', lineIndex: number | null): void {
  const activeElement = (document.activeElement as HTMLElement | null) ?? document.body;
  const lineCount = lines().length;
  const focusedColumn = select(selectFocusedColumn);
  const column = focusedColumn ?? 'output';
  if (lineIndex == null) {
    if (lineCount === 0) return;
    focusInput(0, column);
    seekToLine(0);
    return;
  }
  const targetIndex = direction === 'up' ? lineIndex - 1 : lineIndex + 1;
  if (targetIndex < 0 || targetIndex >= lineCount) return;
  const selectAll = focusedColumn === 'output' && hasSelectedTextInElement(activeElement);
  focusInput(targetIndex, column, selectAll);
  seekToLine(targetIndex);
}

export function playFocusedLine(): void {
  const focusedLineIndex = select(selectFocusedLineIndex);
  if (focusedLineIndex === null || !lines()[focusedLineIndex]) return;
  seekToLine(focusedLineIndex);
  playPause();
}

// ── Line edits ───────────────────────────────────────────────────────────────

export async function copySourceToOutput(lineIndex: number): Promise<void> {
  if (select(selectIsEditMode)) return;
  const line = lines()[lineIndex];
  if (!line) return;
  const autoMarkLinesCompleted = settings.get.autoMarkLinesCompleted();
  if (line.output?.trim()) {
    let confirmed: boolean;
    try {
      confirmed = await confirmCopyOverride();
    } catch (e) {
      emitCopyOperationFailedMessage(
        pushMessage,
        e instanceof Error
          ? e.message
          : 'Critical unexpected error while copying source text to translation column'
      );
      return;
    }
    if (!confirmed) {
      emitCopyOperationCancelledMessage(pushMessage);
      return;
    }
  }
  dispatch(updateTranslatedText({ lineIndex, text: line.input ?? '' }));
  if (autoMarkLinesCompleted)
    dispatch(setLineCompleted({ lineIndex, completed: Boolean(line.input), skipHistory: true }));
  focusInput(lineIndex, 'output', true);
  emitTextCopiedMessage(pushMessage);
}

export function insertLine(lineIndex: number, position: 'before' | 'after'): void {
  const line = lines()[lineIndex];
  if (!line) return;
  const duration = line.end_time - line.start_time;
  const mid = line.start_time + Math.floor(duration / 2);
  if (mid - 1 - line.start_time < 100 || line.end_time - (mid + 1) < 100) {
    emitLineTooShortToSplitMessage(pushMessage);
    return;
  }
  const column = select(selectFocusedColumn) ?? 'output';
  dispatch(lineInserted({ lineIndex, position }));
  refocusLineAfterRender(position === 'before' ? lineIndex : lineIndex + 1, column);
}

/** Splits a line at the caret position the line last recorded (`setSplitCursor`). */
export async function splitLine(lineIndex: number): Promise<void> {
  const cursorOffset = splitCursor;
  if (select(selectFrozenLineNumbers).includes(lines()[lineIndex]?.line_no)) return;
  if (isBulkTranslationRunning()) return;
  const focusedColumn = select(selectFocusedColumn);
  if (focusedColumn !== 'source' && focusedColumn !== 'output') return;
  if (settings.get.askBeforeSplit() && !(await confirmSplit())) return;
  dispatch(lineSplit({ lineIndex, cursorOffset, column: focusedColumn }));
  refocusLineAfterRender(lineIndex, focusedColumn);
  emitLineSplitMessage(pushMessage);
}

const lineText = (line: TSubtitleLine): string => line.output || line.input || '';

export async function mergeLines(lineIndex: number, direction: 'up' | 'down'): Promise<void> {
  const current = lines();
  const partnerIndex = direction === 'up' ? lineIndex - 1 : lineIndex + 1;
  if (partnerIndex < 0 || partnerIndex >= current.length) return;
  const line = current[lineIndex];
  const partnerLine = current[partnerIndex];
  const frozen = new Set(select(selectFrozenLineNumbers));
  if (frozen.has(line.line_no) || frozen.has(partnerLine.line_no)) return;
  if (isBulkTranslationRunning()) return;
  if (settings.get.askBeforeMerge()) {
    const [first, second] = direction === 'up' ? [partnerLine, line] : [line, partnerLine];
    let confirmed: boolean;
    try {
      confirmed = await confirmMerge({
        lines: [
          { lineNo: first.line_no, text: lineText(first) },
          { lineNo: second.line_no, text: lineText(second) },
        ],
      });
    } catch (e) {
      emitMergeLinesFailedMessage(
        pushMessage,
        e instanceof Error ? e.message : 'Unexpected critical error while merging lines'
      );
      return;
    }
    if (!confirmed) {
      emitMergeOperationCancelledMessage(pushMessage);
      return;
    }
  }
  dispatch(linesMerged({ lineIndex, direction }));
  refocusLineAfterRender(direction === 'up' ? partnerIndex : lineIndex, 'output');
  emitLinesMergedMessage(pushMessage);
}

export async function removeLine(lineIndex: number): Promise<void> {
  if (isBulkTranslationRunning()) return;
  if (settings.get.askBeforeDelete()) {
    const line = lines()[lineIndex];
    let confirmed: boolean;
    try {
      confirmed = await confirmDeleteLine({
        lineNo: line?.line_no ?? lineIndex + 1,
        text: line ? lineText(line) : '',
      });
    } catch (e) {
      emitDeleteLineFailedMessage(
        pushMessage,
        e instanceof Error ? e.message : 'Critical unexpected failure while deleting a line'
      );
      return;
    }
    if (!confirmed) {
      emitDeleteLineCancelledMessage(pushMessage);
      return;
    }
  }
  const lineCount = lines().length;
  const hasNext = lineIndex + 1 < lineCount;
  const hasPrev = lineIndex > 0;
  dispatch(lineRemoved(lineIndex));
  const targetIndex = hasNext ? lineIndex : hasPrev ? lineIndex - 1 : null;
  if (targetIndex != null) refocusLineAfterRender(targetIndex, 'output');
  else setFocusedLine(null);
  emitLineDeletedMessage(pushMessage);
}

export function toggleCompleted(lineIndex: number): void {
  const current = lines();
  const focusedColumn = select(selectFocusedColumn);
  const completed = !current[lineIndex].completed;
  dispatch(setLineCompleted({ lineIndex, completed }));
  if (completed) {
    // Marking complete advances to the next line.
    if (current[lineIndex + 1]) focusInput(lineIndex + 1, 'output', false);
  } else {
    // Un-completing is a correction -- clicking the toggle itself moved DOM focus away from the
    // line's input, so restore it to whatever column was last focused rather than leaving focus
    // stranded on the toggle button.
    focusInput(lineIndex, focusedColumn ?? 'output', false);
  }
}

// ── Timing ───────────────────────────────────────────────────────────────────

type TTimeDirection = 'earlier' | 'later';

export function adjustStartTime(lineIndex: number, direction: TTimeDirection): void {
  const current = lines();
  const step = settings.get.timeAdjustmentStep();
  const line = current[lineIndex];
  if (!line) return;
  const next = line.start_time + (direction === 'earlier' ? -step : step);
  const blocked =
    direction === 'earlier'
      ? next < (lineIndex > 0 ? current[lineIndex - 1].end_time : Number.NEGATIVE_INFINITY) ||
        next >= line.end_time
      : next >= line.end_time ||
        next > (current[lineIndex + 1]?.start_time ?? Number.POSITIVE_INFINITY);
  if (blocked) {
    emitEntryTimeShiftBlockedMessage(pushMessage);
    return;
  }
  dispatch(updateLineTiming({ lineIndex, startTime: next, endTime: line.end_time }));
}

export function adjustEndTime(lineIndex: number, direction: TTimeDirection): void {
  const current = lines();
  const step = settings.get.timeAdjustmentStep();
  const line = current[lineIndex];
  if (!line) return;
  const next = line.end_time + (direction === 'earlier' ? -step : step);
  const blocked =
    direction === 'earlier'
      ? next <= line.start_time ||
        next < (lineIndex > 0 ? current[lineIndex - 1].end_time : Number.NEGATIVE_INFINITY)
      : next <= line.start_time ||
        next > (current[lineIndex + 1]?.start_time ?? Number.POSITIVE_INFINITY);
  if (blocked) {
    emitEntryTimeShiftBlockedMessage(pushMessage);
    return;
  }
  dispatch(updateLineTiming({ lineIndex, startTime: line.start_time, endTime: next }));
}

/** Moves a whole line (start and end) by one step, without overlapping its neighbours. */
export function adjustEntryTime(lineIndex: number, direction: TTimeDirection): void {
  const current = lines();
  const step = settings.get.timeAdjustmentStep();
  const line = current[lineIndex];
  if (!line) return;
  const delta = direction === 'earlier' ? -step : step;
  const startTime = line.start_time + delta;
  const endTime = line.end_time + delta;
  const blocked =
    direction === 'earlier'
      ? startTime < (lineIndex > 0 ? current[lineIndex - 1].end_time : 0)
      : endTime > (current[lineIndex + 1]?.start_time ?? Number.POSITIVE_INFINITY);
  if (blocked) {
    emitEntryTimeShiftBlockedMessage(pushMessage);
    return;
  }
  dispatch(updateLineTiming({ lineIndex, startTime, endTime }));
}

export function shiftAllLines(direction: TTimeDirection): void {
  const step = settings.get.timeAdjustmentStep();
  dispatch(direction === 'earlier' ? shiftAllLinesEarlier(step) : shiftAllLinesLater(step));
}

// ── History ──────────────────────────────────────────────────────────────────

export function undoRedo(direction: 'backward' | 'forward'): void {
  if (isBulkTranslationRunning()) return;
  const focusedLineIndex = select(selectFocusedLineIndex);
  const focusedColumn = select(selectFocusedColumn);
  dispatch(restoreHistory(direction));
  if (focusedLineIndex !== null && focusedColumn) {
    refocusLineAfterRender(focusedLineIndex, focusedColumn);
  }
}

// ── Bulk operations ──────────────────────────────────────────────────────────

export async function autoMerge(): Promise<void> {
  if (isBulkTranslationRunning()) return;
  let threshold: number | null;
  try {
    threshold = await confirmAutoMerge();
  } catch (e) {
    emitAutoMergeFailedMessage(
      pushMessage,
      e instanceof Error ? e.message : 'How did you get there [UNREACHABLE 03]'
    );
    return;
  }
  if (threshold === null) {
    emitAutoMergeCancelledMessage(pushMessage);
    return;
  }
  dispatch(autoMergeAdjacentLines({ threshold }));
}

export async function cleanup(): Promise<void> {
  if (isBulkTranslationRunning()) return;
  let values: TCleanupFormValues | null;
  try {
    values = await confirmCleanup(select(selectIsEditMode));
  } catch (e) {
    emitCleanupFailedMessage(
      pushMessage,
      e instanceof Error ? e.message : 'Unexpected critical error while running cleanup'
    );
    return;
  }
  if (!values) {
    emitCleanupCancelledMessage(pushMessage);
    return;
  }
  const { targetColumn, ...options } = values;
  dispatch(cleanupLines({ targetColumn, options }));
  // Cleanup can drop lines/renumber, which may bump renderEpoch and remount visible rows -- wait a
  // frame before refocusing, same as refocusLineAfterRender does for other structural changes.
  requestAnimationFrame(() => {
    focusEditor();
  });
}

export async function copyAllSourceToOutput(): Promise<void> {
  if (isBulkTranslationRunning() || select(selectIsEditMode)) return;
  const hasExistingOutput = lines().some((line) => line.output?.trim());
  let overrideExisting: boolean | null;
  try {
    overrideExisting = await confirmCopyAllSourceToOutput(hasExistingOutput);
  } catch (e) {
    emitCopyAllFailedMessage(
      pushMessage,
      e instanceof Error
        ? e.message
        : 'Unexpected critical error while copying all source to output'
    );
    return;
  }
  if (overrideExisting === null) {
    emitCopyAllCancelledMessage(pushMessage);
    return;
  }
  dispatch(allSourceCopiedToOutput({ overrideExisting }));
}

export function completeAllTranslatedLines(): void {
  if (isBulkTranslationRunning()) return;
  dispatch(allTranslatedLinesCompleted());
}

// ── Mode ─────────────────────────────────────────────────────────────────────

/** Switches between translating and editing, keeping focus on the focused line in the column the
 * new mode works in. */
export function toggleEditMode(): void {
  const nextMode = select(selectIsEditMode) ? 'translate' : 'edit';
  const focusedLineIndex = select(selectFocusedLineIndex);
  dispatch(setEditorMode(nextMode));
  if (focusedLineIndex !== null) {
    refocusLineAfterRender(focusedLineIndex, nextMode === 'edit' ? 'source' : 'output');
  }
}
