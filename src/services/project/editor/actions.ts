import { toast } from '@src/services/toast';
import {
  makeAutoMergeCancelledMessage,
  makeAutoMergeFailedMessage,
  makeCleanupCancelledMessage,
  makeCleanupFailedMessage,
  makeCopyAllCancelledMessage,
  makeCopyAllFailedMessage,
  makeCopyOperationCancelledMessage,
  makeCopyOperationFailedMessage,
  makeDeleteLineCancelledMessage,
  makeDeleteLineFailedMessage,
  makeEntryTimeShiftBlockedMessage,
  makeLineDeletedMessage,
  makeLineSplitMessage,
  makeLineTooShortToSplitMessage,
  makeLinesMergedMessage,
  makeMergeLinesFailedMessage,
  makeMergeOperationCancelledMessage,
  makeTextCopiedMessage,
  makeTempoAutoFixCancelledMessage,
  makeTempoAutoFixFailedMessage,
  makeTempoAutoFixNothingMessage,
  makeTempoAutoFixedMessage,
} from '@src/services/project/editor/toasts';
import {
  confirmAutoFixTempo,
  type TAutoFixTempoOptions,
} from './dialogs/autoFixTempo/autoFixTempoConfirmation';
import { autoFixTiming } from '@utils/tempo';
import { selectProjectTempo } from '../slice';
import { confirmAutoMerge } from './dialogs/autoMergeLines/autoMergeLinesConfirmation';
import { TCleanupFormValues } from './dialogs/cleanup/CleanupDialog';
import { confirmCleanup } from './dialogs/cleanup/cleanupConfirmation';
import { confirmCopyAllSourceToOutput } from './dialogs/copyAllSourceToOutput/copyAllSourceToOutputConfirmation';
import { confirmCopyOverride } from './dialogs/copyOverride/copyOverrideConfirmation';
import { confirmDeleteLine } from './dialogs/delete/deleteLineConfirmation';
import { confirmMerge } from './dialogs/lineMerge/mergeConfirmation';
import { confirmSplit } from './dialogs/split/splitConfirmation';
import type { TInputColumn, TSubtitleLine } from '@src/types';
import { focusContentEditableToEnd, selectAllContentEditable } from '@src/utils/contentEditable';
import { media } from '@src/services/media';
import { Service } from '@src/services/Service';
import { settings } from '@src/services/settings';
import {
  allSourceCopiedToOutput,
  allTranslatedLinesCompleted,
  autoMergeAdjacentLines,
  cleanupLines,
  tempoAutoFixed,
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

// The editor service's operations. They read their own state with Service.select(localSelector), not the
// facade: index.ts builds the facade from this file, so importing it here would be a cycle. Dialogs
// and toasts are reached through the bridges in src/providers/bridges, playback through media.

const lines = (): TSubtitleLine[] => Service.select(selectLines);

// The ai slice imports the editor, so its facade can't be imported here. Edits that restructure
// lines are blocked while a bulk AI translation runs, since its results are matched to lines by
// index; the job's flag is read from the raw state instead.
type TBulkJobState = { ai: { currentBulkJob: { running: boolean } | null } };
const isBulkTranslationRunning = (): boolean =>
  Service.select((state: TBulkJobState) => Boolean(state.ai.currentBulkJob?.running));

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

function getLineInput(lineIndex: number, column: TInputColumn): HTMLElement | null {
  return lineInputs.get(lineIndex)?.[column] ?? null;
}

/** The text selected inside a line's source input, or null when the selection is empty or lies
 * elsewhere. */
export function getSourceSelection(lineIndex: number): string | null {
  const sourceInput = getLineInput(lineIndex, 'source');
  if (!sourceInput) return null;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  if (!sourceInput.contains(selection.getRangeAt(0).commonAncestorContainer)) return null;
  return selection.toString() || null;
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
  Service.dispatch(setFocusedLineIndex(lineIndex));
  splitCursor = null;
}

// The column the current mode edits: edit mode hides the output column.
const modeColumn = (): TInputColumn => (Service.select(selectIsEditMode) ? 'source' : 'output');

/** Makes a line (and column) the focused one, moving DOM focus to its input unless the input
 * already has it. `column` defaults to the one the current mode edits (source in edit mode, output
 * in translation mode). Returns whether the input exists (is rendered). `focusLine(null)` only
 * clears the focused column (the focus left the line's inputs), keeping the focused line. */
export function focusLine(lineIndex: null): void;
export function focusLine(lineIndex: number, column?: TInputColumn, selectAll?: boolean): boolean;
export function focusLine(
  lineIndex: number | null,
  column: TInputColumn = modeColumn(),
  selectAll = false
): boolean | void {
  if (lineIndex === null) {
    Service.dispatch(setFocusedColumn(null));
    return;
  }
  if (!lines()[lineIndex]) return false;
  const el = getLineInput(lineIndex, column);
  if (!el) {
    // A line scrolled out of the virtualized list has no input, but still becomes focused.
    setFocusedLine(lineIndex);
    return false;
  }
  // Inputs call this from their own onFocus to sync the store: moving the caret or scrolling then
  // would undo where the user just clicked. An explicit selectAll still applies.
  if (selectAll || !el.contains(document.activeElement)) {
    if (column === 'output' || column === 'source') {
      if (selectAll) selectAllContentEditable(el);
      else focusContentEditableToEnd(el);
    } else {
      el.focus();
    }
    el.scrollIntoView({ block: 'nearest' });
  }
  setFocusedLine(lineIndex);
  Service.dispatch(setFocusedColumn(column));
  return true;
}

/** Refocuses whatever was last focused, falling back to the first line's input for the current
 * mode if nothing was focused yet or the editor has no lines. Returns whether
 * it actually found something to focus. */
// Shared by "an overlay just closed" and "a project just opened": prefer wherever the user last
// was, and otherwise land on the first line's first available input -- output normally, source
// when edit mode hides the output column.
export function focusEditor(): boolean {
  const focusedLineIndex = Service.select(selectFocusedLineIndex);
  const focusedColumn = Service.select(selectFocusedColumn);
  if (focusedLineIndex !== null && focusLine(focusedLineIndex, focusedColumn ?? undefined)) {
    return true;
  }
  if (lines().length === 0) return false;
  return focusLine(0);
}

// Several operations (split/merge/insert/remove line, undo/redo) dispatch a change that bumps the
// render epoch, which remounts every visible row (see VirtualizedList's epoch-keyed Slots) -- that
// destroys whatever was focused, so the refocus has to happen on the next frame, after the remount
// has actually happened. Centralized here so every such operation recovers the same way.
function refocusLineAfterRender(lineIndex: number, column?: TInputColumn): void {
  requestAnimationFrame(() => {
    focusLine(lineIndex, column);
  });
}

export function switchColumn(targetColumn: TInputColumn, lineIndex: number | null): void {
  if (lineIndex == null) {
    if (lines().length === 0) return;
    focusLine(0, targetColumn);
    return;
  }
  if (!Service.select(selectFocusedColumn)) return;
  focusLine(lineIndex, targetColumn);
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
  const focusedColumn = Service.select(selectFocusedColumn);
  const column = focusedColumn ?? undefined;
  if (lineIndex == null) {
    if (lineCount === 0) return;
    focusLine(0, column);
    media.seekToLine(0);
    return;
  }
  const targetIndex = direction === 'up' ? lineIndex - 1 : lineIndex + 1;
  if (targetIndex < 0 || targetIndex >= lineCount) return;
  const selectAll = focusedColumn === 'output' && hasSelectedTextInElement(activeElement);
  focusLine(targetIndex, column, selectAll);
  media.seekToLine(targetIndex);
}

export function playFocusedLine(): void {
  const focusedLineIndex = Service.select(selectFocusedLineIndex);
  if (focusedLineIndex === null || !lines()[focusedLineIndex]) return;
  media.seekToLine(focusedLineIndex);
  media.playPause();
}

// ── Line edits ───────────────────────────────────────────────────────────────

export async function copySourceToOutput(lineIndex: number): Promise<void> {
  if (Service.select(selectIsEditMode)) return;
  const line = lines()[lineIndex];
  if (!line) return;
  const autoMarkLinesCompleted = settings.get.autoMarkLinesCompleted();
  if (line.output?.trim()) {
    let confirmed: boolean;
    try {
      confirmed = await confirmCopyOverride();
    } catch (e) {
      toast.push(
        makeCopyOperationFailedMessage(
          e instanceof Error
            ? e.message
            : 'Critical unexpected error while copying source text to translation column'
        )
      );
      return;
    }
    if (!confirmed) {
      toast.push(makeCopyOperationCancelledMessage());
      return;
    }
  }
  Service.dispatch(updateTranslatedText({ lineIndex, text: line.input ?? '' }));
  if (autoMarkLinesCompleted)
    Service.dispatch(
      setLineCompleted({ lineIndex, completed: Boolean(line.input), skipHistory: true })
    );
  focusLine(lineIndex, 'output', true);
  toast.push(makeTextCopiedMessage());
}

export function insertLine(lineIndex: number, position: 'before' | 'after'): void {
  const line = lines()[lineIndex];
  if (!line) return;
  const duration = line.end_time - line.start_time;
  const mid = line.start_time + Math.floor(duration / 2);
  if (mid - 1 - line.start_time < 100 || line.end_time - (mid + 1) < 100) {
    toast.push(makeLineTooShortToSplitMessage());
    return;
  }
  const column = Service.select(selectFocusedColumn) ?? undefined;
  Service.dispatch(lineInserted({ lineIndex, position }));
  refocusLineAfterRender(position === 'before' ? lineIndex : lineIndex + 1, column);
}

/** Splits a line at the caret position the line last recorded (`setSplitCursor`). */
export async function splitLine(lineIndex: number): Promise<void> {
  const cursorOffset = splitCursor;
  if (Service.select(selectFrozenLineNumbers).includes(lines()[lineIndex]?.line_no)) return;
  if (isBulkTranslationRunning()) return;
  const focusedColumn = Service.select(selectFocusedColumn);
  if (focusedColumn !== 'source' && focusedColumn !== 'output') return;
  if (settings.get.askBeforeSplit() && !(await confirmSplit())) return;
  Service.dispatch(lineSplit({ lineIndex, cursorOffset, column: focusedColumn }));
  refocusLineAfterRender(lineIndex, focusedColumn);
  toast.push(makeLineSplitMessage());
}

const lineText = (line: TSubtitleLine): string => line.output || line.input || '';

export async function mergeLines(lineIndex: number, direction: 'up' | 'down'): Promise<void> {
  const current = lines();
  const partnerIndex = direction === 'up' ? lineIndex - 1 : lineIndex + 1;
  if (partnerIndex < 0 || partnerIndex >= current.length) return;
  const line = current[lineIndex];
  const partnerLine = current[partnerIndex];
  const frozen = new Set(Service.select(selectFrozenLineNumbers));
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
      toast.push(
        makeMergeLinesFailedMessage(
          e instanceof Error ? e.message : 'Unexpected critical error while merging lines'
        )
      );
      return;
    }
    if (!confirmed) {
      toast.push(makeMergeOperationCancelledMessage());
      return;
    }
  }
  Service.dispatch(linesMerged({ lineIndex, direction }));
  refocusLineAfterRender(direction === 'up' ? partnerIndex : lineIndex);
  toast.push(makeLinesMergedMessage());
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
      toast.push(
        makeDeleteLineFailedMessage(
          e instanceof Error ? e.message : 'Critical unexpected failure while deleting a line'
        )
      );
      return;
    }
    if (!confirmed) {
      toast.push(makeDeleteLineCancelledMessage());
      return;
    }
  }
  const lineCount = lines().length;
  const hasNext = lineIndex + 1 < lineCount;
  const hasPrev = lineIndex > 0;
  Service.dispatch(lineRemoved(lineIndex));
  const targetIndex = hasNext ? lineIndex : hasPrev ? lineIndex - 1 : null;
  if (targetIndex != null) refocusLineAfterRender(targetIndex);
  else setFocusedLine(null);
  toast.push(makeLineDeletedMessage());
}

