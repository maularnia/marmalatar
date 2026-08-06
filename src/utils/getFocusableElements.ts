import { RefObject, useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const candidates = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  const result: HTMLElement[] = [];
  for (let i = 0; i < candidates.length; i++) {
    if (candidates[i].offsetParent !== null) result.push(candidates[i]);
  }
  return result;
}

export function getFirstFocusable(container: HTMLElement): HTMLElement | null {
  return getFocusableElements(container)[0] ?? null;
}

// Steals focus once, on mount -- the same "grab focus the moment this appears" mount effect used
// both by pages that don't need a full FocusTrap (no Tab-containment required for a full-page
// view: Home, FolderSetup, Import -- pass a ref, and the first focusable descendant is focused)
// and by the Editor (which knows its own richer target -- the last-focused line, or the first
// line's first available input -- so it passes that logic directly instead). rAF gives the
// caller's own content a chance to render before we go looking for something to focus. Read via a
// ref rather than an effect dependency, so a fresh closure/ref object every render doesn't matter
// and this never re-fires after the initial mount.
export function useAutoFocusFirst(target: RefObject<HTMLElement | null> | (() => void)) {
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const current = targetRef.current;
      if (typeof current === 'function') {
        current();
        return;
      }
      const container = current.current;
      if (!container) return;
      getFirstFocusable(container)?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, []);
}
