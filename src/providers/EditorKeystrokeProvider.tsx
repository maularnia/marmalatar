import { useEditorActions } from '@providers/EditorActionsProvider';
import { useEditorAIActions } from '@providers/EditorAIActionsProvider';
import { useEditorRefs } from '@providers/EditorRefsProvider';
import KeystrokeZone, {
  useKeystrokeZone,
} from '@src/layout/components/KeystrokeZone/KeystrokeZone';
import { selectFocusedColumn, selectFocusedLineIndex, selectLines } from '@src/store/slices/editor';
import { focusContentEditableToEnd } from '@src/utils/contentEditable';
import { selectTranslationIsBusy } from '@store/slices/aiTranslation';
import { fromCurrentStore } from '@store/store';
import { createContext, PropsWithChildren, useContext, useEffect, useReducer } from 'react';
import {
  ShortcutScope,
  ShortcutSettings,
  ShortcutStatus,
  ShortcutType,
  useShortcut,
} from 'react-keyhub';

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
    name: 'Start time <-',
    description: 'Adjust end time to left',
    scope: ShortcutScope.GLOBAL,
    priority: 100,
    status: ShortcutStatus.ENABLED,
    group: 'Workspace',
    type: ShortcutType.REGULAR,
  },
  adjustEndTimeRight: {
    keyCombo: 'alt+d',
    name: 'Start time <-',
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

const useAppKeystroke = (
  keystroke: keyof typeof myShortcuts,
  action: (event: KeyboardEvent) => void
) => useShortcut(keystroke, action);

type TEditorKeystrokeContext = {
  isCtrlPressed: boolean;
  isShiftPressed: boolean;
  isAltPressed: boolean;
  isCtrlShiftPressed: boolean;
  isCtrlAltPressed: boolean;
  isAltShiftPressed: boolean;
};

const modifierInitialState: TEditorKeystrokeContext = {
  isCtrlPressed: false,
  isShiftPressed: false,
  isAltPressed: false,
  isCtrlShiftPressed: false,
  isCtrlAltPressed: false,
  isAltShiftPressed: false,
};

function modifierReducer(
  current: TEditorKeystrokeContext,
  action: KeyboardEvent | null
): TEditorKeystrokeContext {
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

const EditorKeystrokeContext = createContext<TEditorKeystrokeContext>(modifierInitialState);

export function useEditorKeystroke(): TEditorKeystrokeContext {
  return useContext(EditorKeystrokeContext);
}

export function EditorKeystrokeProvider({ children }: PropsWithChildren) {
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
  const { splitCursorRef } = useEditorRefs();
  const { zoneRef, setFocusOverride } = useKeystrokeZone();

  // AI-translation-in-flight gating -- orthogonal to focus containment, which KeystrokeZone's own
  // ShortcutPauseBridge already handles at the EventBus level.
  const useGuardedKeystroke = (
    keystroke: Parameters<typeof useAppKeystroke>[0],
    action: (event: KeyboardEvent) => void
  ) => {
    useAppKeystroke(keystroke, (event) => {
      if (fromCurrentStore(selectTranslationIsBusy)) return;
      action(event);
    });
  };

  const {
    handleChangeFocusedColumn,
    handleSetFocusedLineAndColumn,
    handleSwitchColumn,
    handleNavigateLine,
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
    handleShiftAllLines,
    handlePlayFocusedLine,
  } = useEditorActions();
  const { handleAiTranslate, handleAiTranslateBulk, handleAddSelectionToGlossary } =
    useEditorAIActions();

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

  const getKeystrokeLineIndex = () => {
    const focusedLineIndex = fromCurrentStore(selectFocusedLineIndex);
    const translationLines = fromCurrentStore(selectLines);
    return focusedLineIndex ?? (translationLines.length > 0 ? 0 : null);
  };

  useGuardedKeystroke('splitLine', (event) => {
    const lineIndex = getKeystrokeLineIndex();
    if (lineIndex == null) return;
    event.preventDefault();
    handleSplitLine(lineIndex, splitCursorRef.current);
  });

  useGuardedKeystroke('copySourceToOutput', () => {
    const lineIndex = getKeystrokeLineIndex();
    if (lineIndex == null) return;
    handleCopySourceToOutput(lineIndex);
  });

  useGuardedKeystroke('aiTranslation', (event) => {
    const lineIndex = getKeystrokeLineIndex();
    if (lineIndex == null) return;
    event.preventDefault();
    handleAiTranslate(lineIndex);
  });

  useGuardedKeystroke('adjustStartTimeLeft', (event) => {
    const lineIndex = getKeystrokeLineIndex();
    if (lineIndex == null) return;
    event.preventDefault();
    handleAdjustStartTime(lineIndex, 'earlier');
  });

  useGuardedKeystroke('adjustStartTimeRight', (event) => {
    const lineIndex = getKeystrokeLineIndex();
    if (lineIndex == null) return;
    event.preventDefault();
    handleAdjustStartTime(lineIndex, 'later');
  });

  useGuardedKeystroke('adjustEndTimeLeft', (event) => {
    const lineIndex = getKeystrokeLineIndex();
    if (lineIndex == null) return;
    event.preventDefault();
    handleAdjustEndTime(lineIndex, 'earlier');
  });

  useGuardedKeystroke('adjustEndTimeRight', (event) => {
    const lineIndex = getKeystrokeLineIndex();
    if (lineIndex == null) return;
    event.preventDefault();
    handleAdjustEndTime(lineIndex, 'later');
  });

  useGuardedKeystroke('adjustEntryTimeLeft', (event) => {
    const lineIndex = getKeystrokeLineIndex();
    if (lineIndex == null) return;
    event.preventDefault();
    handleAdjustEntryTime(lineIndex, 'earlier');
  });

  useGuardedKeystroke('adjustEntryTimeRight', (event) => {
    const lineIndex = getKeystrokeLineIndex();
    if (lineIndex == null) return;
    event.preventDefault();
    handleAdjustEntryTime(lineIndex, 'later');
  });

  useGuardedKeystroke('mergeToTop', (event) => {
    const lineIndex = getKeystrokeLineIndex();
    if (lineIndex == null) return;
    event.preventDefault();
    handleMergeLines(lineIndex, 'up');
  });

  useGuardedKeystroke('mergeToBottom', (event) => {
    const lineIndex = getKeystrokeLineIndex();
    if (lineIndex == null) return;
    event.preventDefault();
    handleMergeLines(lineIndex, 'down');
  });

  useGuardedKeystroke('toggleComplete', (event) => {
    const lineIndex = getKeystrokeLineIndex();
    if (lineIndex == null) return;
    event.preventDefault();
    handleToggleCompleted(lineIndex);
  });

  const handleDeleteLineKeystroke = (event: KeyboardEvent) => {
    const lineIndex = getKeystrokeLineIndex();
    if (lineIndex == null) return;
    event.preventDefault();
    handleRemoveLine(lineIndex);
  };

  useGuardedKeystroke('deleteLine', handleDeleteLineKeystroke);
  useGuardedKeystroke('deleteLineDelete', handleDeleteLineKeystroke);

  useGuardedKeystroke('focusCharacterSelector', () => {
    const lineIndex = getKeystrokeLineIndex();
    const focusedColumn = fromCurrentStore(selectFocusedColumn);
    if (focusedColumn === 'source') return;
    const target = focusedColumn === 'character' ? 'source' : 'character';
    handleSwitchColumn(target, lineIndex);
  });

  useGuardedKeystroke('focusTranslationInput', () => {
    const lineIndex = getKeystrokeLineIndex();
    const focusedColumn = fromCurrentStore(selectFocusedColumn);
    const target = focusedColumn === 'source' ? 'character' : 'output';
    handleSwitchColumn(target, lineIndex);
  });

  useGuardedKeystroke('moveToPreviousLine', () => {
    const lineIndex = getKeystrokeLineIndex();
    handleNavigateLine('up', lineIndex);
  });

  useGuardedKeystroke('moveToNextLine', () => {
    const lineIndex = getKeystrokeLineIndex();
    handleNavigateLine('down', lineIndex);
  });

  useGuardedKeystroke('historyBack', () => {
    handleUndoRedo('backward');
  });

  useGuardedKeystroke('historyForward', () => {
    handleUndoRedo('forward');
  });

  useGuardedKeystroke('playbackToggle', () => {
    handlePlayFocusedLine();
  });

  useGuardedKeystroke('addToGlossary', (event) => {
    event.preventDefault();
    const lineIndex = getKeystrokeLineIndex();
    if (lineIndex == null) return;
    handleAddSelectionToGlossary(lineIndex);
  });

  useGuardedKeystroke('insertLineBefore', () => {
    const lineIndex = getKeystrokeLineIndex();
    if (lineIndex == null) return;
    handleInsertLine(lineIndex, 'before');
  });

  useGuardedKeystroke('insertLineAfter', () => {
    const lineIndex = getKeystrokeLineIndex();
    if (lineIndex == null) return;
    handleInsertLine(lineIndex, 'after');
  });

  useGuardedKeystroke('shiftAllLinesEarlier', (event) => {
    event.preventDefault();
    handleShiftAllLines('earlier');
  });

  useGuardedKeystroke('shiftAllLinesLater', (event) => {
    event.preventDefault();
    handleShiftAllLines('later');
  });

  useGuardedKeystroke('aiTranslationBulk', (event) => {
    event.preventDefault();
    handleAiTranslateBulk();
  });

  useGuardedKeystroke('autoMergeLines', (event) => {
    event.preventDefault();
    void handleAutoMerge();
  });

  useGuardedKeystroke('cleanup', (event) => {
    event.preventDefault();
    void handleCleanup();
  });

  useGuardedKeystroke('copyAllSourceToOutput', (event) => {
    event.preventDefault();
    void handleCopyAllSourceToOutput();
  });

  useGuardedKeystroke('completeAllTranslatedLines', (event) => {
    event.preventDefault();
    handleCompleteAllTranslatedLines();
  });

  useGuardedKeystroke('toggleEditMode', (event) => {
    event.preventDefault();
    handleToggleEditMode();
  });

  return null;
}
