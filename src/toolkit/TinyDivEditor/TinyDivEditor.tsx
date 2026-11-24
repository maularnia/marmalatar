import { settings } from '@src/services/settings';
import { ThemeColors } from '@src/theme/utils';
import { TLanguage } from '@src/types';
import { useAppSelector } from '@store/hooks';
import { getMarkCss, getTagMarkCss, type SpellCheckMark } from '@ui-toolkit/Mark';
import Tooltip from '@ui-toolkit/Tooltip';
import type { TTextRange } from '@utils/findMatches';
import { getLatinKey } from '@utils/keyboard';
import { contentEditableHtmlToText, type TTextMark } from '@utils/string';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type InputEvent as ReactInputEvent,
  type KeyboardEvent,
  type ReactNode,
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
const NO_CUSTOM_MARKS: TTextMark[] = [];
const NO_ACTIVE_CUSTOM_MARK = { index: -1, anchor: null };

/** A custom mark: its index in `customMarks`, its range and the text under it */
export type TCustomMark = TTextRange & { index: number; text: string };

type TTinyDivEditorProps = Omit<React.ComponentPropsWithoutRef<'div'>, 'onInput'> & {
  ref?: Ref<HTMLDivElement>;
  value?: string;
  /** Language to spellcheck against, if spellcheck is enabled (see `checkSpelling`). */
  language?: TLanguage | null;
  /** Whether spellcheck should run at all for this editor, regardless of `language`. Consumers
   * don't otherwise know spellcheck exists -- marks, requests, and cancellation are entirely owned
   * and managed internally. Defaults to `true`. */
  checkSpelling?: boolean;
  /** The consumer's own highlights, as ranges of `value` (e.g. search matches). Drawn only while
   * the text shown is `value`, the text they were computed for: while the user types ahead of it
   * they're left as they are, and redrawn once the new `value` comes back with its own marks.
   * Giving any (even an empty list) turns spellcheck off -- its marks would cover the same text. */
  customMarks?: TTextRange[];
  /** A keydown while the caret is inside one of `customMarks` (the focused one, highlighted), with
   * that mark. Preventing its default also keeps it from the editor's own `onKeyDown` */
  onTagKeyDown?: (event: KeyboardEvent<HTMLDivElement>, mark: TCustomMark) => void;
  /** A tooltip for the custom marks: shown for the focused one (the caret inside it) while it is */
  tagTooltip?: (mark: TCustomMark) => ReactNode;
  /** Where the tag tooltip opens from its mark. Defaults to the top */
  tagTooltipSide?: 'top' | 'right' | 'bottom' | 'left';
  onInput?: (text: string) => void;
};

// The outer element keeps the exact className/props contract callers already style via
// `styled(TinyDivEditor)` -- it only gains `position: relative`, which has no effect on its own
// box dimensions, so existing padding/sizing/hover rules at call sites are unaffected. The actual
// contentEditable surface moves one level deeper (EditableSurface) so the suggestions panel can be
// a real, stable React child of Root without ever being clobbered by the `innerHTML` rewrites that
// happen on EditableSurface alone.
// Laid over the focused custom mark (its first line, when it wraps), as the tag tooltip's anchor:
// the marks themselves are plain markup inside the editable, which React can't wrap
const TagTooltipAnchor = styled.span`
  position: absolute;
  pointer-events: none;
`;

// The focused custom mark's box within Root, from its first line's box on screen
type TTagAnchor = { left: number; top: number; width: number; height: number };

const Root = styled.div`
  position: relative;
  flex: 1 1 auto;
  display: flex;
  align-items: stretch;
  justify-items: stretch;
  justify-content: stretch;
`;

const EditableSurface = styled.div<{
  $customMarkCss: ReturnType<typeof getTagMarkCss>;
  $activeCustomMarkCss: ReturnType<typeof getTagMarkCss>;
}>`
  width: 100%;
  min-height: 100%;
  mark[data-mark-id] {
    cursor: default;
    ${getMarkCss(ThemeColors.RED)}
  }
  mark[data-custom-mark] {
    cursor: inherit;
    ${({ $customMarkCss }) => $customMarkCss}
  }
  /* The one the caret is in */
  mark[data-custom-mark][data-active] {
    ${({ $activeCustomMarkCss }) => $activeCustomMarkCss}
  }
`;

// Where the suggestions panel is anchored for a mark: the mark's top, bottom and left edges in
// viewport coordinates, from the mark as it is in the DOM right now, or null when it isn't there
function getMarkPosition(
  editable: HTMLElement | null,
  markId: string
): { top: number; bottom: number; left: number } | null {
  const target = editable?.querySelector(`mark[data-mark-id="${markId}"]`);
  if (!target) return null;
  const { top, bottom, left } = target.getBoundingClientRect();
  return { top, bottom, left };
}

// The suggestions panel while it's open: for which mark, what it shows and where it sits (in
// viewport coordinates: the panel is fixed and portaled, see the render)
type TActivePanel = {
  mark: SpellCheckMark;
  status: TSuggestionsStatus;
  suggestions: string[];
  top: number;
  bottom: number;
  left: number;
};

