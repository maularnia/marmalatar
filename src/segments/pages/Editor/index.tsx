import { media } from '@src/services/media';
import { useEditorKeystroke } from '@providers/EditorKeystrokeProvider';
import { settings } from '@src/store/slices/settings';
import { editor } from '@src/services/editor';
import { TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import P from '@src/toolkit/P';
import { TTagSize } from '@src/toolkit/Tag';
import { TooltipKeystrokeHint } from '@src/toolkit/Tooltip';
import { TSubtitleLine } from '@src/types';
import { useAutoFocusFirst } from '@src/utils/getFocusableElements';
import { useAppSelector } from '@store/hooks';
import classNames from 'classnames';
import { CSSProperties, type ReactElement, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { shallowEqual } from 'react-redux';
import styled from 'styled-components';
import FloatingVideoBlock from './components/FloatingVideoBlock/FloatingVideoBlock';
import VirtualizedList, {
  VirtualizedListHandle,
} from './components/VirtualizedList/VirtualizedList';
import { useLinePanel } from './components/WorkTable/useLinePanel';
import EditorTableLine from './components/WorkTable/WorkTableLine/EditorTableLine';
import { useLineFingerprint } from './hooks/useLineFingerprint';
import { useRenderCache } from './hooks/useRenderCache';

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
  padding-bottom: ${CSSVar('size34')};
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
  const activeLineIndex = useAppSelector(media.selectActiveLineIndex);
  const focusedLineIndex = useAppSelector(editor.selectFocusedLineIndex);
  const isSmallScreen = useAppSelector(settings.selectIsSmallScreen);
  const focusedItemIndex = focusedLineIndex ?? -1;
  const { isAltShiftPressed } = useEditorKeystroke();
  const isEditMode = useAppSelector(editor.selectIsEditMode);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const { translationLines, frozenLineNumbers, characterOptions } = useAppSelector(
    (state) => ({
      translationLines: editor.selectLines(state),
      frozenLineNumbers: editor.selectFrozenLineNumbers(state),
      characterOptions: editor.selectCharacterPool(state),
    }),
    shallowEqual
  );
  const renderEpoch = useAppSelector(editor.selectRenderEpoch);

  // This route element remounts fresh every time a project is opened (navigating away from
  // /workspace unmounts it) -- so a mount-only focus here means the editor always grabs focus as
  // soon as a project opens, landing on the first line's first available input via
  // editor.focus's own fallback (same "steal focus on mount" hook the static pages use, just
  // given the editor's own richer target instead of a container to search).
  useAutoFocusFirst(editor.focus);

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

    const cached = getCached(line.line_no, fingerprint);
    if (cached) {
      return isFocused ? injectPanel(cached) : cached;
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
          editor.focusLine(lineIndex);
          media.seekToLine(lineIndex);
          media.pause();
        }}
        onCharacterChange={(character) =>
          editor.updateTranslationCharacter({ lineIndex, character })
        }
        onOutputTextChange={(text) => {
          editor.updateTranslatedText({ lineIndex, text });
          if (settings.get.autoMarkLinesCompleted())
            editor.setLineCompleted({ lineIndex, completed: Boolean(text), skipHistory: true });
        }}
        onSourceTextChange={(text) => editor.updateSourceText({ lineIndex, text })}
        onMergeUpClick={() => editor.mergeLines(lineIndex, 'up')}
        onMergeDownClick={() => editor.mergeLines(lineIndex, 'down')}
      />
    );

    setCached(line.line_no, fingerprint, node);
    return isFocused ? injectPanel(node) : node;
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
            getItemFingerprint={(line) => getLineFingerprint(line, translationLines.indexOf(line))}
            pinnedIndices={pinnedIndices}
            overscanPx={overscrollAmount}
            estimatedRowHeight={estimatedRowHeight}
            renderEpoch={renderEpoch}
            onRenderEpochEnded={() => editor.incrementRenderEpoch()}
            renderItem={({ item, onMeasure }) => renderVirtualizedLine(item, onMeasure)}
          />
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
