import { media } from '@src/services/media';
import { settings } from '@src/services/settings';
import { editor } from '@src/services/project';
import { TScreenSize } from '@src/theme/types';
import { useAppSelectors } from '@store/hooks';
import { RefObject, useEffect, useRef } from 'react';
import classNames from 'classnames';
import styled from 'styled-components';
import VideoPlayer from '../VideoPlayer/VideoPlayer';
import type { VirtualizedListHandle } from '../VirtualizedList/VirtualizedList';
import Waveform from '../Waveform/Waveform';
import { EditorTableHeader } from '../WorkTable/EditorTableHeader';
import { CSSColor, CSSVar, ThemeColors } from '@src/theme/utils';
import { TShade } from '@src/theme/definitions';

const VideoBlock = styled.div`
  position: sticky;
  z-index: 3;
  display: flex;
  flex-direction: column;
  top: 0;
  width: 100%;
  overflow: hidden;
  padding: 0 0 ${CSSVar('size18')};

  /* One background and blur for the whole floating stack (player on small screens, waveform,
     table header) instead of one per part. They live on a layer under the content, masked so that
     both the theme background (half strength) and the blur hold down to 90% of the block, then
     fade out over the last 10% -- a backdrop-filter can't be graded itself, and masking the block
     would fade its content too. Isolation keeps the layer's negative z-index inside the block. */
  isolation: isolate;
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: ${CSSColor(ThemeColors.BG, TShade.DEFAULT, 50)};
    backdrop-filter: blur(${CSSVar('blurExtreme')});
    mask-image: linear-gradient(to bottom, black 0%, black 90%, transparent 100%);
    pointer-events: none;
  }
  /* Larger screens hold only the table header here: a longer fade, from 75% down */
  &.isLargeScreen::before {
    mask-image: linear-gradient(to bottom, black 0%, black 50%, transparent 100%);
  }
`;

