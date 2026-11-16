import { media } from '@src/services/media';
import { useEditorKeystroke } from '@providers/EditorKeystrokeProvider';
import { settings } from '@src/services/settings';
import { editor } from '@src/services/project';
import { TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import P from '@src/toolkit/P';
import { TTagSize } from '@src/toolkit/Tag';
import { TooltipKeystrokeHint } from '@src/toolkit/Tooltip';
import { TSubtitleLine } from '@src/types';
import { useStealFocus } from '@src/utils/getFocusableElements';
import { useAppSelectors } from '@store/hooks';
import classNames from 'classnames';
import {
  CSSProperties,
  type ReactElement,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import FloatingVideoBlock from './components/FloatingVideoBlock/FloatingVideoBlock';
import VirtualizedList, {
  VirtualizedListHandle,
} from './components/VirtualizedList/VirtualizedList';
import EditorTableLine from './components/WorkTable/WorkTableLine/EditorTableLine';
import { FocusedLinePanel } from './components/WorkTable/WorkTableLine/FocusedLinePanel';
import { type TLineRowState, useLineFingerprint } from './hooks/useLineFingerprint';
import { useMergeCandidateLines } from './hooks/useMergeCandidateLines';
import { useRenderCache } from './hooks/useRenderCache';
import { ExportButton } from './segments/ExportButton';

const PageRoot = styled.div`
  position: relative;
  height: 100%;
  min-height: 0;
`;

const EditorArea = styled.main`
  position: relative;
  height: 100%;
  overflow-y: scroll;
  overflow-x: clip;

  padding: 0 ${CSSVar('mainTableLineBackdropSpacingX')};
  left: calc(${CSSVar('mainTableLineBackdropSpacingX')} * -1);

  &::-webkit-scrollbar {
    width: ${CSSVar('appScrollbarWidth')};
  }

  &::-webkit-scrollbar-track {
    background: ${CSSVar('appScrollbarTrackColor')};
    border-radius: ${CSSVar('appScrollbarBorderRadius')};
  }

  &::-webkit-scrollbar-thumb {
    width: calc(${CSSVar('appScrollbarWidth')} * 2);
    background: ${CSSVar('appScrollbarThumbColor')};
    border-radius: ${CSSVar('appScrollbarBorderRadius')};
  }
  &.isSmallScreen {
    max-width: ${CSSVar('appScreenWidth')};
  }
`;

const Root = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
`;

const NavigationHint = styled(P)`
  position: absolute;
  z-index: 2;
  bottom: ${CSSVar('size10')};
  right: ${CSSVar('size10')};
  padding: 0 ${CSSVar('size10')};
  display: flex;
  align-items: center;
  gap: ${CSSVar('size4')};
  font-size: ${CSSVar('sizeTextSmall')};
  color: ${CSSColor(ThemeColors.TEXT, TShade.DEFAULT, 60)};
  pointer-events: none;
`;

const navigationHintKeystroke = (
  <TooltipKeystrokeHint keys={['Alt', 'Arrow']} size={TTagSize.SMALL} />
);

const overscrollAmount = 300;
const estimatedRowHeight = 100;
export default function Editor() {
  const { t } = useTranslation('tooltips');
  const [
    activeLineIndex,
    focusedLineIndex,
    isSmallScreen,
    isEditMode,
    renderEpoch,
    translationLines,
    frozenLineNumbers,
    characterOptions,
  ] = useAppSelectors(
    media.selectActiveLineIndex,
    editor.selectFocusedLineIndex,
    settings.selectIsSmallScreen,
    editor.selectIsEditMode,
    editor.selectRenderEpoch,
    editor.selectLines,
    editor.selectFrozenLineNumbers,
    editor.selectCharacterPool
  );
  const focusedItemIndex = focusedLineIndex ?? -1;
  const { isAltShiftPressed } = useEditorKeystroke();

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Arriving at /workspace by any route grabs focus for the editor: the last focused line, or the
  // first one, focused as soon as its row mounts (same "steal focus on render" hook the static pages
  // use, given the editor's own target). Opening or creating a project also steals focus as part of
  // the project service's own action, so switching projects without remounting this page works too.
  useStealFocus(editor.focus);

  // The focused line must never be thrown out by virtualization -- otherwise scrolling it
  // off-screen (e.g. via ctrl+2/arrow navigation) would unmount it out from under its own focus.
  const pinnedIndices = useMemo(
    () => (focusedItemIndex >= 0 ? [focusedItemIndex] : []),
    [focusedItemIndex]
  );

  const columnTemplate = isEditMode ? '2fr 200px' : '2fr 200px 2fr';

  /** Virtualization **/
  const virtualizedListRef = useRef<VirtualizedListHandle>(null);
  const { getCached, setCached } = useRenderCache<TSubtitleLine, number, ReactElement>(
    translationLines,
    (line) => line.line_no
  );

  /** Hooks **/
  const { getLineFingerprint } = useLineFingerprint();
  const mergeCandidateLines = useMergeCandidateLines();

  // The focused line's panel lives outside the rows, as static content of the list: it scrolls
  // with them natively and is only re-anchored when the focused row's top moves (focus change, or
  // the list reporting a layout change). setState bails out when the top is unchanged.
  const [panelTop, setPanelTop] = useState<number | null>(null);
  const syncPanelTop = useCallback(() => {
    const list = virtualizedListRef.current;
    setPanelTop(
      list && focusedItemIndex >= 0 ? list.getElementPositionByIndex(focusedItemIndex) : null
    );
  }, [focusedItemIndex]);
  useLayoutEffect(syncPanelTop, [syncPanelTop, translationLines, renderEpoch]);

  // A row's data: rendered as the row's props and fingerprinted for the render cache (and for the
  // list, which re-measures a row when its fingerprint changes), from one place
  const buildRowState = (line: TSubtitleLine): TLineRowState => {
    const lineIndex = translationLines.indexOf(line);
    const isFocused = focusedLineIndex === lineIndex;
    return {
      lineIndex,
      lineNo: line.line_no,
      sourceText: line.input,
      translatedText: line.output ?? '',
      startTime: line.start_time,
      endTime: line.end_time,
      character: line.character ?? '',
      isCompleted: Boolean(line.completed),
      isFocused,
      isActive: activeLineIndex === lineIndex,
      isMergeCandidate: mergeCandidateLines.has(lineIndex),
      isMergeMaster: isFocused && isAltShiftPressed,
      isFrozen: frozenLineNumbers.includes(line.line_no),
    };
  };

  const renderVirtualizedLine = (line: TSubtitleLine, onMeasure: (height: number) => void) => {
    const row = buildRowState(line);
    const { lineIndex } = row;
    const fingerprint = getLineFingerprint(row);

    const cached = getCached(line.line_no, fingerprint);
    if (cached) {
      return cached;
    }

    const node = (
      <EditorTableLine
        key={lineIndex}
        {...row}
        onMeasure={onMeasure}
        characterOptions={characterOptions}
        onFocus={() => {
          media.seekToLine(lineIndex);
          media.pause();
        }}
        onCharacterChange={(character) =>
          editor.updateTranslationCharacter({ lineIndex, character })
        }
        onOutputTextChange={(text) => {
          editor.updateTranslatedText({ lineIndex, text });
          // Auto-marking follows the translation column: never in edit mode
          if (settings.get.autoMarkLinesCompleted() && !editor.get.isEditMode())
            editor.setLineCompleted({ lineIndex, completed: Boolean(text), skipHistory: true });
        }}
        onSourceTextChange={(text) => editor.updateSourceText({ lineIndex, text })}
        onMergeUpClick={() => editor.mergeLines(lineIndex, 'up')}
        onMergeDownClick={() => editor.mergeLines(lineIndex, 'down')}
      />
    );

    setCached(line.line_no, fingerprint, node);
    return node;
  };

  return (
    <PageRoot>
      <EditorArea
        tabIndex={1}
        className={classNames({ isSmallScreen })}
        ref={scrollContainerRef}
        style={{ '--current-grid-template': columnTemplate } as CSSProperties}
      >
        <Root>
          <FloatingVideoBlock
            scrollContainerRef={scrollContainerRef}
            virtualizedListRef={virtualizedListRef}
            focusedItemIndex={focusedItemIndex}
          />
          <VirtualizedList
            ref={virtualizedListRef}
            items={translationLines}
            scrollContainerRef={scrollContainerRef}
            getItemFingerprint={(line) => getLineFingerprint(buildRowState(line))}
            pinnedIndices={pinnedIndices}
            overscanPx={overscrollAmount}
            estimatedRowHeight={estimatedRowHeight}
            renderEpoch={renderEpoch}
            onRenderEpochEnded={() => editor.incrementRenderEpoch()}
            renderItem={({ item, onMeasure }) => renderVirtualizedLine(item, onMeasure)}
            onLayoutChange={syncPanelTop}
          >
            <FocusedLinePanel top={panelTop} />
          </VirtualizedList>
          <ExportButton />
        </Root>
      </EditorArea>
      <NavigationHint>
        {t('editorTable.navigationHintPrefix')}
        {navigationHintKeystroke}
        {t('editorTable.navigationHintPostfix')}
      </NavigationHint>
    </PageRoot>
  );
}
