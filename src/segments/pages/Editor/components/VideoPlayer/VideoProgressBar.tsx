import { useVideo } from '@providers/VideoProvider';
import { CSSVar, ThemeColors } from '@src/theme/utils';
import ProgressBar, { TProgressBarSize } from '@src/toolkit/ProgressBar';
import { clamp } from '@src/utils/numbers';
import { msToShortTime } from '@src/utils/time';
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
const SeekTooltip = styled.div`
  position: absolute;
  bottom: calc(100% + ${CSSVar('size6')});
  z-index: 1000;
  font-family: ${CSSVar('fontTextSansSerif')};
  font-size: ${CSSVar('tooltipFontSize')};
  font-weight: ${CSSVar('bold')};
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
    const tooltip = tooltipRef.current;
    const time = timeFromClientX(clientX);
    if (!bar || !tooltip || time == null) return;
    const rect = bar.getBoundingClientRect();
    const tooltipWidth = tooltip.offsetWidth;
    const centeredLeft = clientX - rect.left - tooltipWidth / 2;
    const left = clamp(centeredLeft, 0, rect.width - tooltipWidth);

    tooltip.style.left = `${left}px`;
    tooltip.textContent = msToShortTime(time);
    tooltip.classList.toggle('visible', visible);
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
      onPointerLeave={() => tooltipRef.current?.classList.remove('visible')}
    >
      <ProgressBar
        value={currentTimeMs}
        total={videoDurationMs ?? 0}
        precise={true}
        size={TProgressBarSize.MEDIUM}
        allowTransition={false}
        color={ThemeColors.ACCENT1}
      />
      <SeekTooltip ref={tooltipRef} />
    </Root>
  );
}
