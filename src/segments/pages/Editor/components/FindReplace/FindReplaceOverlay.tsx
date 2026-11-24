import { media } from '@src/services/media';
import { modal } from '@src/services/modal';
import { editor, findReplace } from '@src/services/project';
import { settings } from '@src/services/settings';
import { TShade } from '@src/theme/definitions';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import type { TSubtitleLine } from '@src/types';
import { useAppSelectors } from '@store/hooks';
import Button from '@ui-toolkit/Button/Button';
import P from '@ui-toolkit/P';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import { TIcon } from '@ui-toolkit/Icon/icons';
import TextInput from '@ui-toolkit/TextInput';
import Tooltip, { TooltipSimple } from '@ui-toolkit/Tooltip';
import { findMatches, type TTextRange } from '@utils/findMatches';
import {
  type CSSProperties,
  type ReactElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Trans, useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useLineFingerprint, type TLineRowState } from '../../hooks/useLineFingerprint';
import { useRenderCache } from '../../hooks/useRenderCache';
import VirtualizedList, { type VirtualizedListHandle } from '../VirtualizedList/VirtualizedList';
import { EditorTableHeader } from '../WorkTable/EditorTableHeader';
import type { TLineGeometry } from '../WorkTable/LineBackdrops/BackdropBase';
import { FocusedLineBackdrop } from '../WorkTable/LineBackdrops/FocusedLineBackdrop';
import EditorTableLine, {
  type TLineRowController,
} from '../WorkTable/WorkTableLine/EditorTableLine';

// Covers the whole table area, top to bottom, above the main table (hidden while this is open, so
// the page's own background shows through)
const Root = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  /* A faint accent tint, set in from the edges: the table it covers is a search result view, not
     the table itself. A layer under the content (isolation keeps its negative z-index inside) */
  isolation: isolate;

  &::before {
    content: '';
    position: absolute;
    inset: 0 ${CSSVar('size10')};
    z-index: -1;
    background: ${CSSColor(ThemeColors.ACCENT1, TShade.DEFAULT, 5)};
    pointer-events: none;
  }
`;

// The search and replace fields. In the list's own box (ListArea), so it lines up with the table
// columns below it
const Header = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${CSSVar('size10')};
  padding: ${CSSVar('size4')} ${CSSVar('size6')};
`;

const QueryField = styled.div`
  flex: 1 1 200px;
  display: flex;
  min-width: 0;

  > * {
    flex: 1 1 auto;
  }
`;

// The same box as the main table's scroll area (Editor's EditorArea), so the rows lay out alike
const ListArea = styled.div`
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: scroll;
  overflow-x: clip;
  padding: 0 calc(${CSSVar('mainTableFocusBackdropSpacingX')} + ${CSSVar('size10')});

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
`;

// The search and replace fields over the main table's header, kept together at the top of the list
// as the rows scroll under them. One background and blur for both, on a masked layer under them, as
// on the main table's floating block (FloatingVideoBlock)
const FloatingHeader = styled.div`
  position: sticky;
  top: 0;
  /* Above everything in the rows (their line numbers sit at 5), so a press on the header never
     reaches a row scrolled under it */
  z-index: 6;
  padding-bottom: ${CSSVar('size10')};
  isolation: isolate;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: ${CSSVar('mainTableHeaderBg')};
    backdrop-filter: ${CSSVar('mainTableHeaderBackdrop')};
    mask-image: ${CSSVar('mainTableHeaderMask')};
    pointer-events: none;
  }
`;

const EmptyMessage = styled(P)`
  padding: ${CSSVar('size18')} 0;
  text-align: center;
  color: ${CSSColor(ThemeColors.TEXT, TShade.DEFAULT, 60)};
`;

// The key in the highlights' "Press Enter to replace" tooltip, as the tooltips' keystroke hints
// show keys (TooltipKeystrokeHint)
const enterKeyTag = (
  <Tag variant={TTagVariant.SECONDARY} color={ThemeColors.TEXT} size={TTagSize.NANO} />
);

const overscrollAmount = 300;
const estimatedRowHeight = 100;

const NO_MARKS: TTextRange[] = [];

type TFindReplaceOverlayProps = {
  /** The main table's column layout and line number width, so the rows match it */
  columnTemplate: string;
  lineNumberWidth: string;
};

// The overlay's rows: their inputs go to Find & Replace's own registry, focus and navigation, never
// the editor's -- the main table keeps its own under the overlay
function makeResultRowController(resultIndex: number, lineNo: number): TLineRowController {
  return {
    registerInput: (column, el) => {
      if (column !== 'character') findReplace.registerResultInput(lineNo, column, el);
    },
    onInputFocus: (column) => {
      if (column !== 'character') findReplace.focusResult(resultIndex, column);
    },
    onInputBlur: () => findReplace.focusResult(null),
    navigateFromEdge: (direction) => findReplace.navigateResult(direction, { keepCaretX: true }),
  };
}