export function toggleCompleted(lineIndex: number): void {
  const current = lines();
  const focusedColumn = Service.select(selectFocusedColumn);
  const completed = !current[lineIndex].completed;
  Service.dispatch(setLineCompleted({ lineIndex, completed }));
  if (completed) {
    // Marking complete advances to the next line.
    if (current[lineIndex + 1]) focusLine(lineIndex + 1);
  } else {
    // Un-completing is a correction -- clicking the toggle itself moved DOM focus away from the
    // line's input, so restore it to whatever column was last focused rather than leaving focus
    // stranded on the toggle button.
    focusLine(lineIndex, focusedColumn ?? undefined);
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
    toast.push(makeEntryTimeShiftBlockedMessage());
    return;
  }
  Service.dispatch(updateLineTiming({ lineIndex, startTime: next, endTime: line.end_time }));
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
    toast.push(makeEntryTimeShiftBlockedMessage());
    return;
  }
  Service.dispatch(updateLineTiming({ lineIndex, startTime: line.start_time, endTime: next }));
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
    toast.push(makeEntryTimeShiftBlockedMessage());
    return;
  }
  Service.dispatch(updateLineTiming({ lineIndex, startTime, endTime }));
}

export function shiftAllLines(direction: TTimeDirection): void {
  const step = settings.get.timeAdjustmentStep();
  Service.dispatch(direction === 'earlier' ? shiftAllLinesEarlier(step) : shiftAllLinesLater(step));
}

