// The letter a shortcut means, whatever keyboard layout is active. Chromium binds its editing
// shortcuts (ctrl+z undo, ctrl+y redo, ...) to the physical key, so ctrl+з on a Cyrillic layout is
// still undo -- but `event.key` reports 'з' there. Like Chromium, this falls back to the physical
// key (`event.code`, 'KeyZ') when `event.key` isn't a Latin letter, and trusts `event.key` when it
// is (an AZERTY layout's 'z' sits on the physical KeyW, and must stay 'z').
export function getLatinKey(event: Pick<KeyboardEvent, 'key' | 'code'>): string {
  const key = event.key.toLowerCase();
  if (/^[a-z]$/.test(key)) return key;
  if (/^Key[A-Z]$/.test(event.code)) return event.code.slice(3).toLowerCase();
  return key;
}
