import { type RefObject, useEffect, useRef } from 'react';

/**
 * Observes `elementRef`'s element via `ResizeObserver` and calls `onResize` after `debounceMs` of
 * quiet following the last detected size change -- debounced because `ResizeObserver` can fire
 * many times in quick succession during an active drag-resize, and `onResize` is meant for work
 * that's only worth doing once the resize gesture has settled.
 */
export function useResizeWatch(
  elementRef: RefObject<Element | null>,
  debounceMs: number,
  onResize: () => void
): void {
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    let timeout: ReturnType<typeof setTimeout> | null = null;
    // ResizeObserver always invokes its callback once immediately upon observe(), reporting the
    // element's current size -- not an actual resize. VirtualizedList wires this into a render-
    // epoch bump that remounts every visible row (to invalidate width-dependent height caches), so
    // treating that spurious first call as a real resize would strip focus from a row the instant
    // it mounts, with nothing to restore it afterward.
    let isFirstCallback = true;
    const observer = new ResizeObserver(() => {
      if (isFirstCallback) {
        isFirstCallback = false;
        return;
      }
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => onResizeRef.current(), debounceMs);
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
      if (timeout) clearTimeout(timeout);
    };
  }, [elementRef, debounceMs]);
}
