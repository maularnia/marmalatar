import { CSSVar, ThemeColors } from '@src/theme/utils';
import { TLanguage } from '@src/types';
import { contentEditableHtmlToText, textToContentEditableHtml } from '@utils/string';
import { getMarkCss, type SpellCheckMark } from '@ui-toolkit/Mark';
import { emitSpellcheckUnavailableMessage } from '@src/messages';
import { useMessageHelmet } from '@src/providers/MessageHelmetProvider';
import {
  createSpellCheckClient,
  type SpellCheckClient,
} from '@src/services/spellcheck/hunspellClient';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type InputEvent,
  type Ref,
} from 'react';
import styled from 'styled-components';
import { ListItem } from './ListItem';

// How long to wait, after the user stops typing, before a spellcheck request is sent and its
// result applied -- marks must never be requested/injected mid-keystroke.
const SPELLCHECK_DEBOUNCE_MS = 300;

// How long the text caret must stay inside a mark before the suggestions panel opens. Closing is
// always immediate (no symmetric delay) -- see the selectionchange effect below.
const SUGGESTIONS_SHOW_DELAY_MS = 500;

type TinyDivEditorProps = Omit<React.ComponentPropsWithoutRef<'div'>, 'onInput'> & {
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

const SuggestionsPanel = styled.div`
  position: absolute;
  z-index: 1000;
  transform: translateY(-100%);
  min-width: 120px;
  font-family: ${CSSVar('fontTextSansSerif')};
  font-size: ${CSSVar('tooltipFontSize')};
  border-radius: ${CSSVar('tooltipBorderRadius')};
  background: ${CSSVar('tooltipBg')};
  backdrop-filter: ${CSSVar('tooltipBackdropFilter')};
  color: ${CSSVar('tooltipColor')};
  padding: ${CSSVar('tooltipSpacingY')} ${CSSVar('tooltipSpacingX')};
`;

const SuggestionsList = styled.div`
  display: flex;
  flex-direction: column;
`;

function getCaretOffset(root: HTMLElement): number | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer)) return null;
  const preRange = range.cloneRange();
  preRange.selectNodeContents(root);
  preRange.setEnd(range.startContainer, range.startOffset);
  return preRange.toString().length;
}

function setCaretOffset(root: HTMLElement, offset: number): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let node = walker.nextNode();
  let lastTextNode: Node | null = null;
  while (node) {
    const length = node.textContent?.length ?? 0;
    if (remaining <= length) {
      const range = document.createRange();
      range.setStart(node, remaining);
      range.collapse(true);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      return;
    }
    remaining -= length;
    lastTextNode = node;
    node = walker.nextNode();
  }
  if (lastTextNode) {
    const range = document.createRange();
    range.setStart(lastTextNode, lastTextNode.textContent?.length ?? 0);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
}

// Strips any existing `<mark>` tags back to plain text, preserving caret position if focused.
// Shared by `runSpellCheck`'s no-client branch and the client-recreation effect below, both of
// which need to erase stale marks without a live dictionary check.
function stripMarks(el: HTMLDivElement, text: string): void {
  const nextHtml = textToContentEditableHtml(text);
  if (el.innerHTML === nextHtml) return;
  const isFocused = document.activeElement === el;
  const caret = isFocused ? getCaretOffset(el) : null;
  el.innerHTML = nextHtml;
  if (caret !== null) setCaretOffset(el, caret);
}

type ActivePanel = { mark: SpellCheckMark; top: number; left: number };

