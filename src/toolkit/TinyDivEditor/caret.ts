import type { SpellCheckMark } from '@ui-toolkit/Mark';
import { textToContentEditableHtml } from '@utils/string';

// DOM helpers for the editable surface: the caret as a character offset into its text, and the
// one place its innerHTML is written. No React in here.

export function getCaretOffset(root: HTMLElement): number | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer)) return null;
  const preRange = range.cloneRange();
  preRange.selectNodeContents(root);
  preRange.setEnd(range.startContainer, range.startOffset);
  return preRange.toString().length;
}

export function setCaretOffset(root: HTMLElement, offset: number): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let node = walker.nextNode();
  let lastTextNode: Node | null = null;
  while (node) {
    const length = node.textContent?.length ?? 0;
    if (remaining <= length) {
      const range = document.createRange();
      range.setStart(node, remaining);
      range.collapse(true);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      return;
    }
    remaining -= length;
    lastTextNode = node;
    node = walker.nextNode();
  }
  if (lastTextNode) {
    const range = document.createRange();
    range.setStart(lastTextNode, lastTextNode.textContent?.length ?? 0);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
}

// Renders `text` with `marks` into the editable. Skips the write when the markup already matches
// (a rewrite resets the selection and is never free), and otherwise keeps the caret where it was
// if the editable is focused -- browsers drop it to the start on an innerHTML write.
export function renderText(el: HTMLElement, text: string, marks: SpellCheckMark[] = []): void {
  const nextHtml = textToContentEditableHtml(text, marks);
  if (el.innerHTML === nextHtml) return;
  const isFocused = document.activeElement === el;
  const caret = isFocused ? getCaretOffset(el) : null;
  el.innerHTML = nextHtml;
  if (caret !== null) setCaretOffset(el, caret);
}
