import { useEditorRefs } from '@providers/EditorRefsProvider';
import { useVideo } from '@providers/VideoProvider';
import { useKeystrokeZone } from '@src/layout/components/KeystrokeZone/KeystrokeZone';
import { selectFocusedColumn, setFocusedColumn, setTextSelection } from '@src/store/slices/editor';
import {
  selectIsEditMode,
  selectProjectSourceLanguage,
  selectProjectTargetLanguage,
} from '@src/store/slices/project';
import { TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import Tooltip, { TooltipComplex } from '@src/toolkit/Tooltip';
import { TCharacter } from '@src/types';
import { useAppDispatch } from '@store/hooks';
import { selectTranslationIsBusy } from '@store/slices/aiTranslation';
import { selectCheckGrammar } from '@store/slices/app';
import { fromCurrentStore } from '@store/store';
import Button from '@ui-toolkit/Button/Button';
import { TButtonSize, TButtonVariant } from '@ui-toolkit/Button/types';
import Icon from '@ui-toolkit/Icon/Icon';
import { TIcon, TIconSize } from '@ui-toolkit/Icon/icons';
import P from '@ui-toolkit/P';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import TinyDivEditor from '@ui-toolkit/TinyDivEditor';
import { parseCharacterList, serializeCharacterList } from '@utils/characters';
import classNames from 'classnames';
import { type ClipboardEvent, type ReactNode, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { CharacterSelector, CharacterSelectorHandle } from './CharacterSelector/CharacterSelector';

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
  isFocused: boolean;
  isActive: boolean;
  isMergeCandidate: boolean;
  isMergeMaster: boolean;
  isFrozen: boolean;
  isCompleted: boolean;
  onFocus: () => void;
  onCharacterChange: (character: string) => void;
  onOutputTextChange: (text: string) => void;
  onSourceTextChange: (text: string) => void;
  onMergeUpClick: () => void;
  onMergeDownClick: () => void;
  panelNode?: ReactNode;
};

const LineNumber = styled.div`
  z-index: 5;
  display: flex;
  align-items: center;
  left: 0;
  transition: opacity 0.2s ease;
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
  border-left: ${CSSVar('mainTableLineCellBorderWidth')} solid
    ${CSSVar('mainTableLineCellBorderColor')};
  &:last-child {
    border-right: ${CSSVar('mainTableLineCellBorderWidth')} solid
      ${CSSVar('mainTableLineCellBorderColor')};
  }
`;

const NumberLineCell = styled(LineCell)`
  padding-right: 0;
  padding-left: ${CSSVar('mainTableLineCellSpacingX')};
`;

const LineContent = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: var(--current-grid-template);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
`;

const Backdrop = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  opacity: ${CSSVar('mainTableLineBackdropOpacity')};
  border: ${CSSVar('mainTableLineBackdropBorderWidth')} solid;
  will-change: background-color, opacity;
  overflow: hidden;
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
const LoaderContainer = styled.div`
  @keyframes loading-animation {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  display: inline-block;
  font-size: 0;
  line-height: 0;
  animation: loading-animation 1s infinite linear;
`;
const Line = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${CSSVar('mainTableLineCellSpacingY')};
  padding: 0;
  opacity: ${CSSVar('mainTableLineOpacity')};
  border-bottom: ${CSSVar('mainTableLineCellBorderWidth')} solid
    ${CSSVar('mainTableLineCellBorderColor')};

  @keyframes frozenAnimation {
    from {
      left: -100%;
    }
    to {
      left: 100%;
    }
  }

  &.isCompleted {
    opacity: ${CSSVar('mainTableLineOpacityCompleted')};
    border-bottom: ${CSSVar('mainTableLineCellBorderWidth')} solid
      ${CSSVar('mainTableLineCellBorderColorCompleted')};
    ${Backdrop} {
      opacity: ${CSSVar('mainTableLineBackdropOpacityCompleted')};
      background: ${CSSVar('mainTableLineBackdropBgCompleted')};
      backdrop-filter: ${CSSVar('mainTableLineBackdropFilterCompleted')};
      border-color: ${CSSVar('mainTableLineBackdropBorderColorCompleted')};
    }

    ${LineCellContent} {
      color: ${CSSVar('mainTableLineColorCompleted')};
    }

    ${LineCell} {
      border-left-color: ${CSSVar('mainTableLineCellBorderColorCompleted')};
      border-right-color: ${CSSVar('mainTableLineCellBorderColorCompleted')};

      &:last-child {
        border-left-color: ${CSSVar('mainTableLineCellBorderColorCompleted')};
        border-right-color: ${CSSVar('mainTableLineCellBorderColorCompleted')};
      }
    }
  }

  &.isActive {
    opacity: ${CSSVar('mainTableLineOpacityActive')};
    border-bottom: ${CSSVar('mainTableLineCellBorderWidth')} solid
      ${CSSVar('mainTableLineCellBorderColorActive')};
    ${Backdrop} {
      opacity: ${CSSVar('mainTableLineBackdropOpacityActive')};
      border-color: ${CSSVar('mainTableLineBackdropBorderColorActive')};
      background: ${CSSVar('mainTableLineBackdropBgActive')};
      backdrop-filter: ${CSSVar('mainTableLineBackdropFilterActive')};
    }

    ${LineCellContent} {
      color: ${CSSVar('mainTableLineColorActive')};
    }

    ${LineCell} {
      border-left-color: ${CSSVar('mainTableLineCellBorderColorActive')};
      border-right-color: ${CSSVar('mainTableLineCellBorderColorActive')};
      &:last-child {
        border-left-color: ${CSSVar('mainTableLineCellBorderColorActive')};
        border-right-color: ${CSSVar('mainTableLineCellBorderColorActive')};
      }
    }
  }

  &.isFocused {
    z-index: 3;
    opacity: ${CSSVar('mainTableLineOpacityFocus')};
    border-bottom: ${CSSVar('mainTableLineCellBorderWidth')} solid
      ${CSSVar('mainTableLineCellBorderColorFocus')};
    ${Backdrop} {
      opacity: ${CSSVar('mainTableLineBackdropOpacityFocus')};
      background: radial-gradient(
        circle at center bottom,
        ${CSSVar('mainTableLineBackdropBgFocus')} 0%,
        transparent 150%
      );
      backdrop-filter: ${CSSVar('mainTableLineBackdropFilterFocus')};
      height: calc(100% + (${CSSVar('mainTableLineBackdropSpacingY')} * 2));
      width: calc(100% + (${CSSVar('mainTableLineBackdropSpacingX')} * 2));
      top: calc(${CSSVar('mainTableLineBackdropSpacingY')} * -1);
      left: calc(${CSSVar('mainTableLineBackdropSpacingX')} * -1);
      transition:
        top 0.1s cubic-bezier(0.34, 1.56, 0.64, 1),
        height 0.1s cubic-bezier(0.34, 1.56, 0.64, 1);
      border-radius: ${CSSVar('mainTableLineBackdropRadius')};
      border-color: ${CSSVar('mainTableLineBackdropBorderColorFocus')};
    }

    ${LineCellContent} {
      color: ${CSSVar('mainTableLineColorFocus')};
    }

    ${LineCell} {
      border-left-color: ${CSSVar('mainTableLineCellBorderColorFocus')};
      border-right-color: ${CSSVar('mainTableLineCellBorderColorFocus')};
      &:last-child {
        border-left-color: ${CSSVar('mainTableLineCellBorderColorFocus')};
        border-right-color: ${CSSVar('mainTableLineCellBorderColorFocus')};
      }
    }
  }

  &.isMergeCandidate {
    opacity: ${CSSVar('mainTableLineOpacityMergeCandidate')};

    ${Backdrop} {
      opacity: ${CSSVar('mainTableLineBackdropOpacityMergeCandidate')};
      background: radial-gradient(
        circle at center bottom,
        ${CSSVar('mainTableLineBackdropBgMergeCandidate')} 0%,
        transparent 150%
      );
      backdrop-filter: ${CSSVar('mainTableLineBackdropFilterMergeCandidate')};
      border-color: ${CSSVar('mainTableLineBackdropBorderColorMergeCandidate')};
    }

    ${LineCellContent} {
      color: ${CSSVar('mainTableLineColorMergeCandidate')};
    }

    ${LineCell} {
      border-left-color: ${CSSVar('mainTableLineCellBorderColorMergeCandidate')};
      border-right-color: ${CSSVar('mainTableLineCellBorderColorMergeCandidate')};

      &:last-child {
        border-left-color: ${CSSVar('mainTableLineCellBorderColorMergeCandidate')};
        border-right-color: ${CSSVar('mainTableLineCellBorderColorMergeCandidate')};
      }
    }
  }

  &.isFrozen {
    opacity: ${CSSVar('mainTableLineOpacityFrozen')};
    border-bottom-color: ${CSSVar('mainTableLineCellBorderColorFrozen')};

    ${Backdrop} {
      opacity: ${CSSVar('mainTableLineBackdropOpacityFrozen')};
      background: radial-gradient(
        circle at center bottom,
        ${CSSVar('mainTableLineBackdropBgFrozen')} 0%,
        transparent 150%
      );
      backdrop-filter: ${CSSVar('mainTableLineBackdropFilterFrozen')};
      border-color: ${CSSVar('mainTableLineBackdropBorderColorFrozen')};
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
      border: none;
    }
    ${Backdrop}:before {
      content: '';
      display: block;
      position: absolute;
      width: 100%;
      height: 100%;

      animation: frozenAnimation 1s linear infinite;
      background: radial-gradient(
        circle at center,
        ${CSSColor(ThemeColors.TEXT, TShade.DEFAULT, 5)} 0%,
        transparent 99%
      );
    }
    ${LineCellContent} {
      color: ${CSSVar('mainTableLineColorFrozen')};
    }

    ${LineCell} {
      border-left-color: ${CSSVar('mainTableLineCellBorderColorFrozen')};
      border-right-color: ${CSSVar('mainTableLineCellBorderColorFrozen')};

      &:last-child {
        border-left-color: ${CSSVar('mainTableLineCellBorderColorFrozen')};
        border-right-color: ${CSSVar('mainTableLineCellBorderColorFrozen')};
      }
    }
  }
`;

const LinePanelSlot = styled.div`
  position: absolute;
  right: 0;
  top: 0;
  transform: translate3d(0, -50%, 0);
  background: ${CSSColor(ThemeColors.BG, TShade.DEFAULT, 5)};
  border-radius: ${CSSVar('size4')};
  backdrop-filter: blur(${CSSVar('blurHeavy')});
`;
const MegeSlot = styled.div`
  position: absolute;
  background: ${CSSColor(ThemeColors.BG, TShade.DEFAULT, 5)};
  border-radius: ${CSSVar('size4')};
  backdrop-filter: blur(${CSSVar('blurHeavy')});
  left: 50%;
`;
const MergeSlotUp = styled(MegeSlot)`
  top: 0;
  transform: translate3d(-50%, -50%, 0);
`;
const MergeSlotDown = styled(MegeSlot)`
  bottom: 0;
  transform: translate3d(-50%, 50%, 0);
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
  isFocused,
  isActive,
  isMergeCandidate,
  isMergeMaster,
  isFrozen,
  isCompleted,
  onFocus,
  onCharacterChange,
  onOutputTextChange,
  onSourceTextChange,
  onMergeUpClick,
  onMergeDownClick,
  panelNode,
}: EditorTableLineProps) {
  const { t } = useTranslation('editor');
  const { splitCursorRef, registerLineInputRef } = useEditorRefs();
  const { zoneRef } = useKeystrokeZone();
  const { videoDurationMs } = useVideo();
  const dispatch = useAppDispatch();
  const sourceLanguage = useSelector(selectProjectSourceLanguage);
  const targetLanguage = useSelector(selectProjectTargetLanguage);
  const isTranslationBusy = useSelector(selectTranslationIsBusy);
  const isEditMode = useSelector(selectIsEditMode);
  const checkGrammar = useSelector(selectCheckGrammar);

  const isNegativeStart = startTime < 0;
  const isBeyondVideo =
    videoDurationMs != null && (startTime > videoDurationMs || endTime > videoDurationMs);

  const updateSourceSelection = () => {
    const input = sourceInputRef.current;
    if (!input) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      dispatch(setTextSelection(''));
      return;
    }
    const range = selection.getRangeAt(0);
    if (!input.contains(range.commonAncestorContainer)) {
      dispatch(setTextSelection(''));
      return;
    }
    dispatch(setTextSelection(selection.toString()));
  };

  const selectedCharacters = useMemo(() => parseCharacterList(character), [character]);

  const lineRef = useRef<HTMLDivElement>(null);
  const translatedInputRef = useRef<HTMLDivElement>(null);
  const sourceInputRef = useRef<HTMLDivElement>(null);
  const lineTextChangeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sourceTextChangeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  }, [isActive, onMeasure, isFocused, translatedText, selectedCharacters]);

  useEffect(() => {
    return () => {
      if (lineTextChangeTimeout.current) {
        clearTimeout(lineTextChangeTimeout.current);
      }
      if (sourceTextChangeTimeout.current) {
        clearTimeout(sourceTextChangeTimeout.current);
      }
    };
  }, []);

  const updateSplitCursor = () => {
    const focusedColumn = fromCurrentStore(selectFocusedColumn);
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
    splitCursorRef.current = preRange.toString().length;
  };

  const characterInputRef = useRef<CharacterSelectorHandle>(null);

  useEffect(() => {
    registerLineInputRef(lineIndex, 'source', sourceInputRef.current);
    registerLineInputRef(lineIndex, 'output', translatedInputRef.current);
    registerLineInputRef(lineIndex, 'character', characterInputRef.current?.inputRef ?? null);
    // Seeds the editor zone's fallback focus target with line 0's output column -- kept fresh on
    // every (re)mount of that specific row, including a full remount on project switch.
    if (lineIndex === 0) zoneRef.current = translatedInputRef.current;
    return () => {
      registerLineInputRef(lineIndex, 'source', null);
      registerLineInputRef(lineIndex, 'output', null);
      registerLineInputRef(lineIndex, 'character', null);
    };
  }, [lineIndex, registerLineInputRef, isEditMode, zoneRef]);

  return (
    <Line
      ref={lineRef}
      className={classNames({
        isFocused,
        isMergeMaster,
        isActive,
        isMergeCandidate,
        isFrozen,
        isNegativeStart,
        isBeyondVideo,
        isCompleted,
      })}
    >
      <Backdrop />
      <LineContent>
        <NumberLineCell style={{ cursor: 'text' }}>
          <LineNumber>
            <Tag
              color={isFocused ? ThemeColors.ACCENT1 : ThemeColors.TEXT}
              variant={isFocused ? TTagVariant.SECONDARY : TTagVariant.SECONDARY}
              size={TTagSize.SMALL}
            >
              {lineNo}
            </Tag>
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
              dispatch(setFocusedColumn('source'));
            }}
            onClick={() => {
              dispatch(setFocusedColumn('source'));
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
              if (sourceTextChangeTimeout.current) {
                clearTimeout(sourceTextChangeTimeout.current);
              }
              sourceTextChangeTimeout.current = setTimeout(() => onSourceTextChange(text), 300);
            }}
          />
        </NumberLineCell>
        <LineCell
          style={{ cursor: 'text' }}
          onBlur={() => dispatch(setFocusedColumn(null))}
          onClick={() => {
            if (isTranslationBusy || !characterInputRef.current?.inputRef) return;
            characterInputRef.current.inputRef.focus();
          }}
        >
          <CharacterSelector
            ref={characterInputRef}
            line_no={lineNo}
            characters={characterOptions}
            onFocus={() => {
              onFocus();
              dispatch(setFocusedColumn('character'));
            }}
            value={selectedCharacters}
            disabled={isTranslationBusy}
            onChange={(value) => {
              if (lineTextChangeTimeout.current) {
                clearTimeout(lineTextChangeTimeout.current);
              }
              onCharacterChange(serializeCharacterList(value));
            }}
          />
        </LineCell>
        {!isEditMode && (
          <LineCell>
            {isFrozen && (
              <AIThinkingMessage>
                <LoaderContainer>
                  <Icon icon={TIcon.LOADER_RUNNER} size={TIconSize.L} />
                </LoaderContainer>
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
                dispatch(setFocusedColumn('output'));
              }}
              onClick={() => {
                dispatch(setFocusedColumn('output'));
                updateSplitCursor();
              }}
              onKeyUp={updateSplitCursor}
              onSelect={updateSplitCursor}
              onPaste={handlePlainTextPaste}
              onInput={(text) => {
                if (isTranslationBusy) return;
                if (lineTextChangeTimeout.current) {
                  clearTimeout(lineTextChangeTimeout.current);
                }
                lineTextChangeTimeout.current = setTimeout(() => onOutputTextChange(text), 300);
              }}
            />
          </LineCell>
        )}
      </LineContent>
      {!isFrozen && !isTranslationBusy && <LinePanelSlot>{panelNode}</LinePanelSlot>}
      {isFocused && (
        <>
          <MergeSlotUp>
            <Tooltip
              label={
                <TooltipComplex style={{ textAlign: 'center' }} title={t('tableLine.mergeUp')}>
                  <Tag
                    variant={TTagVariant.SECONDARY}
                    color={ThemeColors.TEXT}
                    size={TTagSize.NANO}
                  >
                    Alt
                  </Tag>
                  {' + '}
                  <Tag
                    variant={TTagVariant.SECONDARY}
                    color={ThemeColors.TEXT}
                    size={TTagSize.NANO}
                  >
                    Shift
                  </Tag>
                  {' + '}
                  <Tag
                    variant={TTagVariant.SECONDARY}
                    color={ThemeColors.TEXT}
                    size={TTagSize.NANO}
                  >
                    ⭡
                  </Tag>
                </TooltipComplex>
              }
            >
              <Button
                variant={TButtonVariant.TRANSPARENT}
                size={TButtonSize.SMALL}
                icon={TIcon.MERGE_UP}
                onClick={onMergeUpClick}
              />
            </Tooltip>
          </MergeSlotUp>
          <MergeSlotDown>
            <Tooltip
              side="bottom"
              label={
                <TooltipComplex style={{ textAlign: 'center' }} title={t('tableLine.mergeDown')}>
                  <Tag
                    variant={TTagVariant.SECONDARY}
                    color={ThemeColors.TEXT}
                    size={TTagSize.NANO}
                  >
                    Alt
                  </Tag>
                  {' + '}
                  <Tag
                    variant={TTagVariant.SECONDARY}
                    color={ThemeColors.TEXT}
                    size={TTagSize.NANO}
                  >
                    Shift
                  </Tag>
                  {' + '}
                  <Tag
                    variant={TTagVariant.SECONDARY}
                    color={ThemeColors.TEXT}
                    size={TTagSize.NANO}
                  >
                    🠧
                  </Tag>
                </TooltipComplex>
              }
            >
              <Button
                variant={TButtonVariant.TRANSPARENT}
                size={TButtonSize.SMALL}
                icon={TIcon.MERGE_DOWN}
                onClick={onMergeDownClick}
              />
            </Tooltip>
          </MergeSlotDown>
        </>
      )}
    </Line>
  );
}