export default function TinyDivEditor({
  ref: forwardedRef,
  value,
  language,
  checkSpelling = true,
  onInput,
  ...rest
}: TinyDivEditorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const editableRef = useRef<HTMLDivElement>(null);
  const [activePanel, setActivePanel] = useState<ActivePanel | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [appliedMarks, setAppliedMarks] = useState<SpellCheckMark[]>([]);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeMarkIdRef = useRef<string | null>(null);
  const spellCheckClientRef = useRef<SpellCheckClient | null>(null);
  const [lastSentValue, setLastSentValue] = useState('');
  // The text that was last successfully spellchecked -- lets `runSpellCheck` skip re-checking text
  // that's already been validated (rule 3), from any caller (focus, typing, external value change).
  const checkedTextRef = useRef<string | null>(null);
  // Suppresses repeat error toasts for the same ongoing failure (e.g. every keystroke while the
  // dictionary is unreachable) -- reset on the next successful check so a later failure can still
  // be reported.
  const hasReportedSpellCheckErrorRef = useRef(false);
  const { pushMessage } = useMessageHelmet();
  const effectiveLanguage = checkSpelling ? language : null;

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

  // Requests a check for `text` (no-op success if spellcheck is disabled or there's nothing to
  // check) and, if it's not been superseded by a newer request/keystroke and `text` still matches
  // what's actually in the DOM (the value at the moment the request was sent), applies the
  // resulting marks. Returns whether the caller should propagate `text` via `onInput` -- false
  // only means cancelled/superseded/stale (a newer call already owns propagating this text); a
  // failed dictionary lookup still resolves `true`, since the user's typed text is valid
  // regardless of whether spellcheck itself could run.
  const runSpellCheck = useCallback(
    (text: string): Promise<boolean> => {
      // Rule 3: nothing to do if this exact text was already the last thing actually checked.
      if (text === checkedTextRef.current) return Promise.resolve(true);

      if (!text) {
        setAppliedMarks((prev) => (prev.length === 0 ? prev : []));
        checkedTextRef.current = text;
        return Promise.resolve(true);
      }

      const client = spellCheckClientRef.current;
      if (!client) {
        // Spellcheck is off (or no language available) -- never touches the dictionary. Leaves
        // `checkedTextRef` alone (reset to null by the effect below) so re-enabling later is never
        // mistaken by the guard above for "unchanged, skip".
        setAppliedMarks((prev) => (prev.length === 0 ? prev : []));
        const el = editableRef.current;
        if (el) stripMarks(el, text);
        return Promise.resolve(true);
      }

      return client
        .request(text)
        .then((result) => {
          if (result === null) return false;
          const el = editableRef.current;
          if (!el) return false;
          if (contentEditableHtmlToText(el.innerHTML) !== text) return false;

          const nextHtml = textToContentEditableHtml(text, result);
          if (el.innerHTML !== nextHtml) {
            const isFocused = document.activeElement === el;
            const caret = isFocused ? getCaretOffset(el) : null;
            el.innerHTML = nextHtml;
            if (caret !== null) setCaretOffset(el, caret);
          }
          setAppliedMarks(result);
          checkedTextRef.current = text;
          hasReportedSpellCheckErrorRef.current = false;
          return true;
        })
        .catch((err) => {
          if (!hasReportedSpellCheckErrorRef.current) {
            hasReportedSpellCheckErrorRef.current = true;
            emitSpellcheckUnavailableMessage(
              pushMessage,
              err instanceof Error ? err.message : 'Could not load the dictionary.'
            );
          }
          // Unlike the cancelled/stale cases above, a failed check is not superseded by anything
          // -- the text is real and must still reach `onInput`, just without marks applied.
          return true;
        });
    },
    [pushMessage]
  );

  // Each editor owns its own client (and cancellation token) -- recreated whenever `language` or
  // the "check grammar" toggle changes, cancelling whatever the previous client had in flight.
  // Whatever was checked under the old client no longer applies, so it's forgotten here -- the
  // next focus always re-checks from scratch instead of `runSpellCheck`'s rule-3 guard mistaking
  // stale text for "already checked". If spellcheck just got disabled, markers are erased for every
  // div immediately (focused or not -- this is cheap cleanup, not a dictionary lookup); if it just
  // got (re)enabled, nothing runs eagerly here -- the next `handleFocus` does the work.
  useEffect(() => {
    spellCheckClientRef.current?.cancel();
    spellCheckClientRef.current = effectiveLanguage
      ? createSpellCheckClient(effectiveLanguage)
      : null;
    checkedTextRef.current = null;
    if (!spellCheckClientRef.current) {
      setAppliedMarks((prev) => (prev.length === 0 ? prev : []));
      const el = editableRef.current;
      if (el) stripMarks(el, contentEditableHtmlToText(el.innerHTML));
    }
    return () => {
      spellCheckClientRef.current?.cancel();
      spellCheckClientRef.current = null;
    };
  }, [effectiveLanguage]);

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

    spellCheckClientRef.current?.cancel();
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    const isFocused = document.activeElement === el;
    const caret = isFocused ? getCaretOffset(el) : null;
    el.innerHTML = textToContentEditableHtml(value);
    if (caret !== null) setCaretOffset(el, caret);
    if (isFocused) {
      void runSpellCheck(value);
    }
  }, [value, runSpellCheck]);

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

  const handleInput = (event: InputEvent<HTMLDivElement>) => {
    const text = contentEditableHtmlToText(event.currentTarget.innerHTML);
    // A stale suggestions panel for text that's about to change is confusing -- close it.
    closeSuggestions();
    // Every keystroke cancels whatever check is in flight and pushes the debounce back out, so a
    // stale dictionary request never resolves after (and overwrites) a newer one.
    spellCheckClientRef.current?.cancel();
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
      // The div may have been blurred during the debounce window -- the typed text must still
      // propagate via `onInput` regardless (that's data, not spellcheck), but the dictionary check
      // itself only runs if this div is still the one currently focused.
      const check =
        document.activeElement === editableRef.current
          ? runSpellCheck(text)
          : Promise.resolve(true);
      void check.then((applied) => {
        setLastSentValue(text);
        if (applied) onInput?.(text);
      });
    }, SPELLCHECK_DEBOUNCE_MS);
  };

  // Lazily checks a div the first time it's actually focused -- `runSpellCheck` itself skips the
  // work if the text was already checked (rule 3), so this can call it unconditionally.
  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    const text = contentEditableHtmlToText(event.currentTarget.innerHTML);
    spellCheckClientRef.current?.cancel();
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    void runSpellCheck(text);
    rest.onFocus?.(event);
  };

  // Tracks the text caret (not the mouse) entering/leaving a mark's character range. Re-checks on
  // every `selectionchange` (caret moved) and also once whenever `appliedMarks` itself changes
  // (the caret may already be sitting inside a word that just became -- or stopped being -- marked).
  useEffect(() => {
    const findMarkAtCaret = (): SpellCheckMark | undefined => {
      const editable = editableRef.current;
      if (!editable || document.activeElement !== editable) return undefined;
      const offset = getCaretOffset(editable);
      if (offset === null) return undefined;
      return appliedMarks.find(
        (mark) => offset >= mark.start && offset <= mark.end && mark.suggestions.length > 0
      );
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
        const root = rootRef.current;
        const editable = editableRef.current;
        if (!root || !editable || activeMarkIdRef.current !== id) return;
        const liveTarget = editable.querySelector(`mark[data-mark-id="${id}"]`);
        if (!liveTarget) return;

        const markRect = liveTarget.getBoundingClientRect();
        const rootRect = root.getBoundingClientRect();
        setActiveIndex(mark.suggestions.length - 1);
        setActivePanel({
          mark,
          top: markRect.top - rootRect.top,
          left: markRect.left - rootRect.left,
        });
      }, SUGGESTIONS_SHOW_DELAY_MS);
    };

    checkCaretPosition();
    document.addEventListener('selectionchange', checkCaretPosition);
    return () => document.removeEventListener('selectionchange', checkCaretPosition);
  }, [appliedMarks]);

  const applySuggestion = useCallback(
    (mark: SpellCheckMark, suggestion: string) => {
      if (value === undefined) return;
      const { start, end } = mark;
      const newText = value.slice(0, start) + suggestion + value.slice(end);

      closeSuggestions();
      spellCheckClientRef.current?.cancel();
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);

      const el = editableRef.current;
      if (el) {
        el.innerHTML = textToContentEditableHtml(newText);
        el.focus();
        setCaretOffset(el, start + suggestion.length);
      }
      void runSpellCheck(newText).then((applied) => {
        setLastSentValue(newText);
        if (applied) onInput?.(newText);
      });
    },
    [value, closeSuggestions, runSpellCheck, onInput]
  );

  // While the panel is open, arrow keys cycle the highlighted suggestion and Enter applies it,
  // overriding the contentEditable's native caret-movement/newline behavior for those keys.
  useEffect(() => {
    if (!activePanel) return;
    const suggestions = activePanel.mark.suggestions;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % suggestions.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        applySuggestion(activePanel.mark, suggestions[activeIndex]);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        closeSuggestions({ keepSuppressed: true });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activePanel, activeIndex, applySuggestion, closeSuggestions]);

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
          // The browser's native contentEditable undo manager intercepts Ctrl+Z/Ctrl+Shift+Z
          // before EditorKeystrokeProvider's document-level history shortcuts can run. Block only
          // the native behavior (not propagation) so the keydown still bubbles up to that
          // listener, which owns the app's actual undo/redo.
          if (event.ctrlKey && event.key.toLowerCase() === 'z') {
            event.preventDefault();
          }
          rest.onKeyDown?.(event);
        }}
      />
      {activePanel && (
        <SuggestionsPanel style={{ top: activePanel.top, left: activePanel.left }}>
          <SuggestionsList>
            {activePanel.mark.suggestions.map((suggestion, index) => (
              <li key={suggestion}>
                <ListItem
                  isActive={index === activeIndex}
                  onClick={() => applySuggestion(activePanel.mark, suggestion)}
                >
                  {suggestion}
                </ListItem>
              </li>
            ))}
          </SuggestionsList>
        </SuggestionsPanel>
      )}
    </Root>
  );
}
