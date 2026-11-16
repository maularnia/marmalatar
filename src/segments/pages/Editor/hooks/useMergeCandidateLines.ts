import { useEditorKeystroke } from '@providers/EditorKeystrokeProvider';
import { editor } from '@src/services/project';
import { useAppSelectors } from '@store/hooks';
import { useMemo } from 'react';

const NO_CANDIDATES: ReadonlySet<number> = new Set();

/** The lines the focused one would merge into: its neighbours above and below, while Alt+Shift (the
 * merge modifier) is held. Empty otherwise. */
export function useMergeCandidateLines(): ReadonlySet<number> {
  const { isAltShiftPressed } = useEditorKeystroke();
  const [focusedLineIndex, lineCount] = useAppSelectors(
    editor.selectFocusedLineIndex,
    (state) => editor.selectLines(state).length
  );
  return useMemo(() => {
    if (!isAltShiftPressed || focusedLineIndex == null) return NO_CANDIDATES;
    const candidates = new Set<number>();
    if (focusedLineIndex > 0) candidates.add(focusedLineIndex - 1);
    if (focusedLineIndex < lineCount - 1) candidates.add(focusedLineIndex + 1);
    return candidates;
  }, [focusedLineIndex, isAltShiftPressed, lineCount]);
}
