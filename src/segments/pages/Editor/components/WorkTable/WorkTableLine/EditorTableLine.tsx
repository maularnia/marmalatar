import { useAppSelector, useAppSelectors } from '@store/hooks';
import { media } from '@src/services/media';
import { KeystrokeZoneContext } from '@src/layout/components/KeystrokeZone/KeystrokeZone';
import { editor } from '@src/services/project';
import { projects } from '@src/services/project';
import { TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import { LogoLoader } from '@src/toolkit/LogoLoader';
import { TCharacter } from '@src/types';
import { ai } from '@src/services/ai';
import { settings } from '@src/services/settings';
import Icon from '@ui-toolkit/Icon/Icon';
import { TIcon, TIconSize } from '@ui-toolkit/Icon/icons';
import P from '@ui-toolkit/P';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import { TinyDivEditor } from '@ui-toolkit/TinyDivEditor/TinyDivEditor';
import { parseCharacterList, serializeCharacterList } from '@utils/characters';
import { passesTempo } from '@utils/tempo';
import classNames from 'classnames';
import { type ClipboardEvent, use, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { CharacterSelector } from './CharacterSelector/CharacterSelector';

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
}: EditorTableLineProps) {
  const { t } = useTranslation('editor');
  const { zoneRef } = use(KeystrokeZoneContext);
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
    (state) => editor.selectTempoTimingIssues(state)[lineIndex] ?? false
  );
  // Each row checks itself against the project's limits on every render, so it follows both the
  // text (once the editor commits it) and a settings change at once. The column measured is the
  // one being edited in the current mode.
  const isTempoFailed =
    tempo.enabled &&
    (hasTimingIssue ||
      !passesTempo(isEditMode ? sourceText : translatedText, startTime, endTime, tempo));
  // A frozen line (being translated) never shows it
  const showTempoError = isTempoFailed && !isFrozen;

  const updateSourceSelection = () => {
    const input = sourceInputRef.current;
    if (!input) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      editor.setTextSelection('');
      return;
    }
    const range = selection.getRangeAt(0);
    if (!input.contains(range.commonAncestorContainer)) {
      editor.setTextSelection('');
      return;
    }
    editor.setTextSelection(selection.toString());
  };

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

  const updateSplitCursor = () => {
    const focusedColumn = editor.get.focusedColumn();
    const input =
      focusedColumn === 'output'
        ? translatedInputRef.current
        : focusedColumn === 'source'
          ? sourceInputRef.current
          : null;

    if (!input) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (!input.contains(range.startContainer)) return;
    const preRange = document.createRange();
    preRange.selectNodeContents(input);
    preRange.setEnd(range.startContainer, range.startOffset);
    editor.setSplitCursor(preRange.toString().length);
  };

  const characterInputRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    editor.registerLineInput(lineIndex, 'source', sourceInputRef.current);
    editor.registerLineInput(lineIndex, 'output', translatedInputRef.current);
    editor.registerLineInput(lineIndex, 'character', characterInputRef.current);
    // Seeds the editor zone's fallback focus target with line 0's output column -- kept fresh on
    // every (re)mount of that specific row, including a full remount on project switch.
    if (lineIndex === 0) zoneRef.current = translatedInputRef.current;
    return () => {
      editor.registerLineInput(lineIndex, 'source', null);
      editor.registerLineInput(lineIndex, 'output', null);
      editor.registerLineInput(lineIndex, 'character', null);
    };
  }, [lineIndex, isEditMode, zoneRef]);

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
            checkSpelling={checkGrammar}
            contentEditable={!isTranslationBusy}
            suppressContentEditableWarning
            data-role="source-input"
            data-line-no={lineNo}
            onFocus={() => {
              onFocus();
              editor.focusLine(lineIndex, 'source');
            }}
            onClick={() => {
              updateSplitCursor();
            }}
            onSelect={() => {
              updateSourceSelection();
              updateSplitCursor();
            }}
            onKeyUp={() => {
              updateSourceSelection();
              updateSplitCursor();
            }}
            onMouseUp={() => {
              updateSourceSelection();
              updateSplitCursor();
            }}
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
        <LineCell onBlur={() => editor.focusLine(null)}>
          <CharacterSelector
            inputRef={characterInputRef}
            characters={characterOptions}
            onFocus={() => {
              onFocus();
              editor.focusLine(lineIndex, 'character');
            }}
            value={selectedCharacters}
            disabled={isTranslationBusy}
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
              checkSpelling={checkGrammar}
              contentEditable={!isTranslationBusy}
              suppressContentEditableWarning
              data-role="translation-input"
              data-line-no={lineNo}
              onFocus={() => {
                onFocus();
                editor.focusLine(lineIndex, 'output');
              }}
              onClick={() => {
                updateSplitCursor();
              }}
              onKeyUp={updateSplitCursor}
              onSelect={updateSplitCursor}
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
