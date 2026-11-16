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

// How long useStealFocus keeps looking for its element: enough for a page's appear animation and
// lazily rendered content, short enough never to grab focus the user has since put elsewhere
const STEAL_FOCUS_TIMEOUT_MS = 1000;

/** Steals focus once, when the page that calls it renders: the element `target` points at, as soon
 * as it's on the page and visible -- checked once per frame, so an appear animation or content that
 * renders a little later doesn't make it miss. Pages pass a ref to their own intended element
 * (Home's main button, FolderSetup's folder button, Import's file button); the Editor passes a
 * function (its own focus logic: the last focused line, or the first line, focused as soon as its
 * row mounts). Read through a ref, so a fresh closure every render never re-fires it. */
export function useStealFocus(target: RefObject<HTMLElement | null> | (() => void)) {
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    const startedAt = performance.now();
    let raf = 0;
    const attempt = () => {
      const current = targetRef.current;
      if (typeof current === 'function') {
        current();
        return;
      }
      const el = current.current;
      if (el?.isConnected && el.offsetParent !== null) {
        el.focus();
        return;
      }
      if (performance.now() - startedAt < STEAL_FOCUS_TIMEOUT_MS) {
        raf = requestAnimationFrame(attempt);
      }
    };
    raf = requestAnimationFrame(attempt);
    return () => cancelAnimationFrame(raf);
  }, []);
}
