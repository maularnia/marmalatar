import {
  ShortcutScope,
  ShortcutSettings,
  ShortcutStatus,
  ShortcutType,
  useShortcut,
} from 'react-keyhub';
import KeystrokeZone, {
  useKeystrokeZone,
} from '@src/layout/components/KeystrokeZone/KeystrokeZone';
import { useEditorRefs, InputColumnType } from '@providers/EditorRefsProvider';
import { useEditorActions } from '@providers/EditorActionsProvider';
import { useVideo } from '@providers/VideoProvider';
import { useEditorAIActions } from '@providers/EditorAIActionsProvider';
import { useAppDispatch } from '@store/hooks';
import { fromCurrentStore } from '@store/store';
import {
  selectFocusedColumn,
  selectFocusedLineIndex,
  selectLines,
  shiftAllLinesEarlier,
  shiftAllLinesLater,
} from '@src/store/slices/editor';
import { selectTimeAdjustmentStep } from '@src/store/slices/app';
import { selectTranslationIsBusy } from '@store/slices/aiTranslation';
import { focusContentEditableToEnd } from '@src/utils/contentEditable';
import { createContext, PropsWithChildren, useEffect, useReducer } from 'react';

const myShortcuts = {
  copySourceToOutput: {
    keyCombo: 'alt+c',
    name: 'Copy source text to translation',
    description: 'Copy whatever is in source column to output column',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  aiTranslation: {
    keyCombo: 'alt+t',
    name: 'Translate source with AU',
    description: 'Use LLM to translate the line',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  adjustStartTimeLeft: {
    keyCombo: 'alt+q',
    name: 'Start time <-',
    description: 'Adjust line start to left',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  adjustStartTimeRight: {
    keyCombo: 'alt+e',
    name: 'Start time ->',
    description: 'Adjust start time to right',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  adjustEndTimeLeft: {
    keyCombo: 'alt+a',
    name: 'Start time<-',
    description: 'Adjust end time to left',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  adjustEndTimeRight: {
    keyCombo: 'alt+d',
    name: 'Start time<-',
    description: 'Adjust end time to right',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  adjustEntryTimeLeft: {
    keyCombo: 'ctrl+alt+a',
    name: 'Entry time <-',
    description: 'Shift the whole focused entry earlier',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  adjustEntryTimeRight: {
    keyCombo: 'ctrl+alt+d',
    name: 'Entry time ->',
    description: 'Shift the whole focused entry later',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  focusTranslationInput: {
    keyCombo: 'alt+right',
    name: 'Go to translation input',
    description: 'Focus the translation input of the focused line',
    scope: ShortcutScope.GLOBAL,
    priority: 200,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  focusCharacterSelector: {
    keyCombo: 'alt+left',
    name: 'Go to character selector',
    description: 'Focus the character selector of the focused line',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  moveToPreviousLine: {
    keyCombo: 'alt+up',
    name: 'Go to previous line',
    description: 'Focus same input of the previous line',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  moveToNextLine: {
    keyCombo: 'alt+down',
    name: 'Go to next line',
    description: 'Focus same input of the next line',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  deleteLine: {
    keyCombo: 'alt+backspace',
    name: 'Remove focused line',
    description: 'Remove currently focused line and focuses next one',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  deleteLineDelete: {
    keyCombo: 'alt+delete',
    name: 'Remove focused line',
    description: 'Remove currently focused line and focuses next one',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  mergeToTop: {
    keyCombo: 'alt+shift+up',
    name: 'Merge up',
    description: 'Merges current line with the top one',
    scope: ShortcutScope.GLOBAL,
    priority: 200,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  mergeToBottom: {
    keyCombo: 'alt+shift+down',
    name: 'Merge up',
    description: 'Merges current line with the top one',
    scope: ShortcutScope.GLOBAL,
    priority: 200,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  splitLine: {
    keyCombo: 'alt+r',
    name: 'Split line at cursor',
    description: 'Split the current line into two at the cursor position',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  toggleComplete: {
    keyCombo: 'alt+enter',
    name: 'Toggle line complete',
    description: 'Toggles current line completion state',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  historyBack: {
    keyCombo: 'ctrl+z',
    name: 'Rollback history',
    description: 'Revert last change',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  historyForward: {
    keyCombo: 'ctrl+shift+z',
    name: 'Undo revert last change',
    description: 'Reverts last reverted change',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  playbackToggle: {
    keyCombo: 'ctrl+enter',
    name: 'Pause/Resume playback',
    description: 'Pauses ore resumes video',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  addToGlossary: {
    keyCombo: 'alt+g',
    name: 'Add selected to glossary',
    description: 'Propose translation for selected text in source column',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  insertLineBefore: {
    keyCombo: 'alt+,',
    name: 'Insert line before',
    description: 'Insert a new empty line before the current one',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  insertLineAfter: {
    keyCombo: 'alt+.',
    name: 'Insert line after',
    description: 'Insert a new empty line after the current one',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  shiftAllLinesEarlier: {
    keyCombo: 'alt+shift+a',
    name: 'Shift all lines earlier',
    description: 'Shift every line earlier in time by the configured step',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  shiftAllLinesLater: {
    keyCombo: 'alt+shift+d',
    name: 'Shift all lines later',
    description: 'Shift every line later in time by the configured step',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  aiTranslationBulk: {
    keyCombo: 'alt+shift+t',
    name: 'Translate everything with AI',
    description: 'Bulk-translate every untranslated line',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  autoMergeLines: {
    keyCombo: 'alt+shift+m',
    name: 'Auto-merge adjacent lines',
    description: 'Merge adjacent lines whose timing gap is within the configured threshold',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  cleanup: {
    keyCombo: 'alt+h',
    name: 'Cleanup lines',
    description: 'Run text cleanup (strip HTML/ASS tags, audio cues, fix dashes) across all lines',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  copyAllSourceToOutput: {
    keyCombo: 'alt+shift+c',
    name: 'Copy all source to output',
    description: 'Copy source text into the output column for every line',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  completeAllTranslatedLines: {
    keyCombo: 'alt+shift+enter',
    name: 'Mark all translated lines as complete',
    description: 'Marks every line that has output text as complete',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  toggleEditMode: {
    keyCombo: 'ctrl+m',
    name: 'Toggle edit mode',
    description: 'Switches between translation mode and edit mode',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
} satisfies ShortcutSettings;

const useAppKeyStroke = (
  keystroke: keyof typeof myShortcuts,
  action: (event: KeyboardEvent) => void
) => useShortcut(keystroke, action);

type EditorKeystrokeContextType = {
  isCtrlPressed: boolean;
  isShiftPressed: boolean;
  isAltPressed: boolean;
  isCtrlShiftPressed: boolean;
  isCtrlAltPressed: boolean;
  isAltShiftPressed: boolean;
};

const modifierInitialState: EditorKeystrokeContextType = {
  isCtrlPressed: false,
  isShiftPressed: false,
  isAltPressed: false,
  isCtrlShiftPressed: false,
  isCtrlAltPressed: false,
  isAltShiftPressed: false,
};

function modifierReducer(
  current: EditorKeystrokeContextType,
  action: KeyboardEvent | null
): EditorKeystrokeContextType {
  if (action === null) return modifierInitialState;
  const { ctrlKey, shiftKey, altKey } = action;
  const isCtrlPressed = ctrlKey;
  const isShiftPressed = shiftKey;
  const isAltPressed = altKey;
  const isCtrlShiftPressed = ctrlKey && shiftKey;
  const isCtrlAltPressed = ctrlKey && altKey;
  const isAltShiftPressed = altKey && shiftKey && !ctrlKey;
  if (
    isCtrlPressed === current.isCtrlPressed &&
    isShiftPressed === current.isShiftPressed &&
    isAltPressed === current.isAltPressed &&
    isCtrlShiftPressed === current.isCtrlShiftPressed &&
    isCtrlAltPressed === current.isCtrlAltPressed &&
    isAltShiftPressed === current.isAltShiftPressed
  ) {
    return current;
  }
  return {
    isCtrlPressed,
    isShiftPressed,
    isAltPressed,
    isCtrlShiftPressed,
    isCtrlAltPressed,
    isAltShiftPressed,
  };
}

export const EditorKeystrokeContext =
  createContext<EditorKeystrokeContextType>(modifierInitialState);

function hasSelectedTextInElement(element: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return false;
  }
  const range = selection.getRangeAt(0);
  return element.contains(range.startContainer) && element.contains(range.endContainer);
}

export default function EditorKeystrokeProvider({ children }: PropsWithChildren) {
  return <EditorKeystrokeOuter>{children}</EditorKeystrokeOuter>;
}

// Owns the modifier-key tracking used by EditorKeystrokeContext, fed by plain window listeners --
// doesn't need react-keyhub's context, so it lives outside <KeystrokeZone>, unlike
// <EditorShortcuts/> below.
function EditorKeystrokeOuter({ children }: PropsWithChildren) {
  const [modifierState, dispatchModifier] = useReducer(modifierReducer, modifierInitialState);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => dispatchModifier(event);
    const handleKeyUp = (event: KeyboardEvent) => dispatchModifier(event);
    const handleWindowBlur = () => dispatchModifier(null);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  return (
    <KeystrokeZone
      shortcuts={myShortcuts}
      shortcutOptions={{
        preventDefault: true,
        stopPropagation: true,
        debounceTime: 0,
        sequenceTimeout: 500,
        ignoreInputFields: false,
        ignoreModifierOnlyEvents: true,
      }}
      hint={{ corner: 'bottom-left' }}
    >
      <EditorKeystrokeContext.Provider value={modifierState}>
        <EditorShortcuts />
        {children}
      </EditorKeystrokeContext.Provider>
    </KeystrokeZone>
  );
}

// Registers useShortcut handlers -- must render as KeystrokeZone's child so these hooks run inside
// the KeyHubProvider context KeystrokeZone creates for `shortcuts`.
function EditorShortcuts() {
  const dispatch = useAppDispatch();
  const { lineInputRefs, splitCursorRef } = useEditorRefs();
  const { zoneRef, setFocusOverride } = useKeystrokeZone();

  // AI-translation-in-flight gating -- orthogonal to focus containment, which KeystrokeZone's own
  // ShortcutPauseBridge already handles at the EventBus level.
  const useGuardedKeyStroke = (
    keystroke: Parameters<typeof useAppKeyStroke>[0],
    action: (event: KeyboardEvent) => void
  ) => {
    useAppKeyStroke(keystroke, (event) => {
      if (fromCurrentStore(selectTranslationIsBusy)) return;
      action(event);
    });
  };

  const {
    handleChangeFocusedColumn,
    handleSetFocusedLineAndColumn,
    handleCopySourceToOutput,
    handleInsertLine,
    handleSplitLine,
    handleAdjustStartTime,
    handleAdjustEndTime,
    handleAdjustEntryTime,
    handleMergeLines,
    handleToggleCompleted,
    handleRemoveLine,
    handleUndoRedo,
    handleAutoMerge,
    handleCleanup,
    handleCopyAllSourceToOutput,
    handleCompleteAllTranslatedLines,
    handleToggleEditMode,
  } = useEditorActions();
  const { handlePlayPause, seekToLine } = useVideo();
  const { handleAiTranslate, handleAiTranslateBulk, handleAddToGlossary } = useEditorAIActions();

  // ctrl+2's real target: prefer the already-focused line (with handleChangeFocusedColumn's
  // richer cursor/scroll treatment) and only fall back to the zone's own ref (row 0's output
  // column, seeded by EditorTableLine, or whatever was last focused) when nothing was focused yet.
  // Registered once -- the closure below reads focus state fresh from the store when it actually
  // runs, so it doesn't need to be re-registered every time focus changes.
  useEffect(() => {
    const focusOverride = () => {
      const focusedLineIndex = fromCurrentStore(selectFocusedLineIndex);
      const focusedColumn = fromCurrentStore(selectFocusedColumn);
      if (
        focusedLineIndex !== null &&
        handleChangeFocusedColumn(focusedLineIndex, focusedColumn ?? 'output')
      )
        return;
      const el = zoneRef.current;
      if (!el) return;
      focusContentEditableToEnd(el);
      el.scrollIntoView({ block: 'nearest' });
      handleSetFocusedLineAndColumn(0, 'output');
    };
    setFocusOverride(focusOverride);
    return () => setFocusOverride(undefined);
  }, [handleChangeFocusedColumn, handleSetFocusedLineAndColumn, zoneRef, setFocusOverride]);

  const getKeystrokeLineData = () => {
    const activeElement = (document.activeElement as HTMLElement | null) ?? document.body;
    const focusedLineIndex = fromCurrentStore(selectFocusedLineIndex);
    const translationLines = fromCurrentStore(selectLines);
    const lineIndex = focusedLineIndex ?? (translationLines.length > 0 ? 0 : null);
    return { lineIndex, activeElement };
  };

  const handleSwitchColumn = (targetColumn: InputColumnType, lineIndex: number | null) => {
    const translationLines = fromCurrentStore(selectLines);
    const focusedColumn = fromCurrentStore(selectFocusedColumn);
    const defaultIndex = translationLines.length > 0 ? 0 : null;
    if (lineIndex == null) {
      if (defaultIndex == null) return;
      handleChangeFocusedColumn(defaultIndex, targetColumn);
      return;
    }
    if (!focusedColumn) return;
    handleChangeFocusedColumn(lineIndex, targetColumn);
  };

  const handleNavigateLine = (
    direction: 'up' | 'down',
    lineIndex: number | null,
    activeElement: HTMLElement
  ) => {
    const translationLines = fromCurrentStore(selectLines);
    const focusedColumn = fromCurrentStore(selectFocusedColumn);
    const defaultIndex = translationLines.length > 0 ? 0 : null;
    const colType = focusedColumn ?? 'output';
    if (lineIndex == null) {
      if (defaultIndex == null) return;
      handleChangeFocusedColumn(defaultIndex, colType);
      seekToLine(defaultIndex);
      return;
    }
    const targetIndex = direction === 'up' ? lineIndex - 1 : lineIndex + 1;
    if (targetIndex < 0 || targetIndex >= translationLines.length) return;
    const selectAll = focusedColumn === 'output' && hasSelectedTextInElement(activeElement);
    handleChangeFocusedColumn(targetIndex, colType, selectAll);
    seekToLine(targetIndex);
  };

  useGuardedKeyStroke('splitLine', (event) => {
    const { lineIndex } = getKeystrokeLineData();
    if (lineIndex == null) return;
    event.preventDefault();
    handleSplitLine(lineIndex, splitCursorRef.current);
  });

  useGuardedKeyStroke('copySourceToOutput', () => {
    const { lineIndex } = getKeystrokeLineData();
    if (lineIndex == null) return;
    handleCopySourceToOutput(lineIndex);
  });

  useGuardedKeyStroke('aiTranslation', (event) => {
    const { lineIndex } = getKeystrokeLineData();
    if (lineIndex == null) return;
    event.preventDefault();
    handleAiTranslate(lineIndex);
  });

  useGuardedKeyStroke('adjustStartTimeLeft', (event) => {
    const { lineIndex } = getKeystrokeLineData();
    if (lineIndex == null) return;
    event.preventDefault();
    handleAdjustStartTime(lineIndex, 'earlier');
  });

  useGuardedKeyStroke('adjustStartTimeRight', (event) => {
    const { lineIndex } = getKeystrokeLineData();
    if (lineIndex == null) return;
    event.preventDefault();
    handleAdjustStartTime(lineIndex, 'later');
  });

  useGuardedKeyStroke('adjustEndTimeLeft', (event) => {
    const { lineIndex } = getKeystrokeLineData();
    if (lineIndex == null) return;
    event.preventDefault();
    handleAdjustEndTime(lineIndex, 'earlier');
  });

  useGuardedKeyStroke('adjustEndTimeRight', (event) => {
    const { lineIndex } = getKeystrokeLineData();
    if (lineIndex == null) return;
    event.preventDefault();
    handleAdjustEndTime(lineIndex, 'later');
  });

  useGuardedKeyStroke('adjustEntryTimeLeft', (event) => {
    const { lineIndex } = getKeystrokeLineData();
    if (lineIndex == null) return;
    event.preventDefault();
    handleAdjustEntryTime(lineIndex, 'earlier');
  });

  useGuardedKeyStroke('adjustEntryTimeRight', (event) => {
    const { lineIndex } = getKeystrokeLineData();
    if (lineIndex == null) return;
    event.preventDefault();
    handleAdjustEntryTime(lineIndex, 'later');
  });

  useGuardedKeyStroke('mergeToTop', (event) => {
    const { lineIndex } = getKeystrokeLineData();
    if (lineIndex == null) return;
    event.preventDefault();
    handleMergeLines(lineIndex, 'up');
  });

  useGuardedKeyStroke('mergeToBottom', (event) => {
    const { lineIndex } = getKeystrokeLineData();
    if (lineIndex == null) return;
    event.preventDefault();
    handleMergeLines(lineIndex, 'down');
  });

  useGuardedKeyStroke('toggleComplete', (event) => {
    const { lineIndex } = getKeystrokeLineData();
    if (lineIndex == null) return;
    event.preventDefault();
    handleToggleCompleted(lineIndex);
  });

  const handleDeleteLineKeyStroke = (event: KeyboardEvent) => {
    const { lineIndex } = getKeystrokeLineData();
    if (lineIndex == null) return;
    event.preventDefault();
    handleRemoveLine(lineIndex);
  };

  useGuardedKeyStroke('deleteLine', handleDeleteLineKeyStroke);
  useGuardedKeyStroke('deleteLineDelete', handleDeleteLineKeyStroke);

  useGuardedKeyStroke('focusCharacterSelector', () => {
    const { lineIndex } = getKeystrokeLineData();
    const focusedColumn = fromCurrentStore(selectFocusedColumn);
    if (focusedColumn === 'source') return;
    const target = focusedColumn === 'character' ? 'source' : 'character';
    handleSwitchColumn(target, lineIndex);
  });

  useGuardedKeyStroke('focusTranslationInput', () => {
    const { lineIndex } = getKeystrokeLineData();
    const focusedColumn = fromCurrentStore(selectFocusedColumn);
    const target = focusedColumn === 'source' ? 'character' : 'output';
    handleSwitchColumn(target, lineIndex);
  });

  useGuardedKeyStroke('moveToPreviousLine', () => {
    const { lineIndex, activeElement } = getKeystrokeLineData();
    handleNavigateLine('up', lineIndex, activeElement);
  });

  useGuardedKeyStroke('moveToNextLine', () => {
    const { lineIndex, activeElement } = getKeystrokeLineData();
    handleNavigateLine('down', lineIndex, activeElement);
  });

  useGuardedKeyStroke('historyBack', () => {
    handleUndoRedo('backward');
  });

  useGuardedKeyStroke('historyForward', () => {
    handleUndoRedo('forward');
  });

  useGuardedKeyStroke('playbackToggle', () => {
    const translationLines = fromCurrentStore(selectLines);
    const focusedLineIndex = fromCurrentStore(selectFocusedLineIndex);
    if (
      translationLines.length === 0 ||
      focusedLineIndex === null ||
      !translationLines[focusedLineIndex]
    )
      return;
    seekToLine(focusedLineIndex);
    handlePlayPause();
  });

  useGuardedKeyStroke('addToGlossary', (event) => {
    event.preventDefault();
    const { lineIndex } = getKeystrokeLineData();
    if (lineIndex == null) return;
    const sourceInput = lineInputRefs.current.get(lineIndex)?.source ?? null;
    if (!sourceInput) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    if (!sourceInput.contains(range.commonAncestorContainer)) return;
    const selectedText = selection.toString();
    if (!selectedText.trim()) return;
    handleAddToGlossary(selectedText);
  });

  useGuardedKeyStroke('insertLineBefore', () => {
    const { lineIndex } = getKeystrokeLineData();
    if (lineIndex == null) return;
    handleInsertLine(lineIndex, 'before');
  });

  useGuardedKeyStroke('insertLineAfter', () => {
    const { lineIndex } = getKeystrokeLineData();
    if (lineIndex == null) return;
    handleInsertLine(lineIndex, 'after');
  });

  useGuardedKeyStroke('shiftAllLinesEarlier', (event) => {
    event.preventDefault();
    dispatch(shiftAllLinesEarlier(fromCurrentStore(selectTimeAdjustmentStep)));
  });

  useGuardedKeyStroke('shiftAllLinesLater', (event) => {
    event.preventDefault();
    dispatch(shiftAllLinesLater(fromCurrentStore(selectTimeAdjustmentStep)));
  });

  useGuardedKeyStroke('aiTranslationBulk', (event) => {
    event.preventDefault();
    handleAiTranslateBulk();
  });

  useGuardedKeyStroke('autoMergeLines', (event) => {
    event.preventDefault();
    void handleAutoMerge();
  });

  useGuardedKeyStroke('cleanup', (event) => {
    event.preventDefault();
    void handleCleanup();
  });

  useGuardedKeyStroke('copyAllSourceToOutput', (event) => {
    event.preventDefault();
    void handleCopyAllSourceToOutput();
  });

  useGuardedKeyStroke('completeAllTranslatedLines', (event) => {
    event.preventDefault();
    handleCompleteAllTranslatedLines();
  });

  useGuardedKeyStroke('toggleEditMode', (event) => {
    event.preventDefault();
    handleToggleEditMode();
  });

  return null;
}
