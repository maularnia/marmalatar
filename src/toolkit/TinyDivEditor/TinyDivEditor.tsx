import { ThemeColors } from '@src/theme/utils';
import { TLanguage } from '@src/types';
import { getMarkCss, type SpellCheckMark } from '@ui-toolkit/Mark';
import { getLatinKey } from '@utils/keyboard';
import { contentEditableHtmlToText } from '@utils/string';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type InputEvent as ReactInputEvent,
  type Ref,
} from 'react';
import styled from 'styled-components';
import { getCaretOffset, renderText, setCaretOffset } from './caret';
import { SpellcheckOptions, TSuggestionsStatus } from './SpellcheckOptions';
import { useSpellchecker } from './useSpellchecker';

// How long to wait, after the user stops typing, before a spellcheck request is sent and its
// result applied -- marks must never be requested/injected mid-keystroke.
const SPELLCHECK_DEBOUNCE_MS = 300;

// How long the text caret must stay inside a mark before the suggestions panel opens. Closing is
// always immediate (no symmetric delay) -- see the selectionchange effect below.
const SUGGESTIONS_SHOW_DELAY_MS = 500;

const NO_MARKS: SpellCheckMark[] = [];

type TTinyDivEditorProps = Omit<React.ComponentPropsWithoutRef<'div'>, 'onInput'> & {
  ref?: Ref<HTMLDivElement>;
  value?: string;
  /** Language to spellcheck against, if spellcheck is enabled (see `checkSpelling`). */
  language?: TLanguage | null;
  /** Whether spellcheck should run at all for this editor, regardless of `language`. Consumers
   * don't otherwise know spellcheck exists -- marks, requests, and cancellation are entirely owned
   * and managed internally. Defaults to `true`. */
  checkSpelling?: boolean;
  onInput?: (text: string) => void;
};

// The outer element keeps the exact className/props contract callers already style via
// `styled(TinyDivEditor)` -- it only gains `position: relative`, which has no effect on its own
// box dimensions, so existing padding/sizing/hover rules at call sites are unaffected. The actual
// contentEditable surface moves one level deeper (EditableSurface) so the suggestions panel can be
// a real, stable React child of Root without ever being clobbered by the `innerHTML` rewrites that
// happen on EditableSurface alone.
const Root = styled.div`
  position: relative;
  flex: 1 1 auto;
  display: flex;
  align-items: stretch;
  justify-items: stretch;
  justify-content: stretch;
`;

const EditableSurface = styled.div`
  width: 100%;
  min-height: 100%;
  mark[data-mark-id] {
    cursor: default;
    ${getMarkCss(ThemeColors.RED)}
  }
`;

// The suggestions panel while it's open: for which mark, what it shows and where it sits
type TActivePanel = {
  mark: SpellCheckMark;
  status: TSuggestionsStatus;
  suggestions: string[];
  top: number;
  left: number;
};

