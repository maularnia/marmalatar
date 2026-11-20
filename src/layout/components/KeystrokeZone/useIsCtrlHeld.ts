import { useSyncExternalStore } from 'react';

// Whether Ctrl is held down right now, shared by every keystroke zone: one set of window listeners
// for the whole app, attached while at least one component subscribes. Read from each key event's
// own modifier state, so a Ctrl released outside the window (or the window losing focus) never
// leaves it stuck on.

let isCtrlHeld = false;
const subscribers = new Set<() => void>();

function setCtrlHeld(value: boolean): void {
  if (value === isCtrlHeld) return;
  isCtrlHeld = value;
  subscribers.forEach((notify) => notify());
}

const handleKey = (event: KeyboardEvent) => setCtrlHeld(event.ctrlKey);
const handleBlur = () => setCtrlHeld(false);

function subscribe(notify: () => void): () => void {
  if (subscribers.size === 0) {
    window.addEventListener('keydown', handleKey, true);
    window.addEventListener('keyup', handleKey, true);
    window.addEventListener('blur', handleBlur);
  }
  subscribers.add(notify);
  return () => {
    subscribers.delete(notify);
    if (subscribers.size > 0) return;
    window.removeEventListener('keydown', handleKey, true);
    window.removeEventListener('keyup', handleKey, true);
    window.removeEventListener('blur', handleBlur);
    isCtrlHeld = false;
  };
}

export function useIsCtrlHeld(): boolean {
  return useSyncExternalStore(subscribe, () => isCtrlHeld);
}
