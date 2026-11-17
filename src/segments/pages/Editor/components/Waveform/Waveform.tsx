import { media } from '@src/services/media';
import { editor } from '@src/services/project';
import Tooltip, { TooltipComplex, TooltipKeystrokeHint, TooltipSimple } from '@src/toolkit/Tooltip';
import { ai } from '@src/services/ai';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import Button from '@ui-toolkit/Button/Button';
import { TButtonVariant } from '@ui-toolkit/Button/types';
import { TIcon } from '@ui-toolkit/Icon/icons';
import { TCharacter, TSubtitleLine } from '@src/types';
import { parseCharacterList } from '@utils/characters';
import { clamp } from '@src/utils/numbers';
import { useAppSelectors } from '@store/hooks';
import { settings } from '@src/services/settings';
import { type ReactElement, useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useRenderCache } from '../../hooks/useRenderCache';
import type { DragMode } from './types';
import WaveformEntry from './WaveformEntry';
import WaveformTile from './WaveformTile';
import { throttle } from '@utils/throttle';
import { getWaveformEntryFingerprint } from './useWaveformEntryFingerprint';

type WaveformProps = {
  peaks: number[];
  videoDurationMs: number | null;
  activeLineIndex: number | null;
  focusedLineIndex: number | null;
  translationLines: TSubtitleLine[];
  onLineTimingChange: (lineIndex: number, startTime: number, endTime: number) => void;
};

const PX_PER_SECOND = 30;
// Lines shorter than this mark their roles with dots instead of letter tags
const SHORT_LINE_MS = 1500;
const CURSOR_OFFSET_RATIO = 0.3;
const MIN_GAP_MS = 50;
const WHEEL_SEEK_STEP_RATIO = 0.0005;
// While the timeline is dragged or wheel-scrolled it follows every event on its own (straight to
// the DOM), detached from the store. The video frame follows at most FRAME_SEEKS_PER_SECOND (each
// seek makes the browser decode a frame); the store -- the time, the active line and so the rows
// and subtitles -- and this component's own render at most STORE_UPDATES_PER_SECOND.
const FRAME_SEEKS_PER_SECOND = 12;
const STORE_UPDATES_PER_SECOND = 4;
// A single canvas wider than 65535px paints as a solid block in Chromium, and at PX_PER_SECOND a
// feature-length timeline is far wider than that -- so the timeline is drawn as tiles instead.
const WAVEFORM_TILE_WIDTH = 4096;

type DragState = {
  lineIndex: number;
  mode: DragMode;
  pointer_start_x: number;
  start_time: number;
  end_time: number;
  hasMoved: boolean;
};

// The waveform and its entries fade in and out at the sides. Masked layer by layer rather than on
// Container, so the shift buttons sitting on the edges stay fully visible.
const edgeFadeMask = `linear-gradient(
  90deg,
  transparent 0%,
  black 10%,
  black 90%,
  transparent 100%
)`;

// Entries scroll with the timeline (translated), so the fade sits on this still layer over the
// whole Container instead. It lets pointer events through to the waveform except on the entries.
const EntriesMask = styled.div`
  position: absolute;
  inset: 0;
  z-index: 3;
  padding: ${CSSVar('waveformSpacingY')} 0;
  mask-image: ${edgeFadeMask};
  pointer-events: none;
`;

const Entries = styled.div`
  position: relative;
  inset: 0;
  pointer-events: auto;
  transition: transform 100ms linear;
  will-change: transform;
`;

const Cursor = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  margin-left: -1px;
  background: ${CSSVar('waveformCursorColor')};
  z-index: 3;
`;
const WaveFormViewport = styled.div`
  position: relative;
  mask-image: ${edgeFadeMask};
  width: 100%;
  height: 100%;
  scrollbar-width: none;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
  user-select: none;
`;

const FlatLine = styled.div`
  position: absolute;
  left: 0;
  top: 50%;
  height: 1px;
  pointer-events: none;
`;

const WaveFormCanvasWrapper = styled.div`
  position: relative;
  height: 100%;
  transition: transform 100ms linear;
  will-change: transform;
`;

const Container = styled.div`
  position: relative;
  bottom: 0;
  z-index: 20;
  width: 100%;
  padding: ${CSSVar('waveformSpacingY')} 0;