// ── History ──────────────────────────────────────────────────────────────────

export function undoRedo(direction: 'backward' | 'forward'): void {
  if (isBulkTranslationRunning()) return;
  const focusedLineIndex = Service.select(selectFocusedLineIndex);
  const focusedColumn = Service.select(selectFocusedColumn);
  Service.dispatch(restoreHistory(direction));
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
    toast.push(
      makeAutoMergeFailedMessage(
        e instanceof Error ? e.message : 'How did you get there [UNREACHABLE 03]'
      )
    );
    return;
  }
  if (threshold === null) {
    toast.push(makeAutoMergeCancelledMessage());
    return;
  }
  Service.dispatch(autoMergeAdjacentLines({ threshold }));
}

export async function cleanup(): Promise<void> {
  if (isBulkTranslationRunning()) return;
  let values: TCleanupFormValues | null;
  try {
    values = await confirmCleanup(Service.select(selectIsEditMode));
  } catch (e) {
    toast.push(
      makeCleanupFailedMessage(
        e instanceof Error ? e.message : 'Unexpected critical error while running cleanup'
      )
    );
    return;
  }
  if (!values) {
    toast.push(makeCleanupCancelledMessage());
    return;
  }
  const { targetColumn, ...options } = values;
  Service.dispatch(cleanupLines({ targetColumn, options }));
  // Cleanup can drop lines/renumber, which may bump renderEpoch and remount visible rows -- wait a
  // frame before refocusing, same as refocusLineAfterRender does for other structural changes.
  requestAnimationFrame(() => {
    focusEditor();
  });
}

