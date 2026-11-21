import { ai } from '@src/services/ai';
import { editor, projects } from '@src/services/project';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import { TCharacter } from '@src/types';
import { useAppSelectors } from '@store/hooks';
import Button from '@ui-toolkit/Button/Button';
import { TButtonSize, TButtonVariant } from '@ui-toolkit/Button/types';
import { FormsRow, FormsSection, FormsSectionContent, FormsSectionTitle } from '@ui-toolkit/forms';
import { TIcon } from '@ui-toolkit/Icon/icons';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import Tooltip, { TooltipSimple } from '@ui-toolkit/Tooltip';
import { getCaretOffset, setCaretOffset } from '@ui-toolkit/TinyDivEditor/caret';
import { normalizeCharacterName, sanitizeCharacterName } from '@utils/characterName';
import {
  type KeyboardEvent,
  type MouseEvent,
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
  /** `viaEnter`: the caret should follow the character to its new tag */
  /** Resolves whether the character was changed. An empty `to` asks to remove the character, a
   * name another character has to merge into it; both are confirmed first. */
  onRename: (from: string, to: string, viaEnter: boolean) => Promise<boolean>;
  /** Whether the text differs from the character's name, i.e. there's a draft to save */
  onDirtyChange: (name: string, isDirty: boolean) => void;
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
  onLeaveEdge,
}: TCharacterPoolTagProps) {
  const { t } = useTranslation('settings');
  const editableRef = useRef<HTMLSpanElement | null>(null);
  // The text is emptied: saving removes the character, which the tag shows
  const [isEmptied, setIsEmptied] = useState(false);

  const save = async (viaEnter = false) => {
    const text = normalizeCharacterName(editableRef.current?.textContent ?? '');
    if (text === character.name) return;
    const changed = await onRename(character.name, text, viaEnter);
    // Declined: the draft goes, the character keeps its name
    const el = editableRef.current;
    if (!changed && el) {
      el.textContent = character.name;
      onDirtyChange(character.name, false);
      setIsEmptied(false);
    }
  };
  const saveRef = useRef(save);
  saveRef.current = save;

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
    const allowed = sanitizeCharacterName(text, true);
    if (allowed !== text) {
      const caret = getCaretOffset(el) ?? text.length;
      el.textContent = allowed;
      setCaretOffset(el, Math.max(0, caret - (text.length - allowed.length)));
    }
    onDirtyChange(character.name, normalizeCharacterName(allowed) !== character.name);
    setIsEmptied(normalizeCharacterName(allowed) === '');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    const el = editableRef.current;
    if (!el || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      void save(true);
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
      forceOpen={isEmptied}
      side="bottom"
      label={<TooltipSimple>{t('characterPool.deleteHint')}</TooltipSimple>}
    >
      <Tag
        // Red and bordered while saving would delete it; the colour is the character's otherwise
        color={isEmptied ? ThemeColors.RED : character.color}
        variant={isEmptied ? TTagVariant.SECONDARY : TTagVariant.PRIMARY}
        size={TTagSize.SMALL}
      >
        <EditableName
          ref={setRefs}
          contentEditable={disabled ? false : 'plaintext-only'}
          suppressContentEditableWarning
          spellCheck={false}
          autoCorrect="off"
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={() => {
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
  // After a rename with Enter the tag is a new element under the new name: the caret follows it
  const focusNameRef = useRef<string | null>(null);
  // Tags (by name) holding a draft, which is what the Save button is for
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
    const name = focusNameRef.current;
    if (!name) return;
    focusNameRef.current = null;
    focusAtEdge(tagsRef.current.get(name)?.el, 'end');
  }, [pool]);

  if (!isProjectOpen || pool.length === 0) return null;

  const rename = async (from: string, to: string, viaEnter: boolean) => {
    const changed = await editor.saveCharacterName(from, to);
    if (changed && viaEnter && to.trim()) focusNameRef.current = to.trim();
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
          subtext={t('characterPool.hint')}
          after={
            <Button
              type="button"
              size={TButtonSize.SMALL}
              variant={dirtyNames.size > 0 ? TButtonVariant.PRIMARY : TButtonVariant.SECONDARY}
              color={dirtyNames.size > 0 ? ThemeColors.ACCENT1 : undefined}
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
