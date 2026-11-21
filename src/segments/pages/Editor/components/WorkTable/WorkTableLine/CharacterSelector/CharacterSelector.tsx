import { CSSVar, ThemeColors } from '@src/theme/utils';
import { TCharacter } from '@src/types';
import { ListItem } from '@ui-toolkit/ListItem';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import {
  TextSuggestionBlock,
  TextSuggestionList,
  type TSuggestionAnchor,
  type TSuggestionPlacement,
} from '@ui-toolkit/TextSuggestionBlock';
import { isCaretOnEdgeLine } from '@utils/contentEditable';
import { getCaretOffset, setCaretOffset } from '@ui-toolkit/TinyDivEditor/caret';
import {
  type ClipboardEvent,
  type KeyboardEvent,
  type MouseEvent,
  type Ref,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import styled from 'styled-components';
import { sanitizeCharacterName } from '@utils/characterName';
import { rankCharacters } from './rankCharacters';

type TCharacterSelectorProps = {
  /** The pool to suggest from */
  characters: TCharacter[];
  /** The line's characters, in order */
  value: string[];
  onChange: (value: string[]) => void;
  onFocus?: () => void;
  disabled?: boolean;
  /** Up/Down on the input's first/last visual line, with no suggestion list to move through: moves
   * to the previous/next line. Returns whether there was a line to go to. */
  onNavigate?: (direction: 'up' | 'down') => boolean;
  /** The text input: what gets focus (the editor registers it as the line's character input) */
  inputRef?: Ref<HTMLSpanElement>;
};

// Below the cell; to its left, bottoms level, when there's no room below
const PLACEMENTS: TSuggestionPlacement[] = ['below', 'left-bottom'];

// Fills the cell (EditorLineCell stretches its child) and wraps the tags onto as many lines as they
// need
const Root = styled.div`
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  align-items: center;
  align-content: flex-start;
  min-width: 0;
  min-height: 100%;
  gap: ${CSSVar('mainTableCharacterSelectorSpacingInnerX')};
  padding: ${CSSVar('mainTableLineCellSpacingY')} ${CSSVar('mainTableLineCellSpacingX')};
  color: ${CSSVar('mainTableLineColorFocus')};
  font-family: ${CSSVar('fontTextSansSerif')};
  font-size: ${CSSVar('mainTableTextSize')};
  border-radius: ${CSSVar('inputBorderRadius')};
  cursor: text;

  &:hover {
    background: ${CSSVar('mainTableLineCellBgHover')};
  }

  &:focus-within {
    background: ${CSSVar('mainTableLineCellBgFocus')};
  }

  &.isDisabled {
    cursor: default;
  }
`;

const CharacterTag = styled(Tag)`
  cursor: text;
`;

// The text input and its typeahead, sized like a small tag so the line doesn't jump as tags appear
const InputSlot = styled.span`
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  font-size: ${CSSVar('tagTextSizeSmall')};
  line-height: 1.167;
  padding: ${CSSVar('tagSpacingSmallY')} 0;
  white-space: pre;
`;

const Input = styled.span`
  min-width: 2px;
  outline: none;
`;

const Typeahead = styled.span`
  pointer-events: none;
  opacity: 0.4;
`;

const Scroller = styled.div`
  max-height: 240px;
  overflow-y: auto;
`;

// Selection start and end inside `el`, as character offsets into its text
function getSelectionOffsets(el: HTMLElement): [number, number] {
  const text = el.textContent ?? '';
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return [text.length, text.length];
  const range = selection.getRangeAt(0);
  if (!el.contains(range.startContainer) || !el.contains(range.endContainer)) {
    return [text.length, text.length];
  }
  const toOffset = (node: Node, offset: number) => {
    const pre = document.createRange();
    pre.selectNodeContents(el);
    pre.setEnd(node, offset);
    return pre.toString().length;
  };
  return [
    toOffset(range.startContainer, range.startOffset),
    toOffset(range.endContainer, range.endOffset),
  ];
}

// A line's characters as coloured tags with a text input among them. Typing suggests characters
// from the pool (rankCharacters), with the best one completed inline; a name the pool doesn't have
// is added as typed. The input can sit between any two tags: it's rendered once, after the tags,
// and placed visually with flex `order`, so moving it never moves its DOM node -- which would blur
// it (and commit the typed text).
export function CharacterSelector({
  characters,
  value,
  onChange,
  onFocus,
  disabled = false,
  onNavigate,
  inputRef,
}: TCharacterSelectorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const editableRef = useRef<HTMLSpanElement | null>(null);
  const activeItemRef = useRef<HTMLDivElement | null>(null);

  // Where the input sits among the tags; null is after the last one (also once tags are removed)
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const insertIndex = insertAt === null ? value.length : Math.min(insertAt, value.length);
  const [query, setQuery] = useState('');
  // The highlighted suggestion; -1 is none, the default -- Enter then adds the text as typed
  const [activeIndex, setActiveIndex] = useState(-1);
  // Escape hides the list until the next keystroke changes the text
  const [isDismissed, setIsDismissed] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [anchor, setAnchor] = useState<TSuggestionAnchor | null>(null);

  const colorByName = useMemo(
    () => new Map(characters.map(({ name, color }) => [name, color])),
    [characters]
  );
  const suggestions = useMemo(
    () => rankCharacters(characters, query, value),
    [characters, query, value]
  );
  const isOpen = !disabled && isFocused && !isDismissed && suggestions.length > 0;
  const activeSuggestion =
    isOpen && activeIndex >= 0 ? suggestions[Math.min(activeIndex, suggestions.length - 1)] : null;
  // The typeahead (and Right arrow) offers the highlighted suggestion, or the most relevant one
  const offeredSuggestion = activeSuggestion ?? (isOpen ? suggestions[0] : null);
  const typeahead = offeredSuggestion?.name.slice(query.trim().length) ?? '';

  const setEditableRef = (node: HTMLSpanElement | null) => {
    editableRef.current = node;
    if (typeof inputRef === 'function') inputRef(node);
    else if (inputRef) inputRef.current = node;
  };

  // The list follows the cell: it grows with the tags, and the table scrolls under it
  useLayoutEffect(() => {
    if (!isOpen) return;
    const measure = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (rect) setAnchor({ top: rect.top, bottom: rect.bottom, left: rect.left });
    };
    measure();
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [isOpen, query, value, insertIndex]);

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  const applyText = (text: string) => {
    setQuery(text);
    setActiveIndex(-1);
    setIsDismissed(false);
  };

  const clearText = () => {
    if (editableRef.current) editableRef.current.textContent = '';
    applyText('');
  };

  // Writes `text` over the selection, as typing it would
  const insertText = (text: string) => {
    const el = editableRef.current;
    if (!el) return;
    const current = el.textContent ?? '';
    const [start, end] = getSelectionOffsets(el);
    el.textContent = current.slice(0, start) + text + current.slice(end);
    setCaretOffset(el, start + text.length);
    applyText(el.textContent);
  };

  // Puts `name` where the input is, and the input after it
  const addCharacter = (name: string) => {
    const trimmed = name.trim();
    clearText();
    if (!trimmed || value.includes(trimmed)) return;
    const next = [...value];
    next.splice(insertIndex, 0, trimmed);
    onChange(next);
    setInsertAt(insertIndex + 1 >= next.length ? null : insertIndex + 1);
  };

  const moveInput = (index: number, caret: 'start' | 'end') => {
    setInsertAt(index >= value.length ? null : index);
    const el = editableRef.current;
    if (!el) return;
    el.focus();
    setCaretOffset(el, caret === 'start' ? 0 : (el.textContent ?? '').length);
  };

  // Typed characters a name may not contain never reach the text. Native, because React's
  // onBeforeInput carries no inputType.
  useEffect(() => {
    const el = editableRef.current;
    if (!el) return;
    const handleBeforeInput = (event: InputEvent) => {
      if (event.inputType === 'insertParagraph' || event.inputType === 'insertLineBreak') {
        event.preventDefault();
        return;
      }
      if (event.inputType !== 'insertText' && event.inputType !== 'insertReplacementText') return;
      const data = event.data ?? '';
      const allowed = sanitizeCharacterName(data);
      if (allowed === data) return;
      event.preventDefault();
      if (allowed) insertText(allowed);
    };
    el.addEventListener('beforeinput', handleBeforeInput);
    return () => el.removeEventListener('beforeinput', handleBeforeInput);
  });

  // Whatever got past beforeinput (IME composition): strip it, keeping the caret in place
  const handleInput = () => {
    const el = editableRef.current;
    if (!el) return;
    const text = el.textContent ?? '';
    const allowed = sanitizeCharacterName(text);
    if (allowed !== text) {
      const caret = getCaretOffset(el) ?? text.length;
      el.textContent = allowed;
      setCaretOffset(el, Math.max(0, caret - (text.length - allowed.length)));
    }
    applyText(allowed);
  };

  const handlePaste = (event: ClipboardEvent<HTMLSpanElement>) => {
    event.preventDefault();
    if (disabled) return;
    const allowed = sanitizeCharacterName(event.clipboardData.getData('text/plain'));
    if (allowed) insertText(allowed);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    const el = editableRef.current;
    if (disabled || !el || event.altKey || event.ctrlKey || event.metaKey) return;
    const text = el.textContent ?? '';
    const caret = getCaretOffset(el);
    const hasSelection = (window.getSelection()?.toString() ?? '') !== '';

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        if (!isOpen) {
          const direction = event.key === 'ArrowDown' ? 'down' : 'up';
          if (!event.shiftKey && isCaretOnEdgeLine(el, direction) && onNavigate?.(direction)) {
            event.preventDefault();
          }
          return;
        }
        event.preventDefault();
        const count = suggestions.length;
        // From none, Down highlights the first suggestion and Up the last
        setActiveIndex((index) =>
          event.key === 'ArrowDown' ? (index + 1) % count : index <= 0 ? count - 1 : index - 1
        );
        return;
      }
      case 'Enter': {
        event.preventDefault();
        addCharacter(activeSuggestion ? activeSuggestion.name : text);
        return;
      }
      case 'ArrowRight': {
        if (offeredSuggestion) {
          event.preventDefault();
          addCharacter(offeredSuggestion.name);
        } else if (!hasSelection && caret === text.length && insertIndex < value.length) {
          event.preventDefault();
          moveInput(insertIndex + 1, 'start');
        }
        return;
      }
      case 'ArrowLeft': {
        if (!hasSelection && caret === 0 && insertIndex > 0) {
          event.preventDefault();
          moveInput(insertIndex - 1, 'end');
        }
        return;
      }
      case 'Backspace': {
        if (text || insertIndex === 0) return;
        event.preventDefault();
        onChange(value.filter((_, index) => index !== insertIndex - 1));
        setInsertAt(insertIndex - 1);
        return;
      }
      case 'Delete': {
        if (text || insertIndex >= value.length) return;
        event.preventDefault();
        onChange(value.filter((_, index) => index !== insertIndex));
        return;
      }
      case 'Escape': {
        if (!isOpen) return;
        // Only the list closes: the editor's own Escape handling must not run too
        event.preventDefault();
        event.stopPropagation();
        setIsDismissed(true);
        return;
      }
    }
  };

  // mousedown, not click: preventing it keeps the focus (and the typed text) in the input
  const handleRootMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (disabled || event.target !== event.currentTarget) return;
    event.preventDefault();
    moveInput(value.length, 'end');
  };

  return (
    <Root
      ref={rootRef}
      className={disabled ? 'isDisabled' : undefined}
      onMouseDown={handleRootMouseDown}
    >
      {value.map((name, index) => (
        <CharacterTag
          key={name}
          style={{ order: index < insertIndex ? index : index + 1 }}
          color={colorByName.get(name) ?? ThemeColors.ACCENT1}
          variant={TTagVariant.PRIMARY}
          size={TTagSize.SMALL}
          onMouseDown={(event) => {
            if (disabled) return;
            event.preventDefault();
            moveInput(index + 1, 'end');
          }}
        >
          {name}
        </CharacterTag>
      ))}
      <InputSlot style={{ order: insertIndex }}>
        <Input
          ref={setEditableRef}
          contentEditable={disabled ? false : 'plaintext-only'}
          suppressContentEditableWarning
          spellCheck={false}
          autoCorrect="off"
          onInput={handleInput}
          onPaste={handlePaste}
          onDrop={(event) => event.preventDefault()}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (disabled) return;
            setIsFocused(true);
            onFocus?.();
          }}
          onBlur={() => {
            setIsFocused(false);
            // Leaving with a name typed adds it, as Enter would
            if (query.trim()) addCharacter(query);
          }}
        />
        {typeahead && <Typeahead aria-hidden>{typeahead}</Typeahead>}
      </InputSlot>
      {isOpen && anchor && (
        <TextSuggestionBlock anchor={anchor} placements={PLACEMENTS}>
          <Scroller>
            <TextSuggestionList>
              {suggestions.map((character) => {
                const isActive = character === activeSuggestion;
                return (
                  <li key={character.name}>
                    <ListItem
                      ref={isActive ? activeItemRef : undefined}
                      color={character.color}
                      isActive={isActive}
                      tabIndex={-1}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => addCharacter(character.name)}
                    >
                      {character.name}
                    </ListItem>
                  </li>
                );
              })}
            </TextSuggestionList>
          </Scroller>
        </TextSuggestionBlock>
      )}
    </Root>
  );
}
