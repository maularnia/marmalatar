import { isEditableElement } from './contentEditable';

// keyCode → character for the keys that aren't letters or digits, as on a US layout
const US_PUNCTUATION_BY_KEY_CODE: Record<number, string> = {
  186: ';',
  187: '=',
  188: ',',
  189: '-',
  190: '.',
  191: '/',
  192: '`',
  219: '[',
  220: '\\',
  221: ']',
  222: "'",
};

// The character a shortcut means, whatever keyboard layout is active -- the key as a US layout
// labels it. Chromium's `keyCode` (deprecated in the spec, stable in Chromium, which Electron
// pins) is the Windows virtual-key code with a US-layout fallback: the layout's own Latin
// character wins when it has one (AZERTY's physical W key is 'z'), and a key the layout has no
// Latin letter for falls back to its US position (ctrl+з on a Cyrillic layout is 'z'). Chromium
// binds its own editing shortcuts (ctrl+z undo, ctrl+y redo) to that same value, so matching on
// it fires exactly when the browser's would. Synthetic events carry `keyCode` 0, so those fall
// back to `key` when it's a Latin letter, then to the physical key (`code` 'KeyZ' → 'z').
export function getLatinKey(event: Pick<KeyboardEvent, 'key' | 'code' | 'keyCode'>): string {
  const { keyCode } = event;
  if (keyCode >= 65 && keyCode <= 90) return String.fromCharCode(keyCode + 32);
  if (keyCode >= 48 && keyCode <= 57) return String.fromCharCode(keyCode);
  const punctuation = US_PUNCTUATION_BY_KEY_CODE[keyCode];
  if (punctuation) return punctuation;

  const key = event.key.toLowerCase();
  if (/^[a-z]$/.test(key)) return key;
  if (/^Key[A-Z]$/.test(event.code)) return event.code.slice(3).toLowerCase();
  return key;
}

// Makes a keydown read as its US-layout key to everything downstream -- react-keyhub's
// `eventToKeyCombo`, React's synthetic event, capture checks -- by shadowing `key` on the event
// instance (the real value is a prototype getter). Mutating the trusted event, rather than
// stopping it and dispatching a normalised clone, keeps `preventDefault` and the default action
// working, keeps `isTrusted`, and no listener ever sees the same keystroke twice.
// Only applied where it can't change what gets typed: a modifier other than Shift is held, or the
// target isn't a text field (a focused dialog button, the list). A plain 'з' in a line stays 'з'.
export function normalizeKeyboardEvent(event: KeyboardEvent): void {
  const isShortcutLike = event.ctrlKey || event.altKey || event.metaKey;
  if (!isShortcutLike && isEditableElement(event.target as Element | null)) return;
  const latin = getLatinKey(event);
  if (latin.length !== 1 || latin === event.key.toLowerCase()) return;
  Object.defineProperty(event, 'key', { value: latin, configurable: true });
}
