import { isEditableElement } from '@src/utils/contentEditable';
import {
  EventBusOptions,
  KeyHubProvider,
  ShortcutSettings,
  ShortcutType,
  eventToKeyCombo,
  normalizeKeyCombo,
} from 'react-keyhub';
import { KeyboardEvent, PropsWithChildren, useMemo, useState } from 'react';

type ScopedKeyHubProviderProps<T extends ShortcutSettings> = PropsWithChildren<{
  shortcuts: T;
  options?: Omit<EventBusOptions, 'target'>;
  /** Stops keydowns that (a) originate from an editable element (input/textarea/contentEditable)
   * AND (b) match one of `shortcuts`' own key combos, during the capture phase -- before
   * react-keyhub's own listener (now scoped to this same wrapper node rather than `document`)
   * ever sees them. Scoping react-keyhub's target inside the React tree means its (bubble-phase)
   * listener sits *closer* to the target than React's own root-level synthetic-event dispatch, so
   * a plain onKeyDown-level stopPropagation on a descendant no longer runs in time; capture phase
   * always precedes bubble phase, so this wins regardless.
   * Deliberately scoped to *matching* combos only (not every keydown): stopping propagation
   * during capture prevents React's own synthetic dispatch from ever reaching more deeply nested
   * onKeyDown handlers for that event (e.g. ListItem's own Enter-to-commit/Escape-to-discard) --
   * those aren't shortcuts here, so they must be left alone to keep working normally. */
  ignoreEditableElements?: boolean;
}>;

// KeyHubProvider's EventBus is constructed once via useState(() => new EventBus(shortcuts,
// options)), so `options.target` must already be a real DOM node at that moment -- a ref to a
// wrapper only becomes available one commit later. This renders the wrapper first (a
// callback-ref-as-state, so React resolves the follow-up render before paint, same timing class
// as useLayoutEffect) and only mounts KeyHubProvider (and therefore `children`) once that node
// exists, so its shortcuts are scoped to this subtree instead of defaulting to `document` and
// seeing every keydown on the page regardless of which region actually has focus.
export default function ScopedKeyHubProvider<T extends ShortcutSettings>({
  shortcuts,
  options,
  ignoreEditableElements,
  children,
}: ScopedKeyHubProviderProps<T>) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);

  const registeredCombos = useMemo(() => {
    const combos = new Set<string>();
    Object.values(shortcuts).forEach((shortcut) => {
      if (shortcut.type === ShortcutType.REGULAR) {
        combos.add(normalizeKeyCombo(shortcut.keyCombo));
      }
    });
    return combos;
  }, [shortcuts]);

  const handleCaptureKeyDown = ignoreEditableElements
    ? (event: KeyboardEvent) => {
        if (!isEditableElement(event.target as Element)) return;
        const combo = eventToKeyCombo(event.nativeEvent as unknown as globalThis.KeyboardEvent);
        if (registeredCombos.has(combo)) event.stopPropagation();
      }
    : undefined;

  return (
    <div ref={setRoot} style={{ display: 'contents' }} onKeyDownCapture={handleCaptureKeyDown}>
      {root && (
        <KeyHubProvider shortcuts={shortcuts} options={{ ...options, target: root }}>
          {children}
        </KeyHubProvider>
      )}
    </div>
  );
}
