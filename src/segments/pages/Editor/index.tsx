import { EditorKeystrokeContext } from '@providers/EditorKeystrokeProvider';
import { useEditorActions } from '@providers/EditorActionsProvider';
import { useVideo } from '@providers/VideoProvider';
import { selectAutoMarkLinesCompleted, selectIsSmallScreen } from '@src/store/slices/app';
import {
  incrementRenderEpoch,
  selectActiveLineIndex,
  selectCharacterPool,
  selectFocusedLineIndex,
  selectLines,
  selectRenderEpoch,
  setLineCompleted,
  updateSourceText,
  updateTranslatedText,
  updateTranslationCharacter,
} from '@src/store/slices/editor';
import { selectIsEditMode } from '@src/store/slices/project';
import { selectFrozenLineNumbers } from '@src/store/slices/prompt';
import { CSSVar } from '@src/theme/utils';
import { TSubtitleLine } from '@src/types';
import { useAutoFocusFirst } from '@src/utils/getFocusableElements';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fromCurrentStore } from '@store/store';
import classNames from 'classnames';
import { CSSProperties, type ReactElement, useContext, useEffect, useMemo, useRef } from 'react';
import { shallowEqual } from 'react-redux';
import styled from 'styled-components';
import FloatingVideoBlock from './components/FloatingVideoBlock/FloatingVideoBlock';
import VirtualizedList, {
  VirtualizedListHandle,
} from './components/VirtualizedList/VirtualizedList';
import EditorTableLine from './components/WorkTable/WorkTableLine/EditorTableLine';
import { useLineFingerprint } from './hooks/useLineFingerprint';
import { useLinePanel } from './components/WorkTable/useLinePanel';

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

const overscrollAmount = 300;
const estimatedRowHeight = 100;
export default function Editor() {
  const dispatch = useAppDispatch();
  const activeLineIndex = useAppSelector(selectActiveLineIndex);
  const focusedLineIndex = useAppSelector(selectFocusedLineIndex);
  const { handleChangeFocusedLine, handleFocusEditor, handleMergeLines } = useEditorActions();
  const { seekToLine, handlePause } = useVideo();
  const isSmallScreen = useAppSelector(selectIsSmallScreen);
  const focusedItemIndex = focusedLineIndex ?? -1;
  const { isAltShiftPressed } = useContext(EditorKeystrokeContext);
  const isEditMode = useAppSelector(selectIsEditMode);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const { translationLines, frozenLineNumbers, characterOptions } = useAppSelector(
    (state) => ({
      translationLines: selectLines(state),
      frozenLineNumbers: selectFrozenLineNumbers(state),
      characterOptions: selectCharacterPool(state),
    }),
    shallowEqual
  );
  const renderEpoch = useAppSelector(selectRenderEpoch);

  // This route element remounts fresh every time a project is opened (navigating away from
  // /workspace unmounts it) -- so a mount-only focus here means the editor always grabs focus as
  // soon as a project opens, landing on the first line's first available input via
  // handleFocusEditor's own fallback (same "steal focus on mount" hook the static pages use, just
  // given the editor's own richer target instead of a container to search).
  useAutoFocusFirst(handleFocusEditor);

  // The focused line must never be thrown out by virtualization -- otherwise scrolling it
  // off-screen (e.g. via ctrl+2/arrow navigation) would unmount it out from under its own focus.
  const pinnedIndices = useMemo(
    () => (focusedItemIndex >= 0 ? [focusedItemIndex] : []),
    [focusedItemIndex]
  );

  const columnTemplate = isEditMode ? '2fr 200px' : '2fr 200px 2fr';

  /** Virtualization **/
  const renderedLineCacheRef = useRef<Map<number, { cacheKey: string; node: ReactElement }>>(
    new Map()
  );
  const virtualizedListRef = useRef<VirtualizedListHandle>(null);

  useEffect(() => {
    const existingLineNumbers = new Set(translationLines.map((line) => line.line_no));
    for (const lineNo of renderedLineCacheRef.current.keys()) {
      if (!existingLineNumbers.has(lineNo)) {
        renderedLineCacheRef.current.delete(lineNo);
      }
    }
  }, [translationLines]);

  /** Hooks **/
  const { getLineFingerprint, mergeCandidateLineIndices } = useLineFingerprint();
  const { injectPanel } = useLinePanel();

  const renderVirtualizedLine = (line: TSubtitleLine, onMeasure: (height: number) => void) => {
    const lineIndex = translationLines.indexOf(line);
    const translatedText = line.output ?? '';
    const isFocused = focusedLineIndex === lineIndex;
    const isActive = activeLineIndex === lineIndex;
    const isMergeCandidate = mergeCandidateLineIndices.has(lineIndex);
    const isFrozen = frozenLineNumbers.includes(line.line_no);
    const fingerprint = getLineFingerprint(line, lineIndex);

    const cached = renderedLineCacheRef.current.get(line.line_no);
    if (cached && cached.cacheKey === fingerprint) {
      return isFocused ? injectPanel(cached.node) : cached.node;
    }

    const node = (
      <EditorTableLine
        key={lineIndex}
        onMeasure={onMeasure}
        lineIndex={lineIndex}
        lineNo={line.line_no}
        sourceText={line.input}
        translatedText={translatedText}
        startTime={line.start_time}
        endTime={line.end_time}
        character={line.character ?? ''}
        characterOptions={characterOptions}
        isCompleted={Boolean(line.completed)}
        isFocused={isFocused}
        isActive={isActive}
        isMergeCandidate={isMergeCandidate}
        isMergeMaster={isFocused && isAltShiftPressed}
        isFrozen={isFrozen}
        onFocus={() => {
          handleChangeFocusedLine(lineIndex);
          seekToLine(lineIndex);
          handlePause();
        }}
        onCharacterChange={(character) =>
          dispatch(updateTranslationCharacter({ lineIndex, character }))
        }
        onOutputTextChange={(text) => {
          dispatch(updateTranslatedText({ lineIndex, text }));
          if (fromCurrentStore(selectAutoMarkLinesCompleted))
            dispatch(setLineCompleted({ lineIndex, completed: Boolean(text), skipHistory: true }));
        }}
        onSourceTextChange={(text) => dispatch(updateSourceText({ lineIndex, text }))}
        onMergeUpClick={() => handleMergeLines(lineIndex, 'up')}
        onMergeDownClick={() => handleMergeLines(lineIndex, 'down')}
      />
    );

    renderedLineCacheRef.current.set(line.line_no, {
      cacheKey: fingerprint,
      node,
    });
    return isFocused ? injectPanel(node) : node;
  };

  return (
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
          getItemFingerprint={(line) => getLineFingerprint(line, translationLines.indexOf(line))}
          pinnedIndices={pinnedIndices}
          overscanPx={overscrollAmount}
          estimatedRowHeight={estimatedRowHeight}
          renderEpoch={renderEpoch}
          onRenderEpochEnded={() => dispatch(incrementRenderEpoch())}
          renderItem={({ item, onMeasure }) => renderVirtualizedLine(item, onMeasure)}
        />
      </Root>
    </EditorArea>
  );
}
