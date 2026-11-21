export function focusContentEditableToEnd(el: HTMLElement): void {
  el.focus();
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

export function selectAllContentEditable(el: HTMLElement): void {
  el.focus();
  const sel = window.getSelection();
  if (!sel) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  sel.removeAllRanges();
  sel.addRange(range);
}

export function isEditableElement(el: Element | null): boolean {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLElement && el.isContentEditable)
  );
}

// Visual lines of an editable: one client rect per line box fragment of its content, top to bottom
function getLineRects(el: HTMLElement): DOMRect[] {
  const range = document.createRange();
  range.selectNodeContents(el);
  return Array.from(range.getClientRects()).filter((rect) => rect.height > 0);
}

function getCollapsedSelectionRange(el: HTMLElement): Range | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  return el.contains(range.startContainer) ? range : null;
}

/** The caret's x in viewport coordinates, or null when there's no caret in `el` */
export function getCaretX(el: HTMLElement): number | null {
  const range = getCollapsedSelectionRange(el);
  if (!range) return null;
  const rect = range.getClientRects()[0] ?? range.getBoundingClientRect();
  return rect.height > 0 || rect.left > 0 ? rect.left : null;
}

/** Whether the caret (collapsed, inside `el`) is on the first (`up`) or last (`down`) visual line:
 * the key would have nowhere left to go inside the text. A selection is never at an edge. */
export function isCaretOnEdgeLine(el: HTMLElement, direction: 'up' | 'down'): boolean {
  const range = getCollapsedSelectionRange(el);
  if (!range) return false;
  const lines = getLineRects(el);
  const caret = range.getClientRects()[0];
  if (!caret || caret.height === 0 || lines.length === 0) {
    // A caret on an empty line has no rect of its own: judge by its place in the text instead
    const before = document.createRange();
    before.selectNodeContents(el);
    before.setEnd(range.startContainer, range.startOffset);
    const offset = before.toString().length;
    return direction === 'up' ? offset === 0 : offset >= (el.textContent ?? '').length;
  }
  const edge = direction === 'up' ? lines[0] : lines[lines.length - 1];
  const middle = caret.top + caret.height / 2;
  return middle >= edge.top && middle <= edge.bottom;
}

/** Puts the caret on the first or last visual line of `el`, as near `x` (viewport coordinates) as
 * the text allows -- what moving down/up into it from a line above/below does. */
export function setCaretAtX(el: HTMLElement, x: number, line: 'first' | 'last'): void {
  el.focus();
  const lines = getLineRects(el);
  const rect = line === 'first' ? lines[0] : lines[lines.length - 1];
  const position = rect
    ? document.caretPositionFromPoint(
        Math.min(Math.max(x, rect.left), rect.right),
        rect.top + rect.height / 2
      )
    : null;
  if (!position || !el.contains(position.offsetNode)) {
    focusContentEditableToEnd(el);
    return;
  }
  const range = document.createRange();
  range.setStart(position.offsetNode, position.offset);
  range.collapse(true);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}
