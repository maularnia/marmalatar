import { InputColumnType, useEditorRefs } from '@providers/EditorRefsProvider';
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
import { useMessageHelmet } from '@src/providers/MessageHelmetProvider';
import { useAutoMergeLinesConfirmation } from '@src/segments/dialogs/autoMergeLines/useAutoMergeLinesConfirmation';
import { useCleanupConfirmation } from '@src/segments/dialogs/cleanup/useCleanupConfirmation';
import { TCleanupFormValues } from '@src/segments/dialogs/cleanup/CleanupDialog';
import { useCopyAllSourceToOutputConfirmation } from '@src/segments/dialogs/copyAllSourceToOutput/useCopyAllSourceToOutputConfirmation';
import { useCopyOverrideConfirmation } from '@src/segments/dialogs/copyOverride/useCopyOverrideConfirmation';
import { useDeleteLineConfirmation } from '@src/segments/dialogs/delete/useDeleteLineConfirmation';
import { useMergeConfirmation } from '@src/segments/dialogs/lineMerge/useMergeConfirmation';
import { useSplitConfirmation } from '@src/segments/dialogs/split/useSplitConfirmation';
import {
  selectAskBeforeDelete,
  selectAskBeforeMerge,
  selectAskBeforeSplit,
  selectAutoMarkLinesCompleted,
  selectTimeAdjustmentStep,
} from '@src/store/slices/app';
import {
  autoMergeAdjacentLines,
  cleanupLines,
  completeAllTranslatedLines,
  copyAllSourceToOutput,
  insertLine,
  mergeLines,
  removeLine,
  restoreHistory,
  selectFocusedColumn,
  selectFocusedLineIndex,
  selectLines,
  setFocusedColumn,
  setFocusedLineIndex,
  setLineCompleted,
  splitLine,
  updateLineTiming,
  updateTranslatedText,
} from '@src/store/slices/editor';
import { selectIsEditMode, setEditorMode } from '@src/store/slices/project';
import { selectFrozenLineNumbers } from '@src/store/slices/prompt';
import { focusContentEditableToEnd, selectAllContentEditable } from '@src/utils/contentEditable';
import { providerNoop } from '@src/utils/noop';
import { useAppDispatch } from '@store/hooks';
import { fromCurrentStore } from '@store/store';
import { selectCurrentBulkJob } from '@store/slices/aiTranslation';
import { createContext, PropsWithChildren, useCallback, useContext, useMemo } from 'react';

type EditorActionsContextType = {
  handleChangeFocusedColumn: (
    lineIndex: number,
    type: InputColumnType,
    selectAll?: boolean
  ) => boolean;
  /** Refocuses whatever was last focused, falling back to the first line's first available input
   * (output, then source) if nothing was focused yet or the editor has no lines. Returns whether
   * it actually found something to focus. */
  handleFocusEditor: () => boolean;
  handleChangeFocusedLine: (lineIndex: number) => void;
  /** Syncs `focusedLineIndex`/`focusedColumn` to a line/column that was focused via some element
   * outside `lineInputRefs` (e.g. a zone's generic fallback ref) -- the DOM-focusing itself stays
   * with the caller, since only it knows which element that is. */
  handleSetFocusedLineAndColumn: (lineIndex: number, column: InputColumnType) => void;
  handleCopySourceToOutput: (lineIndex: number) => void;
  handleInsertLine: (lineIndex: number, position: 'before' | 'after') => void;
  handleSplitLine: (lineIndex: number, cursorOffset: number | null) => void;
  handleMergeLines: (lineIndex: number, direction: 'up' | 'down') => void;
  handleRemoveLine: (lineIndex: number) => void;
  handleToggleCompleted: (lineIndex: number) => void;
  handleAdjustStartTime: (lineIndex: number, direction: 'earlier' | 'later') => void;
  handleAdjustEndTime: (lineIndex: number, direction: 'earlier' | 'later') => void;
  handleAdjustEntryTime: (lineIndex: number, direction: 'earlier' | 'later') => void;
  handleUndoRedo: (direction: 'backward' | 'forward') => void;
  handleAutoMerge: () => void;
  handleCleanup: () => void;
  handleCopyAllSourceToOutput: () => void;
  handleCompleteAllTranslatedLines: () => void;
  handleToggleEditMode: () => void;
};

const noop = providerNoop('EditorActionsContext');

