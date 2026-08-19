import { getFirstFocusable, getFocusableElements } from '@src/utils/getFocusableElements';
import { PropsWithChildren, RefObject, useEffect, useRef } from 'react';

type FocusTrapProps = PropsWithChildren<{
  active?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Called once the trap actually unmounts, after the previous-focus restore above has had its
   * chance to run -- lets a caller fall back to its own focus target (e.g. Overlay sending focus
   * back to the editor) for cases that restore doesn't cover. */
  onUnmount?: () => void;
}>;

// Module-level stack of currently-active trap instances (most-recently-activated last). A
// Confirmation dialog opened from within an Overlay ends up with two FocusTraps active at once --
// the dialog is rendered through a portal, so it lives outside the Overlay's own container and
// looks "outside" to the Overlay's trap. Without this stack, both traps fight over Tab: the
// Overlay's trap sees focus leave its container and yanks it back, undoing whatever the dialog's
// own trap just did. Only the topmost (last-activated) trap gets to act on Tab; the rest sit out
// until it deactivates, at which point the next one down resumes.
const activeTrapStack: symbol[] = [];

// Hand-rolled, minimal Tab-trap -- used only where real Tab-containment is actually needed
// (Confirmation dialogs, Overlay panels). Deliberately does NOT use focus-trap-react: that library
// shares one activation stack across every instance by default, so mounting one trap auto-pauses
// (and strips the listeners of) whichever trap was previously active -- wrong for this app, where
// Menu/Editor were never meant to be "paused" by an unrelated modal, and it also has its own
// internal recursion/escape-handling edge cases that don't apply to our much narrower need: keep
// Tab cycling inside this one container, nothing else.
export default function FocusTrap({
  active = true,
  initialFocusRef,
  onUnmount,
  children,
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Remembers what had focus before activating and restores it on deactivate/unmount.
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  // Read at unmount time via a ref rather than an effect dependency, so a caller passing a fresh
  // closure every render doesn't matter and this never re-fires early.
  const onUnmountRef = useRef(onUnmount);
  onUnmountRef.current = onUnmount;
  // React only honors this initial value on the very first render, so this doesn't allocate a new
  // Symbol on every re-render despite looking like it would.
  const trapIdRef = useRef<symbol>(Symbol('focus-trap'));

  useEffect(() => {
    if (!active) return;
    const id = trapIdRef.current;
    activeTrapStack.push(id);
    return () => {
      const index = activeTrapStack.indexOf(id);
      if (index !== -1) activeTrapStack.splice(index, 1);
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const container = containerRef.current;
    if (container) {
      (initialFocusRef?.current ?? getFirstFocusable(container))?.focus();
    }
    return () => {
      const previous = previouslyFocusedRef.current;
      // If something else already holds focus by the time this trap actually goes away, leave it
      // alone -- e.g. a transient Loader confirmation opened over a menu click, then a slower-to-
      // open overlay (prompt template/glossary) mounts and properly focuses itself *before* the
      // Loader's own promise resolves and closes it; blindly restoring here would yank focus back
      // to the original menu item and clobber the overlay's own focus. When nothing else has
      // stepped in, removing this trap's content leaves focus on `document.body` by this point
      // (synchronously, well before this passive cleanup runs), which is the normal, single-trap
      // case this restore is actually meant for.
      const nothingElseHasFocus =
        !document.activeElement || document.activeElement === document.body;
      if (nothingElseHasFocus && previous && document.body.contains(previous)) previous.focus();
    };
  }, [active]);

  // The entire trap: on Tab/Shift+Tab, if focus would leave (or already isn't in) the container,
  // wrap it to the other end instead. Capture phase on `document` so it sees the key first.
  useEffect(() => {
    if (!active) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      if (activeTrapStack[activeTrapStack.length - 1] !== trapIdRef.current) return;
      const container = containerRef.current;
      if (!container) return;
      const focusable = getFocusableElements(container);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;
      const outside = !current || !container.contains(current);
      if (event.shiftKey) {
        if (outside || current === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (outside || current === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [active]);

  // Declared last so its cleanup runs last on unmount -- after the focus-restore effect above has
  // already had a chance to send focus back to whatever opened the trap.
  useEffect(() => {
    return () => onUnmountRef.current?.();
  }, []);

  return (
    <div ref={containerRef} style={{ display: 'contents' }}>
      {children}
    </div>
  );
}