export function TinyDivEditor({
  ref: forwardedRef,
  value,
  language,
  checkSpelling = true,
  onInput,
  ...rest
}: TTinyDivEditorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const editableRef = useRef<HTMLDivElement>(null);
  const [activePanel, setActivePanel] = useState<TActivePanel | null>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeMarkIdRef = useRef<string | null>(null);
  const [lastSentValue, setLastSentValue] = useState('');

  const spellchecker = useSpellchecker({ language, enabled: checkSpelling });
  const { check, cancel, suggest, markedText } = spellchecker;
  const marks = markedText?.marks ?? NO_MARKS;
  // Read by the value effect, which must not re-run (and cancel its own check) when the marks change
  const markedTextRef = useRef(markedText);
  markedTextRef.current = markedText;

  const editableRefCallback = useCallback(
    (el: HTMLDivElement | null) => {
      editableRef.current = el;
      if (typeof forwardedRef === 'function') forwardedRef(el);
      else if (forwardedRef) (forwardedRef as React.RefObject<HTMLDivElement | null>).current = el;
    },
    [forwardedRef]
  );

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
    };
  }, []);

  // The contentEditable's native undo manager must never run: the app's history
  // (EditorKeystrokeProvider's ctrl+z / ctrl+shift+z) owns undo, and the native one would rewrite
  // the DOM behind its back. It's blocked at `beforeinput`, which fires for every way the native
  // command can be triggered -- the shortcut under any keyboard layout (ctrl+з on a Cyrillic layout
  // is undo too, while `event.key` is 'з'), the context menu -- and is cancelable there. A native
  // listener: React's onBeforeInput only covers text insertion.
  useEffect(() => {
    const el = editableRef.current;
    if (!el) return;
    const blockNativeHistory = (event: InputEvent) => {
      if (event.inputType === 'historyUndo' || event.inputType === 'historyRedo') {
        event.preventDefault();
      }
    };
    el.addEventListener('beforeinput', blockNativeHistory);
    return () => el.removeEventListener('beforeinput', blockNativeHistory);
  }, []);

  // The one place marks reach the DOM. The marks apply only if they were computed for the text
  // that's in the editable right now (a check that resolved for older text is ignored, as are
  // marks of a text the user has since moved on from); otherwise, and when spellcheck is off,
  // whatever marks are in the DOM are stripped. Nothing is written when there's nothing to add or
  // remove -- a rewrite is never free for the caret.
  useLayoutEffect(() => {
    const el = editableRef.current;
    if (!el) return;
    const text = contentEditableHtmlToText(el.innerHTML);
    const nextMarks = markedText && markedText.text === text ? markedText.marks : NO_MARKS;
    if (nextMarks.length === 0 && !el.querySelector('mark[data-mark-id]')) return;
    renderText(el, text, nextMarks);
  }, [markedText]);

  // Syncs the DOM to an externally-changed `value` (not an echo of our own onInput -- those never
  // touch this prop until the DOM already matches it). The text is always kept in sync regardless
  // of focus, but spellcheck itself only runs if this div is the one currently focused -- an
  // external change (AI translation, undo, initial project load) to an unfocused/never-focused div
  // must never trigger a check; `handleFocus` picks it up lazily whenever it's actually looked at.
  useLayoutEffect(() => {
    if (value === undefined) return;
    const el = editableRef.current;
    if (!el) return;
    if (lastSentValue === value) return;

    cancel();
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    // Marks already computed for exactly this text (e.g. undo back to it) are kept
    const marked = markedTextRef.current;
    renderText(el, value, marked && marked.text === value ? marked.marks : NO_MARKS);
    if (document.activeElement === el) void check(value);
    // eslint-disable-next-line @eslint-react/exhaustive-deps -- lastSentValue only tells an echo from a real change; it must not re-run this
  }, [value, check, cancel]);

  // Hides the panel. By default also clears `activeMarkIdRef`, so the caret re-entering the same
  // mark later is treated as a fresh "enter" and reopens it. Passing `keepSuppressed: true` (used
  // only by Escape) leaves the ref pointing at the current mark instead, so the panel stays
  // suppressed for as long as the caret remains inside that same mark -- it only reopens once the
  // caret actually leaves and re-enters it, or the field gets re-spellchecked.
  const closeSuggestions = useCallback((options?: { keepSuppressed?: boolean }) => {
    if (!options?.keepSuppressed) activeMarkIdRef.current = null;
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    setActivePanel(null);
  }, []);

  const handleInput = (event: ReactInputEvent<HTMLDivElement>) => {
    const text = contentEditableHtmlToText(event.currentTarget.innerHTML);
    // A stale suggestions panel for text that's about to change is confusing -- close it.
    closeSuggestions();
    // Every keystroke cancels whatever check is in flight and pushes the debounce back out, so a
    // stale dictionary request never resolves after (and overwrites) a newer one.
    cancel();
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
      // The div may have been blurred during the debounce window -- the typed text must still
      // propagate via `onInput` regardless (that's data, not spellcheck), but the dictionary check
      // itself only runs if this div is still the one currently focused.
      const settled =
        document.activeElement === editableRef.current ? check(text) : Promise.resolve(true);
      void settled.then((applied) => {
        setLastSentValue(text);
        if (applied) onInput?.(text);
      });
    }, SPELLCHECK_DEBOUNCE_MS);
  };

  // Lazily checks a div the first time it's actually focused -- `check` itself skips the work if
  // the text was already checked, so this can call it unconditionally.
  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    const text = contentEditableHtmlToText(event.currentTarget.innerHTML);
    cancel();
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    void check(text);
    rest.onFocus?.(event);
  };

  // Tracks the text caret (not the mouse) entering/leaving a mark's character range. Re-checks on
  // every `selectionchange` (caret moved) and also once whenever the marks themselves change (the
  // caret may already be sitting inside a word that just became -- or stopped being -- marked).
  useEffect(() => {
    const findMarkAtCaret = (): SpellCheckMark | undefined => {
      const editable = editableRef.current;
      if (!editable || document.activeElement !== editable) return undefined;
      const offset = getCaretOffset(editable);
      if (offset === null) return undefined;
      return marks.find((mark) => offset >= mark.start && offset <= mark.end);
    };

    const checkCaretPosition = () => {
      const mark = findMarkAtCaret();
      const id = mark?.id ?? null;
      if (id === activeMarkIdRef.current) return;

      activeMarkIdRef.current = id;
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      setActivePanel(null);
      if (!mark) return;

      showTimeoutRef.current = setTimeout(() => {
        // The panel's position relative to Root, from the mark as it is in the DOM right now (it's
        // replaced on every re-check), or null once the caret has left it or it's gone
        const getPosition = (): Pick<TActivePanel, 'top' | 'left'> | null => {
          const root = rootRef.current;
          const editable = editableRef.current;
          if (!root || !editable || activeMarkIdRef.current !== id) return null;
          const liveTarget = editable.querySelector(`mark[data-mark-id="${id}"]`);
          if (!liveTarget) return null;
          const markRect = liveTarget.getBoundingClientRect();
          const rootRect = root.getBoundingClientRect();
          return { top: markRect.top - rootRect.top, left: markRect.left - rootRect.left };
        };

        const loadingPosition = getPosition();
        if (!loadingPosition) return;
        setActivePanel({
          mark,
          status: TSuggestionsStatus.LOADING,
          suggestions: [],
          ...loadingPosition,
        });

        // Suggestions take up to seconds per word, so they're only computed for the word the caret
        // has settled on. A superseded request (null) or a failure closes the panel -- the mark
        // itself is still valid.
        void suggest(mark.word)
          .then((suggestions) => {
            if (activeMarkIdRef.current !== id) return;
            const position = getPosition();
            if (!suggestions || !position) {
              setActivePanel(null);
              return;
            }
            // Hunspell lists its best guess first; the panel opens above the word, so the list is
            // reversed to put that guess last, right next to the word
            setActivePanel({
              mark,
              status: suggestions.length ? TSuggestionsStatus.READY : TSuggestionsStatus.EMPTY,
              suggestions: [...suggestions].reverse(),
              ...position,
            });
          })
          .catch(() => {
            if (activeMarkIdRef.current === id) setActivePanel(null);
          });
      }, SUGGESTIONS_SHOW_DELAY_MS);
    };

    checkCaretPosition();
    document.addEventListener('selectionchange', checkCaretPosition);
    return () => document.removeEventListener('selectionchange', checkCaretPosition);
  }, [marks, suggest]);

  const applySuggestion = useCallback(
    (mark: SpellCheckMark, suggestion: string) => {
      if (value === undefined) return;
      const { start, end } = mark;
      const newText = value.slice(0, start) + suggestion + value.slice(end);

      closeSuggestions();
      cancel();
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

      const el = editableRef.current;
      if (el) {
        renderText(el, newText);
        el.focus();
        setCaretOffset(el, start + suggestion.length);
      }
      void check(newText).then((applied) => {
        setLastSentValue(newText);
        if (applied) onInput?.(newText);
      });
    },
    [value, closeSuggestions, cancel, check, onInput]
  );

  return (
    <Root ref={rootRef}>
      <EditableSurface
        ref={editableRefCallback}
        onInput={handleInput}
        spellCheck={false}
        autoCorrect="off"
        {...rest}
        onFocus={handleFocus}
        onBlur={(event) => {
          closeSuggestions();
          rest.onBlur?.(event);
        }}
        onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
          // Chromium runs the native undo/redo (ctrl+z, ctrl+shift+z, and ctrl+y on Linux and
          // Windows) as the keydown's default action, bound to the physical key -- so the check
          // is layout-independent too (ctrl+з is undo). Only the default is blocked, not
          // propagation: the keydown must still reach EditorKeystrokeProvider's document-level
          // history shortcuts. The `beforeinput` effect above catches whatever gets past this.
          if (event.ctrlKey && !event.altKey && ['z', 'y'].includes(getLatinKey(event))) {
            event.preventDefault();
          }
          rest.onKeyDown?.(event);
        }}
      />
      {activePanel && (
        // Keyed by the mark so the panel's highlight starts fresh for every word
        <SpellcheckOptions
          key={activePanel.mark.id}
          status={activePanel.status}
          suggestions={activePanel.suggestions}
          top={activePanel.top}
          left={activePanel.left}
          onAddToDictionary={(target) => {
            // The mark goes once the dictionary is updated (see useSpellchecker)
            closeSuggestions();
            spellchecker.addToDictionary(target, activePanel.mark.word);
          }}
          onApplySuggestion={(suggestion) => applySuggestion(activePanel.mark, suggestion)}
          onDismiss={() => closeSuggestions({ keepSuppressed: true })}
        />
      )}
    </Root>
  );
}
