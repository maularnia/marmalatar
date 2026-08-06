import { useAppSelector } from '@store/hooks';
import { selectCurrentThemeData } from '@store/slices/app';
import { useEditorActions } from '@providers/EditorActionsProvider';
import { useVideo } from '@providers/VideoProvider';
import { TShade } from '@src/theme/definitions';
import { ThemeColors, CSSColor, CSSVar } from '@src/theme/utils';
import { TSubtitleLine } from '@src/types';
import Tag, { TTagSize, TTagVariant } from '@ui-toolkit/Tag';
import classNames from 'classnames';
import { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';

type WaveformProps = {
  peaks: number[];
  videoDurationMs: number | null;
  activeLineIndex: number | null;
  translationLines: TSubtitleLine[];
  onLineTimingChange: (lineIndex: number, startTime: number, endTime: number) => void;
};

const PX_PER_SECOND = 30;
const CURSOR_OFFSET_RATIO = 0.3;
const PEAK_HEIGHT_COEFFICIENT = 0.9;
const MIN_GAP_MS = 50;
const EDGE_HITBOX_PX = 10;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

type DragMode = 'move' | 'resize-left' | 'resize-right';

type DragState = {
  lineIndex: number;
  mode: DragMode;
  pointer_start_x: number;
  start_time: number;
  end_time: number;
  hasMoved: boolean;
};
const EntryBorderHandle = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 10px;
  height: 100%;
  z-index: 2;
  cursor: ew-resize;
  filter: brightness(200%);
  border-radius: ${CSSVar('size10')};
  &.left {
    left: -2px;
    border-left: 2px solid ${CSSColor(ThemeColors.ACCENT1, TShade.DEFAULT, 50)};
  }

  &.right {
    right: -2px;
    border-right: 2px solid ${CSSColor(ThemeColors.ACCENT1, TShade.DEFAULT, 50)};
  }
`;
const EntryBlock = styled.div`
  --inner-spacing: calc(${CSSVar('waveformSpacingY')} * 0.5);
  position: absolute;
  top: 0;
  border-radius: ${CSSVar('waveformSpacingY')};
  height: ${CSSVar('waveformHeight')};
  border: 1px solid ${CSSVar('waveformBlockBorderColor')};
  background-color: ${CSSVar('waveformBlockBg')};
  background: radial-gradient(
    circle at center bottom,
    ${CSSVar('waveformBlockBg')} 0%,
    transparent 90%
  );
  cursor: grab;
  touch-action: none;
  user-select: none;
  transition:
    background-color 0.3s ease-in-out,
    border-color 0.3s ease-in-out,
    top 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    height 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  ${EntryBorderHandle} {
    border-color: ${CSSVar('waveformBlockBorderColor')};
  }
  &:hover {
    border-color: ${CSSVar('waveformBlockBorderColorHover')};
    background: radial-gradient(
      circle at center bottom,
      ${CSSVar('waveformBlockBgHover')} 0%,
      transparent 90%
    );
    bacgr ${EntryBorderHandle} {
      border-color: ${CSSVar('waveformBlockBorderColorHover')};
    }
  }

  &.isActive {
    height: calc(${CSSVar('waveformHeight')} + (${CSSVar('waveformSpacingY')} * 2));
    border-color: ${CSSVar('waveformBlockBorderColorActive')};
    background: radial-gradient(
      circle at center bottom,
      ${CSSVar('waveformBlockBgActive')} 0%,
      transparent 90%
    );
    top: calc(${CSSVar('waveformSpacingY')} * -1);
    ${EntryBorderHandle} {
      border-color: ${CSSVar('waveformBlockBorderColorActive')};
    }
    &:hover {
      border-color: ${CSSVar('waveformBlockBorderColorActiveHover')};
      background: radial-gradient(
        circle at center bottom,
        ${CSSVar('waveformBlockBgActiveHover')} 0%,
        transparent 90%
      );
      ${EntryBorderHandle} {
        border-color: ${CSSVar('waveformBlockBorderColorActiveHover')};
      }
    }
  }
`;

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

const EntryNumber = styled.div`
  position: absolute;
  left: ${CSSVar('size4')};
  top: ${CSSVar('size2')};
`;

const Container = styled.div`
  position: relative;
  bottom: 0;
  z-index: 20;
  width: 100%;
  backdrop-filter: blur(${CSSVar('blurHeavy')});
  padding: ${CSSVar('waveformSpacingY')} 0;
  mask-image: linear-gradient(
    90deg,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 1) 10%,
    rgba(0, 0, 0, 1) 90%,
    rgba(0, 0, 0, 0) 100%
  );
  mask-size: 100% 100%;
`;

export default function Waveform({
  peaks,
  videoDurationMs,
  activeLineIndex,
  translationLines,
  onLineTimingChange,
}: WaveformProps) {
  const { currentTimeRef, seekVideoToMs } = useVideo();
  const { handleChangeFocusedLine, handleChangeFocusedColumn } = useEditorActions();
  const theme = useAppSelector(selectCurrentThemeData);
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

  return (
    <Container tabIndex={1}>
      <Entries ref={entriesContainerRef}>
        {translationLines.map((line, lineIndex) => {
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
          const isDragging = dragLineIndex === lineIndex;

          return (
            <EntryBlock
              key={lineIndex}
              className={classNames({
                isActive: isActive,
                isDragging: isDragging,
              })}
              style={{
                left: `${left}px`,
                width: `${width}px`,
              }}
              onPointerDown={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                const offsetX = event.clientX - rect.left;

                let mode: DragMode = 'move';
                if (offsetX <= EDGE_HITBOX_PX) mode = 'resize-left';
                else if (offsetX >= rect.width - EDGE_HITBOX_PX) mode = 'resize-right';

                dragStateRef.current = {
                  lineIndex,
                  mode,
                  pointer_start_x: event.clientX,
                  start_time: line.start_time,
                  end_time: line.end_time,
                  hasMoved: false,
                };

                setDragLineIndex(lineIndex);
                event.currentTarget.setPointerCapture(event.pointerId);
                event.preventDefault();
              }}
            >
              <EntryBorderHandle className="left" />
              <EntryNumber>
                <Tag variant={TTagVariant.SECONDARY} size={TTagSize.NANO} color={ThemeColors.TEXT}>
                  {line.line_no}
                </Tag>
              </EntryNumber>
              <EntryBorderHandle className="right" />
            </EntryBlock>
          );
        })}
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
