import { useAppSelector, useAppSelectors } from '@store/hooks';
import { media } from '@src/services/media';
import { editor } from '@src/services/project';
import { projects } from '@src/services/project';
import { TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import { LogoLoader } from '@src/toolkit/LogoLoader';
import { TCharacter, TInputColumn } from '@src/types';
import { ai } from '@src/services/ai';
import { settings } from '@src/services/settings';
import Icon from '@ui-toolkit/Icon/Icon';
import { TIcon, TIconSize } from '@ui-toolkit/Icon/icons';
import P from '@ui-toolkit/P';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import { TinyDivEditor, type TCustomMark } from '@ui-toolkit/TinyDivEditor/TinyDivEditor';
import type { TTextRange } from '@utils/findMatches';
import { isCaretOnEdgeLine } from '@utils/contentEditable';
import { parseCharacterList, serializeCharacterList } from '@utils/characters';
import { passesTempo } from '@utils/tempo';
import classNames from 'classnames';
import {
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { CharacterSelector } from './CharacterSelector/CharacterSelector';

type TTextColumn = 'source' | 'output';

/** What a row does with its inputs, which depends on the table showing it: the main table hands
 * them to the editor (its registry, focus and navigation), Find & Replace to its own. The row only
 * calls these; it never reaches either service's focus or refs itself. */
export type TLineRowController = {
  /** The row's inputs as they mount (`el`) and unmount (`null`) */
  registerInput: (column: TInputColumn, el: HTMLElement | null) => void;
  /** An input got DOM focus: sync the owner's focused line and column */
  onInputFocus: (column: TInputColumn) => void;
  /** Focus left the row's character cell */
  onInputBlur: () => void;
  /** Up/Down on an input's first/last visual line: go to the previous/next row. Returns whether
   * there was one to go to */
  navigateFromEdge: (direction: 'up' | 'down') => boolean;
  /** The caret or selection moved inside a text input */
  onSelectionChange?: (column: TTextColumn, input: HTMLElement) => void;
};

type EditorTableLineProps = {
  lineNo: number;
  lineIndex: number;
  sourceText: string;
  translatedText: string;
  startTime: number;
  endTime: number;
  character: string;
  characterOptions: TCharacter[];
  onMeasure: (height: number) => void;
  isFrozen: boolean;
  isCompleted: boolean;
  onFocus: () => void;
  onCharacterChange: (character: string) => void;
  onOutputTextChange: (text: string) => void;
  onSourceTextChange: (text: string) => void;
  controller: TLineRowController;
  /** Spellcheck the text columns (when the setting has it on). Defaults to true */
  allowSpellcheck?: boolean;
  /** Checks the line against the project's tempo limits, showing a failure (red line number, flag,
   * row state). Off, no check runs at all. Defaults to true */
  checkTempo?: boolean;
  /** Shows the character selector disabled: no focus, no edits */
  isCharacterDisabled?: boolean;
  /** Highlights in the text columns, as ranges of `sourceText` / `translatedText` */
  sourceMarks?: TTextRange[];
  outputMarks?: TTextRange[];
  /** A tooltip for the highlight the caret is in */
  markTooltip?: (column: TTextColumn, mark: TCustomMark) => ReactNode;
  /** A keydown while the caret is in one of the highlights, with that highlight */
  onMarkKeyDown?: (
    column: TTextColumn,
    event: KeyboardEvent<HTMLDivElement>,
    mark: TCustomMark
  ) => void;
};

// As wide as the project's longest line number needs (--line-number-width, set by the Editor page
// for the whole table), so every row's text starts at the same place; the tag is centred in it
const LineNumber = styled.div`
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: var(--line-number-width);
  position: relative;
  left: 0;
  transition: opacity 0.2s ease;
`;
// A line breaking a tempo limit, completed or not: a small red flag right after its number, in
// the room the line number column keeps for it
const ErrorFlag = styled(Icon)`
  color: ${CSSColor(ThemeColors.RED, TShade.DEFAULT, 100)};
`;

const LineCellContent = styled(TinyDivEditor)`
  padding: ${CSSVar('mainTableLineCellSpacingY')} ${CSSVar('mainTableLineCellSpacingX')};
  min-height: 100%;
  cursor: inherit;
  flex-basis: 100%;
  font-family: ${CSSVar('fontTextSansSerif')};
  font-size: ${CSSVar('mainTableTextSize')};
  font-weight: calc(${CSSVar('mainTableTextSize')} * 1.2);
  border-radius: ${CSSVar('inputBorderRadius')};
  color: ${CSSVar('mainTableLineColor')};
  white-space: pre-wrap;

  &:hover {
    background: ${CSSVar('mainTableLineCellBgHover')};
  }

  &:focus,
  &:focus-within {
    background: ${CSSVar('mainTableLineCellBgFocus')};
  }

  &[contenteditable] {
    outline: none;
  }
`;

const LineCell = styled.div`
  position: relative;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
`;

const NumberLineCell = styled(LineCell)`
  padding: 0;
`;

const LineContent = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: var(--current-grid-template);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
`;

const AIThinkingMessage = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  gap: ${CSSVar('mainTableLineCellSpacingX')};
  padding: ${CSSVar('mainTableLineCellSpacingY')} ${CSSVar('mainTableLineCellSpacingX')};
  color: ${CSSVar('mainTableLineColorFocus')};
`;

// A row styles only its own state: completed, frozen, breaking a tempo limit. What moves between
// rows -- the playing line, the focused line, merge candidates -- is drawn by shared backdrops under
// the rows (../LineBackdrops), so a row never re-renders for those.
const Line = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${CSSVar('mainTableLineCellSpacingY')};
  padding: 0 0 ${CSSVar('mainTableLineSpacing')};
  opacity: ${CSSVar('mainTableLineOpacity')};
  border-radius: ${CSSVar('mainTableLineRadius')};
  /* The state background stops short of the gap below the row, like the backdrops do */
  background-clip: content-box;

  @keyframes frozenShimmer {
    from {
      background-position-x: -100%;
    }
    to {
      background-position-x: 200%;
    }
  }

  &.isCompleted {
    opacity: ${CSSVar('mainTableLineOpacityCompleted')};

    ${LineCellContent} {
      color: ${CSSVar('mainTableLineColorCompleted')};
    }
  }

  /* Being translated by the AI: its own background and blur, and a shimmer running across it (a
     pseudo-element under the content, clipped to the row's rounded shape) */
  &.isFrozen {
    opacity: ${CSSVar('mainTableLineOpacityFrozen')};
    background: radial-gradient(
      circle at center bottom,
      ${CSSVar('mainTableLineBgFrozen')} 0%,
      transparent 150%
    );
    background-clip: content-box;
    backdrop-filter: ${CSSVar('mainTableLineFilterFrozen')};

    &::before {
      content: '';
      position: absolute;
      inset: 0 0 ${CSSVar('mainTableLineSpacing')};
      border-radius: inherit;
      pointer-events: none;
      background: radial-gradient(
          circle at center,
          ${CSSColor(ThemeColors.TEXT, TShade.DEFAULT, 5)} 0%,
          transparent 70%
        )
        no-repeat;
      background-size: 50% 100%;
      animation: frozenShimmer 1s linear infinite;
    }

    ${LineCellContent} {
      color: ${CSSVar('mainTableLineColorFrozen')};
    }
  }
`;

function handlePlainTextPaste(event: ClipboardEvent<HTMLDivElement>) {
  event.preventDefault();
  // execCommand is deprecated, but remains the only way to insert plain text
  // with the same native line-splitting behavior as typing/Enter in Chromium
  // (this app only ever runs in a bundled Electron/Chromium shell).
  document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
}

export default function EditorTableLine({
  onMeasure,
  lineNo,
  lineIndex,
  sourceText,
  translatedText,
  startTime,
  endTime,
  character,
  characterOptions,
  isFrozen,
  isCompleted,
  onFocus,
  onCharacterChange,
  onOutputTextChange,
  onSourceTextChange,
  controller,
  allowSpellcheck = true,
  checkTempo = true,
  isCharacterDisabled = false,
  sourceMarks,
  outputMarks,
  onMarkKeyDown,
  markTooltip,
}: EditorTableLineProps) {
  const { t } = useTranslation('editor');
  // The register effect below reads it through a ref: it must not re-run for a new controller
  // object (unregistering a focused input would make the editor refocus it, caret at the end).
  // Handlers are rebuilt every render, so they use the prop itself.
  const controllerRef = useRef(controller);
  controllerRef.current = controller;
  const [
    videoDurationMs,
    sourceLanguage,
    targetLanguage,
    isTranslationBusy,
    isEditMode,
    checkGrammar,
    tempo,
  ] = useAppSelectors(
    media.selectVideoDurationMs,
    projects.selectSourceLanguage,
    projects.selectTargetLanguage,
    ai.selectIsBusy,
    editor.selectIsEditMode,
    settings.selectCheckGrammar,
    projects.selectTempo
  );

  const isNegativeStart = startTime < 0;
  const isBeyondVideo =
    videoDurationMs != null && (startTime > videoDurationMs || endTime > videoDurationMs);
  // The rules between lines (too close to a neighbour, overlapping another line) depend on the
  // other lines, so they come from one memoized list the row indexes into. Its own subscription,
  // on purpose: the row then re-renders only when its flag flips, which is also what lets a row the
  // parent reuses from its render cache pick the change up.
  const hasTimingIssue = useAppSelector(
    (state) => checkTempo && (editor.selectTempoTimingIssues(state)[lineIndex] ?? false)
  );
  // Each row checks itself against the project's limits on every render, so it follows both the
  // text (once the editor commits it) and a settings change at once. The column measured is the
  // one being edited in the current mode.
  const isTempoFailed =
    checkTempo &&
    tempo.enabled &&
    (hasTimingIssue ||
      !passesTempo(isEditMode ? sourceText : translatedText, startTime, endTime, tempo));
  // A frozen line (being translated) never shows it
  const showTempoError = isTempoFailed && !isFrozen;

  const selectedCharacters = useMemo(() => parseCharacterList(character), [character]);

  const lineRef = useRef<HTMLDivElement>(null);
  const translatedInputRef = useRef<HTMLDivElement>(null);
  const sourceInputRef = useRef<HTMLDivElement>(null);
  const lineTextChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sourceTextChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let to: ReturnType<typeof setTimeout>;
    const measure = () => {
      const probe = lineRef.current?.offsetHeight ?? -1;
      if (probe >= 0) {
        onMeasure(probe);
      } else {
        to = setTimeout(measure, 20);
      }
    };
    measure();
    return () => clearTimeout(to);
  }, [onMeasure, translatedText, selectedCharacters]);

  useEffect(() => {
    return () => {
      if (lineTextChangeTimeoutRef.current) {
        clearTimeout(lineTextChangeTimeoutRef.current);
      }
      if (sourceTextChangeTimeoutRef.current) {
        clearTimeout(sourceTextChangeTimeoutRef.current);
      }
    };
  }, []);

  const reportSelection = (column: TTextColumn) => {
    const input = column === 'source' ? sourceInputRef.current : translatedInputRef.current;
    if (input) controller.onSelectionChange?.(column, input);
  };

  const characterInputRef = useRef<HTMLSpanElement>(null);

  // Up/Down on the first/last visual line of an input continue into the previous/next line's same
  // input, so alt+up/down isn't needed. Only plain keys, and only when there's a line to go to:
  // otherwise the browser's own caret movement stays.
  const handleEdgeNavigation = (event: KeyboardEvent<HTMLElement>) => {
    if (isTranslationBusy || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
      return;
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    const direction = event.key === 'ArrowUp' ? 'up' : 'down';
    if (!isCaretOnEdgeLine(event.currentTarget, direction)) return;
    if (controller.navigateFromEdge(direction)) event.preventDefault();
  };

  useEffect(() => {
    // The controller this registered with is the one to unregister from
    const rowController = controllerRef.current;
    rowController.registerInput('source', sourceInputRef.current);
    rowController.registerInput('output', translatedInputRef.current);
    rowController.registerInput('character', characterInputRef.current);
    return () => {
      rowController.registerInput('source', null);
      rowController.registerInput('output', null);
      rowController.registerInput('character', null);
    };
  }, [lineIndex, lineNo, isEditMode]);

  return (
    <Line
      ref={lineRef}
      className={classNames({
        isFrozen,
        isNegativeStart,
        isBeyondVideo,
        isCompleted,
        isTempoFailed,
      })}
    >
      <LineContent>
        <NumberLineCell style={{ cursor: 'text' }}>
          <LineNumber>
            {/* The line number carries the line's state: green when completed, red when it breaks
                a tempo limit -- which also shows a red flag right after it */}
            <Tag
              color={
                isCompleted
                  ? ThemeColors.GREEN
                  : showTempoError
                    ? ThemeColors.RED
                    : ThemeColors.TEXT
              }
              variant={TTagVariant.TRANSPARENT}
              size={TTagSize.SMALL}
            >
              {lineNo}
            </Tag>
            {showTempoError && <ErrorFlag icon={TIcon.FLAG} size={TIconSize.XS} />}
          </LineNumber>
          <LineCellContent
            className={'text-regular'}
            ref={sourceInputRef}
            value={sourceText}
            language={isTranslationBusy ? undefined : sourceLanguage}
            checkSpelling={checkGrammar && allowSpellcheck}
            customMarks={sourceMarks}
            onTagKeyDown={onMarkKeyDown && ((event, mark) => onMarkKeyDown('source', event, mark))}
            tagTooltip={markTooltip && ((mark) => markTooltip('source', mark))}
            contentEditable={!isTranslationBusy}
            suppressContentEditableWarning
            data-role="source-input"
            data-line-no={lineNo}
            onFocus={() => {
              onFocus();
              controller.onInputFocus('source');
            }}
            onClick={() => reportSelection('source')}
            onSelect={() => reportSelection('source')}
            onKeyDown={handleEdgeNavigation}
            onKeyUp={() => reportSelection('source')}
            onMouseUp={() => reportSelection('source')}
            onPaste={handlePlainTextPaste}
            onInput={(text) => {
              if (isTranslationBusy) return;
              if (sourceTextChangeTimeoutRef.current) {
                clearTimeout(sourceTextChangeTimeoutRef.current);
              }
              sourceTextChangeTimeoutRef.current = setTimeout(() => onSourceTextChange(text), 300);
            }}
          />
        </NumberLineCell>
        <LineCell onBlur={controller.onInputBlur}>
          <CharacterSelector
            inputRef={characterInputRef}
            onNavigate={controller.navigateFromEdge}
            characters={characterOptions}
            onFocus={() => {
              onFocus();
              controller.onInputFocus('character');
            }}
            value={selectedCharacters}
            disabled={isTranslationBusy || isCharacterDisabled}
            onChange={(value) => {
              if (lineTextChangeTimeoutRef.current) {
                clearTimeout(lineTextChangeTimeoutRef.current);
              }
              onCharacterChange(serializeCharacterList(value));
            }}
          />
        </LineCell>
        {!isEditMode && (
          <LineCell>
            {isFrozen && (
              <AIThinkingMessage>
                <LogoLoader size={16} />
                <P>{t('tableLine.aiThinking')}</P>
              </AIThinkingMessage>
            )}

            <LineCellContent
              className={'frozen-hidden'}
              ref={translatedInputRef}
              value={translatedText}
              language={isTranslationBusy ? undefined : targetLanguage}
              checkSpelling={checkGrammar && allowSpellcheck}
              customMarks={outputMarks}
              onTagKeyDown={
                onMarkKeyDown && ((event, mark) => onMarkKeyDown('output', event, mark))
              }
              tagTooltip={markTooltip && ((mark) => markTooltip('output', mark))}
              contentEditable={!isTranslationBusy}
              suppressContentEditableWarning
              data-role="translation-input"
              data-line-no={lineNo}
              onFocus={() => {
                onFocus();
                controller.onInputFocus('output');
              }}
              onClick={() => reportSelection('output')}
              onKeyDown={handleEdgeNavigation}
              onKeyUp={() => reportSelection('output')}
              onSelect={() => reportSelection('output')}
              onPaste={handlePlainTextPaste}
              onInput={(text) => {
                if (isTranslationBusy) return;
                if (lineTextChangeTimeoutRef.current) {
                  clearTimeout(lineTextChangeTimeoutRef.current);
                }
                lineTextChangeTimeoutRef.current = setTimeout(() => onOutputTextChange(text), 300);
              }}
            />
          </LineCell>
        )}
      </LineContent>
    </Line>
  );
}
