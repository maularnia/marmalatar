import { spellcheck } from '@src/services/spellcheck';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import { useAppSelector } from '@store/hooks';
import Hr from '@ui-toolkit/Hr/Hr';
import { TIcon } from '@ui-toolkit/Icon/icons';
import { ListItem } from '@ui-toolkit/ListItem';
import { LogoLoader } from '@ui-toolkit/LogoLoader';
import { type CSSProperties, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import type { TDictionaryTarget } from './useSpellchecker';

// The panel opens as soon as the caret settles on a mark, before the suggestions arrive: LOADING
// until they do, then READY, or EMPTY when the dictionary has none for the word
export enum TSuggestionsStatus {
  LOADING = 'loading',
  READY = 'ready',
  EMPTY = 'empty',
}

type TSpellcheckOptionsProps = {
  status: TSuggestionsStatus;
  /** In display order: the panel usually opens above the word, so the caller puts the best guess last,
   * next to the word */
  suggestions: readonly string[];
  /** Viewport coordinates of the word: the panel is fixed (the editor portals it) */
  top: number;
  bottom: number;
  left: number;
  /** A dictionary item was clicked or confirmed with Enter; the caller knows the word */
  onAddToDictionary: (target: TDictionaryTarget) => void;
  onApplySuggestion: (suggestion: string) => void;
  /** Escape */
  onDismiss: () => void;
};

const Panel = styled.div`
  position: fixed;
  z-index: 1000;
  min-width: 120px;
  font-family: ${CSSVar('fontTextSansSerif')};
  font-size: ${CSSVar('tooltipFontSize')};
  border-radius: ${CSSVar('tooltipBorderRadius')};
  background: ${CSSVar('tooltipBg')};
  backdrop-filter: ${CSSVar('tooltipBackdropFilter')};
  color: ${CSSVar('tooltipColor')};
  padding: ${CSSVar('tooltipSpacingY')} ${CSSVar('tooltipSpacingX')};
`;

// Gap between the word and the panel when it opens to the side
const SIDE_GAP = 4;

// Above the word by default; to its left (tops level) when it doesn't fit above the viewport's top;
// below the word when it fits on neither side. Null until the panel has been measured.
type TPlacement = 'above' | 'left' | 'below';

const getPlacementStyle = (
  placement: TPlacement | null,
  { top, bottom, left }: { top: number; bottom: number; left: number }
): CSSProperties => {
  switch (placement) {
    case 'above':
      return { top, left, transform: 'translateY(-100%)' };
    case 'left':
      return { top, left: left - SIDE_GAP, transform: 'translateX(-100%)' };
    case 'below':
      return { top: bottom, left };
    default:
      // Laid out for measuring, but not shown yet
      return { top, left, visibility: 'hidden' };
  }
};

const List = styled.div`
  display: flex;
  flex-direction: column;
`;

// The popup for a misspelled word: the dictionaries it can be added to, then the suggestions. It
// owns the highlight and the keys that move it; which word, and where the panel sits, is the
// caller's. Mount it per word (key it by the mark) so the highlight starts fresh.
export function SpellcheckOptions({
  status,
  suggestions,
  top,
  bottom,
  left,
  onAddToDictionary,
  onApplySuggestion,
  onDismiss,
}: TSpellcheckOptionsProps) {
  const { t } = useTranslation('editor');
  // The project's dictionary is offered only while a project is open
  const canAddToProject = useAppSelector(spellcheck.selectCanAddToProjectDictionary);
  const dictionaryTargets = useMemo<TDictionaryTarget[]>(
    () => (canAddToProject ? ['project', 'global'] : ['global']),
    [canAddToProject]
  );
  // The highlight is an index into one list: the dictionary items, then the suggestions. Until
  // the user moves it, it follows the suggestions: nothing while they load or when there are none
  // (-1: Enter stays a plain Enter), then the best guess -- last, next to the word. A dictionary
  // item highlighted while they loaded stays highlighted (those come first, so its index holds)
  const [chosenIndex, setChosenIndex] = useState<number | null>(null);
  const count = dictionaryTargets.length + suggestions.length;
  const activeIndex = chosenIndex ?? (status === TSuggestionsStatus.READY ? count - 1 : -1);

  // The panel's size changes with its content (loading, then the suggestions), so the placement is
  // picked again whenever that or the word's position changes. Measured before paint, so the panel
  // never flashes in the wrong place; transforms don't affect offsetWidth/offsetHeight.
  const panelRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<TPlacement | null>(null);
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const fitsAbove = top - panel.offsetHeight >= 0;
    const fitsLeft = left - SIDE_GAP - panel.offsetWidth >= 0;
    setPlacement(fitsAbove ? 'above' : fitsLeft ? 'left' : 'below');
  }, [top, left, status, suggestions, dictionaryTargets]);

  // The editor keeps the focus (and the caret in the word), so the keys are read on `document`:
  // arrows cycle the list and Enter activates the highlighted item, overriding the
  // contentEditable's caret movement / newline for those keys
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onDismiss();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setChosenIndex((activeIndex + 1) % count);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setChosenIndex(activeIndex <= 0 ? count - 1 : activeIndex - 1);
      } else if (event.key === 'Enter' && activeIndex >= 0) {
        event.preventDefault();
        if (activeIndex < dictionaryTargets.length) {
          onAddToDictionary(dictionaryTargets[activeIndex]);
        } else {
          onApplySuggestion(suggestions[activeIndex - dictionaryTargets.length]);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    activeIndex,
    count,
    dictionaryTargets,
    suggestions,
    onAddToDictionary,
    onApplySuggestion,
    onDismiss,
  ]);

  // mousedown on an item would move the focus off the editor, which closes the panel
  const keepEditorFocus = (event: React.MouseEvent) => event.preventDefault();

  return (
    <Panel ref={panelRef} style={getPlacementStyle(placement, { top, bottom, left })}>
      <List>
        {dictionaryTargets.map((target, index) => (
          <li key={target}>
            <ListItem
              icon={TIcon.PLUS}
              color={ThemeColors.ACCENT1}
              isActive={index === activeIndex}
              onMouseDown={keepEditorFocus}
              onClick={() => onAddToDictionary(target)}
            >
              {target === 'project' ? t('spellcheck.addToProject') : t('spellcheck.addToGlobal')}
            </ListItem>
          </li>
        ))}
        <li>
          <Hr />
        </li>
        {status === TSuggestionsStatus.LOADING && (
          <li>
            <ListItem isDisabled emoji={<LogoLoader size={16} />} onMouseDown={keepEditorFocus}>
              {t('spellcheck.loadingSuggestions')}
            </ListItem>
          </li>
        )}
        {status === TSuggestionsStatus.EMPTY && (
          <li>
            <ListItem isDisabled onMouseDown={keepEditorFocus}>
              {t('spellcheck.noSuggestions')}
            </ListItem>
          </li>
        )}
        {suggestions.map((suggestion, index) => (
          <li key={suggestion}>
            <ListItem
              isActive={dictionaryTargets.length + index === activeIndex}
              onMouseDown={keepEditorFocus}
              onClick={() => onApplySuggestion(suggestion)}
            >
              {suggestion}
            </ListItem>
          </li>
        ))}
      </List>
    </Panel>
  );
}