export function TinyDivEditor({
  ref: forwardedRef,
  value,
  language,
  checkSpelling = true,
  customMarks,
  onTagKeyDown,
  tagTooltip,
  tagTooltipSide = 'top',
  onInput,
  ...rest
}: TTinyDivEditorProps) {
  const editableRef = useRef<HTMLDivElement>(null);
  const [activePanel, setActivePanel] = useState<TActivePanel | null>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeMarkIdRef = useRef<string | null>(null);
  const [lastSentValue, setLastSentValue] = useState('');

  const spellchecker = useSpellchecker({ language, enabled: checkSpelling && !customMarks });
  const { check, cancel, suggest, markedText } = spellchecker;
  const marks = markedText?.marks ?? NO_MARKS;
  // Read by the value effect, which must not re-run (and cancel its own check) when the marks change
  const markedTextRef = useRef(markedText);
  markedTextRef.current = markedText;

  // The custom marks as DOM marks, rebuilt only when their ranges change (consumers compute them
  // inline, a new array every render)
  // The custom mark the caret is in (focused), by index; -1 for none. Drawn as part of the marks'
  // markup, see the selectionchange effect below
  const [activeCustomMark, setActiveCustomMark] = useState<{
    index: number;
    anchor: TTagAnchor | null;
  }>(NO_ACTIVE_CUSTOM_MARK);
  const activeCustomMarkIndex = activeCustomMark.index;
  const rootRef = useRef<HTMLDivElement>(null);
  const customMarksKey = customMarks?.map(({ start, end }) => `${start}-${end}`).join(',') ?? '';
  const customTextMarks = useMemo<TTextMark[]>(
    () =>
      customMarks?.length
        ? customMarks.map(({ start, end }, index) => ({
            id: String(index),
            start,
            end,
            kind: 'custom',
            isActive: index === activeCustomMarkIndex,
          }))
        : NO_CUSTOM_MARKS,
    // eslint-disable-next-line @eslint-react/exhaustive-deps -- the key stands for the ranges
    [customMarksKey, activeCustomMarkIndex]
  );
  // Read by the effects below, which must not re-run for them
  const customTextMarksRef = useRef(customTextMarks);
  customTextMarksRef.current = customTextMarks;
  const valueRef = useRef(value);
  valueRef.current = value;

  // Every mark that belongs to `text`: the spellcheck's, if they were computed for it, and the
  // custom ones, if `text` is the value they were computed for
  const getMarksFor = useCallback((text: string): TTextMark[] => {
    const marked = markedTextRef.current;
    const spellMarks = marked && marked.text === text ? marked.marks : NO_MARKS;
    const custom = valueRef.current === text ? customTextMarksRef.current : NO_CUSTOM_MARKS;
    if (custom.length === 0) return spellMarks;
    if (spellMarks.length === 0) return custom;
    return [...spellMarks, ...custom];
  }, []);

  const theme = useAppSelector(settings.selectCurrentThemeData);
  const customMarkCss = getTagMarkCss(ThemeColors.ACCENT2, theme.colors[ThemeColors.ACCENT2].text);
  const activeCustomMarkCss = getTagMarkCss(
    ThemeColors.ACCENT1,
    theme.colors[ThemeColors.ACCENT1].text
  );

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
    const nextMarks = getMarksFor(text);
    if (nextMarks.length === 0 && !el.querySelector('mark')) return;
    renderText(el, text, nextMarks);
  }, [markedText, getMarksFor]);

  // Redraws the custom marks when they (or the value they belong to) change. Only while the shown
  // text is that value: otherwise the user has typed ahead of it, and rewriting the DOM mid-typing
  // is never free for the caret -- the marks follow once the typed text comes back as the value.
  // When it already matches, renderText leaves the DOM alone.
  useLayoutEffect(() => {
    const el = editableRef.current;
    if (!el || value === undefined) return;
    const text = contentEditableHtmlToText(el.innerHTML);
    if (text !== value) return;
    const nextMarks = getMarksFor(text);
    if (nextMarks.length === 0 && !el.querySelector('mark')) return;
    renderText(el, text, nextMarks);
  }, [customTextMarks, value, getMarksFor]);

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
    renderText(el, value, getMarksFor(value));
    if (document.activeElement === el) void check(value);
    // eslint-disable-next-line @eslint-react/exhaustive-deps -- lastSentValue only tells an echo from a real change; it must not re-run this
  }, [value, check, cancel, getMarksFor]);

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
        // The panel's position, from the mark as it is in the DOM right now (it's replaced on
        // every re-check), or null once the caret has left it or it's gone
        const getPosition = () =>
          activeMarkIdRef.current === id ? getMarkPosition(editableRef.current, mark.id) : null;

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
            // Hunspell lists its best guess first; the panel usually opens above the word, so the list is
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

  // The panel is fixed to the viewport, so it follows its word when anything around it scrolls
  // (the editor's list, the page). Capture phase: scroll events don't bubble.
  const activeMarkId = activePanel?.mark.id;
  useEffect(() => {
    if (!activeMarkId) return;
    const follow = () => {
      const position = getMarkPosition(editableRef.current, activeMarkId);
      if (!position) return;
      setActivePanel((panel) =>
        panel && panel.mark.id === activeMarkId ? { ...panel, ...position } : panel
      );
    };
    document.addEventListener('scroll', follow, true);
    return () => document.removeEventListener('scroll', follow, true);
  }, [activeMarkId]);

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

  // Which custom mark the caret is in, followed on every caret move. Only while the editable has
  // focus and shows `value` (the text the marks were computed for); none otherwise. The caret at
  // either edge of a mark counts as in it.
  useEffect(() => {
    const findActive = (): number => {
      const el = editableRef.current;
      if (!el || !customMarks?.length || document.activeElement !== el) return -1;
      if (contentEditableHtmlToText(el.innerHTML) !== valueRef.current) return -1;
      const offset = getCaretOffset(el);
      if (offset === null) return -1;
      return customMarks.findIndex(({ start, end }) => offset >= start && offset <= end);
    };
    // Where the tag tooltip anchors: the mark as it is in the DOM now. Marking it focused only
    // recolors it, so the box holds once it's redrawn
    const findAnchor = (index: number): TTagAnchor | null => {
      const markEl = editableRef.current?.querySelector(`mark[data-custom-mark="${index}"]`);
      const root = rootRef.current;
      const box = markEl?.getClientRects()[0];
      if (!box || !root) return null;
      const rootBox = root.getBoundingClientRect();
      return {
        left: box.left - rootBox.left,
        top: box.top - rootBox.top,
        width: box.width,
        height: box.height,
      };
    };
    // No sync on (re)subscribing: whatever changes the marks or the value while the editable has
    // focus rewrites its markup, which moves the caret back -- a selectionchange of its own
    const sync = () => {
      const index = findActive();
      setActiveCustomMark((previous) => {
        if (index < 0) return previous.index < 0 ? previous : NO_ACTIVE_CUSTOM_MARK;
        const anchor = findAnchor(index);
        const isSame =
          previous.index === index &&
          previous.anchor?.left === anchor?.left &&
          previous.anchor?.top === anchor?.top &&
          previous.anchor?.width === anchor?.width;
        return isSame ? previous : { index, anchor };
      });
    };
    document.addEventListener('selectionchange', sync);
    return () => document.removeEventListener('selectionchange', sync);
    // eslint-disable-next-line @eslint-react/exhaustive-deps -- the key stands for the ranges
  }, [customMarksKey, value]);

  // The focused custom mark, as handed to `onTagKeyDown`
  const getActiveCustomMark = (): TCustomMark | null => {
    const range = customMarks?.[activeCustomMarkIndex];
    if (!range || value === undefined) return null;
    return { index: activeCustomMarkIndex, ...range, text: value.slice(range.start, range.end) };
  };

  const activeTag = getActiveCustomMark();

  return (
    <Root ref={rootRef}>
      <EditableSurface
        ref={editableRefCallback}
        onInput={handleInput}
        spellCheck={false}
        autoCorrect="off"
        {...rest}
        $customMarkCss={customMarkCss}
        $activeCustomMarkCss={activeCustomMarkCss}
        onFocus={handleFocus}
        onBlur={(event) => {
          closeSuggestions();
          rest.onBlur?.(event);
        }}
        onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
          // Chromium runs the native undo/redo (ctrl+z, ctrl+shift+z, and ctrl+y on Linux and
          // Windows) as the keydown's default action, bound to the physical key -- so the check
          // is layout-independent too (ctrl+з is undo). Only the default is blocked, not
          // propagation: the keydown must still reach EditorKeystrokeProvider's document-level
          // history shortcuts. The `beforeinput` effect above catches whatever gets past this.
          if (event.ctrlKey && !event.altKey && ['z', 'y'].includes(getLatinKey(event))) {
            event.preventDefault();
          }
          // The suggestions panel owns Up/Down while it's open (SpellcheckOptions cycles its list
          // on `document`): the caller's handlers, like moving between lines, must not act on them
          if (activePanel && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) return;
          const activeMark = onTagKeyDown ? getActiveCustomMark() : null;
          if (activeMark) {
            // Only a default the handler itself prevents (the undo check above may have already)
            const wasPrevented = event.defaultPrevented;
            onTagKeyDown?.(event, activeMark);
            if (!wasPrevented && event.defaultPrevented) return;
          }
          rest.onKeyDown?.(event);
        }}
      />
      {/* Keyed by the mark so the highlight starts fresh per word */}
      {activePanel && (
        <SpellcheckOptions
          key={activePanel.mark.id}
          status={activePanel.status}
          suggestions={activePanel.suggestions}
          top={activePanel.top}
          bottom={activePanel.bottom}
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
      {tagTooltip && activeTag && activeCustomMark.anchor && (
        <Tooltip
          key={activeTag.index}
          forceOpen
          side={tagTooltipSide}
          label={tagTooltip(activeTag)}
        >
          <TagTooltipAnchor style={activeCustomMark.anchor} />
        </Tooltip>
      )}
    </Root>
  );
}
