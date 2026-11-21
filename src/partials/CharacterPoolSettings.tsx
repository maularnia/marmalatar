import { ai } from '@src/services/ai';
import { editor, projects } from '@src/services/project';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import { TColor } from '@src/theme/definitions';
import { TCharacter } from '@src/types';
import { useAppSelectors } from '@store/hooks';
import Button from '@ui-toolkit/Button/Button';
import { TButtonSize, TButtonVariant } from '@ui-toolkit/Button/types';
import { FormsRow, FormsSection, FormsSectionContent, FormsSectionTitle } from '@ui-toolkit/forms';
import { TIcon } from '@ui-toolkit/Icon/icons';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import Tooltip, { TooltipSimple } from '@ui-toolkit/Tooltip';
import { getCaretOffset, setCaretOffset } from '@ui-toolkit/TinyDivEditor/caret';
import {
  normalizeCharacterName,
  sanitizeCharacterName,
  splitCharacterName,
} from '@utils/characterName';
import {
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';

const Pool = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${CSSVar('mainTableCharacterSelectorSpacingInnerX')};
  padding: ${CSSVar('mainTableLineCellSpacingY')} ${CSSVar('mainTableLineCellSpacingX')};
  border-radius: ${CSSVar('inputBorderRadius')};

  &:focus-within {
    background: ${CSSVar('mainTableLineCellBgFocus')};
  }

  /* The tag being edited stands out from the rest */
  & > * {
    opacity: 0.8;
    transition: opacity 0.1s ease;
  }

  & > *:focus-within {
    opacity: 1;
  }
`;

const EditableName = styled.span`
  display: inline-block;
  min-width: 1ch;
  outline: none;
  cursor: text;
  white-space: pre;
`;

type TCharacterPoolTagProps = {
  character: TCharacter;
  disabled: boolean;
  /** Registers the editable and its save, for the caret to travel between tags and for the
   * section's Save button */
  registerTag: (tag: { el: HTMLSpanElement; save: () => Promise<void> } | null) => void;
  /** Resolves whether the character was changed. An empty `to` asks to remove the character, a
   * name another character has to merge into it; both are confirmed first. */
  onRename: (from: string, to: string) => Promise<boolean>;
  /** Whether the text differs from the character's name, i.e. there's a draft to save */
  onDirtyChange: (name: string, isDirty: boolean) => void;
  /** The tag taking the caret, with the colour it's drawn in, or leaving it (null) */
  onFocusChange: (name: string, color: TColor | null) => void;
  /** Left/Right at the text's edge: the caret goes on to the previous/next tag */
  onLeaveEdge: (direction: 'previous' | 'next') => void;
};

// One character as an editable tag. What's typed is a draft: nothing reaches the lines until Enter
// (or the section's Save button). Keyed by the character's name, so a draft survives other tags
// being saved; saving this one remounts it under its new name.
function CharacterPoolTag({
  character,
  disabled,
  registerTag,
  onRename,
  onDirtyChange,
  onFocusChange,
  onLeaveEdge,
}: TCharacterPoolTagProps) {
  const { t } = useTranslation('settings');
  const editableRef = useRef<HTMLSpanElement | null>(null);
  // The text is emptied: saving removes the character, which the tag shows
  const [isEmptied, setIsEmptied] = useState(false);
  // The text differs from the name: a draft waiting to be saved
  const [isChanged, setIsChanged] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const save = async () => {
    const text = normalizeCharacterName(editableRef.current?.textContent ?? '');
    if (text === character.name) return;
    const changed = await onRename(character.name, text);
    // Declined: the draft goes, the character keeps its name
    const el = editableRef.current;
    if (!changed && el) {
      el.textContent = character.name;
      onDirtyChange(character.name, false);
      setIsEmptied(false);
      setIsChanged(false);
    }
  };
  const saveRef = useRef(save);
  saveRef.current = save;

  // The Save button takes the colour of the tag being edited
  const displayColor = isEmptied ? ThemeColors.RED : character.color;
  useEffect(() => {
    if (!isFocused) return;
    const name = character.name;
    onFocusChange(name, displayColor);
    return () => onFocusChange(name, null);
  }, [isFocused, displayColor, character.name, onFocusChange]);

  // A tag that's gone (saved under a new name, merged, removed) takes its draft with it
  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;
  useEffect(() => {
    const name = character.name;
    return () => onDirtyChangeRef.current(name, false);
  }, [character.name]);

  const handleInput = () => {
    const el = editableRef.current;
    if (!el) return;
    const text = el.textContent ?? '';
    const allowed = sanitizeCharacterName(text, { allowSpaces: true, allowSlash: true });
    if (allowed !== text) {
      const caret = getCaretOffset(el) ?? text.length;
      el.textContent = allowed;
      setCaretOffset(el, Math.max(0, caret - (text.length - allowed.length)));
    }
    onDirtyChange(character.name, normalizeCharacterName(allowed) !== character.name);
    setIsEmptied(normalizeCharacterName(allowed) === '');
    setIsChanged(normalizeCharacterName(allowed) !== character.name);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    const el = editableRef.current;
    if (!el) return;
    // The slash cuts the name at the caret into two characters, at once. It's the physical key,
    // whatever the layout: on a Cyrillic one it types a dot or a comma, so `key` can't be trusted
    // (as with shortcuts, see getLatinKey). Nothing to cut at the text's ends, so nothing happens.
    if (
      event.code === 'Slash' &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey
    ) {
      event.preventDefault();
      const text = el.textContent ?? '';
      const start = getCaretOffset(el) ?? text.length;
      const end = start + (window.getSelection()?.toString().length ?? 0);
      const before = normalizeCharacterName(text.slice(0, start));
      const after = normalizeCharacterName(text.slice(end));
      if (before && after) void onRename(character.name, `${before}/${after}`);
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      void save();
      return;
    }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (window.getSelection()?.toString()) return;
    const caret = getCaretOffset(el) ?? 0;
    if (event.key === 'ArrowLeft' && caret === 0) {
      event.preventDefault();
      onLeaveEdge('previous');
    } else if (event.key === 'ArrowRight' && caret >= (el.textContent ?? '').length) {
      event.preventDefault();
      onLeaveEdge('next');
    }
  };

  const setRefs = (el: HTMLSpanElement | null) => {
    editableRef.current = el;
    registerTag(el ? { el, save: () => saveRef.current() } : null);
  };

  return (
    <Tooltip
      // Emptied: Enter deletes. Changed, with the caret inside: Enter saves.
      forceOpen={isEmptied || (isChanged && isFocused)}
      side="bottom"
      label={
        <TooltipSimple>
          {t(isEmptied ? 'characterPool.deleteHint' : 'characterPool.saveHint')}
        </TooltipSimple>
      }
    >
      <Tag
        // Red and bordered while saving would delete it; the colour is the character's otherwise
        color={displayColor}
        variant={isEmptied ? TTagVariant.SECONDARY : TTagVariant.PRIMARY}
        size={TTagSize.SMALL}
        // A changed tag glows in its own colour and is never dimmed like the idle ones
        style={isChanged ? { opacity: 1, boxShadow: '0 0 10px 1px var(--tag-color)' } : undefined}
      >
        <EditableName
          ref={setRefs}
          contentEditable={disabled ? false : 'plaintext-only'}
          suppressContentEditableWarning
          spellCheck={false}
          autoCorrect="off"
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            // Leaving tidies the draft: double spaces and spaces at the ends go
            const el = editableRef.current;
            if (!el) return;
            const text = el.textContent ?? '';
            const tidy = normalizeCharacterName(text);
            if (tidy !== text) el.textContent = tidy;
          }}
          onDrop={(event) => event.preventDefault()}
        >
          {character.name}
        </EditableName>
      </Tag>
    </Tooltip>
  );
}

function focusAtEdge(el: HTMLSpanElement | null | undefined, edge: 'start' | 'end') {
  if (!el) return;
  el.focus();
  setCaretOffset(el, edge === 'start' ? 0 : (el.textContent ?? '').length);
}

// The open project's characters, each an editable tag in its own colour: renaming one changes its
// spelling in every line. Characters can't be added here -- they come from the lines. The one
// implementation, mounted by the Settings overlay's Project tab and by the editor aside; it must
// stay self-contained (no props).
export default function CharacterPoolSettings() {
  const { t } = useTranslation('settings');
  const [pool, isProjectOpen, isAiBusy] = useAppSelectors(
    editor.selectCharacterPool,
    projects.selectIsOpen,
    ai.selectIsBusy
  );
  // The tags' editables and saves by character name, in pool order
  const tagsRef = useRef(new Map<string, { el: HTMLSpanElement; save: () => Promise<void> }>());
  // After a change the tags are new elements (a renamed one is keyed by its new name): the caret
  // goes to the tag the character now has, or to the pool's last one when it's gone (merged into
  // another, removed). `name: null` is the last tag.
  const focusTargetRef = useRef<{ name: string | null } | null>(null);
  // Tags (by name) holding a draft, which is what the Save button is for
  // The tag with the caret in it, and the colour it's drawn in
  const [focusedTag, setFocusedTag] = useState<{ name: string; color: TColor } | null>(null);
  const handleFocusChange = useCallback((name: string, color: TColor | null) => {
    setFocusedTag((current) => (color ? { name, color } : current?.name === name ? null : current));
  }, []);
  const [dirtyNames, setDirtyNames] = useState<ReadonlySet<string>>(() => new Set());
  const setDirty = (name: string, isDirty: boolean) =>
    setDirtyNames((names) => {
      if (names.has(name) === isDirty) return names;
      const next = new Set(names);
      if (isDirty) next.add(name);
      else next.delete(name);
      return next;
    });

  useLayoutEffect(() => {
    const target = focusTargetRef.current;
    if (!target) return;
    focusTargetRef.current = null;
    const name = target.name ?? pool[pool.length - 1]?.name ?? '';
    focusAtEdge(tagsRef.current.get(name)?.el, 'end');
  }, [pool]);

  if (!isProjectOpen || pool.length === 0) return null;

  const rename = async (from: string, to: string) => {
    // Set before saving: the pool changes (and the effect above runs) while the call is still
    // resolving, so it would be too late afterwards. A rename and a split leave the (first) new
    // name as a tag; a merge into an existing character or a removal leave none to return to.
    const [first, ...others] = splitCharacterName(to);
    const keepsTag =
      first !== undefined && (others.length > 0 || !pool.some((c) => c.name === first));
    focusTargetRef.current = { name: keepsTag ? first : null };
    const changed = await editor.saveCharacterName(from, to);
    if (!changed) focusTargetRef.current = null;
    return changed;
  };
  const saveAll = async () => {
    // A snapshot, one at a time: saving can merge tags away, and each may ask first
    for (const tag of [...tagsRef.current.values()]) await tag.save();
  };
  // A click on the empty part of the area (between or after the tags) puts the caret in the
  // nearest tag, at its end -- mousedown, so the click doesn't drop the focus first
  const handleAreaMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || isAiBusy) return;
    event.preventDefault();
    let nearest: HTMLSpanElement | null = null;
    let nearestDistance = Infinity;
    for (const { el } of tagsRef.current.values()) {
      const rect = el.getBoundingClientRect();
      const dx = Math.max(rect.left - event.clientX, 0, event.clientX - rect.right);
      const dy = Math.max(rect.top - event.clientY, 0, event.clientY - rect.bottom);
      const distance = Math.hypot(dx, dy);
      if (distance < nearestDistance) {
        nearest = el;
        nearestDistance = distance;
      }
    }
    focusAtEdge(nearest, 'end');
  };
  const moveCaret = (index: number, edge: 'start' | 'end') =>
    focusAtEdge(tagsRef.current.get(pool[index]?.name ?? '')?.el, edge);

  return (
    <FormsRow animated>
      <FormsSection animated>
        <FormsSectionTitle
          icon={TIcon.PERSON}
          after={
            <Button
              type="button"
              size={TButtonSize.SMALL}
              variant={dirtyNames.size > 0 ? TButtonVariant.PRIMARY : TButtonVariant.SECONDARY}
              // With changes pending: the colour of the changed tag being edited, accent otherwise
              color={
                dirtyNames.size === 0
                  ? undefined
                  : focusedTag && dirtyNames.has(focusedTag.name)
                    ? focusedTag.color
                    : ThemeColors.ACCENT1
              }
              disabled={isAiBusy}
              onClick={saveAll}
            >
              {t('characterPool.save')}
            </Button>
          }
        >
          {t('characterPool.title')}
        </FormsSectionTitle>
        <FormsSectionContent>
          <Pool onMouseDown={handleAreaMouseDown}>
            {pool.map((character, index) => (
              <CharacterPoolTag
                key={character.name}
                character={character}
                disabled={isAiBusy}
                registerTag={(tag) => {
                  if (tag) tagsRef.current.set(character.name, tag);
                  else tagsRef.current.delete(character.name);
                }}
                onRename={rename}
                onDirtyChange={setDirty}
                onFocusChange={handleFocusChange}
                onLeaveEdge={(direction) =>
                  direction === 'previous'
                    ? moveCaret(index - 1, 'end')
                    : moveCaret(index + 1, 'start')
                }
              />
            ))}
          </Pool>
        </FormsSectionContent>
      </FormsSection>
    </FormsRow>
  );
}
