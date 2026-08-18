import { useEditorActions } from '@providers/EditorActionsProvider';
import { useVideo } from '@providers/VideoProvider';
import { TScreenSize } from '@src/theme/types';
import { CSSVar } from '@src/theme/utils';
import { TSubtitleLine } from '@src/types';
import { clamp } from '@src/utils/numbers';
import { useAppSelector } from '@store/hooks';
import { selectCurrentThemeData, selectScreenSize } from '@store/slices/app';
import { type ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { useRenderCache } from '../../hooks/useRenderCache';
import WaveformEntry from './WaveformEntry';
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
const CURSOR_OFFSET_RATIO = 0.3;
const PEAK_HEIGHT_COEFFICIENT = 0.9;
const MIN_GAP_MS = 50;
const WHEEL_SEEK_STEP_RATIO = 0.0005;

export type DragMode = 'move' | 'resize-left' | 'resize-right';

type DragState = {
  lineIndex: number;
  mode: DragMode;
  pointer_start_x: number;
  start_time: number;
  end_time: number;
  hasMoved: boolean;
};

const Entries = styled.div`
  position: relative;
  inset: 0;
  z-index: 3;
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
  width: 100%;
  height: 100%;
  scrollbar-width: none;
  overflow: hidden;
  cursor: grab;
  touch-action: none;
  user-select: none;
`;

const WaveFormCanvasWrapper = styled.div`
  position: relative;
  height: 100%;
  transition: transform 100ms linear;
  will-change: transform;
`;

const Canvas = styled.canvas`
  display: block;
  height: 100%;
`;

const Container = styled.div`
  position: relative;
  bottom: 0;
  z-index: 20;
  width: 100%;
  padding: ${CSSVar('waveformSpacingY')} 0;
  &.${TScreenSize.SMALL} {
    backdrop-filter: blur(${CSSVar('blurHeavy')});
    mask-image: linear-gradient(
      90deg,
      rgba(0, 0, 0, 0) 0%,
      rgba(0, 0, 0, 0) 5%,
      rgba(0, 0, 0, 1) 20%,
      rgba(0, 0, 0, 1) 80%,
      rgba(0, 0, 0, 0) 95%,
      rgba(0, 0, 0, 0) 100%
    );
    mask-size: 100% 100%;
  }
`;

export default function Waveform({
  peaks,
  videoDurationMs,
  activeLineIndex,
  focusedLineIndex,
  translationLines,
  onLineTimingChange,
}: WaveformProps) {
  const { currentTimeRef, seekVideoToMs } = useVideo();
  const { handleChangeFocusedLine, handleChangeFocusedColumn } = useEditorActions();
  const size = useAppSelector(selectScreenSize);
  const theme = useAppSelector(selectCurrentThemeData);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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
      const newTime = clamp(currentTimeRef.current + direction * step, 0, videoDurationMs);
      setCurrentTimeMs(newTime);
      seekVideoToMs(newTime);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [videoDurationMs, currentTimeRef, seekVideoToMs]);

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
      setCurrentTimeMs(currentTimeRef.current);
    }, 100);
    return () => {
      clearInterval(interval);
    };
  }, [currentTimeRef]);

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

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    // Sync canvas resolution to its rendered pixel size
    canvas.width = canvasWidth;
    canvas.height = canvas.clientHeight || 80;

    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = theme.variables.waveformColor.value;

    if (peaks.length === 0) {
      return;
    }

    const midY = canvas.height / 2;
    const barWidth = canvas.width / peaks.length;

    peaks.forEach((peak, index) => {
      const barHeight = Math.max(1, peak * (canvas.height * PEAK_HEIGHT_COEFFICIENT));
      const x = index * barWidth;
      const y = midY - barHeight / 2;

      context.fillRect(x, y, Math.max(1, barWidth), barHeight);
    });
  }, [peaks, canvasWidth, theme]);

  useEffect(() => {
    const viewport = waveformViewportRef.current;
    const content = contentRef.current;
    const lineLayer = entriesContainerRef.current;
    const cursor = cursorRef.current;

    if (!viewport || !content || !lineLayer || !cursor) {
      return;
    }

    const viewportWidth = viewport.clientWidth;
    const targetOffset = cursorX - viewportWidth * CURSOR_OFFSET_RATIO;
    const maxOffset = Math.max(0, canvasWidth - viewportWidth);
    const timelineOffset = clamp(targetOffset, 0, maxOffset);
    const cursorViewportX = clamp(cursorX - timelineOffset, 0, viewportWidth);

    content.style.transform = `translateX(${-timelineOffset}px)`;
    lineLayer.style.transform = `translateX(${-timelineOffset}px)`;
    cursor.style.transform = `translateX(${cursorViewportX}px)`;
  }, [canvasWidth, cursorX]);

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
        const newTime = clamp(
          waveformDragRef.current.startTimeMs - pxToTime(delta),
          0,
          videoDurationMs
        );
        setCurrentTimeMs(newTime);
        seekVideoToMs(newTime);
      }
    };

    const handlePointerUp = () => {
      if (dragStateRef.current && !dragStateRef.current.hasMoved) {
        const lineIndex = dragStateRef.current.lineIndex;
        handleChangeFocusedLine(lineIndex);
        requestAnimationFrame(() => handleChangeFocusedColumn(lineIndex, 'output', false));
      }
      dragStateRef.current = null;
      setDragLineIndex(null);
      waveformDragRef.current = null;
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
    const targetOffset = cursorX - viewportWidth * CURSOR_OFFSET_RATIO;
    const maxOffset = Math.max(0, canvasWidth - viewportWidth);
    const timelineOffset = clamp(targetOffset, 0, maxOffset);
    const visibleStartPx = timelineOffset;
    const visibleEndPx = timelineOffset + viewportWidth;
    if (startPx >= visibleEndPx || endPx <= visibleStartPx) return null;
    if (!videoDurationMs || videoDurationMs <= 0) return null;

    const startRatio = line.start_time / videoDurationMs;
    const endRatio = line.end_time / videoDurationMs;
    const left = startRatio * canvasWidth;
    const width = Math.max(2, (endRatio - startRatio) * canvasWidth);
    const isActive = activeLineIndex === lineIndex;
    const isFocused = focusedLineIndex === lineIndex;
    const isDragging = dragLineIndex === lineIndex;

    const fingerprint = getWaveformEntryFingerprint({
      lineNo: line.line_no,
      left,
      width,
      isActive,
      isFocused,
      isDragging,
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
        onEntryPointerDown={handleEntryPointerDown}
      />
    );

    setCached(line.line_no, fingerprint, node);
    return node;
  }

  return (
    <Container ref={containerRef} tabIndex={1} className={size}>
      <Entries ref={entriesContainerRef}>
        {translationLines.map((line, lineIndex) => renderWaveformEntry(line, lineIndex))}
      </Entries>
      <WaveFormViewport
        ref={waveformViewportRef}
        onPointerDown={(event) => {
          if (dragStateRef.current) return;
          waveformDragRef.current = {
            startX: event.clientX,
            startTimeMs: currentTimeRef.current,
          };
          (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        }}
      >
        <Cursor ref={cursorRef} />
        <WaveFormCanvasWrapper ref={contentRef} style={{ width: `${canvasWidth}px` }}>
          <Canvas
            ref={canvasRef}
            width={canvasWidth}
            style={{
              height: CSSVar('waveformHeight'),
            }}
          />
        </WaveFormCanvasWrapper>
      </WaveFormViewport>
    </Container>
  );
}