const EditorActionsContext = createContext<EditorActionsContextType>({
  handleChangeFocusedColumn: noop,
  handleFocusEditor: noop,
  handleChangeFocusedLine: noop,
  handleSetFocusedLineAndColumn: noop,
  handleCopySourceToOutput: noop,
  handleInsertLine: noop,
  handleSplitLine: noop,
  handleMergeLines: noop,
  handleRemoveLine: noop,
  handleToggleCompleted: noop,
  handleAdjustStartTime: noop,
  handleAdjustEndTime: noop,
  handleAdjustEntryTime: noop,
  handleUndoRedo: noop,
  handleAutoMerge: noop,
  handleCleanup: noop,
  handleCopyAllSourceToOutput: noop,
  handleCompleteAllTranslatedLines: noop,
  handleToggleEditMode: noop,
});

export function useEditorActions(): EditorActionsContextType {
  return useContext(EditorActionsContext);
}

export default function EditorActionsProvider({ children }: PropsWithChildren) {
  const dispatch = useAppDispatch();
  const { lineInputRefs, splitCursorRef } = useEditorRefs();

  const { pushMessage } = useMessageHelmet();
  const { confirmMerge } = useMergeConfirmation();
  const { confirmSplit } = useSplitConfirmation();
  const { confirmCopyOverride } = useCopyOverrideConfirmation();
  const { confirmDeleteLine } = useDeleteLineConfirmation();
  const { confirmAutoMerge } = useAutoMergeLinesConfirmation();
  const { confirmCleanup } = useCleanupConfirmation();
  const { confirmCopyAllSourceToOutput } = useCopyAllSourceToOutputConfirmation();

  const focusLine = useCallback(
    (lineIndex: number | null) => {
      dispatch(setFocusedLineIndex(lineIndex));
      splitCursorRef.current = null;
    },
    [dispatch, splitCursorRef]
  );

  const handleChangeFocusedColumn = useCallback(
    (lineIndex: number, type: InputColumnType, selectAll = false): boolean => {
      const el = lineInputRefs.current.get(lineIndex)?.[type];
      if (!el) return false;
      if (type === 'output' || type === 'source') {
        if (selectAll) selectAllContentEditable(el);
        else focusContentEditableToEnd(el);
      } else {
        el.focus();
      }
      el.scrollIntoView({ block: 'nearest' });
      focusLine(lineIndex);
      dispatch(setFocusedColumn(type));
      return true;
    },
    [lineInputRefs, focusLine, dispatch]
  );

  // Syncs focusedLineIndex/focusedColumn to a line/column that was focused via some element
  // outside lineInputRefs (e.g. a zone's generic fallback ref) -- the DOM-focusing itself stays
  // with the caller, since only it knows which element that is.
  const handleSetFocusedLineAndColumn = useCallback(
    (lineIndex: number, column: InputColumnType) => {
      focusLine(lineIndex);
      dispatch(setFocusedColumn(column));
    },
    [focusLine, dispatch]
  );

  // Shared by "an overlay just closed" and "a project just opened": prefer wherever the user last
  // was, and otherwise land on the first line's first available input -- output normally, source
  // when edit mode hides the output column.
  const handleFocusEditor = useCallback((): boolean => {
    const focusedLineIndex = fromCurrentStore(selectFocusedLineIndex);
    const focusedColumn = fromCurrentStore(selectFocusedColumn);
    if (
      focusedLineIndex !== null &&
      handleChangeFocusedColumn(focusedLineIndex, focusedColumn ?? 'output')
    ) {
      return true;
    }
    if (fromCurrentStore(selectLines).length === 0) return false;
    return handleChangeFocusedColumn(0, 'output') || handleChangeFocusedColumn(0, 'source');
  }, [handleChangeFocusedColumn]);

  // Several actions (split/merge/insert/remove line, undo/redo) dispatch a change that bumps the
  // render epoch, which remounts every visible row (see VirtualizedList's epoch-keyed Slots) --
  // that destroys whatever was focused, so the refocus has to happen on the next frame, after the
  // remount has actually happened. Centralized here so every such action recovers the same way.
  const refocusLineAfterRender = useCallback(
    (lineIndex: number, column: InputColumnType) => {
      requestAnimationFrame(() => {
        handleChangeFocusedColumn(lineIndex, column, false);
      });
    },
    [handleChangeFocusedColumn]
  );

  const handleChangeFocusedLine = useCallback(
    (lineIndex: number) => {
      const line = fromCurrentStore(selectLines)[lineIndex] ?? null;
      if (!line) return;
      focusLine(lineIndex);
    },
    [focusLine]
  );

  const handleCopySourceToOutput = useCallback(
    async (lineIndex: number) => {
      if (fromCurrentStore(selectIsEditMode)) return;
      const line = fromCurrentStore(selectLines)[lineIndex];
      if (!line) return;
      const autoMarkLinesCompleted = fromCurrentStore(selectAutoMarkLinesCompleted);
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
        dispatch(
          setLineCompleted({ lineIndex, completed: Boolean(line.input), skipHistory: true })
        );
      handleChangeFocusedColumn(lineIndex, 'output', true);
      emitTextCopiedMessage(pushMessage);
    },
    [confirmCopyOverride, dispatch, handleChangeFocusedColumn, pushMessage]
  );

  const handleSplitLine = useCallback(
    async (lineIndex: number, cursorOffset: number | null) => {
      const translationLines = fromCurrentStore(selectLines);
      const frozenLineNumbers = fromCurrentStore(selectFrozenLineNumbers);
      if (frozenLineNumbers.includes(translationLines[lineIndex]?.line_no)) return;
      if (fromCurrentStore(selectCurrentBulkJob)?.running) return;
      const focusedColumn = fromCurrentStore(selectFocusedColumn);
      if (!focusedColumn || (focusedColumn !== 'source' && focusedColumn !== 'output')) return;
      if (fromCurrentStore(selectAskBeforeSplit) && !(await confirmSplit())) return;
      dispatch(splitLine({ lineIndex, cursorOffset, column: focusedColumn }));
      refocusLineAfterRender(lineIndex, focusedColumn);
      emitLineSplitMessage(pushMessage);
    },
    [confirmSplit, dispatch, refocusLineAfterRender, pushMessage]
  );

  const handleMergeLines = useCallback(
    async (lineIndex: number, direction: 'up' | 'down') => {
      const translationLines = fromCurrentStore(selectLines);
      const partnerIndex = direction === 'up' ? lineIndex - 1 : lineIndex + 1;
      if (partnerIndex < 0 || partnerIndex >= translationLines.length) return;
      const line = translationLines[lineIndex];
      const partnerLine = translationLines[partnerIndex];
      const frozenSet = new Set(fromCurrentStore(selectFrozenLineNumbers));
      if (frozenSet.has(line.line_no) || frozenSet.has(partnerLine.line_no)) return;
      if (fromCurrentStore(selectCurrentBulkJob)?.running) return;
      if (fromCurrentStore(selectAskBeforeMerge)) {
        let confirmed: boolean;
        try {
          confirmed = await confirmMerge({
            mergeMasterLineNo: line.line_no,
            targetLineNo: partnerLine.line_no,
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
      dispatch(mergeLines({ lineIndex, direction }));
      const resultingIndex = direction === 'up' ? partnerIndex : lineIndex;
      refocusLineAfterRender(resultingIndex, 'output');
      emitLinesMergedMessage(pushMessage);
    },
    [confirmMerge, dispatch, refocusLineAfterRender, pushMessage]
  );

  const handleToggleCompleted = useCallback(
    (lineIndex: number) => {
      const translationLines = fromCurrentStore(selectLines);
      const focusedColumn = fromCurrentStore(selectFocusedColumn);
      const completed = !translationLines[lineIndex].completed;
      dispatch(setLineCompleted({ lineIndex, completed }));
      if (completed) {
        // Marking complete advances to the next line.
        if (translationLines[lineIndex + 1])
          handleChangeFocusedColumn(lineIndex + 1, 'output', false);
      } else {
        // Un-completing is a correction -- clicking the toggle itself moved DOM focus away from
        // the line's input, so restore it to whatever column was last focused rather than leaving
        // focus stranded on the toggle button.
        handleChangeFocusedColumn(lineIndex, focusedColumn ?? 'output', false);
      }
    },
    [dispatch, handleChangeFocusedColumn]
  );

  const handleRemoveLine = useCallback(
    async (lineIndex: number) => {
      if (fromCurrentStore(selectCurrentBulkJob)?.running) return;
      if (fromCurrentStore(selectAskBeforeDelete)) {
        let confirmed: boolean;
        try {
          confirmed = await confirmDeleteLine({
            lineNo: fromCurrentStore(selectLines)[lineIndex]?.line_no ?? lineIndex + 1,
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
      const translationLines = fromCurrentStore(selectLines);
      const hasNext = lineIndex + 1 < translationLines.length;
      const hasPrev = lineIndex > 0;
      dispatch(removeLine(lineIndex));
      const targetIndex = hasNext ? lineIndex : hasPrev ? lineIndex - 1 : null;
      if (targetIndex != null) {
        refocusLineAfterRender(targetIndex, 'output');
      } else {
        focusLine(null);
      }
      emitLineDeletedMessage(pushMessage);
    },
    [confirmDeleteLine, dispatch, refocusLineAfterRender, focusLine, pushMessage]
  );

  const handleAdjustStartTime = useCallback(
    (lineIndex: number, direction: 'earlier' | 'later') => {
      const translationLines = fromCurrentStore(selectLines);
      const timeAdjustmentStep = fromCurrentStore(selectTimeAdjustmentStep);
      const line = translationLines[lineIndex];
      if (!line) return;
      if (direction === 'earlier') {
        const prev = lineIndex > 0 ? translationLines[lineIndex - 1] : null;
        const next = line.start_time - timeAdjustmentStep;
        const min = prev ? prev.end_time : Number.NEGATIVE_INFINITY;
        if (next < min || next >= line.end_time) {
          emitEntryTimeShiftBlockedMessage(pushMessage);
          return;
        }
        dispatch(
          updateLineTiming({
            lineIndex,
            startTime: next,
            endTime: line.end_time,
          })
        );
      } else {
        const nextL = translationLines[lineIndex + 1] ?? null;
        const next = line.start_time + timeAdjustmentStep;
        const max = nextL ? nextL.start_time : Number.POSITIVE_INFINITY;
        if (next >= line.end_time || next > max) {
          emitEntryTimeShiftBlockedMessage(pushMessage);
          return;
        }
        dispatch(
          updateLineTiming({
            lineIndex,
            startTime: next,
            endTime: line.end_time,
          })
        );
      }
    },
    [dispatch, pushMessage]
  );

  const handleAdjustEndTime = useCallback(
    (lineIndex: number, direction: 'earlier' | 'later') => {
      const translationLines = fromCurrentStore(selectLines);
      const timeAdjustmentStep = fromCurrentStore(selectTimeAdjustmentStep);
      const line = translationLines[lineIndex];
      if (!line) return;
      if (direction === 'earlier') {
        const prev = lineIndex > 0 ? translationLines[lineIndex - 1] : null;
        const next = line.end_time - timeAdjustmentStep;
        const min = prev ? prev.end_time : Number.NEGATIVE_INFINITY;
        if (next <= line.start_time || next < min) {
          emitEntryTimeShiftBlockedMessage(pushMessage);
          return;
        }
        dispatch(
          updateLineTiming({
            lineIndex,
            startTime: line.start_time,
            endTime: next,
          })
        );
      } else {
        const nextL = translationLines[lineIndex + 1] ?? null;
        const next = line.end_time + timeAdjustmentStep;
        const max = nextL ? nextL.start_time : Number.POSITIVE_INFINITY;
        if (next <= line.start_time || next > max) {
          emitEntryTimeShiftBlockedMessage(pushMessage);
          return;
        }
        dispatch(
          updateLineTiming({
            lineIndex,
            startTime: line.start_time,
            endTime: next,
          })
        );
      }
    },
    [dispatch, pushMessage]
  );

  const handleAdjustEntryTime = useCallback(
    (lineIndex: number, direction: 'earlier' | 'later') => {
      const translationLines = fromCurrentStore(selectLines);
      const timeAdjustmentStep = fromCurrentStore(selectTimeAdjustmentStep);
      const line = translationLines[lineIndex];
      if (!line) return;
      if (direction === 'earlier') {
        const prev = lineIndex > 0 ? translationLines[lineIndex - 1] : null;
        const nextStart = line.start_time - timeAdjustmentStep;
        const nextEnd = line.end_time - timeAdjustmentStep;
        const min = prev ? prev.end_time : 0;
        if (nextStart < min) {
          emitEntryTimeShiftBlockedMessage(pushMessage);
          return;
        }
        dispatch(updateLineTiming({ lineIndex, startTime: nextStart, endTime: nextEnd }));
      } else {
        const nextL =
          lineIndex + 1 < translationLines.length ? translationLines[lineIndex + 1] : null;
        const nextStart = line.start_time + timeAdjustmentStep;
        const nextEnd = line.end_time + timeAdjustmentStep;
        const max = nextL ? nextL.start_time : Number.POSITIVE_INFINITY;
        if (nextEnd > max) {
          emitEntryTimeShiftBlockedMessage(pushMessage);
          return;
        }
        dispatch(updateLineTiming({ lineIndex, startTime: nextStart, endTime: nextEnd }));
      }
    },
    [dispatch, pushMessage]
  );

  const handleUndoRedo = useCallback(
    (direction: 'backward' | 'forward') => {
      if (fromCurrentStore(selectCurrentBulkJob)?.running) return;
      const focusedLineIndex = fromCurrentStore(selectFocusedLineIndex);
      const focusedColumn = fromCurrentStore(selectFocusedColumn);
      dispatch(restoreHistory(direction));
      if (focusedLineIndex !== null && focusedColumn) {
        refocusLineAfterRender(focusedLineIndex, focusedColumn);
      }
    },
    [dispatch, refocusLineAfterRender]
  );

  const handleAutoMerge = useCallback(async () => {
    if (fromCurrentStore(selectCurrentBulkJob)?.running) return;
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
  }, [confirmAutoMerge, dispatch, pushMessage]);

  const handleCleanup = useCallback(async () => {
    if (fromCurrentStore(selectCurrentBulkJob)?.running) return;
    const isEditMode = fromCurrentStore(selectIsEditMode);
    let values: TCleanupFormValues | null;
    try {
      values = await confirmCleanup(isEditMode);
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
    // Cleanup can drop lines/renumber, which may bump renderEpoch and remount visible rows --
    // wait a frame before refocusing, same as refocusLineAfterRender does for other structural
    // changes.
    requestAnimationFrame(() => {
      handleFocusEditor();
    });
  }, [confirmCleanup, dispatch, pushMessage, handleFocusEditor]);

  const handleCopyAllSourceToOutput = useCallback(async () => {
    if (fromCurrentStore(selectCurrentBulkJob)?.running || fromCurrentStore(selectIsEditMode))
      return;
    const hasExistingOutput = fromCurrentStore(selectLines).some((line) => line.output?.trim());
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
    dispatch(copyAllSourceToOutput({ overrideExisting }));
  }, [confirmCopyAllSourceToOutput, dispatch, pushMessage]);

  const handleCompleteAllTranslatedLines = useCallback(() => {
    if (fromCurrentStore(selectCurrentBulkJob)?.running) return;
    dispatch(completeAllTranslatedLines());
  }, [dispatch]);

  const handleToggleEditMode = useCallback(() => {
    const isEditMode = fromCurrentStore(selectIsEditMode);
    const focusedLineIndex = fromCurrentStore(selectFocusedLineIndex);
    const nextMode = isEditMode ? 'translate' : 'edit';
    dispatch(setEditorMode(nextMode));
    if (focusedLineIndex !== null) {
      refocusLineAfterRender(focusedLineIndex, nextMode === 'edit' ? 'source' : 'output');
    }
  }, [dispatch, refocusLineAfterRender]);

  const handleInsertLine = useCallback(
    (lineIndex: number, position: 'before' | 'after') => {
      const line = fromCurrentStore(selectLines)[lineIndex];
      if (!line) return;
      const duration = line.end_time - line.start_time;
      const mid = line.start_time + Math.floor(duration / 2);
      if (mid - 1 - line.start_time < 100 || line.end_time - (mid + 1) < 100) {
        emitLineTooShortToSplitMessage(pushMessage);
        return;
      }
      const column = fromCurrentStore(selectFocusedColumn) ?? 'output';
      dispatch(insertLine({ lineIndex, position }));
      const targetIndex = position === 'before' ? lineIndex : lineIndex + 1;
      refocusLineAfterRender(targetIndex, column);
    },
    [dispatch, refocusLineAfterRender, pushMessage]
  );

  const value = useMemo<EditorActionsContextType>(
    () => ({
      handleChangeFocusedColumn,
      handleFocusEditor,
      handleChangeFocusedLine,
      handleSetFocusedLineAndColumn,
      handleCopySourceToOutput,
      handleInsertLine,
      handleSplitLine,
      handleMergeLines,
      handleRemoveLine,
      handleToggleCompleted,
      handleAdjustStartTime,
      handleAdjustEndTime,
      handleAdjustEntryTime,
      handleUndoRedo,
      handleAutoMerge,
      handleCleanup,
      handleCopyAllSourceToOutput,
      handleCompleteAllTranslatedLines,
      handleToggleEditMode,
    }),
    [
      handleChangeFocusedColumn,
      handleFocusEditor,
      handleChangeFocusedLine,
      handleSetFocusedLineAndColumn,
      handleCopySourceToOutput,
      handleInsertLine,
      handleSplitLine,
      handleMergeLines,
      handleRemoveLine,
      handleToggleCompleted,
      handleAdjustStartTime,
      handleAdjustEndTime,
      handleAdjustEntryTime,
      handleUndoRedo,
      handleAutoMerge,
      handleCleanup,
      handleCopyAllSourceToOutput,
      handleCompleteAllTranslatedLines,
      handleToggleEditMode,
    ]
  );

  return <EditorActionsContext.Provider value={value}>{children}</EditorActionsContext.Provider>;
}
