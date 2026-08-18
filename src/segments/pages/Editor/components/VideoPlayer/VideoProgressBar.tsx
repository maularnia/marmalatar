import { useVideo } from '@providers/VideoProvider';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import ProgressBar, { TProgressBarSize } from '@src/toolkit/ProgressBar';
import { clamp } from '@src/utils/numbers';
import { msToShortTime } from '@src/utils/time';
import classNames from 'classnames';
import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

const Root = styled.div`
  width: 100%;
  position: relative;
  cursor: pointer;
  touch-action: none;
`;

// Mirrors Tooltip.tsx's Content/TooltipRoot box styling (background, blur, radius, padding, text)
// without going through the Radix-based Tooltip component -- this needs to track the pointer's
// x-position continuously while dragging, which doesn't fit Radix's hover/focus-driven trigger model.
const SeekTooltip = styled.div<{ $left: number }>`
  position: absolute;
  bottom: calc(100% + ${CSSVar('size6')});
  left: ${({ $left }) => $left}px;
  z-index: 1000;
  font-family: ${CSSVar('fontTextSansSerif')};
  font-size: ${CSSVar('tooltipFontSize')};
  line-height: 1.2;
  border-radius: ${CSSVar('tooltipBorderRadius')};
  background: ${CSSVar('tooltipBg')};
  backdrop-filter: ${CSSVar('tooltipBackdropFilter')};
  color: ${CSSVar('tooltipColor')};
  padding: ${CSSVar('tooltipSpacingY')} ${CSSVar('tooltipSpacingX')};
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.1s ease;

  &.visible {
    opacity: 1;
  }
`;

export default function VideoProgressBar() {
  const { videoDurationMs, currentTimeRef, setCurrentTimeMs, seekVideoToMs } = useVideo();
  const barRef = useRef<HTMLDivElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const isSeekingRef = useRef(false);
  const [currentTimeMs, setLocalCurrentTimeMs] = useState(0);
  const [tooltip, setTooltip] = useState<{ left: number; timeMs: number; visible: boolean }>({
    left: 0,
    timeMs: 0,
    visible: false,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setLocalCurrentTimeMs(currentTimeRef.current);
    }, 100);
    return () => clearInterval(interval);
  }, [currentTimeRef]);

  function timeFromClientX(clientX: number): number | null {
    const bar = barRef.current;
    if (!bar || !videoDurationMs) return null;
    const rect = bar.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return ratio * videoDurationMs;
  }

  function updateTooltip(clientX: number, visible: boolean) {
    const bar = barRef.current;
    const time = timeFromClientX(clientX);
    if (!bar || time == null) return;
    const rect = bar.getBoundingClientRect();
    const tooltipWidth = tooltipRef.current?.offsetWidth ?? 0;
    const centeredLeft = clientX - rect.left - tooltipWidth / 2;
    const left = clamp(centeredLeft, 0, rect.width - tooltipWidth);
    setTooltip({ left, timeMs: time, visible });
  }

  function seekToClientX(clientX: number) {
    const time = timeFromClientX(clientX);
    if (time == null) return;
    setLocalCurrentTimeMs(time);
    setCurrentTimeMs(time);
    seekVideoToMs(time);
  }

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!isSeekingRef.current) return;
      seekToClientX(event.clientX);
      updateTooltip(event.clientX, true);
    };
    const handlePointerUp = () => {
      isSeekingRef.current = false;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  });

  return (
    <Root
      ref={barRef}
      onPointerDown={(event) => {
        isSeekingRef.current = true;
        seekToClientX(event.clientX);
        updateTooltip(event.clientX, true);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => updateTooltip(event.clientX, true)}
      onPointerLeave={() => setTooltip((prev) => ({ ...prev, visible: false }))}
    >
      <ProgressBar
        value={currentTimeMs}
        total={videoDurationMs ?? 0}
        precise={true}
        size={TProgressBarSize.MEDIUM}
        allowTransition={false}
        color={ThemeColors.ACCENT1}
      />
      <SeekTooltip
        ref={tooltipRef}
        $left={tooltip.left}
        className={classNames({ visible: tooltip.visible })}
      >
        {msToShortTime(tooltip.timeMs)}
      </SeekTooltip>
    </Root>
  );
}
