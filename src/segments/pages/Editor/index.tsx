import { media } from '@src/services/media';
import { settings } from '@src/services/settings';
import { editor, projects } from '@src/services/project';
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
import type { TLineGeometry } from './components/WorkTable/LineBackdrops/BackdropBase';
import { FocusedLineBackdrop } from './components/WorkTable/LineBackdrops/FocusedLineBackdrop';
import {
  MergeCandidateBackdrops,
  MergeCandidateButtons,
  type TMergeCandidate,
} from './components/WorkTable/LineBackdrops/MergeCandidateBackdrops';
import { passesTempo } from '@utils/tempo';
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

  /* Room for the line backdrops spreading past the rows, and the gap towards the control panel
     (which leaves its right side to this padding, EditorLayout.tsx) -- the same on both sides */
  padding: 0 calc(${CSSVar('mainTableFocusBackdropSpacingX')} + ${CSSVar('size10')});
  left: calc(${CSSVar('mainTableFocusBackdropSpacingX')} * -1);

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
  /* Small screens: the table takes the full width it's given (no cap), as on large screens it
     grows into free space (EditorLayout.tsx) */
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

// The line number column fits the longest number the project has (one width per digit count) plus
// room for the tempo error flag after it, set once for the whole table so the rows never
// re-render for it
function lineNumberWidth(lineCount: number): string {
  const digitsWidth =
    lineCount < 10 ? '15px' : lineCount < 100 ? '22px' : lineCount < 1000 ? '30px' : '38px';
  return `calc(${digitsWidth} + ${CSSVar('size12')})`;
}

// Where the lines that the shared backdrops follow sit in the list
type TTrackedGeometry = {
  focused: TLineGeometry | null;
  candidates: TMergeCandidate[];
};

const NO_GEOMETRY: TTrackedGeometry = { focused: null, candidates: [] };

const isSameLineGeometry = (a: TLineGeometry | null, b: TLineGeometry | null) =>
  a === b || (a != null && b != null && a.top === b.top && a.height === b.height);

const isSameGeometry = (a: TTrackedGeometry, b: TTrackedGeometry) =>
  isSameLineGeometry(a.focused, b.focused) &&
  a.candidates.length === b.candidates.length &&
  a.candidates.every(
    (candidate, i) =>
      candidate.direction === b.candidates[i].direction &&
      isSameLineGeometry(candidate.geometry, b.candidates[i].geometry)
  );
export default function Editor() {
  const { t } = useTranslation('tooltips');
  const [
    focusedLineIndex,
    isSmallScreen,
    isEditMode,
    renderEpoch,
    translationLines,
    frozenLineNumbers,
    characterOptions,
    tempo,
    timingIssues,
  ] = useAppSelectors(
    editor.selectFocusedLineIndex,
    settings.selectIsSmallScreen,
    editor.selectIsEditMode,
    editor.selectRenderEpoch,
    editor.selectLines,
    editor.selectFrozenLineNumbers,
    editor.selectCharacterPool,
    projects.selectTempo,
    editor.selectTempoTimingIssues
  );
  const focusedItemIndex = focusedLineIndex ?? -1;

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

  // What moves between rows -- the focused line's backdrop and panel, the merge candidates'
  // backdrops and buttons -- lives outside the rows, as static content of the list: it scrolls with
  // them natively and is only re-anchored when a tracked line moves (focus or the merge modifier
  // changing, or the list reporting a layout change). The rows themselves never re-render for it.
  const [geometry, setGeometry] = useState<TTrackedGeometry>(NO_GEOMETRY);
  const syncLineGeometry = useCallback(() => {
    const list = virtualizedListRef.current;
    const at = (index: number | null): TLineGeometry | null =>
      list && index != null && index >= 0
        ? {
            top: list.getElementPositionByIndex(index),
            height: list.getElementHeightByIndex(index),
          }
        : null;
    const next: TTrackedGeometry = {
      focused: at(focusedItemIndex),
      candidates: [...mergeCandidateLines].flatMap((index) => {
        const candidate = at(index);
        if (!candidate) return [];
        return [{ direction: index < focusedItemIndex ? 'up' : 'down', geometry: candidate }];
      }),
    };
    setGeometry((previous) => (isSameGeometry(previous, next) ? previous : next));
  }, [focusedItemIndex, mergeCandidateLines]);
  useLayoutEffect(syncLineGeometry, [syncLineGeometry, translationLines, renderEpoch]);

  // The focused backdrop's border follows the focused line's own state: red while it breaks a
  // tempo limit (the same check its row makes), none while it's frozen
  const focusedLine = focusedLineIndex != null ? translationLines[focusedLineIndex] : undefined;
  const isFocusedFrozen = focusedLine ? frozenLineNumbers.includes(focusedLine.line_no) : false;
  const isFocusedTempoFailed =
    focusedLine != null &&
    focusedLineIndex != null &&
    tempo.enabled &&
    (Boolean(timingIssues[focusedLineIndex]) ||
      !passesTempo(
        isEditMode ? focusedLine.input : (focusedLine.output ?? ''),
        focusedLine.start_time,
        focusedLine.end_time,
        tempo
      ));

  // A row's data: rendered as the row's props and fingerprinted for the render cache (and for the
  // list, which re-measures a row when its fingerprint changes), from one place
  const buildRowState = (line: TSubtitleLine): TLineRowState => {
    const lineIndex = translationLines.indexOf(line);
    return {
      lineIndex,
      lineNo: line.line_no,
      sourceText: line.input,
      translatedText: line.output ?? '',
      startTime: line.start_time,
      endTime: line.end_time,
      character: line.character ?? '',
      isCompleted: Boolean(line.completed),
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
        style={
          {
            '--current-grid-template': columnTemplate,
            '--line-number-width': lineNumberWidth(translationLines.length),
          } as CSSProperties
        }
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
            onLayoutChange={syncLineGeometry}
          >
            {/* Under the rows: the merge candidates' backdrops, then the focused line's */}
            <MergeCandidateBackdrops
              focusedLineIndex={focusedLineIndex}
              candidates={geometry.candidates}
            />
            <FocusedLineBackdrop
              geometry={geometry.focused}
              isTempoFailed={isFocusedTempoFailed}
              isFrozen={isFocusedFrozen}
            />
            {/* Above the rows (their own z-index) */}
            <MergeCandidateButtons
              focusedLineIndex={focusedLineIndex}
              candidates={geometry.candidates}
            />
            <FocusedLinePanel top={geometry.focused?.top ?? null} />
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
