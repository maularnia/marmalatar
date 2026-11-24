import { editor } from '@src/services/project';
import type { RefObject } from 'react';
import type { TLineRowController } from './EditorTableLine';

// The caret's offset into `input`'s text, or null when the selection lies elsewhere
function getCaretOffsetIn(input: HTMLElement): number | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!input.contains(range.startContainer)) return null;
  const preRange = document.createRange();
  preRange.selectNodeContents(input);
  preRange.setEnd(range.startContainer, range.startOffset);
  return preRange.toString().length;
}

// The text selected inside `input`, or '' when the selection is empty or lies elsewhere
function getSelectedTextIn(input: HTMLElement): string {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return '';
  if (!input.contains(selection.getRangeAt(0).commonAncestorContainer)) return '';
  return selection.toString();
}

/** The main table's rows: their inputs go to the editor's registry, focus and navigation to the
 * editor, and their caret and selection feed the editor's split cursor and source selection. */
export function makeEditorRowController(
  lineIndex: number,
  zoneRef: RefObject<HTMLElement | null>
): TLineRowController {
  return {
    registerInput: (column, el) => {
      editor.registerLineInput(lineIndex, column, el);
      // Seeds the editor zone's fallback focus target with line 0's output column -- kept fresh on
      // every (re)mount of that specific row, including a full remount on project switch.
      if (lineIndex === 0 && column === 'output' && el) zoneRef.current = el;
    },
    onInputFocus: (column) => editor.focusLine(lineIndex, column),
    onInputBlur: () => editor.focusLine(null),
    navigateFromEdge: (direction) => {
      const target = direction === 'up' ? lineIndex - 1 : lineIndex + 1;
      if (target < 0 || target >= editor.get.lines().length) return false;
      editor.navigateLine(direction, lineIndex, { keepCaretX: true });
      return true;
    },
    onSelectionChange: (column, input) => {
      if (column === 'source') editor.setTextSelection(getSelectedTextIn(input));
      if (editor.get.focusedColumn() !== column) return;
      const offset = getCaretOffsetIn(input);
      if (offset !== null) editor.setSplitCursor(offset);
    },
  };
}