export function FindReplaceOverlay({ columnTemplate, lineNumberWidth }: TFindReplaceOverlayProps) {
  const { t } = useTranslation('editor');
  const [
    query,
    replacement,
    canReplace,
    canReplaceAll,
    results,
    focusedResultIndex,
    lines,
    isEditMode,
    renderEpoch,
    frozenLineNumbers,
    characterOptions,
  ] = useAppSelectors(
    findReplace.selectQuery,
    findReplace.selectReplacement,
    findReplace.selectCanReplace,
    findReplace.selectCanReplaceAll,
    findReplace.selectResultLines,
    findReplace.selectFocusedResultIndex,
    editor.selectLines,
    editor.selectIsEditMode,
    editor.selectRenderEpoch,
    editor.selectFrozenLineNumbers,
    editor.selectCharacterPool
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const virtualizedListRef = useRef<VirtualizedListHandle>(null);

  // Esc closes it whatever has focus: in the capture phase on window, ahead of every other
  // listener (an input, the character selector or a zone that would otherwise take the key)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      findReplace.close({ restoreFocus: true });
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  // A press anywhere outside closes it, leaving focus wherever that press put it. A dialog window
  // on top is not "outside": it belongs to something running here.
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      if (!root) return;
      // Inside by the event's path, taken when it was dispatched (so it still counts if the target
      // is gone from the DOM by now), or by where the press landed: a press on the overlay's own
      // area is never "outside", whatever element the browser hit-tested it to
      if (event.composedPath().includes(root)) return;
      const rect = root.getBoundingClientRect();
      if (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      )
        return;
      // The editor controls' Find & Replace buttons act on the overlay themselves
      if ((event.target as Element).closest?.('[data-find-replace-control]')) return;
      if (modal.get.isOpen()) return;
      findReplace.close();
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, []);

  // The focused result must never be thrown out by virtualization, as in the main table
  // The focused result's backdrop, as in the main table: static content of the list under the rows,
  // re-anchored only when the focused row moves (focus changing, or the list reporting a layout
  // change), so the rows never re-render for it
  const [focusedGeometry, setFocusedGeometry] = useState<TLineGeometry | null>(null);
  const syncFocusedGeometry = useCallback(() => {
    const list = virtualizedListRef.current;
    const next =
      list && focusedResultIndex !== null
        ? {
            top: list.getElementPositionByIndex(focusedResultIndex),
            height: list.getElementHeightByIndex(focusedResultIndex),
          }
        : null;
    setFocusedGeometry((previous) =>
      previous === next ||
      (previous && next && previous.top === next.top && previous.height === next.height)
        ? previous
        : next
    );
  }, [focusedResultIndex]);
  useLayoutEffect(syncFocusedGeometry, [syncFocusedGeometry, results, renderEpoch]);

  const pinnedIndices = useMemo(
    () => (focusedResultIndex !== null ? [focusedResultIndex] : []),
    [focusedResultIndex]
  );

  const { getLineFingerprint } = useLineFingerprint();
  const { getCached, setCached } = useRenderCache<TSubtitleLine, number, ReactElement>(
    results,
    (line) => line.line_no
  );

  // Edit mode searches the source only (its table has no output column)
  const searchesOutput = !isEditMode;

  // Where each listed line sits in the project and in the results: looked up for every row on
  // every list recalculation (scrolling included), so not searched for each time
  const lineIndexByLine = useMemo(
    () => new Map(lines.map((line, index) => [line, index])),
    [lines]
  );
  const resultIndexByLine = useMemo(
    () => new Map(results.map((line, index) => [line, index])),
    [results]
  );

  const buildRowState = (line: TSubtitleLine): TLineRowState => ({
    lineIndex: lineIndexByLine.get(line) ?? -1,
    lineNo: line.line_no,
    sourceText: line.input,
    translatedText: line.output ?? '',
    startTime: line.start_time,
    endTime: line.end_time,
    character: line.character ?? '',
    isCompleted: Boolean(line.completed),
    isFrozen: frozenLineNumbers.includes(line.line_no),
  });

  // The row's own fingerprint, plus what the overlay adds to it: the query its highlights come
  // from, whether they replace when clicked, and where it sits in the results (its controller's
  // index)
  const getRowFingerprint = (row: TLineRowState, resultIndex: number) =>
    [getLineFingerprint(row), query, canReplace ? 1 : 0, resultIndex].join('::');

  const renderRow = (line: TSubtitleLine, onMeasure: (height: number) => void) => {
    const row = buildRowState(line);
    const { lineIndex, lineNo } = row;
    const resultIndex = resultIndexByLine.get(line) ?? -1;
    const fingerprint = getRowFingerprint(row, resultIndex);
    const cached = getCached(lineNo, fingerprint);
    if (cached) return cached;

    // Highlights follow the row's current text, so they move with the user's edits while the list
    // itself stays as the query found it
    const sourceMarks = query ? findMatches(row.sourceText, query) : NO_MARKS;
    const outputMarks = query && searchesOutput ? findMatches(row.translatedText, query) : NO_MARKS;

    const node = (
      <EditorTableLine
        key={lineNo}
        {...row}
        onMeasure={onMeasure}
        controller={makeResultRowController(resultIndex, lineNo)}
        allowSpellcheck={false}
        checkTempo={false}
        isCharacterDisabled
        sourceMarks={sourceMarks}
        outputMarks={outputMarks}
        // Says so on the highlight the caret is in. The replacement is read when it's shown: rows
        // are cached across replacement edits (it only changes while focus is in its field anyway)
        markTooltip={
          canReplace
            ? () => (
                <TooltipSimple>
                  <Trans
                    t={t}
                    i18nKey="findReplace.enterToReplace"
                    values={{ text: findReplace.get.replacement() }}
                    components={{ key: enterKeyTag, text: <strong /> }}
                  />
                </TooltipSimple>
              )
            : undefined
        }
        // Enter with the caret in a highlight replaces that match, once there's something to replace
        // it with (otherwise Enter stays a line break)
        onMarkKeyDown={
          canReplace
            ? (column, event, mark) => {
                if (event.key !== 'Enter' || event.shiftKey || event.altKey || event.ctrlKey)
                  return;
                event.preventDefault();
                findReplace.replaceMatch(lineNo, column, mark.start, mark.end);
              }
            : undefined
        }
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
    setCached(lineNo, fingerprint, node);
    return node;
  };

  return (
    <Root ref={rootRef}>
      <ListArea
        ref={scrollContainerRef}
        style={
          {
            '--current-grid-template': columnTemplate,
            '--line-number-width': lineNumberWidth,
          } as CSSProperties
        }
      >
        <FloatingHeader>
          <Header>
            <QueryField>
              <TextInput
                ref={(el: HTMLInputElement | null) => findReplace.registerHeaderInput('query', el)}
                aria-label={t('findReplace.searchLabel')}
                placeholder={t('findReplace.searchLabel')}
                value={query}
                onChange={(event) => findReplace.setQuery(event.currentTarget.value)}
              />
            </QueryField>
            <QueryField>
              <TextInput
                ref={(el: HTMLInputElement | null) =>
                  findReplace.registerHeaderInput('replacement', el)
                }
                aria-label={t('findReplace.replaceLabel')}
                placeholder={t('findReplace.replaceLabel')}
                value={replacement}
                onChange={(event) => findReplace.setReplacement(event.currentTarget.value)}
              />
            </QueryField>
            {/* Not wired yet: enabled once there's a replacement, like the highlights' replace */}
            <Tooltip label={<TooltipSimple>{t('findReplace.replace')}</TooltipSimple>}>
              <Button
                icon={TIcon.REPLACE_ONE}
                aria-label={t('findReplace.replace')}
                disabled={!canReplace}
              />
            </Tooltip>
            <Tooltip label={<TooltipSimple>{t('findReplace.replaceAll')}</TooltipSimple>}>
              <Button
                icon={TIcon.REPLACE_ALL}
                aria-label={t('findReplace.replaceAll')}
                disabled={!canReplaceAll}
                onClick={() => findReplace.replaceAllMatches()}
              />
            </Tooltip>
          </Header>
          <EditorTableHeader readOnly />
        </FloatingHeader>
        {results.length === 0 ? (
          <EmptyMessage>{t('findReplace.noResults')}</EmptyMessage>
        ) : (
          <VirtualizedList
            ref={virtualizedListRef}
            items={results}
            scrollContainerRef={scrollContainerRef}
            getItemFingerprint={(line) =>
              getRowFingerprint(buildRowState(line), resultIndexByLine.get(line) ?? -1)
            }
            pinnedIndices={pinnedIndices}
            overscanPx={overscrollAmount}
            estimatedRowHeight={estimatedRowHeight}
            renderEpoch={renderEpoch}
            onRenderEpochEnded={() => editor.incrementRenderEpoch()}
            renderItem={({ item, onMeasure }) => renderRow(item, onMeasure)}
            onLayoutChange={syncFocusedGeometry}
          >
            {/* Under the rows. No tempo state: the search list doesn't check it */}
            <FocusedLineBackdrop
              geometry={focusedGeometry}
              isTempoFailed={false}
              isFrozen={
                focusedResultIndex !== null &&
                frozenLineNumbers.includes(results[focusedResultIndex]?.line_no ?? -1)
              }
            />
          </VirtualizedList>
        )}
      </ListArea>
    </Root>
  );
}
