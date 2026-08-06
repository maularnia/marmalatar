import { createSlice, current, PayloadAction } from '@reduxjs/toolkit';
import { TColor, TColorCustom } from '@src/theme/definitions';
import type { InputColumnType } from '@providers/EditorRefsProvider';
import { TCharacter, TSubtitleLine } from '@src/types';
import { parseCharacterList, serializeCharacterList } from '@utils/characters';
import { computeTranslationProgress } from '@utils/translationProgress';
import { cleanupEntries, TEntryCleanupOptions } from '@utils/data/entryCleanup';

// ─── Types ───────────────────────────────────────────────────────────────────

type EditorSliceState = {
  // Editor UI memory (not persisted)
  activeLineIndex: number | null;
  focusedLineIndex: number | null;
  focusedColumn: InputColumnType | null;
  renderEpoch: number;
  textSelection: string;
  // Translation
  lines: TSubtitleLine[];
  past: TSubtitleLine[][];
  future: TSubtitleLine[][];
  totalLinesToTranslate: number;
  characterPool: TCharacter[];
  // Video UI (persisted)
  isVideoCollapsed: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addToHistory(past: TSubtitleLine[][], lines: TSubtitleLine[]): TSubtitleLine[][] {
  const next = [...past, lines];
  return next.length > 5 ? next.slice(next.length - 5) : next;
}

function shiftLines(lines: TSubtitleLine[], deltaMs: number): TSubtitleLine[] {
  return lines.map((line) => ({
    ...line,
    start_time: line.start_time + deltaMs,
    end_time: line.end_time + deltaMs,
  }));
}

function clampLineTiming(line: TSubtitleLine, startTime: number, endTime: number): TSubtitleLine {
  return { ...line, start_time: startTime, end_time: endTime };
}

const CHARACTER_POOL_COLORS = Object.values(TColorCustom) as TColor[];

function extractCharactersFromLines(lines: TSubtitleLine[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const line of lines) {
    for (const character of parseCharacterList(line.character)) {
      if (seen.has(character)) continue;
      seen.add(character);
      ordered.push(character);
    }
  }
  return ordered;
}

function assignCharacterColor(
  usedColors: Set<TCharacter['color']>,
  newCharacterIndex: number
): TCharacter['color'] {
  const freeColor = CHARACTER_POOL_COLORS.find((color) => !usedColors.has(color));
  if (freeColor) return freeColor;
  return CHARACTER_POOL_COLORS[newCharacterIndex % CHARACTER_POOL_COLORS.length];
}

function rebuildCharacterPool(existing: TCharacter[], lines: TSubtitleLine[]): TCharacter[] {
  const requiredCharacters = extractCharactersFromLines(lines);
  if (requiredCharacters.length === 0) return [];

  const existingByName = new Map(existing.map((entry) => [entry.name, entry]));
  const nextPool: TCharacter[] = [];
  const usedColors = new Set<TCharacter['color']>();
  let newCharacterIndex = 0;

  for (const character of requiredCharacters) {
    const existingCharacter = existingByName.get(character);
    if (existingCharacter) {
      nextPool.push(existingCharacter);
      usedColors.add(existingCharacter.color);
      continue;
    }
    const color = assignCharacterColor(usedColors, newCharacterIndex);
    nextPool.push({ name: character, color });
    usedColors.add(color);
    newCharacterIndex += 1;
  }
  return nextPool;
}

function mergeText(first: string, second: string): string {
  return `${first ?? ''} ${second ?? ''}`.trim().replace(/\s+/g, ' ');
}

function mergeCharacterLists(first?: string, second?: string): string {
  return serializeCharacterList(
    Array.from(new Set([...parseCharacterList(first), ...parseCharacterList(second)]))
  );
}

function renormalizeLineNumbers(lines: TSubtitleLine[]): TSubtitleLine[] {
  return lines.map((line, i) => ({ ...line, line_no: i + 1 }));
}

function splitLineTimingsInHalf(line: TSubtitleLine): {
  firstEnd: number;
  secondStart: number;
  valid: boolean;
} {
  const mid = line.start_time + Math.floor((line.end_time - line.start_time) / 2);
  const firstEnd = mid - 1;
  const secondStart = mid + 1;
  return {
    firstEnd,
    secondStart,
    valid: firstEnd - line.start_time >= 100 && line.end_time - secondStart >= 100,
  };
}

// ─── Initial state ────────────────────────────────────────────────────────────

const initialState: EditorSliceState = {
  activeLineIndex: null,
  focusedLineIndex: null,
  focusedColumn: null,
  renderEpoch: 0,
  textSelection: '',
  lines: [],
  past: [],
  future: [],
  totalLinesToTranslate: 0,
  characterPool: [],
  isVideoCollapsed: false,
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    // Editor UI memory
    setActiveLineIndex(state, action: PayloadAction<number | null>) {
      state.activeLineIndex = action.payload;
    },
    setFocusedLineIndex(state, action: PayloadAction<number | null>) {
      const lineIndex = action.payload;
      state.focusedLineIndex =
        !lineIndex || lineIndex < 0
          ? 0
          : lineIndex > state.lines.length
            ? state.lines.length - 1
            : lineIndex;
      state.textSelection = '';
    },
    setFocusedColumn(state, action: PayloadAction<InputColumnType | null>) {
      state.focusedColumn = action.payload;
    },
    incrementRenderEpoch(state) {
      state.renderEpoch += 1;
    },
    setTextSelection(state, action: PayloadAction<string>) {
      state.textSelection = action.payload;
    },
    resetEditorMemoryState(state) {
      state.activeLineIndex = initialState.activeLineIndex;
      state.focusedLineIndex = initialState.focusedLineIndex;
      state.focusedColumn = initialState.focusedColumn;
      // Drop any stale render cache
      state.renderEpoch += 1;
      state.textSelection = initialState.textSelection;
    },

    // Translation
    setLines(state, action: PayloadAction<TSubtitleLine[]>) {
      state.lines = action.payload;
      state.past = [];
      state.future = [];
      state.characterPool = rebuildCharacterPool(state.characterPool, action.payload);
    },
    restoreHistory(state, action: PayloadAction<'backward' | 'forward'>) {
      if (action.payload === 'backward') {
        if (state.past.length === 0) return;
        const snapshot = current(state.past[state.past.length - 1]);
        const updatedFuture = [...state.future, current(state.lines)];
        state.future =
          updatedFuture.length > 5 ? updatedFuture.slice(updatedFuture.length - 5) : updatedFuture;
        state.lines = snapshot;
        state.past = state.past.slice(0, -1);
      } else {
        if (state.future.length === 0) return;
        const snapshot = current(state.future[state.future.length - 1]);
        state.past = addToHistory([...state.past], current(state.lines));
        state.lines = snapshot;
        state.future = state.future.slice(0, -1);
      }
      state.characterPool = rebuildCharacterPool(state.characterPool, state.lines);
      // A restored snapshot can reuse line_no keys for different content than what's currently
      // cached (e.g. a past/future state from before a split/merge renumbered lines) -- bump the
      // epoch so VirtualizedList drops its cached row heights instead of reusing stale ones.
      state.renderEpoch += 1;
    },
    addTranslatedLine(state, action: PayloadAction<TSubtitleLine & { skipHistory?: boolean }>) {
      const { skipHistory, ...line } = action.payload;
      const index = state.lines.findIndex((l) => l.line_no === line.line_no);
      if (index < 0) return;
      if (!skipHistory) {
        state.past = addToHistory([...state.past], current(state.lines));
        state.future = [];
      }
      state.lines[index] = {
        ...state.lines[index],
        output: line.output,
        character: line.character,
        completed: line.completed,
      };
    },
    updateTranslationCharacter(
      state,
      action: PayloadAction<{ lineIndex: number; character: string }>
    ) {
      const line = state.lines[action.payload.lineIndex];
      if (line) {
        state.past = addToHistory([...state.past], current(state.lines));
        state.future = [];
        line.character = action.payload.character;
        state.characterPool = rebuildCharacterPool(state.characterPool, current(state.lines));
      }
    },
    updateTranslatedText(state, action: PayloadAction<{ lineIndex: number; text: string }>) {
      const line = state.lines[action.payload.lineIndex];
      if (line) {
        state.past = addToHistory([...state.past], current(state.lines));
        state.future = [];
        line.output = action.payload.text;
      }
    },
    updateSourceText(state, action: PayloadAction<{ lineIndex: number; text: string }>) {
      const line = state.lines[action.payload.lineIndex];
      if (line) {
        state.past = addToHistory([...state.past], current(state.lines));
        state.future = [];
        line.input = action.payload.text;
      }
    },
    setLineCompleted(
      state,
      action: PayloadAction<{ lineIndex: number; completed: boolean; skipHistory?: boolean }>
    ) {
      const { lineIndex, completed, skipHistory } = action.payload;
      const line = state.lines[lineIndex];
      if (line) {
        if (!skipHistory) {
          state.past = addToHistory([...state.past], current(state.lines));
          state.future = [];
        }
        line.completed = completed;
      }
    },
    mergeLines(state, action: PayloadAction<{ lineIndex: number; direction: 'up' | 'down' }>) {
      const { lineIndex, direction } = action.payload;
      const mergeWithPrevious = direction === 'up';
      const partnerIndex = mergeWithPrevious ? lineIndex - 1 : lineIndex + 1;
      if (partnerIndex < 0 || partnerIndex >= state.lines.length) return;

      const targetIndex = mergeWithPrevious ? partnerIndex : lineIndex;
      const removedIndex = mergeWithPrevious ? lineIndex : partnerIndex;

      const mergedLine: TSubtitleLine = {
        ...state.lines[targetIndex],
        start_time: Math.min(
          state.lines[lineIndex].start_time,
          state.lines[partnerIndex].start_time
        ),
        end_time: Math.max(state.lines[lineIndex].end_time, state.lines[partnerIndex].end_time),
        input: mergeText(state.lines[targetIndex].input, state.lines[removedIndex].input),
        output: mergeText(state.lines[targetIndex].output, state.lines[removedIndex].output),
        character: mergeCharacterLists(
          state.lines[targetIndex].character,
          state.lines[removedIndex].character
        ),
        completed: Boolean(state.lines[lineIndex].completed || state.lines[partnerIndex].completed),
      };

      const newLines = [...state.lines];
      newLines[targetIndex] = mergedLine;
      newLines.splice(removedIndex, 1);

      state.past = addToHistory([...state.past], current(state.lines));
      state.future = [];
      state.lines = renormalizeLineNumbers(newLines);
      state.totalLinesToTranslate = state.lines.length;
    },
    shiftAllLinesEarlier(state, action: PayloadAction<number>) {
      const requestedAmount = Math.max(0, action.payload);
      if (requestedAmount === 0 || state.lines.length === 0) return;
      const earliestStartTime = Math.min(...state.lines.map((line) => line.start_time));
      const actualShift = Math.min(requestedAmount, Math.max(0, earliestStartTime));
      state.past = addToHistory([...state.past], current(state.lines));
      state.future = [];
      state.lines = shiftLines(state.lines, -actualShift);
    },
    shiftAllLinesLater(state, action: PayloadAction<number>) {
      const requestedAmount = Math.max(0, action.payload);
      if (requestedAmount === 0) return;
      state.past = addToHistory([...state.past], current(state.lines));
      state.future = [];
      state.lines = shiftLines(state.lines, requestedAmount);
    },
    removeLine(state, action: PayloadAction<number>) {
      state.past = addToHistory([...state.past], current(state.lines));
      state.future = [];
      const newLines = [...state.lines];
      newLines.splice(action.payload, 1);
      state.lines = renormalizeLineNumbers(newLines);
      state.totalLinesToTranslate = state.lines.length;
      state.renderEpoch += 1;
    },
    setTotalLinesToTranslate(state, action: PayloadAction<number>) {
      state.totalLinesToTranslate = action.payload;
    },
    updateLineTiming(
      state,
      action: PayloadAction<{ lineIndex: number; startTime: number; endTime: number }>
    ) {
      const line = state.lines[action.payload.lineIndex];
      if (line) {
        state.past = addToHistory([...state.past], current(state.lines));
        state.future = [];
        Object.assign(
          line,
          clampLineTiming(line, action.payload.startTime, action.payload.endTime)
        );
      }
    },
    clearFileData(state) {
      state.lines = initialState.lines;
      state.past = [];
      state.future = [];
      state.totalLinesToTranslate = initialState.totalLinesToTranslate;
      state.characterPool = initialState.characterPool;
      state.isVideoCollapsed = initialState.isVideoCollapsed;
    },
    insertLine(state, action: PayloadAction<{ lineIndex: number; position: 'before' | 'after' }>) {
      const { lineIndex, position } = action.payload;
      const line = state.lines[lineIndex];
      if (!line) return;
      const { firstEnd, secondStart, valid } = splitLineTimingsInHalf(line);
      if (!valid) return;
      const newLines = [...state.lines];
      if (position === 'after') {
        const newLine: TSubtitleLine = {
          line_no: 0,
          start_time: secondStart,
          end_time: line.end_time,
          input: '',
          output: '',
        };
        newLines[lineIndex] = { ...line, end_time: firstEnd };
        newLines.splice(lineIndex + 1, 0, newLine);
      } else {
        const newLine: TSubtitleLine = {
          line_no: 0,
          start_time: line.start_time,
          end_time: firstEnd,
          input: '',
          output: '',
        };
        newLines[lineIndex] = { ...line, start_time: secondStart };
        newLines.splice(lineIndex, 0, newLine);
      }
      state.past = addToHistory([...state.past], current(state.lines));
      state.future = [];
      state.lines = renormalizeLineNumbers(newLines);
      state.totalLinesToTranslate = state.lines.length;
      state.renderEpoch += 1;
    },
    splitLine(
      state,
      action: PayloadAction<{
        lineIndex: number;
        cursorOffset: number | null;
        column: 'source' | 'output';
      }>
    ) {
      const { lineIndex, cursorOffset, column } = action.payload;
      const line = state.lines[lineIndex];
      if (!line) return;

      const refLength =
        column === 'source' ? (line.input?.length ?? 0) : (line.output?.length ?? 0);

      let newLines: TSubtitleLine[] | null = null;

      if (cursorOffset === 0) {
        // Cursor at very beginning → insert empty line before, current line takes second half
        const { firstEnd, secondStart, valid } = splitLineTimingsInHalf(line);
        if (valid) {
          newLines = [...state.lines];
          newLines[lineIndex] = { ...line, start_time: secondStart };
          newLines.splice(lineIndex, 0, {
            line_no: 0,
            start_time: line.start_time,
            end_time: firstEnd,
            input: '',
            output: '',
          });
        }
      } else if (cursorOffset !== null && refLength > 0 && cursorOffset >= refLength) {
        // Cursor at very end → insert empty line after, current line takes first half
        const { firstEnd, secondStart, valid } = splitLineTimingsInHalf(line);
        if (valid) {
          newLines = [...state.lines];
          newLines[lineIndex] = { ...line, end_time: firstEnd };
          newLines.splice(lineIndex + 1, 0, {
            line_no: 0,
            start_time: secondStart,
            end_time: line.end_time,
            input: '',
            output: '',
          });
        }
      } else {
        // Normal split at cursor position
        const ratio =
          cursorOffset !== null && refLength > 0
            ? Math.max(0, Math.min(1, cursorOffset / refLength))
            : 0.5;
        const span = line.end_time - line.start_time;
        const splitPoint = line.start_time + Math.round(span * ratio);
        const firstEnd = splitPoint - 1;
        const secondStart = splitPoint + 1;
        if (firstEnd - line.start_time >= 100 && line.end_time - secondStart >= 100) {
          const outputLength = line.output?.length ?? 0;
          const inputLength = line.input?.length ?? 0;
          const outputSplitAt =
            column === 'source'
              ? Math.round(outputLength * ratio)
              : (cursorOffset ?? Math.round(outputLength / 2));
          const inputSplitAt =
            column === 'source'
              ? (cursorOffset ?? Math.round(inputLength / 2))
              : Math.round(inputLength * ratio);
          newLines = [...state.lines];
          newLines[lineIndex] = {
            ...line,
            end_time: firstEnd,
            output: (line.output ?? '').substring(0, outputSplitAt).trimEnd(),
            input: (line.input ?? '').substring(0, inputSplitAt).trimEnd(),
          };
          newLines.splice(lineIndex + 1, 0, {
            ...line,
            start_time: secondStart,
            output: (line.output ?? '').substring(outputSplitAt).trimStart(),
            input: (line.input ?? '').substring(inputSplitAt).trimStart(),
          });
        }
      }

      if (newLines === null) return;

      state.past = addToHistory([...state.past], current(state.lines));
      state.future = [];
      state.lines = renormalizeLineNumbers(newLines);
      state.totalLinesToTranslate = state.lines.length;
      state.renderEpoch += 1;
    },
    autoMergeAdjacentLines(state, action: PayloadAction<{ threshold: number }>) {
      const { threshold } = action.payload;
      const sorted = [...state.lines].sort((a, b) => a.line_no - b.line_no);

      const getCharKey = (line: TSubtitleLine): string | null => {
        const chars = parseCharacterList(line.character);
        return chars.length ? [...chars].sort().join(',') : null;
      };

      const newLines: TSubtitleLine[] = [];
      let i = 0;
      let hasMerge = false;

      while (i < sorted.length) {
        const line = sorted[i];
        const charKey = getCharKey(line);

        if (!charKey) {
          newLines.push(line);
          i++;
          continue;
        }

        const group: TSubtitleLine[] = [line];
        while (i + group.length < sorted.length) {
          const next = sorted[i + group.length];
          const prev = group[group.length - 1];
          const nextCharKey = getCharKey(next);
          const gap = next.start_time - prev.end_time;
          if (nextCharKey === charKey && gap <= threshold) {
            group.push(next);
          } else {
            break;
          }
        }

        if (group.length > 1) {
          hasMerge = true;
          newLines.push({
            ...group[0],
            start_time: Math.min(...group.map((l) => l.start_time)),
            end_time: Math.max(...group.map((l) => l.end_time)),
            input: group
              .map((l) => l.input ?? '')
              .join(' ')
              .trim()
              .replace(/\s+/g, ' '),
            output: group
              .map((l) => l.output ?? '')
              .join(' ')
              .trim()
              .replace(/\s+/g, ' '),
            completed: group.some((l) => Boolean(l.completed)),
          });
        } else {
          newLines.push(group[0]);
        }

        i += group.length;
      }

      if (!hasMerge) return;

      state.past = addToHistory([...state.past], current(state.lines));
      state.future = [];
      state.lines = newLines.map((line, index) => ({ ...line, line_no: index + 1 }));
      state.totalLinesToTranslate = state.lines.length;
      state.renderEpoch += 1;
    },
    cleanupLines(
      state,
      action: PayloadAction<{ targetColumn: 'source' | 'output'; options: TEntryCleanupOptions }>
    ) {
      const { targetColumn, options } = action.payload;
      state.past = addToHistory([...state.past], current(state.lines));
      state.future = [];

      const getText = (line: TSubtitleLine): string =>
        (targetColumn === 'source' ? line.input : line.output) ?? '';
      const setText = (line: TSubtitleLine, text: string): TSubtitleLine =>
        targetColumn === 'source' ? { ...line, input: text } : { ...line, output: text };

      const cleaned = cleanupEntries(current(state.lines), options, getText, setText);
      // Cleanup's postcheck can drop whole entries (e.g. a line whose cleaned column had no
      // visible word content left) -- only in that case does VirtualizedList need its epoch
      // bumped, same criterion as every other line-count/identity-changing reducer here.
      const countChanged = cleaned.length !== state.lines.length;

      state.lines = renormalizeLineNumbers(cleaned);
      state.totalLinesToTranslate = state.lines.length;
      if (countChanged) state.renderEpoch += 1;
    },
    copyAllSourceToOutput(state, action: PayloadAction<{ overrideExisting: boolean }>) {
      const { overrideExisting } = action.payload;
      state.past = addToHistory([...state.past], current(state.lines));
      state.future = [];
      state.lines.forEach((line) => {
        if (overrideExisting || !line.output?.trim()) {
          line.output = line.input ?? '';
        }
      });
    },
    completeAllTranslatedLines(state) {
      state.past = addToHistory([...state.past], current(state.lines));
      state.future = [];
      state.lines.forEach((line) => {
        if (line.output?.trim()) line.completed = true;
      });
    },

    // Character pool
    setCharacterPool(state, action: PayloadAction<TCharacter[]>) {
      state.characterPool = action.payload;
    },

    // Video UI (persisted)
    setVideoCollapsed(state, action: PayloadAction<boolean>) {
      state.isVideoCollapsed = action.payload;
    },
  },
  selectors: {
    // Editor UI memory
    selectActiveLineIndex: (state) => state.activeLineIndex,
    selectFocusedLineIndex: (state) => state.focusedLineIndex,
    selectFocusedColumn: (state) => state.focusedColumn,
    selectRenderEpoch: (state) => state.renderEpoch,
    selectTextSelection: (state) => state.textSelection,
    // Translation
    selectLines: (state) => state.lines,
    selectCanUndo: (state) => state.past.length > 0,
    selectCanRedo: (state) => state.future.length > 0,
    selectTranslationProgress: (state) => computeTranslationProgress(state.lines),
    // Character pool
    selectCharacterPool: (state) => state.characterPool,
    // Video UI
    selectIsVideoCollapsed: (state) => state.isVideoCollapsed,
  },
});

export const {
  // Editor UI memory
  setActiveLineIndex,
  setFocusedLineIndex,
  setFocusedColumn,
  incrementRenderEpoch,
  setTextSelection,
  resetEditorMemoryState,
  // Translation
  setLines,
  restoreHistory,
  addTranslatedLine,
  updateTranslationCharacter,
  updateTranslatedText,
  updateSourceText,
  setLineCompleted,
  mergeLines,
  insertLine,
  splitLine,
  shiftAllLinesEarlier,
  shiftAllLinesLater,
  removeLine,
  setTotalLinesToTranslate,
  clearFileData,
  updateLineTiming,
  autoMergeAdjacentLines,
  cleanupLines,
  copyAllSourceToOutput,
  completeAllTranslatedLines,
  // Character pool
  setCharacterPool,
  // Video UI
  setVideoCollapsed,
} = editorSlice.actions;

export const {
  selectActiveLineIndex,
  selectFocusedLineIndex,
  selectFocusedColumn,
  selectRenderEpoch,
  selectTextSelection,
  selectLines,
  selectCanUndo,
  selectCanRedo,
  selectTranslationProgress,
  selectCharacterPool,
  selectIsVideoCollapsed,
} = editorSlice.selectors;

export default editorSlice.reducer;