`;

// Shift-all-lines buttons, fixed to the middle of the waveform's left and right edges, above the
// entries and the cursor
const ShiftButtonSlot = styled.div`
  position: absolute;
  top: 50%;
  transform: translate3d(0, -50%, 0);
  backdrop-filter: blur(${CSSVar('blurExtreme')});
  z-index: 4;
  &.earlier {
    left: ${CSSVar('size4')};
  }
  &.later {
    right: ${CSSVar('size4')};
  }
`;

function getTimelineOffset(cursorX: number, viewportWidth: number, canvasWidth: number) {
  const targetOffset = cursorX - viewportWidth * CURSOR_OFFSET_RATIO;
  const maxOffset = Math.max(0, canvasWidth - viewportWidth);
  return clamp(targetOffset, 0, maxOffset);
}

export default function Waveform({
  peaks,
  videoDurationMs,
  activeLineIndex,
  focusedLineIndex,
  translationLines,
  onLineTimingChange,
}: WaveformProps) {
  const { t } = useTranslation('tooltips');
  const [size, theme, characterPool, timeAdjustmentStep, isBusy] = useAppSelectors(
    settings.selectScreenSize,
    settings.selectCurrentThemeData,
    editor.selectCharacterPool,
    settings.selectTimeAdjustmentStep,
    ai.selectIsBusy
  );
  // All lines move by the step only while there's room: none may start before 0 or, once the
  // video's length is known, end after it
  const hasLines = translationLines.length > 0;
  const canShiftEarlier =
    hasLines && Math.min(...translationLines.map((line) => line.start_time)) > 0;
  const canShiftLater =
    hasLines &&
    (videoDurationMs == null ||
      Math.max(...translationLines.map((line) => line.end_time)) < videoDurationMs);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const waveformViewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const entriesContainerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const waveformDragRef = useRef<{
    startX: number;
    startTimeMs: number;
  } | null>(null);
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const [dragLineIndex, setDragLineIndex] = useState<number | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);
  // A drag or wheel-scroll of the timeline in progress, and the time it shows: while it lasts, this
  // position -- not the store's -- places the timeline
  const isInteractingRef = useRef(false);
  const viewTimeMsRef = useRef(0);
  // Only the video and audio elements, no store: the picture follows the drag
  const frameSeekRef = useRef(
    throttle((ms: number) => {
      const seconds = ms / 1000;
      const video = media.getVideoElement();
      const audio = media.getAudioElement();
      if (video) video.currentTime = seconds;
      if (audio) audio.currentTime = seconds;
    }, 1000 / FRAME_SEEKS_PER_SECOND)
  );
  // The store's time and active line, and this component's render (tiles and line blocks mounted
  // around the new position)
  const storeSeekRef = useRef(
    throttle((ms: number) => {
      media.seekToMs(ms);
      setCurrentTimeMs(ms);
    }, 1000 / STORE_UPDATES_PER_SECOND)
  );
  useEffect(() => {
    const frameSeek = frameSeekRef.current;
    const storeSeek = storeSeekRef.current;
    return () => {
      frameSeek.cancel();
      storeSeek.cancel();
    };
  }, []);

  const { getCached, setCached } = useRenderCache<TSubtitleLine, number, ReactElement>(
    translationLines,
    (line) => line.line_no
  );

  // React attaches its root wheel listener as passive, so preventDefault() inside a JSX onWheel
  // handler is a silent no-op (and logs a warning) -- a native, non-passive listener is required
  // to actually stop the page from scrolling while seeking.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (event: globalThis.WheelEvent) => {
      if (!videoDurationMs) return;
      event.preventDefault();

      const direction = Math.sign(event.deltaY);
      if (direction === 0) return;

      const step = videoDurationMs * WHEEL_SEEK_STEP_RATIO;
      interactionRef.current.start();
      interactionRef.current.moveTo(
        clamp(viewTimeMsRef.current + direction * step, 0, videoDurationMs)
      );
    };

    // A wheel-scroll lasts until the pointer leaves the waveform (a drag, until it's released)
    const handlePointerLeave = () => {
      if (!waveformDragRef.current) interactionRef.current.end();
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('pointerleave', handlePointerLeave);
    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [videoDurationMs]);

  function handleEntryPointerDown(lineIndex: number, mode: DragMode, clientX: number) {
    const line = translationLines[lineIndex];

    dragStateRef.current = {
      lineIndex,
      mode,
      pointer_start_x: clientX,
      start_time: line.start_time,
      end_time: line.end_time,
      hasMoved: false,
    };

    setDragLineIndex(lineIndex);
  }

  const canvasWidth = useMemo(() => {
    const durationSeconds = videoDurationMs ? videoDurationMs / 1000 : 0;
    return Math.max(window.innerWidth, Math.ceil(durationSeconds * PX_PER_SECOND));
  }, [videoDurationMs]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Detached while the timeline is dragged or scrolled: its own position wins
      if (isInteractingRef.current) return;
      setCurrentTimeMs(media.getCurrentTimeMs());
    }, 100);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const cursorX = useMemo(() => {
    if (!videoDurationMs || videoDurationMs <= 0) {
      return 0;
    }

    return Math.round((currentTimeMs / videoDurationMs) * canvasWidth);
  }, [canvasWidth, currentTimeMs, videoDurationMs]);

  const timeToPx = (timeMs: number) =>
    videoDurationMs ? (timeMs / videoDurationMs) * canvasWidth : 0;

  const pxToTime = (px: number) => (videoDurationMs ? (px / canvasWidth) * videoDurationMs : 0);

  function getNeighborBounds(lineIndex: number) {
    const prev = lineIndex > 0 ? translationLines[lineIndex - 1] : null;
    const next = lineIndex < translationLines.length - 1 ? translationLines[lineIndex + 1] : null;

    return {
      minStart: prev ? prev.end_time + MIN_GAP_MS : 0,
      maxEnd: next ? next.start_time - MIN_GAP_MS : (videoDurationMs ?? Number.MAX_SAFE_INTEGER),
    };
  }

  function applyDrag(pointerX: number) {
    const drag = dragStateRef.current;
    if (!drag || !videoDurationMs) return;

    const deltaTime = pxToTime(pointerX - drag.pointer_start_x);
    const minDuration = 50;

    const { minStart, maxEnd } = getNeighborBounds(drag.lineIndex);

    let nextStart = drag.start_time;
    let nextEnd = drag.end_time;

    if (drag.mode === 'move') {
      const maxAllowedShiftLeft = minStart - drag.start_time;
      const maxAllowedShiftRight = maxEnd - drag.end_time;

      const clampedShift = clamp(deltaTime, maxAllowedShiftLeft, maxAllowedShiftRight);
      nextStart = drag.start_time + clampedShift;
      nextEnd = drag.end_time + clampedShift;
    }

    if (drag.mode === 'resize-left') {
      const proposedStart = drag.start_time + deltaTime;
      nextStart = clamp(proposedStart, minStart, drag.end_time - minDuration);
      nextEnd = drag.end_time;
    }

    if (drag.mode === 'resize-right') {
      const proposedEnd = drag.end_time + deltaTime;
      nextStart = drag.start_time;
      nextEnd = clamp(proposedEnd, drag.start_time + minDuration, maxEnd);
    }

    onLineTimingChange(drag.lineIndex, Math.round(nextStart), Math.round(nextEnd));
  }

  // Places the timeline (canvas tiles and line blocks) and the cursor for a time, straight on the
  // DOM -- no render
  function positionTimeline(ms: number) {
    const viewport = waveformViewportRef.current;
    const content = contentRef.current;
    const lineLayer = entriesContainerRef.current;
    const cursor = cursorRef.current;
    if (!viewport || !content || !lineLayer || !cursor) return;

    const x =
      videoDurationMs && videoDurationMs > 0 ? Math.round((ms / videoDurationMs) * canvasWidth) : 0;
    const viewportWidth = viewport.clientWidth;
    const timelineOffset = getTimelineOffset(x, viewportWidth, canvasWidth);
    const cursorViewportX = clamp(x - timelineOffset, 0, viewportWidth);

    content.style.transform = `translateX(${-timelineOffset}px)`;
    lineLayer.style.transform = `translateX(${-timelineOffset}px)`;
    cursor.style.transform = `translateX(${cursorViewportX}px)`;
  }

  function startInteraction() {
    if (isInteractingRef.current) return;
    isInteractingRef.current = true;
    viewTimeMsRef.current = media.getCurrentTimeMs();
  }

  // Every event moves the timeline at once; the video frame and the store follow, throttled
  function moveViewTo(ms: number) {
    viewTimeMsRef.current = ms;
    positionTimeline(ms);
    frameSeekRef.current(ms);
    storeSeekRef.current(ms);
  }

  // The final position lands in the player and the store at once, then the store leads again
  function endInteraction() {
    if (!isInteractingRef.current) return;
    // Whatever the throttles still hold is superseded by the one final seek below
    frameSeekRef.current.cancel();
    storeSeekRef.current.cancel();
    isInteractingRef.current = false;
    media.seekToMs(viewTimeMsRef.current);
    setCurrentTimeMs(viewTimeMsRef.current);
  }

  // The interaction operations as of this render, for the native listeners subscribed once
  const interactionRef = useRef({
    start: startInteraction,
    moveTo: moveViewTo,
    end: endInteraction,
  });
  interactionRef.current = { start: startInteraction, moveTo: moveViewTo, end: endInteraction };

  // Layout effect: placed in the same frame as the render that mounted the tiles and line blocks
  // for it. While interacting, the interaction's own position, so a throttled re-render can never
  // pull the timeline back.
  useLayoutEffect(() => {
    positionTimeline(isInteractingRef.current ? viewTimeMsRef.current : currentTimeMs);
  });

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (dragStateRef.current) {
        const moved = Math.abs(event.clientX - dragStateRef.current.pointer_start_x) > 4;
        if (moved) dragStateRef.current.hasMoved = true;
        applyDrag(event.clientX);
        return;
      }
      if (waveformDragRef.current && videoDurationMs) {
        const delta = event.clientX - waveformDragRef.current.startX;
        moveViewTo(
          clamp(waveformDragRef.current.startTimeMs - pxToTime(delta), 0, videoDurationMs)
        );
      }
    };

    const handlePointerUp = () => {
      if (dragStateRef.current && !dragStateRef.current.hasMoved) {
        const lineIndex = dragStateRef.current.lineIndex;
        media.seekToLine(lineIndex);
        requestAnimationFrame(() => editor.focusLine(lineIndex));
      }
      dragStateRef.current = null;
      setDragLineIndex(null);
      if (waveformDragRef.current) {
        waveformDragRef.current = null;
        endInteraction();
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  });

  function renderWaveformEntry(line: TSubtitleLine, lineIndex: number) {
    const startPx = timeToPx(line.start_time);
    const endPx = timeToPx(line.end_time);
    const viewportWidth = waveformViewportRef.current?.offsetWidth ?? 0;
    const timelineOffset = getTimelineOffset(cursorX, viewportWidth, canvasWidth);
    // Two viewport widths of margin each side: between the throttled re-renders of a drag the
    // timeline runs ahead of this render's window, and blocks coming in must already be mounted
    const visibleStartPx = timelineOffset - viewportWidth * 2;
    const visibleEndPx = timelineOffset + viewportWidth * 3;
    if (startPx >= visibleEndPx || endPx <= visibleStartPx) return null;
    if (!videoDurationMs || videoDurationMs <= 0) return null;

    const startRatio = line.start_time / videoDurationMs;
    const endRatio = line.end_time / videoDurationMs;
    const left = startRatio * canvasWidth;
    const width = Math.max(2, (endRatio - startRatio) * canvasWidth);
    const isActive = activeLineIndex === lineIndex;
    const isFocused = focusedLineIndex === lineIndex;
    const isDragging = dragLineIndex === lineIndex;
    // Too short a block for letter tags: its roles show as dots only
    const isShort = line.end_time - line.start_time < SHORT_LINE_MS;
    // Roles without a pool entry (no color to show) are left out
    const characters = parseCharacterList(line.character)
      .map((name) => characterPool.find((character) => character.name === name))
      .filter((character): character is TCharacter => Boolean(character));

    const fingerprint = getWaveformEntryFingerprint({
      lineNo: line.line_no,
      left,
      width,
      isActive,
      isFocused,
      isDragging,
      characterKey: characters.map(({ name, color }) => `${name}:${color}`).join(','),
      isShort,
    });

    const cached = getCached(line.line_no, fingerprint);
    if (cached) {
      return cached;
    }

    const node = (
      <WaveformEntry
        key={lineIndex}
        lineIndex={lineIndex}
        lineNo={line.line_no}
        left={left}
        width={width}
        isActive={isActive}
        isFocused={isFocused}
        isDragging={isDragging}
        characters={characters}
        isShort={isShort}
        onEntryPointerDown={handleEntryPointerDown}
      />
    );

    setCached(line.line_no, fingerprint, node);
    return node;
  }

  // Only the tiles around the viewport are mounted, plus one either side for scrolling into
  function renderWaveformTiles() {
    // No peaks (no video, or none extracted): a flat line along the middle of the whole timeline
    if (peaks.length === 0) {
      return (
        <FlatLine style={{ width: canvasWidth, background: theme.variables.waveformColor.value }} />
      );
    }

    const viewportWidth = waveformViewportRef.current?.offsetWidth ?? 0;
    const timelineOffset = getTimelineOffset(cursorX, viewportWidth, canvasWidth);
    const lastTile = Math.ceil(canvasWidth / WAVEFORM_TILE_WIDTH) - 1;
    const firstVisibleTile = Math.floor(timelineOffset / WAVEFORM_TILE_WIDTH);
    const lastVisibleTile = Math.floor((timelineOffset + viewportWidth) / WAVEFORM_TILE_WIDTH);
    const tiles: ReactElement[] = [];

    for (
      let tile = Math.max(0, firstVisibleTile - 1);
      tile <= Math.min(lastTile, lastVisibleTile + 1);
      tile++
    ) {
      const left = tile * WAVEFORM_TILE_WIDTH;

      tiles.push(
        <WaveformTile
          key={tile}
          left={left}
          width={Math.min(WAVEFORM_TILE_WIDTH, canvasWidth - left)}
          peaks={peaks}
          barWidth={canvasWidth / peaks.length}
          color={theme.variables.waveformColor.value}
        />
      );
    }

    return tiles;
  }

  return (
    <Container ref={containerRef} tabIndex={1} className={size}>
      <EntriesMask>
        <Entries ref={entriesContainerRef}>
          {translationLines.map((line, lineIndex) => renderWaveformEntry(line, lineIndex))}
        </Entries>
      </EntriesMask>
      <Tooltip delay={400} label={<TooltipSimple>{t('waveform.freeSpaceHint')}</TooltipSimple>}>
        <WaveFormViewport
          ref={waveformViewportRef}
          onPointerDown={(event) => {
            if (dragStateRef.current) return;
            startInteraction();
            waveformDragRef.current = {
              startX: event.clientX,
              startTimeMs: viewTimeMsRef.current,
            };
            (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
          }}
        >
          <Cursor ref={cursorRef} />
          <WaveFormCanvasWrapper
            ref={contentRef}
            style={{ width: `${canvasWidth}px`, height: CSSVar('waveformHeight') }}
          >
            {renderWaveformTiles()}
          </WaveFormCanvasWrapper>
        </WaveFormViewport>
      </Tooltip>
      <ShiftButtonSlot className="earlier">
        <Tooltip
          label={
            <TooltipComplex
              title={t('editorControls.shiftLinesEarlier', { step: timeAdjustmentStep })}
            >
              <TooltipKeystrokeHint keys={['Alt', 'Shift', 'A']} />
            </TooltipComplex>
          }
        >
          <Button
            variant={TButtonVariant.SECONDARY}
            color={ThemeColors.TEXT}
            icon={TIcon.BACKWARD}
            disabled={!canShiftEarlier || isBusy}
            onClick={() => editor.shiftAllLinesEarlier(timeAdjustmentStep)}
          />
        </Tooltip>
      </ShiftButtonSlot>
      <ShiftButtonSlot className="later">
        <Tooltip
          label={
            <TooltipComplex
              title={t('editorControls.shiftLinesLater', { step: timeAdjustmentStep })}
            >
              <TooltipKeystrokeHint keys={['Alt', 'Shift', 'D']} />
            </TooltipComplex>
          }
        >
          <Button
            variant={TButtonVariant.SECONDARY}
            color={ThemeColors.TEXT}
            icon={TIcon.FORWARD}
            disabled={!canShiftLater || isBusy}
            onClick={() => editor.shiftAllLinesLater(timeAdjustmentStep)}
          />
        </Tooltip>
      </ShiftButtonSlot>
    </Container>
  );
}