const OverflowContainer = styled.div`
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const estimatedRowHeight = 100;

type FloatingVideoBlockProps = {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  virtualizedListRef: RefObject<VirtualizedListHandle | null>;
  focusedItemIndex: number;
};

export default function FloatingVideoBlock({
  scrollContainerRef,
  virtualizedListRef,
  focusedItemIndex,
}: FloatingVideoBlockProps) {
  const [
    isSmallScreen,
    activeLineIndex,
    translationLines,
    screenSize,
    isVideoCollapsed,
    videoFilePath,
    timelineDurationMs,
    waveformPeaks,
  ] = useAppSelectors(
    settings.selectIsSmallScreen,
    media.selectActiveLineIndex,
    editor.selectLines,
    settings.selectScreenSize,
    editor.selectIsVideoCollapsed,
    media.selectVideoFilePath,
    editor.selectTimelineDurationMs,
    media.selectWaveformPeaks
  );
  const isLargeScreen = screenSize !== TScreenSize.SMALL;
  // Without a video the player shows only its control bar, as if collapsed
  const isCollapsed = isVideoCollapsed || !videoFilePath;

  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const videoContainerShiftRef = useRef<number>(0);
  const maxVideoShiftRef = useRef<number>(1);
  const currentAnchorRef = useRef(0);
  const focusedItemIndexRef = useRef(focusedItemIndex);
  focusedItemIndexRef.current = focusedItemIndex;
  const scrollBeforePlayRef = useRef<number | null>(null);

  const handlePlaybackResume = () => {
    if (!scrollContainerRef.current) return;
    scrollBeforePlayRef.current = scrollContainerRef.current.scrollTop;
    if (settings.get.scrollVideoIntoViewOnPlay())
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollTop - videoContainerShiftRef.current,
        behavior: 'smooth',
      });
  };

  const handlePlaybackPause = () => {
    if (scrollBeforePlayRef.current != null && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: scrollBeforePlayRef.current, behavior: 'smooth' });
      scrollBeforePlayRef.current = null;
    }
  };

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = (event: Event) => {
      const videoElement = media.getVideoElement();
      if (isLargeScreen || isCollapsed || !videoContainerRef.current || !videoElement) return;
      const scrollTop = (event.currentTarget as HTMLElement).scrollTop;
      const videoHeight = videoElement.clientHeight;
      const maxShift = videoHeight * maxVideoShiftRef.current;

      const focusedIndex = focusedItemIndexRef.current;
      if (focusedIndex >= 0 && virtualizedListRef.current) {
        const listOffsetTop = virtualizedListRef.current.getListOffsetTop();
        const focusedLineTop =
          listOffsetTop + virtualizedListRef.current.getElementPositionByIndex(focusedIndex);
        const focusedLineScreenTop = focusedLineTop - scrollTop;
        const videoBottomAfterMaxShift = videoContainerRef.current.offsetHeight - maxShift;
        if (focusedLineScreenTop < videoBottomAfterMaxShift) {
          videoContainerShiftRef.current = maxShift;
          videoContainerRef.current.style.transform = `translateY(-${maxShift}px)`;
          currentAnchorRef.current = scrollTop - videoContainerRef.current.offsetHeight - maxShift;
          return;
        }
      }

      const relativeScroll = scrollTop - videoContainerRef.current.offsetHeight;
      const distance = relativeScroll - currentAnchorRef.current;

      if (distance >= maxShift) currentAnchorRef.current = relativeScroll - maxShift;
      if (distance <= 0) currentAnchorRef.current = relativeScroll;

      videoContainerShiftRef.current =
        distance < maxShift ? (distance < 0 ? 0 : distance) : maxShift;
      videoContainerRef.current.style.transform = `translateY(-${videoContainerShiftRef.current}px)`;
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [scrollContainerRef, virtualizedListRef, isLargeScreen, isCollapsed]);

  useEffect(() => {
    if (focusedItemIndex < 0) return;
    requestAnimationFrame(() => {
      if (
        !virtualizedListRef.current ||
        !scrollContainerRef.current ||
        !videoContainerRef.current ||
        !media.getVideoElement()
      )
        return;
      const listOffsetTop = virtualizedListRef.current.getListOffsetTop();
      const focusedLineTop =
        listOffsetTop + virtualizedListRef.current.getElementPositionByIndex(focusedItemIndex);
      const scrollTop = scrollContainerRef.current.scrollTop;
      const focusedLineScreenTop = focusedLineTop - scrollTop;
      const videoVisibleBottom =
        videoContainerRef.current.offsetHeight - videoContainerShiftRef.current;
      const viewportHeight = scrollContainerRef.current.clientHeight;
      const bottomMargin = estimatedRowHeight;

      if (focusedLineScreenTop < videoVisibleBottom) {
        scrollContainerRef.current.scrollTo({
          top: focusedLineTop - videoContainerRef.current.offsetHeight,
          // Instant: smooth scrolling lags behind fast line switching (a held Ctrl+Down), leaving
          // the next lines outside the rendered window
          behavior: 'instant',
        });
      } else if (focusedLineScreenTop > viewportHeight - bottomMargin) {
        scrollContainerRef.current.scrollTo({
          top: focusedLineTop - (viewportHeight - bottomMargin),
          behavior: 'instant',
        });
      }
    });
  }, [focusedItemIndex, scrollContainerRef, virtualizedListRef]);

  useEffect(() => {
    videoContainerShiftRef.current = 0;
    currentAnchorRef.current = 0;
    if (videoContainerRef.current) {
      videoContainerRef.current.style.transform = '';
    }
  }, [screenSize]);

  // Collapsing freezes the shift at zero (the scroll handler's guard keeps it there).
  // Expanding re-anchors to the current scroll position instead of just zeroing it out,
  // so the video is immediately fully displayed and further scrolling resumes the
  // shrink-on-scroll behavior naturally from here rather than snapping back to a stale anchor.
  useEffect(() => {
    videoContainerShiftRef.current = 0;
    if (videoContainerRef.current) {
      videoContainerRef.current.style.transform = '';
    }
    if (!isCollapsed && scrollContainerRef.current && videoContainerRef.current) {
      currentAnchorRef.current =
        scrollContainerRef.current.scrollTop - videoContainerRef.current.offsetHeight;
    } else {
      currentAnchorRef.current = 0;
    }
  }, [isCollapsed, scrollContainerRef]);

  return (
    <VideoBlock ref={videoContainerRef} className={classNames({ isLargeScreen })}>
      {isSmallScreen && (
        <>
          {/* Always there: an empty player (whose control bar picks a video) and a flat waveform until
              a video is picked */}
          <VideoPlayer
            onPlaybackResume={handlePlaybackResume}
            onPlaybackPause={handlePlaybackPause}
          />
          <Waveform
            peaks={waveformPeaks}
            videoDurationMs={timelineDurationMs}
            activeLineIndex={activeLineIndex}
            focusedLineIndex={focusedItemIndex >= 0 ? focusedItemIndex : null}
            translationLines={translationLines}
            onLineTimingChange={(lineIndex, startTime, endTime) => {
              editor.updateLineTiming({ lineIndex, startTime, endTime });
            }}
          />
        </>
      )}
      <OverflowContainer>
        <EditorTableHeader />
      </OverflowContainer>
    </VideoBlock>
  );
}