// Retimes overlapping and too-close lines to the project's tempo limits (see autoFixTiming), on
// the lines whose column for the current mode has text. Asks first; one undo step.
export async function autoFixTempo(): Promise<void> {
  const tempo = Service.select(selectProjectTempo);
  if (isBulkTranslationRunning() || !tempo.enabled) return;
  const isEditMode = Service.select(selectIsEditMode);
  let options: TAutoFixTempoOptions | null;
  try {
    options = await confirmAutoFixTempo(tempo);
  } catch (e) {
    toast.push(
      makeTempoAutoFixFailedMessage(
        e instanceof Error ? e.message : 'Unexpected critical error while fixing tempo'
      )
    );
    return;
  }
  if (!options) {
    toast.push(makeTempoAutoFixCancelledMessage());
    return;
  }
  const targetColumn = isEditMode ? 'source' : 'output';
  // Lines aren't stretched past the video's end, when there is one
  const maxEndMs = media.get.videoDurationMs();
  // A dry run on the current lines: an empty fix shouldn't leave an undo step behind
  const getText = (line: TSubtitleLine): string => (isEditMode ? line.input : line.output) ?? '';
  const { changedCount } = autoFixTiming(lines(), tempo, getText, {
    extendForCps: options.extendForCps,
    maxEndMs,
  });
  if (!changedCount) {
    toast.push(makeTempoAutoFixNothingMessage());
    return;
  }
  Service.dispatch(
    tempoAutoFixed({ targetColumn, tempo, extendForCps: options.extendForCps, maxEndMs })
  );
  toast.push(makeTempoAutoFixedMessage(changedCount));
}

export async function copyAllSourceToOutput(): Promise<void> {
  if (isBulkTranslationRunning() || Service.select(selectIsEditMode)) return;
  const hasExistingOutput = lines().some((line) => line.output?.trim());
  let overrideExisting: boolean | null;
  try {
    overrideExisting = await confirmCopyAllSourceToOutput(hasExistingOutput);
  } catch (e) {
    toast.push(
      makeCopyAllFailedMessage(
        e instanceof Error
          ? e.message
          : 'Unexpected critical error while copying all source to output'
      )
    );
    return;
  }
  if (overrideExisting === null) {
    toast.push(makeCopyAllCancelledMessage());
    return;
  }
  Service.dispatch(allSourceCopiedToOutput({ overrideExisting }));
}

// Translate mode only: edit mode has no translations to complete
export function completeAllTranslatedLines(): void {
  if (isBulkTranslationRunning() || Service.select(selectIsEditMode)) return;
  Service.dispatch(allTranslatedLinesCompleted());
}

// ── Mode ─────────────────────────────────────────────────────────────────────

/** Switches between translating and editing, keeping focus on the focused line in the column the
 * new mode works in. */
export function toggleEditMode(): void {
  const nextMode = Service.select(selectIsEditMode) ? 'translate' : 'edit';
  const focusedLineIndex = Service.select(selectFocusedLineIndex);
  Service.dispatch(setEditorMode(nextMode));
  if (focusedLineIndex !== null) {
    refocusLineAfterRender(focusedLineIndex, nextMode === 'edit' ? 'source' : 'output');
  }
}
